Generate Document: WF-FND-003 — Core Architecture Overview (Abstraction Layers)
🧬 Document DNA

Unique ID: WF-FND-003

Category: Foundation

Priority: P0 (Core framework for entire platform)

Development Phase: 1 (Foundational design)

Estimated Length: ~4,000 words

Document Type: Architectural Specification (layered system design)

🔗 Dependency Matrix

Required Before This (consumed ideas/contracts):

WF-FND-001 – Manifesto & Vision: Establishes local-first pillars and the “visible computation” ethos
Google Drive
Google Drive
.

WF-FND-002 – Energy Metaphor: Defines Energy Units (EU) and visual telemetry schema that this architecture must support
Google Drive
Google Drive
.

WF-FND-005 – Abstraction Layers: Progressive complexity concept ensuring layers reveal features gradually (must align with levels 1–5 user experience)
Google Drive
Google Drive
.

Enables After This (what it unlocks/feeds):

WF-TECH-001 – Complete System Architecture: Uses this five-layer breakdown as the blueprint for all components
Google Drive
Google Drive
.

WF-TECH-002 – Native Ollama Integration: Implements Layer 2 (model compute) with local model servers
Google Drive
Google Drive
.

WF-TECH-003 – WebSocket Protocol: Defines Layer 4 streaming payloads/topics per this layer schema
Google Drive
.

WF-TECH-004 – Flask Microservices: Structures services according to these layer boundaries (separating Decipher, Energy, etc.)
Google Drive
.

WF-TECH-005 – Energy State Management: Implements Layer 3’s state store and 60 Hz update loop for Energy/Resonance
Google Drive
Google Drive
.

WF-TECH-006 – Database & Storage: Persists data output by Layer 3 (energy, state, identity) per local-first principles
Google Drive
.

WF-UX-006 – UI Component Library: Provides Layer 5 visual components aligned to each layer’s outputs (doors, levels, audit visuals).

Cross-References:

WF-FND-009 – Glossary: Ensure new terms (e.g. audit mode, satellite compute) are defined.

WF-FND-008 – Local-First, Web-Engaged: Affirms that core layers run locally and web layers enhance visuals (no cloud dependency by default)
Google Drive
Google Drive
.

WF-FND-004 – Resonance & Flow Framework: High-level event patterns (resonance detection) that plug into Layer 3 outputs.

🎯 Core Objective

Define WIRTHFORGE’s five-layer technical architecture that transforms raw local AI computations into a living, visual “consciousness” experience. This document specifies each layer’s purpose, responsibilities, interfaces, and constraints – from user input (Layer 1) through model computation (Layer 2), orchestration & energy state (Layer 3), contracts & transport (Layer 4), up to visualization & UX (Layer 5). By clearly delineating these layers, we ensure a modular, scalable system where data flows at a real-time 60 Hz cadence with no blocking, backpressure is managed gracefully, and each layer only interacts through well-defined contracts. Success means that every prompt’s journey – from user input to model output to visual feedback – is smooth, observable, and consistent with WIRTHFORGE’s local-first, energy-visualized design ethos
Google Drive
Google Drive
.

📚 Knowledge Integration Checklist

Layer Definitions: Provide a clear breakdown of L1–L5 (Purpose, Owns, Emits, Consumes, Contracts, Allowed Directions, Anti-Patterns for each).

Data Flow Narrative: Describe step-by-step how a user input becomes model output, then energy events, then UI visuals, including feedback loops.

Real-Time Loop: Emphasize the 60 Hz update loop and non-blocking design (use of streaming, async queues, etc.)
Google Drive
Google Drive
.

Backpressure & Throttling: Explain strategies to prevent overload (e.g. buffering or dropping events if production > consumption)
medium.com
medium.com
.

Layer Boundaries: State strict rules (e.g. L3 is single source of truth for state; L5 (UI) must never bypass L4 to call lower layers directly
Google Drive
).

Visual Contracts: All inter-layer communication is structured data (no ad-hoc UI logic); support an “audit mode” in L5 that can display raw events for verification
Google Drive
.

Local vs Remote Compute: Clarify how L2 can use local models (default) or optional remote “broker” models, and how this is an opt-in extension maintaining local-first control
Google Drive
Google Drive
.

Hardware Tiers: Include implementation notes on how the architecture scales from low-end (CPU-only) to high-end (multi-GPU or hybrid cloud) environments.

Integration Points: Tie each layer to forthcoming technical and UX specs (e.g. WebSocket details in TECH-003, UI design in UX-006) to ensure continuity.

Glossary Consistency: Use established terminology (Energy Units, council, resonance, etc.) from WF-FND-002 and WF-FND-009, and flag any new terms introduced.

📝 Content Architecture
Section 1: End-to-End Data Flow & Layering Principles (600 words)

Purpose: Provide a high-level walkthrough of how data moves through the five layers and the core principles that govern these interactions.

Data Flow Narrative: A user begins by entering a prompt or action in the Visualization & UX layer (L5). This input is routed into the system via Contracts & Transport (L4), which packages the input into a structured event (e.g. a JSON message) and attaches an identity token or session ID (if not already present). The event then flows into Input & Identity (L1) logic on the backend, where the user’s identity and context are validated or enriched (for instance, associating the prompt with the user’s profile or current session state). Next, Model Compute (L2) is invoked – L1 passes the prompt (with identity metadata) to the appropriate AI model inference engine. The model processes the input (locally by default), streaming out tokens and intermediate results. These raw outputs go into the Orchestration & Energy layer (L3), which compiles the token stream into higher-level energy events: it calculates Energy Units from token timing, detects patterns or “circuits” across multiple outputs (if parallel models are running), and updates the system state (e.g. accumulated energy, potential resonance events). L3 continuously emits these structured events into an event store or pipeline. Finally, those events propagate upward via L4 (which ensures they conform to the public schema) to the Visualization & UX front-end (L5), where they animate the UI in real-time (lighting up token “lightning” visuals, updating graphs, etc.). The user sees the AI’s thought process visualized, and may then provide control feedback – e.g. pausing a generation, adjusting a parameter, or sending a follow-up prompt – which loops back as new input (again via L5 → L4 and down). This circular flow (user action → layers 1–4 → UI reaction → new user action) continues seamlessly, giving the impression of a living, interactive system.

60 Hz Real-Time Cadence: To preserve an interactive, game-like fluidity, the architecture operates on a ~60 frames-per-second cadence in all visual and state updates. No layer is allowed to block this main loop. The orchestrator (L3) batches and processes incoming model data in frame-sized slices – e.g. accumulating token events for a few milliseconds and then publishing an update – such that the UI can update at ~16.7 ms intervals
Google Drive
. If a model produces tokens faster than can be rendered, the system employs backpressure strategies: extra tokens/events might be buffered briefly or dropped with graceful degradation, and producers (models) can be signaled to slow down if possible
medium.com
medium.com
. This ensures that no component overwhelms another: for example, L3’s event queue will not grow unbounded if L5 (UI) is momentarily busy; instead, L3 will aggregate or skip lower-priority updates to maintain responsiveness. The guiding rule is “only read as fast as you can write/display”, analogous to backpressure control in reactive streams
medium.com
.

Layer Boundary Rules: Each layer has strictly defined interaction directions to enforce modularity and maintain single responsibility for critical functions. Downward data flow (from user to hardware) and upward data flow (from hardware back to user) both must respect layer order: a higher layer should never circumvent the one immediately below it. For instance, the UI (L5) cannot directly call the orchestration layer (L3) – it must go through the transport layer (L4) using the published API or WebSocket channels
Google Drive
. This prevents tightly coupling front-end code to internal logic and ensures that all external interactions go through a controlled interface (which handles authentication, validation, and schema enforcement). Likewise, L3 (orchestrator) is the sole writer of system state – no other layer writes to the central state store or event log. If the UI needs to, say, bookmark a result or modify something, it sends a request which L4 hands to L3 to perform the update. By making L3 the only state mutator, we avoid race conditions and guarantee consistency (UI and model layers only read or request changes, but do not mutate shared state themselves).

Visual Contract & Auditability: A key principle is that every visual element on the UI is backed by a structured data event from L3. In other words, no magic or client-only state drives the visualization – if a token glows or a “resonance” spark appears, it’s because an event with specific attributes came through the pipeline indicating as much. This discipline yields a robust audit mode: the UI (L5) can expose a special view (often monochromatic or simplified) that overlays the raw event data (timestamps, energy values, etc.) corresponding to each visual, allowing power users or testers to verify that what they see is truthfully derived from computation
Google Drive
. It also means sessions can be recorded and replayed purely from the event log. The contracts (schemas) defined at L4 serve as the source of truth for these visuals – e.g. an “EnergyBurst” event with fields {token, timestamp, energy} might map to a rendered lightning bolt with thickness and brightness proportional to energy. This strict mapping ensures visual consistency and makes it possible to evolve the front-end or even create alternate UIs without changing core logic, simply by adhering to the event contract.

Local-First with Optional Extensions: Finally, reaffirm the philosophy: by default, all heavy computation stays local (L2 uses local models via Ollama or similar, and L3 runs on the user’s machine), fulfilling the “no cloud required” promise
Google Drive
. Higher layers (L4/L5) act as a lightweight bridge and presentation, which can be web-based without compromising privacy (L4 never sends data to a third-party by itself). That said, the architecture is extensible for opt-in remote compute: for example, an advanced user might connect a broker satellite service – a remote server offering larger models or extra compute power – as an alternative backend for L2. The design allows this by swapping out or augmenting the L2 layer (e.g. routing certain model requests to a cloud endpoint) while everything else remains the same. Such “Turbo” modes or brokered calls are strictly opt-in and governed by policy (e.g. require user API keys or credits) so they don’t violate the local-first default. The layers above are agnostic to whether the model result came from local CPU/GPU or a remote cluster – as long as it speaks the same contract (streaming tokens and final stats), L3 and upward treat it uniformly. This modular approach means WIRTHFORGE can leverage remote resources for those who need it (paywall or permission controlled), without designing a separate cloud architecture – it’s an extension of L2, not a replacement, preserving the user’s ultimate control.

