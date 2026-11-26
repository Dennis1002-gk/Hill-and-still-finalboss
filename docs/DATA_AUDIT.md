# Data audit — supplied 300-track library

Automated structural audit of the dataset supplied by the project team:

- Total records: 300
- Unique IDs: 300
- Duplicate IDs: 0
- Possible duplicate `(title, artist)` pairs: 0
- BPM missing: 0
- Energy missing: 0
- Mood missing: 0
- Goal missing: 0
- Valence missing: 300 (`NA` in the supplied table; represented as `null` in JSON)
- Confidence: 1 HIGH, 292 MEDIUM, 7 LOW

The audit checks the shape and consistency of the submitted table, not whether each BPM, Energy, Mood or Goal annotation is objectively correct. `Editorial` is retained as an editorial annotation source and must not be interpreted as independent laboratory measurement. The scoring engine therefore treats these values as team-supplied metadata and displays Confidence separately from the compatibility score.

The fixed Condition A reference set selected by the deterministic genre-stratified rule from this dataset is: `S004`, `S019`, `S034`, `S058`, `S069`. These five IDs are returned for every user while the relevant library contents remain unchanged. The selection heuristic uses genre buckets and middle-range / `NEUTRAL` or `CALM` metadata as a practical team-defined rule; it does **not** validate that the songs are emotionally neutral, equally familiar or popular, or equivalent on tempo, energy, and other musical dimensions. Describe A as a fixed genre-stratified reference set, not as a scientifically validated neutral playlist.
