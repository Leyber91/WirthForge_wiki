WF-TECH-008 — Plugin / Module Architecture & Sandbox

📄 WF-TECH-008: Plugin / Module Architecture & Sandbox
🧬 Document DNA

Unique ID: WF-TECH-008

Category: Technical Architecture

Priority: P1 (Extensibility & Sandbox)

Development Phase: 3

Estimated Length: ~3500 words

Document Type: Technical Specification / Architecture Guide

🔗 Dependency Matrix
Required Before This:

WF-TECH-001 – System Runtime & Services (core architecture & plugin entry points)

WF-FND-003 – 5‑Layer Architecture (enforces layer boundaries for plugin seams)

WF-FND-006 – Governance & Evolution (sandbox policies, versioning controls)

Enables After This:

WF-UX-002 – Level 2: Parallel Streams (council UI extended via plugins)

WF-UX-003 – Level 3: Structured Architectures (builder interfaces via modules)

WF-UX-004 – Level 4: Adaptive Fields (adaptive UI components via plugins)

WF-UX-005 – Level 5: Resonance Fields (new visualization modules for emergence)

WF-FUT-004 – API Marketplace (plugin discovery & distribution ecosystem)

Cross-References:

WF-TECH-006 – Security & Privacy (threat model, sandbox permission system)

WF-FND-007 – Module System Philosophy (foundational module concepts, now consolidated here)

🎯 Core Objective

Establish a secure plugin/module system that allows WIRTHFORGE to be extended with new capabilities while rigorously safeguarding the local-core security model and ensuring seamless integration with the web UI. This specification defines a sandboxed plugin architecture with clear extension points and governance controls, so developers (both internal and community) can enhance functionality without compromising performance or violating the strict layer boundaries of the system. The end result is a thriving ecosystem of plugins that enrich the user experience in a controlled, auditable manner.

📚 Knowledge Integration Checklist

 Plugin Manifest & Capabilities – Define a standard manifest format (plugin.yaml) with metadata and capability descriptors
Google Drive
Google Drive
.

 Sandbox Enforcement – Implement sandbox policy mechanisms to isolate plugin execution (process isolation, no unsafe syscalls)
Google Drive
Google Drive
.

 Resource Limits – Enforce per-plugin resource quotas (memory, CPU time, energy usage) and automatic termination if exceeded
Google Drive
.

 Web UI Integration – Specify integration patterns for plugins to extend the UI (panels, menu items, notifications) via safe APIs
Google Drive
Google Drive
.

 Lifecycle & Loading – Document plugin discovery, loading, and lifecycle (installation, initialization, execution, update, removal) with diagrams or sequence descriptions.

 Sample Specifications – Provide example plugin.yaml manifest and JSON schema snippets for permissions and capabilities.

 Governance Workflow – Define promotion steps for moving a plugin from sandbox to trusted/core status (review, signing, versioning).

 Validation & Testing – Outline security isolation tests (attempted escapes, malicious behavior) and validation processes to certify plugins as safe.

 Marketplace Interface – Prepare for a future plugin marketplace: submission pipeline, plugin package format, update/rollback mechanisms, and discovery UI
Google Drive
Google Drive
.

 Developer Experience – Deliver a comprehensive Plugin Developer SDK with documentation, CLI tools for scaffolding and publishing, debugging aids, and profiling tools
Google Drive
Google Drive
.

📝 Content Architecture
Section 1: Plugin System Philosophy (500 words)

Purpose: Establish the guiding philosophy and principles behind the plugin/module system and why it’s critical to WIRTHFORGE’s extensibility. This section connects the concept of plugins to WIRTHFORGE’s vision of a living, evolving consciousness platform.

 

Key Points:

Extensibility as Evolution – The platform treats plugins as consciousness extensions, akin to new “neurons” that can enhance or alter the system’s behavior (analytics, visuals, integrations). Community contributions are embraced as a source of innovation.

Security & Trust – Extensibility must not compromise the local-core tenet. Every plugin runs with zero trust by default, confined by strict sandbox rules so that the core experience remains safe and stable.

Performance Preservation – Plugins should never break the magic 60 FPS experience. Isolation and resource caps ensure a misbehaving plugin cannot lag or crash the real-time loop.

Governed Innovation – The system enables safe experimentation: new ideas can be tried in sandbox mode and only promoted to core after proving they align with the platform’s principles (per FND‑006 governance).

Plugin Principles: The table below summarizes the core beliefs, plugin categories, and design principles guiding the module system
Google Drive
:

plugin_philosophy:
  core_beliefs:
    consciousness_enhancement: "Plugins add new consciousness capabilities"
    community_innovation: "The best ideas can come from users"
    safe_experimentation: "Sandboxing enables freedom without risk"
    performance_guaranteed: "Plugins must not break the 60Hz magic"
  plugin_types:
    consciousness_modules: "Extend or enhance the AI's cognition/analysis"
    energy_transformers: "Custom energy or data processing components"
    visualization_engines: "New ways to visualize or manifest consciousness"
    integration_bridges: "Connect WIRTHFORGE to external systems or data"
  design_principles:
    simple_api: "Straightforward SDK makes first plugins easy"
    powerful_capabilities: "Rich API surface, minimal artificial limits"
    secure_by_default: "Everything runs in a sandbox by default"
    observable_behavior: "All plugin actions are logged and auditable"


These principles ensure that while WIRTHFORGE modules are “living components” of the system (not just add-ons), they operate within a clear framework that preserves system coherence and safety
Google Drive
Google Drive
. In essence, the plugin architecture seeks to empower limitless extensibility without sacrificing the core values of local execution, real-time responsiveness, and transparency.

Section 2: Plugin Architecture Overview (800 words)

