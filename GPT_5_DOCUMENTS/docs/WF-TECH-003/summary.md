# WF-TECH-003 – Real-Time Protocol (Summary)

- Establishes WebSocket channels for energy, experience, and council streams.
- Defines heartbeat/retry FSM ensuring ≤5 ms median overhead and ≤1 s reconnect.
- Provides JSON schema `wf.protocol.message` for all channel payloads.
- Contract tests validate latency and schema compliance.
- Unlocks state service and visual layers.
