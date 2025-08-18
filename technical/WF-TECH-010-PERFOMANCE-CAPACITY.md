WF-TECH-010 — Performance & Capacity

WF-TECH-010 — Performance & Capacity

🧬 Document DNA

Unique ID: WF-TECH-010

Category: TECH (Performance & Capacity Specification)

Priority: P0 (Ensuring fluid user experience across all hardware)

Development Phase: 1 (Initial design & benchmarks)

Estimated Length: ~4,000 words

Document Type: Technical Specification (Optimization & Capacity Planning Guide)

🔗 Dependency Matrix

Required Before This:

WF-TECH-001 – Automated Local Startup (hardware detection & baseline orchestration)
GitHub
.

WF-FND-002 – Energy & Consciousness Framework (defines performance metrics like tokens/sec, TTFT)
GitHub
GitHub
.

WF-FND-006 – Governance & Evolution (sets 60 FPS invariant, self-monitoring requirements)
GitHub
GitHub
.

WF-TECH-009 – Observability & Metrics (instrumentation to measure latency, frame rate, resource usage)
GitHub
.

Enables After This:

WF-OPS-001 – Deployment & Scaling Guide (best practices for hardware provisioning and scaling).

WF-OPS-002 – Monitoring & Maintenance (using performance dashboards and alerts defined here for ongoing health checks).

WF-BIZ-003 – Capacity & SLA Planning (translates technical benchmarks into user-facing performance guarantees).

Cross-References:

WF-FND-003 – Core Architecture Overview (outlines hardware tiers and adaptive design)
GitHub
GitHub
.

WF-TECH-007 – Testing & QA (defines performance test cases and regression criteria).

WF-TECH-008 – Plugin Architecture & Sandbox (for performance isolation and plugin resource limits).

WF-UX-006 – UI Component Library (techniques for high-FPS rendering and graceful degradation on low-tier devices).

🎯 Core Objective

 

Establish a comprehensive performance optimization strategy and capacity planning framework for WIRTHFORGE’s web-enhanced local-core system across a spectrum of hardware tiers. This specification ensures the platform delivers a smooth 60 FPS experience under real-world loads and scales predictably as computational demands grow. We define how to classify hardware into Low/Mid/High tiers with tailored settings, set concrete performance benchmarks (e.g. tokens per second throughput, latency to first token) for each tier, and provide tuning procedures to meet these targets
GitHub
GitHub
. Additionally, we outline capacity planning formulas and auto-scaling heuristics so the system can adapt to heavier workloads (such as plugin-intensive scenarios or multi-model “Council” sessions) without compromising responsiveness. By consuming the principles from FND-002 (energy & performance metrics) and FND-006 (governance constraints), this document ensures WIRTHFORGE can optimize locally on diverse machines while honoring core invariants (e.g. no feature may break real-time frame budget of ~16.7 ms
GitHub
). Ultimately, WF-TECH-010 enables scalable deployment of WIRTHFORGE with predictable performance, providing users a magical, consistent experience whether on a modest laptop or a high-end workstation.

Hardware Tier Classification & Specifications

WIRTHFORGE is designed to run on a range of hardware profiles. We define three primary hardware tiers – Low-End, Mid-Tier, and High-Tier – each with specific resource characteristics and corresponding system behavior adjustments. The system auto-detects the host machine’s tier at startup and tunes itself (e.g. enabling/disabling features) to maintain performance
GitHub
GitHub
. Below we outline each tier’s typical specs and the adaptive measures WIRTHFORGE takes to optimize performance:

Low-End Tier (Baseline / CPU-Only)

Hardware Profile: Modest CPU (2–4 cores, no discrete GPU), ~8 GB RAM. Often integrated graphics or very low-end GPU.

Model Constraints: Uses smaller AI models (≈3 billion parameters or less), likely quantized for efficiency. Only one model generation at a time is allowed (no parallel AI “council” on this tier) to avoid overloading limited CPU resources
GitHub
. If a second request comes while one is running, the orchestrator queues it rather than spawning another heavy process.

Adaptive Behavior: The system runs in a lightweight mode to sustain responsiveness. Real-time visual updates may be throttled to ~30 FPS if 60 FPS cannot be maintained reliably
GitHub
. Visual effects are simplified (e.g. fewer particles, simpler shaders or using Canvas instead of heavy WebGL) to reduce GPU strain. Non-critical background computations (e.g. detailed resonance analytics) are disabled or run at lower frequency to preserve the 16.7 ms frame budget
GitHub
. The orchestrator might use longer smoothing windows for metrics (e.g. averaging tokens/sec over a broader interval) to reduce computation overhead.

Memory Management: Very conservative. Only one model is kept in memory at a time – WIRTHFORGE will unload models from RAM when not in use to free memory for the next operation
GitHub
. This can introduce small load times when switching models or tasks, which the orchestrator communicates via UI events (“Loading model…” notifications). The system ensures a safety margin (e.g. keeping memory usage under ~80% of available RAM) to prevent OS swapping or crashes.

Performance Benchmarks: Throughput ~ 30 tokens/second sustained generation is the target on low-tier hardware (after warm-up). Latency to first token (TTFT) is expected around 1.0–1.5 seconds on average for a standard prompt
GitHub
. Frame rate should remain >=30 FPS with no dropped frames visible to the user (any dropped frames are caught and compensated minimally). These targets ensure a usable experience even on minimal setups.

Mid-Tier (GPU-Enabled, Balanced)

Hardware Profile: Moderate system with a decent GPU (e.g. a laptop/desktop with one mid-range GPU), multi-core CPU (4–8 cores), ~16+ GB RAM, and GPU VRAM on the order of 6–12 GB.

Model Capabilities: Can run multiple models in parallel (2–3 concurrent) thanks to GPU acceleration
GitHub
. Typical model sizes in this tier range up to ~7B–13B parameters each. The orchestrator intelligently manages model loading: for example, two 7B models might run concurrently if VRAM permits, whereas a single 13B model might consume most of the GPU – in which case WIRTHFORGE would run one at a time or use CPU for a second model if needed.

Adaptive Behavior: The full 60 Hz real-time loop is maintained on mid-tier – the system comfortably handles a 60 FPS update rate with high visual fidelity. Advanced features start to activate: for instance, the Council concept (parallel models deliberating) becomes viable. Orchestrator can spawn two models simultaneously to compare answers or have them “race,” creating rich interference patterns for the user
GitHub
. The energy computation loop (Layer 3) runs at fine granularity, detecting nuanced events (e.g. slight resonance or disagreements between models) without bogging down. The UI enables higher-quality effects (WebGL particle effects, smooth animations) since the GPU can handle it. Backpressure strategies are still in place: if the combined token stream is very fast (e.g. 3 models each streaming ~50 tokens/sec, ~150 TPS total), the system can still render ~2–3 tokens per frame at 60Hz comfortably
GitHub
. In rare spikes beyond that, tokens might be buffered for the next frame, but no noticeable lag should occur.

Memory & VRAM: Multiple models can reside in memory. The orchestrator keeps as many models loaded as make sense for the user’s workflow, up to VRAM limits. For example, it might keep two medium models in VRAM for quick switching or parallel runs, unloading only if a new model would exceed memory. CPU RAM usage is also monitored – mid-tier devices usually have headroom, but WIRTHFORGE still avoids using more than ~80% of RAM. If GPU memory is saturated, the system might automatically fall back to CPU inference for additional models or prompt the user to close some sessions.

Performance Benchmarks: Throughput target is around 80 tokens/second per model, or roughly 100–150 TPS combined in multi-model scenarios
GitHub
. P95 latency for a prompt completion is aimed < 2 seconds (most prompts finish within 2s 95% of the time)
GitHub
. Frame rate remains a solid 60 FPS with virtually no perceptible frame drops (allowing <5% of frames to render late in extreme cases). This tier is the baseline for the “full” WIRTHFORGE experience – users should enjoy rich visuals and fast responses concurrently.

High-Tier (Power User / Multi-GPU)

Hardware Profile: High-end workstation or server-class hardware. This typically means one or more high-performance GPUs (multi-GPU or very large VRAM single GPU), 8+ CPU cores, 32+ GB RAM, and possibly specialized accelerators. VRAM might be 16–40+ GB total across GPUs.

