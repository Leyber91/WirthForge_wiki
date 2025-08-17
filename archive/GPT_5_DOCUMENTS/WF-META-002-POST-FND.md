WIRTHFORGE — Post-Foundation Document Generation Plan

All prompts, dependencies, and deliverables from TECH → UX → OPS/BIZ → R&D

TECH — Core Implementation
WF-TECH-001 — Runtime Backbone & Process Graph

Prompt:
Generate Document: WF-TECH-001 — Runtime Backbone & Process Graph
Follow the universal template. Use FND-003 for 5-layer boundaries, FND-006 for glossary discipline. Describe local-core process graph: main orchestrator, DECIPHER runtime, transport layer, energy state service. Include C4 context/container/component diagrams (Mermaid), YAML manifest of processes, and startup integrity checklist. Show integration seams for TECH-002/003/004. Deliver text, diagrams, schemas, code stub for process init, and boot-time test spec (boot to 60 Hz in ≤2 s on Tier-Mid).
Requires: FND-003, FND-006
Enables: TECH-002, TECH-003, TECH-004, TECH-006

WF-TECH-002 — DECIPHER Implementation (60 Hz Compiler)

Prompt:
Generate Document: WF-TECH-002 — DECIPHER Implementation (60 Hz)
Follow the universal template. Implement compiler loops, parsers, schedulers, drop/degrade policy tied to 16.67 ms frame budget; token→EU mapping per FND-002; event contracts for energy.*. Include runtime loop sequence diagram, backpressure policy, JSON schema for energy.frame, code stub (pseudo/py) for frame composer, replay test vectors.
Requires: FND-002, FND-004
Enables: UX-006, UX-001, TECH-003, TECH-004, TECH-009

WF-TECH-003 — Real-Time Transport (WebSocket/IPC)

Prompt:
Generate Document: WF-TECH-003 — Real-Time Transport
Follow the universal template. Use FND-004 for DECIPHER outputs, TECH-001 for component hooks. Define channels (energy, experience, council), JSON/MessagePack schemas, heartbeat/reconnect FSM. Provide protocol lifecycle diagram, schemas, and contract tests for schema compliance and latency (<5 ms median).
Requires: TECH-001, FND-004
Enables: TECH-004, UX-006, UX-001

WF-TECH-004 — Energy State & Persistence

Prompt:
Generate Document: WF-TECH-004 — Energy State & Persistence
Follow the universal template. Use FND-002 for EU/coherence metrics, TECH-001/003 for integration points. Define in-memory frame state, event log, snapshot/recovery. Include ERD, event-sourcing flow diagram, JSON schema for energy.event and snapshot, integrity check logic, and replay tool spec.
Requires: TECH-001, TECH-003, FND-002
Enables: UX-006, UX-001

WF-TECH-005 — Local AI Integration & Turbo/Broker

Prompt:
Generate Document: WF-TECH-005 — Local AI Integration & Turbo/Broker
Follow the universal template. Use FND-001 for local-first stance, FND-002 for EU mapping, FND-005 for council orchestration rules. Describe Ollama “Turbo” (parallel ensembles), broker satellite integration for high-tier users, and switching logic between local and broker models. Include model profile table per hardware tier, diagram of decision path (local vs broker), JSON schema for model profile definitions, and integration test spec ensuring policy compliance and energy-truth alignment.
Requires: TECH-002, FND-001/002/005
Enables: UX-002, UX-004

WF-TECH-006 — Plugin & Sandbox System

Prompt:
Generate Document: WF-TECH-006 — Plugin & Sandbox System
Follow the universal template. Use FND-003 for layer boundaries and FND-006 for governance controls. Define plugin manifest format, capability descriptors, and sandbox policy enforcement (resource limits, read-only event access, promotion workflow). Provide module loading diagram, sample plugin.yaml, JSON schema for capability tokens, and sandbox policy file example. Include functional tests for isolation and governance compliance.
Requires: TECH-001, FND-003/006
Enables: Marketplace later, safe module experiments

WF-TECH-007 — Security & Privacy Enforcement

