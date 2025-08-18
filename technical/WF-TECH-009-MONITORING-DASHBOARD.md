WF-TECH-009 — Observability & Metrics in Local-Core Architecture

🧬 Document DNA

Unique ID: WF-TECH-009

Category: TECH (Technical Specification)

Priority: P0 (Core system visibility & feedback loop)

Development Phase: 1 (Initial design and integration)

Estimated Length: ~4,000 words

Document Type: Observability & Metrics Architecture Spec

🔗 Dependency Matrix

Required Before This:

WF-TECH-004 – State & Storage: Establishes local database and event log systems that this metrics framework will leverage for storing metrics and audit trails. It defines how data is persisted on-device and informs how metrics snapshots and historical logs should be recorded (e.g. session tables, event schemas) in alignment with the event-sourcing model. We will build on its local-first database design (e.g. using the same SQLite/Postgres for metrics storage) and integrate metrics capture into the existing event logging pipeline.

WF-FND-002 – Energy & Circuits: Introduces the “energy-truth” metaphor and key concepts like Energy Units (EU) and fidelity of visualization. This foundation defines how computational events map to energy visuals and performance cues, which directly inform what we measure (e.g. ensuring energy visualization fidelity is quantified
GitHub
GitHub
). The energy metaphor’s KPIs (like coherence, particle counts, etc.) will guide specific metrics (e.g. ratio of energy particles to tokens as a fidelity metric) to ensure our observability aligns with the core experience.

WF-FND-006 – Governance & Evolution: Provides mandates for self-measurement and audit. It enumerates key metrics to monitor (user progression rate, latency, frame rate, energy fidelity, etc.) and requires continuous self-monitoring
GitHub
. It also establishes audit trails and the principle that any system change should be traceable and data-driven. This spec will operationalize those governance requirements by defining metrics schemas
GitHub
, dashboards for monitoring, and alerting mechanisms so that breaches of performance or policy (e.g. prolonged low fidelity or unusual error spikes) are logged and flagged for review. We also carry forward FND-006’s privacy and audit tenets: all metrics logging stays local by default, with sensitive data minimized or hashed
GitHub
 and any aggregation for external analysis strictly opt-in
GitHub
.

Enables After This:

WF-TECH-010 – Performance & Capacity: Uses the metrics and dashboards defined here to drive performance tuning and capacity planning. The instrumentation of latency, frame stability, and resource usage feeds into TECH-010’s optimization strategies; for example, TECH-010 can rely on the real-time metrics from this spec (like P95 latency, frame drop rates) to identify bottlenecks and verify that performance tweaks have the intended effect
GitHub
. Essentially, Observability & Metrics provides the measurement framework for performance improvements.

WF-OPS-002 – Monitoring & Maintenance: In operations, the local metrics dashboard and alerts become the backbone of system health monitoring. This spec directly enables WF-OPS-002 by delivering the tools (UI panels, logs, thresholds) that an operator or user will use to monitor WIRTHFORGE’s health in practice. Everything from routine checks (e.g. checking today’s average latency) to diagnosing anomalies (via error counts or energy imbalance alerts) will be done through the systems designed here.

Governance Reviews & Evolution: Beyond specific documents, the implementation here empowers the governance process outlined in FND-006. By having continuous metrics collected and stored, the WIRTHFORGE team (or even an AI-driven orchestrator) can perform regular reviews of metrics trends (e.g. monthly progression rates, energy fidelity trends post-update) to make informed decisions. This means any proposed evolution of the platform can be backed by hard data. It also means any violation of core invariants (say an update inadvertently causes average frame rate to drop below 60Hz) will be caught by the alerting system and trigger an audit review before it impacts users. In short, this observability framework is a key enabler for the “living system” approach – allowing the system to observe itself and adapt responsibly.

Cross-References:

WF-TECH-007 – Testing & QA: The metrics accuracy validation tests in this spec align with the testing strategy from TECH-007. As part of QA, metrics like frame rate and latency are used as acceptance criteria (e.g. ensuring 60Hz performance is maintained
GitHub
). We will ensure that for every metric defined, there are corresponding tests or monitoring in place (e.g. a test to verify that a heavy load still yields <5% frame drops, which ties into TECH-007’s performance tests). This creates a feedback loop: tests confirm metrics are within limits, and the metrics system in turn can flag when runtime deviates from tested parameters.

