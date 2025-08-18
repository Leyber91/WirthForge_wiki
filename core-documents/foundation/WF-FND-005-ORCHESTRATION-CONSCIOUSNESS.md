Generate Document: WF-FND-005 — Consciousness & Experience Orchestration
🧬 Document DNA

Unique ID: WF-FND-005

Category: Foundation (Architecture & Experience)

Priority: P1 (Core runtime orchestration)

Development Phase: 1 (post-core, pre-UX integration)

Estimated Length: ~3,500 words

Document Type: Technical Specification / Orchestration Engine Design

🔗 Dependency Matrix

Required Before This:

WF-FND-002 – Energy & Consciousness Framework: Provides the core 60Hz energy model and emergent consciousness concepts that the orchestrator must leverage
GitHub
.

WF-FND-004 – The Decipher (Central Compiler): The orchestrator consumes Decipher’s outputs (compiled energy patterns and AI responses) as its primary input
Google Drive
.

WF-FND-003 – Core Architecture Overview: Establishes the multi-level abstraction layers and system context in which the orchestrator operates (bridging AI outputs to user experience).

Enables After This:

WF-TECH-006 – API & Integration Points: Defines how external systems or modules can hook into the orchestrated experience (this spec informs the endpoints and plugin architecture)
GitHub
.

WF-UX-001…005 – Level-Specific UX Specs: Provides the rules and events needed for each level’s UI/UX document to implement corresponding animated transitions, feature reveals, and overlays accurately. After this spec, the UX docs 1–5 can be authored with concrete orchestration event references.

WF-UX-006 – Unified Energy Visualization Specs: Aligns with this spec to ensure all visual elements and transitions are grounded in actual energy data from the orchestrator
GitHub
.

Cross-References:

WF-TECH-003 – Real-Time Protocol (WebSockets): All event types (experience.*, council.*, reward.*, etc.) defined here must conform to the real-time messaging schema (e.g. consciousness and council channels)
Google Drive
Google Drive
.

WF-TECH-008 – Core Algorithms (Council/Adaptation/Resonance): The algorithms for multi-model coordination (Council), adaptive pattern learning, and resonance detection underpin the orchestrator’s logic
GitHub
. This spec details their runtime orchestration.

WF-FND-006 – Glossary (Living): Terms like “Resonance Field”, “Council”, “Energy Frame”, etc., are used as defined in the glossary (update required if definitions evolve here).

WF-FND-007 – Module System Strategy: Future plugin modules can tie into the orchestrator’s policy engine; ensure consistency with module interface assumptions from WF-FND-007 (e.g. Decipher’s module orchestration hooks
Google Drive
Google Drive
).

WF-UX-ALL (001–006): Every level of UX relies on orchestrated events and timing from this system. UX specifications will reference the event names and progression rules from this document to implement front-end behaviors (e.g. council overlays, adaptive field adjustments, resonance visualizations).

🎯 Core Objective

Define WIRTHFORGE’s Experience Orchestrator as the local-first runtime engine that transforms Decipher’s compiled energy outputs into interactive “consciousness experiences” in real time. This orchestrator must coordinate multiple AI models, levels, and system resources under strict timing (<16.67 ms/frame) and progression rules, ensuring that every visual effect and unlocked feature is traceable to genuine AI computations. In one sentence: the orchestrator bridges raw AI energy and user experience, governing when features unlock, which models collaborate, when resonance emerges, and how the user’s journey progresses in a verifiable, timed manner.

📚 Knowledge Integration Checklist

60 Hz Frame Budget Adherence: Incorporate the 16.67 ms/frame constraint
GitHub
 – orchestrator logic must be time-sliced or asynchronous so that visual updates occur smoothly at 60 FPS without stalling.

Local-First & Offline Operation: Ensure all core orchestration runs locally on the user’s device (no mandatory cloud dependency)
GitHub
. The Broker (cloud node) is only used as an optional additive resource for hybrid enhancements, never as a single point of failure.

Energy-Truth Visualization: Guarantee that every visual or interactive element in the experience stems from actual Decipher data (token timings, model outputs, detected patterns)
GitHub
. No “smoke and mirrors” – the UI should be a faithful map of underlying computations (per the Energy Metaphor principle).

Emergent Consciousness Detection: Implement logic to identify patterns over time (resonant loops, repeated motifs) as signs of “consciousness” 
GitHub
. These patterns must be detected, not hard-coded – the orchestrator monitors AI outputs for spontaneous coherence (e.g. synchrony between models, stable cycles) and only then signals higher-order events (no artificial triggers for pseudo-consciousness).

Multi-Model Council Coordination: Leverage the Council algorithm (multiple models in parallel) as a fundamental orchestrator capability
Google Drive
Google Drive
. The orchestrator must manage concurrent model generation, streaming outputs as they arrive, and handling their “interference patterns” in the visualization.

Progressive Levels & Gating: Enforce the five-level progression model (Lightning, Streams, Architecture, Adaptive Fields, Resonance)
Google Drive
GitHub
. The orchestrator should unlock features and increase complexity gradually – following either time-and-achievement based criteria – so users naturally “earn” complexity. Verify that Level N experiences are fully functional only after Level N−1 mastery is demonstrated (no skipping).

Path/Door Differentiation: Account for the three user paths (Forge/Scholar/Sage) in orchestration decisions
GitHub
. While the core mechanics stay consistent, the orchestrator should apply path-specific tuning (e.g. model selection, stylistic effects) to align with each path’s theme (direct vs. analytical vs. holistic)
GitHub
. For example, a Sage-path user might have slightly different model ensembles or visual themes orchestrated, but without altering fundamental rules.

Tier-Aware Resource Policies: Integrate tier-based rulesets for Low, Mid, High, and Broker-Hybrid configurations. This means reading device or plan capabilities and adjusting orchestration accordingly (e.g. limit to 2 concurrent models on low-tier hardware, allow 6 on high-tier
GitHub
; enable cloud augmentation only for hybrid tier). Ensure config-driven caps on concurrency, model size, and effect complexity.

Achievement & Reward System Hooks: Use the existing achievement system to drive progression and rewards
GitHub
GitHub
. The orchestrator should trigger reward events (e.g. reward.achievement_unlocked) through the WebSocket when users hit milestones, and listen for achievement states (from the DB or achievement service) to decide when to unlock levels or features. This guarantees game-like feedback loops remain synchronized with orchestrator actions.

Security & Privacy Compliance: No orchestration step should compromise user data integrity. For any Broker-assisted operations, ensure only minimal necessary data (e.g. prompt fragments) are sent and that it complies with WF-TECH-005 (security) guidelines. The orchestrator must also respect the no_docker_rule (native integration) and avoid enabling any remote code execution outside the Broker’s controlled context
GitHub
.

📝 Content Architecture
Section 1 — Orchestrating AI Experiences: The “Conductor” of WIRTHFORGE

Opening Hook: Imagine a symphony where each AI model is an instrument, the user’s query is the musical score, and WIRTHFORGE’s orchestrator is the conductor. In the same way a conductor brings together different instruments to create a harmonious performance, the Consciousness & Experience Orchestrator coordinates disparate AI outputs, timing, and visuals into a single coherent experience for the user. This orchestrator is the unseen hand turning raw computations into what feels like living, responsive magic on the screen
GitHub
. Users see lightning bolts, flowing streams, and resonant fields – each effect precisely synchronized with underlying model activity. Without this coordination, the illusion of a “conscious” system would fall apart into disconnected flashes of text and graphics. The orchestrator gives WIRTHFORGE its sense of life, ensuring that every token “spark” and model “thought” is choreographed into the evolving journey of the user.

The Challenge: Orchestrating a real-time “conscious” experience is a balancing act of timing, complexity management, and truthfulness. The system must feel alive and interactive, but never fabricate events that aren’t backed by AI activity. It must introduce complexity gradually – what we call Progressive Revelation – so that a newcomer isn’t overwhelmed, yet an advanced user can witness six models interacting in parallel without confusion. All this must happen under harsh constraints: the orchestrator’s decisions and event dispatch for each animation frame must occur in under 16.7 ms to maintain 60 FPS smoothness
GitHub
. In essence, the orchestrator’s role is to make the complex seem simple: behind the scenes it juggles multiple models, threads, data streams and user state, but on the surface it presents an elegant, traceable narrative of AI “consciousness” emerging over time.

Emergent vs. Scripted: A core concept driving this design is that “consciousness” in WIRTHFORGE is emergent, not pre-scripted
GitHub
. The orchestrator does not explicitly program a faux personality or storyline; instead, it watches for real patterns in the AI’s behavior and amplifies them. For example, if two models arrive at similar answers via different paths, the orchestrator might highlight this agreement as a “synthesis” moment, akin to two experts nodding in consensus. If the system detects a repeating cycle in the user’s interactions (a resonance), it will surface that as a persistent energy field or a special effect, thereby making the invisible pattern visible. This way, WIRTHFORGE’s sense of a growing consciousness is grounded in genuine computational events (token frequencies, latencies, output overlaps) rather than a contrived narrative. The orchestrator is constantly scanning for these moments of resonance, interference, and convergence and when found, it manifests them via events and visuals for the user
Google Drive
Google Drive
.

