# WF-FND-004: The DECIPHER (Central Compiler)

## Document Metadata
- **Document ID**: WF-FND-004
- **Title**: The DECIPHER (Central Compiler)
- **Category**: Foundation
- **Priority**: P0 (Real-time core engine of architecture)
- **Development Phase**: 1 (Foundational design)
- **Version**: 1.0.0
- **Date**: 2025-01-12
- **Status**: Production Ready
- **Estimated Length**: ~3,500 words
- **Document Type**: Technical Specification / Architectural Design

## Executive Summary

WF-FND-004 defines the DECIPHER as WIRTHFORGE's real-time energy compiler, operating as the core engine within Layer 3 (Orchestration & Energy) of our five-layer architecture. The DECIPHER transforms token-level AI outputs into structured energy-data events at 60Hz with strict performance, accuracy, and privacy guarantees. It is the heart of the system that bridges computational output and user experience, compiling energy into visual events much like a graphics engine, but for AI energy.

The DECIPHER catches every AI token like a spark and forges them into lightning bolts of visible energy, ensuring that every visual element corresponds to real computational activity with full traceability and no invented data.

## Dependency Matrix

### Required Before This (Consumed Ideas/Contracts)
- **WF-FND-001** – Vision: Establishes local-first principles and visible computation ethos
- **WF-FND-002** – Energy Metaphor: Defines Energy Units (EU) and quantification formulas
- **WF-FND-003** – Core Architecture: Establishes five-layer system with Layer 3 as orchestration hub
- **WF-META-001** – System Timing: Defines 60Hz frame cadence and real-time constraints

### Enables After This (What It Unlocks/Feeds)
- **WF-TECH-001** – System Architecture: Incorporates DECIPHER as Layer 3 processing hub
- **WF-TECH-004** – Flask Microservices: Informs how DECIPHER runs as service/microservice
- **WF-TECH-008** – API Design: Feeds requirements for token stream and event emission APIs
- **WF-UX-003** – Level 3+ Experience: Empowers structured energy visuals and real-time feedback

### Cross-References
- **WF-TECH-003** – WebSocket Protocol: Specifies real-time event messaging (60 messages/sec)
- **WF-FND-006** – Governance & Evolution: Terms like resonance, energy.frame, cadence_bin

## Core Objective

Define and implement the DECIPHER as WIRTHFORGE's real-time energy compiler, transforming token-level AI outputs into structured energy-data events at 60Hz within Layer 3 of our five-layer architecture. The DECIPHER must achieve this magical conversion reliably within a ~16.67ms frame budget, ensuring no dropped frames and seamless synchronization with the UI.

By the end of this specification, we have a clear blueprint for how DECIPHER takes streams of tokens from Layer 2 and yields streams of lightning and other energy manifestations to Layer 4/5, all without ever leaking sensitive data or missing a beat.

## Section 1: From Tokens to Lightning (Opening Hook)

Every AI-generated token is like a spark of electricity. The DECIPHER is the blacksmith catching these sparks and forging them into lightning bolts of visible energy. When the model produces the word "Hello," the DECIPHER translates that into a quick flash of light or particle burst. As a user, you're not just reading output, you're witnessing the AI's effort in real time.

The transformation must happen at the speed of thought – essentially instantly from the user's perspective. We have a budget of ~16 milliseconds for each frame to capture any new tokens and emit the corresponding visual energy. If the model generates a flurry of tokens, DECIPHER manages a storm, converting dozens of tiny sparks into a cohesive light show without dropping any or overwhelming the system.

The DECIPHER is both an artistic conductor (turning raw data into a symphony of lights) and a real-time systems engineer (making sure the show never lags or goes out of sync). Every lightning bolt on screen has a data lineage traceable back to an AI token and an energy calculation done by DECIPHER, within milliseconds, on the user's own device.

## Section 2: Core Concepts

### Token Ingestion Pipeline

