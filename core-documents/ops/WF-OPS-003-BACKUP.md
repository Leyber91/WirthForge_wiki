Generate Document: WF-OPS-003 - Backup, Recovery & Data Management
🧬 Document DNA

Unique ID: WF-OPS-003

Category: Operations – Data Integrity

Priority: P1 (launch‑critical)

Dev Phase: Pre‑Release (Beta)

Estimated Length: ~90 pages

Document Type: Technical Implementation Guide + Runbook

🔗 Dependency Matrix

Required Before This:

WF-OPS-001 – Local Deployment & Installation → Provides file layout, DB, certs, and service manager used by backup engine.

WF-OPS-002 – Monitoring & Performance → Supplies health signals and quiet windows for safe backup windows.

WF-TECH-007 – Security & Privacy → Encryption, key handling, and data classifications for backups/exports (referenced policies).

WF-FND-006 – Governance → Core principle gates for local‑first, no‑Docker, UI presence, performance, and policy workflows.

Enables After This:

Support Ops (triage with restore points), Migration (device moves), Audit (immutability proofs).

Cross-References:

Governance Validator → Audit trail, immutability hash verification, user transparency checks.

Energy/UX → Energy‑aware scheduling (avoid 60 Hz impact), motion‑reduced visualizations for long operations.

🎯 Core Objective

Design a local‑first backup and recovery framework with novice‑friendly web controls that guarantees data integrity and reliable rollback—operating entirely offline by default, with optional encrypted exports under explicit user control.

📚 Knowledge Integration Checklist

Local storage default (on‑device archives; user chooses path/devices).

Optional encrypted cloud export (explicit consent; policy‑bound; verifiable).

No‑Docker core, native filesystem operations and streaming; UI presence during long‑running tasks.

Performance respect: pause/throttle to protect 16.67 ms UI budget; coordinate with monitoring to find safe windows.

Auditability: hashing, manifest, and immutable audit records; user‑readable logs with transparency features.

📝 Content Architecture
Section 1: Opening Hook

Backups shouldn’t be a prayer. They should be provable, local, and reversible. WF‑OPS‑003 makes every snapshot transparent: what was saved, how it’s encrypted, how to restore, and how the system maintained 60 Hz responsiveness while doing it.

Section 2: Core Concepts

Backup Units:

Config (settings, policies), DB (SQLite), Models (optional, huge), Logs/Audit, Certs/Keys (guard‑railed).

Strategies: Full, Incremental, Differential; content‑addressed chunks; rolling manifests with SHA‑256 trees.

Energy‑Aware Scheduling: consult monitoring for CPU/GPU load, frame stability; autosuggest defer if FPS <58 or CPU >85%.

Privacy Layers: export scopes (config‑only vs full), key escrow strictly off by default; policy templates define verification methods and exceptions.

Section 3: Implementation Details

3.1 Architecture

flowchart LR
  UI[Web UI: Backup & Recovery] --> API[Local Backup API]
  API --> PL[Planner]
  PL -->|snapshot plan| ENG[Backup Engine]
  ENG --> ARC[(Archives on Local Storage)]
  PL --> MON[Monitoring Signals]
  API --> RST[Recovery Engine] --> LIVE[Live System (DB, Files)]
  API --> AUD[Audit Trail (SQLite + hash file)]


Planner: selects safe windows using WF‑OPS‑002 signals and user schedule; pauses if perf degrades.

Engine: streams files/DB pages to archive with hashing; optional compression.

Audit: writes event log + rolling hash; validates immutability on verify runs.

3.2 Backup Manifest (JSON)

{
  "backup_id": "wf-2025-08-19-011500",
  "created_utc": "2025-08-19T01:15:00Z",
  "strategy": "incremental",
  "includes": ["db", "config", "logs"],
  "excludes": ["models"],
  "root_hash": "sha256:ab12...ef",
  "items": [
    {"path": "data/wirthforge.db", "size": 7340032, "sha256": "..." },
    {"path": "data/config.json", "size": 4096, "sha256": "..." }
  ],
  "wf_version": "1.0.0",
  "engine_ver": "1.0",
  "governance": { "local_first": true, "ui_presence": true }
}


3.3 Backup Engine (Python excerpt)

# backup_engine.py - local, offline-capable, no Docker
import os, hashlib, shutil, sqlite3, time, json, gzip
CHUNK = 1024*1024

