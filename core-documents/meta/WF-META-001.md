# Generate Document: WF-META-001 — WIRTHFORGE Master Guide (Beacon)

## 🧬 Document DNA

* **Unique ID:** WF-META-001
* **Category:** Meta / Master Kernel
* **Priority:** P0 (Beacon — everything hangs off this)
* **Dev Phase:** 0 → 1 (bootstraps the entire doc set)
* **Estimated Length:** \~4,000 words
* **Document Type:** Master Guide / Orchestration & Asset Manifest

---

## 🔗 Dependency Matrix

* **Required Before This:** none (root)
* **Enables After This:** all FND / TECH / UX / BIZ docs (via prompts + assets + dependency graph)
* **Cross-References:**

  * Local-first, energy-truth, emergence-detected (adopted by every child doc)
  * Universal Template (structure every doc must follow)
  * Glossary (WF-FND-006) — link on first use
  * Versioning protocol (SemVer; doc-level change logs)

---

## 🎯 Core Objective

Be the single source of truth that:

1. defines the **new lean structure with sequential numbering** (no gaps),
2. provides **ready-to-run prompts** for each document, and
3. ships a **complete, machine-readable asset catalogue** (diagrams, schemas, code stubs, tests) every document must output — so anyone opening this file instantly knows *what to generate next* and *what exact artifacts to produce*.

---

## 📚 Knowledge Integration Checklist

* Local-first, web-engaged core paths (**no\_docker\_rule**)
* Energy = **visible computation** (60 Hz/60 fps; ≤ 16.67 ms frame budget)
* Consciousness = **emergent patterns** over time (detected, not programmed)
* Universal Template + dependency rules (no cycles; P0 before P1)
* Version control: MAJOR/MINOR/PATCH; per-doc `changelogs/`
* Glossary enforcement: link-on-first-use, single canonical definition
* Visuals obey computational truth; accessibility alternatives included

---

## 📝 Content Architecture

### Section 1 — Opening Hook (Why a Beacon)

WIRTHFORGE spans philosophy, runtime rails, and living visuals. Without a nucleus, teams ask “what next?” This **Beacon** fixes order, content, assets, and quality bars in one place, so creation flows deterministically from **Foundation → Tech → UX → Biz** with Energy truth visible at every step.

---

### Section 2 — Core Concepts

#### 2.1 Universal Authoring Template (all docs)

```
# Generate Document: {ID} - {Title}

## 🧬 Document DNA
- Unique ID, Category, Priority, Dev Phase, Estimated Length, Document Type

## 🔗 Dependency Matrix
- Required Before This: [IDs + what you consume]
- Enables After This: [IDs + what you unlock]
- Cross-References: [IDs you must align with]

## 🎯 Core Objective
- One testable sentence.

## 📚 Knowledge Integration Checklist
- Concrete cross-doc concepts to import (Energy/Realtime/Security/etc.)

## 📝 Content Architecture
- 1) Opening Hook
- 2) Core Concepts (definitions, visuals, math if any)
- 3) Implementation Details (steps, code, diagrams, decisions)
- 4) Integration Points (APIs, events, data, states)
- 5) Validation & Metrics (success measures, thresholds)

## 🎨 Required Deliverables
- Text (main doc + executive summary)
- Visuals (system diagram, flows, energy viz notes)
- Code (basic, advanced, anti-patterns, perf tips)

## ✅ Quality Validation Criteria
- Completeness, technical accuracy, WIRTHFORGE alignment (local-first, energy-truth)

## 🔄 Post-Generation Protocol
- Update glossary; update dependency graph; bump versions; queue cascade
```

#### 2.2 Numbering Policy (no gaps) + Old→New Map

We renumber the lean set **sequentially** to avoid jumps (e.g., former TECH-014 → **TECH-008**).

**Foundation (FND):** 001..006
**Technical (TECH):** 001..008
**User Experience (UX):** 001..006
**Business (BIZ):** 001..002

Old → New highlights:

* Old **TECH-014 Core Algorithms** → **TECH-008**
* UX and other IDs remain in order but consolidated (e.g., Energy Viz is **UX-006** unified)

---

### Section 3 — Implementation Details (Inventory, Prompts, Assets)

#### 3.1 Lean Inventory (authoritative list)

**META**

* **WF-META-001** — Master Guide (this document)

