Generate Document: WF-OPS-002 - Monitoring & Performance Management
🧬 Document DNA

Unique ID: WF-OPS-002

Category: Operations – Monitoring

Priority: P1 (launch-critical)

Dev Phase: Pre‑Release (Beta)

Estimated Length: ~80 pages

Document Type: Technical Implementation Guide + Runbook

🔗 Dependency Matrix

Required Before This:

WF-OPS-001 – Local Deployment & Installation → Provides the localhost server, SQLite, certs, and file layout where agents/collectors will run and store metrics.

WF-TECH-002 – Local AI Integration → Exposes per‑model runtime hooks (tokens/sec, TTFT, VRAM/CPU utilization) required for model performance tracking.

WF-UX-006 – Performance Optimization → UX metrics and interaction‑latency targets consumed by dashboards and alerts (UX KPIs, jank budgets).

WF-FND-006 – Governance → Core principle gates: local‑first, no Docker in core, 60 FPS/16.67 ms budget, energy‑truth visualization, UI presence; and approval/validation workflow for monitoring features.

Enables After This:

WF-OPS-003 – Backup, Recovery & Data Management → Uses monitoring health signals and alerts to schedule safe backups and verify recovery integrity.

WF-BIZ-00X – Support Ops → Provides local diagnostic bundles and performance reports for user‑authorized sharing.

Cross-References:

Energy/Output Visuals → 60 Hz visuals, particle/stream semantics for token velocity/entropy used in real‑time dashboards.

Governance Validator → Scripted compliance checks (local‑first, offline ability, no Docker, perf timing, sandbox) baked into monitoring CI and health checks.

Experience Orchestrator → 16.67 ms frame budget and runtime event bus; dashboards subscribe without blocking render loop.

🎯 Core Objective

Implement a fully local, web‑based monitoring and performance management stack that streams real‑time system/model/UX metrics at 60 Hz, triggers user‑controlled alerts, and produces privacy‑preserving analytics—without any external monitoring service.

📚 Knowledge Integration Checklist

Local‑first data plane (all metrics on device; optional sharing gated by user consent).

No‑Docker core (native agents; containers only for optional add‑ons, never in core).

60 FPS constraint for UI & sampling/aggregation so visuals never fabricate state; 16.67 ms budget respected.

Energy‑truth: energy ribbons/particles map to actual token velocity/entropy; no fake effects.

UI presence & transparency: visible indicators for monitoring activity; user control over telemetry and alerts.

Governance validation: integrate automated checks (offline, network isolation, sandbox, audit) in monitor health tests.

📝 Content Architecture
Section 1: Opening Hook

Monitoring is not a cloud dashboard—it’s your machine’s live heartbeat rendered at 60 Hz, with every spark (token), ribbon (throughput), and ripple (interference) tied to real computation. WF‑OPS‑002 turns WIRTHFORGE into an instrumented, observable system—locally—so users can see resource pressure building, model performance shifting, and UX latency trends in time to act. The entire pipeline stays on device; sharing is an explicit, reversible choice.

Section 2: Core Concepts

Metric Taxonomy

System: CPU%, GPU util/VRAM, memory, disk IO, net IO (local loopback emphasized).

Model: tokens/sec, TTFT, queue wait, cache hit, batch size, accuracy proxy (task‑level), energy (normalized 0–1 from token flow/entropy).

UX/Render: frame time (ms), dropped frames, input‑to‑first‑paint, interaction latency (p50/p95), jank budget vs 16.67 ms.

Sampling & Aggregation

Collectors sample at 60 Hz for render‑critical, 10 Hz for resources, and 1 Hz for long‑span trends; aggregated to rolling windows (1 s/10 s/5 m).

Energy‑Aware KPIs

Energy ribbons width = throughput, speed = token velocity; particles density = entropy. All visuals map to measured signals—no synthetic indicators.

Alert Philosophy

Threshold/derivative windows (e.g., CPU > 85% for 10 s AND FPS < 58), accuracy drift, energy desynchronization (multi‑model resonance loss), with Novice‑friendly default rules.

Section 3: Implementation Details

3.1 Architecture (Local‑only)

flowchart LR
  subgraph Localhost
    C[Collectors/Agents] -->|events@60Hz/10Hz| A[Aggregator]
    A --> TS[(SQLite/TS tables)]
    A --> WS[[WebSocket / SSE]]
    UI[Web UI Dashboards] <-- WS --> A
    A --> AR[Alert Engine]
    AR --> NB[Notification Broker]
  end


Collectors (native processes) use OS APIs/psutil/NVML to read metrics; no Docker in core.

Aggregator batches to SQLite tables, emits streams (WS/SSE) to UI.

Alert Engine evaluates rules; Notification Broker executes local notifications (toasts, sounds), never calling external services unless user enables an integration.

3.2 Metrics Event Schema (JSON)