WF-TECH-008 – Plugin Architecture & Sandbox: This metrics system is designed to be extensible for plugins and sandboxed modules. As TECH-008 introduces third-party or user-developed plugins, those plugins may define custom metrics or require monitoring (e.g. a plugin might expose a metric for its own internal performance or usage count). Our design will include hooks for plugins to register and emit metrics safely, without breaching the sandbox security. This ensures that even new modules can be observed under the same unified dashboard (with governance controls to prevent misuse of metrics APIs).

🎯 Core Objective

Establish a comprehensive, privacy-first observability framework that turns WIRTHFORGE into a self-monitoring “living” system. The goal of WF-TECH-009 is to ensure that every critical aspect of the local-core architecture – from 60Hz frame processing to multi-model orchestration – is measured and visible in real-time, without ever compromising the user’s privacy or local-first principles. The user should have a clear window into the system’s performance and health, much like a driver has a dashboard of a car, all running locally and securely. In practice, this means implementing:

Local Metrics Collection & Storage: A metrics pipeline that instruments all core subsystems (DECIPHER engine, Energy service, orchestrator, etc.) to collect data points like latency per prompt, frame render time, energy units generated, error counts, memory usage, and progression rates. Data is aggregated and stored locally in a structured format (e.g. appended to the local database or log files), ensuring no dependency on external telemetry services. We will design JSON schemas for metrics snapshots and time-series aggregations
GitHub
, and ensure this data is written in an efficient, rotational manner (to avoid unbounded growth).

Real-Time Dashboard (Web UI): A web-based metrics dashboard integrated into the existing WIRTHFORGE UI (accessible via the local web interface). This dashboard will display live metrics (updated at 60Hz or in near-real-time via WebSocket streams or efficient polling) and historical trends. Key performance indicators (KPIs) like average response latency, current FPS, energy fidelity percentage, and user progression level will be presented with clear visuals (graphs, gauges, timelines). The UI/UX will be such that even non-technical users can glance at the dashboard and understand the “health” of their AI session. No external cloud dashboards are used – this is a self-contained monitoring UI served from the local WIRTHFORGE web server, aligned with the platform’s aesthetic.

Alerting & Notification System: Configurable thresholds and rules that trigger alerts when metrics go out of bounds. For example, if the energy fidelity drops below, say, 80% (meaning the visuals might not be keeping up with computation), or if p95 latency rises above 2 seconds (perhaps indicating a performance regression)
GitHub
, the system will automatically flag this. Alerts can manifest as in-UI banners or warnings (so the user is informed in real time), log entries in a dedicated alert log, and even local device notifications (e.g. a system tray notification) for critical issues. These alerts serve both the end-user (notifying them of potential issues or suggesting actions like closing other apps if system is slow) and the developers/governance team (capturing incidents for later analysis). The configuration for these thresholds will be accessible (likely a JSON/YAML config file or UI settings panel) so that they can be tuned or disabled by advanced users, and to allow governance policies to set certain hard limits (e.g. an alert on any security policy violation).

Privacy-Preserving Analytics: All metrics and logging will abide by WIRTHFORGE’s strict privacy stance. No metric will include raw user content (e.g. no full prompt texts in logs). Instead, we log abstract or aggregate values – for instance, number of tokens processed, but not the token text; energy values, but not any user identity. Sensitive information, if needed at all, will be hashed or anonymized
GitHub
. By default, no metrics leave the device: there is no cloud server collecting usage data. Users can opt-in to share certain telemetry for troubleshooting or community leaderboards, but this is a conscious choice and when done, data will be minimized and likely routed through the optional “Broker” with clear consent. Essentially, WIRTHFORGE’s observability will be open to the user but closed to everyone else.

Integration with Audit & Evolution: The metrics system will integrate tightly with the audit logs and governance framework (WF-FND-006). Key events like threshold breaches or unusual patterns will be logged as audit events so that there is a permanent record. We will also implement log rotation and retention policies in concert with the audit log (for example, metrics logs might roll over daily or when reaching a certain size, and older data could be archived or summarized) to ensure longevity without overwhelming storage. Moreover, metrics gathered over time feed the platform’s evolution: for example, if governance notices that user progression rate is consistently low for many users (meaning the gameification might be too slow), they could decide to tweak the leveling parameters. To facilitate this, the system may support exporting metrics data (e.g. as CSV or JSON reports) that users or developers can use externally (again, explicitly triggered, not automatic). In summary, Observability & Metrics is not just for passive monitoring – it closes the loop by providing the data needed to adapt and improve WIRTHFORGE continuously
GitHub
.

