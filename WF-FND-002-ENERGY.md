---
id: WF-FND-002
title: Energy Metaphor – Definition & State Machine
status: Draft
owners: [architecture, product]
last_review: 2025-08-09
audience: [engineering, design, research]
outcomes:
  - Define a formal “energy” metric that unifies LLM timing and probability signals.
  - Establish invariants and a state machine for modelling energy over a session.
  - Map energy to OpenTelemetry instruments and WVMP keys for implementation.
decisions:
  - Adopt a normalized energy formula combining token cadence, probability mass and disagreement.
  - Use a five‑state energy machine (charging, stable, surging, draining, drained) with defined thresholds.
  - Instrument energy metrics via OpenTelemetry gauges, counters and histograms.
open_questions:
  - What default weights should be applied to cadence, probability and disagreement when computing energy?
  - How should energy budgets scale across different model sizes and hardware profiles?
risks:
  - Over‑fitting the energy formula could mislead users about actual performance.
  - Failing to clearly explain the metaphor may create confusion about scientific claims.
---

# Energy Metaphor: Definition & State Machine

## 0) Why “Energy”?

In WIRTHFORGE, *energy* is a unifying metaphor that ties together multiple low‑level signals emitted by a local language model—token generation speed, probability distributions and multi‑model disagreement—into a single intuitive quantity.  Much like electrical potential in an oscilloscope reveals hidden waveforms, our energy metric exposes where computation is building, surging or waning.  Without a formal definition, the “energy” of a stream risks becoming hand‑wavy.  This document defines how energy is calculated, how it behaves over time and how to instrument it.

## 1) Formal definition

An LLM call produces a sequence of tokens.  Let:

* **Inter‑arrival time** \(\delta_t\) – the time between consecutive output tokens.  It is often described as *time per output token*【5979616342676†L1090-L1101】 and measured in seconds.
* **Token throughput** \(\tau\) – the reciprocal of average inter‑arrival time (tokens per second).  Higher throughput means faster responses【706943708142420†L88-L100】.
* **Probability distribution** \(p\) – the top‑\(k\) probability mass returned by the model for the next token.  Shannon entropy \(H(p)=-\sum p_i\log_2 p_i\) quantifies the uncertainty in this distribution【910292760224406†L236-L247】.
* **Disagreement index** \(\mathrm{DI}\) – a measure of divergence between parallel models’ output distributions (see FND‑001).  It is computed as the Jensen–Shannon divergence on top‑\(k\) distributions.

We normalise each signal to the range \([0,1]\) and combine them as follows:

\[\mathrm{Energy}_t = w_1\,\sigma(\tau_t)\; +\; w_2\,\sigma\big(1-H(p_t)/H_\text{max}\big)\; +\; w_3\,\sigma(\mathrm{DI}_t)\,,\]

where \(\sigma\) is a linear scaling function, \(H_\text{max}\) is the maximum entropy for the chosen \(k\) (e.g. \(\log_2 k\)), and \(w_1 + w_2 + w_3 =1\).  Higher throughput and concentrated probability mass raise energy; higher entropy or disagreement also add energy because they often precede bursts of computation.  When log‑probabilities are unavailable, the probability term is omitted and weights are re‑normalised.  Energy is recalculated for every generated token.

### Normalisation ranges

- **Cadence**: We normalise \(\tau\) by dividing by a configurable maximum expected throughput (e.g. 100 tokens/s).  Values above the maximum clamp to 1.
- **Entropy**: Entropy is normalised by the maximum entropy for \(k\) (\(\log_2 k\) bits).  Lower entropy indicates more confident predictions.
- **Disagreement**: DI already lives in \([0,1]\).  A value of 0 means identical distributions; 1 means maximal divergence.

### Energy budget & conservation

A session begins with an energy budget of 1.  Each token generates a non‑negative energy contribution \(\mathrm{Energy}_t\).  To make energy intuitive, we enforce the invariant

\[0 \le \sum_{t=1}^N \mathrm{Energy}_t \le 1\,,\]

where \(N\) is the number of tokens in the session.  The budget allows users to compare sessions of different lengths on equal footing.  If the energy budget is exhausted before a response finishes, subsequent tokens still appear but no longer increase the gauge; this encourages prompt designers to consider efficiency.

## 2) State machine

Energy evolves through five qualitative states:

1. **Charging** – Energy is climbing rapidly (\(\frac{\mathrm{d}}{\mathrm{d}t}\mathrm{Energy}_t \gt 0\) and above a *growth* threshold).  This corresponds to increasing throughput or narrowing probability distributions.
2. **Stable** – Energy fluctuates within ±10 % around a steady level.  Throughput and probability are consistent.
3. **Surging** – Energy spikes above 80 % of the remaining budget.  Surges often coincide with creative leaps or high disagreement between models.  Visuals should accentuate these moments.
4. **Draining** – Energy decreases (\(\frac{\mathrm{d}}{\mathrm{d}t}\mathrm{Energy}_t \lt 0\)) and drops below a *decay* threshold.  Throughput slows, entropy rises, or disagreement falls.
5. **Drained** – Energy budget is exhausted (sum of energy contributions reaches 1).  The session enters a cool‑down phase; no further energy is accumulated.