{
  "ts": 1724049600123,
  "source": "model:llama7b",
  "kind": "performance",
  "fields": {
    "tps": 18.4,
    "ttft_ms": 120,
    "energy": 0.66,
    "entropy_bits": 3.2,
    "gpu_util": 74.0,
    "vram_mb": 5221
  },
  "window": "1s",
  "ver": "1.0"
}


3.3 Alert Rule DSL (Local)

{
  "id": "rule.fps_cpu_pressure",
  "version": "1.0",
  "when_all": [
    { "metric": "ui.frame_time_ms.p95", "op": ">", "value": 16.67, "window": "10s" },
    { "metric": "system.cpu.percent", "op": ">", "value": 85, "window": "10s" }
  ],
  "then": [
    { "action": "notify.toast", "level": "warning", "message": "Sustained frame budget breach + high CPU" },
    { "action": "suggest.throttle", "target": "models.max_parallel", "value": -1 }
  ],
  "privacy": "local_only"
}


Governance ties: 60 FPS budget, UI presence, mitigation suggestion is local and reversible.

3.4 Collector (Python)

# local_collector.py (excerpt) - no external network calls
import time, psutil, json, sqlite3
from datetime import datetime
def collect_loop(db="data/metrics.db"):
    conn = sqlite3.connect(db); cur = conn.cursor()
    while True:
        cpu = psutil.cpu_percent(interval=None)
        mem = psutil.virtual_memory().percent
        ts = int(time.time()*1000)
        cur.execute("INSERT INTO sys_metrics(ts,cpu,mem) VALUES(?,?,?)",(ts,cpu,mem))
        conn.commit()
        # emit to local bus (unix socket / localhost WS)...
        time.sleep(0.1)  # 10Hz


Validated by governance script for local‑first, offline capability, no Docker processes/configs.

3.5 Dashboard (Web)

Panels: System (CPU/GPU/mem), Model (TPS/TTFT/energy stream), UX (frame time, drops), Storage (IO, DB size), Alerts.

60 Hz streams with decoupled rendering; no blocking of orchestrator loop; frame budget instrumented in UI.

Visuals use Energy design assets (lightning, ribbons, particles), with accessibility fallbacks (reduced motion, alt‑text).

3.6 Analytics (Local)

Windowed aggregations persisted to SQLite: minute/hour/day buckets; privacy‑preserving summaries (k‑anonymized categories, no raw content).

Export: user‑initiated .jsonl/.csv bundles; explicit consent required for any external sharing. Policy templates enforce explicit verification methods and alignment to local‑first / UI presence.

Section 4: Integration Points

Experience Orchestrator: subscribe to event bus; compute and display energy safely within 16.67 ms; never starve render thread.

Governance Validator: nightly/local CI runs LF/Docker/Perf/Sandbox/Audit checks; surface failures as critical alerts in dashboard.

Progression Policies: expose non‑gameable XP signals (time/usage/achievements) for level unlock visuals; never regress levels; time‑gates honored.

WF-OPS-003: emit backup health signals and pre‑backup readiness checks (low CPU, stable FPS, disk OK) to schedule safe backups.

Section 5: Validation & Metrics

Perf conformance: ≥95% frames ≤16.67 ms; avg FPS ≥58 in stress runs; auto‑mitigate load.

Local‑first audits: no unexpected net connections during sampling; storage strictly local; offline mode passes.

Alert efficacy: synthetic faults (GPU saturation, IO throttling) trigger alerts within ≤2 s; false‑positive rate <2% in baseline.

Analytics privacy: exports never contain PII or raw prompts by default; require explicit user selection each time.

🎨 Required Deliverables

Diagrams (4 Mermaid): Monitoring architecture; streaming pipeline; alert flow; analytics rollups.

Schemas (4 JSON): Metrics event; alert rule; panel layout; export manifest.

Code (7 files): System/model collectors; aggregator; alert engine; WS server; dashboard components.

Tests (4 suites): Sampling accuracy; alert triggering; UI perf (60 Hz); privacy export checks.

✅ Quality Validation Criteria

Governance compliance: pass local‑first, no‑Docker, 60 FPS, energy‑truth, UI presence gates.

Tooling: governance validator suites green on target OSes.

Accessibility: motion‑reduced and alt‑text paths for energy visuals.

User control: telemetry default off; clear toggles; in‑UI disclosure of what’s recorded.

🔄 Post-Generation Protocol

Update glossary (add: Alert Rule DSL, Energy Ribbon, TTFT).

Bump doc version: 1.0.0; register in dependency graph; notify WF‑OPS‑003 maintainers.

Run consistency checker (terminology/perf/energy rules); attach reviewer notes if any WARNINGS.

Queue cascade: WF‑OPS‑003 MINOR (consumes monitoring signals); WF‑UX‑006 PATCH (hook dashboard patterns).