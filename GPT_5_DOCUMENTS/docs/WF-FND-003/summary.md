# WF‑FND‑003 Executive Summary

## Purpose
Outline WIRTHFORGE’s five-layer architecture that transforms user inputs into energy-aware visual experiences while preserving strict layer boundaries and local-first control.

## Key Concepts
- **Layered Responsibilities:** L1 handles input & identity, L2 performs model compute, L3 orchestrates energy and state, L4 transports events, and L5 renders UI with optional audit mode.
- **Real-Time Cadence:** All layers operate within a 16.67 ms frame budget, communicating through non-blocking queues at 60 Hz.
- **Local-First Extensibility:** Remote satellite compute is optional and must obey the same contracts, adding no more than 5 ms latency.
- **Auditability:** Every event carries its originating layer ID and timestamp, enabling full replay and inspection by users or auditors.

## Integration
The architecture underpins technical specs like System Architecture (WF‑TECH‑001), WebSocket Protocol (WF‑TECH‑003) and Energy Visualization (WF‑UX‑006), and provides context for Decipher (WF‑FND‑004) and Orchestrator (WF‑FND‑005).