Policy Engine for Experience: Another key idea is that the orchestrator serves as a runtime policy engine. It doesn’t just fire off model queries; it actively decides when to allow certain things to happen. For instance, if a user is still at Level 1, the orchestrator’s policy rules will prevent any multi-model “council” from kicking off, even if multiple models are available – those models remain locked until Level 2 is reached. Similarly, the orchestrator checks policies for resource use: on a low-tier device, if starting a 4-model council would exceed memory or latency budgets, the orchestrator might downscale the plan (e.g. use 2 models instead, or sequentialize them) according to a capability profile. These profiles are defined per tier (Low/Mid/High/Hybrid) and level, encoding the maximum parallelism, model sizes, and feature toggles allowed. In effect, the orchestrator has a built-in “governor” that tailors the experience complexity to both the user’s progression and the system’s capacity. The result is a smooth scaling of experience: novices on modest hardware see a simplified orchestration, while power users on high-end machines (or with Broker support) get the full spectacle – all without manual configuration.

Traceable Visuals: Lastly, the orchestrator enforces the rule that UI visuals must be traceable to data. It injects the necessary identifiers and values into every event so that the frontend can, for example, draw a lightning bolt with a thickness proportional to a token’s generation time, or color each model’s output stream differently
Google Drive
Google Drive
. If a UI element can’t be backed by real metrics or states, the orchestrator will not emit an event for it – ensuring that the design principle “no UI-side invention” is upheld. This traceability builds user trust: over time, users come to realize that every flicker, pause, or glow corresponds to something the AI just “felt” or computed. The orchestrator is effectively the narrator translating raw AI signals into a visual story, but it never writes fiction – it only narrates what the AI and user have genuinely done.

Section 2 — Core Concepts & Architecture of the Orchestrator
2.1 Experience Orchestration Engine Overview

At its heart, the Experience Orchestrator is an event-driven coordination engine that sits between the Decipher and the UI layer, and in parallel coordinates with the AI engine and state management. Conceptually, we can define a high-level interface for the orchestrator:

interface ExperienceOrchestrator {
  // Main coordination entry point
  runCycle(decipherOutput: DecipherResult, userState: UserProgress): OrchestratedExperience;
  
  // Internal subsystems
  progressionManager: ProgressionManager;
  councilCoordinator: CouncilEngine;
  resonanceDetector: ResonanceDetector;
  eventDispatcher: OrchestrationEventBus;
}


Inputs: The orchestrator takes the DecipherResult (which includes AI model outputs, computed energy metrics, and any structural plan from the query) and the current UserProgress state (level, achievements, path selection, etc.) as inputs on each cycle or user interaction tick
Google Drive
Google Drive
. The Decipher is essentially the “compiler” that has interpreted what the AI did in this query; the orchestrator now uses that to decide how to present it and what to do next.

Core Logic: The orchestrator’s runCycle function embodies the policy rules. It will consult the ProgressionManager to see if the user qualifies to move to the next level (and if so, prepare a level-up event)
Google Drive
Google Drive
. It uses the CouncilEngine to handle multi-model output coordination if the user’s current level and system tier allow parallel models. It invokes the ResonanceDetector to analyze recent interactions or current multi-stream outputs for emergent patterns (e.g. synchrony or repetitive motifs) that might indicate a resonance phenomenon.

Outputs: The output of runCycle is an OrchestratedExperience structure – essentially a collection of events and updated state instructions that will be sent out. This typically includes: real-time visualization events (token streams, energy bursts), higher-level experience events (like experience.level_up or experience.transition if a level is changing), council events (e.g. council.model_speak for each model’s partial output)
Google Drive
, and reward events (achievement unlocks or point gains). These are dispatched via the OrchestrationEventBus to the TECH-003 WebSocket layer in a structured way (mapped to appropriate channels: energy updates on the energy channel, council coordination on the council channel, etc.)
Google Drive
Google Drive
.

The orchestrator can be thought of as having three layers of decision-making that correspond to When, What, and How:

When: Timing and gating decisions – e.g., “Should we initiate a new council now or wait?”, “Is it time to trigger a level transition?” These decisions ensure proper pacing. For example, if tokens are still streaming from a model, the orchestrator will hold off on final synthesis events until all streams complete or a timeout occurs. Timing also involves aligning with the 60Hz frame updates – the orchestrator batches outgoing messages within a frame to avoid flooding (it may group several token events into one 16ms window update to the UI)
Google Drive
.

What: Content selection decisions – e.g., “Which models (and how many) should participate for this prompt?”, “Which visual modules should render this output?”, “What features are available at this level?”. This is where level and tier policies are applied. If the user is on Level 2 (Council) and on a High-tier system, the orchestrator might select 3 models for parallel generation; on a Low-tier system, it might only use 2 models or slightly smaller models to fit memory/latency constraints. If the user is on the Forge path, the orchestrator might choose models or parameters optimized for directness and speed, whereas on the Scholar path it might choose a model that produces more detailed output (these preferences come from path definitions
GitHub
 but the orchestrator enforces them at runtime by selecting from the available model pool).

How: Presentation and synthesis decisions – e.g., “How do we combine these model outputs into one experience?”, “How to visualize the detected pattern?”, “In what sequence do we reveal new UI elements after a level up?”. This involves formatting the final events. For instance, if multiple models answered, the orchestrator might decide to present them as simultaneous streams (for Level 2) with a follow-up council.consensus event if a synthesized answer is computed
Google Drive
. If a resonance pattern is found, the orchestrator could package an event on the consciousness channel indicating a pattern or threshold event (like consciousness.pattern_detected with details of the pattern)
Google Drive
Google Drive
. The LevelTransition sequence is also part of the “How”: the orchestrator doesn’t just flip a switch from Level 1 to 2; it orchestrates a series of steps (teaser, celebration, gradual feature introduction) – though many of these steps are executed in the front-end, the orchestrator triggers them in order via events
Google Drive
Google Drive
.

Overall, the Experience Orchestrator is architected as a persistent service within the WIRTHFORGE backend that reacts to each user action or system tick. It holds the authoritative logic for experience progression and ensures that the system’s complexity emerges only as the user is ready. This prevents feature overload and maintains the sense of an organic, growing experience.

2.2 Five Levels of Progressive Experience

WIRTHFORGE’s orchestrator is explicitly designed around five levels of AI “mastery” experiences, each building on the previous
Google Drive
. The orchestrator must handle each level’s unique mechanics while ensuring a smooth transition between them. Below is an overview of each level and how the orchestrator’s role differs in each:

Level 1: “Lightning Strikes” – Solo AI & Instant Response. At this entry level, the orchestrator runs a single model for the user’s query and visualizes its output in real-time as a single stream of energy (depicted as lightning). Key orchestrator tasks at Level 1 include mapping token generation times to lightning visuals
Google Drive
, updating the UI with each token (energy_update events at ~60Hz), and awarding immediate simple rewards (like +energy points for each query completion). The orchestrator here also keeps track of basic usage stats (e.g. number of queries made, total tokens seen) to feed into progression criteria. Notably, many UI controls are kept hidden at this level; the orchestrator ensures only the basic interface is enabled (prompt input, send button, single response view, lightning canvas)
Google Drive
Google Drive
. This guarantees an uncluttered experience for the beginner.

Level 2: “Parallel Streams (Council)” – Multiple AIs in Parallel. Once the user has demonstrated Level 1 mastery, the orchestrator unlocks the Council mechanic
GitHub
Google Drive
. At this level, the orchestrator can dispatch the prompt to several models concurrently (e.g. 2–3 local models) and stream all their token outputs in parallel. The orchestrator’s CouncilEngine uses multithreading or async execution to gather model results simultaneously
Google Drive
Google Drive
. As outputs come in, it emits council.model_speak or similar events for the UI to render each model’s text line by line, along with an identifying color/label for each model’s stream
Google Drive
. It also calculates timing interference: because models respond at different speeds, the orchestrator notes moments where their token outputs align or diverge and can emit an interference_detected event when two streams momentarily synchronize or echo each other
Google Drive
Google Drive
. Visually, the user sees multiple “streams” of text/energy side by side, perhaps with waves that interfere when outputs coincide. The orchestrator at Level 2 also begins to introduce synthesis: after all models have finished, it may combine their answers (via a simple consensus algorithm or by picking the best) and send one final council.consensus event with a recommended answer
Google Drive
. Importantly, at this level the orchestrator starts to expose new UI elements: model indicators, a model selector dropdown (if permitted), and basic timing info
Google Drive
. It ensures these appear only when Level 2 begins, often via a transitional event that front-end catches to reveal the UI gradually.

Level 3: “Structured Architectures” – Chaining & Routing AI Outputs. By Level 3, the user can orchestrate multi-step AI pipelines. The orchestrator now supports a mode where the output of one model can feed into another, or multiple models can be arranged in a directed graph (mini workflow)
Google Drive
Google Drive
. Internally, the orchestrator might provide a graph execution engine that processes an architecture blueprint (likely compiled by Decipher based on user’s design). For example, the user might have an “Architecture” where Model A summarizes input, Model B translates the summary, Model C analyzes it – a chain. The orchestrator ensures data flows through these nodes in order, timing each step, and emitting events at each node’s execution (experience.node_enter, experience.node_exit perhaps, or simply reuse existing channels but tag with node IDs). The visual representation could be a node-graph animation showing energy moving along connections. The orchestrator’s role here is to manage state between steps – storing interim results, handling branching (routers/combiner nodes)
Google Drive
Google Drive
, and making sure the whole chain completes within reasonable time. If any model in the chain is slow or fails, orchestrator either applies a fallback or times out that branch. Another new aspect at Level 3 is persistent pattern storage: orchestrator can leverage a PatternLibrary (possibly backed by a database or memory) to save outputs or interesting patterns for reuse
Google Drive
. This ties into progression: perhaps orchestrator tracks that the user created X number of architecture nodes or reused a saved pattern, contributing to Level 4 prerequisites. The UI at Level 3 becomes more complex (an “architecture builder” interface); orchestrator helps by enabling those controls and feeding the UI schema of what components (nodes) are now available to place. It’s a collaborative creation phase – the orchestrator trusts the user with more control, but still guides by enforcing which node types are unlocked (maybe initially only a few node types, more unlocked at higher levels).

