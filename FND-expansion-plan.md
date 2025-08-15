# FND Document Expansion Plan

This checklist tracks the work needed to bring the short foundation (FND) documents in `GPT_5_DOCUMENTS/docs` up to parity with the long-form specifications at the repository root.

## General Template
- [ ] **Document DNA & Dependencies** – include ID, priority, version, authors, parent/child docs, and dependency matrix.
- [ ] **Core Objective & Rationale** – summarise the document's purpose, constraints, and guiding principles.
- [ ] **Knowledge Integration Checklist** – list related docs/data and any new definitions.
- [ ] **Content Architecture** – structure into: Executive Summary, Core Concepts & Definitions, Implementation Details, Integration Points, Validation & Metrics, Future Work, Required Deliverables.
- [ ] **Required Deliverables** – enumerate every asset: main doc, summary, poster brief, diagrams, schemas, code snippets, tests, UI tokens, figures.
- [ ] **Glossary Delta** – record new terms and cross-links to the living glossary.
- [ ] **Changelog** – versions, dates, and changes.
- [ ] **Summary & Poster Brief Files** – ensure `docs/WF-FND-00X` contains `summary.md` and `poster-brief.md`.
- [ ] **Schemas & Code Examples** – provide concrete API/data format snippets where relevant.
- [ ] **Tests** – validate layer contracts or energy-emission invariants.

## WF-FND-001 – Vision & Principles
- [ ] Confirm glossary delta and poster brief remain aligned with any new terminology.
- [ ] Re-run link and diagram tests after updates.

## WF-FND-002 – Output Physics & Progressive Levels
- [x] Replace "Document Metadata" with full Document DNA and dependency matrix, mirroring the root energy definition spec【F:WF-FND-002-ENERGY.md†L2-L21】【F:GPT_5_DOCUMENTS/docs/WF-FND-002/document.md†L3-L10】.
- [x] Add a knowledge integration checklist referencing vision, manifest, and broker architecture.
- [x] Expand content architecture to include implementation details, integration points, validation metrics, and future work.
- [x] Create `poster-brief.md` and `glossary-delta.md` alongside existing summary【9c1e16†L1-L3】.
- [x] Provide schemas or code snippets for energy calculations and broker telemetry.
- [x] Add tests for energy function consistency and level progression logic.

## WF-FND-003 – Core Architecture Overview
- [ ] Introduce Document DNA, dependency matrix, and knowledge integration checklist as in the root-layer architecture spec【F:WF-FND-003-CORE-ARCHITECTURE†L3-L39】【F:GPT_5_DOCUMENTS/docs/WF-FND-003/document.md†L3-L22】.
- [ ] Expand the narrative with the five-layer system, hardware tiers, and backpressure strategies from the long-form document.
- [ ] Generate summary, poster brief, and glossary delta files; currently only `document.md` and `summary.md` exist【4c0c12†L1-L2】.
- [ ] Add schemas/diagrams for layer contracts and code samples for event payloads.
- [ ] Ensure tests validate layer contracts and 60 Hz timing.

## WF-FND-004 – The Decipher (Central Compiler)
- [x] Add full Document DNA, dependency matrix, and knowledge integration checklist like the detailed Decipher spec【F:WF-FND-004-DECIPHER†L4-L35】【F:GPT_5_DOCUMENTS/docs/WF-FND-004/document.md†L3-L52】.
- [x] Incorporate real-time energy compiler algorithms, local-first privacy notes, hardware tier adaptation, and event emission logic【F:GPT_5_DOCUMENTS/docs/WF-FND-004/document.md†L55-L74】.
- [x] Create poster brief and glossary delta; only `document.md` and `summary.md` are present【F:GPT_5_DOCUMENTS/docs/WF-FND-004/poster-brief.md†L1-L5】【F:GPT_5_DOCUMENTS/docs/WF-FND-004/glossary-delta.md†L1-L5】.
- [x] Include schemas and code examples for emission events and buffering strategy【F:GPT_5_DOCUMENTS/docs/WF-FND-004/event-schema.json†L1-L66】【F:GPT_5_DOCUMENTS/docs/WF-FND-004/decipher.js†L1-L107】.
- [x] Add tests for emission schema validation and 60 Hz frame loop【F:GPT_5_DOCUMENTS/docs/WF-FND-004/decipher-test.spec.md†L1-L56】.

## WF-FND-005 – Module & Plugin Philosophy
- [x] Expand with Document DNA, knowledge integration checklist, and orchestration narrative mirroring the orchestrator spec【F:WF-FND-005-ORCHESTRATION†L2-L37】【F:GPT_5_DOCUMENTS/docs/WF-FND-005/document.md†L3-L63】.
- [x] Detail governance hooks, capability manifests, tier policies, and progression management【F:GPT_5_DOCUMENTS/docs/WF-FND-005/document.md†L60-L66】.
- [x] Add poster brief, glossary delta, and changelog files—currently missing【F:GPT_5_DOCUMENTS/docs/WF-FND-005/poster-brief.md†L1-L5】【F:GPT_5_DOCUMENTS/docs/WF-FND-005/glossary-delta.md†L1-L5】【F:GPT_5_DOCUMENTS/docs/WF-FND-005/CHANGELOG.md†L1-L12】.
- [x] Provide schema and code examples for plugin capabilities; link to orchestrator loop tests【F:GPT_5_DOCUMENTS/docs/WF-FND-005/orchestrator-schema.json†L1-L100】【F:GPT_5_DOCUMENTS/docs/WF-FND-005/orchestrator.js†L1-L124】.
- [x] Add or extend tests covering plugin sandbox timing and capability enforcement【F:GPT_5_DOCUMENTS/docs/WF-FND-005/orchestrator-test.spec.md†L1-L54】.

## WF-FND-006 – System Governance & Evolution Framework
- [x] Replace brief overview with full Document DNA, dependency matrix, knowledge integration, and governance architecture from the long-form framework【F:WF-FND-006-SYSTEM-GOVERNANCE†L3-L38】【F:GPT_5_DOCUMENTS/docs/WF-FND-006/document.md†L3-L52】.
- [x] Elaborate on proposal workflow, sandbox policy, schema versioning, metrics, and audit trail requirements【F:GPT_5_DOCUMENTS/docs/WF-FND-006/document.md†L80-L175】.
- [x] Create summary, poster brief, glossary delta, and changelog files—only `document.md` and `summary.md` exist today【F:GPT_5_DOCUMENTS/docs/WF-FND-006/summary.md†L1-L19】【F:GPT_5_DOCUMENTS/docs/WF-FND-006/poster-brief.md†L1-L5】【F:GPT_5_DOCUMENTS/docs/WF-FND-006/glossary-delta.md†L1-L5】【F:GPT_5_DOCUMENTS/docs/WF-FND-006/CHANGELOG.md†L1-L12】.
- [x] Provide schema examples for governance decisions and sample policy configurations【F:GPT_5_DOCUMENTS/docs/WF-FND-006/governance-proposal.json†L1-L82】【F:GPT_5_DOCUMENTS/docs/WF-FND-006/governance-rules.js†L1-L73】.
- [x] Add tests verifying governance rule enforcement and energy-linked change logs【F:GPT_5_DOCUMENTS/docs/WF-FND-006/governance-test.spec.md†L1-L46】.

---
Generated to coordinate a staged expansion of the FND document set so that future agents can implement the missing sections and assets methodically.
