WF-TECH-001 – Automated Local Startup & Orchestration (Zero‑Config Boot Sequence)
🧬 Document DNA

Unique ID: WF-TECH-001

Category: TECH

Priority: P0

Dev Phase: 1

Estimated Length: ~3,000 words

Document Type: Technical Specification

🔗 Dependency Matrix

Required Before This: WF-FND-003 (5‑layer architecture blueprint), WF-FND-006 (glossary and governance standards)
GitHub

Enables After This: WF-TECH-002 (Native Ollama Model Integration), WF-TECH-003 (WebSocket/HTTP Protocol Services), WF-TECH-004 (Flask/FastAPI Microservice Framework), WF-TECH-005 (Energy State Management Loop), WF-TECH-006 (Local Data Persistence), WF-UX-006 (UI Component Library for visual “energy” feedback)

Cross-References: WF-FND-001 (Manifesto & Local-First Vision), WF-FND-002 (Energy function & 60 Hz frame budget), WF-FND-005 (Progressive orchestration behavior), WF-META-001 (Universal template & constraints)

🎯 Core Objective

Define the zero‑configuration local startup sequence that bootstraps all core services – from AI model runtime to orchestration loop and user interface transport – within a few seconds on standard hardware. The goal is to reach a steady 60 Hz update cadence immediately after launch
GitHub
, enforcing WIRTHFORGE’s local-first, no-Docker principle. This document ensures the system initializes fully autonomously (no manual setup), by automatically detecting hardware capabilities, launching required model processes, and signaling readiness to the user as soon as the first token’s “energy” is generated.

📚 Knowledge Integration Checklist

5‑Layer Architecture & Tiers (WF-FND-003): Adheres to the defined layer boundaries (L1–L5) and hardware tier definitions (Low/Mid/High) during startup. All initialization steps respect the separation of Input, Compute, Orchestration, Transport, and UI layers.

Progressive Disclosure (WF-FND-005): Incorporates the progressive complexity concept so that on first run, only fundamental features (Level 1 “Lightning” capabilities) are enabled, with higher-level orchestration features unlocking gradually as the user progresses. Startup routines reference the experience orchestration policies to enable features appropriate to the user’s current level and path.

Glossary & Consistency (WF-FND-006): Uses all terminology (e.g. Energy, TTFT, Hardware Tier) in accordance with the established glossary definitions. Each new or critical term is introduced with definition and will be added to the central glossary on first use.

Local-First Principles (WF-FND-001): Ensures no cloud or container dependencies during boot – all computations run natively on the user’s machine. The startup process does not require any Docker containers or external services, reflecting the manifesto’s mandate for user autonomy and privacy.

Energy Telemetry Loop (WF-FND-002): Implements the 60 Hz frame update loop for real-time feedback
GitHub
. “Energy” tracking begins with the very first token generation, converting model telemetry into the normalized energy measure E(t) (per WF-FND-002’s formula)
GitHub
GitHub
. This ensures the platform’s “visible computation” ethos is upheld from the moment of startup.

📝 Content Architecture
1) Opening Hook

When a user launches WIRTHFORGE for the first time, the system self-starts into a fully operational local AI environment within seconds – with zero manual configuration. From the moment of launch, an orchestrator process springs to life, initializing an AI model runtime and a real-time event loop that powers WIRTHFORGE’s interactive experience. There are no drivers to install, no model files to configure, and no network setup required by the user. The user simply starts the application and immediately observes the system coming alive: the backend loads the default AI model (or obtains it automatically if not present), the local API endpoints begin listening on localhost, and the UI front-end connects via a handshake – all seamlessly. This deterministic startup sequence is the “spine” of WIRTHFORGE’s runtime
GitHub
; without it, higher layers (visualization, user interactions) cannot function or render the “energy truth” of the AI’s operation. The startup experience must therefore be robust, fast, and transparent, ensuring that WIRTHFORGE’s core principles are evident from the first token generated. By adhering to strict local execution and immediate visual feedback, the platform instills trust: users see that their modest hardware can light up with AI activity without any cloud services or complex setup, exemplifying the project’s local-first promise.

2) Core Concepts

Local Orchestrator: The orchestrator is the central coordinator (Layer 3 in the architecture) that governs the startup process. It is responsible for launching and supervising all other components: it spawns or connects to the Model Runtime, starts the Transport Server, initializes the Energy State tracker, and manages the overall timing. Implemented in Python (using asyncio for concurrency), the orchestrator ensures nothing blocks the main loop. It immediately schedules a 60 Hz update task that will drive the energy calculations and any time-sensitive orchestration tasks, honoring the real-time cadence target (16.7 ms per frame). The orchestrator is designed to be deterministic in its startup sequence: each subsystem is brought up in a defined order and must register a heartbeat or “ready” signal back to the orchestrator. If any component fails to initialize promptly, the orchestrator can log the failure and attempt recovery (for example, retrying a model download or re-binding a port), rather than leaving the user with a silent failure. By managing all startup steps in one control flow, the orchestrator upholds the Single Source of Truth principle for system state— even during initialization, it remains the sole authority on what’s loaded and what’s running.