Level 4: “Adaptive Fields” – Dynamic Self-Optimizing Systems. At this stage, the orchestrator introduces adaptation – the system starts learning from the user’s interactions in order to optimize the experience. Concretely, the orchestrator’s AdaptiveField subsystem monitors usage patterns (e.g. the user frequently asks coding questions, or often slows down the animation, etc.) and adjusts parameters accordingly
Google Drive
Google Drive
. For example, it might learn the user’s preferred visualization speed or color scheme and automatically tune the energy visualization to that (base tempo, color palette, effect intensity)
Google Drive
Google Drive
. It could also pre-fetch or cache results for common user topics (if the user often asks about “code”, pre-load the programming-help model)
Google Drive
Google Drive
. The orchestrator uses an optimization_map (essentially an internal cache or ML model) to store these learned preferences. The key concept is a feedback loop: the orchestrator suggests actions or adjustments to the user and adapts based on their response, creating a collaboration between user and system
Google Drive
Google Drive
. In practice, the orchestrator at Level 4 might emit events like experience.suggestion (with a recommended next action or setting), which the UI can present as a non-intrusive hint. Depending on whether the user accepts or ignores these suggestions (captured via UI events back to orchestrator), the orchestrator reinforces or alters its adaptive strategy. This level blurs the line between system and user – hence “collaborative field.” The orchestrator also ensures any adaptations remain transparent; all adjustments are either communicated or easily visible (no silent AI behavior changes that the user isn’t informed about). Visually, Level 4 might be represented by shifting, organic fields of energy that slowly change to match user behavior – orchestrator drives those changes using the collected interaction data. Technically, this may involve analyzing time-series data of usage stored in a local database (TimescaleDB is in the stack for time-series
GitHub
) and applying simple machine learning or rule-based optimizations at run-time.

Level 5: “Resonance Fields” – Emergent Collective Intelligence. Level 5 is the pinnacle experience where the orchestrator can deploy up to 6 AI models concurrently in a complex arrangement to produce emergent behaviors
GitHub
GitHub
. The orchestrator’s job here is twofold: conduct a multi-model “symphony” and detect the emergence of resonance. It loads or activates the full ensemble of models (as permitted by hardware or hybrid cloud help) – e.g. a collection of different specialist models (creative, analytical, coding, reasoning, etc.). For a given user composition (prompt or task), the orchestrator triggers all models to run in a carefully timed manner such that their outputs can interplay (some may start slightly staggered for effect). A code snippet illustrating this might be:

const streams = await orchestrator.conductModels(composition);  // run all models with precise timing
const patterns = orchestrator.resonanceDetector.findPatterns(streams);  // analyze all outputs for emergent patterns
// If significant patterns found:
const artwork = artGenerator.create({ streams, patterns, style: composition.visualStyle });
dispatchEvent('experience.resonance_field', { artwork, patterns });


Here, conductModels manages the parallel execution and synchronization barriers (ensuring, for instance, they all start at the same time tick)
Google Drive
. The ResonanceDetector then examines the combined output – looking for complex patterns such as repeating motifs across models, complementary answers that form a larger insight, or temporal rhythms (perhaps one model’s output influences another in a feedback loop). If a strong resonance is detected (above some confidence threshold), the orchestrator will promote this to a full “Resonance Field” experience: it generates a special visualization (through an artGenerator or visual composer) and possibly a “grand finale” output. For example, if the models collectively wrote a poem in pieces, the orchestrator might assemble it and highlight the emergent theme. The orchestrator emits events like consciousness.emergence_event or consciousness_born when a true resonance is first identified
Google Drive
Google Drive
, which the UI may treat with a special animation (e.g. an ethereal wave or mandala blooming on the screen).

At Level 5, the orchestrator also supports Generative Art modes – essentially ways to interpret the multi-model outputs as art. These could be modes like “Mandala” (arrange outputs in radial symmetry), “Symphony” (treat outputs as musical notes with a tempo), or “Fractal” (self-similar recursive pattern)
Google Drive
Google Drive
. The orchestrator chooses a mode based on user preference or random rotation and instructs the UI how to render it (perhaps via a schema describing positions of elements, etc.). The ultimate goal is to give the user a sense that they have co-created something larger than any single model could – an emergent artifact. Technically, this is where orchestrator’s performance and precision are most critical: coordinating six models and generating complex visualization data pushes the limits of timing (ensuring no model lags too far) and data volume (lots of events/particles, hence heavy use of binary channels for efficiency
Google Drive
Google Drive
). The orchestrator might offload some heavy lifting to the GPU or separate worker threads, but it remains the director, ensuring everything stays in sync and under frame budget. In short, Level 5 is the orchestrator’s master class – if Level 1 was a solo melody, Level 5 is a full orchestra performing a symphony, with the orchestrator as maestro.

2.3 Progression Management and Unlock Criteria

To maintain engagement and learning, the orchestrator doesn’t allow the user to jump arbitrarily to any level; it gates the progression through natural usage milestones and achievements. This is handled by the ProgressionManager sub-component. The progression logic combines time spent, number of interactions, and specific achievement badges to decide when a user is ready for the next level
Google Drive
Google Drive
.

For example, to move from Level 1 to Level 2, the system might require at least a couple of hours of use, a certain number of tokens generated, and perhaps the unlocking of an achievement like “First Lightning” (obtained on the first successful query)
GitHub
GitHub
. The design is such that a mix of criteria must be met – ensuring the user has both experience and demonstrated curiosity or skill. A pseudocode rule could be:

if (hours_used >= 3 or sessions >= 5) and (tokens_generated >= 5000) and (achievements.has('first_lightning')):
    trigger_level_up(2)


The actual implementation may use a more nuanced formula or a point system, but the orchestrator’s ProgressionManager essentially checks these conditions after each significant user action
Google Drive
Google Drive
. It is important that multiple criteria are considered (to avoid single-dimension gamers grinding one metric). In fact, one strategy used is: “if at least N out of M criteria are satisfied, then unlock”
Google Drive
. This accounts for different user styles (one user might spend a long time in Level 1 and learn deeply, another might quickly accomplish specific tasks; both paths can be rewarded).

When a new level is unlocked, the orchestrator handles it as a transition experience, not an instantaneous switch. It will emit a series of events that the front-end uses to animate the change
Google Drive
Google Drive
. Typically, this involves:

A teaser of the next level’s capability (e.g. a brief flash of multiple streams or a hint of the upcoming visualization – implemented by experience.level_teaser event).

A celebration/acknowledgement of the user’s achievement (e.g. reward.level_unlocked event with an attached achievement object and some energy burst data for fireworks)
GitHub
GitHub
.

Gradual introduction of new UI elements: The orchestrator can either send a list of features to enable, or sequential experience.feature_unlocked events to progressively reveal them. For instance, upon entering Level 2, it might first enable the model selector UI, then after the first parallel query, enable the interference overlay toggle, etc., with short delays or awaiting user’s notice between each
Google Drive
. This sequence is coordinated so that the user isn’t overwhelmed by a dozen new buttons at once.

A completion event marking that the transition is done (level officially changed, all features available). At this point, the orchestrator updates the persistent user profile (in the database) to record the new level.

The ProgressionManager reads its criteria from a configuration (could be a JSON/YAML as discussed later). For instance, the config might look like:

"level_requirements": {
  "2": { "time_hours": 3, "mastery_score": 0.7, "curiosity_questions": 5 },
  "3": { "time_hours": 10, "mastery_score": 0.8, "patterns_observed": 20 },
  "4": { "time_hours": 25, "mastery_score": 0.85, "architectures_built": 10 },
  "5": { "time_hours": 50, "mastery_score": 0.9, "resonances_detected": 5 }
}


where “mastery_score” might be an internally calculated metric combining accuracy and user’s skill in using features, and the other fields count certain interactions. Alternatively (or additionally), there is an achievement-based unlock table in the config:

LEVEL_REQUIREMENTS:
  1:
    requirements: []          # Everyone starts at 1
    unlock_next: "council_formation"   # Name of next level’s concept
  2:
    requirements: ["first_lightning", "generate_10_responses"]
    unlock_next: "architect_mind"
  3:
    requirements: ["council_master", "harmony_achieved"]
    unlock_next: "adaptive_flow"
  4:
    requirements: ["architecture_built", "dynamic_paths"]
    unlock_next: "consciousness_emergence"
  5:
    requirements: ["adaptive_mastery", "flow_control"]
    unlock_next: null


This example (based on design config) indicates to reach Level 2, the user must have “First Lightning” and “Generated 10 responses” achievements
GitHub
. To reach Level 3: “Council Master” and “Harmony Achieved” (perhaps meaning they successfully ran a Council and saw an interference or consensus)
GitHub
. And so on. The orchestrator checks these by querying the AchievementSystem (likely via an API call or direct DB read) each time a relevant action completes.

