Below is a **clear, lean catalog of the remaining documents** to generate in the new batch—grouped by TECH, UX, BIZ/OPS, and R\&D—plus **how each is powered by the six Foundations** we just finalized. This is meant to be your quick map from “Foundations → Implementation.”

---

## 0) How the 6 Foundations drive everything else

**FND‑001 · Vision & Principles**
Sets the *Local‑Core, Web‑Engaged* stance, the 3 Doors (Forge/Scholar/Sage), monetization frame, and “AI made visible.” Everything below must uphold this.

**FND‑002 · Energy & Circuits**
Defines Energy Units, 60 Hz cadence, circuits→fields→resonance math. Powers all visualization, performance budgets, and fidelity tests.

**FND‑003 · 5‑Layer Architecture**
Enforces boundaries (Input → Model → Decipher → Transport → UI), allowed flows, and anti‑patterns. Every TECH/UX spec references these seams.

**FND‑004 · DECIPHER**
Gives the real‑time compiler, event contracts, and audit paths at 60 Hz. All runtime data, visuals, and tests hinge on its events.

**FND‑005 · Experience Orchestrator**
Policy engine that gates features by Door/Level, coordinates councils, budgets, progression, and emits `experience.*`/`council.*`. UX levels and TECH runtime obey it.

**FND‑006 · Governance & Evolution**
Versioning, sandbox, metrics, audits. Keeps every change principled (no Docker in core, schema discipline, safe experiments) and measurable.

> **Note on older references:** Any prior mentions of “FND‑007 Module System” are now **moved into TECH‑008 Plugin/Sandbox** under this new structure.

---

## 1) TECH — Core Implementation (P0→P1)

**TECH‑001 · System Runtime & Services (P0)**

* **Scope:** Process model, service graph, process manager, threading/async model, build/packaging (local‑first; no Docker in core).
* **Consumes:** FND‑003, FND‑006.
* **Why foundations matter:** 5‑layer boundaries (FND‑003) shape service seams; governance (FND‑006) dictates packaging & start‑up checks.

**TECH‑002 · Local AI Integration & Turbo/Broker (P0)**

* **Scope:** Ollama integration (streaming tokens), model pool/load policy, “Turbo” local ensembles, Broker‑Hybrid as **parallel** satellite (opt‑in).
* **Consumes:** FND‑001/002/005.
* **Why:** Energy calibration (FND‑002), Orchestrator council hooks (FND‑005), Local‑Core stance (FND‑001).

**TECH‑003 · Real‑Time Protocol (WebSockets) (P0)**

* **Scope:** Channels, ordering, backpressure, binary energy frames, JSON event schemas for `energy.*`, `experience.*`, `council.*`, `reward.*`.
* **Consumes:** FND‑004/005/006.
* **Why:** Must carry DECIPHER+Orchestrator events with versioned schemas (FND‑006).

**TECH‑004 · State & Storage (P0)**

* **Scope:** Postgres/Timescale for sessions & metrics; Redis for live state; audit log tables.
* **Consumes:** FND‑004/005/006.
* **Why:** Persist DECIPHER products, progression, achievements; enforce auditability and retention.

**TECH‑005 · DECIPHER Implementation (P0)**

* **Scope:** Concrete 60 Hz compiler runtime, parsers, energy mappers, queue policy, drop/degrade behavior.
* **Consumes:** FND‑002/004.
* **Why:** Direct implementation of FND‑004 against FND‑002 math.

**TECH‑006 · Security & Privacy (P0)**

* **Scope:** Local data boundaries, sandbox perms, Broker data minimization, PII policy, threat model.
* **Consumes:** FND‑001/006.
* **Why:** Enforce Local‑Core and sandbox isolation from governance.

**TECH‑007 · Testing & QA (P0)**

* **Scope:** Unit/integration for DECIPHER/Orchestrator, golden‑run replays, frame‑budget tests, schema regression.
* **Consumes:** FND‑002/004/005/006.
* **Why:** Turn foundations into pass/fail gates; enforce 60 Hz and event compatibility.