Transitions are deterministic: energy enters *charging* at the start, moves to *stable* once growth slows, jumps to *surging* when it crosses the surge threshold, and eventually decays into *draining* and *drained*.  The state machine ensures conservation of energy and provides clear cues for visual feedback.

## 3) Instrumentation & metrics

We instrument energy using OpenTelemetry (OTel).  OTel defines several metric instruments—counters, gauges, and histograms.  A **counter** accumulates a value that only ever goes up【113281203068911†L736-L738】; a **gauge** measures the current value at read time【113281203068911†L747-L749】; a **histogram** aggregates distributions of measurements such as request latencies【113281203068911†L752-L754】.

### Instruments

| Metric (name) | OTel instrument | Unit | Description |
|---|---|---|---|
| `ai.energy.level` | Gauge | dimensionless | Current energy level (0–1).  Updated on each token. |
| `ai.energy.accumulated` | Counter | dimensionless | Cumulative energy consumed in the session.  The counter increases with every token and stops increasing when the budget is reached. |
| `ai.energy.surge_count` | Counter | count | Number of times the state machine entered the *surging* state. |
| `ai.token.cadence` | Histogram | s | Distribution of inter‑arrival times (time per output token)【5979616342676†L1090-L1101】. |
| `ai.token.ttft` | Histogram | s | Time to first token – the latency between sending a request and the first token【5979616342676†L1199-L1203】. |
| `gen_ai.client.token.usage` | Histogram | tokens | Number of input and output tokens used in an operation【5979616342676†L703-L725】. |

These metrics allow tooling to compare different models and sessions.  For example, high energy combined with high `ai.token.cadence` indicates a fast, confident model; low energy and high `ai.token.ttft` suggests a slow or struggling model.

## 4) Visual mapping

Energy drives the visuals defined in WF‑FND‑001:

* **Bolt thickness** – proportional to instantaneous energy; thicker bolts signify slower cadence and higher entropy, capturing the tension before a token emerges.
* **Flow velocity** – proportional to token throughput; faster energy results in faster flow animations.
* **Particle density** – proportional to the sum of the top‑\(k\) probabilities; more mass means denser particle clouds.
* **Color saturation** – mapped to the current state (charging → cool hues, stable → neutral, surging → warm, draining → fading).
* **Overlay gauges** – show the remaining energy budget as a progress bar; surges trigger flashes.

These mappings are implemented in the UI component library (see WF‑UX‑006) and parameterised so creators can adjust them without breaking the energy invariants.

## 5) Example

Consider a session generating three tokens with the following signals:

| Token \(t\) | Inter‑arrival (ms) | Normalised throughput \(\sigma(\tau)\) | Top‑5 probability sum \(\sum p\) | Entropy \(H\) (bits) | Normalised entropy \(\sigma(1- H/\log_2 5)\) | DI | Energy contribution |
|---|---|---|---|---|---|---|---|
| 1 | 200 ms | 0.20 | 0.60 | 1.5 | 0.58 | 0.10 | 0.20×0.5 + 0.58×0.3 + 0.10×0.2 = 0.26 |
| 2 | 80 ms | 0.50 | 0.45 | 2.0 | 0.36 | 0.20 | 0.50×0.5 + 0.36×0.3 + 0.20×0.2 = 0.41 |
| 3 | 120 ms | 0.33 | 0.75 | 1.2 | 0.71 | 0.05 | 0.33×0.5 + 0.71×0.3 + 0.05×0.2 = 0.42 |

The cumulative energy after three tokens is \(0.26+0.41+0.42=1.09\), which exceeds the budget (1).  The session enters the *drained* state after the third token; the remaining 0.09 is truncated.  Visuals should show a rapid surge followed by a cool‑down.

## 6) Relationship to other documents

* **WF‑FND‑001 Manifesto** – The energy metaphor operationalises the “oscilloscope for AI thought” by attaching quantitative meaning to lightning, flows and interference.
* **WF‑FND‑003 The Decipher** – The compiler collects timing and probability data from backends and feeds it into the energy calculation pipeline.
* **WF‑TECH‑005 Energy State Management** – Provides implementation details for managing energy state across services.
* **WF‑UX‑010 Energy Visualization Specs** – Builds UI components that reflect energy states and transitions.

## 7) Open questions and future work

* **Weight calibration** – The default weights \(w_1, w_2, w_3\) are subject to experimentation.  User‑configurable presets should be available.
* **Cross‑session comparison** – Should energy budgets scale with prompt length or remain constant?  A proportional budget may better reflect longer conversations.
* **Integration with other metrics** – Upcoming OpenTelemetry generative AI conventions include counts of billable tokens and explicit bucket boundaries for time per token【5979616342676†L1090-L1101】; we may incorporate these into the energy formula.
* **Entropy vs. probability sum** – We currently normalise entropy and the sum of top‑\(k\) probabilities separately.  Could we derive energy directly from cross entropy with target distributions?  This will require further research.

---

By defining a concrete energy metric grounded in widely understood concepts—throughput, entropy and divergence—and instrumenting it with standard observability tools, WIRTHFORGE keeps its promise: the visuals are honest because they are anchored in measurements【706943708142420†L88-L100】【5979616342676†L703-L725】.