def sha256_file(p):
    h = hashlib.sha256()
    with open(p,'rb') as f:
        for b in iter(lambda: f.read(CHUNK), b''):
            h.update(b)
    return h.hexdigest()

def copy_with_hash(src, dst):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    h = hashlib.sha256()
    with open(src,'rb') as s, open(dst,'wb') as d:
        for b in iter(lambda: s.read(CHUNK), b''):
            d.write(b); h.update(b)
    return h.hexdigest()

def backup_paths(paths, out_dir):
    manifest = {"items":[], "created_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ")}
    for p in paths:
        dst = os.path.join(out_dir, p)
        h = copy_with_hash(p, dst)
        manifest["items"].append({"path": p, "sha256": h})
    with open(os.path.join(out_dir, "manifest.json"),"w") as m:
        json.dump(manifest, m, indent=2)


Runs under UI presence with progress; throttles when monitor reports frame budget pressure.

3.4 Recovery Flow

sequenceDiagram
  participant U as User (UI)
  participant R as Recovery Engine
  participant A as Archives
  participant L as Live System
  U->>R: Select backup_id + scope
  R->>A: Open manifest + hashes
  R->>L: Validate safe state (stop services)
  R->>L: Restore files/DB; verify hashes
  R->>L: Start services; smoke tests
  R->>U: Report success + audit entries


Selective Restore: choose config‑only, DB‑only, or full.

Smoke tests: start core in verify mode; fail‑safe rollback if tests fail.

3.5 Key Management & Optional Encrypted Export

Local archives by default; optional “Export Encrypted” ZIP with user‑supplied passphrase (PBKDF2, AES‑GCM).

Policy templates enforce verification methods and core‑principle alignment (local_first, UI presence) for any cloud usage.

3.6 Data Lifecycle & Retention

Retention policies (count/time‑based); no regression: never silently delete last known good snapshot; show confirmations.

Cleaner runs only in healthy windows (monitor green), and produces an audit event and updated hash file for immutability checks.

Section 4: Integration Points

Monitoring (WF‑OPS‑002):

Schedule backups in low‑load windows (CPU<60%, FPS≥58), pause/resume on pressure.

Emit backup health and restore verification to dashboards; alerts on integrity failures.

Governance Validator:

Offline mode test during backup; no external calls; audit has recent entries; immutability hash matches.

Gate all “export to cloud” paths behind policy template workflow with explicit verification and approvals.

Experience Orchestrator:

Maintain UI 60 Hz during long operations; show energy‑aware progress (stream width maps to bytes/s) with reduced‑motion fallback.

Section 5: Validation & Metrics

Integrity: 100% item hash match on verify; root hash reproducible.

Reliability: Restore success rate ≥99.9% in test matrix; automatic rollback if smoke tests fail.

Performance: Backups run without sustained frame budget breach (≤5% frames >16.67 ms).

Privacy: Exports are opt‑in, scoped, and encrypted; policy conformance checks pass before any sharing.

Governance: Local‑first, no‑Docker, UI presence, audit transparency—all checks green.

🎨 Required Deliverables

Diagrams (4 Mermaid): Backup architecture; recovery sequence; data lifecycle; retention/cleanup flow.

Schemas (4 JSON): Backup manifest; recovery plan; retention policy; export descriptor.

Code (6 files): Planner; backup engine; recovery engine; encryption helper; audit/verify tool; UI module.

Tests (4 suites): Integrity/verify; restore smoke tests; performance under load; policy/consent gating.

✅ Quality Validation Criteria

Governance: Pass local‑first, no‑Docker, 60 FPS, energy‑truth, UI presence, auditability gates.

Accessibility: Motion‑reduced visuals; alt‑text; keyboard flows for recovery steps.

User Control: Clear scopes, destinations, encryption choices; defaults to local only.

Disaster Readiness: Documented, tested emergency restore from minimal backups (config+DB).

🔄 Post-Generation Protocol

Glossary updates (e.g., Root Hash, Selective Restore, Retention Window).

Version this doc 1.0.0; link in master index; set Requires and Enables in dependency graph.

Run consistency checker (energy visuals, performance budgets, local‑first wording).

Cascade:

WF‑OPS‑002 MINOR (consume backup health panel),

WF‑TECH‑007 MINOR (align crypto defaults & policy hooks),

WF‑BIZ‑Support PATCH (triage checklist updates).