By the end of this specification, we will have a blueprint for equipping WIRTHFORGE with “eyes and ears” – a sensory system that monitors every heartbeat and pulse of the platform. Much like a pilot trusts their cockpit instruments, a WIRTHFORGE user or developer will be able to trust the metrics dashboard to truthfully report performance and help navigate the system’s operation. This achieves the dual purpose of transparency (the user can see what’s going on under the hood, reinforcing trust) and adaptability (the system can detect when it’s veering off-course and correct itself, or alert a human to do so). All of this is accomplished without betraying the core promise that the user’s data and computations remain local and sovereign.

📚 Knowledge Integration Checklist

Energy-Truth Fidelity (WF-FND-002): Ensure that the metrics design captures the fidelity of the energy visualization to the underlying computation. The energy metaphor foundation insists that “what you compute is what you see.” We will implement a quantitative metric for Energy Visual Fidelity – e.g. the ratio of energy particles or effects rendered to the actual number of tokens processed or energy units generated
GitHub
. This metric will signal if the UI’s representation ever lags behind or misrepresents the real processing (for instance, if frames are dropped or effects skipped due to performance). We’ll use FND-002’s guidance on energy unit mapping to define this: ideally a 1.0 fidelity means perfect alignment of visual energy to compute, whereas a drop to e.g. 0.8 would mean visuals are 20% “behind” the truth. This addresses FND-002’s emphasis on maintaining the illusion and reality of the energy visuals. Any drop in this metric can trigger internal adjustments or at least an alert for investigation
GitHub
.

Governance Metrics Mandate (WF-FND-006): Incorporate the key metrics identified by the governance framework as non-negotiable health indicators. From FND-006 we have clear KPIs: Progression Rate (how fast users advance), System Latency (prompt-to-response time), Frame Rate Stability (60Hz adherence), Error/Anomaly Rate, and Energy Fidelity
GitHub
. Our system will explicitly measure each of these:

Progression Rate: computed as levels or experience gained per unit time (per session or per hour). We’ll log this to detect if users are leveling too fast or slow, as governance uses that to balance difficulty
GitHub
.

Latency: measure average and percentile (e.g. p95) response times. The target per governance is P95 < 2s on recommended hardware
GitHub
, so the alert threshold might be set around that (with some margin).

Frame Stability: measure actual frame timing from the 60Hz loop (if the DECIPHER loop or UI render loop ever takes >16.67ms). We might track “frame_drops” or % of frames that missed the 60Hz deadline
GitHub
.

Error Counts: track occurrences of errors (e.g. a module crash, or an orchestrator restart). FND-006 suggests monitoring module timeouts or restarts
GitHub
; we’ll surface these counts and maybe even specific error events to the dashboard (with possibly drill-down for logs).

By integrating these, we ensure the system is collecting exactly what governance needs. Furthermore, per FND-006’s adaptive loop, we’ll allow the orchestrator or “Council” to ingest these metrics. For example, the system could automatically adjust if frame rate dips (reducing effects quality) or if progression is slow (tweaking rewards)
GitHub
GitHub
 – though such adaptation logic might be minimal at first, the data pipeline will exist to enable it. Finally, each of these metrics will be part of the versioned metrics schema (so if we add new ones, we bump schema version, similar to event schema versioning in governance).

Local-First Telemetry (WF-FND-001 & WF-TECH-006): Double-check that every aspect of metrics and observability adheres to the local-first, privacy-centric ethos. Building on the privacy guarantees from the manifesto and the security spec, we must make zero external calls or transmissions for metrics by default
GitHub
. No Google Analytics, no third-party crash reporters – the system will rely on its own internal logging. If an internet connection is present, WIRTHFORGE should not suddenly start uploading metrics; even checking for updates or remote assist features must not bypass this rule without user consent. We will confirm that all network interfaces used for the dashboard are bound to localhost (the UI will fetch metrics via the local API or WebSocket, not through any cloud service). Additionally, any optional feature (say the user opting to send an anonymized usage report to developers for improving the product) will be opt-in and transparent, aligning with WF-TECH-006’s stance that nothing leaves the device without explicit permission
GitHub
GitHub
. This checklist item will be satisfied when we can demonstrate that an offline WIRTHFORGE has full monitoring capabilities, and connecting to the internet does nothing extra unless the user chooses (and even then, data is minimal and likely stripped of PII).

