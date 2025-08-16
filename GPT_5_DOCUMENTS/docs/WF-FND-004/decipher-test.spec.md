# WF ‑ FND ‑ 004 Decipher Test Specification

## Purpose
Verify that the Decipher component meets performance, correctness, privacy and detection requirements as defined in WF ‑ FND ‑ 004.

## Test Categories

### 1. Energy Calculation Accuracy
- **Test Name:** Basic Energy Frame  
  - **Input:** Sequence of token events (5 tokens) with known TPS, probabilities, and Δt.  
  - **Expected:** Aggregated energy matches calculation via WF ‑ FND ‑ 002 formulas; DI null if not provided.  

- **Test Name:** DI Propagation  
  - **Input:** Token events with DI values [0.1, 0.2, 0.9, 0.5] across a frame.  
  - **Expected:** energy_frame.di = average DI (0.425).  

### 2. Real‑Time Performance
- **Test Name:** Frame Time Constraint  
  - **Input:** 100 consecutive frames with moderate token volume (10 tokens/frame).  
  - **Expected:** No frame processing exceeds 16.67 ms on mid-tier hardware.  

- **Test Name:** Backpressure Simulation  
  - **Input:** 50 tokens arriving within a single frame window.  
  - **Expected:** Tokens buffered and processed across subsequent frames; no overflow logs; energy frames still emitted at 60fps.  

### 3. Phenomena Detection
- **Test Name:** Interference Event  
  - **Input:** Frame with average DI > 0.6.  
  - **Expected:** An experience_event with `eventType="interference"` emitted.  

- **Test Name:** Field Event  
  - **Input:** Frame with energy ≥ 0.8 but < 0.95.  
  - **Expected:** `eventType="field"`.  

- **Test Name:** Resonance Event  
  - **Input:** Frame with energy ≥ 0.95.  
  - **Expected:** `eventType="resonance"`.  

### 4. Privacy & Filtering
- **Test Name:** No Raw Tokens in Events  
  - **Input:** Token events containing raw text or probability arrays.  
  - **Expected:** Emitted events omit raw text and probability arrays; only aggregated metrics are included.  

### 5. Schema Compliance
- **Test Name:** Energy Event Schema Validation  
  - **Input:** Emitted energy_frame messages decoded from MsgPack.  
  - **Expected:** Messages validate against `event-schema.json`.  

- **Test Name:** Experience Event Schema Validation  
  - **Input:** Emitted experience_event messages.  
  - **Expected:** Messages validate against the schema.  

### 6. Disposal & Cleanup
- **Test Name:** Resource Cleanup  
  - **Action:** Call `dispose()` on Decipher instance.  
  - **Expected:** Frame loop stops; no residual memory or token processing; event emitter unsubscribed.

---

*This specification ensures that the Decipher engine conforms to WIRTHFORGE’s strict performance, correctness and privacy guarantees.*