Model Runtime Initialization: WIRTHFORGE uses local model backends (e.g. Ollama for running LLaMA-family models) to perform AI inference. A key startup task is to initialize the model runtime in Layer 2 (Compute). This may involve launching an external process or server that hosts the model (for instance, invoking ollama serve or similar) or loading a model through a Python binding. The system performs a local model presence check at boot: if the default AI model is not found on disk, the orchestrator automatically retrieves it or triggers a one-time download – with transparent feedback to the user (e.g. a console message or UI indicator that the model is being downloaded) – thereby maintaining zero manual setup. This automatic model provisioning ensures that even a brand-new user with no pre-downloaded models can start using WIRTHFORGE without interruption. Once the model binary is available, the orchestrator starts the model server and waits for a confirmation that the model has been successfully loaded into memory. This confirmation might come via a short handshake: for example, the orchestrator could ping the model server with a small test query or use Ollama’s startup acknowledgment if available. Initializing the model runtime also involves setting it to stream token outputs so that WIRTHFORGE can capture fine-grained telemetry (token timings, probabilities) for the energy calculations. Per WF-FND-002’s guidelines, Ollama’s per-token telemetry is tapped here to feed into the energy function E(t)
GitHub
. The orchestrator ensures the model is run with local-only settings (no cloud endpoints) and that it loads within an acceptable time (on first run, large models might take a few seconds to load into RAM; the system may display a loading animation linked to this step).

Transport Layer & Handshake: In parallel with the model initialization, the Transport layer (Layer 4) is brought up via a local web server. Because WIRTHFORGE may expose multiple services or streaming endpoints to the UI, we prefer FastAPI as the framework (for its asyncio support and high performance) when multiple concurrent endpoints or WebSocket channels are needed; if the design were limited to a single simple endpoint, Flask could suffice, but here FastAPI aligns better with our concurrency model. The startup script launches the FastAPI server (or Uvicorn worker) bound to 127.0.0.1 on a chosen port (for example, port 8145) – ensuring from the outset that all network activity is local-only. No external network calls occur during core startup; the platform does not, for instance, reach out to check for updates or send analytics – this is a conscious choice to honor the user’s privacy and the local-first ethos. Once the local API is up, the handshake sequence begins between the backend and the UI (Layer 5). The UI (which could be an Electron app, a local web UI in a browser, or another client) initiates a WebSocket connection to the FastAPI server’s endpoint (as defined in WF-TECH-003 protocol specs). The orchestrator, upon accepting this connection, sends a structured startup event – for example, a JSON message like: { "event": "startup_complete", "model": "<name>", "tier": "<detected_hardware_tier>", "version": "<app_version>" }. This message, conforming to the schema defined in WF-FND-003’s API spec, serves as the handshake acknowledgment. It tells the UI that the core services are ready, conveys which model is loaded and what hardware profile was detected (so the UI can adjust, e.g. enable/disable certain visual effects), and provides any other initial state (such as an empty energy baseline). The UI, on receiving this, might then transition from a loading screen to the main interface, indicating to the user that the system is ready for input. This bi-directional trust handshake ensures synchronization: the backend knows the UI is connected and listening, and the UI knows the backend is prepared to handle requests. All handshake data stays within the localhost network boundary, reinforcing that even the startup exchange is private and local.

Hardware Auto-Detection: A cornerstone of zero-config startup is automatic hardware profiling. Immediately on launch, the orchestrator inspects the host machine’s resources – checking CPU core count and speed, available RAM, presence of a CUDA-capable GPU, etc. Based on these parameters, the system classifies the environment into one of the predefined hardware tiers: Low-End, Mid-Tier, High-Tier, or Hybrid. This classification uses criteria from WF-FND-003’s hardware scaling definitions (for example, a Low-End might be a CPU-only system with limited RAM, High-Tier might be a multi-GPU workstation, etc.). The detected tier influences startup behavior in several ways:

Model Selection: On low-end hardware, the orchestrator might default to a smaller or quantized model (to conserve memory), whereas on high-tier it could load a larger model or multiple models for parallel generation. The config for which model(s) to auto-load per tier can be defined in a built-in JSON or YAML file (shipped with the app or in WF-FND-005-experience-capabilities.json), which maps hardware tier to recommended model and parallelism settings. The startup logic reads this and picks an optimal default model for the user’s machine.

Concurrency and Threads: The orchestrator adjusts how it utilizes threads or subprocesses. For example, on a high-tier with many cores, it might spawn additional threads or background tasks for handling model I/O or preloading data, whereas on a low-tier it may stick to a single-threaded asyncio event loop to avoid context-switch overhead. All such adjustments happen under the hood.

Visual Effects and Frame Budget: The 60 Hz target is universal, but the system may scale effects complexity. The orchestrator informs the UI (via the handshake) of the tier, and the UI’s Layer 5 will correspondingly enable or simplify certain visualizations (as defined in progressive enhancement settings). For instance, a low-tier machine might reduce particle effects or frame resolution of certain animations to maintain smooth performance.

Hybrid Mode: If the hardware detection finds a “Hybrid” scenario (e.g. a mid-tier local machine but user also has opted into a cloud assist, per WIRTHFORGE Premium), the startup sequence still prioritizes local initialization, but it may also prepare a connection to the optional satellite service. However, no cloud handshake is performed by default – the system will only later connect to remote resources if explicitly configured by the user’s subscription and always through a controlled mechanism that keeps the user in charge. Hybrid tier detection might simply flag that such an option is available.