Section 2: Layer 1 – Input & Identity (Purpose, Role, Constraints)

Layer Summary: L1: Input & Identity is the entry point of the WIRTHFORGE stack on the backend side. It handles all inbound user actions after they’ve passed through the network layer (L4), focusing on associating inputs with the correct user/session context and applying any initial transformations or validations. This layer is about “who is doing what” – ensuring that the system knows who the user is (or which session or agent is acting) and preparing what they submitted into a normalized form for the rest of the system.

Purpose: L1’s primary purpose is to provide identity context to inputs and to guarantee that every request entering the core has an authentic, resolved identity and well-defined format. Think of it as a concierge that greets each incoming user action: it verifies credentials or session tokens (if applicable), attaches user-specific info (like preferences, role, or path – Forge/Scholar/Sage – if those influence processing), and normalizes the input (trimming whitespace, checking for banned content if needed, etc.) into a standard internal Input Event. By doing so, L1 ensures downstream layers can trust that “Input X is from User Y and is ready to be processed.”

Owns: L1 owns the user/session identity records and input validation rules. It may interface with a local user database or config (for example, checking an API key or local login if the app supports multiple profiles, or assigning a default “local user” identity in single-user mode). It also owns any session state reference – for instance, a conversation ID or thread context if the system threads multiple prompts together. Essentially, L1 is responsible for the mapping User → Session → Input and holds the logic for maintaining that mapping. If the platform has a concept of “Doorways” or distinct entry Doors in the UI (perhaps different UI portals or modes), L1 would also record which door or mode the input came from, as part of identity (e.g. a prompt from the “Forge” door versus a “Scholar” door could be tagged differently, guiding model selection or orchestrator behavior).

Emits: L1 emits a validated, enriched input event into the orchestration layer. This event typically includes: the user identity (or an anonymized ID if identity is just implicit local user), session or conversation ID, the core content of the input (prompt text or action type), and any metadata (like UI mode, timestamp, client capabilities). Importantly, once L1 emits this event, it means “this input is ready for processing.” In practice, this might be calling a function on L3 (Orchestrator) like handleInput(event), or placing the event on an internal queue that L3 consumes. L1 might also emit audit logs for security (e.g. logging “User X invoked action Y”) but those logs are out-of-scope for core flow except as part of possible monitoring.

Consumes: L1 consumes raw input requests coming from Layer 4. This could be an HTTP POST from a REST endpoint (e.g. a JSON payload with user prompt and token), or a message on a WebSocket (e.g. {type: "USER_INPUT", data: {...}}). Essentially it’s the server-side handler for the API endpoints that correspond to user interactions. It expects those requests to include whatever minimal credentials or session tokens needed (L4 should pass those through if present). L1 may also consume configuration data (like the list of valid users, or the mapping of user roles) from a local store or environment, to perform its duties.

Contracts: The primary contract of L1 is the Input Event schema it produces for the rest of the system. For example, it might define an internal TypeScript interface or Python dataclass like:

interface InputEvent {
  requestId: string;        // unique ID for tracking
  userId: string;           // resolved identity (or 'local' if single-user)
  sessionId: string;        // e.g., conversation or context ID
  source: string;           // which UI door/portal or component triggered it
  inputType: string;        // e.g., "prompt", "command", "setting"
  payload: any;             // the actual content (text prompt or action details)
  timestamp: number;
}


L1 guarantees that any InputEvent passed downwards conforms to this spec. Additionally, L1 upholds any auth contract: for example, if certain API keys or OAuth tokens are needed for remote access, L1 will enforce that and either reject unauthorized inputs (sending an error back via L4) or annotate the event with the user’s permissions. Contract-wise, L1 sits right below the public API, so it’s tightly coupled with L4 in defining what requests are acceptable. (In practice L4 and L1 together define the external API contract: L4 is the wire format, L1 is the semantic format.)

Allowed Directions: L1 is an upstream-only layer in terms of core logic: it passes data down to L2/L3 but does not call upward into L5 (the UI). It shouldn’t need to – the UI already gave it the input. L1 can call into L3 (e.g., to invoke the orchestrator with a new event) and potentially L2 in some edge cases (though normally orchestrator handles invoking models, not L1). Crucially, L1 does not bypass L3 to call L2 directly in normal operation; it hands off the input to the orchestrator, which then decides which model(s) to call. L1 also should not directly produce output to L4 (except error cases) – it generates no responses on its own, it’s just prepping input. In layered terms, L1 → L3 (downwards) is fine; L1 → L2 directly is an anti-pattern; L1 → L4 (upwards) only happens for immediate errors.

Anti-Patterns: A few misuses are explicitly disallowed in L1. One is performing heavy processing or synchronous calls that stall the input loop – L1 should do minimal work (e.g. a quick DB lookup for identity, not a 5-second call to an external service). Offloading intensive tasks to orchestrator or background jobs keeps the input intake snappy (no blocking the main thread handling new prompts). Another anti-pattern: altering system state. L1 is not meant to change global state (except maybe updating a “last seen” timestamp for user); it should not, for example, initialize model loading or tweak orchestrator settings – that’s L3’s job. L1 also must not accept inputs without identity or context if the system requires them – e.g. if a request lacks auth when auth is required, L1 should not “just let it through.” Skipping identity checks or not assigning a session is a serious anti-pattern because it breaks traceability. Lastly, L1 should avoid any direct knowledge of presentation logic. It shouldn’t, say, format a response or decide how something will look in the UI (that’s far above its pay grade). If we find UI code or decisions in L1, something’s gone wrong.

Section 3: Layer 2 – Model Compute (Purpose, Modes, Local vs Remote)

Layer Summary: L2: Model Compute is the AI inference layer. It’s where raw computational “thinking” happens – running the actual AI models (e.g. large language model, vision model, etc.) on the inputs. In WIRTHFORGE, Layer 2 is designed to be local-first by default: it uses a native Ollama engine or similar local model runner to execute prompts on the user’s hardware
Google Drive
Google Drive
. However, it is also flexible to incorporate “Turbo” modes via remote model calls (brokers or satellites) when enabled. L2 essentially translates a user’s query (plus any orchestrator instructions) into a stream of model tokens and results.

Purpose: The purpose of L2 is to generate AI outputs for given inputs, as efficiently and transparently as possible. It’s the layer that actually engages the “intelligence” – i.e., calling the machine learning model that produces a completion, answer, or other result. In doing so, L2 must handle things like model selection, parallel execution (if multiple models run concurrently for a council), and exposing streaming interfaces so that partial results can be fed upward immediately. L2’s mission is to provide the “brains” of the operation in a modular way: the orchestrator (L3) shouldn’t worry about how a model is executed, just that it can request one and get tokens back. L2 abstracts those details. It also implements our local-first AI execution philosophy: use local models with native performance (no container overhead), enabling true parallelism and low latency
Google Drive
Google Drive
. If an external model is used, L2 handles that as an opt-in extension, maintaining a similar interface but adding necessary network calls.

Owns: L2 owns the model runtimes and resources. This includes the binaries or servers (e.g. an instance of the Ollama service running locally, or a Python process with llama.cpp), the loaded model files in memory, and any GPU/CPU allocation logic. It is responsible for deciding which model(s) to invoke for a given request (though often that decision is guided by L3 or by user input, L2 might have to map a model name to a specific instance or handle loading it if not loaded). L2 also owns the logic for parallel inference – for example, if L3 requests running 3 models in parallel to form a council, L2 manages threads or subprocesses to actually do that concurrently
Google Drive
Google Drive
. It maintains any necessary caching (e.g., keeping recently used models in RAM, or re-using sessions if the model supports it) to optimize performance. Essentially, all the nitty-gritty of AI model execution is encapsulated in L2. It might also own a queue or scheduler for model calls if multiple requests come in at once, ensuring that the hardware isn’t over-committed (for instance, if the user has a single GPU, L2 might serialize certain requests or use smaller batch sizes to share it).