Prompt:
Generate Document: WF-TECH-007 — Security & Privacy Enforcement
Follow the universal template. Use FND-001 for trust principles, FND-006 for governance, and TECH-006 for plugin security context. Define security zones (local core, sandbox, broker), authentication (device keys), encryption at rest/in transit, and permission enforcement. Deliver trust boundary diagram, JSON schema for permission sets, and a threat model table with mitigations. Test spec must validate no cross-zone leaks and opt-in broker data use.
Requires: TECH-006, FND-001/006
Enables: OPS-002, BIZ-002

WF-TECH-008 — Observability & Metrics

Prompt:
Generate Document: WF-TECH-008 — Observability & Metrics
Follow the universal template. Use FND-006 for metrics governance and FND-002 for EU/energy-fidelity KPIs. Define metrics schema (latency, frame stability, progression rate, error counts), log format, and dashboard mock-ups. Include Mermaid data-flow from source (DECIPHER, orchestrator) → storage → dashboard. JSON schema for metrics.snapshot, sample dashboard view, and test plan verifying metric accuracy and update cadence.
Requires: TECH-004, FND-002/006
Enables: TECH-009, governance reviews

WF-TECH-009 — Performance & QA Harness

Prompt:
Generate Document: WF-TECH-009 — Performance & QA Harness
Follow the universal template. Use FND-002 for performance targets, FND-006 for gating rules. Define golden-run replay harness, frame-budget load tests, schema regression tests, and visual-truth validation. Provide QA pipeline diagram, replay test format (JSON), and coverage matrix. Include acceptance thresholds and rollback criteria.
Requires: TECH-008, FND-002/006
Enables: release readiness

WF-TECH-010 — Packaging & Updates (Native)

Prompt:
Generate Document: WF-TECH-010 — Packaging & Updates (Native)
Follow the universal template. Use FND-001 for no-Docker/offline requirement, FND-006 for governance on releases. Define installer formats, update channels, rollback strategies, and integrity verification. Include packaging workflow diagram, config schema for updater, and test plan for rollback success on failure.
Requires: FND-001/006
Enables: OPS-001

UX — Experience Layer
WF-UX-006 — Unified Energy Visualization System

Prompt:
Generate Document: WF-UX-006 — Unified Energy Visualization & UI Specs
Follow the universal template. Use FND-002 for energy math, TECH-003/004 for event contracts. Define particle/field taxonomy, rendering budgets, a11y modes. Deliver visual language spec, token→particle mapping, design tokens JSON, frame timing diagram, and visual-truth test plan.
Requires: FND-002, TECH-003, TECH-004
Enables: UX-001..UX-005

WF-UX-001 — Level 1 — Lightning Strikes

Prompt:
Generate Document: WF-UX-001 — Level 1: Lightning Strikes
Follow the universal template. Use FND-002 for energy mapping, TECH-002 for data source, UX-006 for visuals. Define first-run flow: TTFS < 10 s, single-stream strike timeline, path-themed styles. Include user flow, strike timeline diagram, mock frames, TTFS KPI spec, and a11y notes.
Requires: UX-006, TECH-002, FND-002
Enables: UX-002

WF-UX-002 — Level 2 — Parallel Streams (Council)

Prompt:
Generate Document: WF-UX-002 — Level 2: Parallel Streams (Council)
Follow the universal template. Build on UX-001, FND-005 for council rules, and TECH-005 for data feed. Define multi-model layout, interference visuals, consensus/divergence cues. Include session flow diagram, visual mock-ups for aligned vs divergent streams, KPI spec for consensus rate and energy amplification.
Requires: UX-001, TECH-005, FND-005
Enables: UX-003

WF-UX-003 — Level 3 — Structured Architectures

Prompt:
Generate Document: WF-UX-003 — Level 3: Structured Architectures
Follow the universal template. Use FND-003 for layer constraints, FND-005 for progression rules, TECH-006 for module nodes. Define graph-based builder UI, node/edge states, energy flow along edges. Include architecture diagram, mock node editor UI, JSON schema for saved structures, and test plan for execution fidelity.
Requires: UX-002, TECH-006, FND-003/005
Enables: UX-004

WF-UX-004 — Level 4 — Adaptive Fields