State & Storage Integration (WF-TECH-004): Leverage the existing local storage framework for metrics data, rather than inventing a parallel system. TECH-004 defines how data is persistently stored (using SQLite or an embedded DB, with tables for events, snapshots, etc.). We plan to either extend the TECH-004 database schema by adding tables for metrics (e.g. a metrics_snapshot table capturing periodic summaries, and a metrics_history or time-series table for detailed logs), or reuse the event log concept by logging metrics as a type of event (like an event category “system.metric” with payload of values). We will ensure foreign keys or links to sessions/users where appropriate (so metrics can be partitioned by session). By using the same storage, we inherit robust features like atomic commits, snapshotting, and the backup/export tools from TECH-004. For example, if TECH-004 provides a backup CLI, that will automatically include metrics tables. We’ll also follow the audit trail structure from TECH-004 for consistency: if that doc suggests an audit log YAML or JSON, metrics might be appended to that structure
GitHub
 so that a single combined log can show both what happened (events) and how the system performed while it happened (metrics). Finally, because TECH-004 emphasizes user ownership of data, we ensure that metrics data, just like state data, can be exported or purged by the user with provided tools (no hidden remnants).

Metrics Accuracy & Testing (WF-TECH-007): As part of building this system, integrate a rigorous testing approach to validate that metrics are accurate and meaningful. Drawing from TECH-007’s comprehensive QA mandate, we will include:

Unit tests for metric calculations (e.g. does the system latency metric correctly calculate from prompt start to response finish under various conditions, including ensuring the timer stops only after the UI render is done?).

A “golden run” log replay where we feed a known sequence of events and verify the metrics outcomes (for instance, we record a session of 1000 tokens with known delays and ensure the metrics snapshot reports expected averages and fidelity).

Performance tests to ensure the metrics collection itself isn’t introducing overhead that breaks the 60Hz loop (the act of measuring should not significantly affect the measured system – we’ll test with metrics on vs off to confirm negligible difference).

Integration tests with simulated stress: e.g., deliberately cause a frame drop or a slow model response in a test environment and check that the system raises an alert as configured.

This not only satisfies TECH-007’s quality gates but also ensures our observability is trustworthy – a false metric or silent failure in monitoring would be detrimental. By the time we launch, we want confidence that if the dashboard says “Frame Rate: 58 FPS”, it truly means the system dropped frames and not a bug in the counter. Testing will also cover the alert logic (e.g., does an alert trigger at the right threshold and not spam or misfire).

Plugin and Module Metrics (WF-TECH-008 Extensibility): Design the metrics system to be extensible for future modules and plugins, without sacrificing security or integrity. According to the plugin architecture, new modules run in sandbox and should have limited access; however, observability should extend to them. We will define a safe metrics API that plugins can use to emit custom metrics (for example, a plugin might want to report its internal latency or a domain-specific metric like “images processed per minute”). This API will likely funnel through the main application (to avoid giving direct database access to plugins). Perhaps the plugin can send a message to the orchestrator with a metric name and value, and the core system then logs it on the plugin’s behalf. All such metrics would be namespaced or tagged by plugin identity so the dashboard can display them distinctly (and governance can review their use). We’ll enforce that plugins cannot read or alter other metrics – only contribute their own – maintaining integrity. Also, any plugin metric definitions might require a manifest entry and user approval (preventing a malicious plugin from secretly logging sensitive info as “metrics”). Essentially, we integrate metrics with the sandbox policy: e.g., a plugin manifest could declare what metrics it will output, and the user can see that and decide. This way, our observability covers the whole ecosystem, core and extensions, in a unified manner.

📝 Content Architecture

Section 1: The System’s Sixth Sense – (Intro & Vision)
Purpose: Open with a compelling narrative on why observability is the “sixth sense” of WIRTHFORGE, crucial for trust and evolution. We frame how a user or developer experiences the platform with and without metrics: imagine running WIRTHFORGE blind vs. with a rich dashboard. We might use an analogy: WIRTHFORGE is like a living organism or a complex machine – without senses (metrics) it wouldn’t know if it’s sick or healthy. With observability, the platform gains reflexes: it can feel pain (performance drop) and react
GitHub
. This section paints the picture of a user looking at their local cockpit of metrics: “As Alice experiments with a new AI prompt, a glance at the WIRTHFORGE dashboard shows her the system’s heartbeat – CPU load steady, 60 FPS holding, energy pulses matching the text output. When a heavy question causes a slowdown, a gentle warning pops up: ‘Energy flow lagging (fidelity 75%) – consider simplifying the prompt or enabling Turbo mode.’ Alice realizes her device is at its limits. In that moment, the observability system acted like a co-pilot, guiding her to adjust and ensuring the magic stays intact.” Through such a story, we underscore the core idea: observability keeps the user in the loop and the system honest. We also highlight the privacy aspect here: unlike cloud AI services that might have hidden monitoring, WIRTHFORGE’s metrics are for your eyes only, reinforcing the trust. This intro sets the emotional and practical stage for the technical details to come, making clear that this is a cornerstone of a reliable, user-empowering experience.

