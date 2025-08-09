
---
id: WF-FND-002
title: Energy Metaphor — Complete Definition
status: Draft
owners: [architecture, product]
last_review: 2025-08-09
audience: [engineering, design, research, curriculum]
depends_on: [WF-FND-001]
enables: [WF-TECH-005, WF-UX-001, WF-UX-010, WF-TECH-013]
outcomes:
  - A precise, testable definition of “energy” for WIRTHFORGE visuals.
  - A deterministic state machine for session energy/flow.
  - Mappings from real signals → visuals (and to WVMP/OTel exports).
decisions:
  - Adopt WVMP v0.1 keys for token timing, top‑K probabilities, and DI.
  - Define Energy E(t) ∈ [0, 1] as a normalized, smoothed function of cadence, certainty, and stall.
  - Provide graceful‑degradation when top‑K probabilities are unavailable.
open_questions:
  - Validate default weights (w1, w2, w3) across small vs. large models.
  - Confirm DI default (Jensen–Shannon divergence, k=10) for L2+ visuals.
  - Collect field feedback to tune default thresholds for “stall” and “burst.”
risks:
  - Backend variance (logprobs cost/availability) → mitigate via capability detection.
  - Over‑interpretation of visuals → Evidence Mode shows metric+units on hover.
  - Performance on low‑spec machines → provide profiles and downshift rules.
---

# WF‑FND‑002 — Energy Metaphor: Definition & State Machine

WIRTHFORGE shows what actually happens inside local model computation, rendered faithfully as light and motion—**an oscilloscope for AI thought** (not a fantasy). This document pins down the “energy” metaphor so every visual has a **1:1 mapping to measured signals**. :contentReference[oaicite:1]{index=1}

> **Scope.** Applies to single‑model (L1), parallel models (L2+), session replay, and exports.

---

## 1) Signals we measure (ground truth)

From local streaming backends (e.g., Ollama), per output token **t** we record:

- **Inter‑arrival time** `Δt_t` in milliseconds (ms) — time between token t−1 and t.  
- **Tokens per second** `TPS_t` — over a sliding time window W (default 1 s).  
- **Top‑K probabilities** `P_t = { (tok_i, p_i) }_{i=1..K }` if available.  
- **Model disagreement (L2+)** `DI_t` — divergence between models’ top‑K distributions (see §4.3).  
- **Lifecycle events** `start`, `end`, `stall`, `burst`.

> **Local‑first constraint.** All signals are captured from **your** machine; the web UI only renders them. :contentReference[oaicite:2]{index=2}

---

## 2) The Energy function E(t)

We define **Energy** as a normalized, smoothed scalar in **[0, 1]** that reflects how *confident, fast, and un‑stalled* the current generative process is.

### 2.1 Components (per token t)

1. **Velocity** (cadence):  
   - Windowed tokens/second `TPS_t`.  
   - Normalize to `[0,1]` by min/max clamping:  
     `v_t = clamp((TPS_t - TPS_min) / (TPS_max - TPS_min), 0, 1)`  
     Defaults: `TPS_min=0`, `TPS_max=20` (adjusted per profile).

2. **Certainty** (when top‑K available):  
   - Shannon entropy over top‑K `H(P_t) = -Σ p_i log p_i`.  
   - Max entropy `H_max = log K`.  
   - Convert to certainty (higher is more concentrated):  
     `c_t = 1 - (H(P_t) / H_max)` ∈ [0,1].  
   - If top‑K not available: set `c_t = ⌀` (missing).

3. **Friction** (stall pressure):  
   - Normalize inter‑arrival:  
     `s_t = clamp((Δt_t - Stall_ms) / (Ceil_ms - Stall_ms), 0, 1)`  
     where defaults: `Stall_ms = 400 ms`, `Ceil_ms = 1500 ms`.  
   - Use **anti‑contribution** `f_t = 1 - s_t` (higher is better).

### 2.2 Base energy and smoothing

Let weights `w1, w2, w3` sum to 1.

- If certainty is present:  
  `E_base(t) = w1·v_t + w2·c_t + w3·f_t` with defaults `w1=0.5, w2=0.3, w3=0.2`.

