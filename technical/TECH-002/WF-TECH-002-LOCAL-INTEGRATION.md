# WF-TECH-002: Local AI Integration & Turbo/Broker

## 🧬 Document DNA

**Unique ID**: WF-TECH-002
**Category**: TECH
**Priority**: P0
**Dev Phase**: 2 (Core Tech)
**Estimated Length**: ~4,500 words
**Document Type**: Technical Specification & Implementation Guide

## 🔗 Dependency Matrix

### Required Dependencies

* **WF-TECH-001 – Automated Startup & Orchestration**: Provides orchestrator lifecycle, 60Hz loop, and transport endpoints that TECH-002 integrates with
* **WF-FND-001 – Manifesto & Vision**: Enforces local-first, energy-truth, and web-engaged local-core principles
* **WF-FND-002 – Energy Metaphor**: Defines token-level signal capture (Δt, TPS, entropy) and E(t) ∈ [0,1] computation
* **WF-FND-004 – DECIPHER**: Specifies token stream ingestion, backpressure handling, and event payload formats
* **WF-FND-005 – Orchestration & Consciousness**: Provides tier policies, council sizing, and hybrid/broker governance
* **WF-FND-006 – System Governance**: Enforces no-Docker constraints, schema versioning, and privacy preservation

### Enabled Dependencies

* **WF-TECH-003 – Protocol Synthesis**: Builds on model pool and token streams for protocol message generation
* **WF-TECH-004 – State Management**: Consumes energy signals E(t) and model outputs for persistence
* **WF-TECH-005 – Web Interface**: Displays real-time model telemetry and energy visualizations
* **WF-TECH-006 – Integration Testing**: Validates Ollama bindings and performance benchmarks require our council/turbo outputs.

* **Cross‑References**

  * **WF‑META‑004 – TECH Prompts.** Confirms scope, deliverables, and “web‑engaged local‑core” posture specific to TECH‑002.

## 🎯 Core Objective

Implement **native, zero‑docker** integration with **Ollama** as the first‑class local model runtime, including: streaming token capture, **token→EU** telemetry for DECIPHER, **tier‑aware model pool** management, and an optional **Turbo** ensemble (local parallel models) — all under the *web‑engaged local‑core* constraint (browser UI required; computation remains on device). Hybrid **Broker** use is *opt‑in*, never required. Success is measured by real‑time streams that preserve **energy‑truth** at **60 Hz** with governance invariants intact.

## 📚 Knowledge Integration Checklist

* **Energy math** (Δt, TPS, top‑K/entropy, DI, E(t) normalization & smoothing) implemented per WF‑FND‑002; tolerate missing logprobs via graceful degradation.&#x20;
* **DECIPHER contracts**: non‑blocking token ingestion, 60 Hz framing, drop/degrade/backpressure rules.&#x20;
* **Council/Tier policies**: cap parallel models by tier (Low/Mid/High/Hybrid) and progression level; unlock Turbo only where allowed.
* **Governance invariants**: local‑core, **no Docker**, visible energy, UI presence; schema versioning & audit hooks.
* **Web‑engaged local‑core**: bind to local Web API and WebSockets; no core cloud dependency.&#x20;

## 📝 Content Architecture

### Section 1: Opening Hook — “Plug the Engine In”

TECH‑002 is the **engine mount**: it binds the orchestrator (TECH‑001) to a real, local model runtime (Ollama), streams tokens immediately, converts them to **E(t)**, and drives the UI at **60 Hz** without any cloud calls. From tier‑aware **single‑model** use at Level 1 to **Turbo** local councils at higher tiers, every emitted visual is grounded in measured signals — no fakery, just **energy‑truth**.

### Section 2: Core Concepts

1. **Ollama Adapter (Layer‑2 binding).**

   * Responsibilities: health/proc control (`serve` presence), **streaming** tokens (async), and telemetry capture (timestamps, Δt, TPS, optional top‑K/entropy).
   * Guarantees: local‑only I/O; no Docker; backpressure & abort signaling; deterministic timestamps.&#x20;