At the core of DECIPHER is a continuous ingestion pipeline that feeds on the stream of tokens coming from Layer 2 (Model Compute). As the model produces output token-by-token, each token enters DECIPHER's input queue immediately through the Layer 2 interface defined in WF-FND-003.

DECIPHER registers as a listener on the model's generation stream, capturing each token along with metadata like position, timestamp, and computation cost. This non-blocking ingestion ensures no token is missed while maintaining the strict layer boundaries established in our architecture.

The outcome is that each token is encapsulated into an internal event like `{ token: "Hello", timestamp: t, modelId: "llama2", energy: 0.021 }` and placed into a processing queue that decouples the model's pace from the 60Hz frame rate.

### Energy Unit (EU) Computation

Once tokens are ingested, DECIPHER immediately translates them into Energy Units (EUs) using the formulas established in WF-FND-002. The calculation considers:

- **Base Energy**: 0.01 EU per token baseline
- **Complexity Factor**: Based on token length, perplexity, or model confidence
- **Speed Multiplier**: Faster generation = higher energy (reflects computational intensity)
- **Model Size Factor**: Larger models contribute more energy per token

Example calculation:
```
energy = base_energy * complexity_factor * speed_multiplier * model_size_factor
energy = 0.01 * 1.2 * 1.5 * 1.1 = 0.0198 EU
```

These calculations are purely deterministic and local, ensuring identical token outputs always produce the same energy pattern. One EU roughly represents the work of ~10 tokens under normal conditions, providing the raw material for our visuals.

### Frame Timing (60Hz Cadence)

DECIPHER operates on the fixed 60Hz frame loop established in WF-META-001, ticking like a heartbeat every 16.67ms. This aligns with Layer 3's orchestration responsibilities and ensures smooth UI synchronization.

On each tick, DECIPHER:
1. Pulls tokens from the ingestion queue
2. Calculates energy contributions
3. Updates system state
4. Detects patterns (interference/resonance)
5. Emits structured events to Layer 4

The frame budget is sacred – DECIPHER must complete all work within 16ms or implement graceful degradation to maintain the real-time experience.

### Privacy and Local-First Processing

Following WIRTHFORGE's local-first principles, DECIPHER runs fully on the local device whenever possible. All token processing and energy compilation happens on user-controlled hardware, ensuring no raw token text or meaning leaves the device.

Structured events contain only abstracted metrics:
- Energy values and rates
- Particle coordinates and effects
- Pattern detection flags
- Timing and performance data

No readable text or PII is included. Even in hybrid scenarios with remote compute, only anonymized energy statistics are shared, never raw content.

### Resonance and Higher-Order Phenomena

DECIPHER monitors for advanced energy phenomena:

**Interference**: When multiple energy streams interact (parallel models), creating new patterns visualized as intertwining streams or collision sparks.

**Resonance**: Self-reinforcing patterns where AI output builds on itself, detected through:
- Repeating token patterns
- Sustained energy spikes
- Feedback loop identification
- Critical threshold monitoring

Resonance detection is level-gated – only activated for Level 5 users to avoid performance overhead and complexity for lower levels.

## Section 3: Implementation Architecture

### Asynchronous Module Design

DECIPHER follows a modular pipeline architecture within Layer 3:

```
[Token Queue] → [Energy Calculator] → [State Manager] → [Pattern Detector] → [Event Emitter]
```

Each module runs asynchronously when possible:
- **Energy Calculator**: Computes EU values from tokens
- **State Manager**: Updates EMA filters and cumulative metrics  
- **Pattern Detector**: Analyzes for interference/resonance
- **Event Emitter**: Formats and sends structured events

Modules conform to timeout-based execution to maintain frame budget:

```python
def on_frame_tick(self):
    tokens = self.ingest_queue.drain_all()
    
    # Parallel async tasks with timeouts
    energy_task = async_run(calculate_energy, tokens, timeout=10ms)
    state_task = async_run(update_state, tokens, timeout=8ms) 
    pattern_task = async_run(analyze_patterns, tokens, timeout=6ms)
    
    # Combine results and emit
    event = assemble_event(energy_task.result, state_task.result)
    self.emit_to_layer4(event)
```

