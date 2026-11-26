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

The fixed Condition A reference set selected by the deterministic stratified rule from this dataset is: `S004`, `S019`, `S034`, `S058`, `S069`. These five IDs are computed from the genre buckets and neutral-ish metadata by the engine; the same five tracks are returned for every user as long as the library order-independent contents remain unchanged.