2. **Model Pool & Load Policy.**

   * Maintain a **tier‑aware** pool of loaded models with limits for `max_parallel_models`, `max_loaded_models`, VRAM/RAM budgeting, and prefetch rules. Defaults derive from FND‑005 tier caps and progression.&#x20;

3. **Turbo Ensemble (Local Council).**

   * Orchestrate **4–6** concurrent local models on High/Hybrid tiers; stream interleaved tokens; compute **DI** and ensemble **E\_ensemble(t)** per FND‑002; never block the 60 Hz loop.

4. **Hybrid Broker (Optional, User‑Controlled).**

   * If **Hybrid** is configured, allow a *satellite assist* path without changing the local‑core truth; never required for core flows; gated by policy (`broker_support` / plan).&#x20;

5. **Token→EU Mapping & Smoothing.**

   * Compute E(t) from cadence, certainty, and stall; maintain EMA for smooth visuals; emit per‑frame energy metrics at **60 Hz** to DECIPHER.

### Section 3: Implementation Details

#### 3.1 Interfaces & Data Flow

**Launch Path (happy path):** Orchestrator→`OllamaAdapter.ensure_running()`→`ModelPool.ensure_loaded(model)`→`OllamaAdapter.generate_stream(prompt, params)`→ per‑token events→**DECIPHER.ingest(token, meta)**→ per‑frame **E(t)**→ WebSocket (**TECH‑003**).

```python
# Pseudocode (asyncio/FastAPI compatible, no Docker)
class OllamaAdapter:
    def __init__(self, host="127.0.0.1", port=11434):
        self.base = f"http://{host}:{port}"

    async def ensure_running(self) -> None:
        if not await self._ping():
            # spawn local process; equivalent to `ollama serve` without docker
            await self._spawn_ollama_daemon_local()
        assert await self._ping(), "Ollama not reachable"

    async def generate_stream(self, model:str, prompt:str, **kw):
        # returns async iterator of {token, t_ms, delta_ms, topk?}
        async for chunk in self._http_stream("/api/generate", json={"model": model, "prompt": prompt, **kw, "stream": True}):
            yield chunk  # { "token": "...", "t_ms": 123, "logprobs": [...]? }

class ModelPool:
    def __init__(self, tier_policy):  # from FND-005 capabilities
        self.tier = tier_policy
        self.loaded = {}

    async def ensure_loaded(self, model:str):
        if model in self.loaded: return
        await self._pull_if_missing(model)  # local or bundled
        await self._load(model)             # warm-up; respects tier caps

class EUMapper:
    def compute(self, token_event) -> float:
        # E(t) in [0,1] from cadence + certainty + stall (FND-002)
        return self._normalize(token_event)

async def run_single(prompt:str, model:str, dec):
    await ollama.ensure_running()
    await pool.ensure_loaded(model)
    async for e in ollama.generate_stream(model, prompt):
        e["E"] = eu.compute(e)
        dec.ingest(e)  # feeds DECIPHER; 60 Hz frames emit downstream
```

*Notes:* token timestamps must be monotonic; **abort** (user stop) must cancel the HTTP stream and propagate an orchestrator stop event; **backpressure** uses DECIPHER’s queue thresholds before requesting slow‑down.&#x20;

#### 3.2 Turbo Ensemble (Local Council)

```python
async def run_turbo(prompt:str, models:list[str], dec):
    # Constrain by tier policy, e.g., <= 6 models high-tier
    models = models[:tier.max_parallel_models]
    async def one(m):
        async for e in ollama.generate_stream(m, prompt):
            e["source"] = m
            e["E"] = eu.compute(e)
            dec.ingest(e)
    await asyncio.gather(*(one(m) for m in models))  # interleave tokens
```