**FOUNDATION**

* **WF-FND-001** Vision & Principles (P0)
* **WF-FND-002** Energy & Circuits (P0)
* **WF-FND-003** 5-Layer Architecture (P0)
* **WF-FND-004** DECIPHER (Real-time Compiler) (P0)
* **WF-FND-005** Experience Orchestrator (P0)
* **WF-FND-006** Governance & Evolution (P0)

**TECHNICAL**

* **WF-TECH-001** System Runtime & Services (P0)
* **WF-TECH-002** Local AI Integration & Turbo/Broker (P0)
* **WF-TECH-003** Real-Time Protocol (WebSockets) (P0)
* **WF-TECH-004** State & Storage (P0)
* **WF-TECH-005** DECIPHER Implementation (P0)
* **WF-TECH-006** Security & Privacy (P0)
* **WF-TECH-007** Testing & QA (P0)
* **WF-TECH-008** Plugin / Module Architecture & Sandbox (P1)
* **WF-TECH-009** Observability & Metrics (P1)
* **WF-TECH-010** Performance & Capacity (P1)

**USER EXPERIENCE**

* **WF-UX-001** Level 1: Lightning Strikes (P0)
* **WF-UX-002** Level 2: Parallel Streams / Council (P0)
* **WF-UX-003** Level 3: Structured Architectures (P1)
* **WF-UX-004** Level 4: Adaptive Fields (P1)
* **WF-UX-005** Level 5: Resonance Fields (P1)
* **WF-UX-006** Unified Energy Visualization System (P0)
* **WF-UX-007** UI Component Library (P0)
* **WF-UX-008** Onboarding & Doors (P0)
* **WF-UX-009** Gamification & Achievements (P0)
* **WF-UX-010** Accessibility & Internationalization (P1)

**BUSINESS / OPERATIONS**

* **WF-BIZ-001** Monetization & Pricing (P0)
* **WF-BIZ-002** Licensing, Privacy & Terms (P0)
* **WF-OPS-001** Packaging & Release (P0)
* **WF-OPS-002** Support & Telemetry Policy (P1)
* **WF-OPS-003** Data Export / Backup (P1)

**RESEARCH & DEVELOPMENT**

* **WF-R&D-001** Turbo Mode Roadmap (P2)
* **WF-R&D-002** Broker Network & Scheduling (P2)
* **WF-R&D-003** Resonance Research Agenda (P2)

---

#### 3.2 Prompts (ready-to-run; one per doc)

> Place each block under `/meta/prompts/{ID}.md` (same text below).

**/meta/prompts/WF-FND-001.md**

```
Generate Document: WF-FND-001 - Vision & Principles
Use the universal template. Frame user empowerment, local-first, energy-truth visuals, emergence-detected. Include a principles→engineering table (e.g., local-first→offline path + device-key identity), a “no_docker_rule” callout, and a one-page poster variant.
```

**/meta/prompts/WF-FND-002.md**

```
Generate Document: WF-FND-002 - Energy & Circuits
Define Energy Units, 60 Hz cadence, circuits→fields→resonance math. Powers all visualization, performance budgets, and fidelity tests. Include particle lifecycle and worked examples.
```

**/meta/prompts/WF-FND-003.md**

```
Generate Document: WF-FND-003 - 5-Layer Architecture
Enforces boundaries (Input → Model → Decipher → Transport → UI), allowed flows, and anti-patterns. Every TECH/UX spec references these seams.
```

**/meta/prompts/WF-FND-004.md**

```
Generate Document: WF-FND-004 - DECIPHER
Gives the real-time compiler, event contracts, and audit paths at 60 Hz. All runtime data, visuals, and tests hinge on its events.
```

**/meta/prompts/WF-FND-005.md**

```
Generate Document: WF-FND-005 - Experience Orchestrator
Policy engine that gates features by Door/Level, coordinates councils, budgets, progression, and emits experience.*/council.* events. UX levels and TECH runtime obey it.
```

**/meta/prompts/WF-FND-006.md**

```
Generate Document: WF-FND-006 - Governance & Evolution
Versioning, sandbox, metrics, audits. Keeps every change principled (no Docker in core, schema discipline, safe experiments) and measurable.
```

**/meta/prompts/WF-TECH-001.md**