All of this happens automatically, requiring no input from the user. The end result is that by the time the system is up, it is already tuned to the user’s environment – loaded with an appropriate model and configured to balance performance and fidelity.

Energy Tracking Initiation: A unique aspect of WIRTHFORGE’s startup is the immediate commencement of energy tracking. “Energy” in WIRTHFORGE is a quantified representation of the AI’s computational activity, as defined in WF-FND-002
GitHub
GitHub
. The orchestrator’s 60 Hz loop begins in an idle state (since no tokens have been generated yet before a prompt is entered), but the very moment the first token is produced by the model, the system transitions to active energy mode. Using the telemetry from the model runtime (token inter-arrival times, model confidence or token probabilities, and any stall or waiting durations), the orchestrator computes the initial energy values. For example, if Time-to-First-Token (TTFT) is measured, that initial delay can be converted to an energy “spark” as per the formula E(t) (longer TTFT might produce a larger initial energy spike indicating the system gearing up). The first token event triggers the orchestrator to start populating the energy state data structure – essentially a timeline buffer that at 60 Hz will be updated with new E(t) values. This means that from the user’s perspective, the moment text begins streaming from the model, the UI’s energy visualization (the Level 1 “Lightning⚡” bolt, for instance) animates in sync. This satisfies the principle that every computation is immediately made visible. In practice, the orchestrator accomplishes this by subscribing to the model’s token stream: as tokens stream in (likely via an async iterator or callbacks from the Ollama API), the orchestrator feeds them into an energy calculator function (weighted sum of cadence, certainty, etc.). It also timestamps each frame tick, so that even if tokens arrive faster or slower, the energy values are interpolated or buffered to output consistently at 60 Hz. From the first token onward, the energy loop is “hot” – meaning any delay or stall in token generation will also visibly register (e.g. the lightning bolt flickers or a gap in energy pulses). The startup completes not just when the system is idle, but when it is actively demonstrating this energy feedback for the user’s first action. In summary, the orchestrator’s final responsibility in startup is ensuring that energy telemetry is live from token one. This closes the loop on the initial user experience: they issue a prompt, the model begins answering, and simultaneously the UI comes alive with dynamic visuals that reflect the AI’s internal state in real time.

3) Implementation Details

To achieve the above, the implementation coordinates multiple asynchronous tasks and checks. The following outlines the concrete startup sequence and provides pseudocode and schema examples for clarity:

Startup Sequence Overview:

sequenceDiagram
    participant U as User
    participant App as WIRTHFORGE App (Launcher)
    participant O as Orchestrator (Core Engine)
    participant M as Model Engine (Ollama)
    participant API as Local API Server (FastAPI)
    participant UI as WIRTHFORGE UI
    U ->> App: Launch WIRTHFORGE
    App ->> O: Initialize Orchestrator (async runtime)
    O ->> O: Auto-detect hardware & config
    O ->> M: Spawn local model server (Ollama) with default model
    Note over M: If model not present,<br/>download it automatically
    M ->> O: **Model Ready** (loaded & listening)
    O ->> API: Start FastAPI server on 127.0.0.1
    API ->> O: **API Ready** (listening on port)
    O ->> UI: Launch front-end (if separate process)
    UI ->> API: Connect via WebSocket (handshake)
    API ->> O: UI connected (socket open)
    O ->> UI: Send `startup_complete` event (model info, tier, etc.)
    UI ->> U: Display ready state (UI interactive)
    U ->> UI: [User enters first prompt]
    UI ->> API: Send prompt request
    API ->> O: Forward prompt to Orchestrator
    O ->> M: Invoke model API (stream request)
    M ->> O: Stream tokens (with telemetry)
    O ->> O: Compute Energy E(t) each frame (60Hz loop running)
    O ->> API: Push token+energy events (WebSocket)
    API ->> UI: Stream tokens & energy to UI
    UI ->> U: Render text and energy visuals in real-time


This sequence diagram illustrates the end-to-end flow from launch through first response. The bold "Ready" signals indicate points where components confirm successful startup steps back to the orchestrator.

Process Structure: Internally, the orchestrator and the API server run within the same Python process (taking advantage of asyncio to interleave tasks), while the model engine (Ollama) typically runs as a separate process (external binary). Conceptually, we can view the system as four logical components working in concert, each with a specific role in startup:

flowchart LR
    subgraph WIRTHFORGE Core (Python)
    O0[Orchestrator<br/>(Async Core Loop)]
    A0[Transport API<br/>(FastAPI Server)]
    S0[Energy State<br/>(In-Memory Store)]
    O0 --> S0
    O0 --> A0
    A0 --> O0
    end
    M0[Ollama Model Engine<br/>(External Process)]
    O0 -- Token Requests/Responses --> M0
    M0 -- Telemetry Stream --> O0


