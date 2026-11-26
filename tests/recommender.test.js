const assert = require('node:assert/strict');
global.window = global;
global.localStorage = {
  getItem() { return null; },
  setItem() {},
  removeItem() {}
};
require('../ai/recommender.js');

const songs = [
  { ID:'S001', Title:'Nàng Thơ', Artist:'Hoàng Dũng', Country:'Vietnam', Genre:'Pop', Subgenre:'Indie pop ballad', BPM:123, Energy_1_5:3, Valence_0_1:'NA', Mood:'SAD', Goal:'RELAX', Source:'SongBPM;Editorial', Confidence:'HIGH' },
  { ID:'S018', Title:'Đưa Nhau Đi Trốn', Artist:'Đen ft. Linh Cáo', Country:'Vietnam', Genre:'Hip-Hop', Subgenre:'Conscious hip-hop, melodic rap', BPM:90, Energy_1_5:2, Valence_0_1:'NA', Mood:'CALM', Goal:'FOCUS', Source:'Editorial', Confidence:'MEDIUM' },
  { ID:'S040', Title:'Smells Like Teen Spirit', Artist:'Nirvana', Country:'International', Genre:'Rock', Subgenre:'Grunge, alternative rock', BPM:117, Energy_1_5:5, Valence_0_1:'NA', Mood:'INTENSE', Goal:'RELEASE', Source:'Editorial', Confidence:'MEDIUM' },
  { ID:'S051', Title:'The New World', Artist:'Hoaprox', Country:'Vietnam', Genre:'Electronic', Subgenre:'Future bass, electronic dance', BPM:128, Energy_1_5:4, Valence_0_1:'NA', Mood:'UPLIFTING', Goal:'UPLIFT', Source:'Editorial', Confidence:'MEDIUM' },
  { ID:'S068', Title:'Kiss the Rain', Artist:'Yiruma', Country:'International', Genre:'Classical', Subgenre:'Contemporary piano', BPM:70, Energy_1_5:2, Valence_0_1:'NA', Mood:'CALM', Goal:'RELAX', Source:'Editorial', Confidence:'MEDIUM' },
  { ID:'S084', Title:'1/1', Artist:'Brian Eno', Country:'International', Genre:'Ambient', Subgenre:'Ambient, generative music', BPM:80, Energy_1_5:2, Valence_0_1:'NA', Mood:'CALM', Goal:'FOCUS', Source:'Editorial', Confidence:'MEDIUM' }
];

const userA = { stress:8, energy:1, mood:'restless', goal:'calm', genre:'ballad' };
const userOther = { stress:1, energy:5, mood:'happy', goal:'energize', genre:'rock' };
const A1 = HSRecommender.recommendByCondition(songs, userA, 'A').map(x => x.sound.id);
const A2 = HSRecommender.recommendByCondition(songs, userOther, 'A').map(x => x.sound.id);
assert.deepEqual(A1, A2, 'Condition A must be independent of user inputs');
assert.equal(A1.length, 5, 'Condition A returns five fixed reference songs');

const B1 = HSRecommender.recommendByCondition(songs, userA, 'B').map(x => x.sound.id);
const B2 = HSRecommender.recommendByCondition(songs, { ...userA, stress:1, energy:5, mood:'happy', goal:'energize' }, 'B').map(x => x.sound.id);
assert.deepEqual(B1, B2, 'Condition B must ignore stress, energy, mood, and goal');
const BPop = HSRecommender.recommendByCondition(songs, { ...userA, genre:'ballad' }, 'B');
const BRock = HSRecommender.recommendByCondition(songs, { ...userA, genre:'rock' }, 'B');
assert.notDeepEqual(BPop.map(x => x.sound.id), BRock.map(x => x.sound.id), 'Condition B must respond to genre preference');

const C1 = HSRecommender.recommendByCondition(songs, userA, 'C').map(x => x.sound.id);
const C2 = HSRecommender.recommendByCondition(songs, userOther, 'C').map(x => x.sound.id);
assert.notDeepEqual(C1, C2, 'Condition C should respond to changes in state, goal, and preference');
assert.equal(HSRecommender.recommendByCondition(songs, userA, 'D').length, 0, 'Condition D returns no tracks');

const normalized = HSRecommender.normalizeSound(songs[0]);
assert.equal(normalized.title, 'Nàng Thơ');
assert.equal(normalized.genre, 'pop');
assert.equal(normalized.energy, 3);
assert.equal(normalized.valence, null, 'NA Valence must remain missing');
assert.equal(normalized.moodTag, 'SAD');
assert.equal(normalized.goal, 'RELAX');


const positiveUser = { stress: 2, energy: 4, mood: 'positive', goal: 'uplift', genre: 'electronic' };
const neutralUser = { ...positiveUser, mood: 'neutral' };
const positiveScores = HSRecommender.recommendByCondition(songs, positiveUser, 'C');
const neutralScores = HSRecommender.recommendByCondition(songs, neutralUser, 'C');
assert.notDeepEqual(positiveScores.map(x => x.score), neutralScores.map(x => x.score), 'UI mood=positive must be recognized as UPLIFTING, not NEUTRAL');

const audit = HSRecommender.auditData(songs);
assert.equal(audit.total, 6);
assert.equal(audit.missing.valence, 6);
console.log('PASS: A/B/C/D behavior, uppercase schema adapter, missing Valence handling, and data audit.');