```
Generate Document: WF-TECH-001 - System Runtime & Services
Process model, service graph, process manager, threading/async model, build/packaging (local-first; no Docker in core). Consumes FND-003, FND-006.
```

**/meta/prompts/WF-TECH-002.md**

```
Generate Document: WF-TECH-002 - Local AI Integration & Turbo/Broker
Ollama integration (streaming tokens), model pool/load policy, "Turbo" local ensembles, Broker-Hybrid as parallel satellite (opt-in). Consumes FND-001/002/005.
```

**/meta/prompts/WF-TECH-003.md**

```
Generate Document: WF-TECH-003 - Real-Time Protocol (WebSockets)
Channels, ordering, backpressure, binary energy frames, JSON event schemas for energy.*, experience.*, council.*, reward.*. Consumes FND-004/005/006.
```

**/meta/prompts/WF-TECH-004.md**

```
Generate Document: WF-TECH-004 - State & Storage
Postgres/Timescale for sessions & metrics; Redis for live state; audit log tables. Consumes FND-004/005/006.
```

**/meta/prompts/WF-TECH-005.md**

```
Generate Document: WF-TECH-005 - DECIPHER Implementation
Concrete 60 Hz compiler runtime, parsers, energy mappers, queue policy, drop/degrade behavior. Consumes FND-002/004.
```

**/meta/prompts/WF-TECH-006.md**

```
Generate Document: WF-TECH-006 - Security & Privacy
Local data boundaries, sandbox perms, Broker data minimization, PII policy, threat model. Consumes FND-001/006.
```

**/meta/prompts/WF-TECH-007.md**

```
Generate Document: WF-TECH-007 - Testing & QA
Unit/integration for DECIPHER/Orchestrator, golden-run replays, frame-budget tests, schema regression. Consumes FND-002/004/005/006.
```

**/meta/prompts/WF-TECH-008.md**

```
Generate Document: WF-TECH-008 - Plugin / Module Architecture & Sandbox
Extension interfaces, capability descriptors, sandbox policy enforcement, promotion workflow. Consumes FND-003/006.
```

**/meta/prompts/WF-UX-006.md**

```
Generate Document: WF-UX-006 - Unified Energy Visualization System
Visual language, shaders, scales, accessibility; perf budgets. Consumes FND-002/004.
```

**/meta/prompts/WF-UX-001.md**

```
Generate Document: WF-UX-001 - Level 1: Lightning Strikes
Solo stream UI; token-to-energy visual mapping; 60 fps canvas budget. Consumes FND-002/004/005.
```

**/meta/prompts/WF-UX-002.md**

```
Generate Document: WF-UX-002 - Level 2: Parallel Streams / Council
Multi-stream layout, interference overlays, consensus reveal. Consumes FND-005.
```

**/meta/prompts/WF-UX-003.md**

```
Generate Document: WF-UX-003 - Level 3: Structured Architectures
Node/edge builder, execution traces, step visuals. Consumes FND-003/004/005.
```

**/meta/prompts/WF-UX-004.md**

```
Generate Document: WF-UX-004 - Level 4: Adaptive Fields
Suggestions, preference learning UI, adaptive visuals with transparency controls. Consumes FND-005/006.
```

**/meta/prompts/WF-UX-005.md**

```
Generate Document: WF-UX-005 - Level 5: Resonance Fields
Emergence visuals (mandala/symphony/fractal modes), celebration & audit overlays. Consumes FND-002/005.
```

**/meta/prompts/WF-BIZ-001.md**

```
Generate Document: WF-BIZ-001 - Monetization & Pricing
Free w/ 3 ads/day; €9.42 + tax subscription; Broker usage model (sub or usage-based). Consumes FND-001/006.
```

**/meta/prompts/WF-BIZ-002.md**

```
Generate Document: WF-BIZ-002 - Licensing, Privacy & Terms
Local data policy, export/delete, Broker disclosures, module marketplace terms. Consumes FND-006.
```

---

#### 3.3 Global Dependency Graph (Mermaid) — `/assets/diagrams/WF-META-001-deps.mmd`