- If certainty missing (no logprobs):  
  `E_base(t) = w1'·v_t + w3'·f_t` with defaults `w1'=0.7, w3'=0.3`.

Smooth with EMA to avoid flicker:  
`E(t) = α·E_base(t) + (1−α)·E(t−1)`, default `α = 0.35`.

**Invariants**
- E(t) ∈ [0, 1] always.  
- If tokens stop (and session open), E(t) decays toward 0 with half‑life `HL_ms` (default 700 ms).  
- With sustained stalls, E(t) → 0; with sustained fast confident flow, E(t) → 1.

---

## 3) Session Energy State Machine

```

\[IDLE]
└─(prompt submitted)→ \[CHARGING]
\[CHARGING]
├─(first token within TFFTx)→ \[FLOWING]
└─(timeout)→ \[IDLE]
\[FLOWING]
├─(Δt\_t > Stall\_ms for N tokens)→ \[STALLING]
├─(E(t) ≥ 0.85 for D ms)→ \[SATURATED]
└─(stream end)→ \[DRAINED]
\[STALLING]
├─(Δt\_t ≤ Stall\_ms)→ \[FLOWING]
└─(stream end)→ \[DRAINED]
\[SATURATED]
├─(E(t) < 0.7)→ \[FLOWING]
└─(stream end)→ \[DRAINED]
\[DRAINED]
└─(new prompt)→ \[CHARGING]

````

**Recommended thresholds (defaults)**  
- `TFFTx` (time‑to‑first‑token): 500–1500 ms profile‑dependent  
- `Stall_ms = 400 ms`, `N = 2` consecutive tokens  
- `D = 800 ms` (saturation dwell)

---

## 4) Visual grammar mapping (Energy‑first)

| Visual element             | Source metric (WVMP)         | Mapping (defaults)                                   |
|---                         |---                           |---                                                   |
| **Lightning thickness**    | `Δt_t`                       | Thicker = slower tokens (higher Δt).                 |
| **Flow speed**             | `TPS_t`                      | Faster = higher tokens/sec.                          |
| **Field intensity**        | `E(t)`                       | Brighter = higher energy (confidence + cadence).     |
| **Particle density**       | `P_t` / entropy              | Denser = more concentrated top‑K (higher certainty). |
| **Stall badge**            | `Δt_t > Stall_ms`            | Badge toggles per window.                            |
| **Burst badge**            | `TPS_t > Burst_tps`          | Defaults: burst when TPS > 12.                       |
| **Interference brightness**| `DI_t` (L2+)                 | Brighter = higher model disagreement.                |

> Evidence Mode: hover any element to reveal the **source metric + units**. :contentReference[oaicite:3]{index=3}

### 4.1 Multi‑model disagreement (L2+)
Let `P_t^A` and `P_t^B` be top‑K distributions for two models at token t.  
Default **DI** uses Jensen–Shannon divergence clipped to [0,1]:  
`DI_t = JSD(P_t^A || P_t^B)`  
If top‑K is missing, use timing variance proxy over a short window.

### 4.2 Ensemble energy (L5)
For M parallel models with per‑model `E_m(t)` and weights `γ_m` (default equal),  
`E_ensemble(t) = Σ γ_m E_m(t)` (clamped to [0,1]).  
Use `DI_t` as a modulation to render resonance/interference.

---

## 5) WVMP v0.1 — trace schema (minimum)

```json
{
  "session_id": "wf-2025-08-09-0001",
  "models": [
    {
      "name": "llama3:8b-instruct",
      "backend": "ollama",
      "tokens": [
        { "t_ms": 0,    "token": "The",  "delta_ms": 118, "tps": 8.5,
          "topk": [{"t":"The","p":0.21}, {"t":"A","p":0.12}, {"t":"It","p":0.09}],
          "entropy": 1.31, "certainty": 0.56, "stall": false, "E": 0.62
        },
        { "t_ms": 118,  "token": " sun", "delta_ms": 96,  "tps": 10.4,
          "topk": [{"t":" sun","p":0.33}, {"t":" sky","p":0.12}, {"t":" moon","p":0.06}],
          "entropy": 1.12, "certainty": 0.64, "stall": false, "E": 0.71
        }
      ]
    }
  ],
  "derived": [{ "name": "DI_jsd", "by_token": [0.12, 0.19, ...] }],
  "meta": { "window_ms": 1000, "stall_ms": 400, "burst_tps": 12 }
}
````