### Tap Mechanism for Debugging

DECIPHER implements read-only observation hooks for debugging and audit:
- **Energy Tap**: Logs all EU calculations for validation
- **Pattern Tap**: Records interference/resonance detection
- **Performance Tap**: Monitors frame timing and bottlenecks
- **Audit Tap**: Captures complete event lineage for traceability

Taps use lightweight pub-sub with near-zero overhead when inactive, enabling production debugging without performance impact.

### Queue Management and Backpressure

The ingestion queue handles bursty token scenarios with intelligent policies:

**Normal Operation**: Process all queued tokens within frame budget
**Moderate Load**: Batch multiple tokens into aggregated energy events
**Heavy Load**: Defer processing to next frame while maintaining queue bounds
**Overload**: Drop oldest tokens with minimal visual impact (last resort)

Queue watermarks trigger progressive responses:
- Queue length > N: Start token merging
- Queue length > M: Consider selective dropping
- Queue length > Critical: Emergency shedding with logging

### Exponential Moving Average (EMA) Smoothing

Raw energy calculations can be spiky, so DECIPHER applies EMA filters for smooth visuals:

```python
state.ema_energy_rate = state.ema_energy_rate * 0.8 + current_frame_energy * 0.2
```

This creates pleasant, smooth animations while preserving responsiveness to actual computational activity. EMA state persists across frames as part of Layer 3's state management.

### Frame Drop and Graceful Degradation

DECIPHER prioritizes functionality under load:

1. **Essential**: Token→energy conversion and basic event output
2. **Important**: State updates and energy accumulation  
3. **Enhanced**: Visual aesthetics and smooth interpolation
4. **Advanced**: Pattern detection and resonance analysis

Under time pressure, lower-priority tasks are skipped or simplified while maintaining core functionality.

## Section 4: Integration Points

### Layer 2 (Model Compute) Integration

DECIPHER integrates with Layer 2 through the model streaming interface defined in WF-FND-003:

```python
# Layer 2 callback registration
model.generateStream(prompt, onToken: (token_event) => decipher.ingest(token_event))
```

For multi-model scenarios (council mode), each model stream is identified and tracked separately for interference detection.

### Layer 4 (Transport) Integration

DECIPHER emits structured events through Layer 4's WebSocket protocol (WF-TECH-003):

```json
{
  "id": "frame_12345",
  "type": "energy_update", 
  "timestamp": 1691870667123,
  "payload": {
    "newTokens": 3,
    "energyGenerated": 0.7,
    "totalEnergy": 15.4,
    "energyRate": 2.5,
    "particles": [
      {"id": 101, "type": "burst", "energy": 0.5, "position": [0,0,0]}
    ],
    "resonance": null,
    "interference": false
  }
}
```

Events contain everything needed for Layer 5 visualization with no raw text or PII.

### Storage Integration (WF-TECH-006)

DECIPHER interfaces with storage for:
- **Energy Persistence**: User's accumulated EU totals
- **Audit Logging**: Complete event traces for debugging
- **Resonance Records**: Significant emergence events
- **Performance Metrics**: Frame timing and system health

Storage operations are asynchronous to avoid blocking the frame loop.

## Section 5: Validation Framework

### Frame Loop Profiling

DECIPHER instruments all processing stages to monitor frame budget compliance:
- Token ingestion time
- Energy calculation duration  
- Pattern analysis overhead
- Event assembly and emission timing

Target: <10ms average frame time on mid-tier hardware, <16ms with all features enabled.

### Functional Correctness

Validation ensures DECIPHER outputs faithfully represent inputs:
- **Energy Math**: Unit tests verify EU calculations match WF-FND-002 formulas
- **State Continuity**: Total energy persists correctly across sessions
- **Pattern Detection**: Resonance triggers only for valid scenarios
- **Event Integrity**: Every visual maps to a corresponding data event