Section 2: What to Measure – Defining the Core Metrics
Purpose: Enumerate and define each key metric (the KPIs) in detail, explaining why it matters and how it’s calculated. This section is essentially the glossary of metrics with rationale. It will likely be sub-divided into the metrics categories:

Latency Metrics: Define how we measure latency from the user’s perspective (e.g. from prompt submission to final token of response rendered). Explain components of latency (model computation, DECIPHER processing, rendering) and how we capture them. We’ll mention target values (ideal average <1s, P95 <2s as per design goals
GitHub
) and how exceeding them triggers flags. Possibly introduce a JSON snippet of a latency report.

Throughput & Frame Rate: Discuss the 60Hz frame update and what we consider a “frame drop” or slowdown. E.g., define average FPS and frame_drops per minute. Include how we compute these in code (maybe instrument the render loop with a timestamp delta). Link it to user experience – smooth visuals need this metric high. Reference the design goal that frame budget is 16ms
GitHub
, and how we’ll watch it.

Energy Fidelity: Using the content from FND-006, formalize this metric. “Energy Fidelity = (Visualized Energy / Actual Energy) within a timeframe.” We’ll describe possible ways to quantify it: counting particles vs. tokens, measuring UI update frequency vs. ideal. Acknowledge it’s somewhat qualitative but we make it quantitative
GitHub
. Possibly mention we might also incorporate user feedback in this metric (like a user could rate if the visuals felt laggy, feeding into an aggregate score).

Progression Rate: Explain how we measure a user’s progression (levels gained or XP per hour, etc.). Tie it to game design: too high or low signals an imbalance. Show maybe an example: “User leveled from 3 to 4 in 2 hours, so 0.5 levels/hour this session”. We’ll mention capturing this per session and overall averages.

Error & Reliability Metrics: Define metrics like error_count per session (covering system or module errors), uptime (how long since last restart), and any anomaly counts (like how many times the orchestrator had to restart a plugin, or how many times a frame was skipped due to overload). These metrics ensure we’re aware of stability issues. For each, describe how the data is collected (e.g. hooking into exception handlers or using the event log to count error events).

Resource Utilization (if any): Possibly mention tracking CPU/GPU usage or memory as part of observability (though not explicitly in prompt, but often part of metrics). We could say we track basic system stats to correlate (like if CPU at 100%, latency will spike – having that context in the dashboard is useful).

This section solidifies what we monitor. It should be precise enough that later in implementation one could create a schema or code to gather these. It will reference governance targets (e.g., “per governance, 95% of latencies should be under 2s
GitHub
, so we set that as a threshold in the alert config”).

Section 3: Metrics Pipeline Architecture
Purpose: Describe how metrics are collected, processed, and stored in the local-core architecture. This is the systems design part, likely with an architecture diagram (Mermaid flowchart) to illustrate the data flow:

We introduce the Metrics Collector component (could be part of the Energy Service or Orchestrator, or a dedicated module). For example: “During each 60Hz frame, the Decipher engine and other components emit raw events – token processed, frame rendered, etc. The Metrics Collector intercepts these (or subscribes to them) and aggregates relevant values.” We’ll detail:

Data Sources: list where the data comes from. E.g., DECIPHER (Tech-005) provides number of tokens per frame and frame time; the WebSocket server (Tech-003) might provide if any message queue backpressure; the Orchestrator provides session info (level ups, etc.); the Security module might report any policy violations which count as anomalies. Each source feeds metrics.

In-Memory Aggregation: explain if we accumulate metrics in memory for real-time (e.g., maintain counters or a sliding window of last N seconds for smoothing). Possibly we use a lightweight pub-sub internally where various subsystems push metrics events (like “frame_render_time 14ms”).

Local Storage: articulate how frequently we persist metrics to disk. For example, we might take a snapshot every X seconds or at session end. Or continuously stream into the database’s metrics table. Consider the volume: 60Hz metrics might be too fine-grained to log every frame, so perhaps we log summary per second or significant events. We’ll mention using the Tech-004 database: e.g. a table metrics_snapshot with columns for timestamp and all metric values at that moment
GitHub
. Perhaps also a metrics_event table for discrete events like “alert triggered” or “session end summary”.

Mermaid Diagram: We’ll include a diagram like: Decipher/Orchestrator -> (Metrics Collector) -> Local DB (metrics table); -> WebSocket -> Dashboard UI. Also showing plugin metrics: Plugin -> sandbox API -> Metrics Collector. And possibly an arrow for optional export: Local DB -> export file (user-initiated).