Model Capabilities: Unlocks WIRTHFORGE’s full potential. The system can deploy a “full council” of models – e.g. 4–6 models running in parallel – to collaborate on tasks
GitHub
. Larger model sizes (13B–30B or more) become feasible, and multiple can run concurrently (e.g. one 30B model on GPU1, two 13B models on GPU2, etc.). If supported, models might even be sharded across GPUs for a single large model, though by design WIRTHFORGE emphasizes heterogeneity (several different models) over single-model distributed training.

Adaptive Behavior: On high-tier hardware, no compromises are needed on quality or features – all visual effects, analytics, and background processes run at full tilt. The orchestrator (Layer 3) can handle many parallel streams, possibly spawning helper threads or GPU jobs for heavy calculations (like cross-model correlation for advanced resonance detection) without missing a beat
GitHub
. The UI can render complex scenes (thousands of particles, multi-pane dashboards, real-time graphs) at 60 FPS consistently. If anything, the software might offer enhanced visuals or additional info at this tier (comparable to “ultra” graphics settings in games). For instance, a Level 5 user interface might display a 3D “energy field” visualization or multiple simultaneous text outputs, features that are only practical with ample GPU power
GitHub
.

Dynamic Scaling: The system auto-detects this tier and may notify the user that advanced mode is enabled (e.g. “High-tier hardware detected – enabling council of 5 models and maximum effects” as a startup message
GitHub
). Conversely, if the user toggles to a lower performance mode, it can scale down. The architecture remains fundamentally the same, but all concurrency limits and quality settings are raised to utilize the available headroom.

Performance Benchmarks: Throughput on high-tier is expected to reach 200+ tokens/second combined without breaking a sweat (for instance, 4 models × 50 TPS each, or a single large model streaming 200 TPS). Individual model throughput could be higher (a single large model might stream faster due to powerful GPUs). Latency is largely bounded by model complexity; however, even large models should achieve first token in ~1 second or less on such hardware (assuming models are loaded in memory). End-to-end prompt responses often feel instantaneous, with P95 latencies around 1.0–1.5 seconds. Frame updates remain at 60 FPS locked, and even under extreme loads (multiple models + heavy UI rendering) the system should stay above ~55–60 FPS at all times (with adaptive frame timing if needed to avoid any perceptible jitter).

Note: WIRTHFORGE also contemplates a Hybrid “Broker” mode beyond these local tiers, where a low/mid device can offload heavy model computation to a remote server (cloud or LAN). In such cases, the local core still orchestrates and renders the experience, but treats the remote model inference as an extension of Layer 2. This introduces network latency and is opt-in, so it’s considered a special case for future scalability. The primary focus of performance tuning remains on local hardware optimization for the three tiers above, in line with the project’s local-first ethos.

Performance Benchmarks & Target Metrics

To quantify performance goals across tiers, we define specific target metrics that the system should achieve or exceed. These benchmarks serve as both design guidelines and testing acceptance criteria:

Throughput (Tokens per Second, TPS): The number of output tokens the system can generate per second. This is measured in a steady-state generation (after initial token). Targets are tier-based: roughly 30 TPS on Low, ~80 TPS on Mid, and 200+ TPS on High-tier hardware, as described above. These figures assume a single-model session; multi-model “council” sessions on higher tiers may reach higher combined TPS (with the caveat of increased load per frame)
GitHub
. The Energy function normalizes TPS into a 0–1 range using tier-specific max values
GitHub
 – ensuring, for example, that what constitutes “fast” (1.0 energy for velocity) is calibrated per profile (a low-tier might use 20 TPS as 100%, whereas a high-tier might use 200 TPS) for meaningful comparisons.

Latency Metrics: We focus on Time-to-First-Token (TTFT) and Prompt Completion Latency. TTFT is the delay from the moment a prompt is submitted to the first output token. We aim for TTFT under ~1.5 s on Low, ~1.0 s on Mid, and ~0.5 s on High-tier (for a moderately sized model). FND-002 suggests a reasonable default range of 500–1500 ms for TTFT depending on profile
GitHub
. Meanwhile, P95 latency (95th percentile time to fully generate a typical prompt response) should stay within ~2 s on mid-tier hardware
GitHub
, and ideally <3–4 s even on low-end for standard-length queries. These targets ensure users rarely wait long for answers; any outlier (very large input or complex task) is handled via progress indicators or by streaming partial results so the user isn’t left idle.

Frame Rate & Visual Smoothness: A core invariant is maintaining a ~60 FPS visual update rate to preserve the illusion of a “living” system
GitHub
. Performance is measured by frame render time (should remain ≤16.7 ms for 60Hz). We target zero dropped frames during normal operation on Mid/High tiers, and no more than minor frame rate dips on Low tier (dropping to ~30 FPS if absolutely necessary, but never stuttering or freezing). The system monitors frame times; if the rendering pipeline falls behind (e.g. consistently exceeding budget), adaptive measures trigger (discussed below) to recover smoothness.

Resource Utilization: Efficient use of hardware is tracked to avoid bottlenecks. Metrics include CPU and GPU utilization %, memory usage, and VRAM usage. As targets, WIRTHFORGE should utilize available CPU/GPU to maximize performance, but also keep headroom to avoid system instability. For instance, CPU utilization might target ~70–80% during heavy generation (leaving some for OS and UI), and GPU utilization similarly high but not at 100% sustained (to prevent thermal throttling). Memory usage target is to stay below ~80% of physical RAM/VRAM to prevent swapping or OOM issues. These are guidelines rather than hard limits; the system’s resource monitor will raise warnings if usage consistently exceeds safe thresholds (see Monitoring section).

Error Rates & Stability: Although not a performance metric in throughput terms, the system’s stability under load is crucial. Error rate (e.g. generation processes crashing, timeouts) should be effectively 0 in normal conditions. Under stress tests (max parallel models, plugin-heavy operations), the system should fail gracefully if needed (e.g. cancel least important tasks, out-of-memory triggers a controlled unload rather than a crash). Stability is measured by observing no unhandled exceptions or orchestrator restarts during prolonged high load sessions
GitHub
. Any regression in stability at high load is treated as a performance bug.

These benchmarks are used in both design validation and testing. The QA team (per WF-TECH-007) will incorporate automated tests to verify that each release meets these numbers (for example, a test that generates 100 prompts on a mid-tier reference machine and checks that average TPS and 95th percentile latency meet targets, or that frame rate never falls below 60Hz more than e.g. 1% of the time). Any significant deviation will be flagged, and the release will not be approved until performance is back within the expected range – reflecting the governance mandate that core invariants like frame rate must not be compromised
GitHub
.

Capacity Planning Guidelines & Formulas

Even though WIRTHFORGE runs on a single user’s machine (local-first), capacity planning is vital to ensure the system scales within that local environment as complexity increases. Here we outline how to plan for capacity in terms of processing load, memory, and parallelism, including some simple formulas and heuristics:

Throughput Capacity (Processing Load): The primary workload driver is token generation. We define a notional capacity unit as handling one token stream at a target rate (e.g. 50 TPS). A machine’s capacity in units can be estimated from its hardware specs. CPU-only formula: as a rough estimate, Capacity_units ≈ (# of CPU cores) * (base single-core TPS / 50) (with base single-core TPS measured on a reference model). For example, if one core yields ~10 TPS on a given model, a 4-core CPU might handle ~0.8 capacity units (~40 TPS) before saturating. GPU formula: Capacity_units ≈ (GPU_FLOPS / reference_FLOPS_per_unit) – essentially proportional to GPU compute power. In practice, these formulas are refined by benchmarking: WIRTHFORGE includes a benchmark mode that can test the device and empirically measure its TPS and latency, then classify the tier and capacity. For instance, the system might run a short generation and determine “this machine can sustain ~35 TPS with the default model,” which informs how many parallel tasks it should allow.

Parallel Model Scaling: For multi-model scenarios (the Council), capacity must account for concurrent loads. In ideal scaling, two models double the TPS, but in reality they compete for resources. A simplified rule: Effective TPS ≈ TPS_single * N / (1 + (N−1)*α), where N is number of parallel models and α is a contention factor (0 ≤ α ≤ 1). If α=0 (perfect scaling with independent resources), N models produce N×TPS. If α=1 (fully contend for same resource), N models still produce ~TPS_single (no gain). In our experience, α is around 0.3–0.5 on mid-tier GPUs (some contention), meaning two parallel models yield ~1.5× throughput of one. This heuristic guides the orchestrator: e.g. if adding a third model only increases throughput marginally (because of contention), it might be better to hold at two to save energy or reduce complexity. These rules feed into auto-scaling heuristics – the system can monitor actual throughput gain vs. number of models and decide to spawn or stop additional parallel generations dynamically.

Memory & VRAM Planning: Use a budgeting approach. Let M = total RAM, V = total VRAM. Dedicate slices for each major component: e.g. Model (for loaded model weights and context), Data (for user data, event buffer, caches), Overhead (OS, others). A simple guideline: allocate ~50–60% of RAM to the main model runtime, ~20% for data/caches, leaving ~20–30% overhead. For VRAM, typically the model will use the majority (especially if large), but we ensure ~10–20% VRAM remains free for intermediate activations, parallel tasks, and graphics. A formula can be: Max_model_size ≈ (0.8 * V) / (bytes_per_param) where bytes_per_param depends on model precision (e.g. 1 byte/param for int8 quantized, 2 bytes for 16-bit). If a user tries to load a model that would exceed this, the orchestrator should refuse or swap something out. Similarly, Max_concurrent_models ≈ V / (model1_VRAM + model2_VRAM + ... ) – if the sum of VRAM required exceeds 0.8V, that combination isn’t allowed concurrently. These calculations are done in real-time: the orchestrator knows the VRAM footprint of each model and will prevent launching a new model that would exceed safe capacity (instead queuing it, or unloading an inactive model to make space).

Auto-Scaling & Throttling Heuristics: Capacity planning is not one-time; WIRTHFORGE continuously balances load. If metrics show the system running well below capacity (e.g. GPU at 50%, low frame times), it could scale up quality or parallelism – for instance, upping visual effects or allowing a second model to run (perhaps even automatically suggesting, “Your system is underutilized; enabling an extra council member”)
GitHub
. Conversely, if the system approaches limits (high CPU/GPU, rising latency), throttling kicks in. Throttling rules include reducing generation speed (some model APIs allow reducing token rate), pausing non-critical tasks (e.g. background logging), or gracefully degrading visuals. We define thresholds like: if average frame time > 20ms or sustained CPU > 90% for 10s → trigger performance mode (e.g. reduce effects, as per governance “dynamic quality reduction” guidelines
GitHub
). Similarly, if memory usage > 90% → delay new model spawns and flush caches. These rules ensure the system stays within capacity and self-corrects before hitting a hard failure.

Planning for User Demand: In multi-session or prolonged use scenarios (though single-user, they might run long sessions or multiple tasks sequentially), we use capacity metrics to predict when the user might need to upgrade or adjust. For example, if a user frequently hits the limits on a low-tier machine (lots of prompts queuing, or repeatedly entering “performance safe mode”), that is a signal for capacity planning – perhaps recommending the user consider using a higher tier or enabling the hybrid mode. While not a cloud service, we still consider “SLA” style planning for user experience: e.g., for a given hardware tier, the system can handle X tokens/day comfortably. If user demand exceeds that (like extremely heavy usage), planning might involve guidance to the user (notifications about high load) or auto-adjusting retention of data (maybe shorten event history to save memory, etc.). In essence, we treat the local machine's capabilities as a quota to be wisely managed, extending typical server capacity planning thinking to personal hardware.

Performance Tuning Playbooks & Procedures

Achieving and maintaining the performance targets requires a systematic approach to tuning. We outline playbooks – step-by-step procedures – for various scenarios to optimize WIRTHFORGE’s performance:

 

1. Baseline Performance Tuning:

Step 1: Benchmark Current Performance. Begin by measuring key metrics on the target hardware: run a standard prompt or a dedicated “stress test” prompt and record TPS, latency, frame rate, CPU/GPU utilization. Use the built-in metrics dashboard (from TECH-009) to gather this data
GitHub
. This establishes a baseline.

Step 2: Identify Bottlenecks. Determine the limiting factor: If CPU usage is maxed while GPU is idle, the bottleneck might be CPU (perhaps the model is CPU-bound or code needs optimization). If GPU is maxed out (common on mid-tier when using large models), the model inference is the constraint. If neither is fully utilized but frame rate is low, the issue could be in the UI/rendering pipeline. Also check memory: if the system is swapping or garbage-collecting, memory could be a bottleneck.

Step 3: Apply Targeted Optimizations. Depending on the bottleneck:

CPU-bound: Enable more parallelism if possible (use multi-threaded BLAS for model math, or move some tasks to GPU). Ensure the orchestrator isn’t doing heavy work on the main thread (offload computations to background threads or async tasks). Consider quantizing models or using a smaller model to reduce CPU load.

GPU-bound: If the GPU is overloaded, consider reducing model size or precision (float16 instead of float32, etc.), or limit the number of concurrent models. Alternatively, reduce the graphics load: e.g. lower the resolution of any WebGL textures, or the particle count in visuals. On a multi-GPU system, ensure the load is balanced (maybe dedicate one GPU to model inference and another to rendering if possible).

I/O or Memory-bound: If disk or I/O is slow (e.g. loading models from disk each time), pre-load models or use faster storage (SSD over HDD). For memory, increase caching for repeated loads, but if memory is tight, implement a smarter cache eviction (unload least recently used model, compress in-memory data structures, etc.). If Python garbage collection is causing hiccups, tune its frequency or explicitly invoke it during idle times.

UI-bound: Profile the front-end. Use browser dev tools to see if re-rendering is the issue. Optimize by debouncing frequent updates (e.g. update UI elements at most 60Hz), use requestAnimationFrame for animations, and ensure diff/patch algorithms (like React’s reconciliation if used) are efficient. Possibly reduce the DOM size or complexity of SVG/Canvas drawing if it’s a factor. The UI can also switch to a “Lite mode” dynamically, stripping non-essential visual flourishes when under strain.

Step 4: Verify Improvements. After each change, re-run the benchmarks to see the effect. The playbook emphasizes one change at a time to isolate impact. Continue iterating until metrics meet targets or reach an acceptable trade-off. Document the final settings used to achieve this state (e.g. “using model X in 4-bit quantization, disabled effect Y, enabled async rendering for component Z”). These become part of a performance profile for that tier.

2. GPU Utilization Optimization:

This procedure focuses on maximizing GPU throughput (for mid/high-tier systems). Techniques include ensuring batch sizes or sequence lengths are tuned for GPU memory throughput, enabling FP16 or INT8 modes for model inference to utilize tensor cores, overlapping computation with data transfer if applicable (though local and single-process, it might not be as applicable as in distributed systems). The playbook provides commands or config toggles: e.g. enabling CUDA graphs or using specific optimized model runtimes (like switching from a pure Python model to one backed by TensorRT or ONNX runtime for a boost). Each change is measured for its effect on tokens/sec. The goal is to saturate the GPU without going over memory limits. If multiple models are used, ensure they are pinned to different GPUs if available, or stagger their heavy operations so they don't all peak at once (some orchestrator scheduling can handle this).

3. Memory & VRAM Tuning:

This playbook deals with scenarios where memory is the limiter (out-of-memory errors, or garbage collection pauses). Key steps: analyze memory usage per component (the metrics system can provide a breakdown of memory by module). If the model runtime is using too much memory, consider using a smaller model or offloading some data to disk (memory-mapped files). Enable swap cautiously for large models (ensuring the OS doesn’t thrash). For VRAM, if multiple models nearly fit, experiment with model placement (some frameworks allow specifying which GPU or splitting across GPU and CPU). Also, tune context lengths of models: if the user rarely needs very long prompts, a shorter context reduces memory per token. Clear caches and release GPU memory when models unload (ensuring the frameworks actually free memory). The procedure might include how to flush the VRAM (some library calls) and checking via tools like nvidia-smi that memory is returned. After changes, run a memory stress test (e.g. load and unload a series of models, or run a long generation) and confirm the system remains stable and within memory limits.

4. Concurrency & Parallelism Tuning:

This addresses how to fine-tune the number of threads or parallel tasks. On CPU, adjust thread pools (like how many threads the model inference library uses versus how many threads the orchestrator uses). Ensure hyperthreading vs physical cores is considered (some libraries perform better when limited to physical cores). The playbook suggests trying different thread counts and measuring latency – sometimes using fewer threads can reduce context-switch overhead. For multi-model concurrency, test configurations: e.g. running two models concurrently vs sequentially and measure total time for two prompts. If sequential is nearly as fast due to overhead, the orchestrator might stick to sequential. Conversely, if parallel yields a clear win and the system copes, prefer parallel. These tuning decisions can often be codified into rules (which we covered in capacity heuristics) but the playbook ensures we empirically validate them on target hardware.

Throughout all playbooks, an underlying theme is progressive refinement: start with default settings, measure, change one factor, measure again. WIRTHFORGE’s design, via metrics and configurability, supports this iterative tuning approach. The final section of each playbook also notes how to document the tuned configuration for future reference or for shipping optimal defaults. Over time, as patterns emerge (like “on any 4-core CPU with no GPU, do X, Y, Z for best performance”), those become baked into the software defaults or at least into documentation for users.

Parallel Processing & “Council” Scaling Rules

One of WIRTHFORGE’s advanced features is the ability to run multiple AI models in parallel – conceptualized as a Council of models working together or concurrently. This section establishes rules and guidelines for scaling parallel processing in the system to ensure that adding more parallelism improves output quality or speed without degrading performance beyond acceptable limits.

Council Composition & Limits per Tier: Based on hardware tier, we set hard limits on the number of concurrent model inference processes (Council members):

Low-End: Council size = 1 (no parallel models). Low-tier devices should not attempt parallel generation; the orchestrator will serialize all requests. This avoids thrashing a low-spec CPU and keeps memory usage in check
GitHub
.

Mid-Tier: Council size = 2 (up to 2 parallel models by default, potentially 3 if models are small and resources allow). The orchestrator can run two models to enable comparative or complementary generation (e.g. two mid-sized models racing to respond, adding resilience). A third model might be allowed if each model is within half the size of what the GPU could normally handle (for example, three small specialist models). The system will weigh the benefit: if GPU utilization is still below threshold with 2, it may try a 3rd; otherwise 2 is the safe max.

High-Tier: Council size = 4–6 (configurable based on GPUs and model sizes). On very powerful setups, the council can expand to include multiple experts (for instance, a “brain trust” of models). However, even here, an upper limit (say 6) prevents excessive overhead. Coordination overhead grows non-linearly with each additional model (diminishing returns after a point), so the governance recommends capping it. Users or advanced configs might override to go higher, but by default WIRTHFORGE will not use more than 6 parallel models without manual configuration.

Parallel Scheduling Policy: When multiple models are active, orchestrator ensures that the main loop remains responsive:

Model outputs are processed in an interleaved fashion. The orchestrator may use a round-robin or priority scheme to handle token events from each model so that one fast model doesn’t starve others’ updates.

If at any time the influx of tokens from all models is too high to visualize (exceeding the frame budget consistently), the orchestrator will apply backpressure: it can temporarily slow down one or more models (if the model runtime supports adjustable generation rate or pausing token stream) or buffer the tokens and drop some visual updates (never dropping the final text output, but perhaps not drawing every single interim token if, say, 5 models each output 5 tokens in the same 16ms frame). The goal is to maintain the clarity of visualization without letting the UI get overwhelmed.

A lock-step mode might be enabled for certain Council strategies: e.g., all models process the same input and we wait until each has produced one token before proceeding to the next. This ensures synchronization (useful for analyzing divergence/convergence of answers) but can slow overall throughput. The rules allow this mode when user explicitly chooses a synchronous council analysis; otherwise asynchronous (free-running models) is default for speed.

Quality vs Quantity Heuristic: Not every additional model yields better results; sometimes it’s preferable to use fewer strong models than many weaker ones. The scaling rules embed a heuristic: only scale out if it likely improves the outcome. For example, if adding a specialized small model (like a factual checker) to a creative large model could improve accuracy with little cost, do it on mid/high-tier. But adding a redundant similar model might not justify the extra load. Performance-wise, the orchestrator will use metrics to decide: if the system can add another model and stay within latency/frame constraints, it might do so only if that model is expected to contribute unique value (determined by user settings or model profiles).

Dynamic Council Adaptation: Taking inspiration from governance policies
GitHub
, WIRTHFORGE could adjust council size on the fly. For instance, if the user’s hardware is underutilized, an AI assistant (the “Council Orchestrator”) might suggest or automatically launch an extra model (e.g., “Adding a speed-boost model to assist, since your system is idle”). Conversely, if performance metrics degrade (frame rate drop, high latency), it could deactivate one of the models temporarily: “Pausing model X to maintain performance”. Initially, these adaptations are conservative and require user opt-in or at least notification, aligning with the adaptive loop principle from FND-006 (the system self-tunes but keeps the user informed)
GitHub
. Our rules define safe triggers for this: e.g. if average frame time > 20ms for 5 seconds and council size > 1 → scale down council by 1. Or if average CPU < 50% for 30 seconds and user enabled adaptive scaling → consider scaling up council by adding a model. These thresholds prevent oscillation and ensure stability.

Parallelism Beyond Models (Threads & Tasks): In addition to multi-model councils, parallel processing in WIRTHFORGE includes multi-threading for tasks like token evaluation and energy calculations. The council rules extend to thread pools as well: the system won’t spawn unbounded threads. A general guideline: keep the number of heavy threads ≤ number of logical cores (to avoid context switching overhead). The orchestrator controls thread pool sizes for tasks (like using asyncio with a fixed thread pool executor size for any CPU-bound tasks). It uses the hardware tier detection to set these values at startup (e.g. 2 threads for low, 4-6 for mid, 8+ for high, depending on workload). This ensures parallel computations (like multiple plugin tasks or background computations) scale with the CPU’s capacity.

In summary, the Council and parallel processing strategy is one of measured expansion: use parallelism to enhance capability and speed when hardware permits, but cap and retract parallel tasks when the limits are reached to keep the experience magical and smooth. These rules prevent a scenario where “more is worse” – WIRTHFORGE will not let an enthusiastic power-user unknowingly degrade their experience by launching too many parallel models, thanks to these guardrails. All parallel features operate within the overarching requirement: real-time responsiveness and 60 FPS visuals come first; parallelism must serve that goal, not undermine it
GitHub
.

Memory & VRAM Budgeting Strategies

Efficient memory management is critical to performance and stability, especially as WIRTHFORGE deals with large model data and real-time processing. This section provides strategies for budgeting and allocating system RAM and GPU VRAM, ensuring that the platform runs within resource limits for each tier and avoids memory-related slowdowns or crashes.

Memory Profiling & Budget Allocation: At startup (and dynamically), WIRTHFORGE profiles available memory. We use a budgeting approach: e.g., on a system with 16 GB RAM, the orchestrator might reserve ~2 GB for the OS and background processes (overhead), leaving ~14 GB for WIRTHFORGE. Of that, it could earmark say 8–10 GB for model data (loading weights, tokenizer, etc.), 2–4 GB for runtime data structures (session state, event queues, cache, plugin data), and keep ~2 GB as free cushion. These proportions are adjusted by tier: Low-tier might use a smaller total footprint (it might target, say, using at most 4–6 GB out of 8 GB to be safe), whereas high-tier can use a larger percentage since absolute memory is high (e.g. use up to 28 GB of 32 GB if needed, still leaving 4 GB headroom). This budgeting is not rigid but guides the orchestrator's decisions on loading models or accumulating data. If a requested action (like loading an additional plugin or model) would exceed the budget in a category, the system either refuses or triggers compensation (like unloading something else or compressing in-memory data).

Model Loading & Unloading Policy: Since models are the largest consumers of memory and VRAM, WIRTHFORGE manages them smartly. On Low-tier: as noted, only one model stays loaded at a time; after a generation completes, the model may be unloaded if the user shifts context (to free memory)
GitHub
. On Mid-tier: two models might reside in memory if frequently used (to avoid reload delay), but if the user loads a third and memory would be exceeded, the least recently used model is unloaded. On High-tier: multiple models can co-exist, but even there, loading all 6 possible council models simultaneously could be huge – the orchestrator might delay loading some until needed (“lazy load” a model when its turn comes to speak, for instance).

VRAM specific: The orchestrator is aware of GPU memory usage. If VRAM is nearly full, it might force a model to run on CPU (as a fallback) rather than overload VRAM. Alternatively, some frameworks allow keeping model weights in GPU but doing activations on CPU – such hybrid usage can be triggered if it prevents an out-of-memory on GPU. The key rule: never allow an out-of-memory crash – always anticipate and manage memory before it gets critical. This ties into monitoring; memory usage is continuously sampled, and a spike triggers preemptive actions.

Memory Optimization Techniques: We employ several strategies to reduce memory footprint:

Quantization & Pruning: Using lower precision for model weights (int8 or 4-bit quantization) drastically cuts memory. Low-tier profiles default to quantized models to save RAM at some cost of accuracy. If a model can be pruned (removing unused weights or compressing), WIRTHFORGE might use a pruned variant on smaller tiers.

Lazy Data Structures: Large data structures (like long conversation histories, logs, or caches) are kept in memory only when needed. We use on-disk storage (local database from TECH-004) for archival, and load only recent or relevant portions into RAM. E.g., if a user’s prompt history is very long, the UI and orchestrator might only keep the last N interactions in memory, while older ones reside in the local database (with an option to load on scroll). This ensures memory used is proportional to active usage, not total usage over time.

Efficient Buffers: We favor streaming and fixed-size buffers over unbounded growth. For example, the token event buffer in the orchestrator is ring-buffered or trimmed so it won’t grow indefinitely in a long session – older token events might be summarized and discarded to reclaim memory. Similarly, visual effect objects in the UI are reused or pooled rather than created anew for each token, which controls memory churn and garbage collection overhead.

Garbage Collection Tuning: In the Python backend, the garbage collector can be a source of unpredictable pauses if many objects accumulate. We adjust GC thresholds based on usage patterns (possibly disabling automatic GC during critical 60Hz loops and running it during idle times manually). On high-tier, we might increase the memory threshold before GC triggers, allowing more objects if there’s plentiful RAM, to reduce frequency of collections. Conversely on low-tier, we might encourage more frequent GC to free memory promptly (but carefully timed to not stutter the UI).

VRAM Partitioning for Multi-Model: On systems with multiple GPUs, WIRTHFORGE partitions models across them. For instance, if two GPUs are present, it might load half the council models on GPU0 and half on GPU1. The orchestrator queries VRAM sizes and assigns models to balance memory usage. If one model is very large (e.g. a 30B parameter model that uses 20 GB), it may monopolize one GPU entirely, and other models use the other GPU. The Council scaling rules respect this: it won’t assign more models to a GPU than it has memory for. If one GPU is free, WIRTHFORGE could also mirror a model across GPUs for load sharing or failover (advanced usage). In single-GPU scenarios, the partitioning is temporal: e.g., “don’t load Model C until Model A is done if both can’t fit together.” We clearly log such decisions so that advanced users understand why a certain model was not loaded concurrently (“Insufficient VRAM to load Model C alongside Model A; deferring load”).

Monitoring and Alerts: Our strategy involves watching memory closely. The metrics system provides a memory gauge; if it goes beyond a threshold (say >90% usage), an alert is raised and shown to the user (e.g., “Memory nearly full – consider closing some modules or reduce model size”)
GitHub
. Similarly for VRAM: if VRAM usage hits a critical level, we might proactively stop generating new tokens and prompt the user or automatically offload. Because running out of memory can crash the app or slow to a crawl (thrashing), we err on the side of caution. The governance aspect (from FND-006) mandates that memory limits are respected and any approaching breach is an auditable event (logged for later analysis to see if a leak or regression occurred).

In summary, memory/VRAM management in WIRTHFORGE is about prevention and efficiency: prevent crashes by never overcommitting, and use memory efficiently through smart loading/unloading and data management. By applying these strategies, even memory-constrained devices can run WIRTHFORGE (with some feature compromises), and high-end devices can fully utilize their vast memory to deliver top performance without waste.

Web UI Performance Optimization

The web-based UI of WIRTHFORGE is where users experience the 60 FPS magic, so optimizing front-end performance is as important as back-end optimization. This section details techniques and best practices to ensure the UI remains responsive, high-frame-rate, and smooth even under heavy load or on less powerful machines.

Lightweight Rendering Loop: The UI employs an efficient rendering loop coordinated with the browser’s capabilities. We use requestAnimationFrame to schedule visual updates in sync with screen refresh. Updates from the backend (via WebSocket or HTTP events) are buffered and applied in batches per frame. This prevents the UI from doing too much work between frames. The target is to keep each frame’s work under ~16ms. If the incoming event rate is too high (e.g. many token events arriving simultaneously), the UI can skip rendering every single token individually and instead merge updates within one frame (for instance, combining multiple token additions into one DOM update). This approach aligns with the real-time loop requirement that no layer should block 60Hz updates
GitHub
.

Efficient DOM Management: WIRTHFORGE’s UI uses a virtual DOM or reactive framework to minimize direct DOM manipulation cost. Visual elements like the “lightning bolt” token effects and energy particles are either drawn on a single canvas (for rapid pixel ops) or use highly optimized CSS transforms on a limited number of elements. We avoid layouts that trigger reflows; for example, animating transforms (GPU-accelerated) rather than properties like width/height/top that cause layout calculations. When adding token text to the conversation log, we append in a document fragment and only insert into DOM once per frame, preventing frequent re-layout. Also, inactive portions of the UI (off-screen or hidden panels) are detached or paused, so they don’t consume resources. This is crucial for plugin-heavy environments where multiple UI panels might be present; we ensure that plugins’ UIs are sandboxed and do not continuously update when not visible.

Visual Quality Scaling: The UI supports multiple quality levels for visuals. On detection of a low-tier device (or if runtime metrics indicate the UI struggling), WIRTHFORGE automatically enables a “low graphics mode.” This might mean simpler particle effects (or turning them off), using static images instead of dynamic canvases for certain background visuals, and capping the frame rate at a slightly lower target if absolutely needed (e.g. 30 FPS cap, which though lower, is stable and better than erratic 45-50 FPS)
GitHub
. Users can also toggle this mode manually if they prefer performance over eye-candy. Conversely, on a high-tier with powerful GPU, the UI can crank up effects: e.g., increase particle counts, enable motion blur or glow effects that are otherwise off. These adjustments happen on startup based on tier detection
GitHub
 and can also happen dynamically if performance metrics change.

Reducing Network Overhead: Although local, the UI communicates with the backend via WebSocket/HTTP. We optimize this by sending compact data structures and minimizing chatter. Event messages (like token events or energy metrics) are batched — for example, instead of sending 60 individual small messages per second, we could send 10 messages each containing 6 events if needed. We also compress or omit redundant data (the energy events might not need to send the full state every time if the UI can interpolate). By reducing the frequency and size of messages, we lighten the load on the UI thread that processes them. In plugin-heavy scenarios, where plugins might subscribe to many events, the system uses a publish/subscribe model with filtering so that plugins only get events they truly need, preventing an overload of the messaging system.

Profiling and Tooling: We incorporate front-end performance profiling tools (like a built-in stats overlay showing FPS, memory usage, and event rates). This is hidden by default but can be enabled by power users. It helps identify if, say, a particular plugin’s UI is causing jank (then the user/dev can optimize or disable that plugin). Our testing includes using browser profilers on various machines to ensure no single frame does an exorbitant amount of work. We target that even on modest machines, the scripting + rendering time per frame is well under the 16ms budget, leaving some slack for occasional heavier frames (garbage collection or a big DOM change) without dropping frames consistently.

Asynchronous UI Operations: Wherever possible, heavy computations in the UI (if any) are offloaded. For example, if a plugin does a large calculation or if the UI wants to pre-render something expensive, we use Web Workers to keep it off the main thread. This way, the main thread can keep updating the UI at high FPS while the background work is done in parallel. We also use debouncing for input handlers; e.g., if the user is resizing the window or scrolling, we don’t re-calc layouts continuously but rather at a controlled pace.

Optimized Asset Loading: The initial load of the UI is kept lean. Large assets (images, model files for 3D effects, etc.) are loaded on demand or after the UI is interactive (to avoid long blank loading screens). We use caching and bundling strategies so that the UI doesn’t stall mid-operation to load something unexpectedly. For instance, if a high-tier effect (like a 3D model for visualization) is likely needed, we begin loading it in the background when we detect high-tier, but if on low-tier and likely never needed, we might not load that asset at all. This conditional loading ensures low-tier devices aren’t burdened with data they won’t use.

By applying these techniques, the web UI remains fluid and enjoyable. The user’s actions (clicks, prompt submissions, menu navigation) should feel instantaneous, and the system’s visual feedback (the energy and token animations) should appear continuous and synchronized with the underlying processing. The ultimate goal is that even users on older hardware feel the interface is light and game-like, never a sluggish web page. Continuous profiling and improvement of the UI code will accompany backend optimizations in every release to uphold this standard.

Load Testing Specifications & Scenarios

To validate WIRTHFORGE’s performance and capacity under real-world and extreme conditions, we define a series of load testing scenarios. These tests simulate heavy usage patterns, stress the system’s limits (including plugin usage and multi-model councils), and ensure our optimization strategies hold up. We detail the specifications for these tests and the success criteria for each:

Scenario 1: Sustained Token Stream (Throughput Test) – Goal: Verify sustained TPS and stability over time.
Description: Simulate a scenario where the user (or an automated script) triggers a very large response generation (e.g., ask the AI to generate a long story or code file) that yields thousands of tokens continuously. This can be done by a special prompt or by chaining prompts. The system must sustain high throughput for, say, 5-10 minutes.
Metrics to Collect: Average TPS, peak TPS, any dips in generation speed, memory usage over time (checking for leaks), and frame rate throughout. Also watch TTFT for the initial start.
Success Criteria: On a mid-tier reference machine, maintain ≥80% of target TPS (e.g. if target 80 TPS, we sustain ~64+ TPS on average) throughout the test
GitHub
. No crashes or memory exhaustion; memory should plateau (no unbounded growth). Frame rate should remain near 60 FPS (allowing brief minor dips if garbage collection kicks in, but auto-recovery). The first token should still come promptly (~1s). If any metrics degrade over time (e.g. TPS gradually dropping or memory climbing), that indicates a potential resource leak or thermal throttling to investigate.

Scenario 2: Concurrent Prompt Bursts (Latency & Concurrency Test) – Goal: Ensure prompt queuing/parallelism works and latency stays in check.
Description: Fire multiple prompts in quick succession. For low-tier, this tests the queueing mechanism (since it should serialize) – e.g., send 3 prompts within a second. For mid-tier, it tests parallel generation (if 2 can run at once). For high-tier, push up to the council limit (e.g. 5 prompts at once on a 5-model council). The content of the prompts can be varied (some short, some long) to simulate mixed workload.
Metrics: TTFT and completion time for each prompt, how they overlap, and total time to finish all. Also measure CPU/GPU utilization and frame rate during the burst. We also validate correctness: the outputs should all be complete and make sense (no truncation because something was killed abruptly).
Success Criteria: The system should handle the burst without crashing or deadlocking. On low-tier, prompts beyond the first are queued and start as soon as prior finishes (with perhaps a small delay but not too long). On mid-tier, two prompts should indeed run in parallel and both complete faster than if run sequentially back-to-back (demonstrating the benefit of parallelism). Latency for each should ideally be within ~1.5× of normal (e.g. if one prompt alone takes 4s, two parallel might each take 5-6s, but not 10s). The UI must remain responsive throughout – the user should be able to interact (scroll, click stop on one if needed). No memory explosions with multiple contexts; if multiple models load, they should unload after if not needed. Essentially, the system should scale gracefully to the N concurrent tasks allowed by the tier, maintaining user experience albeit with some expected slowdown per task (but much less than linear slowdown).

Scenario 3: Plugin-Heavy Interaction (Plugin Stress Test) – Goal: Assess performance with many active plugins and extensions.
Description: Enable a suite of simulated plugins that put load on the system. For example: a logging plugin that records each token to a file (I/O load), a visualization plugin that renders additional graphics for each token (UI load), a computation plugin that analyzes text (CPU load), etc. Simulate a user session where these plugins are active while prompts are being processed. Possibly design a synthetic plugin that intentionally consumes extra CPU per token to mimic a heavy plugin.
Metrics: Frame rate (this is critical, as plugins run in the UI thread or sandbox threads), token latency, any scheduler delays (if plugin sandbox has limits like 5ms/frame as per governance)
GitHub
. Monitor whether sandbox limits are respected – e.g. a plugin exceeding its 5ms frame budget should be throttled. Also watch memory – loading multiple plugins might consume additional memory.
Success Criteria: The core generation performance (TPS, latency) should not significantly degrade with plugins on, thanks to sandboxing. For instance, with heavy plugins, maybe we allow up to 10-15% frame rate dip or slight latency increase, but the session should remain smooth and functional. If a plugin misbehaves (exceeds resource limits), the system should contain it (sandbox auto-pauses it or drops its tasks) so that core performance is protected
GitHub
GitHub
. No single plugin should be able to bring down the FPS below, say, 50, or cause out-of-memory. If the test finds a plugin can cripple the system, that’s a failure – we’d need to strengthen sandbox limits or guidelines for plugin authors (like heavy computations must yield frequently, etc.). This test essentially validates the governance policy enforcement: that plugins and extensions cannot violate core performance invariants.

Scenario 4: Multi-Model Council Marathon (Endurance & Accuracy Test) – Goal: Test the system under extended use of parallel models and ensure results consistency.
Description: Enable a council of models (on high-tier test machine or simulate with smaller models on mid-tier) and run a complex task that requires them to interact for an extended period. For example, a long debate between models or a collaborative story generation where each model contributes. Run this for, say, 30 minutes continuously.
Metrics: We gather throughput (combined TPS), how orchestrator scheduling is handling it (do all models get fair share?), any drift in performance over time (does one model slow down?), resource usage (especially GPU memory – ensure no gradual leak across many cycles of models generating). We also track the alignment of models’ outputs – not a performance metric per se, but to see if any synchronization issues arise (like if orchestrator falls behind, do models go out of sync?). The UI’s ability to display multiple outputs or threads of conversation is also monitored (does it stay smooth to switch view or highlight different model outputs, etc.).
Success Criteria: The system remains stable and performant over the long run. Combined TPS might be very high (hundreds per second) but should stay roughly steady; frame rate should stay 60 FPS with possibly more variability if lots of visual elements (but still no large pauses). No memory buildup – after 30 minutes, memory usage should be about the same as at 5 minutes in (indicating no leaks). All models should still be running; if any had an error, orchestrator should have caught it and perhaps restarted that model or removed it gracefully without affecting the others (fail-soft behavior). This scenario assures that even in marathon sessions WIRTHFORGE doesn’t overheat (metaphorically) or degrade – a key test for “living system” longevity.

Scenario 5: Worst-Case Load (Overload Simulation) – Goal: Test failure-handling and auto-recovery when pushed beyond capacity.
Description: Push the system intentionally beyond its limits. For example, on a mid-tier machine, launch an unrealistic number of parallel tasks (by automation, not normal UI), or allocate an extremely large model to see what breaks. Also simulate rapid user actions: like spamming the UI with input, opening many panels, or enabling all high-end features on a low-end device. Essentially a torture test.
Metrics: Observe how the system degrades: Does it crash, or does it gracefully refuse tasks? Does the orchestrator’s protective mechanism kick in (like rejecting new prompts with a message “System overload, please wait”)? How does the UI behave (perhaps showing an overload indicator)? We also test the recovery: after halting the overload, does the app return to normal or is it stuck in a bad state?
Success Criteria: Ideally, even in overload, no uncontrolled crash occurs. The system should hit a managed limit (like queue max length reached, or an exception caught and handled). For instance, if memory is exhausted, the system might throw an out-of-memory error, but our goal is to catch such and at least preserve the UI (maybe showing “Out of memory – please restart or free up memory” rather than just hanging). In CPU/GPU overload, the expected outcome is the system becomes unresponsive but then recovers once load subsides, possibly with warnings. Any data in progress should be saved if possible (so user doesn’t lose conversation history). This scenario’s success is a bit different – it’s about damage control: WIRTHFORGE should fail gracefully under extreme conditions, aligning with the principle that even if the magic fades momentarily, it doesn’t become a nightmare (no data corruption, no permanent hang requiring system reboot, etc.). Lessons from this test help refine our throttling and capacity rules.

Each load test scenario will be automated in the CI/CD pipeline where possible (some aspects like GPU-specific tests might run on dedicated hardware nightly, etc.). We will use these scenarios to continuously verify that new code changes do not introduce performance regressions or new failure modes. The results also feed back into the capacity planning: if we find, say, that a mid-tier machine can actually handle more than we thought, we might adjust our defaults to be more ambitious, or vice versa. In sum, these load tests are the practical enforcement of all the guidelines in this document, making sure WIRTHFORGE meets its performance promises under all conditions.

Performance Monitoring, Alerting & Regression Detection

Continuous monitoring of performance and early detection of regressions are essential to uphold WIRTHFORGE’s high standards. In conjunction with the Observability framework (WF-TECH-009), this section describes how we monitor key performance metrics in real time, how we alert on issues, and how we catch regressions over software updates.

Real-Time Metrics Dashboard: WIRTHFORGE includes a local performance dashboard that displays live metrics such as current FPS, CPU/GPU usage, memory usage, average token latency, etc., updated in real time
GitHub
. This dashboard provides immediate visibility if something is awry (e.g., FPS dropping or memory climbing). Users can keep it open during heavy sessions to see if they are near limits. From a development perspective, this same data is logged and can be analyzed post-run.

Automatic Alerting Rules: Building on governance requirements
GitHub
, we define threshold-based alerts:

If frame rate drops below 60 FPS for a sustained period (e.g. >1 second continuously below 50 FPS), an alert is triggered. The system might show a subtle in-UI warning like “Performance slowed” or an icon that indicates low frame rate. This is both to inform the user and to log an event for developers. The threshold might vary by tier (on low-tier, dropping to 25 FPS might trigger, since 30 is expected).

If latency for prompt response exceeds a threshold (say >5 seconds for any simple prompt, or more than 2x the average latency), log an alert. This could indicate a hang or an external issue.

If memory usage exceeds, say, 90% of available RAM or VRAM, trigger an alert (and possibly initiate pre-emptive measures like pausing new loads as described).

If error rates spike (like a model process times out or crashes several times in a short span), raise an alert for reliability.
These alerts are not just UI notifications; they also integrate with an internal audit log. According to the governance, any violation of core invariants should be traceable
GitHub
. For example, dropping below 60Hz is a violation of the real-time invariant
GitHub
, so our system logs the context (what was happening, which module caused load) for later diagnosis.

Adaptive Mitigation: Alerts don’t just sit there; some trigger adaptive responses. This ties in with the adaptive performance loop described earlier. For instance, upon a frame rate alert, the orchestrator (or an AI ops agent in the system) can automatically reduce visual effects quality or suggest closing plugins
GitHub
. If memory alert triggers, the system might free cache or unload an idle model immediately and then inform the user (“Unloaded unused model to free memory”). We allow a few seconds for these mitigations to take effect and ideally clear the alert condition, demonstrating self-healing. If mitigation fails (frame rate still low, etc.), the alert persists and user might need to take action (like manually halt a generation or accept lower quality). The key is the system tries first, guided by predefined rules.

Performance Regression Testing: To catch regressions across versions, we maintain a suite of benchmark tests (some of which correspond to the load scenarios above). When new code is integrated, these tests run and compare results to previous baselines. For example, if the average TPS drops by >10% or TTFT increases significantly in the new version, the test fails. This prompts investigation before release. We record baseline metrics for each tier using a controlled environment (for consistency, e.g., always test on the same hardware for fair comparison). Over time, we expect performance to improve or stay steady; any negative trend is flagged. The metrics of interest include throughput, latency, memory footprint, and CPU/GPU usage for standardized tasks. Because WIRTHFORGE is a long-running “living” system, we also track long-run performance: e.g., a test that runs a scenario for 1 hour and ensures performance at the end is no worse than at start (checking for creeping inefficiencies).

Version-to-Version Auditing: The governance mandates that any change’s impact be measured
GitHub
. So, when a new feature is introduced (especially those potentially affecting performance), we do targeted monitoring. For example, if we add a new plugin type or a new visualization, we run a focused test on that component’s performance and log metrics. We keep a changelog with performance notes: “Feature X added – negligible performance impact on mid-tier, 5% CPU increase on low-tier under load: acceptable.” If not acceptable, we iterate improvements or gate the feature on higher tiers only. This auditable trail means we can always trace back, if we find a regression, to which change likely caused it (because it would have shown up in these per-change measurements).

User Feedback Loops: While automated metrics are great, sometimes users will notice performance issues that tests didn't catch (perhaps due to unique workflows). We plan to incorporate a feedback mechanism: for instance, an optional “Report Performance Issue” button that packages recent metrics and system info (locally) and assists the user in sending it to the developers (or analyzing it themselves). This aligns with WIRTHFORGE’s ethos of transparency – advanced users can see detailed logs and metrics, and even contribute suggestions or fixes if an inefficiency is found.

Integration with Council (AI Ops): In the future, an AI-based assistant (part of the orchestrator or Council) could actively watch metrics and make optimization decisions
GitHub
. For now, our monitoring is rule-based, but the hooks are in place for a smarter system that could, say, detect a pattern (“every time plugin X is used, frame drops by 10 FPS”) and proactively adjust or alert the user about it in a more descriptive way. This is mentioned as an integration point so that our design now (thresholds, metrics, logs) can support that later without overhaul.

By diligently monitoring and setting up automated detection of performance issues, we ensure that WIRTHFORGE remains robust and regression-free. Any dip in performance is quickly noticed and addressed, rather than silently creeping in. Combined with the capacity planning, this closes the loop: plan capacity -> implement and tune -> test under load -> monitor in production -> adjust plan if needed. The living system thus not only evolves in features but in performance, always striving to be better or at least never worse than before.

Scalability Analysis & Recommendations

Scalability in the context of WIRTHFORGE refers to how well the system can handle increasing demands – whether it’s more complex models, more concurrent tasks, or future hardware advancements. Although WIRTHFORGE runs locally, we analyze its scalability characteristics and provide recommendations for future-proofing the platform:

Vertical Scalability (Leveraging Better Hardware): WIRTHFORGE scales upwards effectively with hardware improvements. Testing across tiers demonstrated near-linear improvements in throughput when moving from low -> mid -> high tier, up to the point of saturating underlying frameworks. For example, a GPU with 2× the TFLOPs roughly doubles token generation speed, which we observed when comparing mid-tier vs high-tier GPUs. Our architecture, especially with multi-model support, is positioned to exploit more cores/GPUs: adding extra GPU yields proportional increase in council size or model size capability. The recommendation is to continue optimizing in a way that new hardware features (like more cores, new tensor instructions, more VRAM) are immediately useful. For instance, as GPUs with larger VRAM become common, we can bump default parallel model limits or enable higher resolution visuals by default on them. Keeping an eye on hardware trends (like upcoming CPUs with AI accelerators, etc.) will inform future updates – e.g., if new consumer PCs have small NPUs (Neural Processing Units), WIRTHFORGE could offload certain tasks to those to boost performance.

Horizontal Scalability (Distribution or Multi-Instance): By design, the core is local and single-instance. However, advanced users or enterprise scenarios might run multiple instances of WIRTHFORGE on different machines and connect them (for distributed generation or shared workload). While this is outside normal use, the architecture’s modularity (especially with the concept of a Broker for remote models) allows some horizontal scaling. We’ve outlined a hybrid model where a remote server can provide extra capacity. If pursuing that, the recommendation is to maintain the stateless nature of the core as much as possible: let the local orchestrator remain the brain while farming out heavy compute. In essence, scale out by adding more cores/GPUs either within the machine or via trusted networked machines (but carefully to not break the privacy/local-first ethos except by explicit user action).

Software Scalability (Codepaths under load): The complexity of processing does not dramatically increase with input size – generating 100 tokens vs 10 tokens is linear overhead. However, some parts (like energy calculation or UI rendering) could have nonlinear cost if not careful (e.g., too many events flooding could cause event-loop lag). We analyzed those paths: the orchestrator’s event handling is O(events) and we ensure it can drop or merge events to keep that manageable at high scales. One potential concern is the size of context for AI models: as models with longer context (like 4k -> 16k -> 100k tokens) become available, generating that many tokens or handling that long input might be a new scale challenge (memory and time scale up). Our recommendation: when integrating models with extremely large context windows, treat them as a different tier of workload – possibly process in segments, or require high-tier hardware. Similarly, if a future feature allows multiple simultaneous user sessions on one core (like two people using one WIRTHFORGE instance via different UI clients), we should cap or throttle to one active session at a time unless on a very high-tier machine.

Scalability of Data & Logs: Over long periods, users may accumulate a lot of data (saved conversations, logs, metrics). While not performance of a single session, reading huge logs or visualizing long histories could slow things. The system’s solution is data retention policies (maybe archiving or summarizing old sessions) to ensure the working set stays scalable. For instance, we might automatically archive logs older than X days or compress them, to keep the active database small. The metrics and observability pipeline uses a local database with a rollover mechanism (capping at certain size)
GitHub
, ensuring that we don’t endlessly grow in memory or disk usage.

Future Features Impact: We look ahead at planned features (e.g., more plugins, possibly user-scriptable automations, etc.) and gauge their potential performance hit. Each new major feature in design should come with a scalability impact assessment. For example, if a new plugin allows running arbitrary user Python code on each token, that could be a huge performance risk – we’d sandbox and limit it heavily or find a way to batch those calls. Our recommendation is an early performance modeling of features: use small prototypes to measure how they scale (Will feature X still allow 60 FPS with 1000 events? If not, redesign it or limit it). This proactive stance will prevent future surprises.

Recommendations for Users: Provide guidelines to users for scaling their use of WIRTHFORGE:

If a user wants to tackle very large tasks (like processing a book-length text), recommend high-tier hardware or the upcoming broker mode, because while the software can attempt it on low-tier, the experience might degrade.

If a user installs many plugins, advise them to enable only those needed or to be mindful of each plugin’s performance cost (we might include plugin metadata that indicates “light/medium/heavy” resource usage).

For power users on high-tier, provide ways to tune beyond defaults (like an “expert settings” where they can tweak number of council models, frame rate cap, etc., to suit their specific needs).

Scaling Community and Content: Slightly tangential, but the platform’s performance can indirectly be affected by user-generated content like extremely large custom models or massive prompts. Part of scalability is handling the unexpected: if someone tries a 65B model on a mid-tier machine, the system should catch that and not just fail. The recommendation is to implement pre-flight checks: when user selects a model, check its size vs memory; when they paste a huge input, warn if it might be slow. This manages user expectations and protects the system from pathological cases that are “allowed” but not advised.

In conclusion, WIRTHFORGE is built to scale from small devices to powerful rigs, and even to leverage external compute when needed, all while maintaining a consistent core experience. By following these recommendations and continually analyzing how new trends (in hardware and AI workloads) affect performance, we ensure the platform remains scalable and future-proof. The key is to never assume a fixed performance environment: always design with headroom and adaptability, so the system can gracefully handle more – more data, more models, more complexity – as “more” inevitably comes.

Performance Troubleshooting Guide

Even with all precautions, users or developers may encounter performance issues. This guide provides a quick troubleshooting reference, listing common symptoms, possible causes, and recommended solutions or investigations:

Symptom: “The AI responses are slower than expected (low tokens/sec)”
Possible Causes: Using an overly large model on modest hardware (CPU-bound), GPU not being utilized (e.g. driver issues or model not supporting GPU), or background processes consuming CPU. On low-tier, perhaps running on battery with power saving (CPU throttled).
Solutions: Check if the model can be quantized or use a smaller model for faster output. Ensure GPU acceleration is enabled – verify that the model backend is using the GPU if available (the dashboard can show GPU usage). Close other heavy applications that might be competing for CPU/GPU. On laptops, plug into power and set high-performance mode to remove throttling. If the issue started after a software update, consult the metrics log for any spikes in compute time per token; it might be a regression in the model inference code (if so, report it with the logs). For advanced users: profile the model inference (some frameworks have verbose timing logs) to see if some layer is taking too long unexpectedly.

Symptom: “The UI is laggy or animations are choppy” (e.g., lightning animation stutters)
Possible Causes: Graphics overload – maybe too many particles/effects active for the GPU, or a plugin rendering too much to the DOM. Could also be an unsupported browser scenario (if using a browser UI, maybe the user’s browser is not optimized). In rare cases, a memory leak in the UI can cause garbage collection pauses.
Solutions: Toggle the Performance Mode in settings to reduce visual effects (this can instantly improve FPS by simplifying graphics). Ensure you’re using a recommended browser (if WIRTHFORGE uses Electron, this is less an issue, but if web, Chrome/Firefox with WebGL support is needed). Check the metrics overlay for FPS and see if it correlates with certain actions (does it drop when a plugin panel is open? If yes, that plugin might be the culprit – try disabling it). Clear the UI cache (if applicable) or reload the UI to see if it was a transient state issue. If on integrated graphics, consider lowering screen resolution or window size – less pixels to draw can boost performance. Developers can open dev tools Performance tab to capture a timeline during stutter; this often pinpoints what work is consuming time each frame.

Symptom: “High memory usage / out-of-memory errors”
Possible Causes: Loading a model (or multiple) that exceed available RAM/VRAM, a memory leak (if usage keeps growing) perhaps due to an uncapped log or an errant plugin. Also, extremely long sessions without restart can accumulate overhead.
Solutions: If a specific action triggers it (e.g. loading a particular model), verify the model size vs your hardware – you might simply need a machine with more RAM/GPU, or use a smaller model file (some models have reduced variants). If memory slowly climbs over time, try using the “Reset Session” or restart WIRTHFORGE after very long runs to clear internal state. Check plugin memory usage: disable any optional plugins to see if memory stabilizes. On Windows, watch the system’s page file (if lots of hard page faults, the system is swapping which kills performance; freeing memory will help). Make sure you’re on the latest version – memory leaks are taken seriously, and patches often fix them once identified. If comfortable, gather a memory profile (tools like tracemalloc in Python or Chrome’s heap snapshot for the UI) to help pinpoint if certain objects are never freed. In the interim, reducing the number of concurrent models or length of history retained can mitigate the issue.

Symptom: “Prompt latency is high even though tokens/sec is fine” (e.g., first token takes long or there's a big pause at end)
Possible Causes: High TTFT could indicate model loading time or initialization every prompt (maybe the model isn’t staying loaded in memory between prompts as it should). A pause at end might indicate heavy post-processing or blocking on something (like writing to disk, or waiting on a plugin). Could also be due to an external factor like the model using virtual memory (swapped) causing a delay.
Solutions: Ensure the model stays loaded: check settings for any “unload after each prompt” option and disable it for faster subsequent prompts (this might be toggled for low-memory scenarios). If using GPU, ensure the model isn’t getting reloaded into VRAM each time (maybe VRAM is overcommitted and evicting). Investigate if any plugin has a generation_end hook doing expensive work (like summarizing the output) – if so, try disabling that plugin to confirm. If the pause is at the very end, enable debug logs to see if the system is doing something like saving logs or computing an extra metric post-generation; there might be an inefficiency there to report. Also consider model-specific quirks: some models always take longer on the first token due to context setup – using a smaller context or a warmed-up model could help. For advanced fix, you might spawn a dummy prompt on startup to “warm” the model (WIRTHFORGE could add this as a feature).

Symptom: “Performance was fine, but after adding a new plugin or changing a setting, it deteriorated”
Possible Causes: The new plugin might be resource-heavy or not well optimized. Changing a setting like increasing context length or enabling debug mode can slow things down due to extra work or logging.
Solutions: Try disabling the last added plugin to see if that immediately resolves the issue. If yes, reach out to the plugin developer or check if it has performance settings (some plugins might let you adjust their frequency of operation). If a setting change did it, revert and test; e.g. if you set context length from 2048 to 8192, the model now has to handle 4× more tokens per prompt internally – that will definitely slow it on same hardware. If you enabled verbose logging, turn it off for normal use (logging too much can I/O-bound the app). Essentially, isolate what change caused it and then decide if the trade-off that change provided is worth the performance cost. Often, the recommendation is to use heavy plugins or settings only on higher-tier hardware or when necessary.

Symptom: “I’m not sure where the bottleneck is – it just feels slow.”
Possible Causes: Complex – could be any of the above or a combination (CPU slightly overworked, GPU at times, minor memory pressure causing GC).
Solutions: Use the built-in Performance Profiler approach: open the metrics dashboard while using the app and observe:

If CPU is constantly 100%, that’s likely your bottleneck.

If CPU is moderate but GPU is 100%, then GPU is it.

If both are fine but FPS is low, suspect the UI thread or perhaps heavy I/O.

Also look at the latency graph: does it spike at certain times? That could correlate with a background event (like model loading or autosave).
Next, try the process-of-elimination: turn off visuals (performance mode) to see if it’s UI; if that fixes, focus on UI issues. If not, try a smaller model; if that fixes, it was model load. If neither helps, maybe it’s I/O or a more subtle bug – at this point, gathering logs and reaching out to dev support with your metrics readings is wise. WIRTHFORGE’s team can use that data to pinpoint known issues (for example, “on version X, there was a known slowdown in the energy calculation, fixed in X+1”).

This troubleshooting guide empowers users and developers to diagnose issues systematically. By comparing metrics to the expected targets outlined earlier, one can often identify what part of the system is underperforming. And with the solutions provided, most issues can be resolved or at least narrowed down for further support. The overarching advice is: leverage the tools and data WIRTHFORGE provides – the transparent metrics and logs – to illuminate the black box of performance. There’s always a reason for slowness; once found, we can usually optimize or adjust for it, keeping the WIRTHFORGE experience as seamless as intended.