Prompt:
Generate Document: WF-UX-004 — Level 4: Adaptive Fields
Follow the universal template. Anchor in FND-005 for adaptation triggers, TECH-005 for model switching, TECH-006 for module tuning. Define field morph visuals, adaptation controls, and transparency overlays. Deliver adaptation loop diagram, control mock-ups, KPI spec for adaptation latency vs success rate.
Requires: UX-003, TECH-005, FND-005
Enables: UX-005

WF-UX-005 — Level 5 — Resonance Fields

Prompt:
Generate Document: WF-UX-005 — Level 5: Resonance Fields
Follow the universal template. Use FND-002 for resonance math, FND-005 for progression gating, TECH-008 for metrics panel. Define resonance visuals, consciousness metrics UI, celebration effects. Include resonance type diagram, metrics panel mock-up, and test spec for emergence thresholds and logging.
Requires: UX-004, TECH-008, FND-002/005
Enables: celebrations, audit records

WF-UX-007 — UI Component Library

Prompt:
Generate Document: WF-UX-007 — UI Component Library
Follow the universal template. Use FND-001 for thematic guidance, UX-006 for visual language, FND-006 for consistency. Define reusable UI elements with energy-truth-ready states and a11y tokens. Include component inventory table, design token JSON, diagram of component dependency flow in UI, code stubs for one high-frequency component, and a11y/60 fps test plan.
Requires: UX-006, FND-001/006
Enables: all UX levels

WF-UX-008 — Onboarding & Doors

Prompt:
Generate Document: WF-UX-008 — Onboarding & Doors
Follow the universal template. Use FND-001 for narrative, FND-005 for progression rules, FND-006 for Door definitions. Detail onboarding flow: path selection, tutorial beats, entitlement setup. Deliver onboarding flow diagram, screen mock-ups, and event schema for door.select. Test plan for correct path assignment, unlock logic, and smooth first-run (≤90 s).
Requires: FND-001/005/006
Enables: BIZ-001

WF-UX-009 — Gamification & Achievements

Prompt:
Generate Document: WF-UX-009 — Gamification & Achievements
Follow the universal template. Use FND-001 for motivational framing, FND-005 for progression mapping. Define EU→XP formulas, badge types, celebration triggers. Include badge asset list, effect specs, JSON schema for achievement definitions. Test spec to validate award logic, persistence, and no false-positives.
Requires: UX-008, FND-001/005
Enables: retention loops, BIZ-001 perks

WF-UX-010 — Accessibility & Error/Empty States

Prompt:
Generate Document: WF-UX-010 — Accessibility & Error/Empty States
Follow the universal template. Use FND-001 for inclusivity ethos, FND-006 for governance compliance. Define accessibility presets and error/empty UI patterns that uphold energy-truth. Include preset JSON, state mock-ups, and tests for toggles/fallback visuals.
Requires: FND-001/006
Enables: trust, OPS-003 support flows

OPS / BIZ — Ship, Trust, Sustain
WF-OPS-001 — Release & Runtime Operations

Prompt:
Generate Document: WF-OPS-001 — Release & Runtime Operations
Follow the universal template. Use FND-006 for governance steps, TECH-010 for packaging. Define environment configs, release channels, crash capture, rollback drills. Include ops runbook, Mermaid release flow, YAML env profiles, and rollback/crash report tests.
Requires: TECH-010, FND-006
Enables: stable launch

WF-OPS-002 — Telemetry Policy (Opt-in)

Prompt:
Generate Document: WF-OPS-002 — Telemetry Policy (Opt-in)
Follow the universal template. Use FND-006 for policy gates, TECH-008 for metrics schema. Define data collected, storage location, opt-in flow, and export formats. Include policy doc, consent UI mock-up, telemetry config JSON, and consent/data scope tests.
Requires: TECH-008, FND-006
Enables: governance metrics review

WF-OPS-003 — Data Export & Backup

Prompt:
Generate Document: WF-OPS-003 — Data Export & Backup
Follow the universal template. Use FND-001 for user ownership, FND-006 for compliance. Define one-click export and restore flow. Include export package spec, flow diagram, backup policy, and tests for export integrity, import success, and privacy safeguards.
Requires: FND-001/006
Enables: trust, compliance