We emphasize that all processing is local: the diagram and description should show no external arrows. Also highlight efficiency: e.g., Metrics Collector runs asynchronously so as not to stall the 60Hz loop (maybe it processes on a separate thread or after sending frame to UI, it logs metrics).

This section also covers how metrics data aligns with the event-sourcing model. For instance, mention that each metrics entry could reference a frame ID or session ID to join with event logs, enabling later analysis (like correlating a spike in latency with a specific event type). We ensure schema consistency – probably referencing a simplified JSON schema snippet for a metrics entry (like the one in FND-006
GitHub
).

Additionally, mention log rotation: e.g., “The metrics system writes to metrics.log in JSON lines; when it exceeds 10MB or on each new session, it rotates to metrics.log.1 etc., keeping the last N files.” If using DB, maybe less an issue, but we might implement pruning (e.g., keep only last 100 sessions’ data, or auto-archive older data to a compressed file).

Section 4: Web UI Dashboard & Visualization
Purpose: Specify the design and features of the Observability Dashboard that’s built into the WIRTHFORGE web interface. This section is more front-end oriented. We will describe:

Dashboard Layout: e.g., a dedicated tab or panel in the UI that shows multiple widgets. Possibly one widget is a real-time line chart of system latency (updating as you use the system), another is a speedometer gauge for current FPS, another a bar graph for energy fidelity, and maybe a timeline or table for recent alerts.

Real-Time Updates: Explain how the data gets to the UI. Likely via the WebSocket (Tech-003). We might define a special WebSocket channel like metrics.* that pushes updates at a lower frequency (maybe 1-5Hz refresh for charts, since 60Hz raw might be too much). Alternatively, the UI could poll an API endpoint every second. We’ll justify using WebSocket for efficiency and push-based updates. We ensure that this data is lightweight (maybe sending small JSON with current values).

Historical View: Not just live data – the dashboard should allow the user to see historical trends. We discuss storing perhaps hour/day granularity data for longer-term charts. For example, the user might switch to a “Past 24h” view to see how their session performance changed. Or at least, when a session ends, the UI could display a summary (like “Session Summary: avg latency 1.2s, fidelity 93%, energy generated 5000 units”). We’ll outline how the UI can query the local database for these summaries (via an API call).

Mockup or Example: Provide an illustrative example of what the dashboard displays. For instance:

“Performance Graph: A live chart plotting the last 60 seconds of frame time (ms) – ideally flat around ~16ms, with spikes highlighted in red if above 20ms.”

“Energy Fidelity Meter: A circular gauge reading 0-100% indicating current energy fidelity. It might slowly drop if the visual system falls behind, and a green zone indicates 90-100%, yellow 80-90%, red below 80%.”

“Latency Stats: A panel showing current query count, average response time, 95th percentile, etc., updating as each prompt completes.”

“Progress & Usage: A small summary like ‘Level 3, 1200/1500 XP (Progression rate: 0.8 levels/hour)’ and perhaps ‘Tokens this session: 10,234’ to give a sense of usage.”

“Alerts Log: If any alerts have fired, a list like ‘[Time] Warning: Frame rate dropped below 50 FPS for 5s’.”

We ensure the design is user-friendly and non-intrusive. The dashboard might be hidden by default or collapsible, so power users can open it when needed but novices aren’t overwhelmed. When an alert triggers, maybe a small icon or indicator nudges the user to open the dashboard for details.

Additionally, address the technology: since it’s web UI, likely implemented in React (per stack info) with maybe D3 or Chart.js for graphs. We won’t delve into code, but mention that charts are rendered using standard libraries and efficiently updated via state management (we have to ensure updating at ~1Hz doesn’t stutter the UI itself).

Finally, note that this dashboard itself should be efficient – rendering charts shouldn’t bog down the browser. Perhaps we’ll mention using Web Workers for heavy processing if needed, or limiting the amount of data shown (e.g., down-sampling long history).

Section 5: Alerts, Thresholds, and Adaptive Responses
Purpose: Detail the configuration and behavior of the alerting subsystem. This includes:

Threshold Configuration: Outline what thresholds are set out-of-the-box, referencing governance or sensible defaults (like fidelity < 90%, latency P95 > 2s, frame rate < 55FPS sustained, error count > X per hour, progression rate too low/high relative to expected). Provide a snippet of a possible alert policy config, e.g.:

alerts:
  frame_rate_drop:
    threshold: 55   # FPS
    duration: 5s    # sustained for 5 seconds
    action: notify_ui
  latency_spike:
    threshold: 2000 # ms P95
    action: log_and_notify
  energy_desync:
    threshold: 0.8  # fidelity ratio
    action: notify_ui
  plugin_error:
    threshold: 3    # errors per minute
    action: notify_ui_and_banner


Explain each field: threshold values are chosen initially by dev governance team, but user can tweak via editing this file or through an advanced settings UI.

Detection Mechanism: Describe how the system checks these. Possibly the Metrics Collector evaluates conditions every second or after each frame for frame-related ones. Some conditions need a time window (e.g. average over last N seconds). We might implement a simple rules engine or just hard-code checks.

Alert Actions: Enumerate what happens when an alert triggers:

UI Notification: a visible indicator or modal. For minor warnings, maybe just a colored icon or text in the dashboard (e.g. turning the FPS counter red). For major ones, a popup or banner (“Performance Alert: Low Frame Rate”).

Logging: Every alert event is written to an “alerts.log” or the audit log, with timestamp and details, for later analysis
GitHub
. For example, an entry: {time:..., type: 'ALERT', metric: 'latency', value: 2500ms, message: '95th percentile latency exceeded threshold'}.

Local Notification: On some systems, we could use OS notifications (if running as an app or electron, perhaps). This is optional but could be useful if the user is not looking at the UI (though WIRTHFORGE UI is the main interface, so maybe not leaving it).

Automated Response: This ties into the idea of adaptive behavior from governance. We describe that some alerts might trigger the system to take action autonomously. For instance, if frame rate drops (and the cause is likely heavy visuals), the system could automatically reduce particle effects or resolution to recover
GitHub
. Or if latency is high because a large model is used, maybe the system offers to switch to a smaller model or engage the Broker (if available) – though that latter involves sending data out, so maybe just a suggestion to the user. We make clear any such action will be transparent and in line with user settings (no unexpected changes without user knowledge). Essentially, we implement some of the Orchestrator Adaptors hinted in FND-006
GitHub
: small feedback-loop adjustments. List a couple of examples of adaptors:

Frame Protection Mode: auto-activate if FPS < 50 (turn off some non-critical rendering, log “visual effects reduced for performance”).

Throttle Logging: if an error is happening too frequently (e.g. a plugin spamming errors), maybe temporarily pause that plugin or reduce its frequency, to stabilize system until user intervenes.

Guidance Prompts: if progression is extremely low (user stuck), maybe the system can surface a tip or increase rewards slightly (though actual game mechanic changes might be more in orchestrator domain than metrics – we can mention it as future possibility).

Governance and User Control: Emphasize that the thresholds and responses align with governance policy (e.g., any automatic adjustment still must not violate core principles – we won’t, say, disable the UI or break energy truth even if under load; we’ll degrade gracefully within allowed bounds). And users (especially advanced users) can adjust these or turn off auto-adaptations if they prefer manual control. The system is meant to assist, not wrest control away.

After this section, the reader should understand how WIRTHFORGE not only monitors but also reacts to maintain an optimal state, and how those reactions are configured.

Section 6: Privacy and Data Governance in Metrics
Purpose: Reiterate and detail how we uphold privacy in the context of observability. This section drills into the data collected and proves that we’re not collecting more than necessary or exposing it improperly.

Data Minimization: Go through each metric and ensure we are not logging sensitive info. For example, user prompts – we do not log the text of prompts in metrics, only perhaps length or a hash as needed (as seen in state management specs where prompt text is hashed for audit
GitHub
). AI responses – not logged at all in metrics, since metrics care about timing and count, not content. If we track “intent” or something, it’s anonymized or categorized, not raw. Essentially, confirm that metrics logs can’t be later mined to reconstruct what a user was specifically writing or asking – they can only show performance numbers and usage patterns. We can cite FND-006’s statement that sensitive content is omitted or hashed
GitHub
 as a guiding rule. Possibly mention that even the progression metric doesn’t directly reveal what the user did, just how far they got.

Local Storage & Access: All metrics reside on the user’s machine. We describe how they are stored (if DB, then it’s in the same DB file on local disk; if flat file, it’s in the WIRTHFORGE app directory). No external entity can access this unless the user manually shares it. The UI dashboard fetches from localhost, which is secure as per TECH-006 (with authentication token, etc., ensuring that even another app on the machine can’t easily snoop on the metrics feed). We ensure that if the user closes WIRTHFORGE, the metrics data remains in their possession.