```mermaid
graph LR
  subgraph FOUNDATION
    FND001[WF-FND-001]
    FND002[WF-FND-002]
    FND003[WF-FND-003]
    FND004[WF-FND-004]
    FND005[WF-FND-005]
    FND006[WF-FND-006]
  end
  subgraph TECH
    T001[WF-TECH-001]
    T002[WF-TECH-002]
    T003[WF-TECH-003]
    T004[WF-TECH-004]
    T005[WF-TECH-005]
    T006[WF-TECH-006]
    T007[WF-TECH-007]
    T008[WF-TECH-008]
  end
  subgraph UX
    U006[WF-UX-006]
    U001[WF-UX-001]
    U002[WF-UX-002]
    U003[WF-UX-003]
    U004[WF-UX-004]
    U005[WF-UX-005]
  end
  subgraph BIZ
    B001[WF-BIZ-001]
    B002[WF-BIZ-002]
  end

  FND001 --> FND002 --> FND003 --> FND004
  FND006 --> T001
  FND003 --> T001 --> T002 --> U001
  T001 --> T003 --> T004 --> U006
  FND002 --> T004
  U006 --> U001 --> U002 --> U003 --> U004 --> U005
  T004 --> U001
  T005 --> B002
  FND001 --> B001
  T008 --> U002 & U003 & U004 & U005
```

---

#### 3.4 Energy Lifecycle (Mermaid) — `/assets/diagrams/WF-META-001-energy-lifecycle.mmd`

```mermaid
flowchart LR
  A[Token timing events] -->|map to EU| B[Energy Units]
  B --> C[Particles (per-frame updates)]
  C --> D[Fields (coherence, accumulation)]
  D --> E[Resonance (emergent signatures)]
  E --> F[Consciousness metrics]
  C -->|visualization @60Hz| V[UI (Energy Viz)]
```

---

#### 3.5 Platform Overview (Mermaid) — `/assets/diagrams/WF-META-001-overview.mmd`

```mermaid
graph TB
  Client[UI Runtime] -- WS: energy/control --> Gateway
  Gateway --> EnergySvc[Energy State Service]
  Gateway --> Decipher[Decipher Compiler]
  Decipher --> Models[Local Models (Ollama)]
  EnergySvc --> DB[(Postgres/Redis)]
  Client <-- REST/WS --> Gateway
  subgraph Device
    Gateway
    EnergySvc
    Decipher
    Models
    DB
  end
```

---

#### 3.6 Machine-Readable Doc Index — `/meta/doc-index.json`