**TECH‑008 · Plugin / Module Architecture & Sandbox (P1)**

* **Scope:** Extension interfaces, capability descriptors, sandbox policy enforcement, promotion workflow.
* **Consumes:** FND‑003/006.
* **Why:** Governance sandbox becomes concrete developer API.

**TECH‑009 · Observability & Metrics (P1)**

* **Scope:** Emit metrics (latency, frame stability, energy fidelity, progression), dashboards, alerts; log shaping.
* **Consumes:** FND‑006 (+ metrics schema).
* **Why:** Close the sense→adapt loop demanded by governance.

**TECH‑010 · Performance & Capacity (P1)**

* **Scope:** Profiling matrices per hardware tier, tuning playbooks, council scaling rules, memory/VRAM budgets.
* **Consumes:** FND‑002/005.
* **Why:** Map energy math and orchestrator budgets to real hardware tiers.

---

## 2) UX — Experience Layer (P0→P1)

**UX‑001 · Level 1: Lightning Strikes (P0)**

* **Scope:** Solo stream UI; token‑to‑energy visual mapping; 60 fps canvas budget.
* **Consumes:** FND‑002/004/005.
* **Why:** Visuals must be data‑true (FND‑002/004); gated by Orchestrator (FND‑005).

**UX‑002 · Level 2: Parallel Streams / Council (P0)**

* **Scope:** Multi‑stream layout, interference overlays, consensus reveal.
* **Consumes:** FND‑005.
* **Why:** Driven by `council.*` events and Level‑2 gates.

**UX‑003 · Level 3: Structured Architectures (P1)**

* **Scope:** Node/edge builder, execution traces, step visuals.
* **Consumes:** FND‑003/004/005.
* **Why:** Architecture flows from L3 to L4 via Orchestrator.

**UX‑004 · Level 4: Adaptive Fields (P1)**

* **Scope:** Suggestions, preference learning UI, adaptive visuals with transparency controls.
* **Consumes:** FND‑005/006.
* **Why:** Adaptive hints sourced from orchestrator adaptors; explainability per governance.

**UX‑005 · Level 5: Resonance Fields (P1)**

* **Scope:** Emergence visuals (mandala/symphony/fractal modes), celebration & audit overlays.
* **Consumes:** FND‑002/005.
* **Why:** Only render on real resonance; show trace links.

**UX‑006 · Unified Energy Visualization System (P0)**

* **Scope:** Visual language, shaders, scales, accessibility; perf budgets.
* **Consumes:** FND‑002/004.
* **Why:** Turns energy math + events into a consistent, fast visual system.

**UX‑007 · UI Component Library (P0)**

* **Scope:** Inputs, model pickers, council badges, achievement toasts; theming per Door.
* **Consumes:** FND‑001/005.
* **Why:** Door theming from Vision; components gated by level.

**UX‑008 · Onboarding & Doors (P0)**

* **Scope:** Path choice, tutorial beats, teaser→unlock sequences.
* **Consumes:** FND‑001/005/006.
* **Why:** Aligns with Doors narrative; transitions via `experience.*`; future Door proposals via governance.

**UX‑009 · Gamification & Achievements (P0)**

* **Scope:** XP/EU mapping, badges, rewards cadence, store surfaces; ad‑free entitlement UI.
* **Consumes:** FND‑001/005/006.
* **Why:** Monetization & progression contracts enforced by Orchestrator and governance.

**UX‑010 · Accessibility & Internationalization (P1)**

* **Scope:** Motion sensitivity, color‑blind palettes, captions; locale content.
* **Consumes:** FND‑006.
* **Why:** Governance requires inclusive defaults and testable settings.

---

## 3) BIZ / OPS — Ship & Sustain (P0→P1)

**BIZ‑001 · Monetization & Pricing (P0)**

* **Scope:** Free w/ 3 ads/day; €9.42 + tax subscription; Broker usage model (sub or usage‑based).
* **Consumes:** FND‑001/006.
* **Why:** Doors/Levels marketing fit; entitlements wired through governance.

**BIZ‑002 · Licensing, Privacy & Terms (P0)**