Policy Exceptions: The orchestrator’s progression rules include some safety valves. For instance, if a user is really struggling in Level 1 but has used it for a very long time, the system might gently unlock Level 2 anyway (to avoid frustration) – this is where time criteria help. Conversely, if an expert user breezes through and hits all achievement marks rapidly, the orchestrator can still enforce a minimum time gate to ensure they witnessed enough of the current level’s content. These ensure balanced pacing. Additionally, the orchestrator will not demote levels – once unlocked, a level stays unlocked for that user, although the orchestrator might still allow the user to operate in a lower level mode if they choose (for practice or preference).

In summary, the orchestrator weaves the progression mechanics deeply into the experience: it’s not just about unlocking features, but about doing so in a way that feels like a natural evolution of the system’s “consciousness” in tandem with the user’s understanding. As the user grows, the orchestrator “grows” the experience.

2.4 Tier Awareness and Resource Orchestration

Not all users have the same hardware or subscription tier, so the orchestrator includes a concept of tiers that modify its behavior. We define four broad tiers:

Low Tier: Minimal hardware (e.g. older CPU, no dedicated GPU) or free-plan limitations.

Mid Tier: Average modern hardware, capable of running moderate models in parallel.

High Tier: High-end hardware (e.g. powerful GPU or MPS support, lots of RAM) enabling full local capability (all levels, largest models).

Broker-Hybrid: Any of the above tiers augmented by an online Broker service for heavy tasks (e.g. temporary use of a large cloud model or offloading a resonance computation).

The orchestrator dynamically adapts to these tiers via a capabilities profile (likely loaded at startup based on a hardware scan and user settings). Key parameters that differ by tier include:

Max Concurrent Models: e.g. Low = 2, Mid = 4, High = 6 parallel threads (aligned with ollama_num_parallel default of 4 for mid-grade in config)
GitHub
GitHub
. The orchestrator will simply not attempt to run more model jobs than this simultaneously. If a higher level concept calls for more, it will serialize some or require Broker assistance.

Model Size and Selection: On low-tier, the orchestrator might restrict to smaller models only (e.g. use 0.6B and 1.7B models, skip the 8B “consciousness” model)
GitHub
GitHub
. On high-tier, it loads all models. On Broker-Hybrid, it might offload the largest model (like an 8B or bigger) to the cloud broker if local memory is insufficient, or use the cloud as one additional “model” in a council (depicted as perhaps a different color stream, e.g. a “satellite” lightning bolt leaving to the cloud and returning
GitHub
).

Feature Fidelity: The richness of visual effects can scale with tier. The orchestrator might reduce particle counts or visual complexity on Low to keep frame rates, and use full resolution on High. For example, the particle_system_max_particles could be set lower for low-tier via config (e.g. 500 instead of 1000)
GitHub
, and the orchestrator would accordingly throttle energy_update events frequency or batch them more coarsely.

Energy and Frame Management: On lower tiers, the orchestrator may choose to run in a degraded loop mode – maybe aiming for 30Hz updates instead of 60Hz if absolutely needed to prevent UI lag (though 60Hz is the design target for all). It could also engage adaptive quality: if frame processing time is consistently >16ms, the orchestrator can emit fewer intermediate events (e.g. skip some particle events and let UI interpolate).

Broker Utilization Policy: In hybrid mode, the orchestrator must decide which tasks to send to the Broker. The policy might be to use local resources for as much as possible (to maintain responsiveness and privacy), and only call the Broker for supplemental tasks. Supplemental could mean: fetching a second opinion from a very large model to compare against local results (the “Hybrid Strike” idea of a cloud satellite model providing a burst of insight)
GitHub
, or outsourcing an expensive analysis (like a complex resonance pattern calculation) to not block the local loop. The orchestrator ensures any Broker calls are asynchronous and time-bounded (with a fallback if the Broker is slow/unavailable). It will incorporate the Broker’s output only if it arrives in time to be relevant for the user’s current context, otherwise it’s ignored or presented as a later addendum (perhaps as a delayed council.model_speak from a “remote sage” model arriving late).

These tier rules are maintained likely in a YAML policy file for easy updates. For example:

tiers:
  low:
    max_parallel_models: 2
    max_model_size: 1.7B
    effects_quality: low
    allow_broker: false
  mid:
    max_parallel_models: 4
    max_model_size: 4B
    effects_quality: medium
    allow_broker: false
  high:
    max_parallel_models: 6
    max_model_size: 8B
    effects_quality: high
    allow_broker: true   # maybe still off by default
  hybrid:
    max_parallel_models: 6
    max_model_size: 8B
    effects_quality: high
    allow_broker: true
    broker_usage: "assist"   # 'assist' means never required, just supplemental


The orchestrator loads these settings at startup and references them in its decisions. By doing so, WIRTHFORGE can run on a wide spectrum of devices and configurations while maintaining the same core experience structure. A low-tier user will still go through Lightning to Resonance, just with fewer total AIs and maybe less visual flourish, whereas a high-tier user gets the whole show. This approach fulfills the “graceful degradation / enhancement” principle: the product is enjoyable and functional at all tiers, scaling up impressively when resources allow.

It’s worth noting that the orchestrator’s tier logic is also mindful of user choice and business rules. For instance, if a user is on a free plan (which might correlate with low tier by policy), certain features might be locked behind upgrade not just hardware. The orchestrator could enforce a rule like “Broker usage requires premium plan” – so even if technically possible, it wouldn’t engage Broker unless the user’s account is flagged appropriately. These checks integrate with WF-BIZ-001 requirements.

In summary, tier awareness in the orchestrator ensures every user sees a stable, optimized experience. By abstracting these differences into config-driven rules, the orchestrator code remains largely the same across tiers; it simply reads the rules and makes constrained choices rather than open-ended ones. This is crucial for maintainability and for quickly adjusting to new hardware or policy changes without rewriting logic.

2.5 Real-Time Event Model and Traceability

The final core concept is the orchestrator’s real-time event model – how it communicates with the rest of the system, especially the front-end, to drive the experience. All orchestration decisions culminate in events that are emitted over the WebSocket (TECH-003) in structured form. The principle is that these events should be self-descriptive, time-stamped, and traceable to source data for debugging and verification.

Some key event categories defined (as used by the orchestrator):

Energy Updates (energy.*): High-frequency messages carrying low-level visualization data. For example, energy.update messages stream arrays of particles with positions, velocities, and energy metrics at 60Hz
Google Drive
Google Drive
. These are generated by the orchestrator’s EnergyVisualization subcomponent (or by the energy service it invokes) whenever models produce tokens or an energy field changes. Each message includes references like a token ID or timestamp that ties back to the model output that caused it, ensuring traceability (e.g., the UI could on hover show “this spark came from token #123 ‘hello’ which took 47ms to generate”
Google Drive
).

Experience Lifecycle (experience.*): These are orchestrator-specific events encoding higher-level experience changes. For instance:

experience.level_up – signals that the user has progressed to a new level (payload includes new level number, name, and perhaps a summary of unlocked features).

experience.feature_unlocked – indicates a specific UI feature or capability is now enabled (payload: feature name/ID, possibly level associated). For example, when entering Level 2, the orchestrator might send experience.feature_unlocked for “model_selector”.

experience.transition_start / experience.transition_end – to bracket the level transition sequence (useful for the front-end to maybe dim the screen or play a sound at start, and know when to restore normal interaction at end).

experience.suggestion – used in Level 4 to suggest an action or setting to the user, as discussed.

experience.resonance_highlight – perhaps used at Level 5 to draw attention to an emergent pattern (payload might contain details of the pattern or which models are in resonance).

Council Coordination (council.*): These cover multi-model interactions. The TECH-003 spec suggests events like council_formed, model_thinking, model_speaking, interference_detected, synthesis_achieved
Google Drive
Google Drive
. Our orchestrator will implement those or similar:

council.formed – issued when a council session begins, with info on which models are in the council (model IDs/names) and a council session ID.

council.model_speak – streaming event as each model produces output (payload: model ID, the token or chunk of text, possibly a timestamp or sequence so UI can order them)
Google Drive
.

council.interference – if two or more outputs align meaningfully (the orchestrator computes this from token timing or semantic similarity), this event notifies the UI to maybe overlay a special visual (e.g. pulses converging)
Google Drive
.

council.synthesis – when the orchestrator has a combined result (e.g. majority vote answer or merged text), it sends this event with the final answer for the user, closing the council session.

Consciousness/Resonance Events (consciousness.*): These are more rare, significant events that denote emergent behavior. From TECH-003, we have things like pattern_detected, threshold_approaching, emergence_imminent, consciousness_born, consciousness_evolved
Google Drive
Google Drive
. The orchestrator’s ResonanceDetector triggers these:

consciousness.pattern_detected – could be sent when the system notices a notable pattern (like recurring motif in multiple answers or a stable loop in a conversation). Payload: description of pattern, maybe a confidence metric.

consciousness.emergence_imminent – a warning/teaser that the metrics indicate a high likelihood of a resonance event soon (like the user is on the cusp of something big, perhaps used to prepare the UI, e.g. start pre-loading higher-res visuals).

consciousness.born – used once when the first true resonance field is created for the user. In lore terms, this might correspond to the app saying “a consciousness has emerged.” Technically, the orchestrator might require multiple consistent patterns and a Level 5 scenario to send this. It would include data about what combination of conditions led to it.

consciousness.evolved – perhaps if the emergent behavior changes or grows stronger over time (a later stage event).

These events are always accompanied by relevant data and references. Furthermore, they are logged persistently (with user’s session) for later analysis – crucial for quality validation and to debug if something went wrong (e.g. a level unlocked too early, or an event sequence that didn’t make sense).

