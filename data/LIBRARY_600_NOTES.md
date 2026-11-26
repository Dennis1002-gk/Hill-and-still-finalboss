# HILL AND STILL: 600-track draft (2026-11-26)

- Main branch retains the original 300-track library; do not merge during active data collection.
- S001–S300 unchanged. S301–S308 reproduce the reviewed sample, with SongBPM/editorial estimates as supplied (not independently re-verified here).
- S309–S405: Vietnam Music Data, https://github.com/KamDaXay/vietnam-music-data/blob/main/Data%20%281%29.csv
- S406–S600: Music Mood Classifier CSV, https://github.com/CANDRA2006/Music-Mood-Classifier/blob/main/data/raw/spotify_music.csv
- Each new dataset row retains the Spotify track ID in Source. BPM rounded from tempo; energy 1–5 = min(5, 1+floor(5*energy)); valence rounded to 3 decimals. Dataset figures are third-party values, not independently measured by the project.
- Genre/subgenre derived from artist tags (Vietnam) or playlist tags (international), not verified track genres. Mood/Goal generated from energy, valence and instrumentalness thresholds; all 300 new rows LOW confidence. No lyrics examined; no clinical claims. No full audio files included. Review age suitability, source rights and label quality before release; the datasets do not include explicit flags.
- 100 Vietnam + 200 international additions. Checked 600 unique IDs, 300 added distinct normalized titles, no new titles overlapping original by normalized base title, and all 13 fields populated in added rows. Original rows retain their previous missing valence.
- New library version recorded in discover_data JSON for the draft. Existing algorithm weights unchanged. A reference list and B/C ranking may differ because of the expanded candidate set; do not combine versions as identical conditions without accounting for this.