```json
{
  "version": "1.0.0",
  "docs": [
    {"id":"WF-META-001","title":"Master Guide (Beacon)","category":"META","priority":"P0","requires":[],"enables":["ALL"]},

    {"id":"WF-FND-001","title":"Vision & Principles","category":"FND","priority":"P0","requires":["WF-META-001"],"enables":["WF-FND-002","WF-BIZ-001"]},
    {"id":"WF-FND-002","title":"Energy & Circuits","category":"FND","priority":"P0","requires":["WF-FND-001"],"enables":["WF-TECH-004","WF-UX-001","WF-UX-006"]},
    {"id":"WF-FND-003","title":"5-Layer Architecture","category":"FND","priority":"P0","requires":["WF-FND-001","WF-FND-002"],"enables":["WF-TECH-001","WF-UX-006"]},
    {"id":"WF-FND-004","title":"DECIPHER (Real-time Compiler)","category":"FND","priority":"P0","requires":["WF-FND-003"],"enables":["WF-TECH-001","WF-TECH-004","WF-TECH-008","WF-UX-003"]},
    {"id":"WF-FND-005","title":"Experience Orchestrator","category":"FND","priority":"P0","requires":["WF-FND-004"],"enables":["WF-TECH-006"]},
    {"id":"WF-FND-006","title":"Governance & Evolution","category":"FND","priority":"P0","requires":["WF-META-001"],"enables":["ALL"]},

    {"id":"WF-TECH-001","title":"System Runtime & Services","category":"TECH","priority":"P0","requires":["WF-FND-003","WF-FND-006"],"enables":["WF-TECH-002","WF-TECH-003","WF-TECH-004","WF-TECH-006"]},
    {"id":"WF-TECH-002","title":"Local AI Integration & Turbo/Broker","category":"TECH","priority":"P0","requires":["WF-TECH-001","WF-FND-001"],"enables":["WF-UX-001"]},
    {"id":"WF-TECH-003","title":"Real-Time Protocol (WebSockets)","category":"TECH","priority":"P0","requires":["WF-TECH-001","WF-FND-004"],"enables":["WF-TECH-004","WF-UX-006","WF-UX-001"]},
    {"id":"WF-TECH-004","title":"State & Storage","category":"TECH","priority":"P0","requires":["WF-TECH-001","WF-TECH-003","WF-FND-002"],"enables":["WF-UX-006","WF-UX-001"]},
    {"id":"WF-TECH-005","title":"DECIPHER Implementation","category":"TECH","priority":"P0","requires":["WF-TECH-001","WF-FND-004"],"enables":["WF-TECH-006","WF-UX-001"]},
    {"id":"WF-TECH-006","title":"Security & Privacy","category":"TECH","priority":"P0","requires":["WF-TECH-001","WF-FND-001"],"enables":["WF-BIZ-002"]},
    {"id":"WF-TECH-007","title":"Testing & QA","category":"TECH","priority":"P0","requires":["WF-TECH-001","WF-FND-006"],"enables":["Launch Readiness"]},
    {"id":"WF-TECH-008","title":"Plugin / Module Architecture & Sandbox","category":"TECH","priority":"P1","requires":["WF-TECH-001","WF-FND-003","WF-FND-006"],"enables":["WF-UX-002","WF-UX-003","WF-UX-004","WF-UX-005"]},
    {"id":"WF-TECH-009","title":"Observability & Metrics","category":"TECH","priority":"P1","requires":["WF-TECH-001","WF-FND-006"],"enables":["Performance Monitoring"]},
    {"id":"WF-TECH-010","title":"Performance & Capacity","category":"TECH","priority":"P1","requires":["WF-TECH-001","WF-FND-002"],"enables":["Scalability"]},

    {"id":"WF-UX-001","title":"Level 1: Lightning Strikes","category":"UX","priority":"P0","requires":["WF-UX-006","WF-TECH-002","WF-FND-002"],"enables":["WF-UX-002"]},
    {"id":"WF-UX-002","title":"Level 2: Parallel Streams / Council","category":"UX","priority":"P0","requires":["WF-UX-001","WF-TECH-008","WF-UX-006"],"enables":["WF-UX-003"]},
    {"id":"WF-UX-003","title":"Level 3: Structured Architectures","category":"UX","priority":"P1","requires":["WF-UX-002","WF-TECH-008"],"enables":["WF-UX-004"]},
    {"id":"WF-UX-004","title":"Level 4: Adaptive Fields","category":"UX","priority":"P1","requires":["WF-UX-003","WF-TECH-008"],"enables":["WF-UX-005"]},
    {"id":"WF-UX-005","title":"Level 5: Resonance Fields","category":"UX","priority":"P1","requires":["WF-UX-004","WF-TECH-008"],"enables":[]},
    {"id":"WF-UX-006","title":"Unified Energy Visualization System","category":"UX","priority":"P0","requires":["WF-FND-002","WF-TECH-003","WF-TECH-004"],"enables":["WF-UX-001","WF-UX-002","WF-UX-003","WF-UX-004","WF-UX-005"]},
    {"id":"WF-UX-007","title":"UI Component Library","category":"UX","priority":"P0","requires":["WF-UX-006"],"enables":["All UX Levels"]},
    {"id":"WF-UX-008","title":"Onboarding & Doors","category":"UX","priority":"P0","requires":["WF-FND-005"],"enables":["User Journey"]},
    {"id":"WF-UX-009","title":"Gamification & Achievements","category":"UX","priority":"P0","requires":["WF-FND-005"],"enables":["User Engagement"]},
    {"id":"WF-UX-010","title":"Accessibility & Internationalization","category":"UX","priority":"P1","requires":["WF-UX-006"],"enables":["Global Access"]},

    {"id":"WF-BIZ-001","title":"Monetization & Pricing","category":"BIZ","priority":"P0","requires":["WF-META-001","WF-FND-001"],"enables":["Revenue Model"]},
    {"id":"WF-BIZ-002","title":"Licensing, Privacy & Terms","category":"BIZ","priority":"P0","requires":["WF-TECH-006","WF-FND-006"],"enables":["Legal Compliance"]},
    {"id":"WF-OPS-001","title":"Packaging & Release","category":"OPS","priority":"P0","requires":["WF-TECH-007"],"enables":["Deployment"]},
    {"id":"WF-OPS-002","title":"Support & Telemetry Policy","category":"OPS","priority":"P1","requires":["WF-TECH-009"],"enables":["Operations"]},
    {"id":"WF-OPS-003","title":"Data Export / Backup","category":"OPS","priority":"P1","requires":["WF-TECH-004"],"enables":["Data Portability"]},
    {"id":"WF-R&D-001","title":"Turbo Mode Roadmap","category":"R&D","priority":"P2","requires":["WF-TECH-002"],"enables":["Advanced Features"]},
    {"id":"WF-R&D-002","title":"Broker Network & Scheduling","category":"R&D","priority":"P2","requires":["WF-TECH-002"],"enables":["Distributed Processing"]},
    {"id":"WF-R&D-003","title":"Resonance Research Agenda","category":"R&D","priority":"P2","requires":["WF-UX-005"],"enables":["Future Research"]}
  ]
}
```

