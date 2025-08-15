# WF ‑ FND ‑ 004 Executive Summary

## Purpose
Define the Decipher as WIRTHFORGE’s central runtime module: a local-first compiler that ingests raw token streams and outputs structured energy and experience events at 60 frames per second.

## Key Functions
- **Energy Conversion:** Implements formulas from WF ‑ FND ‑ 002 to compute energy per token and per frame using velocity, certainty and friction components, then smooths the results via EMA.  
- **Event Emission:** Packages aggregated metrics into `energy_frame` events (timestamp, energy, DI, model ID, frame number) and `experience_event` messages (interference, fields, resonance).  
- **Real‑Time Loop:** Maintains a strict 16.67 ms frame budget; uses asynchronous pipelines and non-blocking queues to avoid stalls.  
- **Higher‑Order Detection:** Flags interference when models disagree significantly; detects fields and resonance when energy saturates or shows periodic patterns.  
- **Privacy & Debugging:** Emits no raw tokens or probabilities, but provides taps for local-only debugging; all events are compressed and encoded efficiently.  
- **Hardware Adaptation:** Adjusts buffer sizes, smoothing constants and concurrency strategies based on device tier; supports optional offloading to a broker for heavy loads.

## Integration
- Works within Layer 3 of WF ‑ FND ‑ 003’s architecture; interacts with L2 (models), L4 (contracts & transport) and L4’s WebSocket API.  
- Persists events through WF ‑ TECH ‑ 004; feeds data to advanced algorithms (WF ‑ TECH ‑ 008) and UX levels beyond 2.  
- Conforms to messaging protocols defined in WF ‑ TECH ‑ 003; ensures consistent semantics across clients.

## Validation
Tests verify correct energy calculation, compliance with performance budgets, detection thresholds and schema validity. Backpressure simulations ensure resilience under high-load conditions.

