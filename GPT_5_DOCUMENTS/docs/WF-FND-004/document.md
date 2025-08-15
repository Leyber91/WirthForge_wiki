---
id: WF-FND-004
title: The Decipher (Central Compiler)
status: Draft
owners: [engineering, architecture]
last_review: 2025-08-15
audience: [engineering, product, UX]
depends_on: [WF-FND-003]
enables: [WF-TECH-001, WF-TECH-004, WF-TECH-008, WF-UX-003]
---

# Generate Document: WF ‑ FND ‑ 004 – The Decipher (Central Compiler)

## 🧬 Document DNA
- **Unique ID:** WF ‑ FND ‑ 004  
- **Category:** Foundation  
- **Priority:** P0 (Core real‑time engine)  
- **Development Phase:** 1  
- **Estimated Length:** ~3,500 words  
- **Document Type:** Technical Specification / Architectural Design

## 🔗 Dependency Matrix
- **Required Before This:**  
  - **WF ‑ FND ‑ 003 – Core Architecture Overview:** Provides the five‑layer context and places Decipher in Layer 3.  
- **Enables After This:**  
  - **WF ‑ TECH ‑ 001 – System Architecture:** Integrates Decipher as the core processing hub.  
  - **WF ‑ TECH ‑ 004 – State Management & Storage:** Consumes Decipher’s events for persistence.  
  - **WF ‑ TECH ‑ 008 – Core Algorithms:** Builds on Decipher to implement Council, Adaptation and Resonance algorithms.  
  - **WF ‑ UX ‑ 003 – Level 3 Experience:** Uses Decipher events for advanced visualization.  
- **Cross‑References:**  
  - **WF ‑ FND ‑ 002 – Energy Framework:** Defines formulas and state machine that Decipher implements.  
  - **WF ‑ TECH ‑ 003 – WebSocket Protocol:** Provides messaging channels for event streaming.  
  - **WF ‑ FND ‑ 006 – Glossary:** Terms like “energy_frame”, “resonance” must align.

## 🎯 Core Objective
Implement the **Decipher** as the heart of WIRTHFORGE’s runtime engine: transform raw token streams into structured energy and experience events at 60 Hz with strict performance, accuracy and privacy guarantees. This component must run locally by default, scale across hardware tiers, and serve as the unifying interface between AI computation and user visualization.

## 📚 Knowledge Integration Checklist
- **Energy Function Implementation:** Embed formulas from WF ‑ FND ‑ 002 to compute E(t) and DI in real time.  
- **Frame Loop:** Adhere to 16.67 ms processing budget; design internal modules to batch, smooth and emit events per frame.  
- **Asynchronous Modules:** Utilize non-blocking patterns (queues, pipeline stages) to avoid stalls.  
- **Tap & Debug:** Provide hooks to observe token streams and energy calculations without affecting output.  
- **Event Schema Definition:** Specify JSON/MessagePack formats for energy_frame and experience_event; include fields for model ID, energy metrics, timestamps and event types.  
- **Higher‑Order Phenomena:** Detect and categorize interference, fields, resonance but activate features only when UX level permits.  
- **Privacy & Local‑First:** Avoid outputting raw prompts or token strings; only abstracted energy and experience metadata.  
- **Hardware Adaptation:** Adjust frame size, smoothing constants and concurrency strategies based on device tier (Low/Mid/High/Hybrid).  
- **Integration Points:** Connect with L2 via streaming API; emit events via L4 channels; store state via WF ‑ TECH ‑ 004.  
- **Validation Metrics:** Define test harness to profile performance, verify energy correctness, and audit event fidelity.

## 📝 Content Architecture

### 1. Opening Hook – “From Tokens to Lightning Bolts”
Describe the moment when Decipher catches raw tokens as they spill out of the model and, within 16.67 ms, forges them into bolts of light that the user perceives. Use analogies to a blacksmith forging sparks into steel or a synthesizer turning raw waveforms into music. Emphasize the magic lies in deterministic computation, not fantasy.