* **DI & Ensemble Energy:** compute DI on aligned token windows (if top‑K available) and derive **E\_ensemble(t) = Σ γ\_m E\_m(t)** (clamped). Emit interference/resonance cues to UI via DECIPHER/TECH‑003.&#x20;
* **Caps & Gating:** obey tier caps (e.g., High≈6, Mid≈4, Low≈2), with Hybrid allowed but *off by default* unless user opts‑in.&#x20;

#### 3.3 Model Pool & Policy

* **Caps:** `max_parallel_models`, `max_loaded_models`, `max_model_size`.
* **Budgeting:** guardrails for VRAM/RAM; **lazy load** + **warm‑up** to avoid TTFT spikes.
* **Eviction:** LRU with cool‑down to prevent thrash.
* **Config Sources:** tier YAML / capabilities JSON from FND‑005; versioned under governance.

#### 3.4 Web‑Engaged Local‑Core Endpoints (served by FastAPI)

* `GET /models` → list local models + status.
* `POST /models/load {name}` → ensure present, load/warm.
* `POST /generate {model, prompt, …}` → start stream (Server‑Sent / WS bridge).
* `POST /stop {session_id}` → cancel stream.
* `GET /stats` → per‑model TPS, TTFT, EU rate (for Evidence Mode).
  All endpoints bind to **127.0.0.1**, with schema versions tracked per FND‑006.

#### 3.5 Backpressure, Abort, & Degrade

* **Backpressure:** apply DECIPHER queue watermarks → batch/merge low‑impact tokens; request slow‑down if supported.
* **Abort:** user stop closes streams and flushes frame composers cleanly.
* **Degrade:** preserve 60 Hz by prioritizing token→EU and basic frame emission; delay higher‑order analytics if needed.&#x20;

#### 3.6 Anti‑Patterns (Do Not)

* Buffer entire completion before streaming.
* Emit visuals not backed by measured signals (“no smoke & mirrors”).&#x20;
* Exceed tier caps or bypass governance invariants (e.g., invoking Docker).&#x20;

### Section 4: Integration Points

* **TECH‑001 (Orchestrator):** our adapter exposes `generate_stream`, `ensure_running`, and pool APIs; orchestrator schedules these in its event loop.
* **TECH‑003 (Real‑Time Protocol):** token/EU frames → `energy.*`; council events → `council.*`; lifecycle → `experience.*`.&#x20;
* **WF‑FND‑004 (DECIPHER):** we are the upstream source; we conform to its ingestion and 60 Hz frame composition timing.&#x20;
* **WF‑FND‑005 (Progression/Tiers):** Turbo only when allowed; hybrid broker optional and flagged; policies are data‑driven (JSON/YAML).
* **WF‑FND‑006 (Governance):** release checks ensure **no Docker**, local‑core, schema/version compliance.&#x20;

### Section 5: Validation & Metrics

* **Startup‑to‑First‑Token (TTFT):** baseline & warmed TTFT by tier/model; median & p95 reported.
* **60 Hz Integrity:** frame budget adherence under single/ensemble loads; **≥55 Hz** on low tier; **60 Hz target** generally.&#x20;
* **Energy‑Truth Consistency:** cross‑check `E(t)` against raw signals; Evidence Mode exposes WVMP metrics.&#x20;
* **Tier Caps Compliance:** never exceed `max_parallel_models` and resource budgets.&#x20;
* **Local‑Only Traffic:** audit shows no external calls in core flow; hybrid only when toggled.&#x20;
* **Schema Versioning:** APIs/events carry semver; contract tests gate changes.&#x20;

## 🎨 Technical Deliverables

All deliverables are implemented as separate files in the `TECH-002/` directory for modularity and maintainability, following the established TECH-001 pattern.

### Architecture & Design Documentation

