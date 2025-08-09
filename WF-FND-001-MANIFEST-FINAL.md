---
id: WF-FND-001
title: WIRTHFORGE Manifesto & Vision
status: Draft
owners: [product, architecture]
last_review: 2025-08-08
audience: [engineering, design, creators, educators]
outcomes:
  - Ship a truthful, distinctive vision that is implementable now.
  - Anchor visuals to measurable signals via the Wirthforge Visual Metrics Protocol (WVMP).
  - Focus the first release on a local‑first adoption wedge with graceful degradation across backends.
decisions:
  - Adopt WVMP v0.1 for one‑to‑one mapping between signals and visuals.
  - Introduce the Disagreement Index (DI) to visualise divergence between model outputs.
  - Provide clear performance profiles and remove open‑ended “lifetime” promises in favour of major‑version licences.
open_questions:
  - Confirm whether the initial adoption wedge should be an OBS overlay or a VS Code sidebar.
  - Finalise the default formulation and sliding window for the Disagreement Index (JS divergence vs. alternatives).
  - Determine the default CRDT backend if collaborative editing of sessions is introduced.
risks:
  - Log‑probability availability and performance vary across backends; we must degrade gracefully.
  - Over‑promising performance on low‑spec machines could erode trust; publish profiles instead of absolutes.
  - Misinterpretation of visuals as “mind reading” despite our honesty pledge; mitigate via Evidence Mode and clear messaging.
---

# WIRTHFORGE Manifesto & Vision

**See AI Think — For Real.**

## Why It Matters

Large language models generate text token by token. Each token has a timing, a probability mass and, when multiple models run in parallel, a measurable divergence. Today those signals are invisible to end users, making AI feel mystical and hard to debug. **WIRTHFORGE turns on the lights** and shows only what is really there—live, local and measurable.

## What WIRTHFORGE Really Is

WIRTHFORGE is an **oscilloscope for AI thought**. We render **live, local** token‑level signals—inter‑arrival times, probability mass and model disagreement—into **precise, art‑grade visuals** with a documented, one‑to‑one mapping. We are **not** an enterprise tracing dashboard or an attention‑map explainer; we are a truthful visual instrument for builders, creators and educators.

## Honesty First — WVMP & Evidence Mode

* **WVMP v0.1 (Wirthforge Visual Metrics Protocol)** ensures every visual element corresponds to a named metric with units. Raw traces can be exported for replay and analysis.
* **Evidence Mode:** hover on any element to reveal its source metric and units (e.g., `token.inter_arrival_ms`).
* **No mind claims:** we visualise computation, not consciousness or intent; reality is magical enough.

## Visual Grammar

| Visual element        | Metric (WVMP)                           | Default mapping                                       |
|----------------------|-----------------------------------------|-------------------------------------------------------|
| **Lightning thickness** | `token.inter_arrival_ms`                 | Thicker lines indicate slower token cadence           |
| **Flow speed**          | Rolling tokens per second                | Faster animations reflect higher token throughput     |
| **Particle density**    | Sum of top‑K probabilities or entropy    | Denser fields represent more concentrated probability |
| **Interference brightness** | **DI** (Disagreement Index)             | Brighter patterns show greater model divergence       |
| **Stall badges**        | P95 of `inter_arrival_ms` over a window | A badge appears when inter‑arrival exceeds threshold  |
| **Burst badges**        | Rolling tokens per second                | A badge appears when throughput exceeds threshold     |

The **Disagreement Index (DI)** measures divergence between models. By default it uses the Jensen–Shannon divergence over top‑K probability distributions for each token; if probabilities aren’t available, DI falls back to timing variance across models.

## The Five Levels — A Learning Journey

1. **Lightning (L1):** Single‑model cadence and stalls (always available).
2. **Parallel Streams (L2):** Two models running in parallel; DI visualised as interference.
3. **Structures (L3):** Persistent composer graphs route signals through visual operators; sessions can be replayed from WVMP.
4. **Fields (L4):** Adaptive visuals respond to entropy and DI patterns.
5. **Resonance (L5):** Conduct multi‑model “orchestras” for computational art.

## Technical Foundation

### Local‑First Architecture

Models run on **your** machine. All compute stays local; the web UI is a renderer only. Your prompts and outputs never leave your device unless you explicitly export them.

### Backend Matrix & Graceful Degradation

WIRTHFORGE automatically detects available capabilities from different backends and lights up features accordingly:

| Capability                                  | Ollama (baseline) | llama.cpp (`logits_all`) | vLLM (OpenAI‑compat `logprobs`) |
|---------------------------------------------|-------------------|--------------------------|---------------------------------|
| Token cadence (L1)                          | ✅                 | ✅                        | ✅                               |
| DI via timing variance                      | ✅                 | ✅                        | ✅                               |
| Top‑K probabilities (particles, entropy)    | ⚠️ varies          | ✅ for small/medium models | ✅ with suitable GPU             |
| DI via probability distributions            | ⚠️                 | ✅                        | ✅                               |

### Performance Profiles (Ranges, Not Absolutes)

- **Lite:** Single small model; cadence and stalls only. Suitable for CPUs with 8 GB RAM.
- **Dual:** Two small/medium models; DI uses timing; DI‑probabilities if supported. Moderate GPU recommended.
- **Studio:** One large and one small model; probability‑based visuals; GPU strongly recommended.

We publish the expected latency and frame rate for each profile rather than promising universal performance. For example, a single 7B model may achieve ~200 ms token latency; two parallel models may see ~400–500 ms latency on consumer hardware.

### Observability & Export

Sessions can be exported as **WVMP JSON** and as **OpenTelemetry traces** (session spans with per‑token subspans). We instrument golden signals like `ai.token.inter_arrival_ms`, `ai.token.tps` (tokens per second), `ai.token.di_jsd` and counters for safety blocks and permission denials.

### Safety & Privacy

No remote calls occur without your consent; network access for plugins is opt‑in. We map our surfaces to the OWASP Top 10 for LLM applications and document mitigations for prompt injection and data leakage. **Evidence Mode** prevents misinterpretation by revealing the underlying metrics behind the magic.

## Who It’s For

- **Developers:** Debug stalls visually, compare models side‑by‑side and export traces for issue reports.
- **Creators / Artists:** Turn real computation into generative art with reproducible presets.
- **Educators / Learners:** Teach how large language models work one token at a time using live evidence.

## Pricing That Makes Sense

- **Free:** Levels 1–2, single session, image export.
- **Pro — $8/month:** Levels 1–5, parallel models, DI, composer graphs, WVMP/OTel export, OBS overlay, session replay.
- **Creator Licence:** Perpetual for the current major version plus 12 months of updates (supersedes the previous lifetime licence claim).

## The Call to Action

Stop imagining what AI might be. Start seeing what AI actually is. **Download WIRTHFORGE**, connect it to your local models and watch your first token appear as light. Then switch on **Evidence Mode** and discover the metric that created it.

> *We don’t make AI magical. We reveal that the reality of AI is already magical enough.*

**See it. Understand it. Own it.**