Purpose: Provide a technical overview of the plugin/module system’s architecture. This includes the structure of a plugin, how plugins are loaded and managed by the host application, and how the sandbox and integration points are organized. The aim is to show the big picture of how plugins fit into the existing 5-layer system and how the framework enforces boundaries and policies.

 

Architecture Highlights:

Plugin Package – Each plugin is packaged with a Manifest, plugin code (one or more modules), optional assets (e.g. UI components), and a digital signature for integrity
Google Drive
Google Drive
.

Lifecycle Stages – The plugin system defines clear stages: discovery (finding installed plugins), validation (checking manifest & signature), installation (registering the plugin in the system), initialization (loading the code in a sandbox), execution (running plugin logic during operation), and uninstallation (removing plugin cleanly)
Google Drive
.

Host Components – The core application provides a Plugin Host that manages plugins. Key components include a PluginLoader (coordinates loading/registration), a SecuritySandbox (isolates plugin execution), a PluginAPIBridge (exposes controlled APIs to the plugin), a performance monitor, and a data store for any persistent plugin state
Google Drive
.

Layered Integration – Thanks to the FND‑003 five-layer architecture, plugins can only interact with the system through well-defined seams. For example, a plugin providing a new visualization operates at the UI layer (L5) and interacts with lower layers via events/APIs, whereas a plugin adding an AI analysis module interfaces at the Orchestration layer (L3) via the provided hooks. No plugin can violate layer boundaries (e.g., directly manipulating the model layer) – it must use the sanctioned interfaces at its layer boundary.

The simplified TypeScript interface below describes the Plugin Architecture structure within the system
Google Drive
Google Drive
:

interface PluginArchitecture {
  // Plugin Definition package
  plugin: {
    manifest: PluginManifest;      // Metadata & declarations (see Section 3)
    code: PluginCode;              // Executable plugin logic (compiled)
    assets: PluginAssets;          // UI components or other assets
    signature: DigitalSignature;   // Verification signature for integrity
  };

  // Plugin Lifecycle stages
  lifecycle: {
    discovery: "Scan local plugins folder or marketplace listings";
    validation: "Verify manifest schema and signature authenticity";
    installation: "Install or enable plugin in the system registry";
    initialization: "Load plugin code into sandbox and initialize";
    execution: "Run plugin code (event-driven or via API calls)";
    termination: "Gracefully shut down plugin operations";
    uninstallation: "Remove plugin and clean up all resources";
  };

  // Core Plugin Host components
  host: {
    loader: PluginLoader;         // Handles finding and loading plugins
    sandbox: SecuritySandbox;     // Sandboxed execution environment
    api: PluginAPIBridge;         // Bridge exposing limited system APIs to plugin
    monitor: PerformanceMonitor;  // Tracks plugin resource usage & performance
    store: PluginDataStore;       // Persistence for plugin-specific data (if allowed)
  };
}


In practice, when WIRTHFORGE starts up, the PluginLoader scans a designated directory (and, in the future, queries an online marketplace) for available plugin packages
Google Drive
. Each plugin’s manifest is validated against the expected schema and the plugin’s digital signature is checked to ensure the code hasn’t been tampered with
Google Drive
. Only then is the plugin initialized: its code is loaded in an isolated process (see Sandbox in Section 5) and it’s registered in the system with a controlled API interface. The plugin host keeps track of all loaded plugins in memory, along with their sandbox processes and any runtime state
Google Drive
Google Drive
.

 

Crucially, this architecture cleanly separates concerns: the core system remains in control (via the host and API bridge), and plugins operate as add-ons that can be enabled or disabled without affecting core stability. Extension points are consciously injected at predefined integration seams – e.g. events the plugin can listen to or UI component slots it can populate – rather than letting plugins arbitrarily hook into internal functions. This upholds the anti-pattern rules from FND‑003 by preventing tight coupling or unauthorized data flows across layers. If a plugin tries to do something outside its allowed scope, the sandbox and permission system (Section 5) will block it, preserving the integrity of boundaries established by the five-layer architecture.

 

Finally, the lifecycle management includes robust support for updates and removal. When a plugin is updated (either by replacing the files locally or via a marketplace update), the system will validate the new version and can perform a seamless restart of that plugin’s sandbox. Versioning follows Semantic Versioning guidelines per governance (Major/Minor/Patch as defined in FND‑006) to ensure compatibility. If an updated plugin fails validation or causes errors, the host can roll back to the previous version or keep the plugin disabled, ensuring a faulty extension doesn’t degrade the user experience. All these measures align with the “evolution with safety” mandate of FND‑006, turning the abstract governance sandbox concept into a concrete developer API and runtime.

Section 3: Plugin Manifest & Capabilities (600 words)

Purpose: Define the plugin manifest format and how it describes a plugin’s identity, capabilities, and requirements. The manifest is the contract between a plugin and the host system, specifying what the plugin can do and what resources it needs. This section also covers the schema for capabilities and permissions, which together establish the security and governance boundary for each plugin.

 

Every plugin must include a manifest file (e.g. plugin.yaml) at its root. This manifest provides metadata (like name, version, author), declares the plugin’s type and supported WIRTHFORGE API version, and enumerates the plugin’s capabilities, permissions, and resource limits. Below is an example manifest for a hypothetical plugin called “Consciousness Harmonizer” in YAML format, illustrating the key fields
Google Drive
Google Drive
:

id: consciousness-harmonizer
name: Consciousness Harmonizer
version: "1.0.0"
author:
  name: Forge Master
  email: forge@example.com
  wirthforge_id: user_abc123
description: Enhances consciousness emergence through harmonic analysis
type: consciousness_module
api_version: "1.0"
permissions:
  - consciousness.read
  - consciousness.analyze
  - energy.read
  - ui.display_notification
resources:
  memory_limit: "100MB"
  cpu_limit: "25%"
  energy_limit: "100 EU/minute"
entry_points:
  main: dist/index.js       # main plugin code entry
  worker: dist/worker.js    # optional background thread/worker
  ui: dist/ui.js            # optional UI component script