* **[WF-TECH-002-OLLAMA-ADAPTER.md](TECH-002/WF-TECH-002-OLLAMA-ADAPTER.md)** — Native Ollama integration architecture, process management, token streaming, and energy telemetry capture
* **[WF-TECH-002-TURBO-ENSEMBLE.md](TECH-002/WF-TECH-002-TURBO-ENSEMBLE.md)** — Multi-model council orchestration (4-6 models), ensemble energy computation, and diversity index calculation
* **[WF-TECH-002-HYBRID-BROKER.md](TECH-002/WF-TECH-002-HYBRID-BROKER.md)** — Optional satellite assistance with user-controlled privacy and local-core primacy

### Configuration & Policies

* **[WF-TECH-002-TIER-POLICY.yaml](TECH-002/WF-TECH-002-TIER-POLICY.yaml)** — Tier-based resource allocation, model pool management, and performance thresholds
* **[WF-TECH-002-API-SCHEMAS.json](TECH-002/WF-TECH-002-API-SCHEMAS.json)** — Complete API contract definitions with request/response schemas and event specifications

### Implementation Components

* **[WF-TECH-002-ENERGY-MAPPING.py](TECH-002/WF-TECH-002-ENERGY-MAPPING.py)** — Energy computation E(t) from token events, EMA smoothing, and diversity index calculation
* **[WF-TECH-002-FASTAPI-ENDPOINTS.py](TECH-002/WF-TECH-002-FASTAPI-ENDPOINTS.py)** — Local web API endpoints for model control, streaming, and real-time statistics (127.0.0.1 binding)

### Quality Assurance

* **[WF-TECH-002-INTEGRATION-TESTS.py](TECH-002/WF-TECH-002-INTEGRATION-TESTS.py)** — Comprehensive test suite for 60Hz compliance, schema validation, and tier policy enforcement
* **[WF-TECH-002-BENCHMARKS.md](TECH-002/WF-TECH-002-BENCHMARKS.md)** — Performance benchmarks with TTFT/TPS targets, memory usage analysis, and regression testing criteria

## ✅ Quality Validation Criteria

* **Architecture correctness:** adapter ↔ DECIPHER ↔ transport boundaries respected; no cross‑layer leaks.&#x20;
* **Governance invariants:** **local‑core**, **no Docker**, **60 fps**, energy‑truth, UI presence — all verifiably true in code/tests.&#x20;
* **Performance:** sustained 60 Hz under single‑model load; tier‑appropriate throughput for Turbo with graceful degrade.&#x20;
* **Schema/versioning:** semver headers, contract tests, auditability per FND‑006.&#x20;
* **Clarity & testability:** each deliverable runnable/linteable; endpoints & data types unambiguous (examples included).&#x20;

## 🔄 Post-Generation Protocol

* **Glossary update:** add/confirm entries for *Ollama Adapter*, *Turbo Ensemble*, *DI*, *E(t) smoothing*, *TTFT*. (Master glossary under FND‑006.)&#x20;
* **Dependency graph:** link TECH‑002 under TECH‑001 and as producer to TECH‑003/005; update doc index.&#x20;
* **Versioning:** tag initial **v1.0.0** for TECH‑002; create `CHANGELOG-WF-TECH-002.md`; schemas carry `x‑schema‑version`.&#x20;
* **Assets & repo:** commit deliverables to `/docs/tech-002/` and `/code/tech-002/`; register in assets manifest and style map (consistent with TECH‑001 split).&#x20;
* **Cascade queue:**

  * **TECH‑003:** finalize `energy.*` / `council.*` channel messages using our event shapes.&#x20;
  * **TECH‑005:** bind frame composer to our EU mapper & DI utilities.&#x20;
  * **UX‑001/002:** wire Evidence Mode overlays to `/stats` & per‑frame energy metrics.&#x20;

---

**Notes aligned to your last revision:** This document is authored to **match the TECH‑001 deliverable split pattern** you adopted (separate files, main doc references only). It generalizes across all hardware tiers, assumes **Python + asyncio** with **FastAPI** for transport, and maintains **automatic Ollama setup** so users need not configure anything manually — fully consistent with the *web‑engaged local‑core* architecture and governance invariants.
