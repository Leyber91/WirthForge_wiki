# WF ‑ FND ‑ 006 Governance Framework Test Specification

## Purpose
Verify that proposals comply with the governance schema, invariants, process states and metrics requirements.

## Test Categories

### 1. Schema Validation
- **Test Name:** Valid Proposal  
  - **Input:** Proposal with all required fields and valid status.  
  - **Expected:** `validateProposal()` returns valid = true.

- **Test Name:** Missing Required Field  
  - **Input:** Proposal missing `type` or `problemStatement`.  
  - **Expected:** `validateProposal()` returns valid = false and lists missing properties.

### 2. Invariant Checks
- **Test Name:** No Invariant Violation  
  - **Input:** Proposal solution that doesn’t mention any invariant.  
  - **Expected:** `checkInvariants()` returns empty array.

- **Test Name:** Invariant Mentioned  
  - **Input:** Proposal solution containing “allow docker by default”.  
  - **Expected:** `checkInvariants()` returns `['no_docker_by_default']`.

### 3. Metrics Requirements
- **Test Name:** Missing Metrics  
  - **Input:** Proposal metrics missing `latency` and `fairness`.  
  - **Expected:** `checkMetrics()` returns `['latency','fairness']`.

### 4. Process Transition Validation
- **Test Name:** Valid State Transition  
  - **Input:** current=‘Draft’, next=‘Comment’.  
  - **Expected:** `canTransition()` returns true.

- **Test Name:** Invalid State Transition  
  - **Input:** current=‘Comment’, next=‘Review’.  
  - **Expected:** `canTransition()` returns false.

### 5. Sample Process Execution
- **Scenario:** Submit a new feature proposal; run validations at each state transition: Draft→Comment→Submitted→Review→Trial→Audit→Voting→Accepted.  
  - **Expected:** All validations pass; state transitions are allowed; no invariants violated; required metrics provided.

---

*This test plan ensures that WIRTHFORGE’s governance process is adhered to in both structure and substance, protecting core principles while enabling evolution.*