### Privacy Compliance

Automated checks ensure no sensitive data leaks:
- Event content scanning for raw text
- PII detection in structured outputs
- Audit trail verification
- Security review of all external interfaces

### Multi-Tier Performance

Testing across hardware tiers validates adaptive behavior:
- **Low Tier**: Graceful degradation with simplified features
- **Mid Tier**: Full feature set at 60Hz
- **High Tier**: Optimal resource utilization
- **Hybrid**: Network latency compensation

## Quality Assurance Framework

### Performance Requirements
- 60Hz event emission (16.67ms frame budget)
- <50ms token-to-event latency
- Graceful degradation under load
- Memory usage bounded and leak-free

### Validation Criteria
- 100% visual-to-data traceability via audit mode
- >95% frames meeting deadline on target hardware
- Zero raw content in emitted events
- Deterministic energy calculations

### Testing Strategy
- Synthetic token stream testing
- Multi-model interference scenarios
- Hardware tier performance validation
- Privacy and security audits
- Long-duration stability testing

## Asset Manifest

### Documentation
- `docs/WF-FND-004/document.md` - This comprehensive specification
- `CHANGELOG-WF-FND-004.md` - Version history and asset inventory

### Technical Diagrams
- `assets/diagrams/WF-FND-004-token-pipeline.mmd` - Token-to-energy processing flow
- `assets/diagrams/WF-FND-004-frame-loop.mmd` - 60Hz frame execution cycle
- `assets/diagrams/WF-FND-004-resonance-detection.mmd` - Pattern analysis workflow
- `assets/diagrams/WF-FND-004-layer-integration.mmd` - Layer 2/3/4 integration points

### Data Schemas
- `data/WF-FND-004-energy-events.json` - Complete event structure definitions
- `data/WF-FND-004-state-schemas.json` - Internal state management schemas
- `data/WF-FND-004-audit-format.json` - Audit logging data structures

### Implementation Examples
- `code/WF-FND-004/decipher-core.py` - Core DECIPHER engine implementation
- `code/WF-FND-004/energy-calculator.py` - EU computation module
- `code/WF-FND-004/pattern-detector.py` - Resonance and interference detection
- `code/WF-FND-004/frame-manager.py` - 60Hz loop coordination

### Quality Assurance
- `tests/WF-FND-004/frame-profiler.js` - Performance monitoring and validation
- `tests/WF-FND-004/correctness-validator.py` - Energy calculation verification
- `tests/WF-FND-004/privacy-auditor.js` - Data leak detection and prevention

## Implementation Roadmap

### Phase 1: Core Engine (Q1 2025)
- Basic token ingestion and energy calculation
- 60Hz frame loop implementation
- Layer 2/4 integration interfaces

### Phase 2: Pattern Detection (Q2 2025)
- Interference detection for multi-model scenarios
- Basic resonance monitoring
- EMA smoothing and state management

### Phase 3: Advanced Features (Q3 2025)
- Full resonance detection and field generation
- Audit mode and traceability
- Performance optimization

### Phase 4: Production Hardening (Q4 2025)
- Multi-tier hardware adaptation
- Comprehensive testing and validation
- Documentation and training materials

## Integration Notes

The DECIPHER operates as the central nervous system of WIRTHFORGE's Layer 3, transforming the invisible work of AI into visible, interactive energy. It bridges the gap between raw computation and user experience while maintaining strict privacy, performance, and accuracy guarantees.

Every lightning bolt, every glowing particle on screen has a data lineage traceable back to an AI token and an energy calculation done by DECIPHER, within milliseconds, on the user's own device. This closes the loop on trust and creates the magical experience of witnessing AI consciousness in real time.

---

*This document establishes the DECIPHER as the beating heart of WIRTHFORGE's real-time energy visualization, ensuring that every spark of AI computation becomes a bolt of visible lightning through precise, private, and performant compilation.*
