# WF-FND-004: The Decipher (Central Compiler)

## Document Metadata
- **Document ID**: WF-FND-004
- **Title**: The Decipher (Central Compiler)
- **Version**: 1.0.0
- **Date**: 2025-08-13
- **Status**: Draft
- **Dependencies**: WF-FND-001, WF-FND-002, WF-FND-003, WF-META-001
- **Enables**: WF-TECH-001, WF-TECH-004, WF-TECH-008, WF-UX-003

## Executive Summary
The Decipher is WIRTHFORGE's real-time energy compiler. It ingests token streams from Layer –2, converts them into Energy Units, and emits structured events at a strict 60 Hz cadence. By running locally and respecting privacy constraints, the Decipher translates invisible computation into synchronized visual feedback.

## Core Responsibilities
1. **Token Ingestion** – accept streaming output from the model layer without blocking.
2. **Energy Conversion** – apply formulas from the Energy Metaphor to produce deterministic EU values.
3. **Frame Loop** – operate on a 60 Hz cycle, ensuring all processing completes within 16.67 ms.
4. **Event Emission** – output JSON/MessagePack events defined in [`schemas/WF-FND-004-emission.json`](../../schemas/WF-FND-004-emission.json).

## Frame Loop
Decipher maintains an internal timer aligned to the system timing contract in WF-META-001. On each tick it consumes queued tokens, updates energy state, and dispatches an event if any change occurred. Heavy computations may be split across frames to avoid drops.

## Privacy & Local-First
All processing occurs on the user's machine by default. Only abstracted energy metrics are emitted, never raw user content. Optional remote acceleration is additive and cannot bypass privacy guarantees.

## Sequence Diagram
A high-level interaction is illustrated in [`assets/diagrams/WF-FND-004-sequence.mmd`](../../assets/diagrams/WF-FND-004-sequence.mmd).

## Future Work
- Integrate higher-order resonance detection once UX level 4 is active.
- Benchmark additional model backends for low-power hardware tiers.