dependencies:
  wirthforge-sdk: "^1.0.0"
capabilities:
  consciousness_analysis: true
  energy_transformation: true
  visualization: true
  background_processing: false


Manifest Structure: In the above example:

Identity: The id must be unique; name is human-readable. version uses SemVer. The author block tracks who created it (and could link to a WIRTHFORGE user ID). A short description explains the plugin’s purpose.

Type & Compatibility: type classifies the plugin (e.g. consciousness_module, visualizer, etc.), and api_version indicates which version of the WIRTHFORGE plugin API it targets. This allows the host to enforce compatibility if the core API changes.

Permissions: A list of fine-grained permission strings that the plugin requests. These are in the form "resource.action" (for example, consciousness.read or ui.display_notification), and they gate what the plugin is allowed to do at runtime
Google Drive
Google Drive
. The host’s Permission Manager will validate these against an allowed list and enforce checks whenever the plugin attempts a privileged action
Google Drive
Google Drive
. For instance, a plugin without energy.write permission would be blocked from calling any API that generates or alters Energy in the system.

Resources: This section declares the resource limits or requirements. In the example, the plugin declares it should run with at most 100 MB of memory, use no more than 25% of CPU, and consume at most 100 Energy Units per minute. These limits feed into the sandbox enforcement (Section 5), where they are actually applied to ensure one plugin cannot starve the system
Google Drive
. The host may also refuse to load a plugin that requests too high a resource budget.

Entry Points: Defines how the plugin’s code is structured. main is the primary entry script/module executed in the plugin sandbox. There could be additional specialized entry points: e.g. a worker for background processing, or a ui script that gets injected into the web UI context for rendering custom components. The system will load these appropriately (for example, a UI script might be loaded in the browser or UI thread, whereas main/worker run in the isolated core process).

Dependencies: Lists any external libraries or SDK versions the plugin requires. In this case, it depends on the wirthforge-sdk (the official plugin SDK package) version ^1.0.0. The host or build process can ensure these dependencies are satisfied or packaged.

Capabilities: A declarative list of capability flags that describe what the plugin intends to do. This complements the low-level permission list by providing a high-level descriptor of functionality. For example, consciousness_analysis: true means the plugin analyzes consciousness data (likely subscribing to certain events or using certain APIs), visualization: true indicates it provides a UI visualization, etc. These capability flags help the system (and user) understand the plugin’s role at a glance. They might also control which events or data the plugin is allowed to receive. For instance, a plugin with consciousness_analysis capability might be allowed to receive real-time consciousness state events, whereas one without it wouldn’t. The manifest’s capabilities section is validated against a known set of keys and must conform to the schema (booleans for each known capability, no unknown keys) – see JSON schema excerpt below.

Capabilities & Permissions Schema: To ensure consistency, the plugin manifest format is formalized in JSON Schema (omitted for brevity). As an illustration, the capabilities section is defined roughly as:

"capabilities": {
  "type": "object",
  "properties": {
    "consciousness_analysis":   { "type": "boolean" },
    "energy_transformation":   { "type": "boolean" },
    "visualization":           { "type": "boolean" },
    "background_processing":   { "type": "boolean" }
  },
  "additionalProperties": false
}


Likewise, permissions entries are checked to match known patterns (e.g., resource.action strings) corresponding to the available API surface. The PluginPermissionManager inside the host uses this to check any action a plugin attempts. For example, if a plugin tries to call an action, the manager will form the "resource.action" string and verify the plugin was granted that in its manifest before allowing the call
Google Drive
Google Drive
. It also tracks usage for things like Energy consumption: if the plugin exceeds its declared energy_limit, the action will be blocked or an exception raised
Google Drive
.

 

In summary, the manifest is both a declaration and a contract: it declares what the plugin is and can do, and the system contractually uses it to enforce governance. This approach echoes the “schema discipline” from FND‑006 – all plugin interactions are predictable and versioned via the manifest schema. If a plugin does not stick to what it declared (for example, tries to access an API without a permission), the system will detect and prevent that action, logging it for auditing purposes. This mechanism is fundamental to maintaining trust in an open extensibility model.

Section 4: Plugin APIs and UI Integration (700 words)

Purpose: Describe how plugins actually interact with the WIRTHFORGE system at runtime, particularly how they integrate with the Web UI and core services through defined APIs. We detail the Plugin API provided to plugins, including UI extension points, and illustrate patterns for both UI-facing plugins and core (non-visual) modules. The goal is to show how plugins can add UI panels or perform background tasks without violating the separation of concerns.

 

When a plugin is loaded, it is given access to a Wirthforge Plugin API object (often via an import from the wirthforge-sdk). This API is a facade that exposes certain allowed capabilities of the system. Internally, calls made on this API are funneled through the PluginAPIBridge to the core application, where they are validated (permissions checked, etc.) and then executed in the main process or UI context as appropriate. The plugin code itself never directly touches internal objects; it can only invoke methods on this API object, which acts as a controlled gateway.

 

Plugin API Surface: The WIRTHFORGE Plugin API is organized into several domains for clarity
Google Drive
Google Drive
:

Consciousness API – Allows the plugin to read the current consciousness state, subscribe to changes, and contribute to consciousness emergence events (if permitted). For example, a plugin can get the current state or submit an analysis result that could influence the system’s emergent behavior (subject to orchestrator rules).

Energy API – Allows reading current energy levels or triggering energy generation/transformation (again within limits). This could be used by plugins that simulate or inject new energy pulses or modify energy fields, with all usage counted against the plugin’s energy budget.

UI API – Enables integration with the web UI. Plugins can display notifications to the user, register new UI components (such as panels, dialogs, visual widgets), or add menu items/actions to the UI
Google Drive
. This is key for UI-facing plugins that extend the interface. The UI API ensures any plugin UI elements are rendered through the main application’s React context (or similar), maintaining a consistent look & feel and preventing direct DOM manipulation or insecure operations.

