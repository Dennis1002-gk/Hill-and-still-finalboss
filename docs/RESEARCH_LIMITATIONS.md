# Research interpretation notes

1. The V2 recommender produces a rule-based compatibility ranking. It is not a trained AI model.
2. A/B/C show metadata recommendations; no embedded audio is played. D is a three-minute quiet-rest interval.
3. `audio_played` is always `false`. Do not label post-session values as the effects of listening to music.
4. Treat Goal and Mood as team-provided annotations, not proven causal properties of a song.
5. Confidence is an evidence-quality label, not a probability that a recommendation will work.
6. Since all provided Valence values were `NA`, V2 excludes Valence from scoring until supported values are added with an explicit source/method.
7. If the research later evaluates listening effects, redesign the protocol to include authorized audio, consistent playback duration and safe listening level, a verified playback log, and equivalent time in the quiet-rest condition.