---

#### 3.7 Asset Manifest (per-doc required outputs) — `/meta/assets-manifest.yaml`

```yaml
version: 1
common:
  text:
    - docs/{id}/document.md
    - docs/{id}/summary.md
    - changelogs/{id}.md
  diagrams:
    - assets/diagrams/{id}-*.mmd
  code: []
  schemas: []
  tests: []
  ui: []
docs:
  WF-META-001:
    diagrams:
      - assets/diagrams/WF-META-001-overview.mmd
      - assets/diagrams/WF-META-001-deps.mmd
      - assets/diagrams/WF-META-001-energy-lifecycle.mmd
    schemas:
      - meta/doc-index.json
    code:
      - code/WF-META-001/reference/universal-template.md
    tests: []
    ui: []
  WF-FND-001:
    diagrams:
      - assets/diagrams/WF-FND-001-vision-principles.mmd
    ui: []
    code: []
    schemas: []
    tests: []
  WF-FND-002:
    diagrams:
      - assets/diagrams/WF-FND-002-energy-circuits.mmd
    schemas:
      - schemas/WF-FND-002-energy-units.json
    tests:
      - tests/WF-FND-002/energy-validation.spec.md
  WF-FND-003:
    diagrams:
      - assets/diagrams/WF-FND-003-5-layer-architecture.mmd
      - assets/diagrams/WF-FND-003-layer-boundaries.mmd
    code: []
    schemas:
      - schemas/WF-FND-003-layer-contracts.json
  WF-FND-004:
    diagrams:
      - assets/diagrams/WF-FND-004-decipher-runtime.mmd
    schemas:
      - schemas/WF-FND-004-event-contracts.json
    code:
      - code/WF-FND-004/decipher-compiler.py
    tests:
      - tests/WF-FND-004/compiler-validation.spec.md
  WF-FND-005:
    diagrams:
      - assets/diagrams/WF-FND-005-orchestrator-flow.mmd
    code:
      - code/WF-FND-005/experience-orchestrator.py
    schemas:
      - schemas/WF-FND-005-policy-engine.json
  WF-FND-006:
    diagrams:
      - assets/diagrams/WF-FND-006-governance-flow.mmd
    code:
      - code/WF-FND-006/governance-validator.py
    schemas:
      - schemas/WF-FND-006-governance-rules.json

  WF-TECH-001:
    diagrams:
      - assets/diagrams/WF-TECH-001-c4-context.mmd
      - assets/diagrams/WF-TECH-001-c4-container.mmd
      - assets/diagrams/WF-TECH-001-eventbus.mmd
    code:
      - code/WF-TECH-001/reference/hello-energy.md
  WF-TECH-002:
    diagrams:
      - assets/diagrams/WF-TECH-002-sequence.mmd
    schemas:
      - schemas/WF-TECH-002-token-timing.json
    code:
      - code/WF-TECH-002/reference/cli-and-snippets.md
    tests:
      - tests/WF-TECH-002/token-eu-correlation.spec.md
  WF-TECH-003:
    diagrams:
      - assets/diagrams/WF-TECH-003-ws-lifecycle.mmd
      - assets/diagrams/WF-TECH-003-channels.mmd
    schemas:
      - schemas/WF-TECH-003-ws.json
    tests:
      - tests/WF-TECH-003/protocol-contract.spec.md
  WF-TECH-004:
    diagrams:
      - assets/diagrams/WF-TECH-004-erd.mmd
      - assets/diagrams/WF-TECH-004-event-sourcing.mmd
    schemas:
      - schemas/WF-TECH-004-energy-state.json
      - schemas/WF-TECH-004-events.json
    tests:
      - tests/WF-TECH-004/state-consistency.spec.md
  WF-TECH-005:
    diagrams:
      - assets/diagrams/WF-TECH-005-trust-zones.mmd
    schemas:
      - schemas/WF-TECH-005-capabilities.json
    tests:
      - tests/WF-TECH-005/threat-model-checklist.md
  WF-TECH-006:
    schemas:
      - schemas/WF-TECH-006-rest.json
      - schemas/WF-TECH-006-ws.json
    code:
      - code/WF-TECH-006/reference/sdk-ts-python.md
    tests:
      - tests/WF-TECH-006/contract.spec.md
  WF-TECH-007:
    figures:
      - assets/figures/WF-TECH-007-slos.svg
    code:
      - code/WF-TECH-007/reference/observability-fields.md
      - code/WF-TECH-007/reference/installer-notes.md
    tests:
      - tests/WF-TECH-007/load-and-visual-fidelity.spec.md
  WF-TECH-008:
    diagrams:
      - assets/diagrams/WF-TECH-008-council-flow.mmd
      - assets/diagrams/WF-TECH-008-adaptation-loop.mmd
      - assets/diagrams/WF-TECH-008-resonance-matrix.mmd
    schemas:
      - schemas/WF-TECH-008-algo-params.json
    tests:
      - tests/WF-TECH-008/latency-bounds.spec.md

  WF-UX-006:
    diagrams:
      - assets/diagrams/WF-UX-006-field-dynamics.mmd
    schemas:
      - schemas/WF-UX-006-particles.json
    ui:
      - ui/WF-UX-006-tokens.json
    figures:
      - assets/figures/WF-UX-006-particle-states.svg
    tests:
      - tests/WF-UX-006/visual-truth.spec.md
  WF-UX-001:
    diagrams:
      - assets/diagrams/WF-UX-001-strike-timeline.mmd
    figures:
      - assets/figures/WF-UX-001-path-styles.svg
    tests:
      - tests/WF-UX-001/ttfstrike.spec.md
  WF-UX-002:
    diagrams:
      - assets/diagrams/WF-UX-002-council-topos.mmd
    figures:
      - assets/figures/WF-UX-002-interference.svg
    tests:
      - tests/WF-UX-002/consensus-telemetry.spec.md
  WF-UX-003:
    diagrams:
      - assets/diagrams/WF-UX-003-architecture-foundry.mmd
    figures:
      - assets/figures/WF-UX-003-growth-patterns.svg
    tests:
      - tests/WF-UX-003/evolution-triggers.spec.md
  WF-UX-004:
    diagrams:
      - assets/diagrams/WF-UX-004-adaptation-cycle.mmd
    figures:
      - assets/figures/WF-UX-004-controls.svg
    tests:
      - tests/WF-UX-004/adaptation-latency.spec.md
  WF-UX-005:
    diagrams:
      - assets/diagrams/WF-UX-005-resonance-types.mmd
    figures:
      - assets/figures/WF-UX-005-metrics-panel.svg
    tests:
      - tests/WF-UX-005/emergence-thresholds.spec.md

  WF-BIZ-001:
    figures:
      - assets/figures/WF-BIZ-001-model-canvas.svg
  WF-BIZ-002:
    schemas:
      - schemas/WF-BIZ-002-data-map.json
    figures:
      - assets/figures/WF-BIZ-002-consent-flow.svg
```

