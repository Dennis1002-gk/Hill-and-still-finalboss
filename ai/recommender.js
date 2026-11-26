/*
 * HILL AND STILL — Recommendation Engine V2
 * Drop-in replacement for the previous window.HSRecommender module.
 * Supports both the legacy camelCase fields and the new 13-column music database:
 * ID, Title, Artist, Country, Genre, Subgenre, BPM, Energy_1_5,
 * Valence_0_1, Mood, Goal, Source, Confidence.
 *
 * Research conditions:
 * A = deterministic, identical reference set for every participant.
 * B = genre/subgenre preference only.
 * C = current-state + desired-goal + music-preference matching.
 * D = no music recommendations; quiet-rest condition is handled by app.js.
 *
 * This is a transparent rule-based recommender, not a trained ML model,
 * diagnostic tool, or evidence that a song will produce a clinical effect.
 */
(function (global) {
  'use strict';

  const VERSION = '3.0.0-preview';
  const STORAGE_KEY = 'hs_mvp01_profile'; // preserve existing profile key
  const DEFAULT_PROFILE = Object.freeze({
    genreBoost: {},
    energyBias: 0,
    vocalBoost: {},
    trackBoost: {},
    feedbackCount: 0
  });

  const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));
  const toText = value => value == null ? '' : String(value).trim();
  const normalizeText = value => toText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  function readNumber(value) {
    if (value == null || value === '') return null;
    if (typeof value === 'string' && /^(na|n\/a|null|none|unknown|chua xac minh)$/i.test(value.trim())) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function firstDefined(row, keys) {
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(row, key) && row[key] != null && row[key] !== '') {
        return row[key];
      }
    }
    return null;
  }

  function canonicalGenre(rawGenre, subgenre) {
    const g = normalizeText(rawGenre);
    const combined = `${g} ${normalizeText(subgenre)}`;
    if (/hip hop|hiphop|rap/.test(g)) return 'hiphop';
    if (/r b|soul/.test(g)) return 'rnb';
    if (/electronic|edm|dance/.test(g)) return 'electronic';
    if (/classical|instrumental/.test(g)) return 'classical';
    if (/ambient|nature|asmr/.test(g)) return 'ambient';
    if (/rock|metal|punk|grunge/.test(g)) return 'rock';
    if (/country/.test(g)) return 'country';
    if (/jazz/.test(g)) return 'jazz';
    if (/indie/.test(g) && !/pop/.test(g)) return 'indie';
    if (/pop|ballad|v pop|vpop/.test(g)) return 'pop';
    // Legacy values in the earlier MVP data.
    if (/ballad/.test(combined)) return 'pop';
    if (/rap|hip hop/.test(combined)) return 'hiphop';
    if (/ambient|nature/.test(combined)) return 'ambient';
    if (/classical|piano|instrumental/.test(combined)) return 'classical';
    return 'other';
  }

  const DISPLAY_GENRE = Object.freeze({
    pop: 'Pop', hiphop: 'Hip-Hop', rock: 'Rock', electronic: 'Electronic',
    classical: 'Classical', ambient: 'Ambient', rnb: 'R&B / Soul',
    country: 'Country', jazz: 'Jazz', indie: 'Indie', other: 'Other'
  });

  const UI_GENRE = Object.freeze({
    pop: 'pop', hiphop: 'rap', rock: 'rock', electronic: 'electronic',
    classical: 'instrumental', ambient: 'nature', rnb: 'other',
    country: 'other', jazz: 'other', indie: 'other', other: 'other'
  });

  function canonicalMood(value) {
    const raw = Array.isArray(value) ? value[0] : value;
    if (raw == null || raw === '') return null;
    const m = normalizeText(raw).replace(/ /g, '_').toUpperCase();
    const aliases = {
      HAPPY: 'UPLIFTING', JOYFUL: 'UPLIFTING', POSITIVE: 'UPLIFTING', ENERGETIC: 'UPLIFTING',
      PEACEFUL: 'CALM', RELAXED: 'CALM', SOOTHING: 'CALM',
      ANXIOUS: 'INTENSE', RESTLESS: 'INTENSE', STRESSED: 'INTENSE', TENSE: 'INTENSE',
      MELANCHOLIC: 'SAD', DOWN: 'SAD',
      BALANCED: 'NEUTRAL'
    };
    const result = aliases[m] || m;
    return ['CALM', 'NEUTRAL', 'UPLIFTING', 'INTENSE', 'SAD'].includes(result) ? result : null;
  }

  function canonicalGoal(value) {
    if (value == null || value === '') return null;
    const g = normalizeText(value).replace(/ /g, '_').toUpperCase();
    const aliases = {
      CALM: 'RELAX', RELAXATION: 'RELAX', REST: 'RELAX',
      CONCENTRATE: 'FOCUS', CONCENTRATION: 'FOCUS',
      ENERGIZE: 'UPLIFT', ENERGISE: 'UPLIFT', MOTIVATE: 'UPLIFT', ENERGY: 'UPLIFT',
      EMOTIONAL_RELEASE: 'RELEASE', RELEASE_EMOTION: 'RELEASE',
      KEEP: 'MAINTAIN', MAINTAIN_MOOD: 'MAINTAIN'
    };
    const result = aliases[g] || g;
    return ['RELAX', 'FOCUS', 'UPLIFT', 'RELEASE', 'MAINTAIN'].includes(result) ? result : null;
  }

  function canonicalConfidence(value) {
    const c = normalizeText(value).toUpperCase();
    if (c.includes('HIGH') || c === 'VERIFIED') return 'HIGH';
    if (c.includes('LOW')) return 'LOW';
    if (c.includes('MED')) return 'MEDIUM';
    return 'UNSPECIFIED';
  }

  function normalizeSound(row) {
    const source = row && typeof row === 'object' ? row : {};
    const id = toText(firstDefined(source, ['id', 'ID'])) || '';
    const title = toText(firstDefined(source, ['title', 'Title'])) || 'Untitled';
    const artist = toText(firstDefined(source, ['artist', 'Artist'])) || '';
    const country = toText(firstDefined(source, ['country', 'Country'])) || '';
    const rawGenre = toText(firstDefined(source, ['genre', 'Genre'])) || 'Other';
    const subgenre = toText(firstDefined(source, ['subgenre', 'Subgenre'])) || '';
    const genreKey = canonicalGenre(rawGenre, subgenre);
    const mood = canonicalMood(firstDefined(source, ['mood', 'Mood']));
    const goal = canonicalGoal(firstDefined(source, ['goal', 'Goal']));
    const bpmRaw = readNumber(firstDefined(source, ['bpm', 'BPM']));
    const energyRaw = readNumber(firstDefined(source, ['energy', 'Energy_1_5', 'energy_1_5']));
    const valenceRaw = readNumber(firstDefined(source, ['valence', 'Valence_0_1', 'valence_0_1']));
    const bpm = bpmRaw != null && bpmRaw > 0 && bpmRaw <= 300 ? bpmRaw : null;
    const energy = energyRaw != null && energyRaw >= 1 && energyRaw <= 5 ? energyRaw : null;
    const valence = valenceRaw != null && valenceRaw >= 0 && valenceRaw <= 1 ? valenceRaw : null;
    const confidence = canonicalConfidence(firstDefined(source, ['confidence', 'Confidence']));
    const dataSource = toText(firstDefined(source, ['source', 'Source'])) || 'Unspecified';

    // Return the original object fields too, then expose normalized legacy keys
    // so the existing app.js can continue rendering recommendation cards.
    return {
      ...source,
      id, title, artist, country,
      genre: UI_GENRE[genreKey] || 'other',
      canonicalGenre: genreKey,
      category: DISPLAY_GENRE[genreKey] || 'Other',
      subgenre,
      bpm,
      energy,
      valence,
      mood: mood ? [mood.toLowerCase()] : [],
      moodTag: mood,
      goal,
      source: dataSource,
      confidence,
      confidenceLabel: confidence === 'UNSPECIFIED' ? 'Chưa xác định' : confidence,
      vocal: null,
      sourceUrl: firstDefined(source, ['sourceUrl', 'source_url', 'URL']) || ''
    };
  }

  function normalizeLibrary(sounds) {
    return (Array.isArray(sounds) ? sounds : []).map(normalizeSound);
  }

  function stableSort(sounds) {
    return [...sounds].sort((a, b) => {
      const ai = toText(a.id || a.title);
      const bi = toText(b.id || b.title);
      return ai.localeCompare(bi, 'en', { numeric: true, sensitivity: 'base' });
    });
  }

  function load() {
    try {
      const stored = JSON.parse(global.localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        ...DEFAULT_PROFILE,
        ...stored,
        genreBoost: { ...(stored.genreBoost || {}) },
        vocalBoost: { ...(stored.vocalBoost || {}) },
        trackBoost: { ...(stored.trackBoost || {}) }
      };
    } catch (_) {
      return { ...DEFAULT_PROFILE, genreBoost: {}, vocalBoost: {}, trackBoost: {} };
    }
  }

  function save(profile) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      return true;
    } catch (_) {
      return false;
    }
  }

  function userGoal(user) {
    return canonicalGoal(user && (user.goal || user.desiredGoal || user.desired_goal)) || 'RELAX';
  }

  function userMoodClass(user) {
    const mood = normalizeText(user && (user.mood || user.currentMood || user.current_mood));
    if (/anxious|restless|stress|overwhelm|nervous|worried|tense/.test(mood)) return 'ANXIOUS';
    if (/sad|down|low|disappoint|lonely/.test(mood)) return 'SAD';
    if (/angry|frustrat|irritat/.test(mood)) return 'ANGRY';
    if (/happy|positive|excited|energetic|motivated|joy/.test(mood)) return 'UPLIFTING';
    if (/calm|relaxed|peace/.test(mood)) return 'CALM';
    return 'NEUTRAL';
  }

  function preferenceKey(value) {
    const p = normalizeText(value);
    if (!p || p === 'any' || p === 'all' || p === 'tat ca') return 'any';
    if (/ballad/.test(p)) return 'ballad';
    if (/rap|hip hop|hiphop/.test(p)) return 'hiphop';
    if (/rock/.test(p)) return 'rock';
    if (/electronic|edm|dance/.test(p)) return 'electronic';
    if (/instrumental|classical|piano/.test(p)) return 'classical';
    if (/nature|ambient|asmr/.test(p)) return 'ambient';
    if (/r b|soul/.test(p)) return 'rnb';
    if (/country/.test(p)) return 'country';
    if (/jazz/.test(p)) return 'jazz';
    if (/indie/.test(p)) return 'indie';
    if (/pop/.test(p)) return 'pop';
    return p;
  }

  function preferenceFit(track, user) {
    const pref = preferenceKey(user && user.genre);
    if (pref === 'any') return 70; // neutral, non-discriminating preference input
    if (pref === 'ballad') {
      if (track.canonicalGenre === 'pop' && /ballad|piano|acoustic/.test(normalizeText(track.subgenre))) return 100;
      return track.canonicalGenre === 'pop' ? 76 : 24;
    }
    if (pref === 'classical') {
      return ['classical', 'ambient'].includes(track.canonicalGenre) ? 96 : 24;
    }
    if (pref === 'ambient') {
      return track.canonicalGenre === 'ambient' ? 100 : 22;
    }
    if (pref === track.canonicalGenre) return 100;
    if (pref === 'pop' && ['rnb', 'indie'].includes(track.canonicalGenre)) return 68;
    if (pref === 'hiphop' && track.canonicalGenre === 'rnb' && /rap/.test(normalizeText(track.subgenre))) return 75;
    return 24;
  }

  const CURRENT_MOOD_AFFINITY = Object.freeze({
    NEUTRAL:   { CALM: 82, NEUTRAL: 100, UPLIFTING: 72, INTENSE: 42, SAD: 48 },
    CALM:      { CALM: 100, NEUTRAL: 82, UPLIFTING: 62, INTENSE: 30, SAD: 58 },
    SAD:       { CALM: 82, NEUTRAL: 60, UPLIFTING: 48, INTENSE: 45, SAD: 100 },
    ANXIOUS:   { CALM: 100, NEUTRAL: 76, UPLIFTING: 52, INTENSE: 18, SAD: 36 },
    ANGRY:     { CALM: 62, NEUTRAL: 55, UPLIFTING: 66, INTENSE: 84, SAD: 30 },
    UPLIFTING: { CALM: 56, NEUTRAL: 78, UPLIFTING: 100, INTENSE: 72, SAD: 28 }
  });

  function currentStateFit(track, user) {
    const moodClass = userMoodClass(user);
    const moodFit = CURRENT_MOOD_AFFINITY[moodClass][track.moodTag] ?? 60;
    const userEnergy = clamp(readNumber(user && user.energy) ?? 3, 1, 5);
    const trackEnergy = track.energy;
    const energyFit = trackEnergy == null ? 60 : clamp(100 - Math.abs(trackEnergy - userEnergy) * 19, 20, 100);
    let result = 0.65 * moodFit + 0.35 * energyFit;

    const stress = clamp(readNumber(user && user.stress) ?? 5, 0, 10);
    const goal = userGoal(user);
    if (stress >= 7 && ['RELAX', 'FOCUS'].includes(goal) && trackEnergy != null && trackEnergy >= 4) result -= 10;
    if (stress >= 8 && track.moodTag === 'INTENSE' && goal !== 'RELEASE') result -= 8;
    return clamp(result);
  }

  const GOAL_MOOD_FIT = Object.freeze({
    RELAX:   { CALM: 100, NEUTRAL: 76, UPLIFTING: 57, SAD: 48, INTENSE: 18 },
    FOCUS:   { CALM: 92, NEUTRAL: 100, UPLIFTING: 62, SAD: 55, INTENSE: 28 },
    UPLIFT:  { CALM: 54, NEUTRAL: 70, UPLIFTING: 100, SAD: 28, INTENSE: 74 },
    RELEASE: { CALM: 35, NEUTRAL: 52, UPLIFTING: 76, SAD: 72, INTENSE: 100 },
    MAINTAIN:{ CALM: 72, NEUTRAL: 82, UPLIFTING: 76, SAD: 62, INTENSE: 60 }
  });

  function targetEnergy(goal, user) {
    if (goal === 'RELAX') return 2.2;
    if (goal === 'FOCUS') return 2.8;
    if (goal === 'UPLIFT') return 4.1;
    if (goal === 'RELEASE') return 4.0;
    return clamp(readNumber(user && user.energy) ?? 3, 1, 5);
  }

  function goalFit(track, user) {
    const goal = userGoal(user);
    const trackGoal = track.goal || null;
    const goalTagFit = !trackGoal ? 60 : trackGoal === goal ? 100 : (
      goal === 'UPLIFT' && trackGoal === 'RELEASE' ? 72 :
      goal === 'RELEASE' && trackGoal === 'UPLIFT' ? 72 :
      goal === 'RELAX' && trackGoal === 'FOCUS' ? 68 :
      goal === 'FOCUS' && trackGoal === 'RELAX' ? 68 :
      goal === 'MAINTAIN' && trackGoal === 'RELAX' ? 65 : 38
    );
    const moodFit = GOAL_MOOD_FIT[goal][track.moodTag] ?? 55;
    const energy = track.energy;
    const energyFit = energy == null ? 60 : clamp(100 - Math.abs(energy - targetEnergy(goal, user)) * 22, 15, 100);

    // Valence is optional. It is not inferred from BPM, genre, title, or mood.
    // If a verified/annotated value exists, use it lightly; otherwise omit it.
    let weighted = 0.45 * goalTagFit + 0.35 * moodFit + 0.20 * energyFit;
    if (track.valence != null) {
      const targetValence = goal === 'UPLIFT' ? 0.72 : goal === 'RELAX' ? 0.52 : goal === 'FOCUS' ? 0.50 : goal === 'RELEASE' ? 0.58 : 0.55;
      const valenceFit = clamp(100 - Math.abs(track.valence - targetValence) * 100, 20, 100);
      weighted = 0.40 * goalTagFit + 0.30 * moodFit + 0.18 * energyFit + 0.12 * valenceFit;
    }
    return clamp(weighted);
  }

  function profileAdjustment(track, profile) {
    const genreBoost = Number(profile.genreBoost[track.genre] || 0)
      + Number(profile.favoriteGenreBoost?.[track.genre] || 0);
    const trackBoost = Number(profile.trackBoost[track.id] || 0)
      + Number(profile.favoriteTrackBoost?.[track.id] || 0);
    const energyBias = Number(profile.energyBias || 0) * ((track.energy == null ? 3 : track.energy) - 3);
    return clamp(genreBoost + trackBoost + energyBias, -15, 15);
  }

  function confidenceRank(confidence) {
    return confidence === 'HIGH' ? 3 : confidence === 'MEDIUM' ? 2 : confidence === 'LOW' ? 1 : 0;
  }

  function explain(track, user, condition, breakdown) {
    if (condition === 'A') return 'Thuộc bộ bài hát tham chiếu cố định, giống nhau cho mọi người tham gia điều kiện A.';
    if (condition === 'B') return 'Được xếp hạng chỉ theo thể loại hoặc nhóm thể loại bạn yêu thích; không dùng trạng thái và mục tiêu cảm xúc.';
    const bits = [];
    if (preferenceKey(user && user.genre) === 'any') bits.push('không áp dụng ưu tiên thể loại cụ thể');
    else if ((breakdown.preferenceParts?.genre ?? breakdown.preferenceFit) >= 90) bits.push('khớp sở thích thể loại');
    else if ((breakdown.preferenceParts?.genre ?? breakdown.preferenceFit) >= 60) bits.push('có liên hệ với nhóm thể loại bạn chọn');
    if (breakdown.preferenceParts?.artist >= 95) bits.push('trùng bài hoặc nghệ sĩ yêu thích');
    if (breakdown.preferenceParts?.similarity >= 75) bits.push('có đặc trưng tương đồng bài yêu thích');
    if (breakdown.stateFit >= 78) bits.push('tương thích với trạng thái hiện tại');
    if (breakdown.goalFit >= 80) bits.push('phù hợp với mục tiêu bạn chọn');
    else if (breakdown.goalFit >= 65) bits.push('có một số đặc điểm gần với mục tiêu bạn chọn');
    if (!bits.length) bits.push('được xếp hạng theo điểm tổng hợp của trạng thái, mục tiêu và sở thích');
    return `Lý do xếp hạng: ${bits.join('; ')}. Đây là mức tương thích theo quy tắc của hệ thống, không phải bảo đảm về tác động cảm xúc.`;
  }

  // Preview: favorites are explicit local input, never learned from another participant.
  function favoritePreference(track, user) {
    const genre = preferenceFit(track, user);
    const favorites = Array.isArray(user?.favoriteTracks) ? user.favoriteTracks.slice(0, 3) : [];
    if (!favorites.length) return { total: genre, genre, artist: null, similarity: null };
    const artistTokens = value => String(value || '').split(/\s+(?:feat\.?|ft\.?|with|x|&|and)\s+|[,;]/i).map(normalizeText).filter(Boolean);
    const artists = artistTokens(track.artist);
    let artist = 0, similarity = 0;
    for (const f of favorites) {
      const exact = track.id === f.id;
      const sameArtist = artists.some(x => artistTokens(f.artist).includes(x));
      const artistFit = exact ? 100 : sameArtist ? 95 : track.canonicalGenre === f.canonicalGenre ? 45 : 20;
      artist = Math.max(artist, artistFit);
      const features = [];
      if (track.canonicalGenre && f.canonicalGenre) features.push([30,track.canonicalGenre===f.canonicalGenre?100:25]);
      if (track.subgenre && f.subgenre) features.push([20,normalizeText(track.subgenre)===normalizeText(f.subgenre)?100:track.canonicalGenre===f.canonicalGenre?55:20]);
      if (track.energy!=null && f.energy!=null) features.push([20,Math.max(0,100-25*Math.abs(track.energy-f.energy))]);
      if (track.valence!=null && f.valence!=null) features.push([15,100-100*Math.abs(track.valence-f.valence)]);
      if (track.bpm!=null && f.bpm!=null) features.push([15,Math.max(0,100-1.25*Math.min(Math.abs(track.bpm-f.bpm),Math.abs(2*track.bpm-f.bpm),Math.abs(track.bpm-2*f.bpm)))]);
      const sum = features.reduce((n,[w])=>n+w,0);
      const fit = sum ? features.reduce((n,[w,v])=>n+w*v,0)/sum : 60;
      similarity = Math.max(similarity, fit);
    }
    return { total: 0.4*genre+0.4*artist+0.2*similarity, genre, artist, similarity };
  }

  function scoreOne(track, user, profile = null) {
    const preferenceParts = favoritePreference(track, user);
    const preference = preferenceParts.total;
    const state = currentStateFit(track, user);
    const goal = goalFit(track, user);
    // V2 weights: state 30%, desired goal 45%, personal genre preference 25%.
    // Confidence is kept as a separate evidence label, not disguised as fit.
    let score = 0.30 * state + 0.45 * goal + 0.25 * preference;
    if (profile) score = clamp(score + profileAdjustment(track, profile));
    const breakdown = {
      stateFit: Math.round(state * 10) / 10,
      goalFit: Math.round(goal * 10) / 10,
      preferenceFit: Math.round(preference * 10) / 10,
      preferenceParts,
      weights: { state: 0.30, goal: 0.45, preference: 0.25 }
    };
    return {
      sound: track,
      score: Math.round(clamp(score) * 10) / 10,
      preference: breakdown.preferenceFit,
      stateFit: breakdown.stateFit,
      goalFit: breakdown.goalFit,
      scoreBreakdown: breakdown,
      confidence: track.confidence,
      source: track.source,
      reason: explain(track, user, 'C', breakdown),
      method: 'state_goal_preference_content_matching'
    };
  }

  function fixedReferenceSet(sounds) {
    const sorted = stableSort(sounds);
    // Five fixed strata create a more balanced A reference set than simply
    // taking S001-S005 (which would over-represent the first genre in the file).
    const buckets = [
      { key: 'pop', match: s => s.canonicalGenre === 'pop' },
      { key: 'hiphop', match: s => s.canonicalGenre === 'hiphop' },
      { key: 'rock', match: s => s.canonicalGenre === 'rock' },
      { key: 'electronic', match: s => s.canonicalGenre === 'electronic' },
      { key: 'classical_ambient', match: s => ['classical', 'ambient'].includes(s.canonicalGenre) }
    ];
    const chosen = [];
    for (const bucket of buckets) {
      const candidates = sorted.filter(s => bucket.match(s) && !chosen.some(x => x.id === s.id));
      candidates.sort((a, b) => {
        const aEnergy = a.energy;
        const bEnergy = b.energy;
        const aMoodPenalty = a.moodTag === 'NEUTRAL' ? 0 : a.moodTag === 'CALM' ? 1 : 2;
        const bMoodPenalty = b.moodTag === 'NEUTRAL' ? 0 : b.moodTag === 'CALM' ? 1 : 2;
        const aEnergyPenalty = aEnergy == null ? 12 : Math.abs(aEnergy - 3) * 10;
        const bEnergyPenalty = bEnergy == null ? 12 : Math.abs(bEnergy - 3) * 10;
        return (aEnergyPenalty + aMoodPenalty) - (bEnergyPenalty + bMoodPenalty)
          || a.id.localeCompare(b.id, 'en', { numeric: true });
      });
      if (candidates[0]) chosen.push(candidates[0]);
    }
    // Fallback for libraries with fewer than five populated buckets.
    for (const sound of sorted) {
      if (chosen.length >= 5) break;
      if (!chosen.some(x => x.id === sound.id)) chosen.push(sound);
    }
    return chosen.slice(0, 5);
  }

  function recommendByCondition(sounds, user, condition) {
    const library = normalizeLibrary(sounds);
    const code = String(condition || '').toUpperCase();
    if (code === 'D') return [];

    if (code === 'A') {
      return fixedReferenceSet(library).map((sound, index) => ({
        sound,
        score: 100 - index,
        preference: null,
        stateFit: null,
        goalFit: null,
        confidence: sound.confidence,
        source: sound.source,
        reason: explain(sound, user || {}, 'A', {}),
        method: 'fixed_balanced_reference_set'
      }));
    }

    if (code === 'B') {
      return stableSort(library).map(sound => {
        const fit = preferenceFit(sound, user || {});
        return {
          sound,
          score: Math.round(fit * 10) / 10,
          preference: fit,
          stateFit: null,
          goalFit: null,
          confidence: sound.confidence,
          source: sound.source,
          reason: explain(sound, user || {}, 'B', { preferenceFit: fit }),
          method: 'genre_preference_only'
        };
      }).sort((a, b) => b.score - a.score
        || a.sound.id.localeCompare(b.sound.id, 'en', { numeric: true }));
    }

    if (code === 'C') {
      // Research C deliberately uses no learned profile, preventing feedback
      // from an earlier participant/device session from changing study results.
      return library.map(sound => scoreOne(sound, user || {}, null))
        .sort((a, b) => b.score - a.score
          || confidenceRank(b.confidence) - confidenceRank(a.confidence)
          || a.sound.id.localeCompare(b.sound.id, 'en', { numeric: true }));
    }
    return [];
  }

  function recommendAll(sounds, user) {
    const profile = load();
    const library = normalizeLibrary(sounds);
    return library.map(sound => scoreOne(sound, user || {}, profile))
      .sort((a, b) => b.score - a.score
        || confidenceRank(b.confidence) - confidenceRank(a.confidence)
        || a.sound.id.localeCompare(b.sound.id, 'en', { numeric: true }));
  }

  function recommend(sounds, user) {
    return recommendAll(sounds, user).slice(0, 5);
  }

  function favorite(sound) {
    const track = normalizeSound(sound || {});
    const profile = load();
    profile.favoriteGenreBoost = profile.favoriteGenreBoost || {};
    profile.favoriteTrackBoost = profile.favoriteTrackBoost || {};
    if (track.genre) profile.favoriteGenreBoost[track.genre] = Math.min(10, Number(profile.favoriteGenreBoost[track.genre] || 0) + 1.5);
    if (track.id) profile.favoriteTrackBoost[track.id] = Math.min(12, Number(profile.favoriteTrackBoost[track.id] || 0) + 3);
    save(profile);
    return profile;
  }

  function learn(sound, user, fit, comfort) {
    const track = normalizeSound(sound || {});
    const profile = load();
    const fitValue = clamp(readNumber(fit) ?? 3, 1, 5);
    const comfortValue = clamp(readNumber(comfort) ?? 3, 1, 5);
    const delta = ((fitValue - 3) * 1.8) + ((comfortValue - 3) * 1.0);
    profile.trackBoost[track.id] = clamp(Number(profile.trackBoost[track.id] || 0) + delta, -15, 15);
    if (user && user.genre && user.genre !== 'any') {
      profile.genreBoost[track.genre] = clamp(Number(profile.genreBoost[track.genre] || 0) + (fitValue - 3) * 0.7, -12, 12);
    }
    profile.energyBias = clamp(Number(profile.energyBias || 0) + (fitValue - 3) * 0.04, -1.5, 1.5);
    profile.feedbackCount = Number(profile.feedbackCount || 0) + 1;
    save(profile);
    return profile;
  }

  function auditData(sounds) {
    const rows = Array.isArray(sounds) ? sounds : [];
    const library = normalizeLibrary(rows);
    const ids = new Map();
    const titles = new Map();
    const warnings = [];
    let missingBpm = 0, missingEnergy = 0, missingValence = 0, missingMood = 0, missingGoal = 0;
    let lowConfidence = 0, unspecifiedConfidence = 0;
    for (const t of library) {
      ids.set(t.id, (ids.get(t.id) || 0) + 1);
      const titleKey = `${normalizeText(t.title)}|${normalizeText(t.artist)}`;
      titles.set(titleKey, (titles.get(titleKey) || 0) + 1);
      if (t.bpm == null) missingBpm++;
      if (t.energy == null) missingEnergy++;
      if (t.valence == null) missingValence++;
      if (!t.moodTag) missingMood++;
      if (!t.goal) missingGoal++;
      if (t.confidence === 'LOW') lowConfidence++;
      if (t.confidence === 'UNSPECIFIED') unspecifiedConfidence++;
    }
    const duplicateIds = [...ids.entries()].filter(([id, count]) => !id || count > 1).map(([id, count]) => ({ id, count }));
    const duplicateTracks = [...titles.entries()].filter(([, count]) => count > 1).map(([key, count]) => ({ key, count }));
    if (missingValence === rows.length) warnings.push('Valence đang thiếu toàn bộ; thuật toán sẽ không sử dụng Valence trong lần xếp hạng này.');
    if (missingBpm > 0) warnings.push(`${missingBpm}/${rows.length} bài thiếu BPM; BPM không được dùng để tự suy ra Mood hoặc hiệu quả cảm xúc.`);
    if (lowConfidence > 0) warnings.push(`${lowConfidence} bài được gắn Confidence LOW; cần ưu tiên kiểm tra nguồn và nhãn.`);
    if (duplicateIds.length) warnings.push('Có ID trùng hoặc ID rỗng.');
    if (duplicateTracks.length) warnings.push('Có khả năng trùng tên bài hát và nghệ sĩ.');
    return {
      version: VERSION,
      total: rows.length,
      uniqueIds: ids.size,
      duplicateIds,
      possibleDuplicateTracks: duplicateTracks,
      missing: { bpm: missingBpm, energy: missingEnergy, valence: missingValence, mood: missingMood, goal: missingGoal },
      confidence: {
        high: library.filter(t => t.confidence === 'HIGH').length,
        medium: library.filter(t => t.confidence === 'MEDIUM').length,
        low: lowConfidence,
        unspecified: unspecifiedConfidence
      },
      warnings
    };
  }

  global.HSRecommender = {
    version: VERSION,
    normalizeSound,
    normalizeLibrary,
    recommend,
    recommendAll,
    recommendByCondition,
    scoreOne,
    favoritePreference,
    auditData,
    getFixedReferenceIds: sounds => fixedReferenceSet(normalizeLibrary(sounds)).map(s => s.id),
    load,
    learn,
    favorite
  };
})(window);