* **Scope:** Local data policy, export/delete, Broker disclosures, module marketplace terms.
* **Consumes:** FND‑006.

**OPS‑001 · Packaging & Release (P0)**

* **Scope:** Native installers, update channels, rollback, integrity checks (no Docker).
* **Consumes:** FND‑006.

**OPS‑002 · Support & Telemetry Policy (P1)**

* **Scope:** Opt‑in telemetry events, crash reports, redaction rules, user controls.
* **Consumes:** FND‑006.

**OPS‑003 · Data Export / Backup (P1)**

* **Scope:** One‑click export of sessions, achievements, settings; restore paths.
* **Consumes:** FND‑006; uses TECH‑004.

---

## 4) R\&D — Future Tracks (P2)

**R\&D‑001 · Turbo Mode Roadmap**

* **Scope:** OSS 20B/120B local feasibility, quantization, staged rollouts; thermal/VRAM models per tier.
* **Consumes:** FND‑001/002/006.

**R\&D‑002 · Broker Network & Scheduling**

* **Scope:** Parallel satellite compute, jitter handling, cost governors, fairness.
* **Consumes:** FND‑005/006.

**R\&D‑003 · Resonance Research Agenda**

* **Scope:** Detection methods, long‑horizon patterns, user studies, art modes.
* **Consumes:** FND‑002/005.

---

## 5) Cross‑walk: Foundations → Each Track (at a glance)

| Foundation →             | TECH                                      | UX                                       | BIZ/OPS                           | R\&D                      |
| ------------------------ | ----------------------------------------- | ---------------------------------------- | --------------------------------- | ------------------------- |
| **FND‑001 Vision**       | 002,006 (local‑core), 001 packaging ethos | 007 theming, 008 onboarding, 009 rewards | BIZ‑001 pricing narrative         | R\&D‑001 scope realism    |
| **FND‑002 Energy**       | 005 compiler tuning, 010 perf budgets     | 001/006 visual scales                    | OPS‑003 data integrity checks     | R\&D‑003 metrics targets  |
| **FND‑003 5‑Layer**      | 001 seams, 008 plugin seams               | 003 builder boundaries                   | OPS‑001 packaging seams           | R\&D interfaces           |
| **FND‑004 DECIPHER**     | 003 protocol, 004 storage                 | 001/002/006 event‑driven UI              | OPS‑002 telemetry events          | R\&D replay datasets      |
| **FND‑005 Orchestrator** | 002 council hooks, 010 scaling            | 002–005 level gates                      | BIZ‑001 entitlements, 009 rewards | R\&D‑002 control loops    |
| **FND‑006 Governance**   | 003 schema versions, 008 sandbox          | 008 door additions, 010 a11y             | OPS‑001 releases, BIZ‑002 policy  | All R\&D ethics & reviews |

---

## 6) Asset expectations (concise)

* **Every TECH doc:** 1 system diagram, 1–2 schemas, reference stubs, perf/QA tests.
* **Every UX doc:** 1 flow diagram, component specs, state/event table, visual budget & a11y notes.
* **Every BIZ/OPS doc:** policy tables, user‑facing copy blocks, operational runbooks.
* **Every R\&D doc:** experiment design, acceptance thresholds, rollback criteria.

All event/data artifacts must carry **schema versions** (FND‑006). All visuals must tie to **DECIPHER/Orchestrator events** (FND‑004/005). All implementations must respect **Local‑Core** and avoid Docker in core (FND‑001/006).

---

## 7) Build order (critical path)

1. **TECH‑003, TECH‑005, TECH‑004, TECH‑001** (wire the 60 Hz backbone).
2. **UX‑006, UX‑001** (energy system + Level‑1).
3. **TECH‑002, UX‑002** (council), then **UX‑003** (architectures).
4. **TECH‑007, TECH‑010** (QA & perf), **UX‑004** (adaptive), **UX‑005** (resonance).
5. **BIZ‑001/002, OPS‑001** (shipable product).
6. **TECH‑008, TECH‑009, OPS‑002/003, UX‑007/008/009/010** (round out), then **R\&D tracks**.