In this architecture diagram, Orchestrator (O0) and API (A0) reside in the same runtime and communicate through shared memory/callable interfaces (since they are co-hosted in Python, the orchestrator can call API methods or utilize an internal queue for events). The Model Engine (M0) is an external entity (e.g., the Ollama daemon or subprocess) that communicates via IPC or HTTP calls. The Energy State (S0) is a data structure managed by the orchestrator to store current energy values, recent history, and any other state that needs to be accessed by other layers or logged. During startup, these components are instantiated in the order shown: Orchestrator first (creating the state store and any needed data structures), then Model Engine (external), then Transport API (which may spin up on a new thread or via asyncio.create_task), and finally the orchestrator enters the servicing loop which ties everything together.

Configuration and Defaults: The system uses a combination of compiled defaults and generated config at first run:

A default configuration object is constructed by the orchestrator based on detected hardware and any bundled config file. This includes fields such as selected_model, hardware_tier, api_port, and performance knobs (like max_parallel_models, frame_rate=60).

If a user configuration file is present (for example, ~/.wirthforge/config.yaml), it will be loaded after auto-detection to override any defaults. (On a brand new machine, this file won’t exist, so the auto-detected settings remain – true zero-config. When it does exist, it typically is created by the app when the user changes a setting in the UI, not manually edited.)

Example of an auto-detected config (for a mid-tier PC with 16GB RAM, 1 GPU):

{
  "hardware_tier": "mid",
  "model": "WirthForge-LLM-7b.q4_0.bin",
  "model_params": { "threads": 8 },
  "parallel_models": 1,
  "transport": {
    "framework": "FastAPI",
    "port": 8145,
    "allow_remote": false
  },
  "energy": {
    "target_fps": 60,
    "visual_level": 1
  }
}


This JSON shows that the system chose a 7-billion-parameter quantized model, plans to use up to 8 threads for it (since the machine has multiple cores), will only run one model at a time (no parallel ensemble) on this tier, and has fixed the transport layer to FastAPI on port 8145 with no remote access. It also sets the energy visualization to Level 1 (Lightning) by default, reflecting that this user likely is at the beginning of their journey (progression Level 1). This file is not hand-written by the user; it’s generated by the system and can be saved for reference. If the user upgrades hardware or changes a preference, WIRTHFORGE can regenerate or update these settings accordingly.

Pseudo-code Snippet: Below is a simplified pseudocode demonstrating the startup routine in Python-esque style, highlighting asynchronous steps and error handling for a robust zero-config boot:

import asyncio, shutil, os, logging
from wurf_core import Orchestrator, FastAPIServer, ModelEngine

async def ensure_model_available(model_name: str) -> str:
    """Check if model file exists locally; if not, download it."""
    model_path = f"./models/{model_name}"
    if not os.path.isfile(model_path):
        logging.info(f"Model '{model_name}' not found. Downloading...")
        await download_model_async(model_name)  # (calls out to a safe downloader)
        logging.info(f"Downloaded model to {model_path}")
    return model_path

async def startup_sequence():
    # 1. Auto-detect hardware capabilities
    profile = detect_hardware_profile()  # returns dict with 'tier', etc.
    logging.info(f"Detected hardware tier: {profile['tier'].name}")

    # 2. Ensure model is present and launch model engine
    model_file = await ensure_model_available(profile['recommended_model'])
    model_engine = ModelEngine(model_file, profile=profile)
    await model_engine.launch()  # asynchronously start model server
    logging.info("Model engine running, model loaded.")

    # 3. Start local API server (transport layer)
    api_server = FastAPIServer(host="127.0.0.1", port=8145, orchestrator_endpoint=True)
    await api_server.start()  # starts listening in background thread
    logging.info("Local API server started on port 8145.")

    # 4. Initialize orchestrator core and energy loop
    orchestrator = Orchestrator(model_engine=model_engine, state=EnergyState(), hardware=profile)
    orchestrator_task = asyncio.create_task(orchestrator.run_main_loop())  # 60 Hz loop

    # 5. Wait for initial tokens or UI connection (whichever comes first)
    await orchestrator.wait_for_condition(lambda: api_server.is_client_connected or orchestrator.first_token_received)
    logging.info("Startup handshake completed. System is ready for user input.")

    # Continue running orchestrator loop until application exit
    await orchestrator_task

# Entrypoint
if __name__ == "__main__":
    try:
        asyncio.run(startup_sequence())
    except Exception as e:
        logging.error(f"Startup failed: {e}")
        raise


In this pseudocode, we see the order of operations matching the design: hardware profile first, model availability, model launch, API server launch, orchestrator main loop start. The wait_for_condition line is illustrative – it waits until either a UI client connects to the API (WebSocket opened) or the model produces the first token (in cases where the model might start generating output immediately, perhaps on a test input). In a real implementation, we might send a special handshake event to any connected UI as soon as the orchestrator is up, rather than waiting for a user prompt. The code also handles missing model by downloading automatically (ensure_model_available uses an async downloader, which could integrate with an in-app progress bar). All major steps log their progress, so if something hangs, the user (or a developer) can see which step did not complete. Notably, the code does not prompt the user at any stage – even the model download is initiated automatically. If a download is needed, it would ideally be accompanied by some UI feedback, but not a blocking prompt. This aligns with the “no manual setup” mandate: the system anticipates needs and handles them programmatically.

Startup Integrity Checklist: To verify the sequence above, the following conditions are enforced and tested after startup:

Model Engine Running: The local model service (Ollama) is running and responsive to test queries (e.g., responds to a simple status ping) – it did not crash or hang during load.

API Server Listening: The FastAPI server is confirmed listening on the expected localhost port (e.g., 8145) without binding errors (verified by a socket test or FastAPI’s own startup event).

No Exceptions: The orchestrator initialization completed without any uncaught exceptions. All awaited tasks (model launch, server launch) returned successfully. If any failed, the orchestrator caught the exception, logged it, and attempted an automated remedy (for instance, if port 8145 was busy, it could increment to 8146 and retry, still without user intervention).

Handshake Successful: The UI client connection was established and a startup_complete event was exchanged. In headless testing, this can be simulated by a test client connecting to the WebSocket endpoint and expecting the handshake message.

Energy Loop Active: The 60 Hz energy loop timer is running and posting updates to the Energy State. Before any prompt, this might just tick and keep an idle counter. After the first prompt, it should be observed emitting non-zero energy values. An internal flag like first_token_received=True should be set once the model produces output, and from that point, the orchestrator should be populating the energy metrics at each frame.

Each of these can be checked via automated startup tests (discussed in Required Deliverables and Quality Criteria sections). Passing all indicates a successful zero-config startup experience.

4) Integration Points

The automated startup sequence integrates and interfaces with several other parts of the WIRTHFORGE platform and upcoming technical documents:

Local Model Integration (WF-TECH-002): The startup calls into the model layer implementation. It uses the standardized interface for local model execution defined in WF-TECH-002 (for example, ModelEngine.launch() and streaming token callbacks). Any improvements or changes in how models are loaded (new runtimes, model formats) will plug into this step of the startup. By abstracting model startup as a function call, we ensure that switching from Ollama to another runtime (or supporting multiple) doesn’t alter the overall orchestration flow – only the model adapter in Tech-002 needs adjustment.

Transport Protocol (WF-TECH-003): The handshake and subsequent prompt/result streaming use the WebSocket and REST schemas defined in the transport protocol spec. For instance, the JSON structure of startup_complete and the channels for streaming tokens are specified in WF-TECH-003. The startup sets up those endpoints (like a WebSocket at /ws and perhaps a RESTful POST /compile for prompts) and verifies they conform to the schema (matching field names, data types as per the API schema JSON). This document thus serves as a reference for how early in the app lifecycle the WF-TECH-003 protocol comes into play (essentially at time zero, not delayed).

Energy State Management (WF-TECH-005): The orchestrator’s energy loop and state storage initiated here produce data that WF-TECH-005 will formally define and manage. In other words, Tech-001 (startup) gets the basic energy tracking running; Tech-005 will detail how that state is structured, stored, and accessed over time. Integration-wise, the startup sequence ensures that an instance of the energy state store (perhaps an in-memory database or a simple Python object) is created and populated. Later, Tech-005 might provide persistent storage or more complex analytics on this stream. The handshake event could even include an initial energy state snapshot (like an empty baseline) to fulfill any schema expectations from the UI side.

Progression & Orchestration Logic (WF-FND-005): The startup defers to the progression management rules for enabling features. Integration with FND-005 means the orchestrator will load the experience capabilities configuration (as seen in WF-FND-005-experience-capabilities.json) at startup. This config likely maps user progression level and path to which features or models are available. For example, a brand new user (Level 1, Path “Forge”) might be restricted to single-model mode and basic UI panels, whereas an advanced user (Level 2 or 3) on a high-tier machine might have multi-model orchestration enabled at startup. The orchestrator passes the user’s status (which could be read from a local profile or assumed default for first run) into the Experience Orchestrator sub-module (as seen in the ExperienceOrchestrator class in FND-005 code). In doing so, it ensures that the system never loads beyond what the user should see – satisfying the “progressive reveal” integration. Notably, this happens very early: even before the user’s first prompt, the system knows what mode it’s in (e.g., basic vs advanced) and sets up only the necessary services.

Governance & Security Checks: Startup is also the earliest point where governance policies (from WF-FND-006) apply. The orchestrator runs with principle of least privilege – e.g., binding only to localhost, not opening any external ports or wide firewall rules. If there are any security checks (such as verifying model binaries for integrity or sandboxing untrusted plugins), they are invoked during startup. For instance, if the user has installed community plugin modules, the orchestrator might isolate them (per WF-FND-006 guidelines) until they are validated. While this document focuses on the core happy-path, it integrates with those policies by calling any “pre-flight” audit checks defined elsewhere (e.g., verifying no disallowed network calls are registered, etc., as part of ensuring local-only activity).

User Interface (WF-UX docs): Though the UX documents will detail the front-end, the startup sequence is tightly coupled with UI behavior. The integration point here is the contract that once startup_complete is sent, the UI should transition out of loading state. Conversely, if the UI attempts to issue a prompt before receiving that event, the backend will either queue it or respond with a “not ready” error – but thanks to the handshake design, the UI is unlikely to do so. Additionally, the UI might display progress of model loading if the startup event indicates a model download. We ensure that the messages and states during startup are sufficient for the UI to give feedback like “Downloading model (50%)…” or “Loading AI engine…”, though such feedback flows are more explicitly defined in UX specs. The main integration guarantee from the startup side is that it will always emit a conclusive ready signal (or an error event) so the UI isn’t left guessing.

