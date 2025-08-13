# WF-FND-003: Core Architecture Overview

## Document Metadata
- **Document ID**: WF-FND-003
- **Title**: Core Architecture Overview
- **Version**: 1.0.0
- **Date**: 2025-01-12
- **Status**: Draft
- **Dependencies**: WF-FND-001, WF-FND-002
- **Enables**: WF-TECH-001, WF-UX-006

## Executive Summary

WF-FND-003 defines the five-layer architecture that turns raw model computation into a real-time, observable experience. The architecture enforces clear boundaries from user input through transport, orchestration, and final visualization, ensuring local-first control while remaining extensible for optional remote compute. Each layer communicates through structured events at a 60 Hz cadence, enabling precise energy tracking and auditability.

## Layer Overview

1. **L1 – Input & Identity**: Normalizes user actions and binds them to session context.
2. **L2 – Model Compute**: Executes local models and streams tokens without blocking.
3. **L3 – Orchestration & Energy**: Converts token streams into energy events and maintains state.
4. **L4 – Contracts & Transport**: Carries events and commands over well-defined channels.
5. **L5 – Visualization & UX**: Renders truth-backed visuals and exposes audit modes.

## Real‑Time Data Flow

Events travel upward from computation to visualization and downward from user commands to models. The orchestrator batches updates so the UI can render at ~16 ms intervals, applying backpressure when producers outpace consumers.

## Local‑First Extensibility

The system defaults to local execution but allows opt-in satellite models for heavy tasks. Remote calls must honor the same contracts so higher layers remain agnostic to compute location.

## Auditability

Every visual element traces back to a structured event emitted by L3. An audit mode in L5 can reveal raw payloads, enabling reproducibility and scientific transparency.