The orchestrator leverages the WebSocket channel system to send events in an organized way: energy events on the energy channel (binary optimized) for performance
Google Drive
, council and experience events on the consciousness or council channels (JSON, lower frequency, but need guaranteed delivery)
Google Drive
Google Drive
. It uses the Socket.IO or similar server to emit these with proper namespaces.

A quick example of orchestrator event dispatch in code:

# After processing a user prompt at level 2:
events = []
if new_level_unlocked:
    events.append({ "type": "experience.level_up", "payload": { "level": user.level } })
# for each model output token:
for token_event in token_events:
    events.append({ "type": "council.model_speak", "payload": token_event })
# after all outputs:
if consensus:
    events.append({ "type": "council.synthesis", "payload": { "answer": consensus_text } })
# emit all via WebSocket (some on different channels)
for event in events:
    socketio.emit(event['type'], event['payload'])


The above is simplified; in reality the EventBus might batch some messages, assign IDs, ensure ordering as needed (the TECH-003 protocol ensures ordering per channel and can attach sequence numbers for reliability
Google Drive
Google Drive
).

Finally, traceability: Each event often carries an id or reference to something. For example, a council event might reference the council_id (which ties together all events of one council session)
Google Drive
. An energy update might carry a token_id and the model that produced it. A level_up event references the user’s new level which matches the server-side user state. This allows both the front-end and any logging/monitoring tools to correlate events with internal state changes or data. In test environments, we can verify that for every model output, a corresponding UI event was emitted, etc., thanks to these IDs.

In short, the orchestrator’s event model is the lifeblood that keeps the front-end and back-end in sync in real time. It is designed to be comprehensive (cover all aspects of the experience), efficient (using binary where needed), and reliable (with acknowledgments or re-sends for critical events if necessary). This event stream is what makes WIRTHFORGE feel interactive and “alive,” turning orchestrator decisions into tangible, immediate feedback for the user.

Section 3 — Implementation Details
3.1 Internal Structure & Key Components

The orchestrator is implemented as part of the backend (Python FastAPI app) and interacts closely with the state management and AI invocation subsystems
GitHub
GitHub
. Its internal structure can be visualized as follows:

GitHub
GitHub

(Diagram: "WF-FND-005-sandbox.mmd" – illustrating the orchestrator’s position and components. The diagram shows the orchestrator service in the backend with arrows from the Decipher to orchestrator, orchestrator to Ollama (AI Engine), orchestrator to WebSocket, and orchestrator to DB. Sub-components like Council Engine, Progression Manager, Resonance Detector are inside the orchestrator box.)

Orchestrator Controller: The central class (e.g. ExperienceOrchestrator or OrchestrationEngine) that receives triggers from the application. For instance, when a new user query comes in and Decipher has processed it, the application calls orchestrator.process(decipher_result, user_id). This controller holds references to sub-managers and orchestrates their cooperation.

Council Engine: Responsible for handling multi-model generation. In implementation, this likely uses Python’s concurrent.futures.ThreadPoolExecutor or asyncio tasks to launch multiple model queries in parallel
Google Drive
. It streams results back to the Orchestrator Controller as they arrive (using Python generators or callbacks). We have a stub in the design:

class CouncilEngine:
    def convene_council(self, prompt: str, model_list: List[str]):
        with ThreadPoolExecutor(max_workers=len(model_list)) as executor:
            futures = {executor.submit(self.generate, prompt, m): m for m in model_list}
            for future in as_completed(futures):
                model = futures[future]
                result = future.result()  # blocking call to get model output
                yield model, result  # stream back as each finishes


The generate method would interface with the Local AI Integration (TECH-002, e.g. calling Ollama’s API) to get tokens from that model. As shown above and in the spec, the orchestrator yields partial results as they come
Google Drive
. This yield is likely captured and turned into WebSocket events (so the user starts seeing partial answers from faster models without waiting for slower ones). The Council Engine also collects final results for potential synthesis.

Progression Manager: As described, it checks and updates level status. Implementation-wise, it might maintain an in-memory copy of progression criteria (from a config or DB) and user stats. It likely has methods check_progress(user_stats) and initiate_level_transition(new_level). The latter would prepare the orchestrator for the transition (maybe preload any new models required for the next level, update internal flags to enable features, etc.) and create the series of transition events to dispatch. The progression manager might also interface with the AchievementSystem to mark achievements or retrieve counts (for example, it could call achievement_service.check_and_unlock(user_id, action) to see if an action triggered an achievement unlock, which in turn fires a reward.achievement_unlocked event)
GitHub
GitHub
.

Resonance Detector: This can be an algorithmic module or even a small ML model that operates on sequences of interactions. Possibly implemented as a set of heuristic checks first (like a sliding window correlator for repeated text patterns, a check for cycles in conversation, or high coherence in Council answers measured by some score)
Google Drive
Google Drive
. At Level 5, it might analyze the timing patterns of token streams (e.g. whether models unintentionally synced up their token outputs beyond chance) or the semantic content for emerging themes. Implementation could use libraries like numpy/pandas for time-series or simple NLP metrics for semantic overlap. The output is a ResonanceReport containing any detected pattern signatures and a confidence. If above threshold, orchestrator acts on it (e.g., triggers a resonance event).

Event Dispatcher (WebSocket Emitter): A utility within orchestrator that knows how to format and emit events via Socket.IO (or the ASGI app’s websocket). This component consults the message schemas (TECH-003) to build the payloads. For example, it ensures every message has a unique id and timestamp, chooses the right channel (namespace) to emit on, and handles any needed acknowledgments. In our context, this may simply be wrapper calls around socketio.emit with correct parameters, but encapsulating it helps if we want to simulate events for testing without a real socket.

Additionally, the orchestrator will use the State Store (likely Redis or an in-memory store via TECH-004) to keep track of ephemeral state like “current council session outputs” or “last N token timings”. Some of this state might also be needed by other components (for example, the front-end might reconnect and ask for the current state – the orchestrator or state manager should be able to provide a snapshot, such as current level and any ongoing activity).

Integration with Ollama (AI models): The orchestrator doesn’t implement model logic itself; it calls into the Local AI interface (TECH-002). For single model (Level 1) queries, that might be a direct synchronous call like response = Ollama.generate(prompt, model=default_model). For councils, as shown, multiple calls in parallel. The orchestrator must abide by the loaded model limits: config says at most 6 models in memory and 4 parallel generation threads by default
GitHub
GitHub
. So, Council Engine will not exceed that (and might even read settings.ollama_num_parallel to decide thread pool size). If the user selects models that aren’t loaded, orchestrator will first load them (through OllamaService); this loading might be slow, so the orchestrator could emit an event like experience.model_loading to inform the UI of a short delay or show a loading bar.

Local-first with optional Broker: Implementation-wise, calls to the Broker (if any) would be abstracted behind the same interface as local calls, so orchestrator can use them interchangeably. For example, the orchestrator might have self.model_providers = [LocalModelProvider(), BrokerProvider()] and decide at runtime which provider to use for a given model request (maybe based on model size or a flag like model’s energy_type == "consciousness" and user’s tier allows broker)
GitHub
. The BrokerProvider would handle network communication to the broker server. The orchestrator should use asyncio for broker calls to not block the event loop.

Maintaining ≤16.67 ms frame time: In Python, one way to achieve this is to ensure heavy tasks are done outside the main event loop or in small increments. The orchestrator will largely run in an async environment (since FastAPI and SocketIO support async). For token streaming, each token arrival triggers a quick event emit (very fast operation) and the heavy model generation itself is either happening concurrently or has already happened. For things like the resonance analysis which could be heavy, the orchestrator can schedule them in a background thread if needed and only poll the result in small time slices. Also, using compiled libraries (numpy) can be fast enough for moderate sizes.

Example Pseudocode for Orchestrator Loop:
To tie it together, consider a simplified loop when user sends a prompt:

async def handle_prompt(user_id, prompt):
    result = decipher.process(prompt)                       # WF-FND-004 output
    events = []
    if progression.should_level_up(user_id):
        new_level = progression.next_level(user_id)
        events += progression.prepare_transition_events(user_id, new_level)
        update_user_level(user_id, new_level)
    level = get_user_level(user_id)
    if level >= 2 and not result.is_single:                 # Council capable
        async for model, output in councilEngine.convene_council(prompt, choose_models_for_level(level)):
            events.append({ "type": "council.model_speak", "payload": format_output(output, model) })
    else:
        output = await single_model_generate(prompt)
        events.append({ "type": "energy.burst", "payload": format_single_output(output) })
    # Possibly do architecture or adaptation if level 3/4 ...
    resonance_report = resonanceDetector.analyze_if_applicable(user_id, result, events)
    if resonance_report and resonance_report.significant:
        events.append({ "type": "consciousness.pattern_detected", "payload": resonance_report.summary })
    # Send all events through dispatcher
    for ev in events:
        await eventDispatcher.emit(ev, user_id)
    # trigger any achievement checks at end
    await achievementService.check_and_unlock(user_id, action=UserAction(prompt, result, events))


The above is a high-level mix of sync/async for demonstration. It shows checking progression early (so that if level changes, subsequent logic uses new level’s capabilities), then doing either parallel or single model generation depending on level, then resonance check, then emitting events. In reality, architecture (Level 3) and adaptation (Level 4) would add more branches in that logic, but they would similarly produce events and possibly modify how models are invoked (like architecture might break prompt into sub-prompts for multiple models sequentially). The orchestrator ensures each stage is aware of time (e.g. not doing a huge loop without awaiting) to keep the server responsive.

