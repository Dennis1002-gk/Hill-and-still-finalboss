(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const PROFILE_KEY = 'hs_mvp01_profile';
  const LIBRARY_KEY = 'hs_v2_personal_collection';
  const state = {
    condition: null,
    user: null,
    pre: null,
    participantCode: null,
    top: [],
    ranked: [],
    recommendationHistory: [],
    refreshCount: 0,
    restCompleted: false,
    restInterval: null,
    restRemaining: 120,
    submitted: false,
    previewOnly: false
  };

  const displayGenre = {
    pop: 'Pop', ballad: 'Pop / Ballad', rap: 'Hip-Hop', rock: 'Rock',
    electronic: 'Electronic', instrumental: 'Classical', nature: 'Ambient / Nature', other: 'Other'
  };
  const safeRead = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
    catch (_) { return fallback; }
  };
  const safeWrite = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { toast('Không thể lưu dữ liệu trên trình duyệt này.'); return false; }
  };
  const normalize = (value) => String(value ?? '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);

  function toast(message) {
    const el = $('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  function showMain(name) {
    if (name !== 'discover') stopRestTimer();
    document.querySelectorAll('.main-view').forEach((view) => {
      view.classList.toggle('active', view.dataset.view === name);
    });
    document.querySelectorAll('.nav-tab').forEach((button) => {
      button.classList.toggle('active', button.dataset.tab === name);
    });
    if (name === 'mymusic') renderLibrary();
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  document.querySelectorAll('.nav-tab').forEach((button) => {
    button.addEventListener('click', () => showMain(button.dataset.tab));
  });
  document.querySelectorAll('[data-go]').forEach((button) => {
    button.addEventListener('click', () => showMain(button.dataset.go));
  });
  document.querySelectorAll('[data-show-research]').forEach((button) => {
    button.addEventListener('click', () => $('d-research').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  });

  function getUser() {
    return {
      stress: Number($('stress').value),
      energy: Number($('energy').value),
      mood: $('mood').value,
      goal: $('goal').value,
      genre: $('genre').value
    };
  }
  $('stress').addEventListener('input', (e) => $('stressOut').textContent = `${e.target.value}/10`);
  $('energy').addEventListener('input', (e) => $('energyOut').textContent = `${e.target.value}/5`);
  $('postStress').addEventListener('input', (e) => $('postStressOut').textContent = `${e.target.value}/10`);
  $('postEnergy').addEventListener('input', (e) => $('postEnergyOut').textContent = `${e.target.value}/5`);

  function coverPath(sound) {
    const map = {
      pop: 'cover-ballad.svg', ballad: 'cover-ballad.svg', rap: 'cover-rap.svg',
      rock: 'cover-rock.svg', electronic: 'cover-electronic.svg',
      instrumental: 'cover-instrumental.svg', nature: 'cover-nature.svg', other: 'cover-nature.svg'
    };
    return `assets/${map[sound.genre] || 'cover-nature.svg'}`;
  }

  function metaHTML(sound) {
    const bpm = sound.bpm == null ? 'BPM: chưa có' : `${sound.bpm} BPM`;
    const energy = sound.energy == null ? 'Energy: chưa có' : `Energy ${sound.energy}/5`;
    const mood = sound.moodTag || 'Chưa phân loại';
    const goal = sound.goal || 'Chưa phân loại';
    const confidence = sound.confidenceLabel || sound.confidence || 'Chưa xác định';
    return `<div class="track-meta">
      <span>${escapeHTML(sound.category || displayGenre[sound.genre] || 'Other')}</span>
      <span>${escapeHTML(bpm)}</span><span>${escapeHTML(energy)}</span>
      <span>Mood: ${escapeHTML(mood)}</span><span>Goal: ${escapeHTML(goal)}</span>
      <span>Confidence: ${escapeHTML(confidence)}</span>
    </div>`;
  }

  function renderTop(items) {
    const host = $('playlist');
    host.replaceChildren();
    if (!items.length) {
      host.textContent = 'Chưa có dữ liệu phù hợp để tạo gợi ý.';
      return;
    }
    const favorites = safeRead(LIBRARY_KEY, []);
    items.forEach((item, index) => {
      const sound = item.sound || item;
      const card = document.createElement('article');
      card.className = 'catalog-track';
      const rank = document.createElement('div');
      rank.className = 'track-no';
      rank.textContent = String(index + 1).padStart(2, '0');
      const info = document.createElement('div');
      info.className = 'track-info';
      const title = document.createElement('strong');
      title.textContent = sound.title || 'Chưa có tên bài hát';
      const artist = document.createElement('small');
      artist.className = 'artist';
      artist.textContent = sound.artist || 'Nghệ sĩ chưa cập nhật';
      const meta = document.createElement('div');
      meta.innerHTML = metaHTML(sound);
      const score = document.createElement('div');
      score.className = 'track-score';
      score.textContent = state.condition === 'A'
        ? `Vị trí ${index + 1}/5 trong bộ tham chiếu cố định`
        : state.condition === 'B'
          ? `Điểm khớp thể loại theo quy tắc: ${Math.round(item.score)}/100`
          : `Điểm tương thích theo quy tắc: ${Math.round(item.score)}/100`;
      const reason = document.createElement('p');
      reason.className = 'track-reason';
      reason.textContent = item.reason || 'Được chọn bởi phương pháp của điều kiện nghiên cứu.';
      info.append(title, artist, meta, score, reason);

      const actions = document.createElement('div');
      actions.className = 'track-actions';
      const save = document.createElement('button');
      save.type = 'button';
      const alreadySaved = favorites.some((x) => x.id === sound.id);
      save.className = alreadySaved ? 'saved' : '';
      save.textContent = alreadySaved ? '♥ Đã lưu' : '♡ Yêu thích';
      save.addEventListener('click', () => saveFavorite(sound, save));
      actions.append(save);
      card.append(rank, info, actions);
      host.append(card);
    });
  }

  function saveFavorite(sound, button) {
    const list = safeRead(LIBRARY_KEY, []);
    if (list.some((x) => x.id === sound.id)) {
      toast('Bài hát đã nằm trong danh sách yêu thích.');
      return;
    }
    list.unshift({ id: sound.id, title: sound.title, artist: sound.artist, genre: sound.genre,
      category: sound.category, bpm: sound.bpm, energy: sound.energy, mood: sound.mood,
      addedAt: new Date().toISOString() });
    safeWrite(LIBRARY_KEY, list);
    if (window.HSRecommender) window.HSRecommender.favorite(sound);
    button.textContent = '♥ Đã lưu';
    button.classList.add('saved');
    renderLibrary();
    toast('Đã lưu bài hát vào hồ sơ trên thiết bị này.');
  }

  function renderLibrary() {
    const host = $('myLibrary');
    if (!host) return;
    const query = normalize($('myLibrarySearch')?.value || '');
    const all = safeRead(LIBRARY_KEY, []);
    const items = all.filter((song) => !query || normalize(`${song.title} ${song.artist}`).includes(query));
    $('myMusicCount').textContent = `${all.length} bài đã lưu`;
    host.replaceChildren();
    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-library';
      empty.textContent = all.length ? 'Không tìm thấy bài hát phù hợp.' : 'Bạn chưa lưu bài hát nào. Hãy khám phá Top 5 và lưu bài hát bạn muốn giữ lại.';
      host.append(empty);
      return;
    }
    items.forEach((song, index) => {
      const card = document.createElement('article');
      card.className = 'catalog-track';
      const rank = document.createElement('div');
      rank.className = 'track-no';
      rank.textContent = '♪';
      const info = document.createElement('div');
      info.className = 'track-info';
      const title = document.createElement('strong');
      title.textContent = song.title || 'Chưa có tên';
      const artist = document.createElement('small');
      artist.className = 'artist';
      artist.textContent = song.artist || 'Nghệ sĩ chưa cập nhật';
      const meta = document.createElement('div');
      meta.className = 'track-meta';
      [displayGenre[song.genre] || song.category || 'Chưa phân loại', song.bpm == null ? 'BPM: chưa có' : `${song.bpm} BPM`, song.energy == null ? 'Energy: chưa có' : `Energy ${song.energy}/5`].forEach((value) => {
        const tag = document.createElement('span'); tag.textContent = value; meta.append(tag);
      });
      info.append(title, artist, meta);
      const actions = document.createElement('div');
      actions.className = 'track-actions';
      const remove = document.createElement('button');
      remove.type = 'button'; remove.textContent = 'Bỏ yêu thích';
      remove.addEventListener('click', () => {
        const next = safeRead(LIBRARY_KEY, []).filter((item) => item.id !== song.id);
        safeWrite(LIBRARY_KEY, next); renderLibrary(); toast('Đã bỏ bài hát khỏi bộ sưu tập.');
      });
      actions.append(remove); card.append(rank, info, actions); host.append(card);
    });
  }
  $('myLibrarySearch').addEventListener('input', renderLibrary);

  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }

  async function allocateParticipantCode() {
    const config = window.HS_SUPABASE_CONFIG || {};
    if (!config.url || !config.anonKey || config.url.includes('YOUR_PROJECT') || config.anonKey.includes('YOUR_PUBLISHABLE')) {
      state.previewOnly = true;
      state.participantCode = `PREVIEW-${Date.now().toString().slice(-6)}`;
      $('participantCode').value = state.participantCode;
      return;
    }
    const base = config.url.replace(/\/$/, '');
    const response = await fetch(`${base}/rest/v1/rpc/next_hs_participant_code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: config.anonKey, Authorization: `Bearer ${config.anonKey}` },
      body: '{}'
    });
    if (!response.ok) throw new Error(`Không cấp được mã tham gia (HTTP ${response.status}). ${await response.text()}`);
    const code = await response.json();
    state.participantCode = typeof code === 'string' ? code : String(code);
    $('participantCode').value = state.participantCode;
    state.previewOnly = false;
  }

  function snapshotRecommendations(items, trigger) {
    return {
      trigger,
      captured_at: new Date().toISOString(),
      items: items.map((item, index) => {
        const sound = item.sound || item;
        return {
          rank: index + 1,
          id: sound.id || null,
          title: sound.title || '',
          artist: sound.artist || '',
          genre: sound.canonicalGenre || sound.genre || null,
          subgenre: sound.subgenre || null,
          energy: sound.energy ?? null,
          mood: sound.moodTag || null,
          goal: sound.goal || null,
          score: Number.isFinite(item.score) ? item.score : null,
          score_breakdown: item.scoreBreakdown || null
        };
      })
    };
  }

  // Refresh policy V2: preserve relevance before novelty.
  function refreshEligible(ranked, condition) {
    const valid = ranked.filter(item => Number.isFinite(item.score));
    if (condition === 'B') {
      const best = Math.max(0, ...valid.map(item => item.score));
      return best >= 70 ? valid.filter(item => item.score === best) : [];
    }
    const best = Math.max(0, ...valid.map(item => item.score));
    return valid.filter(item => item.score >= Math.max(75, best - 18));
  }

  function weightedAlternativeBatch(ranked, condition, history, currentItems, limit = 5) {
    const shownIds = new Set(history.flatMap(batch => batch.items.map(item => item.id)));
    const id = item => (item.sound || item).id;
    const currentIds = new Set(currentItems.map(id));
    const eligible = refreshEligible(ranked, condition);
    const chosen = [];
    const used = new Set();
    const tiers = [
      eligible.filter(item => !shownIds.has(id(item)) && !currentIds.has(id(item))),
      eligible.filter(item => !currentIds.has(id(item))),
      eligible
    ];
    for (const tier of tiers) {
      const remaining = tier.filter(item => !used.has(id(item)));
      while (chosen.length < limit && remaining.length) {
        const minScore = Math.min(...remaining.map(item => item.score));
        const weights = remaining.map(item => item.score - minScore + 1);
        let point = Math.random() * weights.reduce((sum, weight) => sum + weight, 0);
        let index = 0;
        while (index < weights.length - 1 && (point -= weights[index]) > 0) index++;
        const item = remaining.splice(index, 1)[0];
        if (used.has(id(item))) continue;
        used.add(id(item));
        chosen.push(item);
      }
    }
    return chosen.sort((a, b) => b.score - a.score
      || String(id(a)).localeCompare(String(id(b)), 'en', { numeric: true }));
  }

  function refreshRecommendations() {
    if (!['B', 'C'].includes(state.condition) || !state.ranked.length || state.submitted) return;
    const next = weightedAlternativeBatch(
      state.ranked, state.condition, state.recommendationHistory, state.top, 5
    );
    if (!next.length) { toast('Không còn gợi ý đạt ngưỡng phù hợp.'); return; }
    state.top = next;
    state.refreshCount += 1;
    state.recommendationHistory.push(snapshotRecommendations(state.top, 'refresh'));
    renderTop(state.top);
    $('resultHint').textContent = `Điều kiện ${state.condition} · ${state.top.length} gợi ý · Lần tạo lại ${state.refreshCount}`;
    toast('Đã cập nhật gợi ý phù hợp. Một số bài có thể lặp lại.');
  }

  async function createPlaylist() {
    const condition = $('researchCondition').value;
    if (!['A', 'B', 'C', 'D'].includes(condition)) {
      toast('Nhóm nghiên cứu cần phân công điều kiện A/B/C/D trước.');
      return;
    }
    if (!window.HSRecommender || !Array.isArray(window.SOUNDS)) {
      toast('Không tải được thư viện nhạc hoặc thuật toán. Hãy tải lại trang.');
      return;
    }
    const button = $('makePlaylist');
    button.disabled = true;
    $('researchStatus').textContent = 'Đang chuẩn bị phiên nghiên cứu…';
    try {
      if (!state.participantCode || state.submitted) await allocateParticipantCode();
    } catch (error) {
      button.disabled = false;
      $('researchStatus').textContent = `${error.message} Bạn có thể thử lại; chưa có dữ liệu nào được gửi.`;
      return;
    }
    button.disabled = false;

    state.condition = condition;
    state.user = getUser();
    state.pre = { ...state.user, capturedAt: new Date().toISOString(), condition };
    stopRestTimer(false);
    state.submitted = false;
    $('submitResearch').disabled = false;
    state.restCompleted = false;
    $('researchConsent').checked = false;
    $('postStress').value = 5; $('postStressOut').textContent = '5/10';
    $('postEnergy').value = 3; $('postEnergyOut').textContent = '3/5';
    $('goalAchievement').value = '3'; $('researchSatisfaction').value = '3';
    $('researchConditionLabel').value = `${condition} — ${({ A: 'Bộ bài tham chiếu cố định', B: 'Theo thể loại yêu thích', C: 'Trạng thái + mục tiêu + sở thích', D: 'Nghỉ yên tĩnh' })[condition]}`;
    $('submitStatus').textContent = '';

    hide($('d-top5')); hide($('d-rest')); hide($('d-research'));
    state.ranked = [];
    state.recommendationHistory = [];
    state.refreshCount = 0;
    hide($('refreshPlaylist'));
    if (condition === 'D') {
      state.top = [];
      $('restTimer').textContent = '02:00';
      $('restStatus').textContent = 'Sẵn sàng bắt đầu khoảng nghỉ 2 phút.';
      $('startRest').disabled = false;
      show($('d-rest'));
      $('researchStatus').textContent = state.previewOnly
        ? 'Đang ở chế độ xem trước; chưa kết nối Supabase nên không thể gửi dữ liệu nghiên cứu.'
        : `Đã cấp mã tham gia ${state.participantCode}. Hoàn thành 2 phút nghỉ yên tĩnh rồi đánh giá sau.`;
    } else {
      const ranked = window.HSRecommender.recommendByCondition(window.SOUNDS, state.user, condition);
      state.ranked = ranked;
      state.top = (condition === 'B' ? refreshEligible(ranked, condition) : ranked).slice(0, 5);
      state.recommendationHistory.push(snapshotRecommendations(state.top, 'initial'));
      renderTop(state.top);
      $('resultHint').textContent = `Điều kiện ${condition} · ${state.top.length} gợi ý`;
      if (condition === 'B' || condition === 'C') show($('refreshPlaylist'));
      show($('d-top5'));
      show($('d-research'));
      $('researchStatus').textContent = state.previewOnly
        ? 'Đang ở chế độ xem trước; cần cấu hình Supabase và mã tham gia để lưu dữ liệu.'
        : `Đã cấp mã tham gia ${state.participantCode}. Website chỉ hiển thị gợi ý, không phát nhạc.`;
    }
    $('d-checkin').classList.add('completed');
    (condition === 'D' ? $('d-rest') : $('d-top5')).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  $('makePlaylist').addEventListener('click', createPlaylist);
  $('refreshPlaylist').addEventListener('click', refreshRecommendations);
  function stopRestTimer(resetUnfinished = true) {
    if (state.restInterval) clearInterval(state.restInterval);
    state.restInterval = null;
    if (resetUnfinished && state.condition === 'D' && !state.restCompleted) {
      state.restRemaining = 120;
      $('restTimer').textContent = '02:00';
      $('startRest').disabled = false;
      $('restStatus').textContent = 'Khoảng nghỉ đã tạm dừng khi bạn rời trang. Bắt đầu lại khi sẵn sàng.';
    }
  }
  $('startRest').addEventListener('click', () => {
    if (state.restInterval || state.restCompleted) return;
    state.restRemaining = 120;
    $('startRest').disabled = true;
    $('restStatus').textContent = 'Đang nghỉ yên tĩnh. Không mở nhạc trong khoảng thời gian này.';
    state.restInterval = setInterval(() => {
      state.restRemaining -= 1;
      const minutes = String(Math.floor(state.restRemaining / 60)).padStart(2, '0');
      const seconds = String(state.restRemaining % 60).padStart(2, '0');
      $('restTimer').textContent = `${minutes}:${seconds}`;
      if (state.restRemaining <= 0) {
        stopRestTimer(false);
        state.restCompleted = true;
        $('restStatus').textContent = 'Đã hoàn thành 2 phút nghỉ yên tĩnh. Bạn có thể đánh giá sau trải nghiệm.';
        show($('d-research'));
        $('d-research').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 1000);
  });

  async function submitResearch() {
    const status = $('submitStatus');
    if (!state.pre || !state.condition) { status.textContent = 'Bạn cần hoàn thành phần check-in trước.'; return; }
    if (state.submitted) { status.textContent = 'Phiên này đã được gửi.'; return; }
    if (state.condition === 'D' && !state.restCompleted) { status.textContent = 'Bạn cần hoàn thành 2 phút nghỉ yên tĩnh trước khi gửi.'; return; }
    if (!state.participantCode || state.previewOnly) { status.textContent = 'Đang ở chế độ xem trước. Chưa thể gửi dữ liệu lên Supabase.'; return; }
    if (!$('researchConsent').checked) { status.textContent = 'Bạn cần xác nhận đồng ý tham gia trước khi gửi.'; return; }

    const config = window.HS_SUPABASE_CONFIG || {};
    const condition = state.condition;
    const recommendations = state.top.map((item, index) => {
      const sound = item.sound || item;
      return {
        rank: index + 1, id: sound.id || null, title: sound.title || '', artist: sound.artist || '',
        genre: sound.canonicalGenre || sound.genre || null, subgenre: sound.subgenre || null,
        bpm: sound.bpm ?? null, energy: sound.energy ?? null, mood: sound.moodTag || null,
        goal: sound.goal || null, score: Number.isFinite(item.score) ? item.score : null,
        confidence: sound.confidence || null, source: sound.source || null,
        score_breakdown: item.scoreBreakdown || null
      };
    });
    const payload = {
      participant_code: state.participantCode,
      condition,
      pre_discover: state.pre,
      discover_data: {
        algorithm_version: window.HSRecommender.version || '2.0.0',
        refresh_policy_version: '2.1.0',
        rest_duration_seconds: state.condition === 'D' ? 120 : null,
        assigned_condition: condition,
        recommendation_method: condition === 'A' ? 'fixed_balanced_reference_set' : condition === 'B' ? 'genre_preference_only' : condition === 'C' ? 'state_goal_preference_content_matching' : 'quiet_rest',
        recommendations,
        recommendation_history: state.recommendationHistory,
        refresh_count: state.refreshCount,
        rest_completed: condition === 'D' ? state.restCompleted : null,
        audio_played: false,
        interaction_note: condition === 'D'
          ? 'Condition D: quiet rest for 2 minutes; website does not play audio.'
          : 'Website displays ranked music metadata only; no playback is embedded and listening is not verified.'
      },
      post_discover: {
        stress: Number($('postStress').value),
        energy: Number($('postEnergy').value),
        goal_achievement: Number($('goalAchievement').value),
        satisfaction: Number($('researchSatisfaction').value),
        submitted_at: new Date().toISOString()
      },
      consent_to_submit: true
    };

    const submit = $('submitResearch');
    submit.disabled = true;
    status.textContent = 'Đang gửi câu trả lời…';
    try {
      const base = config.url.replace(/\/$/, '');
      const response = await fetch(`${base}/rest/v1/hs_discover_submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: config.anonKey, Authorization: `Bearer ${config.anonKey}`, Prefer: 'return=minimal' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      state.submitted = true;
      status.textContent = `Gửi thành công. Mã tham gia: ${state.participantCode}. Cảm ơn bạn đã tham gia.`;
      $('researchCondition').value = '';
      toast('Đã gửi dữ liệu nghiên cứu.');
    } catch (error) {
      status.textContent = `Chưa gửi được dữ liệu: ${error.message}. Bạn có thể thử lại.`;
    } finally {
      submit.disabled = state.submitted;
    }
  }
  $('submitResearch').addEventListener('click', submitResearch);

  $('resetProfile').addEventListener('click', () => {
    if (!confirm('Đặt lại hồ sơ gợi ý và các tín hiệu yêu thích trên thiết bị này?')) return;
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(LIBRARY_KEY);
    toast('Đã đặt lại hồ sơ trên thiết bị này.');
  });

  const audit = window.HSRecommender && window.HSRecommender.auditData(window.SOUNDS || []);
  $('libraryCount').textContent = audit ? `${audit.total} bài hát · V2` : 'Không tải được thư viện';
  if (audit && audit.warnings.length) console.warn('[HILL AND STILL] Library audit warnings:', audit.warnings);
  const progress = $('scrollProgress');
  window.addEventListener('scroll', () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
  }, { passive: true });
})();