5) Validation & Metrics

To uphold the quality of the automated startup experience, we define concrete metrics and validation criteria:

Cold Boot Time: The system must go from process start to readiness (handshake complete and first token ready to stream) in ≤ 2 seconds on a Tier-Mid machine
GitHub
. This assumes the default model is already installed; if a model download is required, that is excluded from this metric (though the download progress is separately measured). Meeting this means optimizing initialization – e.g., using asynchronous loading for the model and server startup in parallel. We will test this by measuring timestamps in logs or using integration tests that time the interval from launch command to receiving the startup_complete event.

Frame Rate Stability: The 60 Hz orchestrator loop should maintain its timing. Under normal load with a single model streaming, the loop should not drop below ~60 updates per second. We set a threshold that even on low-tier hardware, frame loop stays at ≥ 55 Hz (no more than ~10% frame drops) during steady generation. In benchmarks, the EnergyState.frame_time_ms average should be ≤ 16.7 ms. We will validate this by running long generation sessions and recording the loop interval statistics (the orchestrator can collect frame_times as shown in the code and we assert they cluster around 16-17 ms).

Resource Utilization: On an idle system (just after startup, no prompt yet), WIRTHFORGE’s background processes should consume minimal resources. CPU utilization should remain < 10% on one core during idle looping (the 60 Hz loop is lightweight when no tokens are flowing) and memory overhead for the orchestrator and API combined should be modest (e.g. < 200 MB not counting the model). During generation on mid-tier hardware, CPU usage might spike (especially if the model is CPU-bound), but the orchestrator thread itself should stay under 40% CPU
GitHub
, leaving headroom for the model inference threads. We will use profiling tools and ensure no busy-waiting or inefficient polling in the loop.

No External Traffic: A network monitor will be run during startup to confirm that no outbound network requests are made. The only network activity should be the localhost loopback interface for UI communication. This is critical for user trust – the validation suite will flag any attempt to contact external IPs (for instance, if a library tries to fetch an update or telemetry). The expectation is zero external HTTP requests during core startup (with the possible exception of the model auto-download, which is initiated only if absolutely necessary and done with user awareness). Even in that case, it should be a direct download from a known model repository, and the system should explicitly inform the user (and ideally ask permission on first run) – but no other cloud calls (no license checks, no telemetry pings). This can be tested in an isolated network sandbox.

Autonomy on Fresh Install: The entire startup flow must succeed on a brand new machine with no prior configuration. We validate this by simulating a fresh install environment: no config files, no models, no environment variables set. The expected outcome is that the system still comes up completely: it should create any default directories (e.g., for model storage), fetch the model, and proceed to ready state without any manual steps. Passing this test means the zero-config promise is fulfilled. In user terms, “it just works.” We will have an automated test that clears the config directory and model directory, then runs the app and verifies it reaches the handshake stage and can respond to a sample prompt.

Error Handling & Recovery: If any startup step faces an issue – say the model download fails due to no internet, or the model engine fails to start – the system should handle it gracefully. Validation criteria here include: appropriate error messages are logged and relayed to UI (so the user can be informed, e.g., “Model download failed – please check your internet connection” rather than hanging); the system does not enter a broken state (for example, if the model fails to load, the orchestrator can continue running and the UI can show a meaningful error state, possibly allowing retry or model switch). We consider startup successful even if a recoverable error occurred, as long as the system handled it and informed the user what to do next (except that our goal is to minimize such situations). For testing, we intentionally cause failures (like corrupt the model file or occupy the default port) and verify that the system responds correctly (e.g., tries a different port or shows a friendly message).

Consistency with Design Principles: Finally, a qualitative validation: the startup sequence is checked against WIRTHFORGE’s core design principles. Does it maintain strict layer boundaries (no Layer 5 directly calling Layer 2, etc.)? Does it comply with security (binding to localhost only, no elevated permissions needed)? These are reviewed via code inspection or a checklist derived from the dependency documents (e.g., ensure that the orchestrator is the only writer of global state, per architecture spec). Any deviations would be flagged for redesign.

By satisfying these metrics and criteria, we ensure the automated startup not only works on paper but also in practice delivers a smooth, reliable experience that aligns with WIRTHFORGE’s promises.

🎨 Required Deliverables

To fully realize and document the startup system, the following deliverables are required:

Documentation Text: The comprehensive technical specification (this document), plus an executive summary highlighting the key points (for quick reference). The summary will concisely describe the startup flow, major decisions (FastAPI vs Flask, etc.), and how it benefits the user experience.

Visual Diagrams: Diagrammatic illustrations of the startup process, including a sequence diagram of the boot handshake (similar to the one above) and a system architecture diagram showing the orchestrator, model, and service components. These will be created in Mermaid and exported as SVG for inclusion in the docs repository. They serve both as documentation and as design aids for developers.

Configuration Schema: A machine-readable schema or example config (likely in JSON or YAML) representing the auto-detected settings. This schema (based on WF-FND-003 and WF-FND-005 data structures) will define fields like hardware tier, model choice, and any tunable parameters. For instance, a file startup-config.schema.json and a sample default-config.json should be provided. This helps in verifying and future-proofing the auto-detection logic.

