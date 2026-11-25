const assert = require('node:assert/strict');
global.window = global;
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
require('../ai/recommender.js');
require('../data/sounds.js');

const songs = global.SOUNDS;
assert.equal(songs.length, 300, 'dataset must contain exactly 300 songs');
assert.equal(new Set(songs.map(s => s.ID)).size, 300, 'all IDs must be unique');
assert.equal(songs[0].ID, 'S001');
assert.equal(songs[299].ID, 'S300');
assert.ok(songs.every(s => s.Title && s.Artist && s.Country && s.Genre && s.Subgenre), 'identity and genre fields must be populated');
assert.ok(songs.every(s => Number.isInteger(s.BPM) && s.BPM > 0), 'provided BPM values must be numeric');
assert.ok(songs.every(s => Number.isInteger(s.Energy_1_5) && s.Energy_1_5 >= 1 && s.Energy_1_5 <= 5), 'Energy must be 1–5');
assert.ok(songs.every(s => s.Valence_0_1 === null), 'Valence NA must stay null, not guessed');
assert.ok(songs.every(s => ['CALM','NEUTRAL','UPLIFTING','INTENSE','SAD'].includes(s.Mood)), 'Mood tags must use allowed values');
assert.ok(songs.every(s => ['RELAX','FOCUS','UPLIFT','RELEASE'].includes(s.Goal)), 'Goal tags must use allowed values');

const userA = { stress: 8, energy: 1, mood: 'restless', goal: 'calm', genre: 'ballad' };
const userB = { stress: 1, energy: 5, mood: 'positive', goal: 'energize', genre: 'rock' };
const a1 = HSRecommender.recommendByCondition(songs, userA, 'A').map(x => x.sound.id);
const a2 = HSRecommender.recommendByCondition(songs, userB, 'A').map(x => x.sound.id);
assert.deepEqual(a1, a2, 'A must be invariant to user input');
assert.equal(a1.length, 5);
assert.equal(HSRecommender.recommendByCondition(songs, userA, 'B').length, 300);
assert.equal(HSRecommender.recommendByCondition(songs, userA, 'C').length, 300);
assert.equal(HSRecommender.recommendByCondition(songs, userA, 'D').length, 0);
assert.notDeepEqual(
  HSRecommender.recommendByCondition(songs, userA, 'C').slice(0,5).map(x => x.sound.id),
  HSRecommender.recommendByCondition(songs, userB, 'C').slice(0,5).map(x => x.sound.id),
  'C should respond to user state, goal and preference'
);
const audit = HSRecommender.auditData(songs);
assert.equal(audit.total, 300);
assert.equal(audit.uniqueIds, 300);
assert.equal(audit.missing.valence, 300);
console.log('PASS: complete 300-song dataset integrity and A/B/C/D integration tests.');