### 2. Core Concepts
- **Ingestion Pipeline:** Tokens arrive with timestamps and probabilities; Decipher places them into a time‑sorted queue.  
- **Energy Conversion:** Use Velocity (`v_t`), Certainty (`c_t`), Friction (`f_t`), smoothing (`α`), and weights to calculate E(t) per token and aggregate into frames.  
- **Event Structuring:** Package energy values and metadata into `energy_frame` events with fields (timestamp, energy, DI, modelID, frameNumber).  
- **Phenomena Detection:** Detect DI > 0.5 (interference), E(t) ≥ 0.8 (fields), and resonance patterns (cyclic energy or correlated model outputs).  
- **Frame Loop:** At 60fps, aggregate tokens within a frame window (~16.67 ms), compute aggregated energy metrics, emit event and clear buffer.  
- **Privacy Filter:** Strip raw text and probability lists; store only aggregated metrics and anonymized model identifiers.  
- **Tap Mechanism:** Provide instrumentation hooks for developers: e.g. emit unfiltered raw data to a local log file when debug mode is on (never to remote).  
- **Data Emission:** Use MessagePack encoding to minimize payload size; compress energy sequences if necessary (run-length or delta encoding).  
- **Replay & Audit:** Store energy events in WF ‑ TECH ‑ 004 state store; support replay at original cadence with optional slow/fast playback.

### 3. Implementation Details
- **Pipeline Stages:** Implement asynchronous pipeline stages: ingestion → normalization → energy calculation → frame builder → event emitter. Use Node.js streams or Python asyncio pipelines as reference implementations.  
- **Pseudocode Example:** Provide a simplified Node.js class (see `decipher.js`) that processes token events and emits energy frames.  
- **Multi‑Model Coordination:** Handle multiple token streams concurrently; assign model IDs; compute energy per stream and ensemble energy; detect interference via DI.  
- **EMA Smoothing:** Use an exponential moving average to smooth energy across frames; maintain per-model and ensemble EMA.  
- **Hardware Tier Config:** Adjust buffer sizes and smoothing constants: Low (16ms frame, 5‑token buffer), Mid (16ms, 10 tokens), High (16ms, 20 tokens).  
- **Error Handling:** If the queue overflows, drop lowest-priority tokens; if processing exceeds the frame budget, emit last known energy and log a warning.  
- **Debugging & Telemetry:** Expose debug metrics (queue depth, processing time per stage, energy variance) for performance tuning.

### 4. Integration Points
- **Model Compute (L2):** Expose a streaming API for tokens; support both synchronous and asynchronous backends; handle reconnection and token reordering gracefully.  
- **Contracts & Transport (L4):** Emit events via WebSocket channels (`/ws/energy`, `/ws/experience`). Conform to WF ‑ TECH ‑ 003 message schemas.  
- **State Management (WF ‑ TECH ‑ 004):** Persist energy_frame events; provide retrieval API for replay and analytics.  
- **Core Algorithms (WF ‑ TECH ‑ 008):** Provide energy data to Council, Adaptation and Resonance algorithms; implement detection thresholds and output classification.  
- **UX Integration:** Level 3 and up will listen for Decipher events to drive advanced visualisations; Level 2 uses DI for interference rendering.

### 5. Validation & Metrics
- **Unit Tests:** Validate energy calculation accuracy for known input sequences; test state machine transitions; ensure privacy filter removes raw tokens.  
- **Frame Profiling:** Ensure every processing cycle stays below 16.67 ms on mid‑tier hardware; log average and max times.  
- **Event Fidelity:** Compare energy_frame outputs with expected energy values; verify DI classification thresholds.  
- **Backpressure Simulation:** Simulate token bursts; ensure tokens are buffered and frames emitted without lag; measure drop rates and use triggers to throttle models.  
- **Interference & Resonance Detection:** Use synthetic multi-model streams to test detection of interference and resonance; verify correct classification of states.

## 🎨 Required Deliverables
- **Document:** This full specification plus a summary.  
- **Diagram:** Flow diagram of Decipher’s pipeline.  
- **Schema:** JSON schema for emitted events.  
- **Code:** Reference implementation skeleton for the energy compiler.  
- **Tests:** Test specification verifying energy conversion, frame timing, phenomena detection.  
- **Changelog:** Versioned change log.

## ✅ Quality Validation Criteria
- Implementation adheres to formulas and rules defined in WF ‑ FND ‑ 002.  
- Frame loop consistently meets the 16.67 ms deadline.  
- Phenomena detection thresholds are configurable and tested.  
- Privacy filter prevents raw text or sensitive data leakage.  
- Event schema passes JSON schema validation.  
- Documentation links all glossary terms properly.

## 🔄 Post-Generation Protocol
- Update WF ‑ FND ‑ 006 with new terms (e.g. “Decipher”, “energy_frame”).  
- Increment version to 1.0.0 in the changelog.  
- Notify dependent documents (WF ‑ TECH ‑ 001, WF ‑ TECH ‑ 004, WF ‑ TECH ‑ 008, WF ‑ UX ‑ 003) for integration.

