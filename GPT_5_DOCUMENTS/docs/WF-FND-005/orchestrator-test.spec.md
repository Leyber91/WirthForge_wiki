# WF ‑ FND ‑ 005 Orchestrator Test Specification

## Purpose
Validate the Orchestrator’s scheduling logic, council algorithm, level gating, emergent detection and fairness across multiple models.

## Test Cases

### 1. Council Formation
- **Test Name:** Level 2 Council Size  
  - **Input:** setLevel(2); startCouncil([M1, M2, M3])  
  - **Expected:** Council uses exactly 2 models; scheduler rotates between them.

### 2. Scheduling & Fairness
- **Test Name:** Round-Robin Scheduling  
  - **Input:** 3 models with equal readiness; each call to scheduler should generate tokens from different model.  
  - **Expected:** Models receive equal scheduling time slices within margin ±1 token.

### 3. Consensus Decision
- **Test Name:** High DI Interference  
  - **Input:** energy_frame events with di=0.7, energy=0.5 repeated over 5 frames.  
  - **Expected:** `councilInterference` emitted; orchestrator may pause models or ask for user intervention.

- **Test Name:** Low DI Consensus  
  - **Input:** energy_frame events with di=0.2, energy=0.5.  
  - **Expected:** `councilConsensus` emitted; no interference events triggered.

### 4. Level Gating
- **Test Name:** Level Transition  
  - **Input:** setLevel(2); verify council size; then setLevel(4).  
  - **Expected:** Council size increases to defined config (e.g. 4); adaptive features enabled.

### 5. Emergent Detection
- **Test Name:** Resonance Detection  
  - **Input:** energy_frame energies ≥0.96 across 10 frames.  
  - **Expected:** `experience_event` with `eventType="resonance"`.  

- **Test Name:** Field Detection  
  - **Input:** energy_frame energies between 0.80 and 0.90 across 10 frames.  
  - **Expected:** `experience_event` with `eventType="field"`.  

### 6. Path Tuning
- **Test Name:** Path Weight Adjustment  
  - **Input:** Initialize orchestrator with path="Scholar"; verify model weights reflect Scholar path config.  
  - **Expected:** VelocityWeight=0.4, CertaintyWeight=0.4, FrictionWeight=0.2 (or current config).

### 7. Model Limits & Hardware Tiers
- **Test Name:** Low Tier Model Limit  
  - **Input:** low-tier config with modelLimits.lowTier=2; startCouncil with 3 models.  
  - **Expected:** Only 2 models started; third is ignored with a warning.

### 8. Disposal
- **Test Name:** Clean Shutdown  
  - **Action:** Call `dispose()` after starting council.  
  - **Expected:** Scheduler stops; no further tokens or events processed; detection window cleared.

---

*This test suite ensures that the orchestrator is fair, responsive, and compliant with WIRTHFORGE’s emergent, local-first architecture.*