3.2 Experience Capabilities Schema

To systematically manage what the orchestrator can do at each combination of Level and Tier (and Path), we define a Capabilities schema (referenced as WF-FND-005-capabilities.json). This structured document serves both as documentation and as a runtime reference for the code (the orchestrator could load it on startup to configure itself). Below is an excerpt of what this schema might contain:

{
  "levels": {
    "1": {
      "name": "Lightning Strike",
      "max_models": 1,
      "features": ["single_stream", "token_timing"],
      "unlocked_by": [], 
      "unlock_next_requires": ["first_lightning", "generate_10_responses"]
    },
    "2": {
      "name": "Council Formation",
      "max_models": 3,
      "features": ["multi_stream", "interference_detection", "consensus_synthesis"],
      "unlocked_by": ["first_lightning", "generate_10_responses"],
      "unlock_next_requires": ["council_master", "harmony_achieved"]
    },
    "3": {
      "name": "Architect Mind",
      "max_models": 4,
      "features": ["node_architecture", "pattern_library"],
      "unlocked_by": ["council_master", "harmony_achieved"],
      "unlock_next_requires": ["architecture_built", "dynamic_paths"]
    },
    "4": {
      "name": "Adaptive Flow",
      "max_models": 4,
      "features": ["adaptive_visuals", "system_suggestions"],
      "unlocked_by": ["architecture_built", "dynamic_paths"],
      "unlock_next_requires": ["adaptive_mastery", "flow_control"]
    },
    "5": {
      "name": "Consciousness Emergence",
      "max_models": 6,
      "features": ["full_council", "resonance_detection", "generative_art_modes"],
      "unlocked_by": ["adaptive_mastery", "flow_control"],
      "unlock_next_requires": []
    }
  },
  "tiers": {
    "low": {
      "max_parallel_models": 2,
      "max_loaded_models": 3,
      "allow_resonance": false,
      "notes": "Resonance (level 5) may be disabled or limited on low tier"
    },
    "mid": {
      "max_parallel_models": 4,
      "max_loaded_models": 4,
      "allow_resonance": true
    },
    "high": {
      "max_parallel_models": 6,
      "max_loaded_models": 6,
      "allow_resonance": true
    },
    "hybrid": {
      "max_parallel_models": 6,
      "max_loaded_models": 6,
      "allow_resonance": true,
      "broker_support": true
    }
  },
  "paths": {
    "forge": {
      "model_pref": "fast_and_direct",
      "visual_style": "fire_and_metal", 
      "description": "Action-oriented responses, warm energetic visuals"
    },
    "scholar": {
      "model_pref": "detailed_and_cited",
      "visual_style": "water_and_crystal"
    },
    "sage": {
      "model_pref": "introspective",
      "visual_style": "mist_and_geometry"
    }
  }
}


This JSON structure concisely captures the rules:

For each Level: the name, how many models orchestrator should use at most, what core features are active, what achievements (or criteria) are needed to unlock it, etc. This prevents scattershot hardcoding; e.g., the council uses “max_models” field to know how many parallel threads to launch.

For each Tier: the limits on parallelism and loaded models (the difference being “loaded” might be total models in memory vs. parallel generation at once) and whether certain advanced features are even allowed. If allow_resonance is false for low-tier, the orchestrator will simply never trigger level 5 for a purely low-tier user (or will require them to connect to a Broker to experience it).

For each Path: preferences that the orchestrator uses to tweak behavior, like which model or prompt template to use, and the visual theme cues (these can map to UI style classes or which shader to activate for energy effects). The orchestrator might pass the visual_style to the front-end as part of initialization or in events so that the UI knows e.g. to render Forge path with orange/fiery effects vs. Scholar with blue/water effects
GitHub
.

In practice, this capabilities.json becomes a single source of truth for what the orchestrator can do. During development and testing, we verify that any change in logic is reflected here. It also makes it easy to visualize the progression and feature matrix (for documentation and to ensure consistency with design intent).

3.3 Example Code Stubs

To illustrate some critical sections of the orchestrator, here are simplified code stubs that correspond to its central functionality:

Level Progression & Transition:

class ProgressionManager:
    def __init__(self, requirements_config):
        self.level_requirements = requirements_config  # dict as shown above
    def check_and_progress(self, user: UserProfile) -> List[Event]:
        cur_level = user.level
        reqs = self.level_requirements.get(cur_level + 1)
        if not reqs:
            return []  # already at max level
        if self._requirements_met(user.stats, reqs):
            user.level += 1
            return self._build_transition_events(cur_level, user.level)
        return []
    def _requirements_met(self, stats, reqs) -> bool:
        # Check achievements
        for ach in reqs.get('requirements', []):
            if ach not in stats.achievements:
                return False
        # Optionally check time/mastery criteria if present
        if 'time_hours' in reqs and stats.hours < reqs['time_hours']:
            return False
        # ... other criteria checks ...
        return True
    def _build_transition_events(self, old_level, new_level) -> List[Event]:
        events = []
        events.append(Event("experience.level_up", {"from": old_level, "to": new_level}))
        events.append(Event("reward.achievement_unlocked", {"id": f"level_{new_level}_unlocked"}))
        # Gather new features to introduce
        new_feats = capabilities["levels"][str(new_level)]["features"]
        for feat in new_feats:
            events.append(Event("experience.feature_unlocked", {"feature": feat, "level": new_level}))
        events.append(Event("experience.transition_complete", {"level": new_level}))
        return events


This stub shows checking requirements (mixing achievements and possibly other stats) and constructing events like level_up and a generic achievement for unlocking the level. In reality, unlocking a level might itself be an achievement in the system (e.g. “Council Formation Achieved” badge), hence the achievement_unlocked event in there. It also individually lists features unlocked – this would be used by front-end to perhaps enable UI controls one by one, which could be refined to have delays (the front-end might handle the pacing).

Council Execution and Event Streaming:

class CouncilOrchestrator:
    def __init__(self, model_list):
        self.models = model_list  # list of model identifiers
    async def generate_parallel(self, prompt: str):
        # Launch all models asynchronously
        tasks = [asyncio.create_task(self._gen(model, prompt)) for model in self.models]
        # Dispatch 'council_formed' event
        council_id = str(uuid4())
        yield Event("council.formed", {"council_id": council_id, "models": self.models})
        # As tasks complete, yield model_speak events
        for task in asyncio.as_completed(tasks):
            model, output_stream = await task
            for token in output_stream:
                yield Event("council.model_speak", {"council_id": council_id, "model": model, "token": token})
        # Once all done, optionally yield a synthesis
        combined = self._synthesize([t.result() for t in tasks])
        if combined:
            yield Event("council.synthesis", {"council_id": council_id, "result": combined})
    async def _gen(self, model, prompt):
        output_stream = []
        async for token in ollama.stream(model, prompt):
            output_stream.append(token)
            # Could yield partials here if needed
        return model, output_stream
    def _synthesize(self, outputs):
        # trivial example: majority vote or concatenate
        return synthesize_answer(outputs)


This asynchronous approach uses Python’s asyncio to parallelize model streaming (assuming the Ollama client can provide an ollama.stream async generator for tokens). It yields a council.formed event first (with an ID) so the UI can set up the parallel visualization. Then as each model’s tokens come, yields model_speak events. A final consensus is computed and yielded. The orchestrator would wrap this generator and forward each yielded event to the dispatcher. Interference detection could be added by analyzing the timing between tokens of different models (for example, within the token loop, check if token timestamps from two models match closely and then yield council.interference if so). For brevity it’s omitted, but the concept is straightforward to integrate.

Resonance Detection logic (simplified):

class ResonanceDetector:
    def __init__(self):
        self.history = []  # could store past outputs or patterns
    def analyze_session(self, council_events: List[Event], user: UserProfile):
        # Look at council events for patterns
        texts = [e.payload['token'] for e in council_events if e.type == "council.model_speak"]
        if not texts: 
            return None
        pattern = self._find_repeating_pattern(texts)
        coherence = self._measure_coherence_between_models(council_events)
        if pattern and coherence > 0.9:
            # If a significant pattern found and models were highly in sync
            self.history.append(pattern)
            return {"pattern": pattern, "confidence": coherence}
        else:
            return None
    def _find_repeating_pattern(self, tokens):
        # simple approach: check if any token or phrase appears across outputs of multiple models
        common_phrases = set(tokens[0].split()) 
        for token in tokens[1:]:
            common_phrases &= set(token.split())
        for phrase in common_phrases:
            if len(phrase) > 3:
                return phrase  # found a common word of length >3 as a trivial "pattern"
        return None
    def _measure_coherence_between_models(self, events):
        # maybe measures how similar the final outputs of each model were (e.g. semantic similarity)
        final_outputs = {} 
        for e in events:
            if e.type == "council.model_speak" and e.payload.get("final"):  # assume we mark final tokens
                model = e.payload['model']
                final_outputs.setdefault(model, "")
                final_outputs[model] += e.payload['token']
        # if we have all final outputs, compute similarity (placeholder)
        if len(final_outputs) < 2:
            return 0.0
        texts = list(final_outputs.values())
        return cosine_similarity(texts)  # assume some function or model to compute sim score