Storage API – Provides access to a small key-value storage scoped to the plugin. Plugins can persist user preferences or state here (if allowed), which the system may store in a sandboxed database or in memory. This prevents plugins from writing to the file system arbitrarily; they get a controlled persistence mechanism.

Events API – Allows plugins to publish or subscribe to custom events and listen to certain system events. The system may emit events like onConsciousnessEmerged or onEnergyGenerated that plugins can handle
Google Drive
. Plugins can also emit their own events (for cross-plugin communication or for the host to possibly listen to). Notably, if multiple plugins want to cooperate, they cannot directly call each other’s functions, but they can communicate via the event bus: one plugin could emit an event that another (if authorized) can subscribe to. This ensures loose coupling – all cross-plugin coordination happens via orchestrated events or through the orchestrator’s APIs, rather than direct references, preserving sandbox isolation.

Below is a snippet focusing on the UI portion of the Plugin API (for illustration), showing how a plugin can interact with the user interface
Google Drive
:

// Excerpt from WirthforgePluginAPI interface (UI-related methods)
ui: {
  /** Display a user notification (toast) */
  showNotification(message: string, options?: NotificationOptions): void;
  /** Register a custom UI component/panel */
  registerComponent(component: PluginUIComponent): ComponentHandle;
  /** Add an item to an existing menu (e.g., toolbar or context menu) */
  addMenuItem(menu: MenuLocation, item: MenuItem): MenuHandle;
};


Using these UI APIs, a plugin could, for example, add a new panel to the interface. In the Consciousness Harmonizer example, the plugin on initialization might call this.api.ui.registerComponent({ id: 'harmonic-visualizer', ... }) to insert a custom panel into the UI
Google Drive
. It could also show real-time notifications (showNotification) when certain events occur, such as detecting a special harmonic resonance (as illustrated in the example plugin’s code)
Google Drive
Google Drive
.

 

Under the hood, when a plugin registers a UI component, the core application would allocate a placeholder in the React component tree (or a dedicated plugin panel area) and render the plugin’s component (likely a React component bundled in the plugin’s dist/ui.js) inside that sandbox. The plugin’s UI code might be executed in an isolated iframe or a shadow DOM context to prevent any malicious HTML/JS from affecting the rest of the app, yet still allow integration via the official UI API.

 

For core-only plugins (non-visual), they would simply not use the UI API. Their capabilities might be limited to data processing – for example, a plugin that adds a new type of analysis on the AI’s output. Such a plugin might use the Consciousness API to subscribe to the stream of consciousness events and perform additional analysis in the background, then perhaps use the Events API to emit a custom event or trigger a subtle influence in the orchestrator. An important design decision is that no plugin runs automatically on startup unless installed and enabled by the user (maintaining the “no surprises” principle). The UI will likely provide a plugin management screen where users can enable/disable plugins and possibly adjust permissions.

 

API Bridge and Safety: The PluginAPIBridge on the host side is responsible for implementing these API calls. For each method, it will:

Check that the calling plugin’s ID is allowed to use that method (via permission verification, e.g. if showNotification requires ui.display_notification permission, ensure it was granted in manifest)
Google Drive
.

Possibly sanitize inputs (e.g., limit the length of message strings for notifications to prevent spam or UI breakage).

Execute the corresponding action in the main application context. For UI actions, this might involve calling an internal function to actually display the notification or add the menu item. For data queries, it might fetch from core state.

Return results or acknowledgments to the plugin. If a plugin tries something disallowed, the API will throw an error back to the plugin (and log it).

Because of this controlled mediation, even if a plugin’s code is malicious or bug-ridden, the damage it can do is contained. It cannot directly manipulate the DOM, cannot call random internal functions, and cannot exceed its resource or permission bounds. This aligns with the “secure by default” principle: the plugin API is essentially a whitelist of safe operations. Everything else is simply not exposed to the plugin environment.

 

Finally, note that the plugin API itself can be polyglot or multi-language. While the core SDK and examples might be in TypeScript/JavaScript (since the UI is web-based and many plugins will likely be written in JS/Python), the architecture is open to multi-language plugins. For instance, a Python plugin could be supported by providing a Python binding to the same API (perhaps via a gRPC or IPC mechanism under the hood). The design supports multiple languages as long as they can run in a separate process and communicate with the host via the API bridge protocol (which could be JSON messages, function calls via shared memory, etc.). In early versions, we expect most plugins to be JavaScript/TypeScript (for simplicity in sandboxing via Node or V8) or Python. Future expansions could allow WebAssembly plugins for safe, high-performance extensions in languages like Rust.

Section 5: Security Sandbox & Policy Enforcement (800 words)

Purpose: Detail the security sandbox mechanism that ensures plugins run in isolation, protecting the core application from crashes or malicious behavior. This section covers how the sandbox is implemented (process isolation, resource limiting, syscalls restrictions) and the governance policies that define what a plugin can/cannot do. It also addresses how the system tests and validates the sandbox’s effectiveness.

 

All plugins execute in a sandboxed environment – essentially a restricted subprocess – rather than in the main application process. This design follows the security principle of least privilege: the plugin gets only the minimum access necessary to perform its declared functions. WIRTHFORGE’s approach draws inspiration from browser sandboxes and OS-level jails.

 

Sandbox Implementation: When a plugin is loaded, the host spawns a separate process for it (this could be a separate Python process, Node.js instance, or a lightweight container). The SecuritySandbox class manages this process. Key aspects include:

Memory Limits: Using OS facilities, the sandbox process is limited to the memory specified in the manifest. For example, on Unix the code uses resource.setrlimit(resource.RLIMIT_AS, ...) to cap the address space
Google Drive
. If the plugin tries to allocate more, the OS will deny it or kill the process.

