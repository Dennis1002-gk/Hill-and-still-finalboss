# Research interpretation notes

1. The V2 recommender produces a rule-based compatibility ranking. It is not a trained AI model.
2. A/B/C show metadata recommendations; no embedded audio is played. D is a three-minute quiet-rest interval. A is a fixed genre-stratified reference set, not a validated neutral playlist. In B/C, participants can request alternative lists; each displayed list and the refresh count are recorded in the session payload. Alternatives are sampled with score weighting from a high-compatibility band, so the list is not a pure deterministic top-five ranking after refresh.
3. `audio_played` is always `false`. Do not label post-session values as the effects of listening to music.
4. Treat Goal and Mood as team-provided annotations, not proven causal properties of a song.
5. Confidence is an evidence-quality label, not a probability that a recommendation will work.
6. Since all provided Valence values were `NA`, V2 excludes Valence from scoring until supported values are added with an explicit source/method.
7. Allowing refreshes in B/C creates variation in the number of lists each participant views. The app records the number of refreshes and each displayed list, but participants may still have different browsing behavior; include refresh count in descriptive analysis and avoid treating all participants as having viewed an identical recommendation set.
8. Exposure time is currently unequal/uncontrolled: A/B/C have no enforced viewing duration, while D uses a three-minute timer. This can confound comparisons between conditions; do not make causal claims about the superiority of a recommendation method from this design. Either standardize and pilot the exposure interval across all conditions before main data collection, or report this limitation and interpret outcomes descriptively.
9. If the research later evaluates listening effects, redesign the protocol to include authorized audio, consistent playback duration and safe listening level, a verified playback log, and equivalent time in the quiet-rest condition.