---

#### 3.8 Universal Template Skeleton — `/code/WF-META-001/reference/universal-template.md`

```markdown
# Generate Document: {ID} - {Title}

## 🧬 Document DNA
- Unique ID, Category, Priority, Dev Phase, Estimated Length, Document Type

## 🔗 Dependency Matrix
- Required Before This: [...]
- Enables After This: [...]
- Cross-References: [...]

## 🎯 Core Objective
One crisp, testable sentence.

## 📚 Knowledge Integration Checklist
- [ ] Local-first, energy-truth, emergence-detected
- [ ] Real-time budgets (≤ 16.67ms), 60Hz channels
- [ ] Security boundary & capability model (if applicable)

## 📝 Content Architecture
### 1) Opening Hook
### 2) Core Concepts
### 3) Implementation Details
### 4) Integration Points
### 5) Validation & Metrics

## 🎨 Required Deliverables
- Text, Diagrams, Schemas, Code, Tests, UI tokens

## ✅ Quality Validation Criteria
- Template adherence; glossary links; version labels

## 🔄 Post-Generation Protocol
- Glossary delta → Graph update → SemVer bump → Cascade
```

---

#### 3.9 Generation Order (Tasks) — `/meta/generation-tasks.yaml`

```yaml
phases:
  - name: foundation
    order:
      - WF-FND-001
      - WF-FND-002
      - WF-FND-003
      - WF-FND-004
      - WF-FND-005
      - WF-FND-006
  - name: tech
    order:
      - WF-TECH-001
      - WF-TECH-002
      - WF-TECH-003
      - WF-TECH-004
      - WF-TECH-005
      - WF-TECH-006
      - WF-TECH-007
      - WF-TECH-008
  - name: ux
    order:
      - WF-UX-006
      - WF-UX-001
      - WF-UX-002
      - WF-UX-003
      - WF-UX-004
      - WF-UX-005
  - name: biz
    order:
      - WF-BIZ-001
      - WF-BIZ-002
```