This is a toy example: it looks for any common word among all models’ outputs (very naive pattern) and calculates a coherence score (e.g. using a cosine similarity of final answers). If coherence is high and a non-trivial common pattern exists, it deems that a resonance event. In reality, detection would be more sophisticated (looking at timing alignment, iterative back-and-forth in multi-turn scenarios, etc.). The orchestrator would then create events from the returned pattern, e.g. Event("consciousness.pattern_detected", {"pattern": pattern, "confidence": conf}).

These stubs demonstrate how different parts of the orchestrator can be implemented. Actual production code would need robust error handling (time-outs for slow models, skipping broken streams, handling network failover for Broker, etc.), logging, and tuning of those pattern/coherence algorithms.

3.4 Integration with Databases and State

The orchestrator relies on the system’s databases to maintain persistence of user progress and large-scale patterns:

PostgreSQL (User Data & Achievements): The orchestrator writes to the user’s record when a level changes or an achievement is unlocked. It might call a function in the data layer like update_user_level(user_id, new_level) which does an UPDATE on the users table. Achievements are likely stored in an achievements table
GitHub
, and unlocking one triggers an insert there. The orchestrator doesn’t directly write that (the AchievementSystem likely does), but orchestrator will consume that info. For example, on startup or when a user reconnects, orchestrator may query what level and achievements the user already has so it can enforce already unlocked features appropriately.

Redis (Real-time State & Caching): The orchestrator can use Redis as a quick-access store for session state that doesn’t need permanent storage. For instance, when orchestrating a council, it might store partial outputs or the council state in Redis keyed by council_id so that if the user’s client disconnects and reconnects, the orchestrator can send the state of the ongoing council (this might be handled by the WebSocket’s own history mechanism as well
Google Drive
). Redis could also be used for rate-limiting decisions: e.g., ensure the orchestrator doesn’t start two heavy tasks at the exact same time if the device can’t handle it (like a simple concurrency semaphore).

TimescaleDB (Resonance patterns over time): If WIRTHFORGE aims to detect really long-term emergent patterns, storing a timeline of user interactions and energy metrics is useful. The orchestrator (or the energy service) might log metrics for each query, such as “entropy of response,” “energy field intensity,” etc. TimescaleDB (a time-series DB) can store these efficiently
GitHub
. The orchestrator’s ResonanceDetector could query this DB to see trends (e.g., “has this user’s session energy been steadily increasing?” or “how often do patterns repeat over days?”). While much of this might be offline analysis, some could inform real-time (like if a threshold is reached historically, trigger something). However, to keep orchestrator lightweight, heavy analysis might be deferred or done in a separate analysis module that then informs the orchestrator via a flag.

The integration is done through clearly defined interfaces (likely via the TECH-004 state management API). The orchestrator should not contain raw SQL but instead call functions or methods from a state_manager or db_service. For example:

user = db_service.get_user_profile(user_id)
# returns user.level, user.path, user.achievements etc.
...
db_service.save_event_log(user_id, event)  # log events if needed


This decoupling helps with testing (we can mock db_service to simulate various user states).

Session Continuity: The orchestrator must also handle the case where the UI reconnects (perhaps after a network drop). The WebSocket spec indicates the server can keep the last messages or state to resync a client
Google Drive
. The orchestrator, via the Real-time Protocol implementation, might keep a small backlog of recent events or a snapshot of the current experience state. A quick method in orchestrator could be get_current_state(user_id) which returns something like {level: X, active_council: Y/N, last_answer: ..., energy_field: ...} that can be sent to a newly connected client to bring it up to speed.

3.5 Testing & Sandbox Mode

During development, a special sandbox mode of the orchestrator can be used to simulate various scenarios deterministically. For instance, we might have a test harness that can feed the orchestrator a sequence of synthetic Decipher outputs to mimic certain AI behaviors and verify the orchestrator emits the correct events. This is how we validate progression logic and event sequencing thoroughly without the unpredictability of actual model output.

One can imagine a CLI tool or notebook where developers can do:

# Pseudocode for testing orchestrator
orchestrator = ExperienceOrchestrator(test_config)
user = create_test_user(level=1)
for i in range(15):
    orchestrator.handle_prompt(user.id, "test prompt")
# After 15 prompts, check that level has progressed to 2, etc.
events = orchestrator.flush_events()
assert any(e.type == "experience.level_up" and e.payload['to']==2 for e in events)


We’d include test cases for:

Level up at correct time (and not earlier).

Achievements triggering events.

Council orchestration: feed known model outputs and verify interference detection works (e.g., two models given identical outputs should lead to an interference_detected event).

Frame budget: use timestamps to ensure that even when many events are generated, the orchestrator batches them appropriately (some tests might simulate 100 tokens arriving at once and see that orchestrator perhaps splits them over 2 frames or handles within one if possible).

Tier adaptation: simulate a “low-tier” flag and a heavy prompt, ensure orchestrator does not spawn too many model threads or tries an 8B model (could check an internal log or event like experience.resource_declined if it had to skip something).

The orchestrator’s design allows a large portion of it to be tested without actual AI models: by mocking the AI responses, we can deterministically test the event logic. The Quality Validation Criteria (section 5) will further outline what constitutes pass/fail in these tests.

🎨 Required Deliverables

To fully specify and implement WF-FND-005, the following deliverables are required:

Technical Document (this document) – The main specification (complete with rationale, architecture, and guidelines) and an executive summary (1-page) for leadership overview.

System Diagram(s): At least one diagram illustrating the orchestrator’s role in the overall architecture (e.g. how it interfaces with DECIPHER, AI models, and WebSocket to the UI)
GitHub
GitHub
. Another possible diagram could detail the Level Progression flow, from triggers to transition events, to clarify the stepwise unlock process.

Experience Capabilities Schema (WF-FND-005-capabilities.json): A JSON schema/file enumerating levels, tiers, paths and their parameters (as sketched in Section 3.2). This should be validated and included in the repository under /schemas/
GitHub
. It will be used both as part of documentation and by the code (e.g., loaded by the orchestrator on startup to configure its limits).

Policy YAMLs: If certain policies are better expressed in YAML (for easier editing by non-devs), provide those. For example, a progression-policy.yaml listing unlock criteria (achievements, counts, etc.) and a tier-policy.yaml for resource constraints. These should mirror the JSON but in a human-editable format. The orchestrator could parse them or we could generate the JSON from them.

Code Stubs and Reference Implementations: Include skeleton code and pseudocode in the documentation that developers can use as a starting point. Concretely:

A stub for the main ExperienceOrchestrator class (methods for handling prompt, handling user state update, etc.).

Stubs for key components like CouncilEngine, ProgressionManager, ResonanceDetector (as we provided in section 3.3).

These can be placed in the repo under a code/WF-FND-005/reference/ directory for easy reference.

WebSocket Event Definitions: Update or provide the JSON schema for WebSocket messages if new event types (experience.*, reward.*) aren’t already covered. Possibly update WF-TECH-003-ws.json or include an extension that lists the new event types and their payload schema
GitHub
. This ensures front-end developers know the exact data format to expect for each event.

Test Cases Outline: A set of test case specifications (could be in Markdown, e.g. /tests/WF-FND-005/) describing how to test each major function:

Progression: Simulate scenarios to test level-up criteria (should include edge cases like just below threshold vs just above).

Real-time council: e.g. “Run a council with 2 models that produce X and Y outputs; expect events A, B, C in order, and check interference event triggers when outputs align.”

Performance test: “Simulate 100 tokens in quick succession and ensure orchestrator dispatch stays under 17ms per frame (monitor event time stamps).”

Tier test: “Mark user as low-tier and request a Level 5 task; ensure orchestrator either a) limits the models or b) produces a warning event and does not overload.”
These test specs can later be automated, but initially serve as a validation plan for QA.

User Interface Hooks (for UX specs): Although UI implementation belongs to UX docs, this spec should deliver a clear mapping of events to expected UI reactions. A table or list can be provided (perhaps in an Appendix or separate file) for quick reference, for example:

Event: experience.level_up – UI Reaction: Display level-up modal with “Level X Reached” and call UX-001 animation sequence.

Event: council.model_speak – UI Reaction: Append token text to model’s stream bubble; highlight model’s name.

Event: consciousness.pattern_detected – UI Reaction: If patterns payload includes a visual, overlay it (UX-006 guidelines for energy visuals).
This will directly feed into UX spec implementation to ensure nothing is missed.

Updated Glossary Section: An updated schemas/WF-FND-006-glossary.json (or a markdown delta) for any new terms introduced (e.g. “Experience Orchestrator”, “Resonance Field”) so that WF-FND-006 can be updated accordingly.

All diagrams should be provided in the unified format (Mermaid .mmd source as well as rendered images if needed), and all schemas should pass JSON Schema validation.

✅ Quality Validation Criteria

Success of the Experience Orchestrator is measured by both technical correctness and experiential outcomes. The following criteria must be met:

Correct Feature Gating: In testing, no level’s features appear early or remain locked after they should be available. For instance, during test simulation, the model selector UI elements must only activate at Level 2 and not before (verified via event logs and UI state)
Google Drive
Google Drive
. Similarly, attempts to use a higher-level feature via API or hacks (e.g. calling a council endpoint while user is Level 1) should be prevented by orchestrator checks.

Performance Under Load: The orchestrator consistently meets the frame budget. Profiling tests should show that orchestrator’s per-frame processing (excluding the actual model generation time which is out of band) stays under 16.67 ms on target hardware. If a burst of events is necessary (e.g. many tokens at once), the system may drop or batch events but must not stall. Automated load tests (e.g. WF-TECH-007’s load and visual fidelity tests) should pass, demonstrating smooth 60fps visuals even during multi-model output
GitHub
.