CPU Usage: The process priority can be lowered (e.g., using os.nice() to give it a lower CPU priority
Google Drive
) so that even if it tries to use 100% CPU, the OS will favor the main process. Further, the orchestrator can monitor CPU and if a plugin consistently uses more than its share (25% in our example), it can be throttled or paused.

File I/O and Network: By default, the plugin process has no access to the network (no internet access unless explicitly allowed in future scenarios). File system writes are restricted: the plugin might only see a temp directory or a specific sandbox folder if needed for caching, but it cannot write to user files or system directories. This can be achieved by OS sandboxing (chroot/jail or simply by convention and checks in the API – the Plugin API’s storage functions would limit paths to a sandbox directory). If the plugin tries to call system APIs to open files or sockets, those calls can be intercepted or will fail due to lack of permissions.

No Arbitrary Code Access: In the sandbox process, we replace the global environment with a restricted one. For example, in a Python sandbox, before executing plugin code, the host will wipe out dangerous built-ins. The sandbox might create a limited __builtins__ dictionary that includes only safe functions (e.g. basic len, str, math functions) and remove import capability
Google Drive
Google Drive
. The plugin cannot import arbitrary modules unless explicitly allowed. In a JavaScript sandbox, a similar approach would be taken: e.g., running the code in a VM context with no access to Node’s fs or net modules unless permitted. The code snippet below demonstrates part of the sandbox execution logic
Google Drive
Google Drive
:

class SecuritySandbox:
    def _sandboxed_execution(self, code: str, method: str, args: dict, queue: Queue):
        try:
            # Apply resource limits to this process
            resource.setrlimit(resource.RLIMIT_AS, (self.limits['memory_limit'],)*2)
            os.nice(10)  # lower CPU priority
            resource.setrlimit(resource.RLIMIT_NOFILE, (100, 100))  # limit open files

            # Create a restricted global environment
            safe_builtins = {
                'len': len, 'range': range, 'str': str, 'int': int, 'print': self._safe_print,
                'True': True, 'False': False, 'None': None, 'Exception': Exception
            }
            def no_import(*args, **kwargs): 
                raise SecurityError("Imports not allowed")
            restricted_globals = {
                '__builtins__': safe_builtins,
                '__import__': no_import,
                'wirthforge': self._create_plugin_api()  # inject limited API bridge
            }

            exec(code, restricted_globals)  # Execute plugin code in this sandbox
            # (After exec, the plugin's methods/classes are in restricted_globals)
            if method in restricted_globals:
                result = restricted_globals[method](**args)  # call the requested function
                queue.put(result)  # return result to host
            else:
                queue.put(MethodNotFoundError(method))
        except Exception as e:
            queue.put(e)


In this pseudo-code, you can see that before executing the plugin’s code, we set memory limits and file descriptor limits, adjust CPU priority, and then construct a restricted_globals dict. We allow only very basic built-in functions and override the import system to prevent the plugin from loading arbitrary modules. The plugin’s code is executed via exec within this confined environment. The only gateway to the outside world here is the 'wirthforge' object we inject, which is the plugin API instance tied to this plugin. This means the plugin can only call out through the methods we explicitly provide.

Communication: The sandbox uses an IPC mechanism (in this example, a multiprocessing Queue) to send results or data back to the host
Google Drive
Google Drive
. This ensures that even returning data is controlled (large data could be chunked or limited). The host could also kill the plugin process if it becomes unresponsive or runs too long.

Sandbox Policies: Beyond the low-level technical isolation, WIRTHFORGE defines clear policies (from FND‑006 governance) about what an experimental sandbox can do. Key policy rules include:

Read-Only Access to Core Data: Plugins can subscribe to real-time data streams (events, state) and read necessary info, but by default they cannot write or commit changes to the core’s persistent state. Any influence a plugin has (like contributing an emergence signal) is mediated and non-destructive. They cannot directly alter user settings, saved data, or models.

No Persistent Side-Effects: Unless a plugin is promoted to core, it should not leave lasting effects. This means no writing to user profiles or permanent achievement/progression data. If a plugin unlocks something or generates data, that data remains in the sandbox or a transient state unless explicitly saved by user action. This guarantees that trying a plugin won’t corrupt or alter the user’s main journey.

Resource Constraints: Each plugin is constrained in memory and execution time per frame. If a plugin exceeds, for example, its 5ms budget in the 16.7ms frame (60Hz cycle), the system can throttle it or drop its tasks. Similarly, if it tries to allocate excessive memory or consume too much energy (exceeding the energy_limit), the host will terminate or suspend it
Google Drive
Google Drive
. These limits ensure the main experience never lags due to a background plugin.

No External Network (By Default): Sandbox plugins are treated as untrusted code. They are blocked from making network calls unless explicitly allowed for a specific plugin that might need it (and even then, likely constrained to specific domains or via proxy). In general, a plugin should not leak data externally or fetch external resources without going through a controlled gateway.

API-Only Interaction: A plugin cannot invoke OS shell commands, cannot spawn arbitrary new processes (the sandbox may prevent it from spawning children), and cannot interact with hardware devices. It lives in a box. The only way it interacts with WIRTHFORGE or the system is via the provided API calls. This dramatically narrows the attack surface – effectively, if an operation isn’t provided in WirthforgePluginAPI, the plugin can’t do it.

These policies collectively enforce that plugins are “second-class citizens” until proven safe. Users and developers can experiment freely, but the core system remains safe and in control.

 

Security Testing & Validation: As part of development, WIRTHFORGE will include a battery of tests to validate the sandbox. This includes:

Attempting known attack vectors from within a plugin (e.g., try to open a socket, read a file, escalate privileges) to ensure the sandbox catches them. Each release of the platform will run these tests to prevent regressions in sandbox security.

