# WF-TECH-004 – State Management & Storage (Summary)

- Persists every energy event and snapshot for truthful replay.
- ERD illustrates relationship between frames, events, and snapshots.
- Provides JSON schema `energy.event` and integrity check code.
- Ensures persistence performance (10k events <50 ms, snapshot <200 ms).
- Enables energy visualisation and export tooling.