Code Snippets and Stubs: Reference implementation snippets for critical parts of the startup. We will include a Python pseudocode (as above) and possibly a real code stub in the repository (e.g., code/WF-TECH-001/startup.py) that demonstrates launching the orchestrator and handling a simple handshake. Additionally, any scripts to auto-download models (like a Python function or shell script) should be provided as part of the deliverables. If applicable, a sample FastAPI endpoint definition (for the handshake or prompt route) can be included to illustrate the transport layer setup.

Test Specifications: A set of tests or at least a test plan validating the startup sequence. Ideally, a “startup smoke test” script will be delivered (could be an automated test that runs the app in a headless mode and checks for the handshake event and measures startup time). Performance test scripts to measure frame loop timing at startup can also be included. These deliverables ensure that quality criteria are not just discussed but also verified with real checks.

Logging & Monitoring Setup: Although not a separate document, as part of deliverables we ensure that the startup process has adequate logging (as seen in pseudocode) and possibly hooks for performance monitoring. For example, a log file or console output of the startup steps, and an optional verbose mode for debugging startup issues. This indirectly becomes a deliverable in that the documentation will include guidance on using these logs for troubleshooting.

All deliverables will follow the universal template and structure established by WF-META-001 – meaning we will produce the main document, a summary, diagrams, code, etc., each properly formatted and stored in the repository (with links updated in the documentation index).

✅ Quality Validation Criteria

To verify that this document and the described design meet the high standards set for WIRTHFORGE documentation and implementation, we apply the following quality checks:

Alignment with Architecture: The startup design strictly respects the five-layer architecture boundaries – e.g., the UI (Layer 5) only communicates to the core via the Transport layer (Layer 4) using defined contracts, and the orchestrator (Layer 3) is the only entity interacting with both the UI (through Layer 4) and the model (Layer 2). No component violates the allowed communication rules (ensured by reviewing that, for instance, the model doesn’t directly push to the UI without going through orchestrator). This criterion ensures architectural consistency with WF-FND-003.

Terminology Consistency: All specialized terms introduced are used according to the official glossary. Key terms like Energy, Frame, TTFT, Hardware Tier, Experience Orchestrator, etc., appear with clear definitions or context on first use, and any new terms (if we coined any in this doc) will be added to WF-FND-006’s glossary
GitHub
. We verify that every glossary term is used at least once in the exact form (to aid traceability) and that no informal or contradictory terminology slips in (for example, we consistently use “orchestrator” for the core engine, not interchangeably “controller” or some other name, to avoid confusion).

Failure Mode Coverage: The specification accounts for error cases and edge conditions. We check that for each step in the startup sequence, there’s an described behavior if something goes wrong (e.g., missing model file, port conflict, no GPU available despite high-tier config, UI connection delay, etc.). The Core Objective explicitly mentioned no manual setup; our validation is that indeed no step in the design says “the user must fix X”. Instead, the system’s response to problems is automated or at worst communicated clearly to the user. This criterion is met when the document (and planned implementation) have paths for all known failure modes (download fails, model fails to load, etc.) and those are tested in the deliverables.

Local-First Compliance: We cross-verify that the startup makes no assumptions that break the local-first or no-Docker rules. For instance, check that the design does not require a container image – indeed it does not, as everything runs via native Python and local binaries. Also, ensure no step contradicts the privacy ethos (no data is sent out). This is partly covered under metrics (no external traffic), but as a quality check, it’s a review item: any mention of external calls or cloud services in the startup must be either absent or strictly optional and user-controlled. The presence of this criterion underscores WIRTHFORGE’s uncompromising stance on running locally.

Performance and Footprint: The plan is evaluated to ensure it remains lightweight. We confirm that the described approach (Python asyncio, FastAPI, etc.) can meet the performance needs. If Python’s GIL could be a concern for truly parallel tasks, we’ve either mitigated it (e.g., the heavy model work happens in an external process, and FastAPI’s event loop and orchestrator loop can coexist without starving each other). The acceptance here is somewhat empirical – we might do a prototype run to measure CPU overhead and adjust if needed – but as a document criterion, we ensure we’ve cited or reasoned about performance (which we did in Validation & Metrics). Essentially, this check is: did we provide enough evidence or references (like the 60 Hz loop from WF-FND-002
GitHub
) that the design can fulfill its realtime goal? Yes, by referencing existing 60 Hz designs and planning backpressure for low-tier, we have.

Template Adherence: This document itself follows the WIRTHFORGE universal template structure (Document DNA through Post-Generation Protocol), which is a quality criterion for documentation. Every required section is present and complete. This ensures consistency across all docs in the project. On a content level, we also made sure to integrate inputs from all relevant foundation docs (checked off in the Knowledge Integration Checklist), which is a quality mark that this spec isn’t written in isolation but builds correctly on prior knowledge.

Each of these criteria will be reviewed during the document approval process. Meeting them means the design is not only well-thought technically but also clear, aligned with WIRTHFORGE values, and ready for implementation.

🔄 Post-Generation Protocol

After drafting and validating this document, a few follow-up actions are required to integrate it into the WIRTHFORGE documentation and development pipeline:

Glossary Updates: Add any new terminology or refined definitions from this doc to WF-FND-006 (the master glossary and knowledge base). For example, if “startup handshake” or specific event names were introduced here, they should appear in the glossary with brief definitions. Also update the entry for Energy or others if needed to reflect their usage in a startup context. This ensures consistency across documents and that future readers can reference definitions easily
GitHub
.

Asset Registration: Take the diagrams and code snippets produced for this spec and integrate them into the repository. Specifically, export the Mermaid diagrams to SVG/PDF and save them under assets/diagrams/WF-TECH-001-*.svg, updating the documentation asset manifest (so that WF-META-001’s inventory is updated with these new visuals). The pseudocode or code stubs can be added under a code/WF-TECH-001/ directory in the project. By properly checking in these assets and linking them, we maintain the single-source-of-truth nature of the docs.

Implement Tests & CI Hooks: Based on the Required Deliverables and Validation Criteria, create actual test cases in the codebase. For instance, implement the “startup smoke test” in the test suite (perhaps in a file tests/test_startup_sequence.py) which programmatically launches the application (maybe in a subprocess or using an integration test harness) and asserts that the handshake event is received within time, etc. These tests should then be added to the continuous integration pipeline so that any future changes to startup code will be automatically checked against the zero-config criteria. We will also set up performance monitoring for the 60 Hz loop as part of the test runs (to catch regressions where a code change might, say, slow the loop).

Cross-Reference Linking: Ensure that all references to this document from other docs are updated now that it exists. For example, WF-FND-003 mentioned a “Complete System Architecture” as WF-TECH-001; since we have now defined it (with an emphasis on startup), we should cross-link appropriately in WF-FND-003’s text and any other place where startup or system architecture is discussed. Also, plan the creation of the subsequent TECH docs it enables (Tech-002, 003, etc.), using this spec as a guiding requirement for what those should cover (e.g., Tech-002 will detail the model integration that we assumed here).

Team Review and Iteration: Circulate the document to relevant team members (architecture, engineering, UX) for feedback. In particular, coordinate with the UX team to verify that the described handshake and startup feedback meets their needs for the UI (they might have specific loading screen designs or want additional info during startup). Also discuss with the AI engineers whether the model auto-download approach is optimal (they might want to package a small model with the installer to truly avoid even first-run download – if so, note that as a revision to this plan). Collecting this feedback might result in minor edits or clarifications to the doc, which should be done while maintaining the version history (incrementing to v1.0.1 or v1.1 as needed, with changes logged in a CHANGELOG-WF-TECH-001.md).

Go/no-go Checklist: Before marking this document as finalized (“Production Ready”), double-check that all deliverables are attached and all criteria met. This includes verifying that the executive summary has been written and reviewed, the diagrams render correctly, and the sample code passes linting in context. Once verified, update the document status to Active and communicate the availability of this spec to the whole team as the baseline for implementing WIRTHFORGE’s automated startup experience.

Following this protocol ensures that the specification doesn’t remain theoretical. It becomes a living part of the project: driving code implementation, informing testers and designers, and remaining aligned with WIRTHFORGE’s evolving ecosystem. The ultimate measure of success will be when a new user downloads WIRTHFORGE, launches it, and within seconds is interacting with their own personal AI – no setup, no cloud, just pure local AI magic ⚡.---

## 📊 Technical Deliverables

All technical deliverables have been separated into individual files for better organization and maintainability:

### Architecture & Design
- **[WF-TECH-001-PROCESS-GRAPH.md](./WF-TECH-001-PROCESS-GRAPH.md)**: Main orchestrator components and system topology
- **[WF-TECH-001-C4-DIAGRAMS.md](./WF-TECH-001-C4-DIAGRAMS.md)**: C4 context, container, and component diagrams

### Configuration & Deployment
- **[WF-TECH-001-PROCESS-MANIFEST.yaml](./WF-TECH-001-PROCESS-MANIFEST.yaml)**: YAML manifest of all local processes
- **[WF-TECH-001-STARTUP-CHECKLIST.md](./WF-TECH-001-STARTUP-CHECKLIST.md)**: Boot sequence validation and integrity checks

### Implementation & Testing
- **[WF-TECH-001-BOOT-TESTS.py](./WF-TECH-001-BOOT-TESTS.py)**: Boot-time test specifications (≤2s to 60Hz readiness)
- **[WF-TECH-001-WEB-SERVER-CONFIG.py](./WF-TECH-001-WEB-SERVER-CONFIG.py)**: Local web server configuration
- **[WF-TECH-001-HEALTH-MONITOR.py](./WF-TECH-001-HEALTH-MONITOR.py)**: Process monitoring and health checks
- **[WF-TECH-001-INTEGRATION-SEAMS.py](./WF-TECH-001-INTEGRATION-SEAMS.py)**: Integration interfaces for TECH-002/003/004

### Deliverable Summary
- **4 Mermaid Diagrams**: Process graph, C4 context/container/component views
- **1 YAML Manifest**: Complete process definition with dependencies
- **1 Checklist**: 10-point startup validation procedure
- **4 Python Files**: Tests, configurations, monitoring, and integration interfaces

All deliverables follow the **web-engaged local-core** architecture with mandatory web UI and local-only computation.