Frame-time tests: Run plugins that intentionally busy-wait or consume CPU to verify the frame loop still meets deadlines (the plugin should get preempted or its work deferred).

Memory leak tests: Load plugins that allocate increasing memory to ensure the setrlimit kicks in and the process is killed or stopped at the limit.

Energy abuse tests: Simulate a plugin calling energy generation in a loop to ensure the energy budget enforcement triggers (like the harness test expecting an 'Energy limit exceeded' error)
Google Drive
.

API misuse tests: Try calling disallowed API methods from a plugin (which should result in an exception or no-op), verifying the Permission Manager logic.

The development of the sandbox will follow a rigorous auditing process (aligned with FND‑006’s emphasis on audits and metrics). Additionally, the system will maintain audit logs of plugin activity: for example, any time a plugin is loaded, or attempts a restricted operation, it’s logged to an audit file or database. This ensures transparency and helps debug if something goes wrong.

 

Promotion to Trusted: Eventually, a plugin that proves safe and useful can be “promoted” out of the experimental sandbox. In practical terms, this could mean including it as a built-in feature or giving it elevated privileges. The governance model defines a promotion workflow:

Sandbox testing – Initially, the module runs fully sandboxed and invisible to most users (or only available in a developer mode).

Staging – It might then be surfaced in a beta channel or behind a flag for more users to try, still isolated.

Limited Rollout – If deemed valuable, it could be signed and distributed via the official plugin marketplace as a “verified” plugin (users can opt to install it, knowing it passed security checks).

Core Integration – Finally, the best plugins might be merged into the core codebase in a future update (with full QA and removing sandbox restrictions because it’s now part of core). Very few will reach this stage, but it’s how the platform can evolve with community contributions.

During promotion, the plugin goes through code review and security auditing by the WIRTHFORGE team or community. The digital signature mechanism plays a role here: a promoted plugin may receive an official signature or higher trust level that the host recognizes, allowing it possibly broader access (for instance, maybe a promoted plugin is allowed to use a certain internal API not available to normal plugins). However, even promoted plugins should still respect layer boundaries and user control – the difference is mainly in user trust and distribution scope.

 

In summary, the sandbox architecture and policies ensure that “any new feature remains a safe experiment until proven”. The system can harness the creativity of an open plugin ecosystem without fearing the chaos such openness typically brings. Governance is baked in at the technical level: every plugin action is bounded, checked, and logged.

Section 6: Developer Experience – SDK & Tools (500 words)

Purpose: Describe the tools and support provided to developers for creating, testing, and publishing plugins. A great plugin system is not just about runtime, but also about the developer experience (DX) – making it easy and enjoyable to build modules that extend WIRTHFORGE. This section covers the official Plugin SDK, CLI utilities, debugging/profiling aids, and documentation.

 

To encourage a vibrant plugin ecosystem, WIRTHFORGE offers a comprehensive Plugin Developer Kit. The main components of the developer experience are:

Plugin SDK Libraries: A set of libraries (for JavaScript/TypeScript, Python, etc.) that include type definitions, helper functions, and client stubs for the WIRTHFORGE plugin API. For example, @wirthforge/plugin-sdk on NPM provides TypeScript interfaces (like the WirthforgePlugin base class and API interfaces seen in Section 4) so that developers get intellisense and compile-time checking for their plugin code. Similar packages or documentation exist for other languages if supported.

Command-Line Interface (CLI): A wirthforge-plugin CLI tool helps manage the plugin development lifecycle. Developers can use it to scaffold new plugins, run a development server, run tests, build release packages, and publish to the marketplace. This dramatically streamlines setup and ensures consistency in plugin structure.

Testing Harness: An official testing framework (e.g., PluginTestHarness) allows plugin developers to simulate the WIRTHFORGE environment and write unit/integration tests for their plugin. This harness can mock the consciousness and energy context, emit fake events, and verify the plugin’s responses without needing the full app running
Google Drive
. It’s essential for ensuring quality and catching issues early.

Debugging & Profiling Tools: The platform will include debugging support, such as verbose logging for plugin actions (when enabled by a developer mode), and profiling tools to measure a plugin’s performance impact. For instance, a developer can run their plugin with a flag to see how much CPU time each callback takes, or if any resource limit warnings are triggered. In dev mode, the sandbox might be slightly relaxed to allow step debugging or more detailed error traces for the developer.

Plugin CLI Workflow: The CLI tool wirthforge-plugin covers common tasks. For example, creating a new plugin project is as simple as running one command, which sets up a boilerplate with the proper manifest and file structure. Below is a demonstration of using the CLI for typical operations
Google Drive
Google Drive
:

# Create a new plugin project (scaffold manifest, src, etc.)
wirthforge-plugin create consciousness-enhancer --type consciousness_module --author "Your Name"

# (The above generates a folder 'consciousness-enhancer/' with a manifest and example code)

# Run the plugin in development mode (with hot-reloading for quick iteration)
wirthforge-plugin dev

# Execute the plugin's test suite using the harness
wirthforge-plugin test

# Build the plugin for distribution (e.g., bundle code, minify, prepare package)
wirthforge-plugin build

# Digitally sign the plugin package (for trust verification)
wirthforge-plugin sign --key path/to/developer.key

# Publish the plugin to the marketplace (if available), or output a package file
wirthforge-plugin publish


This workflow supports developers from start to finish: create → develop → test → build → sign → publish. During development (dev mode), the CLI likely runs a local server or attaches the plugin to a running WIRTHFORGE instance for live testing, perhaps with live-reload so developers can see changes immediately in the app. The signing step integrates with the governance model – it might involve getting a certificate from WIRTHFORGE’s developer portal. Signing ensures that when the plugin is distributed, users (and the host system) can verify it hasn’t been altered and know which developer published it
Google Drive
.

 

