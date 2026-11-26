# HILL AND STILL — Algorithm Specification V2

## 1. Purpose and scope

V2 is a transparent, rule-based content recommender. It ranks songs by compatibility with a participant's current self-reported state, desired emotional goal, and music preference. It does not diagnose, treat, or predict a person's mental-health condition. A recommendation score is a rule-based compatibility score, not a probability of emotional improvement.

The engine accepts both the previous camelCase objects and the new 13-column music database:

`ID, Title, Artist, Country, Genre, Subgenre, BPM, Energy_1_5, Valence_0_1, Mood, Goal, Source, Confidence`.

`NA`, blank, `null`, and `N/A` are treated as missing values. Missing Valence is not inferred from genre, BPM, title, artist, or Mood.

## 2. Model

### Inputs

- Current state: `stress` (0–10), `energy` (1–5), `mood`.
- Desired goal: `RELAX`, `FOCUS`, `UPLIFT`, `RELEASE`, or `MAINTAIN`.
- Preference: preferred genre or `any`.
- Music metadata: genre, subgenre, energy, valence (optional), Mood, Goal, source, confidence.

### Condition C scoring

`Total = 0.30 × StateFit + 0.45 × GoalFit + 0.25 × PreferenceFit`

Each component is scaled from 0 to 100.

- **StateFit (30%)**: compatibility with the participant's current self-reported Mood (65% of this component) and Energy proximity (35%). High reported stress adds a modest penalty to high-energy/intense tracks when the goal is RELAX or FOCUS.
- **GoalFit (45%)**: alignment of the song's annotated Goal (45% of this component), Mood (35%), and Energy profile (20%) with the participant's desired goal. If Valence exists, it is used as a small optional feature and the component weights are rebalanced. If Valence is missing, it is omitted entirely.
- **PreferenceFit (25%)**: preferred genre/subgenre match. `any` is neutral and receives the same baseline for all tracks.

Confidence is displayed and used only as a tie-break after compatibility score. It is not added to the compatibility score, because evidence confidence is not itself musical fit.

### Goal mapping

| UI goal | Canonical goal |
|---|---|
| calm | RELAX |
| focus | FOCUS |
| energize / uplift | UPLIFT |
| release | RELEASE |
| maintain | MAINTAIN |

### Genre mapping

| Legacy UI choice | Database genres matched |
|---|---|
| ballad | Pop, with a stronger match to ballad/piano/acoustic subgenres |
| rap | Hip-Hop |
| rock | Rock |
| electronic | Electronic |
| instrumental | Classical and Ambient (category-level approximation only) |
| nature | Ambient |
| any | No genre filtering |

The database does not contain a Vocal/Instrumental field. Therefore, the `instrumental` preference is a proxy for Classical/Ambient categories, not proof that every matched track is instrumental.

## 3. Research conditions

- **A — Fixed reference set:** five deterministic tracks, one from each of five broad genre strata (Pop, Hip-Hop, Rock, Electronic, and Classical/Ambient). The set is selected without looking at participant input and is identical for all participants against the same frozen database. It is a genre-stratified reference set, **not a validated neutral playlist**: the selection heuristic does not establish emotional neutrality or equivalence in familiarity, popularity, tempo, energy, or other musical properties. Freeze the selected IDs and library version before data collection.
- **B — Preference-only:** ranks by genre/subgenre preference. It does not use stress, current mood, energy, or desired goal.
- **C — State + goal + preference:** uses the scoring formula above. The research version intentionally does not use learned user-profile boosts so one participant's feedback cannot affect another participant's recommendations.
- **D — Quiet rest:** returns no songs; the existing app handles the quiet-rest timer.

### Exposure-time protocol note

In the current website, A/B/C display recommendations without enforcing a fixed viewing period, while D uses a three-minute quiet-rest timer. Exposure duration is therefore not standardized across conditions. Record this as a design limitation; do not interpret differences between conditions as clean causal effects of the recommendation method. If equal exposure is required, revise and pilot the protocol so A/B/C and D use the same pre-specified interval before collecting the main dataset.

## 4. Data quality rules

- `Valence_0_1` is currently missing throughout the supplied 300-row table. V2 therefore skips Valence; do not fill it with guesses.
- `BPM` is retained as metadata but is not used as a direct mood or therapeutic-effect predictor. The repeated/default-looking BPM values should be source-checked before treating them as verified measurements.
- `Mood` and `Goal` are editorial annotations, not objective physiological measurements. Their coding rubric should be documented and reviewed consistently.
- `Source = Editorial` should be understood as a group annotation, not an external verification source.
- `Confidence` is an evidence-quality label. `HIGH`, `MEDIUM`, `LOW` are normalized internally; it does not certify clinical effectiveness.
- No Audio/MP3 playback is performed by this module.

## 5. Output contract

`recommendByCondition(sounds, user, condition)` returns an array of items with:

- `sound`: normalized song object retaining title, artist, ID, normalized UI genre, canonical genre, BPM, energy, optional valence, Mood, Goal, Source, Confidence.
- `score`: 0–100 compatibility/ranking score (for A/B, the score serves ordering only).
- `stateFit`, `goalFit`, `preference`, `scoreBreakdown` where applicable.
- `reason`: user-facing explanation of the ranking rule.
- `method`: condition method identifier.

The module preserves the existing public method names `recommend`, `recommendAll`, `recommendByCondition`, `learn`, `favorite`, and `load`.

## 6. Research interpretation

The current website displays recommendations but does not play audio. Therefore the current experiment can evaluate recommendation relevance, perceived suitability, goal fit, satisfaction, and interface usability. It cannot conclude that listening to music changed participants' emotions or improved mental health. To study listening effects, a future version must include authorized audio playback, standardized exposure, and a verified playback record.