Optional Cloud Sharing: If WIRTHFORGE ever introduces a feature to share metrics (for support or community), describe how that would work safely. Likely via the Broker or via exporting a file that the user can upload. Make it clear that by default this is off. If a user opts into, say, “anonymous usage statistics” (which some apps have), WIRTHFORGE would still anonymize data and perhaps aggregate on the client side first. We might mention possible integration with a secure community server for sharing scores or something, but emphasize that any such integration must pass the user’s consent and follow the policies (for example, the data might be stripped of any unique device IDs, etc.). Actually, since WIRTHFORGE is local-first, they might not do any cloud stats at all, which is fine to state.

Compliance and Audit: Note that because all this data is local, compliance with privacy laws is straightforward (no third-party processors, etc.). Also, for the user’s peace of mind, they can inspect the raw metrics logs themselves – it’s not hidden. And if they want, they can delete them. We have to ensure some retention policy that doesn’t accidentally hoard data forever. Perhaps by default, only the last N sessions metrics are kept, or the user can purge via a UI or CLI (maybe tying into Tech-004’s backup/cleanup tool
GitHub
). We also propose that metrics and audit logs be tamper-evident or at least append-only (per governance suggesting possibly signed logs
GitHub
). Implementing full log signing might be advanced, but we could mention a simple approach like using checksums or just documenting that the logs are plain text and user-editable (since it’s local, the user has right to modify them, but then can’t be fully trusted for support purposes unless we sign—but that’s beyond this spec’s immediate scope perhaps).

Security of Data in Transit: If we are using WebSockets for metrics to UI, consider encryption. On localhost, one might skip TLS, but TECH-006 posited even local TLS for maximum security
GitHub
. We mention that if the user enables HTTPS for the local server, the metrics data is also encrypted in transit, preventing any local network spyware from sniffing it (though on localhost this is mostly theoretical).

This section assures that observability doesn’t become the “trojan horse” of data leakage – we actively design it to respect the user’s privacy and the trust model of WIRTHFORGE.

Section 7: Synthesizing Insights – Using Metrics for Improvement
Purpose: Conclude with how the metrics system closes the feedback loop for both users and developers (governance). It’s a forward-looking section that ties everything together and projects how this will be used:

User Empowerment: Describe a scenario where a power user uses the metrics to optimize their setup. E.g., they notice their old laptop often dips to 45 FPS, so they decide to upgrade RAM or adjust WIRTHFORGE settings (like disabling a heavy plugin) to get back to smooth 60Hz – all informed by metrics. Or a user sees they consistently have 1.8s latency and decides to try a smaller model for faster responses. The system essentially teaches the user how to get the best experience.

Development & Governance: Explain how the WIRTHFORGE team (or advanced community members) will analyze the collected metrics (with user permission if needed). Perhaps offline, a developer can ask a user to export their metrics log when diagnosing an issue. Or governance can aggregate volunteer submissions to see average progression rates, finding that “door 2 (parallel streams) is too challenging since progression stalls there” and thus adjust the difficulty via an update. This highlights that the metrics aren’t just numbers – they guide decision-making. We can reference how FND-006 envisioned continuous self-measurement to adapt the system
GitHub
GitHub
.

Adaptive Future: Touch on how this observability lays groundwork for more advanced features. For example, an AI assistant within WIRTHFORGE could monitor metrics and proactively adjust settings (imagine an AI ops agent that tunes the system for the user’s hardware over time). Or the metrics could enable a “benchmark mode” where WIRTHFORGE tests the device and suggests optimal configurations (e.g., telling the user “Your system might handle an extra small model in the Council, as your CPU usage is low”). These are beyond this spec’s immediate scope, but show that with metrics in place, many possibilities open up.

Integration with Other WIRTHFORGE Modules: Briefly mention any remaining integration points, e.g., Tech-010 (performance tuning) will directly consume the outputs from this metrics system for automated capacity planning algorithms or simulation. And Ops documentation will instruct how to read these metrics. So this system becomes a fundamental part of using WIRTHFORGE effectively.

Finally, wrap up by reinforcing the core achievement: WIRTHFORGE will not be a black box on the user’s desk – it will be a transparent, introspective entity. The user can trust it not just because we say so, but because they can see proof of performance and privacy in real time on their own screen. And as WIRTHFORGE grows (new features, plugins, etc.), this observability framework ensures we stay accountable to performance and user experience. In essence, WF-TECH-009 weaves a safety net and a stethoscope into the fabric of WIRTHFORGE’s local-core heart, so it can monitor its pulse and continue to thrive without ever needing to phone home.