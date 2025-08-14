# Generate Document: WF-TECH-001 – Runtime Backbone & Process Graph

## 🧬 Document DNA
* **Unique ID:** WF-TECH-001
* **Category:** TECH
* **Priority:** P0
* **Dev Phase:** 1
* **Estimated Length:** ~2,500 words
* **Document Type:** Technical Specification

## 🔗 Dependency Matrix
* **Required Before This:** WF-FND-003 (5-layer architecture), WF-FND-006 (glossary)
* **Enables After This:** WF-TECH-002, WF-TECH-003, WF-TECH-004, WF-TECH-006
* **Cross-References:** WF-FND-001 (vision), WF-FND-002 (energy units)

## 🎯 Core Objective
Describe the native local-core process layout that boots to a 60 Hz loop within 2 s and exposes seams for compilation, transport, and state services.

## 📚 Knowledge Integration Checklist
* 5-layer boundary rules from WF-FND-003
* Glossary discipline from WF-FND-006
* Local-first startup from WF-FND-001
* Energy frame cadence per WF-FND-002
* Governance checks at process boundaries

## 📝 Content Architecture
### 1) Opening Hook
The runtime backbone is the spine of WirthForge: without a deterministic process graph, higher layers cannot measure or visualise energy truth.

### 2) Core Concepts
Define orchestrator, DECIPHER runtime, transport, and energy state nodes. Each process lives in its own container with explicit priorities and restart policies.

### 3) Implementation Details
```mermaid
C4Context
    Person(dev, "Developer")
    System(runtime, "Runtime Backbone")
    dev --> runtime
```
```mermaid
C4Container
    Container(orchestrator,"Orchestrator","Rust","boot & supervise")
    Container(decipher,"DECIPHER","Rust","compile to energy")
    Container(transport,"Transport Layer","Rust","WebSocket/IPC")
    Container(state,"Energy State","Rust","in-memory frame store")
    orchestrator --> decipher
    orchestrator --> transport
    orchestrator --> state
```
Process manifest:
```yaml
processes:
  orchestrator:
    priority: high
    threads: 1
  decipher:
    priority: high
    threads: 2
  transport:
    priority: medium
    threads: 1
  energy_state:
    priority: low
    threads: 1
```
Startup integrity checklist:
1. All processes spawn without panic.
2. DECIPHER heartbeat within 100 ms.
3. Transport opens port `8123`.
4. Energy state reports empty frame and log.

Code stub:
```rust
fn main() {
    boot_orchestrator()
        .and_then(init_processes)
        .expect("runtime boot failed");
}
```

### 4) Integration Points
Service APIs: `compile(input) -> energy.frame`, `transport.send`, `state.snapshot`, `plugin.register`.

### 5) Validation & Metrics
* Boot to 60 Hz loop ≤ 2 s on Tier‑Mid hardware.
* CPU usage < 40% steady-state.
* Process restart time < 500 ms.

## 🎨 Required Deliverables
* Text: this document and executive summary
* Visuals: C4 context, container diagrams
* Code: process init stub in Rust
* Data: JSON process manifest
* Tests: boot-time smoke spec

## ✅ Quality Validation Criteria
* Matches 5-layer boundaries
* Uses glossary terms exactly once on first use
* Boot spec covers failure modes

## 🔄 Post-Generation Protocol
* Update glossary in WF-FND-006 with new terms
* Link new diagrams in assets manifest
* Queue integration tests for transport and compiler