Testing Framework: The importance of testing is emphasized. The earlier example tests (not shown in full here) demonstrate usage of PluginTestHarness to simulate conditions like a particular energy field, then calling plugin methods and asserting expected outcomes (like ensuring a plugin does not exceed energy limits)
Google Drive
Google Drive
. The harness provides mock data and intercepts plugin API calls so that tests can verify, for instance, “did the plugin call contributeEmergence with the right data when energy was high?” or “does the plugin throw an error when exceeding its quota?” This kind of automated testing aligns with TECH‑007 (Testing & QA) principles, turning the foundations and rules we’ve set into actual testable conditions.

 

Developer Documentation: Alongside code tools, WIRTHFORGE provides extensive docs and examples. There will be a Plugin Development Guide (of which this spec will form the backbone), an API reference detailing every available API call and event, and security guidelines that developers must follow to get their plugin approved. Example plugins (like the Emotion Detector or Music Consciousness Bridge concepts) serve as learning tools, illustrating best practices in code
Google Drive
Google Drive
. The platform may also offer a “Hello World” plugin tutorial that walks through writing a simple plugin (for instance, a plugin that adds a new command to WIRTHFORGE’s UI which when clicked prints a fun message and consumes a little energy).

 

Finally, community support is considered part of the DX: a repository or portal where developers can share plugins, get feedback, and help each other, will bolster the ecosystem. Though outside the scope of this spec, it’s worth noting that a healthy plugin system relies on a community of creators – thus the tools must reduce friction as much as possible. By providing an official SDK and CLI that encapsulate the complexity of sandboxing and packaging, WIRTHFORGE lets developers focus on creativity (the “what” of their plugin) rather than the boilerplate or safety mechanisms (the “how”, which we handle for them).

Section 7: Plugin Marketplace & Distribution (400 words)

Purpose: Outline how plugins will be distributed and managed at scale via a Plugin Marketplace. This section describes the infrastructure for submitting plugins, the review and security checks (promotion workflow) prior to making a plugin available to the public, and how users discover, install, and update plugins. It also covers the plugin package format and versioning/update strategy, including rollback considerations for faulty updates.

 

While initially plugins can be side-loaded by developers, the long-term plan is an integrated marketplace where users can easily browse and install extensions. The marketplace design centers on trust and convenience:

marketplace_system:
  submission:
    - Automated security scan (static code analysis, lint for dangerous patterns)
    - Code quality check (ensure it adheres to guidelines)
    - Performance benchmarks (test it under load for frame impact)
    - Community review period (crowdsource feedback before full release)
  distribution:
    - Signed plugin packages (ensure authenticity of plugins)
    - Version management (each update tracked, previous versions available if needed)
    - Dependency resolution (handle plugins requiring specific SDK or other plugins)
    - Update notifications (users alerted to new versions, one-click update)
  economics:
    - Free and paid plugins (support a marketplace economy)
    - Revenue sharing (e.g., 70/30 split for paid plugins):contentReference[oaicite:89]{index=89}
    - Energy-based pricing option (plugins could be bought with in-app “energy” points)
    - Subscription support (for ongoing content or services via plugins)
  discovery:
    - Category browsing (find plugins by type: visuals, analysis, integrations, etc.)
    - Search by capability or name
    - Ratings and reviews for quality signal
    - Featured plugins and editor’s picks to highlight great content


Submission & Approval: Before a plugin appears on the marketplace, it goes through the submission pipeline above. The automated scans and checks are essentially an extension of the sandbox philosophy – they catch potentially malicious or grossly inefficient code early. A plugin might be required to pass all tests (with the testing harness, etc.) in a continuous integration system. The community review stage (perhaps a beta channel or a forum for new submissions) helps ensure that at least a few eyes have looked at the plugin’s behavior and usefulness before it’s widely available
Google Drive
. This process constitutes the formal promotion workflow for community plugins: from personal project to vetted marketplace addon.

 

Plugin Package Format: When a plugin is published, it’s bundled into a package file (could be a zip or a custom extension format). The package includes the manifest, the compiled code, any assets, and documentation. It also includes cryptographic signatures. There are typically two signatures: one by the developer (using their private key, proving authenticity of origin) and one by the marketplace (to certify that this package passed review and is approved)
Google Drive
Google Drive
. A simplified TypeScript interface for the package might look like
Google Drive
Google Drive
:

interface PluginPackage {
  metadata: { id: string; version: string; wirthforge_version: string; created_at: number; };
  content:  { manifest: PluginManifest; code: BinaryData; assets: AssetBundle; documentation: string; };
  signature: { developer: DeveloperSignature; marketplace: MarketplaceSignature; checksum: string; };
  distribution: { license: string; price: number | 'free'; energy_price?: number; };
}


When the WIRTHFORGE app downloads a plugin from the marketplace, it will verify the signatures: the developer’s signature must match the known publisher (ensuring the package wasn’t altered), and the marketplace signature indicates it’s an approved release. The checksum is an additional safeguard for integrity. Only if these checks pass will the plugin be installed.

 

Updates & Rollback: The marketplace infrastructure tracks plugin versions. Users get update notifications in-app when a new version of a plugin they use is available
Google Drive
. They can choose to update. The system will download the new package, verify it, then perform a hot-swap of the plugin if possible (unload old, load new). If an update fails (say the new version crashes on init), the host can catch that and rollback to the previous version automatically, notifying the user of the issue. This guarantees that updating plugins doesn’t leave the user worse off; at worst, the plugin reverts to what worked before. Moreover, users can opt to stay on an older version if they prefer, though the marketplace will encourage staying updated for security fixes.

 

Discovery & Installation: In the UI, a Marketplace Browser will list available plugins with categories and search. Users can read descriptions, see screenshots or videos (for UI plugins), and see ratings. Installing is as easy as clicking “Install”, at which point the app fetches the package and goes through the normal validation and sandboxing routine. Once installed, a plugin can be enabled/disabled from a management screen. Disabling a plugin would unload its sandbox and remove any UI components it added on the fly.

 