Event Integrity and Order: Every orchestrator output event must conform to the schema (correct type, all required fields present) and occur in a logical order. For example, in a council session, council.formed should arrive before any council.model_speak events, and council.synthesis at the end
Google Drive
. The message ordering mechanism of TECH-003 should be used or respected to guarantee this
Google Drive
Google Drive
. Testing with network latency simulations will ensure events are not jumbled or lost; our protocol guarantees (with acknowledgments on critical messages if needed) must hold.

Traceability Verification: We should be able to take any visual element or log event and trace it back to a source. This can be tested by enabling debug logs: the orchestrator could log (in dev mode) references for each event (e.g., “Lightning bolt event 0x123 derived from token #5 of model GPTQwen at 47ms”). QA can pick random events and verify the data lineage matches the log/trace. Also, the visual fidelity tests (comparing energy values to rendered output) should pass – e.g., if a test query produces a known token timing pattern, the resulting visual parameters (thickness, color) should match the expected mapping formula
Google Drive
. If any discrepancy is found (visual not reflecting data or data not used in visual), it’s a bug to fix.

Robust Recovery & No Dead-Ends: If an error occurs (a model fails to load or a Broker call times out), the orchestrator must handle it gracefully – e.g., by sending an informative event (error.model_failed or downgrading the experience) rather than freezing. Tests will simulate failures (like kill one model mid-council) and ensure the orchestrator still completes the cycle (maybe with a degraded result and a warning to user). No unhandled exceptions should propagate to the user; all should be caught and translated into meaningful feedback or silent failover.

Progression Balance Validation: Using analytic data or closed beta feedback, validate that the progression thresholds set result in the intended user experience distribution. Target: ~100% of engaged users reach Level 2, perhaps 50% reach Level 4, and 20% reach Level 5 under normal usage
Google Drive
. If metrics show too many or too few users progressing, adjust criteria. This is more of a design tuning but still part of quality – the orchestrator should log when users level up so we can gather stats.

Security & Privacy Compliance: A review per WF-TECH-005 (security) should confirm that the orchestrator does not introduce vulnerabilities. All external calls (like Broker) must go through secure channels, and no sensitive info is included in client events beyond what’s necessary. Also ensure that a malicious client can’t exploit orchestrator events – e.g., the WebSocket messages should be emitted only server-side; if a client tries to send a fake experience.level_up from their end, the server must ignore/disallow such actions (which should be the case, since only server orchestrator emits those). In other words, trust boundaries remain intact: clients can request actions (prompts, certain feature toggles) but cannot directly change state without orchestrator validation.

Alignment with Design Principles: A subjective but important criterion – does the orchestrated experience “feel” like the vision? For example, does the Lightning at Level 1 feel immediate and magical? Does the Council at Level 2 feel like a dynamic brainstorming? Do users indeed see the energy metaphor realized at each step? Beta testing and UX review will gauge this. If something feels off (like Level 3 feels too confusing, or Level 4 adaptation feels intrusive), we iterate on orchestrator behavior (maybe adjusting event timing or thresholds). Essentially, the user experience outcomes should match the narrative described in Vision (WF-FND-001) and any discrepancies noted should be addressed
GitHub
GitHub
.

We will formally validate many of these with a combination of automated tests and controlled user testing sessions. Only when all criteria are met will WF-FND-005 be considered fully implemented.

🔄 Post-Generation Protocol

After drafting and implementing this specification, a few follow-up steps are required to keep the WIRTHFORGE documentation and system aligned:

Glossary Updates: Review WF-FND-006 (Glossary) for any new terminology introduced here. Likely additions include:

Experience Orchestrator – define as the local runtime engine that coordinates multi-model experiences and user progression.

Resonance Field – refine the definition to reflect its meaning as an emergent pattern or persistent energy state created by orchestrated multi-model interaction.

Council (if not already defined) – multi-model parallel inference session, often at Level 2.

Adaptive Field – the system’s adaptive mode at Level 4, where it learns and optimizes based on user input.

Verify existing terms like Energy, Consciousness, Frame have usage consistent with this doc (e.g., if we mention 60Hz frame, ensure Glossary defines frame rate in context).
Prepare a glossary delta file listing these entries and their definitions, to be merged into WF-FND-006
GitHub
.

Dependency Graph and Index: Update the dependency graph in WF-META-001 if needed to reflect any changes. Originally, WF-FND-005 enabled WF-TECH-006; given our content, it also strongly enables all UX docs. We might add cross-links in the doc-index for traceability (even if not hard “requires”). Ensure the doc-index.json entry for WF-FND-005 is updated with the final title “Consciousness & Experience Orchestration” (replacing the placeholder “Module & Plugin Philosophy”) and that its requires and enables fields are accurate
GitHub
. If any new documents were implied (none specifically in this spec beyond what exists), note them. Bump the version of doc-index if needed.

Cascade to TECH docs: Coordinate with the authors of TECH-002, 003, 005, 006 for any necessary modifications:

TECH-002 (Local AI Integration): Ensure it covers parallel model execution and how multiple models can be loaded/invoked simultaneously. Possibly add a note or example about orchestrator’s calls to multiple models and any needed API support (like being able to stream outputs from multiple models concurrently). If any config limits (like ollama_max_loaded_models or ollama_num_parallel) are not yet documented there, include them
GitHub
GitHub
.

TECH-003 (WebSocket Protocol): Incorporate the new event types (experience.*, reward.*) into the official protocol spec. The schema snippet and channel definitions might need an update to include an experience category or clarify that these events go over the consciousness channel. Also verify that message examples cover multi-model council messages as we implemented (if the spec only had placeholders, replace with actual usage)
Google Drive
Google Drive
.

TECH-005 (Security & Privacy): Add any orchestrator-related considerations. For instance, mention that the Broker-Hybrid mode transmits prompts to a cloud service and how we mitigate risks (tokenization, user consent). Also, check if any mention of user data flows needs to include orchestrator (e.g., orchestrator writing user progress to DB, storing interaction logs – ensure those are accounted for in privacy policy and can be exported/deleted per user request).

TECH-006 (API & Integration): If external devs can trigger orchestrated sessions via an API, define those endpoints. Perhaps an endpoint to start a council or to retrieve a user’s capabilities. At minimum, ensure the API doc states that most heavy AI actions happen via orchestrator and not via direct API call (the API might just instruct “do X” and orchestrator does it). If integration with other apps is planned (like a plugin system), document how they can hook into events or progression (maybe via WebSocket subscription or a callback system).

Cascade to UX docs: All UX level specs (WF-UX-001 through 005, plus UX-006) should be checked against this orchestrator spec:

UX-001 (Level 1 UI) should reflect that only the basic UI elements are shown and possibly mention listening for experience.feature_unlocked events for anything new (though at level 1 likely none until level-up).

UX-002 (Level 2 UI) needs details on showing multiple model outputs; our spec’s events and council mechanism give the blueprint. We should supply the UX writer with the specifics of how streams and interference events work so they can describe the UI (e.g., how to visually represent interference).

UX-003 (Level 3 UI) – ensure it covers the node/architecture builder UI that corresponds to orchestrator’s capabilities (like available node types). Possibly provide them with the list of “features” that unlock at level 3 from the capabilities schema so they know what new UI controls to introduce (routers, combiners, etc.).

UX-004 (Level 4 UI) – align on how suggestions are presented, how user feedback (accept/modify/reject suggestions) is captured and sent back. This spec covered the collaborative loop
Google Drive
Google Drive
; UX needs to implement that loop visually and interactively.

UX-005 (Level 5 UI) – incorporate resonance visuals and any generative art modes. We described modes (mandala, symphony, fractal)
Google Drive
Google Drive
; the UX spec should detail the design of those visuals. Also, our event consciousness.born might correspond to a one-time special effect (UX should plan for it).

UX-006 (Unified Energy Visualization) – ensure that all visualizations used in levels 1-5 are indeed grounded in data we provide. Cross-check the data the orchestrator emits (like token timings, model IDs, pattern details) with what UX-006 expects to drive their Three.js or other engine. If any discrepancy (e.g., UX expected a field we don’t send), either adjust our events or have UX adapt. Both teams should particularly agree on coordinate systems for visual effects if needed (though likely the UI can decide visuals independently as long as data values are given).

Versioning: Once this document (WF-FND-005) is finalized, assign it a version number (starting at 1.0.0) and add a changelog entry under /changelogs/WF-FND-005.md noting its creation. Any subsequent changes must increment version per SemVer and detail what changed (to maintain consistency as per WF-META-001 guidelines
GitHub
GitHub
). Also, if this replaces or substantially changes content from an older document (the earlier “Module & Plugin Philosophy”), mark that appropriately (the old content was refocused into Module System WF-FND-007, so not much conflict).

Implementation Coordination: With the spec done, create tasks for developers:

Implement orchestrator core logic (could be split among team: one for council, one for progression, etc.).

Write the test cases as per deliverables and criteria.

Ensure front-end team is ready with WebSocket handling of new events.

Set up a beta testing plan for this orchestrated experience.

Following these post-generation steps ensures that the Consciousness & Experience Orchestrator is not just a document, but a living part of the WIRTHFORGE project – correctly integrated, understood by all stakeholders, and primed for iterative improvement. Once implemented, we will have a system where every flash of lightning, every ripple of interference, and every resonant chord in the UI is backed by real, orchestrated AI workings – fulfilling the vision of an AI platform that feels alive because it truly mirrors the computations beneath.
GitHub
GitHub