**Key names (required):** `delta_ms`, `tps`, `topk` (optional), `entropy` (optional), `certainty` (optional), `E`.
**Events:** `start`, `end`, `stall`, `burst` (optional markers).

---

## 6) OpenTelemetry export (names & units)

* **Gauges**

  * `energy.level` (0–1) — current E(t)
  * `ai.token.tps` (tokens/sec)
  * `ai.token.inter_arrival_ms` (ms)
  * `ai.token.certainty` (0–1, optional)

* **Counters**

  * `energy.transfer_count` — number of rendered energy updates
  * `ai.safety.blocked` — safety rule blocks (if any)

* **Histograms**

  * `ai.token.latency_ms` — per‑token Δt distribution

All PII is stripped at the collector; WVMP trace IDs are linked to OTel spans for replay.

---

## 7) Degradation & capability detection

| Capability                    | Ollama (baseline) | llama.cpp (logits\_all) | vLLM (OpenAI‑compat logprobs) |
| ----------------------------- | ----------------- | ----------------------- | ----------------------------- |
| Cadence (Δt, TPS)             | ✅                 | ✅                       | ✅                             |
| Top‑K probabilities / entropy | ⚠️ varies         | ✅ (perf cost)           | ✅ (GPU recommended)           |
| DI via distributions          | ⚠️                | ✅                       | ✅                             |

When top‑K is missing, drop `c_t`, reweight E(t) (`w1'=0.7, w3'=0.3`), and use timing‑variance DI.

---

## 8) Defaults & profiles

* **Lite (CPU OK):** `TPS_max=10`, `Stall_ms=500`, `α=0.30`.
* **Dual (2 small/medium):** `TPS_max=14`, `Stall_ms=400`, `α=0.35`.
* **Studio (GPU):** `TPS_max=20`, `Stall_ms=350`, `α=0.40`, DI via distributions.

---

## 9) Reference algorithm (pseudocode)

```python
# Inputs per token t: delta_ms, tps, (optional) topk
# Persistent: E_prev (initial 0), params (weights, thresholds, alpha)

def certainty_from_topk(topk):
    if not topk: return None
    H = -sum(p * log(p) for (_, p) in topk)
    Hmax = log(len(topk))
    return max(0.0, min(1.0, 1.0 - H/Hmax))

def energy_step(delta_ms, tps, topk, params, E_prev):
    v = clamp((tps - params.TPS_min) / (params.TPS_max - params.TPS_min), 0, 1)
    s = clamp((delta_ms - params.Stall_ms) / (params.Ceil_ms - params.Stall_ms), 0, 1)
    f = 1.0 - s
    c = certainty_from_topk(topk)

    if c is not None:
        E_base = params.w1*v + params.w2*c + params.w3*f
    else:
        E_base = params.w1p*v + params.w3p*f

    E = params.alpha*E_base + (1-params.alpha)*E_prev
    return clamp(E, 0.0, 1.0)
```

> Evidence Mode must display `delta_ms`, `tps`, and either `certainty` (if available) or “certainty: n/a”.

---

## 10) Test plan (minimum)

* **Unit**:

  * E(t) bounds: never <0 or >1.
  * With `delta_ms → ∞`, E(t) → 0.
  * With high TPS and low entropy, E(t) → 1.
* **Golden traces**:

  * Short sessions with known tokens and synthetic top‑K → deterministic E(t).
* **Offline robustness**:

  * 24‑hour partitioned runs with merges preserve WVMP; replays match visuals.

---

## 11) What we don’t claim

* ❌ Energy is *not* “life force” or consciousness; it’s a **visual scalar** derived from cadence, certainty, and stalls.
* ✅ We visualize **real computation** from local models, nothing more.&#x20;

---

## 12) Glossary (keys used here)

* **Δt\_t**: inter‑arrival time of token t in ms.
* **TPS**: tokens per second over window W.
* **Entropy / Certainty**: top‑K concentration metric → `c_t ∈ [0,1]`.
* **E(t)**: energy at token t, `[0,1]`.
* **DI**: disagreement index across models (JSD default).

```