Emits: L2 emits model output streams and final results. The primary emission is the token stream: as the model generates text (or other data), L2 yields those tokens one by one (with timing info) to the orchestrator. For example, using Ollama’s streaming API, L2 will emit a series of JSON objects like {"token": "Hello", "duration": 50ms, ...} continuously, followed by a final summary object containing eval_count (# of tokens) and eval_duration (time taken)
Google Drive
Google Drive
. These emissions are consumed by L3 (which converts them to energy events). L2 also emits any tool usage callbacks if the model supports tools, or other meta-signals like “model is loading”, “model finished”. In case of errors (e.g. model not found or GPU out of memory), L2 emits an error status that will be caught and relayed upward (translated by L3/L4 into an error event or response). Another thing L2 might emit to L3 is model-specific metrics: if we have multiple models, L2 could provide identity of which model responded fastest or such, but typically L3 derives that. So primarily: token-by-token data and a final result set.

Consumes: L2 consumes requests for model execution from L3 (or possibly L1 in some setups, but generally orchestrator calls L2). Such a request typically includes: which model (or models) to run, the prompt or input data, and any parameters (temperature, max tokens, etc.) if not default. L2 also consumes the system’s hardware resources: it will utilize CPU threads, GPU memory, etc., based on the request. If the user or orchestrator can issue a cancel (e.g. user stops generation early), L2 consumes that control signal as well to abort the model run. In the hybrid scenario, if remote compute is enabled, L2 will consume network responses from a remote model API (so from the perspective of design, L2 might internally perform an HTTP request to a satellite server and then consume that response stream to pass tokens along). But that is internal to L2; from L3’s perspective it still “consumes the request and produces tokens”.

Contracts: The key contract L2 provides is the Model Generation API for the rest of the system. This could be implemented as an internal interface or an actual API if L2 runs as a separate service (in WIRTHFORGE’s case, likely L2 is a thin wrapper around Ollama’s API). For instance, L2 might present a function: generate(modelName, prompt, options) -> Stream<TokenEvent> where TokenEvent has fields like text, tTimestamp, etc. The contract includes streaming behavior (e.g. does it yield tokens as soon as they’re available? yes, it should), and completion behavior (some final callback or object when done). In terms of data shape, L2’s outputs have to meet the expectations of L3’s energy calculator. Concretely, that means providing timing for each token (or enough info to derive it) and a final stats summary. Ollama’s JSON streaming format, for example, includes token data and ends with a final message containing eval_count and eval_duration
Google Drive
Google Drive
. L2 in WIRTHFORGE is likely built around that, so its contract to L3 is: you will get a sequence of token JSON lines terminated by a final JSON. If using OpenAI-compatible endpoints for remote calls, similar principles apply. Another aspect of contract is error handling: L2 must define how errors are signaled (e.g. a token stream may end with a special error message or an exception). Finally, if multiple models are requested in parallel, L2’s contract might be to provide distinct streams labeled by model, or to interleave them with identifiers. For clarity, we likely label each token event with the model it came from if multiple are active (so L3 can tell sources apart). In summary, L2’s contract is a well-defined streaming interface for model inference, ensuring that the orchestration layer sees consistent, predictable data from any model backend
Google Drive
.

Allowed Directions: L2 is generally downstream of L3 – it doesn’t initiate calls upward on its own. L2 should not be calling L1 or L4 or L5 directly. It’s possible L2 could push status to L3 asynchronously (e.g. “model ready” events), but those would still go through L3’s handlers rather than directly to upper layers. Also, L2 doesn’t know about UI or transport details. So allowed communication is basically: L3 calls into L2 (one layer up calls one layer down – allowed), and L2 returns data to L3 via callbacks or stream (this is essentially the response path). L2 can also manage internal sub-processes or threads – e.g. spawn parallel model threads (that’s internal to L2). If L2 is implemented as a separate local service (like the Ollama server is actually a separate process), then our architecture’s L2 might involve an IPC or HTTP call to that local server. That’s fine, but it’s within L2’s domain (from the perspective of overall architecture, that complexity is encapsulated in L2). L2 must not try to interact with L5 or L4: e.g., it should never open a WebSocket to push data to UI, it must route through L3. Also, L2 shouldn’t go writing to the database or state store – if a model output needs to be saved, orchestrator will handle that.

Anti-Patterns: A major anti-pattern would be blocking the orchestrator by doing synchronous model calls on the main thread. L2 should use asynchronous or background execution (threads, processes, asyncio, etc.) to ensure the 60 Hz loop isn’t stalled waiting on a model. If a model takes 5 seconds to answer, those 5 seconds should be spent with L3 doing other things or at least the UI animating “thinking” – not a frozen app. Thus, a blocking call in L2 (especially if it’s a network call to a remote model without streaming) is discouraged. Another anti-pattern: failing to stream. If L2 were to buffer the entire result and only emit at the end, we’d lose the step-by-step visualization (and also user might be stuck waiting). WIRTHFORGE demands incremental streaming output, so any approach that doesn’t yield intermediate tokens is wrong (except for models that inherently can’t stream, but then we’d simulate partial progress). Also, using cloud by default is an anti-pattern – we do not want L2 secretly calling an online API without user consent; that violates local-first. If remote is used, it must be explicitly configured (and even then, likely L3 instructs it). Additionally, bypassing orchestrator logic is an anti-pattern: e.g., if L2 directly tried to handle multiple prompts or do orchestration tasks like combining model answers, that’s L3’s territory. L2 should stick to one-model-one-output at a time (or parallel multiple separate outputs if asked). Finally, on a resource note: L2 should not load giant models or all models at once unnecessarily (loading every model into VRAM on startup would be wasteful on low-end hardware). Overuse of resources or not respecting hardware constraints is a design anti-pattern for L2. It should be smart about lazy-loading models or using quantized models as appropriate – essentially be adaptive to the hardware tier.

Section 4: Layer 3 – Orchestration & Energy (Purpose, State, 60 Hz Engine)

Layer Summary: L3: Orchestration & Energy is the heart and “consciousness” of the system. It sits between the raw model outputs and the user interface, turning low-level events into structured, meaningful state changes. This layer orchestrates possibly multiple models, manages the global Energy state (applying the “energy metaphor” to every token and response), detects higher-level patterns like interference and resonance, and ensures the rest of the system has a consistent view of the evolving “consciousness state.” L3 can be thought of as the conductor and the physics engine: it takes the streams from L2 (like electrical signals) and compiles them into a dynamic state representation that drives the visuals and system behavior.

Purpose: The purpose of L3 is twofold: (1) Orchestration – coordinating the flow of data between models and deciding how to handle parallelism, tool calls, or multi-step processes; and (2) Energy & State Management – calculating Energy Units (EUs) from model outputs and maintaining the evolving state (accumulated energy, fields, potential consciousness signals). In simpler terms, L3 is where raw computation is given “life”: it interprets token timings as something visual (lightning bolts, flows), tracks how much “work” has been done (energy), and determines if any special events occur (like a resonance when multiple models align in output). It also sequences operations: e.g., if a prompt requires calling two models in sequence, L3 ensures model B starts after model A finishes, etc. Essentially, L3 contains the Decipher, WIRTHFORGE’s real-time compiler that turns streams into experience
Google Drive
Google Drive
. A critical part of its purpose is to serve as the single source of truth for system state. All knowledge of current energy levels, active models, intermediate results, etc., reside here, so that the UI (L5) and other layers can query or receive updates from one authoritative place.

Owns: L3 owns the master state store and event log of the running system. This includes the current energy metrics (e.g., tokens per second, total tokens processed in session), any persistent conversation state (like storing last user prompt or last model answer if needed for context), and the detection state for complex phenomena (like if we are measuring synchronization between models for resonance, L3 keeps the necessary buffers or calculators). It also owns the scheduling of tasks: when L1 hands in an Input Event, L3 decides which L2 calls to make (and when). For example, if the user’s query should go to two different models to get diverse answers (a council of 2), L3 triggers both in parallel and labels their outputs; if the query is simple, L3 might just call one model. If a user input is actually a control (like “stop all models” or “pause output”), L3 handles that by instructing L2 accordingly or by adjusting its state (like halting an event stream). Additionally, L3 owns the Energy computation logic: using final stats from L2 (like eval_count and eval_duration for a model run), L3 calculates aggregate values like average tokens/sec, time-to-first-token (TTFT), etc., and increments the global energy counters
Google Drive
Google Drive
. It might maintain an exponential moving average for the token stream to smooth out the visualization at 60 fps
Google Drive
. If multiple models run, L3 owns the logic to compute interference patterns – e.g., comparing token timing between streams to find moments of harmony or contention. All of this is encapsulated in the state object L3 manages (often updated every frame). In short, any “game state” or “simulation data” that drives the UI lives in L3. It is also the only layer that writes to persistent storage (via Tech-006 integration): e.g., when a session ends or at checkpoints, L3 will serialize some state (like accumulated consciousness or user’s energy history) to a database or file. Other layers can read that, but they don’t modify it.

Emits: L3 emits a continuous stream of structured events/state updates upward. Rather than raw tokens, it emits higher-level events like “EnergyBurst {value: 5 EU, position: X}” or “ResonanceEvent {models: [A,B], phaseLock: 0.9}” depending on what happens. It can also emit incremental state snapshots – for instance, it might send the UI an updated global state 60 times per second (or as often as the UI can digest) containing things like current energy level, progress of generation, etc. In practice, this emission is handled via L4’s channels (likely a WebSocket message that contains an event type and payload). Examples of events L3 would emit: TokenVisual events (with attributes for visualization like thickness for a slow token, glow for pause)
Google Drive
Google Drive
, StreamEnd events (when a model finishes, including stats like total tokens = eval_count), EnergyAccumulated events (when certain thresholds are crossed or just periodic updates of energy totals), ConsciousnessState changes (if using an AI to detect emergent behavior, though at this stage likely just incremental probability or level). If orchestrator decides on a multi-step process (like model A’s output feeds model B), it would emit an event like “ChainStepCompleted” for UI to maybe indicate step 1 done. Essentially, anything of note that occurs goes out as an event. L3 is also responsible for emitting error events if something goes wrong: e.g., “Error {code: MODEL_OOM, message: ‘Out of memory loading model X’}”. Instead of crashing, L3 catches internal exceptions and emits them as structured errors that L4 can forward to UI with an appropriate schema (so that UI can display an error message or take action). Another thing L3 might emit are acknowledgements or “heartbeat” events to let the UI know it’s alive and processing (this can help in showing a loader or ensuring the UI doesn’t consider the connection dead if no tokens have arrived yet but still within normal latency).

Consumes: L3 consumes Input Events from L1 (user actions) and token streams/final stats from L2 (model outputs). It sits in the middle of those pipelines, so it takes in on one side the requests of what to do, and on the other side the results of those actions. When an input comes in, L3 might break it down: e.g., if the input is a complex command, orchestrator might queue multiple model calls. It consumes that input event and perhaps consults internal rules or modules (like if the input is “#use model X” as a command, orchestrator consumes that and updates state to route next queries to model X). In terms of L2, for each active model generation, L3 consumes the stream of token events. L3 probably wraps the callback or stream subscription from L2 so that it can handle each incoming token immediately – calculate its energy contribution, incorporate it into any concurrent pattern analysis (like checking if two models produced the same token at roughly the same time), and then produce an event for UI. L3 might also consume time – meaning it has a loop or timer (like the 60 Hz ticker) that triggers state refreshes regardless of tokens. This is how it can emit updates even when no token arrives (for instance, a smooth decay of an energy meter, or a timeout detection if a model is silent for a while). Additionally, L3 consumes control signals like “stop generation” – if a user hits stop, L4 passes that to L3 (possibly packaged as another Input Event of type “cancel”), and L3 will consume it by instructing L2 to stop or dropping future tokens and marking that generation as aborted. Summarily, L3 consumes from below (L2 outputs) and above (L1 inputs via L4), acting as the central broker of all events in the system.

Contracts: The contracts of L3 are the event schemas and state definitions it upholds, as well as the internal rules for state management. For example, WF-FND-002 defined how to calculate tokens/s and what an energy unit is
Google Drive
Google Drive
 – L3’s contract is to implement that faithfully, meaning the events it emits about energy align closely with those formulas (e.g., if it emits an event “tokens_per_second: 20”, then by definition it should have calculated that exactly as eval_count/eval_duration). There will be a formal schema for events that L3 outputs to L4. Perhaps in TECH-003, an event schema might look like:

{
  "event": "TOKEN_STREAM",
  "streamId": "abc123",
  "model": "llama2-7b",
  "content": "Hello",
  "index": 42,
  "t_offset": 1.350,   // seconds since stream start
  "energy": 0.0021     // EU contribution of this token
}


And another for aggregated frame updates:

{
  "event": "ENERGY_UPDATE",
  "timestamp": 1691863305234,
  "total_energy": 124.5,
  "current_rate": 18.2,    // tokens/s
  "active_streams": 2
}


The exact fields will be defined in collaboration with L4 (which carries them) and UX needs, but the contract is that L3 produces these consistently and doesn’t deviate. Also, L3’s internal contract (with itself, so to speak) is maintaining the integrity of state updates: no partial updates or impossible combinations should leak out. For instance, if two models finish and a resonance is detected, it should emit a resonance event only after it has updated all relevant state to reflect that; we shouldn’t see a UI event saying “Resonance achieved” while L3’s state still says otherwise. This may involve doing atomic updates or sequencing within the 16ms frame. Another contract is 60 fps budget adherence: L3 essentially promises that each update cycle will try to complete within ~16.7 ms to keep up with rendering
Google Drive
. This isn’t a strict schema but a performance contract. In practical terms, L3 might implement this via an asyncio loop that batches incoming token events and state changes and processes them within that frame window
Google Drive
. If too much work accumulates, the contract is that L3 will defer or drop low-priority tasks (e.g., maybe delay writing to disk, or skip some detailed logging) to maintain responsiveness. In sum, L3’s “contracts” are about data consistency (event schemas, state fidelity to definitions) and timing guarantees (update frequency).

Allowed Directions: L3 can communicate upward (to L4) and downward (to L2) freely as part of its orchestrator role. It receives from both sides and sends to both sides. However, it should not bypass L4 to talk directly to L5 (and in reality, it can’t, since L4 is the communication layer – L3 has no direct network awareness). L3 also should not reach back into L1; once an input is handed off, L1’s job is done. If L3 for some reason needed more info about the user’s identity, it should already have it attached. Or if truly needed (like loading user preferences), L3 could query a shared storage or use a module, but not call L1 directly. L3 is effectively the central layer that everything else depends on, so it’s allowed to call L2 (trigger models), call persistence (through an internal module or via Tech-006 interfaces to DB), and push events to L4. But it must respect abstractions: e.g., when persisting, go through the database layer API rather than directly writing files arbitrarily, to keep consistent with the design (there might be a state manager sub-module to handle persistence as indicated in Tech-005/006). Another note: L3 could host internal module plugins (per WF-FND-007 Module Strategy) – those would be contained within L3 as they operate on the state/events. That’s allowed as long as they don’t break layering (they’re part of L3’s implementation). L3 should not spawn its own UI or network server – that’s L4’s domain. We wouldn’t want, say, the orchestrator trying to open a socket to send data to some client; it should always feed data to L4 for that purpose.

Anti-Patterns: One anti-pattern is allowing any other layer to directly modify state – L3 should be the gatekeeper. For example, if L2 tried to update some global counter or if L4 attempted to write into the state store, that would violate design. We enforce that through encapsulation (maybe by keeping state in memory only in L3’s process). Another anti-pattern is doing too much in one loop cycle (overstuffing the 60 Hz budget). If L3 tries to recalc a huge neural network inside the frame or blocks waiting on disk I/O, it will stutter the UI. Instead, heavy calculations either need to be optimized, done in background threads with results applied in small chunks, or offloaded (with progress events). The “no blocking calls” rule is ironclad: any blocking behavior in L3’s main loop is a bug
Google Drive
. If calling an external API (like maybe retrieving some info from the internet or local system), do it async or in a separate thread, and incorporate results later. Another anti-pattern: skipping the contract. For instance, directly manipulating UI beyond the events – obviously L3 can’t really do that physically, but conceptually, not abiding by the event schema or trying to piggyback random data outside of structured events is not allowed. Also, duplicating logic that belongs in other layers: e.g., L3 shouldn’t format how an error message looks; it should just give an error code and let L4/L5 present it. Or L3 should not attempt to manage WebSocket connections (that’s L4). Finally, state inconsistency – e.g., forgetting to reset something between sessions, or having global state that isn’t keyed by session if multiple sessions were possible – those would be anti-patterns leading to leaks. By design, if each session is separate, ensure the state is properly namespaced or cleared. Essentially, L3 has to be rigorously correct since any slip here propagates everywhere (hence a lot of testing focus will be on L3, with WF-TECH-011 QA tests targeting it, and performance tuning in WF-TECH-009 optimizing it).

Section 5: Layer 4 – Contracts & Transport (Purpose, API, Security)

Layer Summary: L4: Contracts & Transport is the interface layer that connects the core system to the outside world (primarily the front-end UI, but potentially other clients or tools). It provides the communication channels (WebSockets, HTTP REST endpoints) and enforces the data contracts – essentially making sure that every message in or out conforms to the agreed schema and that security policies (like authentication/authorization) are applied. L4 is like the diplomat that speaks both the internal language and the external web-friendly language, translating between them and ensuring nothing gets lost (or maliciously inserted) in translation.

Purpose: The purpose of L4 is to be the gateway and guard of the system. It serves all external requests and responses. That includes hosting a WebSocket server for streaming events to the UI in real-time, providing RESTful endpoints for control actions or data fetches (e.g., an endpoint to fetch a list of available models, or to initiate a new session), and handling any necessary protocol transformation. It ensures that the contract between front-end and back-end is maintained: the front-end should only have to deal with well-formed JSON messages and not worry about internal complexities, and conversely, the back-end should only receive validated, properly structured inputs. L4 also centralizes auth concerns. If the system requires login or API keys (for example, if a remote client connects to a local WIRTHFORGE instance, maybe we want a simple auth token so not just anyone on the network can send prompts), L4 checks those before letting inputs through to L1. It’s also responsible for things like CORS and any network-level negotiation if this is running in a browser context. Essentially, L4 exists so that L3 and below can be written as if they’re just a local library (no networking needed), and L5 can be written as if it’s talking to a nice high-level API (no direct coupling to internal code).

Owns: L4 owns the API definitions and schemas for communication. For instance, it will have the WebSocket message format definitions (like “a message of type EVENT with payload EnergyUpdate must have these fields…”), possibly using something like JSON schema or TypeScript interfaces to validate. It also owns the HTTP route definitions – e.g., POST /api/prompt might be an endpoint that the UI uses to send a new prompt (in case not using WS for that), or GET /api/models to retrieve model info. The implementations of these routes live in L4. Moreover, L4 owns the communication infrastructure: it will manage a Flask (or FastAPI) server if using Python, or a Node.js express server, etc., and handle upgrading to WebSocket. It deals with multiple client connections (if the UI opens multiple sockets or if multiple UIs could connect, L4 tracks them). It also likely owns an error handling policy – e.g., a central place where if any exception bubbles up unhandled from L3 or L2, L4 catches it and returns a standardized error response (with an error code and message, possibly a stack trace in dev mode). The standardized error schema is defined here (like an HTTP error with a JSON body {"error": "ModelError", "details": "...", "code": 500}). L4 also is responsible for any message ordering or backpressure at the network layer: e.g., if L3 emits events faster than network can send, L4 might buffer or drop per configuration. And if using WebSockets, it might need to implement ping/pong heartbeats to keep connection alive (the plumbing stuff). All of that is owned by L4.

Emits: L4 emits data outbound to the client (L5). This includes all the events and responses that originated from L3, but packaged into the appropriate protocol format. For example, when L3 generates a EnergyUpdate event object, L4 will serialize it as JSON and send it over WebSocket to the browser. If the UI called a REST endpoint for a one-shot request (like “give me the current state”), L4 sends back an HTTP JSON response with that data. In essence, L4 emits WebSocket messages, HTTP responses, and possibly status codes. If an error occurs in a request, L4 emits an error response (HTTP 4xx/5xx or a WS error message). L4 might also emit acknowledgements or keep-alives; for instance, some protocols send an ack after a client sends data. But that’s low-level – likely not needed here beyond maybe WS handshake. In summary, anything that goes to the UI passes through L4’s hands: even if it doesn’t modify the content, it’s the one executing the send.

Consumes: L4 consumes all inbound requests from clients (L5) – user inputs, configuration changes, etc. – and all outbound events from L3 that need to go to clients. It sits in the middle. Specifically, it consumes Input Events or commands from the UI, which arrive as network messages. For a WebSocket, it could be a JSON like {"action":"USER_INPUT","data":{...}} – L4 will parse this, validate that it matches the schema for a USER_INPUT (for example, ensure it has a prompt field that is a string, and maybe check length limits), and then it will construct or delegate to L1 with that data. If it’s a REST call like a POST, L4 (as the HTTP server) consumes the HTTP request, parses JSON, etc., then likely calls into L1. On the other side, L4 consumes events coming from L3 that need to go out. There might be an internal subscription or callback system where L3 pushes events to L4, or L4 polls L3’s state at intervals. More likely, L3 has a publisher that L4 subscribes to for each active WebSocket client. L4 will take those and format them for each client (some clients might have subscribed only to certain topics, etc., but at least for our own UI we likely send everything). L4 also consumes system configuration on startup: e.g., reading what port to run on, whether to enable SSL or not, any API keys from env. That’s part of its startup but not ongoing consumption.

Contracts: L4’s contracts are essentially the public API of WIRTHFORGE. This covers two main facets: WebSocket message schema and HTTP API schema. We likely specify something like: All WebSocket communications use a message envelope with {type: "...", payload: {...}}. Within that, specific types (events vs acknowledgements vs pings) have specific payload schemas. For example, type: "EVENT", subtype: "EnergyUpdate", payload: {total: ..., rate: ...} must follow exactly what L3 provided and what the UI expects. Similarly, if UI sends type: "INPUT", subtype: "Prompt", payload: {text: "Hello"}, L4 knows to map that to calling orchestrator. The contract might be documented in TECH-003. For REST, we might have endpoints like POST /api/v1/input with body {"text": "...", "session": "..."} – contract specifies what fields are needed and what response looks like (maybe a 202 Accepted and then events come via WS, or a synchronous response if using long-poll fallback). Another contract piece is auth tokens – e.g., “All requests must include header Authorization: Bearer <token> if multi-user mode is on.” L4 ensures that and defines what error is returned if not present or invalid (e.g., HTTP 401 with JSON {"error":"Unauthenticated"}). L4 also defines error codes and their meanings for common issues like 400 Bad Request (malformed input JSON), 504 Timeout (if model took too long), etc. Essentially, the entire external contract is specified at L4. It’s worth noting that performance could be considered part of the contract in a sense: e.g., that L4 will flush events quickly. But mostly, contract is about data shape and protocol. Additionally, L4 contract means it won’t send anything not in the schema. For example, it wouldn’t randomly send an internal debug string to UI; if it’s not in the contract, it doesn’t go. (In development mode, maybe additional debug info can be behind a flag, but that’s optional.)

Allowed Directions: L4 is allowed to call downward into L1/L3 (passing input along) and upward to L5 (sending responses). It does not call L2 or directly interfere with models – it’s not aware of those, it only talks to orchestrator (and maybe indirectly to L1 for identity functions, but likely orchestrator handles identity if needed). Importantly, L4 should not bypass L3 for any core operations. For instance, if the UI requests the current energy level, L4 should ask L3 or use a provided interface, not maintain its own count. L4 shouldn’t have its own business logic; it’s a conduit. Also, L4 itself shouldn’t call UI except via the normal channels (it’s the one implementing those channels anyway). If we consider external integrations, L4 could be extended to allow other systems to connect (like an API client or CLI), which is fine as long as they use the same API. But that’s just multiple consumers. L4 doesn’t initiate connections to external systems except possibly to serve static files (like the UI’s HTML/JS if it’s a web app – often the same server can serve the front-end assets). Serving the static UI files is allowed and likely part of its job too (deliver the index.html, JS bundle, etc., on HTTP GET). Finally, L4 should not alter or generate data on its own beyond formatting – it shouldn’t, say, invent an event. If L3 didn’t send an EnergyUpdate, L4 shouldn’t send one. It’s allowed maybe to ping with heartbeat messages to keep socket alive, but those are infrastructure pings, not app data.

Anti-Patterns: One anti-pattern is doing heavy processing or blocking operations in the request/response path. L4 ideally just transforms and dispatches. If we find L4 doing something like running a long database query every time an event comes in, that could bottleneck the throughput. It should utilize asynchronous frameworks to handle potentially many events. Another anti-pattern: violating the separation by including business logic in L4. For example, if L4 got a prompt and decided “if prompt == something, skip calling L3 and return a canned response,” that would be mixing roles (unless that’s a clearly defined gateway feature like a health check endpoint). We want all AI logic in L3, so L4 shouldn’t pre-process content aside from validation. Also, bypassing auth checks is a security anti-pattern – e.g., not checking a token because “it’s local anyway.” We should still implement basic auth for consistency if multi-user or remote is considered. Also, sending unfiltered internal data to UI – e.g., stack traces or internal error details – could be an anti-pattern unless in dev mode, as it might confuse or leak info. So L4 should map internal errors to user-friendly codes. Another anti-pattern is not handling concurrency properly – if multiple clients connect, L4 needs to isolate their sessions. It would be bad if a message from client A triggers a response to client B; L4 should route messages to the correct session context. We must avoid any cross-talk at this layer. Finally, ignoring backpressure: if network is slow but L3 is pumping events, an anti-pattern would be to just queue indefinitely in L4 and consume more and more memory. Instead, L4 should perhaps drop or coalesce events if the client can’t keep up, or apply a strategy (maybe slow down L3 via some feedback, though that’s complex). At minimum, L4 should protect itself – not crash if client disconnects or if messages flood in. In summary, keep L4 lean, stateless (or minimal state like connection list), and strictly as a translator/enforcer, not a decision-maker.

Section 6: Layer 5 – Visualization & UX (Purpose, UI Rules, Feedback Loop)

Layer Summary: L5: Visualization & UX is the front-end layer – everything the user directly interacts with and sees. In WIRTHFORGE, this is where the “living AI” comes to life visually. L5 includes the application’s UI components, graphics (e.g. the lightning, streams, fields visualizations), interactive controls (text input boxes, buttons to switch models or paths), and the logic that handles user interactions (clicks, keypresses) and presents data from the backend in an understandable way. It is built on top of the data provided by L4 and adheres to the contracts (it doesn’t invent its own protocol). Importantly, WIRTHFORGE’s UI has some special design considerations: the concept of levels (progressive disclosure of complexity in UI corresponding to user mastery) and possibly Doors (different entry experiences or modes, as hinted by the term). L5 is responsible for implementing those concepts in the user experience.

Purpose: The purpose of L5 is to deliver a compelling, clear, and responsive user experience that realizes the platform’s vision of visible AI energy and progressive mastery. It must take the raw events like token streams and energy updates, and turn them into intuitive visual metaphors (bolts of lightning, flowing streams, architectural node graphs, adaptive fields, resonant patterns, etc., depending on level) that let the user literally see what the AI is doing
Google Drive
Google Drive
. At the same time, it provides the interface for the user to control and guide the AI – entering prompts, selecting models or modes, pausing/resuming generation, switching “Doors” or views, etc. L5 acts as the eyes and hands of the user in the system. Another key purpose of L5 is to manage the progressive disclosure UI: initially showing only simple visuals and controls (Level 1: Lightning) and gradually unlocking more complex ones (Level 2: seeing multiple streams, Level 3: architecture view with modules, Level 4: adaptive UI, Level 5: full resonance view)
Google Drive
Google Drive
. This aligns with foundation docs such that a new user is not overwhelmed and can “earn” more complex tools as they understand the simpler ones
Google Drive
Google Drive
. So L5’s design must incorporate a notion of user level or experience progression, gating features until certain criteria are met (likely guided by L3 events, since L3 can measure if user viewed enough tokens, etc.). In sum, purpose: present data as engaging visuals, allow user input, and guide the user’s journey.

Owns: L5 owns the component library and rendering engine. This includes all the UI components – text boxes, buttons, charts – as well as the custom visual components like the “Lightning canvas” for Level 1, the side-by-side stream comparison view for Level 2, the node/graph view for Level 3 (if architecture is visualized), the adaptive layout logic for Level 4, and the full multi-stream synchronization visualization for Level 5 (Resonance). It owns all HTML/CSS/JS (or if using a framework like React and Three.js for WebGL, those elements). The “Doors” concept likely refers to distinct UI entry points or modes; L5 would own the logic for those (e.g., maybe an initial door where user picks their Path (Forge/Scholar/Sage) – that might be a separate UI flow or overlay). L5 also owns the state of the UI – not the authoritative data (that’s L3’s job), but the ephemeral state like which screen is currently visible, UI preferences (dark mode, etc.), or client-side caches of data for performance. For instance, L5 might keep a copy of the last N events to animate something smoothly or to let the user scroll back in chat history. It also manages the user’s local configuration like selected theme, or whether audit mode is on/off. Additionally, if there’s an audit mode in the UI where raw data is shown, L5 owns toggling that and rendering it (for example, showing a debug panel with actual numbers for each event). Essentially all presentation state is L5’s own. L5 also owns any logic to handle backpressure on the client side: e.g., if events come in too fast for rendering (60 fps), L5 might choose to skip rendering some frames or coalesce updates (this can happen especially if the browser can’t draw as fast as messages come, though ideally aligned at 60 Hz as well). The responsibility to not crash or lag on a slow machine falls to L5 – perhaps owning a queue of incoming events and processing them in the requestAnimationFrame loop. That’s an internal detail but important: we can’t assume infinite rendering speed, so L5 possibly throttles or prioritizes what to draw (maybe dropping some low-importance particles if overwhelmed). This strategy would be coded in L5.

Emits: L5 emits user interaction events that travel back down to the system. These include the obvious one: the prompt text when the user hits send (or each keystroke if streaming input char-by-char is a feature to show small sparks). It also emits UI commands: e.g., “stop generation” when user clicks a stop button, “switch model” when they pick a different model from a dropdown, or “change level” if for instance advanced users can manually toggle to a higher complexity mode (though normally progression is automatic, maybe devs or advanced can override). If the UI has multiple panels, it might emit “open door X” events (e.g., user goes from the main chat to an “Energy analytics” screen – that could be considered a door, and maybe we inform the backend if necessary or at least log it). Another type of emission is feedback on performance: typically not needed, but if we did client-side frame dropping, we might not explicitly tell the back-end. However, we might send something like “client_ready” or “viewport_hidden” (if user tabs away, maybe UI can tell backend to slow down events). At minimum, a WebSocket client will emit ping messages or reconnect attempts if the connection breaks – L4/L5 together handle that but from UI side, it might re-init connection and thus re-subscribe to events. L5 could also send telemetry or acceptance of things: for example, after receiving an answer, the UI might emit an event “user acknowledged answer” or “like/dislike” for reinforcement (if such UX exists in future, though it’s outside core spec). In summary, L5 emits anything that corresponds to a user’s will or UI-driven action.

Consumes: L5 consumes all data provided by L4 – this is mostly the event stream and responses that originate from L3. For example, it consumes TokenVisual events, Energy updates, final answers (text) from the model, system messages (like warnings or errors). It also consumes static data like available model list (perhaps sent on connect or fetched via an API), or user profile info if any. In terms of the visual content, the UI is basically a subscriber to the orchestration events. It will take those and update the DOM or WebGL scenes accordingly. Additionally, L5 consumes user input into its local form components (like the content of a text box as the user types is consumed by the input component until submission). It also consumes user device capabilities – e.g., window size (for responsive design), pointer events (for interactive visuals maybe user can click on a visual element to get details, etc.). If the UI has a concept of levels, it likely consumes an unlock event from L3 or some criteria (like, L3 might emit event “LevelUp: now=2” when the user has met criteria, or maybe L5 itself infers based on metrics from L3 – but more robust if L3 decides and just tells UI). Then L5 consumes that and reveals new UI elements. L5 also consumes initial page load config (maybe the server can embed config or the UI can read a config file) to know endpoints and such, but that’s minor.

Contracts: The contract L5 adheres to is essentially the mirror of L4’s: the API contract. It expects that messages from L4 match the schema and will use them accordingly. For example, if L4 promises that every TokenStream event has a streamId and token text, L5 will use those fields. If something is missing or malformed, L5 might not display correctly or might throw a client error – which is why contract fidelity is crucial. L5 should also implement the visual contract: every event type should have a defined visual representation or at least a defined handling. A contract between design and implementation might be: for every event the backend can emit, the UI has a way to represent it (even if that representation is, in audit mode, a log entry). This ensures no silent ignoring of data. Also, for interactive consistency, L5 likely follows a contract that user inputs produce certain events to backend. For instance, pressing “Enter” in the prompt box will produce a WebSocket message of type X – that’s a contract that the UI code must implement exactly so the backend receives what it expects. In terms of user experience contract: WIRTHFORGE has the concept that “all events must map to structured data” and are auditable; L5 should thus allow toggling audit mode and show data exactly, fulfilling that promise. If an event is complex and has many fields, audit mode might present a tooltip or panel with those raw fields, which is part of the UI’s contract to the user (especially advanced users) that nothing is hidden. Additionally, the 60 fps visual update target is a contract with the user – the UI should strive to animate at 60fps for smoothness (which means using requestAnimationFrame, efficient drawing, etc.). If the UI cannot maintain that (maybe on low-end device), it might degrade gracefully but ideally it meets that performance goal given normal hardware
Google Drive
. Another implicit contract is no UI element acts without data: e.g., the UI shouldn’t show a “consciousness level = 5” unless it got data supporting that from L3. This prevents misinformation or placeholder nonsense. So the UI essentially contracts to be a faithful reflection of the system state, augmented with nice visuals, but not an independent actor making up state.

Allowed Directions: L5 as the top layer can only really send to L4 (downwards) and receive from L4 (upwards relative to backend, but downwards relative to user). It doesn’t call L3 or L2 directly – it has no access to them except via the API. Even if the UI is hosted in the same machine, we treat it as if it’s separate (e.g., running in a browser sandbox). So the only allowed communication is through the defined API calls/events. L5 can of course have internal interactions – components communicating with each other, routing within the app (like single-page app routing), but those are internal to the front-end and not relevant to layering in backend sense. It should not try to open any other channels to the backend except what L4 provides (for example, using the official WebSocket and maybe REST endpoints – not opening a random socket to L2’s Ollama server directly; even though it’s possible if one knew the port, doing so would break abstraction and possibly security). So an allowed pattern: UI calls fetch('/api/models') to get model list – that goes to L4 and is fine. Disallowed pattern: UI tries to directly read sqlite file or call some internal API on the file system via an exploit – obviously not allowed (and not possible in browser context normally). In multi-window or multi-device scenarios, each UI instance is separate but all go through L4 to communicate.

Anti-Patterns: One anti-pattern is creating shadow logic in the UI that duplicates or contradicts the backend. For example, if the UI tried to calculate its own notion of energy or do its own token processing logic different from L3, that can lead to divergence and confusion (imagine if UI and backend show different energy values). The UI should trust and use the data from L3. If something needs to be computed, better to have L3 send it. The UI can do minor derivations (like computing a percentage or difference for display, that’s fine), but not core computations. Another anti-pattern is exposing raw internal info to the user outside of audit mode – e.g., showing variable names or technical IDs that aren’t meant to be user-facing (except in debug context). For normal UX, it should be friendly (e.g., say “Model not found” instead of an internal error code). Similarly, not handling errors or events gracefully is an anti-pattern: the UI should not freeze or throw uncaught exceptions if an unknown event type arrives – it should perhaps log it or ignore it but keep running (though ideally unknown events don’t happen if contract is tight). From a performance perspective, an anti-pattern would be to re-render too often outside the frame loop or do extremely heavy computation on the main thread (like parsing megabytes of data on each frame). That could drop frame rates. The UI should leverage optimizations (like canvas/WebGL for lots of particles, requestAnimationFrame, batching DOM updates, etc.). Also, ignoring the progressive design is an anti-pattern: e.g., revealing all levels’ UI at once to the user (overwhelming them) – this breaks the progressive mastery approach promised. So L5 must enforce that discipline (maybe with feature flags per user level). Another anti-pattern might be skipping L4 by using an improper route. For instance, if the front-end dev is lazy and directly opens a WebSocket to the Ollama server (which might output raw tokens) to get a faster response, that completely bypasses L3’s energy and orchestration. That’s obviously not acceptable because it would break the integrated experience and local-first design (and likely not even possible if cross-origin rules etc.). So UI must remain a proper client of our defined API, nothing else. Lastly, an anti-pattern on the UX side: doing anything that causes confusion about the data’s meaning. For example, visualizing something in a misleading way (like graph scale not matching values). Given this is more design, it might not be explicitly in code, but since we emphasize comprehension, the UI must accurately represent the underlying metrics (supported by evidence from FND-002 on good visualization practices, like using position/length for magnitude
Google Drive
). Not following those principles (e.g., using only color intensity to encode a numeric value, which users might misread) could be considered an anti-pattern because it reduces clarity. So adherence to evidence-based visualization guidelines is expected.

Section 7: Hardware Tiers – Adaptive Architecture Implementation

WIRTHFORGE’s five-layer design is intended to run on a range of hardware, from modest laptops to powerful servers, and even in a hybrid cloud-assisted setup. The architecture needs to adjust its behavior and enable/disable certain features depending on the available resources to ensure a smooth 60 Hz experience across the board. We outline four representative hardware tiers and how the system scales for each:

Low-End (CPU-Only, 1 model at a time): On a low-end machine (e.g., no dedicated GPU, maybe 2–4 CPU cores, 8GB RAM), the system defaults to a very lightweight profile. Layer 2 (Model Compute) will restrict itself to smaller models (perhaps 3B parameters or less, likely quantized) and run only one model generation at a time (no parallel councils) to avoid overwhelming the CPU. L2 might use Ollama in CPU mode with quantization like Q4 to speed up inference, and it will likely avoid concurrency – if another prompt comes in while one is running, orchestrator (L3) will queue it rather than attempt true parallel generation (backpressure strategy: effectively single-thread the AI). Layer 3 (Orchestration) on low-end hardware may simplify the energy computations: e.g., using a larger smoothing window for tokens/s or updating slightly less frequently (maybe 30 fps updates) if needed to conserve CPU. It remains the sole state owner but might impose lower detail – for instance, not calculating high-order resonance metrics that are expensive. Layer 5 (UX) could also adapt: in Level 1, the lightning visualization might reduce particle effects or use simpler canvas graphics instead of heavy WebGL shaders, to accommodate weaker integrated graphics. The UI might also cap the frame rate at 30 fps if the device can’t handle 60, or reduce the number of animated elements. Essentially, the emphasis on low-end is maintaining responsiveness even if that means lowering fidelity. No blocking calls is still respected – in fact more critical on low end – and L3’s loop might run in a single thread with careful tuning. One specific adjustment: the Energy accumulation might be the only advanced feature active – higher-level patterns like “fields” and “resonance” might be effectively turned off or simulated at minimal overhead until hardware improves or the user connects to a more powerful server. This ensures even a basic PC can run WIRTHFORGE and still deliver the core experience of “see the AI’s tokens as lightning” albeit with fewer frills. The system will also be conservative in memory: for example L2 will unload a model from RAM if not used to free memory for the next, since only one can run at once. Users on such hardware might experience a brief load time for each new model prompt (swapping models) – orchestrator will communicate this via events (like “Loading model…”). The design still holds; it’s just scaled down.

Mid-Tier (GPU Available, 2–3 models parallel): On a mid-range setup (e.g., a laptop or desktop with a single decent GPU, 16GB+ RAM), WIRTHFORGE enables more parallelism and visual richness. Layer 2 can run multiple models concurrently – perhaps 2 or 3 medium-sized models (e.g., 7B to 13B parameters each) in parallel, leveraging the GPU for acceleration. This allows the council concept to come to life: orchestrator might run two models at once to compare their answers or have them race, creating interference patterns for the user to see. GPU memory is a constraint, so L2 will manage loading at most what fits (maybe two 7B models at once, or one 13B at a time – orchestrator will choose based on user’s request). Layer 3 on mid-tier can comfortably perform real-time energy calculations at 60 Hz with fine granularity (e.g., 250 ms EMA windows as per design
Google Drive
) and can start enabling more advanced detectors (like noticing if two models output the same token simultaneously for a resonance hint). It will also handle moderate concurrency: e.g., one user prompt triggers two models, that’s fine; if somehow multiple user inputs overlap (like user quickly sends a second prompt), orchestrator might run them sequentially or with a slight stagger to not max out CPU threads beyond what GPU can handle. Layer 5 for mid-tier can use higher-quality visuals – perhaps full WebGL particle effects for lightning, animated transitions when moving to Level 2 view, etc. The UI might still default new users to Level 1 or 2, but as they progress, Level 3 (architecture view) could be unlocked and the hardware can render it (maybe a interactive node diagram). Backpressure is less of an issue here, but still accounted for: if three models stream tokens, the orchestrator and UI are handling a lot of events – but a mid-tier GPU can generate maybe combined 150 tokens/s (50 each) which at 60fps means ~2–3 tokens per frame, quite manageable to animate with modern JS. The system will drop frame rendering only if needed (maybe if a spike happens). In terms of Allowed directions and anti-patterns, nothing new is introduced by hardware except perhaps multi-model means we must ensure L3’s rule (“only it updates state”) holds even under concurrency (so L3 might have to lock or sequentialize state updates from parallel streams – likely done within the single-thread event loop). This tier is probably the baseline target for full WIRTHFORGE experience: the user can see interference patterns (L2 parallel), energy bars, etc., all in real-time.

High-Tier (Local Server, “full council” + fields): On a high-end machine (e.g., a multi-GPU workstation or server with 32+ GB RAM), WIRTHFORGE can unleash its full capabilities. Layer 2 can load and run multiple large models concurrently – perhaps the entire “council” of experts, say 4–6 models of various sizes. For example, one GPU could handle a 30B model and another GPU a couple of 13B models, etc. Or if all GPUs are identical, they could even do data parallel for one model, but WIRTHFORGE’s focus is more on heterogeneity (council) than single-model scaling. Orchestrator (L3) in this scenario can coordinate a symphony of model streams: maybe one model is a reasoning specialist, another is creative, etc., and it merges their outputs or compares them. With so many tokens flying, Energy and resonance detection become interesting – L3 might compute cross-correlation between 4 streams to find moments of alignment (resonance) using methods like phase locking value or other signal processing (which might be expensive but this hardware can handle it, possibly on separate threads or GPU-accelerated). L3 remains single-writer but may spawn background tasks for heavy calculations, merging results in the next frame. The fields concept (level 4 in progressive UX) which adapts UI to usage could fully activate: e.g., if user is going fast, UI automatically reconfigures panels or starts filtering some events for clarity – orchestrator would signal these adaptive changes (like “UI slow mode recommended”) and UI would comply. This might only be noticeable on extended use. On high-tier, orchestrator can also log a lot more – storing rich telemetry for every token for later analysis, since disk and CPU are plenty (the event store can be quite detailed, enabling the promised “time-travel debugging” and analysis). Layer 5 on such hardware can show the most complex visuals: for Level 5 resonance, potentially a 3D visualization of energy fields and particle swarms representing each model’s output, with highlights where they resonate in sync (like a beautiful coherent pattern when all streams align). This might involve thousands of particles and heavy WebGL shaders; a high-end GPU can render it at 60fps. Also, a high-tier user likely has reached Level 5 through usage, so nothing is held back – all UI features (detailed analytics dashboards, module linking interfaces if user builds pipelines, etc.) are accessible. Multi-model outputs also mean the UI might have multiple text streams or windows; on a large monitor or multi-monitor, the UI might spread out (maybe separate “doors” for each major function: one door is main chat, another door is a dashboard of model metrics). High-tier can handle running the UI in a browser with lots of canvas elements or even VR/AR visualization if we went crazy – but that’s beyond scope for now. The main point: The architecture remains the same across tiers – L1..L5 do the same roles – but certain capabilities (parallelism, advanced detection) are enabled or scaled up on better hardware. It’s an automatic quality scale: like graphics settings in a game adjusting to your GPU, WIRTHFORGE might auto-detect hardware at install (as hinted by DevOps doc)
Google Drive
Google Drive
 and configure sensible defaults (e.g., number of parallel models to allow, resolution of visuals). The system could even let the user know: “You are running on a High-Tier setup – enabling Council of 5 models and full effects.” Conversely, on Low-tier, it might say “Using simplified mode for performance.”

Broker Hybrid (Local client + remote satellite): In this scenario, the user’s local environment might be mid-tier or low-tier, but they have the option to tap into a cloud or networked satellite server for extra muscle. Architecturally, this introduces a remote component mainly at Layer 2: the model compute can happen on a remote broker while the rest of the layers remain local. For example, suppose the user wants to use a 70B parameter model they can’t run on their laptop. L2 will detect that request and, instead of erroring, it forwards the request to the broker service (through some API). That broker (which runs its own L2/L3 possibly) will do the inference and stream back tokens. The local L4/L3 integrate those tokens as if they came from a local model. From the orchestrator’s perspective, it might not even fully know – except maybe higher latency – that the model was remote; it still does energy calculations on the timing and content of tokens. However, some adjustments: Latency and backpressure become key – network delays mean tokens come slower or in bursts. The orchestrator (L3) might apply slightly different smoothing (accounting for the fact that network jitter could clump tokens). Also, if the user sends many requests to a pay-per-use satellite, we might implement a policy layer: L3 or L4 could enforce a rate limit or check user’s subscription before proceeding. This policy check is like an extension to L1/L4 (identity might include “has credits?”). The hybrid mode must also consider offline fallback: if the satellite is unreachable, L3 should either fall back to a smaller local model or inform the UI gracefully. The contract doesn’t change, but L4 might carry error messages from the remote (like “server overloaded”) and present them. From a user viewpoint, this is mostly transparent – except maybe an icon or label “Turbo mode via cloud” when active. Performance-wise, a satellite might allow Level 5 features even if local hardware is low, but one must be careful: streaming huge model outputs over the internet can be slower than a small local model. But for heavy tasks it’s beneficial. The architecture supports it because it was designed decoupled: just swap where L2 runs. In effect, you have a mini WIRTHFORGE in the cloud providing L2 (and maybe its own L3 to compute energy – though ideally we’d want raw data to do energy locally to maintain the “we measure it” trust). Likely, the remote just does plain model inference, and our local L3 still measures the token timing including network time (that might make the model look “slower” because network latency is included in eval_duration, which is fine because from user perspective that is the speed). Allowed directions don’t fundamentally change; L2 calls just go out over network. One new thing is that we might include an authentication token or encryption for that channel (the user probably has to log in or have an API key for the remote service). That ties into L1 (identity) and L4 (transport security). The anti-pattern here would be relying on cloud in core flows without user consent – which we avoid. It’s opt-in: the user might toggle “Allow satellite model usage” in settings. Also, the system should never block waiting forever on the remote – if it’s slow, perhaps orchestrator can yield partial results or time out and fall back. In summary, the hybrid tier extends L2 across the network but keeps the locus of control and all other layers local, preserving privacy and responsiveness as much as possible. It’s a nice option for those who want to experiment with bigger models or who accept cloud for some features (maybe vision model that’s too heavy to run locally, etc.), all integrated under the same UI.

In all tiers, the five-layer separation holds. What changes is the scale of parallelism and the richness of events, but each layer’s responsibilities remain as defined. By designing to these tiers, we ensure WIRTHFORGE is grounded and scalable – it can run on a lowly offline PC, yet also take advantage of powerful setups or optional cloud boosts, all without changing its fundamental architecture.

Section 8: Diagrams and Governance

Architecture Layer Stack: The following Mermaid diagram illustrates the five layers and their primary communication flow (left-to-right data path from user input to UI output):

flowchart LR
    subgraph Core_Architecture_Layers
    direction LR
        L1["L1: Input & Identity"] -- "Validated Input \n(event with user ID)" --> L2["L2: Model Compute"]
        L2 -- "Token Stream \n(JSONL tokens, stats)" --> L3["L3: Orchestration & Energy"]
        L3 -- "Events & State \n(Energy, etc.)" --> L4["L4: Contracts & Transport"]
        L4 -- "UI Updates \n(WebSocket/HTTP)" --> L5["L5: Visualization & UX"]
        L5 -- "User Actions \n(click, prompt)" --> L4
        L4 -- "API Requests \n(JSON, Auth)" --> L1
    end
    classDef layer fill:#eef,stroke:#333,stroke-width:1px;
    class L1,L2,L3,L4,L5 layer;


(In the above Layer Stack diagram, arrows denote the primary allowed communication: for example, user actions flow from L5 to L1 via L4 (as labeled), and processed data flows upward from L2 to L5. Note that L3 can send data to L4 which then distributes to L5, and L4 funnels user input to L1. Direct L5–L3 or L2–L5 arrows are intentionally absent to enforce layering.)

Data Flow Sequence: The sequence diagram below shows a typical cycle for a user prompt and model response, highlighting the non-blocking, streaming behavior and backpressure control:

sequenceDiagram
    participant UI as User (L5)
    participant Gateway as API Gateway (L4)
    participant Ident as Input Handler (L1)
    participant Model as Model Runner (L2)
    participant Orchestrator as Orchestrator (L3)
    UI->>Gateway: Enter Prompt ("Hello?"):contentReference[oaicite:68]{index=68}
    Gateway->>Ident: Forward request (user token, text)
    Ident->>Orchestrator: InputEvent(userId, sessionId, text)
    Orchestrator->>Model: generate(prompt) (async call)
    Note over Orchestrator,Model: L3 schedules model on L2 (non-blocking)
    Model-->>Orchestrator: stream token: "H"
    Orchestrator->>Orchestrator: calc energy for "H":contentReference[oaicite:69]{index=69}
    Orchestrator-->>Gateway: emit Event{token:"H", energy:e1}
    Gateway-->>UI: send token "H" (via WS):contentReference[oaicite:70]{index=70}
    loop Tokens Stream (60Hz refresh)
        Model-->>Orchestrator: stream next token
        Orchestrator->>Orchestrator: update state (EU += Δe)
        Orchestrator-->>Gateway: emit Event (token/energy)
        Gateway-->>UI: send Event (batch or frame)
        UI->>UI: render new token (lighting bolt):contentReference[oaicite:71]{index=71}
        Note over UI: UI drops frames if overloaded:contentReference[oaicite:72]{index=72}:contentReference[oaicite:73]{index=73}
    end
    Model-->>Orchestrator: final stats (eval_count, duration):contentReference[oaicite:74]{index=74}
    Orchestrator->>Orchestrator: compute avg tokens/s, etc.
    Orchestrator-->>Gateway: emit Completed{count, duration, totalEnergy}
    Gateway-->>UI: send Completed event
    UI->>UI: display full answer + metrics
    UI->>Gateway: (User clicks "Stop"):contentReference[oaicite:75]{index=75}
    Gateway->>Orchestrator: stop signal
    Orchestrator->>Model: cancel generation (if still running)


(This Data Flow diagram demonstrates that after the user submits a prompt, the system streams results back incrementally. The orchestrator’s internal loop aggregates tokens into ~16ms frames before sending to Gateway/UI, preventing flooding
Google Drive
. The UI renders each token and can skip some if rendering is slower than arrival (backpressure handled by dropping frames rather than blocking)
medium.com
medium.com
. When user presses stop, a signal travels down, orchestrator cancels the model, and no further tokens are emitted.)

RACI Responsibility Matrix: The table below summarizes who is Responsible, Accountable, Consulted, or Informed (R/A/C/I) for key functionality across the layers:

(R = does the work, A = final accountability, C = consulted for input, I = kept informed)

Function / Area	L1 Input & ID	L2 Model Compute	L3 Orchestrator & Energy	L4 Transport/API	L5 UX & UI
User Identity & Session Auth	R (validates & tags identity)
A (for attaching correct session)	C (may need user ID for logging)	A (ensures every event has user context)
I (gets user info, uses in state)	A (enforces auth on requests)
R (checks tokens on API calls)	I (may display user profile)
Model Execution & Output	–	R (runs model, streams tokens)
A (for correctness of output)	A (decides which model, when to invoke)
C (requests model run, receives output)	I (does not run model, just passes data)	I (receives final answer)
Energy Calc & State Updates	–	C (provides raw data: token timings)	R (computes EUs, updates global state)
A (sole source of truth for state)
Google Drive
	I (only relays state events)	I (displays energy, state to user)
Data Transport & API Compliance	–	–	C (defines event schema content)	R (serializes & sends data)
A (all external comms correct)
Google Drive
	I (receives data, obeys protocol)
Visualization & User Experience	–	–	C (provides data to visualize, may suggest UI adapt)	C (delivers needed data to UI)	R (renders visuals, handles interaction)
A (final UX quality)
Performance & 60Hz Loop	–	C (model speed affects loop)	A (manages 60Hz update loop, frame batching)
R (drops/queues updates as needed)
Google Drive
	C (network buffering, if client slow)	R (renders at 60fps or adapts; drops frames if needed)
medium.com

Error Handling & Recovery	–	R (flags internal model errors)	A (interprets errors, decides recover or fail)
C (informs gateway of error context)	R (formats error messages, HTTP codes)
A (ensures consistent error schema)	I (shows error to user in UI)

(For example, in “User Identity & Session Auth”, L1 is Responsible for validating and tagging identity on inputs and Accountable that each input has correct session info, while L4 is Accountable for enforcing auth on incoming connections (checking tokens), etc. Layer 3 is Consulted or Informed where appropriate but doesn’t itself enforce identity beyond using it in state labels.)

Integration Points: This core architecture underpins or interfaces with many other WIRTHFORGE documents and components:

WF-TECH-001 (Complete System Architecture) – Maps each subsystem to these layers (e.g. UI server to L5, Flask gateway to L4, Decipher compiler to L3, Ollama engine to L2) and ensures all connections follow the layering
Google Drive
Google Drive
. The diagrams and descriptions in TECH-001 align one-to-one with L1–L5 definitions here.

WF-TECH-002 (Native Ollama Integration) – Provides implementation details for Layer 2, including how multiple models are loaded and run natively without Docker overhead
Google Drive
. It ensures the local model server (Ollama) fits into L2 and obeys L3’s requests. Parallel execution and model selection strategies from TECH-002 feed into L2’s design for mid/high tiers
Google Drive
Google Drive
.

WF-TECH-003 (WebSocket Protocol Spec) – Defines the message schemas and topics that Layer 4 uses to carry L3’s events to L5
Google Drive
. For example, TECH-003 specifies frames like ttft_ms (time-to-first-token) and annotations[] in the WS payload, which are produced by L3 and must be delivered intact by L4
Google Drive
. This architecture provides the context for those specs (why certain fields exist).

WF-TECH-004 (Flask Microservices Design) – Details how the system is split into services/micro-processes respecting these layer boundaries
Google Drive
. For instance, it might place L2 (Ollama) in a separate process, L3 (Decipher/Orchestrator) in another, and L4 (gateway) as the Flask app that routes between them. The “boundaries for Decipher, Energy, pattern services” described in TECH-004 correspond to isolating L3 functionality and using clear APIs between L3↔L4 and L3↔L2.

WF-TECH-005 (Energy State Management) – Is essentially an in-depth of L3’s state handling. It defines how energy is tracked, accumulated, and persisted
Google Drive
Google Drive
. The rules like “never block the render loop” and “no energy loss” from TECH-005’s philosophy are executed in L3 here
Google Drive
. This doc provides the high-level rationale, while TECH-005 gives the implementation (data structures for state, update pipeline code, etc., which plug into L3).

WF-TECH-006 (Database & Storage) – Provides the persistence layer for L3’s state and L1’s identity data. It outlines databases for different data types (SQLite for user settings and conciousness metadata, DuckDB for time-series energy logs, etc.)
Google Drive
Google Drive
 which L3 will use to save/load state. The architecture ensures only L3 writes to these, likely via a storage orchestrator that TECH-006 describes
Google Drive
Google Drive
. L4 might call into L3 for any needed data fetch (like sending history to UI), and L3 uses Tech-006’s strategy to get it.

WF-UX-006 (UI Component Library) – Relates to L5, providing a library of UI components mapped to each layer’s outputs. For example, a TokenStreamView component visualizing L3’s token events, an EnergyBar component bound to energy updates, a ModelSelector tied into L1 identity or L3 orchestrator commands. UX-006 ensures consistency in design for all these elements so that whether the UI is showing Level 1 or Level 5, it uses a coherent style. The architecture’s clean separation means these components interact with L4’s API only, making them reusable. UX-006 likely enumerates components needed for Levels 1–5 (Doors, Path selectors, etc.), all of which fit into L5 responsibilities defined here.

Changelog:

v1.0.0 – 2025-08-12: Initial version of Core Architecture Overview. Established five-layer structure (L1–L5) and detailed each layer’s responsibilities, interfaces, and anti-patterns. Included hardware scaling notes (low-end through hybrid cloud) and aligned content with WF-FND-001/002 vision and latest best practices for event-driven AI systems. Document is set as foundational architecture reference (P0)
Google Drive
.

Glossary Updates (Deltas):

Broker Satellite: noun. Optional remote model compute service that Layer 2 can delegate to for running very large models or additional compute. Integrated via the same streaming interface as local models, but over network (cloud). Maintains local-first control (requires user opt-in). Added in WF-FND-003.

Door (UI Door): noun. A distinct entry point or mode in the UI representing a particular user context or path. For example, a “Forge door” might be a UI view tailored to creators, and a “Scholar door” for researchers. Doors group certain L5 components and visuals appropriate to a user’s chosen journey. Introduced in architecture for L5 Visualization.

Audit Mode: noun. A UI mode (usually monochrome or simplified) that overlays or displays the raw structured data (events, metrics) behind each visual element. Used for verification and learning, it reflects the exact output of L3 in textual/graph form. New term (WF-FND-003) aligning with transparency principle.

Backpressure: noun. Mechanism for handling too-fast data production by slowing producers or dropping data to prevent overload
medium.com
. In WIRTHFORGE, applied in streaming tokens (L3/L4 will buffer or drop if UI is too slow) and in UI rendering (L5 may skip frames if events come faster than can be drawn)
medium.com
. Added to glossary with reference to real-time streaming control.

Allowed Direction: noun. A design rule specifying which adjacent layers a given layer is permitted to communicate with directly. Ensures disciplined architecture (e.g., L5→L4 allowed, L5→L3 not allowed). Clarified in WF-FND-003.

(Refer to WF-FND-009: Glossary for formal definitions of core terms like Energy Unit, Council, Resonance, etc., which are used in this document
Google Drive
Google Drive
. This update adds the above new terms and ensures consistency in terminology across the documentation.)