Finally, monetization: While many plugins may be free/open-source, the platform may allow paid plugins, subscriptions, or even community tip-jar models. The 70/30 revenue split is a common model (developer keeps 70%)
Google Drive
. Additionally, WIRTHFORGE’s unique concept of “Energy” could be leveraged for an alternate economy – e.g., users spend earned Energy Units to “buy” certain creative plugins, tying the in-app reward system to plugin marketplace in a gamified way.

 

Overall, the marketplace closes the loop: it provides the infrastructure for evolution, where the best ideas can seamlessly flow from the community to all users, under the umbrella of governance and safety. It’s the realization of WIRTHFORGE’s vision that an extensible platform, if well-governed, can grow organically and perhaps unpredictably – fostering emergence not just in the AI, but in the platform’s capabilities themselves.

🎨 Required Deliverables
Plugin Framework:

Plugin Manifest & Loader – A robust manifest schema and a PluginLoader implementation that discovers plugins, validates manifests, and loads plugins into sandboxes.

Security Sandbox – The isolated execution environment (separate process or thread) with enforcement of memory/CPU limits, no-network rules, and blocked system calls.

API Bridge Layer – A mediation layer that exposes allowed APIs to plugins and ensures all plugin calls are checked (permissions, rates, etc.) before affecting the core system.

Permission Manager – Component to define and check permissions, including an energy usage monitor to prevent plugins from exceeding quotas.

Developer Tools:

Plugin SDK – Libraries (TypeScript/Python, etc.) that plugins use to interact with WIRTHFORGE, including type definitions and helper methods.

CLI Utilities – wirthforge-plugin CLI for creating new plugins, running them in development, testing, building, signing, and publishing.

Testing Framework – Tools like PluginTestHarness for developers to simulate the environment and write tests for plugin functionality and compliance.

Documentation Generator – Possibly a tool to generate documentation or stub README from the manifest (ensuring plugin developers document capabilities and usage clearly).

Marketplace & Governance:

Submission System – Processes and automation for scanning incoming plugin submissions (linting, static analysis, test results) and organizing community/QA review.

Distribution Platform – The online store or repository where users can browse and download plugins, including the server-side components to serve plugin packages and metadata.

Plugin Package & Signing – Definition of the package format and implementation of signing/verification (including developer key management and a marketplace signing service).

Payment Integration – Support for paid plugins, handling transactions, license verification, and revenue reporting for developers. (This may be an ops/business deliverable but is noted here for completeness.)

Discovery Interface – UI components within WIRTHFORGE for the marketplace: category pages, search bar, plugin detail view, rating system, etc., integrated in a way that feels native to the app.

Documentation & Support:

Plugin Developer Guide – A comprehensive guide (this document and related tutorials) that is delivered to developers, covering how to build and submit plugins.

API Reference – Detailed reference for all plugin APIs, likely auto-generated from source or stub files.

Security Guidelines – A document clearly explaining to developers what is not allowed in plugins and how to design within the sandbox rules (to speed up approval).

Example Plugins – At least 2–3 well-commented example plugins covering common scenarios (UI panel, new analysis module, external integration) to jumpstart developer learning.

✅ Quality Validation Criteria

To ensure the Plugin Architecture meets the high standards of WIRTHFORGE, the following acceptance criteria must be met:

Framework Quality:

 Reliability – Plugins load and unload without crashing the system. The plugin lifecycle (install → init → run → terminate → update) executes smoothly in various scenarios (including error handling).
Google Drive

 Isolation – The sandbox truly isolates plugins: no escape is possible. Malicious code cannot affect the host or other plugins (confirmed via penetration testing).
Google Drive

 API Correctness – The plugin API is intuitive and functions as documented. All exposed methods produce the expected effects on the system when used properly.

 Performance – Running reasonable plugins does not degrade core performance. The frame rate and responsiveness remain at targets (e.g. 60 FPS) even with multiple plugins active, thanks to effective isolation and scheduling.

Developer Experience:

 Onboarding Ease – It is easy to create a basic plugin (e.g., following the tutorial, a developer can get a “Hello World” plugin running in minutes).
Google Drive

 Documentation – All necessary documentation (guides, API refs) are complete and clear, enabling devs to find info quickly.

 Testing & Debugging – The testing harness and debugging tools work as expected. Developers can simulate plugin scenarios and get meaningful output (e.g., logs, error messages) to iterate on their code.
Google Drive

 Community Feedback – Early community developers report a positive experience (this can be measured via a beta program or feedback forms, though qualitative).

Security & Governance:

 No Privilege Escalation – There is no known way for a plugin to gain higher privileges or access beyond what the manifest permits (confirmed via security audit).
Google Drive

 Resource Enforcement – Memory, CPU, and energy limits are strictly enforced. In testing, any plugin that tries to exceed limits is throttled or killed, and cannot bring down the system.
Google Drive

 Permission Model – The permissions are effective: a plugin without a permission cannot perform the associated action. All permission checks are in place and unit-tested (e.g., a plugin lacking ui.display_notification indeed cannot invoke the notification API).
Google Drive

 Malicious Code Containment – Even deliberately harmful plugins (e.g., ones that enter infinite loops, try to forkbomb, or exploit known vulnerabilities) are contained by the sandbox. The system remains stable and user data remains secure even under attack conditions. Logging and alerting mechanisms notify developers of the attempt.
Google Drive

By meeting all these criteria, WF-TECH-008 will ensure that WIRTHFORGE’s Plugin/Module Architecture is not only powerful and flexible, but also secure, performant, and aligned with the platform’s core principles. It paves the way for community-driven innovation, turning WIRTHFORGE into a living platform that can grow and adapt through shared creativity, all while maintaining the magic and trust that define the user experience.