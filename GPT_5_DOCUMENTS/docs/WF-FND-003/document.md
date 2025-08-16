---
id: WF-FND-003
title: Core Architecture Overview
status: Draft
owners: [engineering, architecture]
last_review: 2025-08-15
audience: [engineering, product, UX]
depends_on: [WF-FND-001, WF-FND-002]
enables: [WF-TECH-001, WF-TECH-002, WF-TECH-003, WF-TECH-004, WF-UX-006]
---

# Generate Document: WF‑FND‑003 – Core Architecture Overview

## 🧬 Document DNA
- **Unique ID:** WF‑FND‑003
- **Category:** Foundation
- **Priority:** P0 (Backbone for entire platform)
- **Development Phase:** 1
- **Estimated Length:** ~4,000 words
- **Document Type:** Architectural Specification

## 🔗 Dependency Matrix
- **Required Before This:**
  - **WF‑FND‑001 – Vision & Principles:** Establishes local-first pillars and visible computation ethos.
  - **WF‑FND‑002 – Energy Framework:** Defines energy units and event semantics used throughout layers.
- **Enables After This:**
  - **WF‑TECH‑001 – System Architecture:** Uses this five-layer blueprint.
  - **WF‑TECH‑002 – Native Ollama Integration:** Implements Layer 2 contracts.
  - **WF‑TECH‑003 – WebSocket Protocol:** Derives Layer 4 channels and payloads.
  - **WF‑TECH‑004 – State Management & Storage:** Persists Layer 3 outputs.
  - **WF‑UX‑006 – Energy Visualization:** Renders Layer 5 components.
- **Cross‑References:**
  - **WF‑FND‑004 – Decipher:** Real-time energy compiler living in Layer 3.
  - **WF‑FND‑005 – Orchestrator:** Council scheduler that consumes Layer 3 events.
  - **WF‑FND‑006 – Governance:** Ensures layered changes follow governance process.

## 🌟 Core Objective
Define WIRTHFORGE’s five-layer runtime architecture that transforms raw model computation into a living, auditable experience. Each layer has strict responsibilities, communicates through structured events at 60 Hz, and preserves local-first control while permitting opt-in satellite compute.

## 📚 Knowledge Integration Checklist
- [x] Layer definitions (L1–L5) including purpose, owned data, and emitted events.
- [x] Real-time 60 Hz loop with non-blocking queues and backpressure strategy.
- [x] Local vs satellite compute rules and latency budgets.
- [x] Audit mode enabling reproducible event traces.
- [x] Glossary alignment for terms such as “audit_mode” and “satellite_compute”.

## 📝 Content Architecture

### 1. Opening Hook – “Five Layers of a Living Forge”
Introduce the architecture as a forge with five anvils. User intent enters Layer 1 as raw ore and emerges at Layer 5 as visible sparks. The harmony between layers makes the system feel alive rather than mechanical.

### 2. Layer Breakdown
- **L1 – Input & Identity:** Normalizes gestures, binds session identity, and enforces security policies. Emits `input_event` objects.
- **L2 – Model Compute:** Executes local models; may dispatch to satellite models when explicitly allowed. Streams `token_event` objects.
- **L3 – Orchestration & Energy:** Hosts Decipher and state machines, converting token streams into `energy_frame` and `experience_event` messages.
- **L4 – Contracts & Transport:** Defines WebSocket topics and contract schemas; applies backpressure and retries.
- **L5 – Visualization & UX:** Renders energy-informed UI and exposes `audit_mode` for inspecting raw events.

### 3. Real-Time Data Flow
Describe how an `input_event` travels upward, is transformed by each layer, and returns downward as control signals. Emphasize the 16.67 ms frame budget and deterministic sequencing.

### 4. Local-First Extensibility
Explain optional `satellite_compute` for heavy models. All remote calls must pass through Layer 4 contracts, adding at most 5 ms latency and never bypassing local control.

### 5. Backpressure & Throttling
Outline queue limits per layer. When producers outpace consumers, layers either drop lowest priority events or request upstream slow-down, guaranteeing sustained 60 Hz output.

### 6. Auditability
`audit_mode` in Layer 5 can replay events with timestamps and originating layer IDs. Logs are stored locally and subject to WF‑FND‑006 governance.

### 7. Future Work
- Define standardized metrics for cross-layer latency.
- Explore zero-copy event passing to reduce overhead.
- Prototype hardware-accelerated queues for high-tier devices.

### 8. Integration Points
- **Decipher & Orchestrator:** plug into Layer 3 event loop.
- **State Store:** Layer 3 persists energy frames to WF‑TECH‑004.
- **Transport:** Layer 4 aligns with WF‑TECH‑003 topics.
- **UX Components:** Layer 5 uses WF‑UX‑006 library.

### 9. Validation & Metrics
- **Frame Cadence:** 100 sequential frames must stay within 16.67 ms processing.
- **Integrity:** Every event carries `layerId` and `timestamp`.
- **Extensibility:** Satellite compute adds ≤5 ms latency.
- **Isolation:** Lower layers cannot access UI state directly.

## 🎨 Required Deliverables
- **Document:** This specification.
- **Summary:** Executive overview.
- **Diagrams:** `layers.mmd`, `dataflow.mmd`.
- **Tests:** `layer-contract.spec.md` validating boundaries and latency.
- **Poster Brief:** One-page synopsis for stakeholders.
- **Glossary Delta:** Definitions for new terms.
- **Changelog:** Versioned history.

## ✅ Quality Validation Criteria
- Layer responsibilities are mutually exclusive and collectively exhaustive.
- All inter-layer communication uses defined schemas.
- Architecture remains operable on low-tier hardware.
- Audit mode produces reproducible traces.

## 🔁 Post-Generation Protocol
- Update WF‑FND‑006 glossary with new terms.
- Increment changelog to version 1.0.0.
- Notify maintainers of dependent TECH and UX documents.