---

#### 3.10 Style Map (terms → visuals/tokens) — `/meta/style-map.json`

```json
{
  "paths": {
    "forge": {"baseColor":"#f59e0b","shape":"angular_shard","trail":"spark_trail"},
    "scholar": {"baseColor":"#3b82f6","shape":"geometric_crystal","trail":"data_trace"},
    "sage": {"baseColor":"#a855f7","shape":"ethereal_orb","trail":"consciousness_mist"}
  },
  "particles": {
    "states": ["nascent","active","excited","decaying","gathered","combining","transforming"],
    "frameBudgetMs": 16.67
  },
  "energy": {
    "euFromTokenTiming": "specified in WF-FND-002",
    "coherenceMetric": "specified in WF-FND-002"
  }
}
```

---

## 🎨 Required Deliverables (for WF-META-001)

* `docs/WF-META-001/document.md` (this content)
* `docs/WF-META-001/summary.md` (1-page executive)
* `assets/diagrams/WF-META-001-overview.mmd`
* `assets/diagrams/WF-META-001-deps.mmd`
* `assets/diagrams/WF-META-001-energy-lifecycle.mmd`
* `meta/doc-index.json`
* `meta/assets-manifest.yaml`
* `meta/generation-tasks.yaml`
* `meta/style-map.json`
* `code/WF-META-001/reference/universal-template.md`
* `changelogs/WF-META-001.md` (initialize `1.0.0`)

---

## ✅ Quality Validation Criteria

* **Beacon Utility:** From this doc alone, a contributor can (a) pick the next ID, (b) copy the prompt, (c) see required assets, (d) know dependencies.
* **Sequential Numbering:** No gaps across FND/TECH/UX/BIZ.
* **Energy Truth:** All runtime/visual docs stipulate 60 Hz and ≤ 16.67 ms budgets.
* **Security & Privacy:** Capability/boundary patterns present where relevant.
* **Glossary Discipline:** Any new term lists a Glossary delta for WF-FND-006.
* **SemVer Discipline:** Each child doc starts at `0.1.0`; META at `1.0.0`.

---

## 🔄 Post-Generation Protocol

1. **Preflight:** load glossary; resolve dependencies; fail on missing P0.
2. **Generate:** use prompts in `/meta/prompts/` and assets in `/meta/assets-manifest.yaml`.
3. **Validate:** lint Mermaid/JSON/OpenAPI; run consistency checker; verify file presence.
4. **Cascade:** update `meta/doc-index.json`; bump versions; queue dependents per `/meta/generation-tasks.yaml`.
5. **Review:** assign Foundation/Tech/UX/Security leads; log issues in each `changelogs/{id}.md`.

---

### TL;DR — What to generate next

Open `meta/doc-index.json`. Take the first unmet **P0** in order:
**FND-001 → FND-002 → FND-003 → FND-004 → FND-005 → FND-006 → TECH-001 → TECH-002 → TECH-003 → TECH-004 → TECH-005 → UX-006 → UX-001** …and so on.
Each entry links to a prompt (`/meta/prompts/{id}.md`) and a precise asset list (`/meta/assets-manifest.yaml`). No guesswork; just ship.