WF-BIZ-001 — Monetization & Entitlements

Prompt:
Generate Document: WF-BIZ-001 — Monetization & Entitlements
Follow the universal template. Use FND-001 for value framing, FND-005 for gating, FND-006 for governance. Detail free tier, paid tier (€9.42/mo), broker usage pricing. Include entitlement table, billing flow diagram, subscription status schema, and tests for gating enforcement.
Requires: FND-001/005/006
Enables: revenue

WF-BIZ-002 — Terms & Privacy

Prompt:
Generate Document: WF-BIZ-002 — Terms & Privacy
Follow the universal template. Use FND-001 for trust promise, FND-006 for governance, TECH-007 for security baseline. Draft ToS and Privacy Policy text, consent UI mock-up, compliance checklist, and legal display/acceptance tests.
Requires: TECH-007, FND-001/006
Enables: compliant launch

WF-BIZ-003 — Community Guidelines

Prompt:
Generate Document: WF-BIZ-003 — Community Guidelines
Follow the universal template. Use FND-001 for ethos, FND-006 for governance. Define conduct rules for Doors personas, content standards, enforcement process. Include guidelines text, moderation workflow diagram, report form schema, and moderation logging tests.
Requires: FND-001/006
Enables: safe community spaces

R&D — Future Tracks
WF-RD-001 — Turbo Mode Roadmap (OSS 20B / 120B)

Prompt:
Generate Document: WF-RD-001 — Turbo Mode Roadmap (OSS 20B / 120B)
Follow the universal template. Use FND-001 for local-core policy, FND-002 for EU scaling, FND-006 for governance gates. Detail feasibility for GPT-OSS 20B/120B: quantization, VRAM per tier, perf projections. Include tier matrix, budget chart, rollout plan, and benchmark protocol.
Requires: TECH-005, FND-001/002/006
Enables: high-tier model offering

WF-RD-002 — Broker Satellite Scheduling

Prompt:
Generate Document: WF-RD-002 — Broker Satellite Scheduling
Follow the universal template. Use FND-005 for orchestrator control, FND-006 for fairness/compliance. Specify scheduling algorithm: priority, fairness, cost governors. Include request→broker→node→return flow, job descriptor schema, simulation scenarios, and SLA/fairness tests.
Requires: TECH-005, FND-005/006
Enables: scalable satellite access

WF-RD-003 — Resonance Research Agenda

Prompt:
Generate Document: WF-RD-003 — Resonance Research Agenda
Follow the universal template. Use FND-002 for resonance math, FND-005 for Level 5 context. Outline research questions, controlled experiments, user studies, art modes. Include experiment design templates, data collection schema, and ethics checklist.
Requires: TECH-008, UX-005, FND-002/005
Enables: future interaction modes

**WF-RD
ChatGPT said:

-004 — Module Marketplace Vision**
Prompt:
Generate Document: WF-RD-004 — Module Marketplace Vision
Follow the universal template. Use FND-003 for boundaries, FND-006 for submission/review rules. Define user/developer flows, submission process, scanning pipeline. Include marketplace diagram, listing schema, moderation workflow, and safety tests.
Requires: TECH-006, FND-003/006
Enables: community ecosystem

WF-RD-005 — Mobile & Immersive Extensions

Prompt:
Generate Document: WF-RD-005 — Mobile & Immersive Extensions
Follow the universal template. Use FND-001 for consistency, FND-002 for energy visuals adaptation. Define mobile UI adaptations, perf targets, AR/VR integration. Include mock-ups, device matrix, and fidelity test plan.
Requires: UX-006, FND-001/002
Enables: mobile/immersive release

WF-RD-006 — Educational & Research Platform Extensions

Prompt:
Generate Document: WF-RD-006 — Educational & Research Extensions
Follow the universal template. Use FND-001 for mission alignment, FND-006 for governance. Propose classroom/research modes: multi-user sessions, curriculum integration, anonymized data sharing. Include feature list, access control schema, pilot plan, and compliance test.
Requires: TECH-003, UX-003, FND-001/006
Enables: academic adoption

✅ This completes the full WF-META-aligned generation plan.
Every doc is ready to be spun out, with dependencies clear and assets specified.