WF-TECH-006 — Security & Privacy in Local-Core Web Architecture

🧬 Document DNA

Unique ID: WF-TECH-006

Category: TECH (Technical Specification)

Priority: P0 (Fundamental – protects user trust and data integrity)

Development Phase: 1 (Core system design)

Estimated Length: ~4,000 words

Document Type: Security & Privacy Architecture Specification

🔗 Dependency Matrix

Required Before This:

WF-FND-001 – Vision & Principles: Establishes the local-first, user-autonomy manifesto that mandates no cloud dependency and strong privacy guarantees
GitHub
GitHub
.

WF-FND-005 – Module & Plugin Philosophy: Outlines the concept of extensions and the need for sandboxing untrusted modules, which this spec will operationalize with concrete security policies
GitHub
.

WF-FND-006 – Governance & Evolution: Provides trust principles (core invariants like local_core, no_docker_rule) and governance rules that this document must enforce (e.g. no violation of local execution, mandatory audit trails)
GitHub
GitHub
.

WF-TECH-001 – System Runtime & Services: Defines the base architecture (5-layer model) and startup sequence, including the local API server and orchestrator hooks that need security hardening (e.g. binding to localhost, zero external calls)
GitHub
.

WF-TECH-004 – State Management & Storage: Describes local data persistence which this spec secures (ensuring the database and logs remain on-device, encrypted, and aligned with privacy requirements from WF-BIZ-002)
GitHub
GitHub
.

WF-TECH-005 – Decipher Engine / Energy Loop: Implements core data flows that produce sensitive telemetry (AI tokens, energy metrics); this spec ensures those flows are guarded (no sensitive content leaks, secure communication between Decipher (Layer 3) and UI (Layer 5)). (Tech-005 security guidelines are assumed as baseline to expand upon.)

Enables After This:

WF-BIZ-002 – Legal & Policy Overview: Uses the technical guarantees defined here to shape the privacy policy and terms of service (e.g. stating that “user data never leaves the device” is backed by these enforcement mechanisms)
GitHub
GitHub
. The controls and audit logs established in this spec support compliance and user transparency, directly informing the legal/privacy documentation.

WF-TECH-008 – Core Algorithms (Council & Adaptation): Ensures advanced AI coordination algorithms can run safely. By having a secure sandbox and strict data boundaries, future multi-model “Council” features (which may utilize optional external resources or plugins) can be integrated without compromising the local-first security model
GitHub
GitHub
. This spec lays the groundwork so that TECH-008’s innovations operate within trusted zones and with minimal data exposure.

Future Integrations: Establishes a template for any new module or integration point (e.g. cloud augmentations, third-party plugins, analytics components) to follow: they must respect the local data boundary, use the provided authentication framework, and be reviewed under the threat model and audit process defined here before activation in the system.

Cross-References:

WF-FND-003 – Core Architecture Overview: Reinforces the layered architecture’s rule that the UI (Layer 5) only communicates through the Transport layer (Layer 4) and cannot directly reach into core layers
GitHub
. Security zones are aligned with these layer boundaries, and this spec will illustrate how each layer interface is guarded.

WF-FND-007 – Module System Strategy: Details the requirement for sandboxing any extensible module or plugin. This security spec translates those strategies into implementation (e.g. sandbox policy schema, permission enforcement) and ensures no module elevates privilege without governance approval
GitHub
GitHub
.

WF-FND-008 – Local-First Web-Engaged Model: Affirms the philosophy that the “web” part (UI) enhances the experience but never takes control of or siphons data from the local core. Our design of trust boundaries directly implements this model (local core is authoritative; web UI is an isolated interface layer).

WF-FND-006 – Glossary: Terms like “trust boundary,” “sandbox,” “no_docker_rule,” “data sovereignty,” and “broker” (cloud assist node) will be used as defined in the glossary or updated here. We ensure consistency with glossary definitions of security-related terms (e.g. what constitutes “user data,” roles like “untrusted code,” etc.).

WF-TECH-003 – Real-Time Protocol (WebSockets): All real-time messaging must align with privacy rules – this spec imposes that the WebSocket server binds to localhost only and transmits no PII or raw user text
GitHub
GitHub
. We cross-check that the WebSocket handshake and data flow are secured (no external origins, optional TLS) per the guidelines here.

WF-TECH-015 – Plugin Architecture: (Future) Will build on the sandbox and permission system defined in this document. We anticipate that the formal plugin system spec will reference the JSON permission schemas and sandbox enforcement mechanisms established in WF-TECH-006 to ensure all plugins run in contained, user-approved environments
GitHub
.

🎯 Core Objective

Establish an ironclad security and privacy framework for WIRTHFORGE’s “local-core, web-engaged” architecture. This specification’s goal is to guarantee that user data never leaves the device without explicit permission, while enabling a rich browser-based UI that interacts with the local AI core safely. We will design a layered security model with clearly defined trust boundaries between the local core services (Layers 1–4) and the web UI (Layer 5), such that even though the UI is web-tech, it operates as a privileged local client rather than an internet-exposed app. In practice, this means implementing:

Local Data Boundaries: The local core (AI models, orchestrator, databases) resides in a high-trust zone that is fully isolated from external networks. We enforce that all network interfaces default to 127.0.0.1 (loopback) so nothing binds to public interfaces
GitHub
. User data (prompts, AI outputs, logs) stays on local storage by default – no cloud sync, no telemetry exfiltration. Any optional feature that might transmit data (e.g. an AI “broker” for heavy compute) must go through explicit user consent flows and send minimal, anonymized information
GitHub
GitHub
.

Secure Web UI Access: The browser-based UI is treated as a separate security zone – it’s the only part built on web technology, which could be a source of typical web threats (XSS, CSRF, etc.). We design an authentication and session management layer even for local connections: when the UI (Layer 5) connects to the local web server, it must authenticate (e.g. via a session token or HTTP-only cookie). This prevents any other rogue local process or webpage from hijacking the connection. We will detail an authentication handshake (e.g. a random one-time token generated at startup that the UI knows) so that only the WIRTHFORGE UI can issue commands to the core. Additionally, we ensure secure transport – even on localhost, we’ll support TLS encryption of HTTP/WebSocket traffic to prevent eavesdropping or injection if, for instance, the user opens the UI in a standard browser. This might involve generating a self-signed certificate for localhost or using an OS-provided local certificate store, so that the local UI can communicate over https://localhost without warnings. By the end of this spec, the web UI’s connection will be as secure as a traditional web app: authenticated, encrypted, and restricted to authorized origins.

Privacy Protection: Privacy is baked into every layer of design. Concretely, we will enforce that no personal or raw data is persisted or transmitted unless absolutely necessary. For example, the system will not log full conversation text to disk by default, only high-level metrics or embeddings
GitHub
. If any user data must be stored (e.g. for session restore), it will be encrypted at rest using a local key or OS-provided encryption. Telemetry sent to the UI (like real-time energy updates or token streams) will contain no direct identifiers or sensitive content beyond what’s needed for functionality
GitHub
. We align with WIRTHFORGE’s manifesto that the user “owns their data” – providing features for the user to review, export, or delete any stored data (with clear UI or CLI commands, tying into WF-BIZ-002 compliance). The core promise is that a user can use WIRTHFORGE with the confidence that nothing they do or input is secretly sent to the cloud or recorded without their knowledge – all interactions remain local, visible, and under user control
GitHub
GitHub
.

To summarize: WF-TECH-006 delivers a comprehensive security architecture ensuring WIRTHFORGE is a fortress on the user’s device – the browser UI is a controlled portal that enhances the experience but cannot compromise data sovereignty. We will produce concrete mechanisms (auth tokens, TLS config, sandbox policies, audit logs) and a threat model to anticipate potential attacks (from malicious plugins to attempted network access), meeting the bar that even if the UI were exploited, the core remains safe and user data stays put. By the end of this document, we will have a clear blueprint for how WIRTHFORGE “trusts nothing beyond itself”: the only trusted compute is on the user’s machine, and everything else (browser context, extension code, optional cloud helpers) runs in sharply defined sandboxes with the least privilege necessary. This blueprint, once implemented, ensures that WIRTHFORGE’s local-first vision is not just a performance choice, but a security guarantee – one that users and developers can rely on for every byte of data and every feature added to the system.

📚 Knowledge Integration Checklist

Local-First Enforcement (WF-FND-001): Double-check that every aspect of the design reinforces the local-first principle
GitHub
. The system should make zero unsolicited external requests – e.g., no contacting update servers or analytics by default
GitHub
. All computations (AI inference, data processing) must happen on user hardware unless an optional, user-approved remote feature (Broker) is engaged. Even then, the data shared must be minimal and anonymized: for example, sending only an encrypted prompt embedding to a cloud service rather than raw text. We’ll reference the manifesto’s mandate for privacy and autonomy
GitHub
 and ensure every proposed mechanism (like optional remote access) explicitly upholds these values (opt-in, transparent, minimal data). This checklist item means reviewing the design for any hidden cloud dependency or any scenario where data might leak off-device, and eliminating or gating it behind user consent.

5-Layer Trust Boundaries (WF-FND-003): Apply the layered architecture definitions to define security zones
GitHub
. Layer 5 (UI) is considered a less-trusted zone that communicates through well-defined contracts (Layer 4 APIs) – we enforce that no direct calls from UI to Layers 1–3 are possible, preventing bypass of validation. Conversely, Layers 1–3 (Input, Compute, Orchestration) are high-trust and never directly process external input without it passing through Layer 4 checks (e.g., the only way to send a prompt to the model is via an authenticated HTTP POST to the local API). We integrate guidance from the layer blueprint to ensure one-directional flow with checks: UI can only talk to orchestrator via approved endpoints; orchestrator outputs only reach UI via the structured WebSocket events. This segmentation will be documented with a trust boundary diagram highlighting how data flows from UI to core and where security checks apply (e.g. at the API gateway and message schemas).

Governance & Invariants (WF-FND-006): Incorporate the inviolable core principles as non-negotiable security requirements
GitHub
GitHub
. For example, Local-Core Enforcement and No Docker are already given – our design must explicitly prevent configurations that violate these (no feature should require pulling a Docker container that could introduce an opaque layer or external dependency). We will use the core_invariants list from the governance doc as a checklist: ensure local_core: true (all core logic is local), allow_docker: false, ui_presence: true (no hidden background processes doing things without UI indication, which also doubles as a security measure to catch if something runs unexpectedly)
GitHub
. Additionally, auditability is a theme in governance – we integrate that by requiring security-relevant events (e.g. a user granting a permission, or a sandboxed plugin requesting access) to be logged for traceability. The governance decision matrix and audit checklist mentioned in WF-FND-006 will be cross-referenced: our spec will show how each security mechanism can be audited and how any policy changes would go through the governance workflow. Essentially, nothing in the security design stands alone – it aligns with the project’s self-regulation framework (e.g. any change to trust boundaries would itself be subject to proposal and review per FND-006).

Sandbox & Extension Safety (WF-FND-005 / WF-FND-007): Integrate module sandboxing rules for any plugins or experimental features
GitHub
GitHub
. We gather the principles that sandbox modules can “see but not touch” – read-only access to data, no persistent changes, no interference with the live UI unless promoted
GitHub
. Our design will include a Sandbox Policy schema that encodes these constraints (e.g. JSON fields like canReadEvents, canWriteEvents, allowNetwork=false, allowDiskWrite=false, resource limits, etc.)
GitHub
GitHub
. We’ll ensure that by default, any new module is launched under a restrictive policy – essentially treating it as untrusted code – and only after passing certain criteria can those restrictions be lifted. The knowledge from the Module Philosophy and Strategy docs ensures we cover things like: limiting memory/CPU for sandbox processes, preventing system calls (perhaps via a restricted Python interpreter or subprocess with seccomp), and routing any module outputs to a quarantine area (e.g. a separate “dev console” UI)
GitHub
GitHub
. This checklist item also includes verifying that our sandbox design doesn’t conflict with performance or user experience (we’ll note that sandboxed modules run asynchronously and cannot block the main loop).

Technical Hooks (WF-TECH-001 & WF-TECH-003): Use insights from the startup sequence and real-time transport. From TECH-001, recall that the FastAPI server starts on localhost and initiates a handshake
GitHub
 – we will extend that handshake to include an auth token exchange if needed. Also, TECH-001 emphasizes no external calls on startup (no analytics, updates)
GitHub
; we’ll codify that as a security rule (e.g. network access is disabled by default until the user explicitly checks for updates). From TECH-003 (WebSocket protocol), leverage the fact that it’s local and JSON-based to implement monitoring – e.g., we can integrate a check that if any message were to contain disallowed data (like a raw snippet of user text that should have been abstracted), the system flags it
GitHub
. The 60 Hz protocol itself needs protection: we note that since it’s WebSocket on localhost, traditional web attacks like cross-site WebSocket hijacking are mitigated by origin checks and the authentication token. We’ll list how the design uses WebSocket subprotocols or headers to authenticate the connection (ensuring that only the WIRTHFORGE UI, presumably served from https://localhost:8145 or an Electron app, can connect). The main point is to integrate existing tech design details so that adding security doesn’t break them – e.g., confirming that adding TLS doesn’t upset the <5 ms latency goal (it shouldn’t on localhost), or that requiring an auth token doesn’t complicate the orchestrator’s handshake logic (we can possibly piggyback the token in the startup_complete message or an initial HTTP redirect). This item is checked off when we show a plan for authentication and encryption that fits seamlessly into the startup and real-time loop.

Threat Model Coverage: Compile a list of potential threats (inspired by OWASP and our knowledge of WIRTHFORGE’s architecture) and ensure each is addressed by the design. Threats to consider:

Unauthorized Access: Another app or script tries to use the local API – mitigated by localhost binding and auth tokens (we will confirm the server only listens on 127.0.0.1 by default and perhaps uses OS firewall rules to prevent remote access)
GitHub
.

UI Exploits (XSS/CSRF): Malicious input or a compromised plugin could attempt to inject scripts into the UI to steal data or control the app. Mitigation: The WIRTHFORGE UI will have a strict Content Security Policy (CSP) since it’s a local web page – e.g., no loading of any scripts from network, and sanitization of any data rendered. Also, because the UI and server are same-origin (localhost), CSRF is less traditional, but we’ll still use same-site cookies or require the auth token on API calls to ensure no external site can forge requests. We’ll document how the UI’s web content is delivered (likely from the local server or a packaged app), and how we ensure integrity (perhaps a checksum or signed HTML to prevent tampering).

Session Hijacking & Replay: If an attacker somehow obtains the local session token or cookie, could they control WIRTHFORGE? We mitigate this by scope and temporal limits – e.g., the token is bound to the local user’s session (not usable remotely) and maybe regenerates each app start. We’ll mention that any critical command (like a request to export data or to enable a plugin) could require an extra confirmation if needed. Also, since the UI is local, typical network man-in-the-middle isn’t a concern unless the machine is compromised – at which point, all bets are off (we note that our model is zero-trust on network but we trust the local OS; a rooted machine is out of scope beyond recommending OS-level protections).

Data Leakage: Ensure that no logs, caches, or screenshots unintentionally persist sensitive info. We consider even things like: browser caches (if using an external browser, make sure responses aren’t cached to disk if they contain PII – perhaps use appropriate HTTP headers to disable caching). Also, if the user copies text out of the app, that’s user-initiated so it’s fine, but the app itself shouldn’t, for example, write a backup of conversation to a cloud folder by default. We cross-check that only abstracted data is stored long-term
GitHub
 and that any sensitive data in memory is not swapped out insecurely (if using encryption for the database, etc.).

Malicious Plugin/Extension: A user-developed plugin could be trojanized. We rely on the sandbox: the design must ensure that even a malicious plugin cannot exfiltrate data or harm the system (it can’t make network requests unless allowed, can’t write to files outside its sandbox directory, and cannot call internal APIs that would change state). We’ll note the use of process isolation or at least Python import restrictions, and how the orchestrator will refuse to load a module that doesn’t declare a permission schema. Possibly, we’ll enforce code signing or at least show a warning for unverified plugins (that could be future scope, but we mention it as an idea).

Denial of Service (DoS): A misbehaving component (or even user input) might overload the system (e.g., a huge prompt or a plugin in infinite loop). Mitigations: input length limits, timeouts on operations, and the resource limits for sandboxes. We include how the orchestrator monitors the event loop timing – if security features (like auth or encryption) introduce overhead, we ensure it’s within budget (if TLS, use HTTP/2 or reuse connections to avoid handshakes per message, etc.). The design should not allow an infinite flood of data to fill up storage either – e.g., log files have rotation limits, database has size quotas or at least warnings.

The checklist is satisfied when for each identified threat we have a corresponding section in the spec describing a mitigation or justification of acceptability. This ensures our security model is holistic and not just theoretical; it anticipates real attack vectors on a local app with web UI and addresses them point by point.

Data Lifecycle & Privacy Compliance (WF-BIZ-002): Although a business doc, we incorporate its likely requirements: user data must be handled according to privacy best practices (akin to GDPR/CCPA if applicable, even if local). We verify that the design provides data subject control – e.g., a user can delete all their data (we have a procedure to wipe the local storage on request), and can export it (perhaps produce a JSON of their usage data). Also, any personal data in memory or logs should be protected from unauthorized access: encryption at rest for the database or at least OS-level file protections. If WIRTHFORGE in future has user accounts (even if local), we’d store credentials securely (salted hashes, etc.). We align encryption choices with industry standards (AES-256 for storage, TLS 1.3 for transport) and ensure keys are managed safely (the encryption key for local DB could be derived from a user password or stored in OS keychain). We’ll cross-reference state management’s note that no raw content is stored
GitHub
 – fulfilling a privacy principle that even if someone got hold of the DB, they couldn’t reconstruct the user’s conversations, only see abstract metrics. In summary, this item ensures the spec doesn’t violate any known privacy criterion and in fact demonstrates compliance: e.g., “we do X, which aligns with the Privacy Policy’s statement that ‘all user data is local and user-controllable’.”

📝 Content Architecture

Section 1: Opening Hook – “Fortress Localhost”
Illustrate the scenario of absolute user data protection in WIRTHFORGE. We start by painting a picture: A user booting up WIRTHFORGE is effectively stepping into a private vault where they can converse freely with an AI, assured that nothing escapes. Imagine booting the app and seeing a brief “security check” notification – the system verifying it’s running offline and secure. The user asks the AI a personal question; behind the scenes, that query travels through an encrypted loopback tunnel to the AI engine on the same machine, gets processed, and the answer comes back to the browser UI. All of this happens within the user’s device, like whispers echoing inside a sealed room. We might use an analogy: WIRTHFORGE is your personal AI oracle, living in a temple whose walls are your device’s hardware – only you have the key to the gates. In this section, we hook the reader by emphasizing trust: other AI platforms might send your questions to the cloud, but WIRTHFORGE does not – it’s “off-grid” by design. We also foreshadow the technical marvels enabling this trust: a local TLS-secured web server acting as a guardian, strict boundaries that even the UI (running in a browser) cannot cross without permission, and a monitor that watches for any anomaly (like a night watchman in the fortress). The aim is to make the reader feel the security: the comfort of knowing WIRTHFORGE treats their data as treasure to be guarded, not a resource to exploit. We’ll hint at challenges overcome, like making a web UI secure without an internet, and ensuring usability doesn’t suffer (the experience is seamless – the user might forget all this security is there, which is the point: peace of mind). This sets the stage for the deep-dive: WIRTHFORGE’s architecture not only produces a flashy AI experience, but does so while keeping the user’s secrets locked down tighter than any cloud service could.

Section 2: Core Concepts – Zones, Identities, and Keys

### Security Zones Architecture

WIRTHFORGE implements a **dual-zone security model** that maintains strict boundaries while enabling seamless user experience:

**Local Core Zone (High Trust)**
- **Components**: Orchestrator, AI Models, Local Database, Decipher Engine
- **Network Binding**: 127.0.0.1 only (localhost loopback)
- **Access Control**: Internal API with authentication required
- **Data Classification**: Handles raw user prompts, AI outputs, system state
- **Trust Level**: Full system privileges, direct hardware access

**Web UI Zone (Controlled Trust)**
- **Components**: Browser-based interface, client-side JavaScript, visualization engine
- **Network Access**: HTTPS connection to local server only
- **Access Control**: Token-based authentication, CSP-protected
- **Data Classification**: Receives filtered/abstracted data only
- **Trust Level**: Sandboxed browser environment, no direct system access

This ensures the server only accepts local connections
GitHub
. We mention that on systems where a firewall is present, the installer or runtime can add a rule to block external access just in case (though binding to localhost is usually enough). If the user wants to access WIRTHFORGE UI from another device (say their tablet), we will highlight that this is disabled by default for security; advanced users can opt-in by changing the host to 0.0.0.0 and providing their own TLS cert, but that’s at their own risk and perhaps requiring a strong password auth.

Authentication Token Exchange: We illustrate how the UI gets the token. One approach: the token is generated server-side (a UUID or 256-bit random string). When the user opens the UI, since the UI is likely an HTML/JS served by the same FastAPI, we can embed the token in the page (e.g. as a meta tag or in a JS object) so the front-end knows it. Then for all subsequent WebSocket connections or AJAX calls, the UI includes this token, e.g. ws = new WebSocket("wss://localhost:8145/ws?token=ABC123") or sets a header using a fetch API call. On the server side, we show code in FastAPI: using Depends() or a middleware to check for the token on each request. For instance:

from fastapi import Header, HTTPException
AUTH_TOKEN = "ABC123"  # (would be generated)
async def verify_token(x_wf_token: str = Header(None)):
    if x_wf_token != AUTH_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")
@app.get("/state", dependencies=[Depends(verify_token)])
def get_state():
    return current_state_snapshot


This snippet demonstrates requiring a custom header X-WF-Token on an endpoint. We might prefer an HTTP-only cookie though, so perhaps instead we set a cookie when serving the index page:

@app.get("/")
def serve_index(response: Response):
    token = AUTH_TOKEN
    response.set_cookie(key="wfToken", value=token, httponly=True, samesite="Strict", secure=True)
    return HTMLResponse(index_html_content)


And then use a library or custom check to ensure wfToken cookie is present. The text will explain trade-offs: cookies are convenient and protected from JS (if httponly), and with SameSite=Strict, even if the user has another browser tab, that cookie won’t be sent to other origins, mitigating CSRF. We ensure that the UI’s origin is https://localhost:8145 (with TLS) so it matches the cookie’s scope. This code-heavy explanation assures implementers that adding auth is feasible and not overly complex in a local app.

TLS Configuration: We detail how to generate and use a self-signed certificate for localhost. For instance, using the ssl module in Python to load cert files (as hinted in the uvicorn.run call above). We might provide a one-time setup script snippet:

openssl req -x509 -newkey rsa:4096 -days 365 -nodes -subj "/CN=localhost" \
    -keyout cert.key -out cert.crt


which creates cert.crt and cert.key for localhost. These would be used by FastAPI. We also mention that WIRTHFORGE could simplify this by bundling a certificate or using platform APIs: e.g., on Windows create a self-signed cert in the user’s certificate store, on Mac use Keychain, etc. For now, the simplest path is a self-signed cert that the user might have to accept in the browser (if not using an Electron container where we can trust it by default). We assure that even if self-signed, the encryption still protects from network sniffers (the only risk is a MITM on first usage which on localhost is negligible). Additionally, note that enabling TLS on localhost might have a slight overhead, but given modern hardware and short key lengths possible (2048-bit RSA or better yet, an ECDSA cert with smaller keys), the impact on our 60 Hz messaging is minimal (<0.5 ms typically to encrypt a small JSON frame). We can cite that local loopback TLS typically yields sub-millisecond overhead, maintaining our performance goals (perhaps referencing that median latency stays ~1–2 ms
GitHub
 even with encryption). This reassures that security isn’t compromising the real-time aspect.

Sandbox Execution for Plugins: Now we get into the cornerstone for extensions. We describe how the orchestrator will launch any plugin or experimental module in a restricted way. Possibly, if plugins are Python packages, the orchestrator might spawn them as separate processes (using subprocess or a multiprocessing with spawn). In doing so, it can apply OS-level constraints. For example, on Linux we might use cgroups or prlimit to set CPU/memory limits, and seccomp to disallow network syscalls. On Windows, use CreateProcess with a job object limiting resources. These specifics can be complex, so we outline them conceptually: “the plugin process runs under a special low-privilege OS user account or with reduced rights.” If that’s not feasible, we at least sandbox in code: e.g., the plugin API only exposes certain safe functions (the plugin might receive an object that only lets it subscribe to events and send debug logs, but not full orchestrator access). We present a JSON schema (or TypeScript interface as in the governance doc) for a plugin’s permission profile. For instance:

{
  "name": "MySamplePlugin",
  "version": "1.0.0",
  "permissions": {
    "readEvents": ["energy_update", "token_stream"],
    "writeEvents": [],
    "allowUIRender": false,
    "allowNetwork": false,
    "allowFilesystem": false,
    "maxMemoryMB": 128,
    "maxCPUPercent": 20
  }
}


This example indicates the plugin can listen to energy updates and token streams, cannot emit any events into the system (writeEvents is empty), cannot directly render UI elements or open network connections or access the file system, and is limited in resources. We then explain how the orchestrator enforces this: it could read this manifest and configure the sandbox environment accordingly. For allowFilesystem:false, the orchestrator might set the working directory of the plugin to a temp folder and afterwards delete it (so plugin can only write to temp). For allowNetwork:false, if we can’t fully block at OS level, we at least ensure the plugin library has no direct access to requests or sockets (possibly by controlling imports). There’s mention in WF-FND-006 that the sandbox prevents unauthorized system calls and network access
GitHub
 – we take that directive and implement it. For readEvents, orchestrator will only feed the plugin those events; for writeEvents, since none, any attempt by plugin to send an event to core is ignored or raises an error. This effectively implements the “read but don’t write” policy from earlier
GitHub
. Code snippet: we might show pseudo-code where the orchestrator iterates through a whitelist of event types and only forwards those to the plugin’s on_event handler. Also, if plugin tries to call a function not allowed, how do we catch it? If plugin runs in a separate process, it might communicate via IPC with orchestrator. The orchestrator can simply not implement any IPC commands that alter state. If plugin runs in the same process (less ideal), perhaps we run it in a Python exec with a restricted globals dict. For clarity, we lean on the safer side: each plugin is a separate process, communicating via a controlled channel. That channel itself can be a socket or pipe that the orchestrator listens to; if the plugin tries to send a disallowed command, orchestrator either doesn’t implement it or logs and ignores it. We also mention Extension Approval Flow: by default, even if a plugin is present, it might run in a super-sandboxed “observation” mode (as described in governance) where it can’t affect anything
GitHub
. Only after it’s vetted can certain permissions be toggled true (like allowUIRender might become true for an official plugin that needs to show UI). We might reference that WF-TECH-015 will formalize this, but our groundwork allows it. In summary, this part provides both the schema and the runtime enforcement approach.

Secure Communication Between Components: WIRTHFORGE’s core itself has multiple components (e.g., the orchestrator and the model runtime, possibly running as separate processes or via an API like Ollama). We address how those internal channels are secured. If using an external model server (like Ollama’s API), even though it’s local, we treat it carefully: ensure it also binds to localhost and ideally uses an authenticated pipe. For example, if Ollama has an HTTP API on a port, we’d want to firewall it to localhost and maybe restrict usage via a randomly generated token if possible. If not possible, we at least rely on OS protections (since it’s local user only). We mention inter-process communication like the orchestrator to Decipher (Layer 3) may just be in-memory function calls (if Decipher is a library) so no risk there. But orchestrator to model (Layer 2) could be via local network call – we ensure that is not accidentally listening on all interfaces. We give the example of setting --bind 127.0.0.1 when launching any subprocess server. Additionally, any data leaving Layer 3 to optional Layer 6 (cloud broker) should be encrypted. If we envision the Broker connection (like if user opts to use cloud GPU), that communication should happen over HTTPS with a known endpoint, and perhaps route through a proxy that user trusts. We likely won’t design broker in detail here, but state the requirement: if any external server is used, WIRTHFORGE will use industry-standard encryption (TLS 1.3) and only transmit the minimum necessary information, e.g. an abstract embedding or partial context, never full private documents, unless explicitly configured by user. Also note, the UI itself is a component – what if the UI wants to display an image or fetch a resource? If the UI tries to fetch an external URL (maybe for a web-based component), our CSP should prevent it. If there’s a legitimate case (like loading a font or CDN script), we should package those locally instead to avoid any external calls that could leak info (even something like a Google Fonts call could indirectly expose that the app was opened). Implementation: ensure the UI’s HTML/JS is self-contained; maybe instruct developers to include assets offline. Summing up, this part ensures end-to-end encryption and containment for all pathways: user input to model (stays on device), model to UI (on device via secure WS), plugin to orchestrator (in-memory or secure IPC), optional external leaps (explicitly TLS-protected and minimized).

Data Encryption & Storage Security: Provide specifics on how data is stored safely. For the local database (from TECH-004), we integrate encryption. If using SQLite, we can use SQLCipher or at least ensure the OS user permissions restrict access to the DB file (only the user running WIRTHFORGE can read it). We describe possibly generating a symmetric key on first run, storing it in a config file encrypted by a user-supplied passphrase if available. If WIRTHFORGE eventually has a login (maybe not yet since single-user), at least mention we have the hooks to add a master password for encryption. We also cover file system locations: all WIRTHFORGE data by default resides in the user’s profile (home directory) under a .wirthforge or similar folder. We encourage using OS-specific secure directories (e.g., on Windows, AppData with appropriate ACL; on Linux, ~/.local/share/wirthforge with default umask so others can’t read). We mention cleaning up sensitive temp files: e.g. if we ever write a transcription or export data, ensure it’s either to a user-chosen location or wiped after use. Another key implementation detail: no hidden telemetry – we make it clear that the app does not secretly send usage stats. If in future usage stats are desired for improvement, they will be disabled by default and go through this security review (and likely be anonymized or on-device analysis only). We can mention how even error reports are handled: ideally on-device, but if an error log were to be sent to developers, it should require opt-in and scrub personal info. In code terms, maybe showing that any analytics or update-check code is commented out or behind a config flag, to reassure that by default nothing runs.

After covering these subtopics with examples and pseudo-code, the reader should have a very concrete sense of how to implement the security features. We tie it back to principles often: e.g., after showing auth code, note “this satisfies the requirement that only the WIRTHFORGE UI can invoke internal APIs, aligning with our trust boundary.” Or after showing plugin sandbox JSON, note “this fulfills the sandbox policy outlined in governance – an unapproved module cannot affect the core or leak data
GitHub
.” The goal is to ensure that every conceptual rule from Section 2 is now grounded in an actionable implementation step in Section 3.

Section 4: Integration Points – System-Wide Security Cohesion
Explain how the security measures integrate with other WIRTHFORGE subsystems and enable future features. In this section, we connect the dots to ensure no part of the platform is left out of the security model:

Startup & Orchestration Integration: We describe how the orchestrator (Layer 3, from TECH-001) incorporates security from the first moments of launch. For instance, orchestrator generates the auth token and loads TLS certificates during startup (perhaps even before launching the model). It also might perform a quick self-check: e.g., verifying that required files (like the certificate) have proper permissions, or that the local database isn’t tampered (maybe a future idea: use a hash or signature to detect corruption). The orchestrator’s logging (as noted in TECH-001) will also log security-relevant events – e.g., “Bound local server on 127.0.0.1” and “UI authenticated successfully” – which is useful for audits. We also mention the handshake event (startup_complete) could include a field like "secure": true indicating to the UI that the connection is secure and authenticated (if not, UI might warn the user). Essentially, by the time orchestrator signals readiness, all security layers are up, so the rest of the system proceeds in a trusted manner.

Decipher & Data Handling: The Decipher component (WF-FND-004, central compiler of AI outputs) deals with sensitive data (it sees raw model outputs and perhaps user prompts). We ensure that Decipher’s outputs that go into events are privacy-filtered by design
GitHub
. For example, Decipher might tag certain data as “sensitive” which then the WebSocket or logger can omit or abstract. Integration point: if Decipher has a feature to detect personally identifiable information or patterns, it could signal to the orchestrator to not log those. While a bit speculative, we mention the concept of data classification tags on events – e.g., an event could carry a flag if it contains user text. The security layer could then decide “don’t store this event in long-term log because it has raw text.” We tie this to the earlier statement that only abstracted metrics are stored by default
GitHub
. If Decipher outputs an energy metric derived from the user’s text, that’s fine to log; but the actual text token event might be displayed then discarded (unless user opts to save transcripts). This coordination ensures privacy at the content level, not just network level.

State Storage & User Profiles: When the state management (TECH-004) writes to the database, integration with security means ensuring that the DB operations go through our filter. For example, if the user triggers a “delete my data” command, the orchestrator will invoke the state manager’s routines to drop or wipe the database/tables, then perhaps also shred any in-memory caches. Another integration: backup/restore – if the platform eventually allows backing up user profile or sessions, our spec would require that such backups are encrypted and kept local or only exported by user action. If the state manager uses schema versions, we ensure that if a schema migration occurs, no data is exported to external systems for migration – it’s all local. Also, recall WF-TECH-004 mentioned audit logs and “audit mode”
GitHub
 – integration here is to ensure the audit logs themselves are protected (maybe stored in a separate locked file) and also to use them in security audits (like verifying no unauthorized events happened). We might propose that the state manager’s event log could be scanned to detect anomalies (like an event “Plugin X attempted forbidden action” should be recorded and surfaced in an admin UI).

UI/UX Integration: Security should not degrade UX but should be visible enough to instill confidence. We discuss small UI integrations: for instance, an icon or indicator in the WIRTHFORGE UI that shows “Local Secure” (like how browsers show a lock icon). This could simply read from a status endpoint that confirms all connections are local and encrypted. If the app ever allowed a remote connection mode, the UI should prominently warn when in that mode (to differentiate “secure local” vs “remote access”). Another integration: if a plugin is running in sandbox mode, perhaps an indicator or a developer console can show it, so power users know it’s contained. We also ensure that any security-related prompts are user-friendly – e.g., if a plugin requests a permission escalation, the UI might show a dialog “Plugin X wants to access the internet. Allow? [Yes/No]” similar to how mobile OS do it. This ties into UX design (though not fully implemented here, we set the stage by saying our backend can facilitate such prompts). Additionally, integration with UX Leveling (the progressive unlocking of features): maybe at early user levels, certain potentially risky features (like plugin installation or external model usage) are locked until the user is more advanced and presumably understands the implications. That is a governance and UX decision, but we mention it: security and progression are aligned (the user isn’t overwhelmed with security decisions early on; advanced features come with proper cautionary UI).

Cross-Platform & Deployment Integration: If WIRTHFORGE is distributed as a desktop application (maybe Electron, or a packaged local app), our security must adapt to that environment. Integration points: In an Electron app, we can enforce that the Electron browser window is launched with webPreferences: { contextIsolation: true, nodeIntegration: false } for safety, and that it only loads our app’s content (no remote URLs). We highlight that if an Electron container is used, it actually enhances security because we control the environment (no random browser extensions, etc.). If run in a user’s browser, we rely on them not going to malicious sites concurrently – hence our Strict cookie to avoid cross-site issues. For installers: mention that we might want to code-sign the application itself (for OS trust) but that’s more about user trust than data leaving – still worth noting. Another integration is with continuous integration/testing (which we cover more in Section 5), but essentially: any time the platform is built or updated, security tests should run (like linting for banned functions or checking that new APIs have auth in place).

Future Feature Hooks: Finally, we explicitly call out how this security foundation enables forthcoming docs: e.g., when WF-TECH-008 (Core Algorithms) introduces cloud-enhanced “Council” features, they will rely on the broker communication channel we secured here. If Council decides to query an external knowledge base (just a hypothetical), it must use the proxy and encryption defined here, and only with user consent. Also, the plugin architecture doc (TECH-015) will directly use the permission schemas we defined, meaning our JSON examples become the contract for plugin developers. Similarly, any business-facing features (like community sharing of modules or logs) will go through filters defined here (for example, if a user wants to share an “experience replay,” the system might strip personal data from the log based on the policies set in this doc). By highlighting these, we ensure the reader knows this spec isn’t an island – it’s actively shaping the evolution of WIRTHFORGE’s capabilities in a secure way.

In summary, Section 4 assures that everything from startup to shutdown, from UI to model, and from current features to future expansions is woven into a coherent security fabric. Nothing stands alone: each layer and feature either follows the rules set here or, if it needs an exception, that exception is consciously designed and gated. We reinforce that security is a cross-cutting concern – not a module you add on, but part of the architecture’s DNA (harkening back to Document DNA where we listed security as fundamental). This prepares us to measure and validate all these measures in the next section.

Section 5: Validation & Threat Modeling – Proving We’re Safe
Lay out how we will test, verify, and continually uphold the security and privacy of WIRTHFORGE. This final content section outlines both a formal threat model analysis and the concrete steps to validate each protection:

Threat Model Table: We present a structured list of threat scenarios (as identified in the checklist) and how our design mitigates them. For example, we tabulate or bullet:

Threat: Malicious website attempts cross-origin requests to WIRTHFORGE API.
Mitigation: Local API requires auth token/cookie not accessible to third-party origins (token is HTTP-only and same-site) and server enforces Origin: localhost check. Tested by trying a CURL from another origin and ensuring a 401 response.

Threat: Local network attacker sniffing traffic.
Mitigation: All UI-core traffic is over TLS on localhost; even on a shared network interface scenario, encryption prevents reading or tampering. Verified by packet inspection test (running Wireshark on loopback – only encrypted data seen).

Threat: Unauthorized plugin altering state.
Mitigation: Sandbox policy prohibits state change calls; any attempt is ignored and logged. Validated by creating a test plugin that tries to, say, grant an achievement – ensure no effect and check log for “denied action” entry.

Threat: Data left behind after uninstall.
Mitigation: User has a one-click data purge; also document instructs to delete the .wirthforge folder. Possibly future installers will wipe it on uninstall or ask user. We test by simulating uninstall and checking no user data remains in common directories.

Threat: Brute-force or guessing of auth token.
Mitigation: Token is high entropy (128-bit+), short-lived (new each launch) and not exposed. Also server rate-limits connection attempts (we can easily implement: if 5 bad tokens, pause accepting new connections for a bit). Confirmed by attempting 1000 random token connections and observing all denied and orchestrator not crashing.

Threat: Exploitation of known vulnerabilities in dependencies (e.g. FastAPI, or an outdated library).
Mitigation: We commit to regular security audits of dependencies (tie into WF-TECH-011 Testing Strategy). For now, the design assumes using current libraries; the plan includes using tools (like pip audit) in CI to catch vulnerabilities. Also, because WIRTHFORGE is offline by default, even if say a HTTP parsing lib had a vuln, an attacker would have to already have local access to exploit it, which is a higher bar – though we still patch promptly.
We systematically go through these, covering also physical security (if someone has physical access to the machine, our encryption at rest is last defense) and insider threat (if user installs a malicious plugin themselves, sandbox is defense). This threat model could be formatted as a list of bullet points or a table for clarity.

Security Testing Procedures: Next, we describe how to test and validate each deliverable. For example:

Local Boundary Enforcement: Start WIRTHFORGE and attempt to connect from a different machine on LAN – expect failure. Or run netstat to confirm port is only on 127.0.0.1. Also, attempt to configure it to 0.0.0.0 and ensure warning is logged (if we implement that).

Authentication: Try accessing an API endpoint via browser dev tools without the token – should get 401. We could script this with an automated test client that omits token and ensure the server blocked it. Also test that the correct token allows access.

Session Management: Test that the token/cookie is rotated on restart and invalidated on app exit. Possibly implement a “logout” that clears cookie (for completeness; in a local app scenario logout might just be app quit). If multiple UI connections are allowed, test that a second browser without token can’t connect concurrently.

TLS: Use a browser to verify the certificate is accepted (maybe instruct to import the test CA if needed). Use an SSL scanning tool to ensure no insecure ciphers are allowed by our server config. Also measure performance: send 1000 messages over WS with TLS and ensure we still meet latency budget.

Sandbox: Create dummy plugins with various intents: one well-behaved, one that tries forbidden ops (file write, network call). Ensure that in our test harness, the malicious plugin’s effects are contained. We can automate checking that no new file was created outside allowed directory, and that the network call fails (maybe the plugin will throw exception or just not have access). This might involve a unit test where the plugin tries socket.connect(('example.com', 80)) and we intercept/deny it. If using OS-level, the call might just fail; if code-level, we might monkeypatch socket in plugin environment to always throw. In any case, confirm the sandbox does what it should.

Threat Scenarios: For each threat in our table, design a test. Some can be manual (like sniffing traffic), others unit tests (like token brute force simulation). We ensure they’re either already done or will be included in the QA plan.

We may mention a pen-test phase: after implementation, a small red-team exercise where someone not on the dev team tries to break the system. This can catch things devs overlooked. Given the project scale, even a checklist-based internal pen-test is good (e.g., use OWASP ZAP against the local web interface, see if any XSS vulnerabilities if UI reflects input, etc.). We commit to addressing any findings.

Metrics for Privacy Compliance: We define success criteria like Zero Data Leaks: no unexpected outbound traffic is observed during run (we can instruct testers to run the app with network monitoring – they should see no connections except maybe checking for updates if user triggers it). Another metric: Resource Overhead: measure memory/CPU overhead of sandbox and TLS. For instance, ensure that enabling TLS doesn’t cause >5% CPU usage at peak throughput; ensure sandboxed plugins when idle use negligible resources. If overhead is high, adjust configuration. We mention that continuous integration can run a performance test with security on vs off to ensure difference is minimal (thus no one is tempted to disable security for performance).
Another metric: User Trust Feedback. While not quantitative, we consider doing a user beta and see if any security warnings (like browser warnings or certificate issues) confuse users. If so, refine instructions or automation (e.g., provide a smoother certificate installation).

Documentation & Audits: To validate documentation quality (meta, but necessary), we ensure that this spec and related documentation (like user-facing privacy policy or internal dev security guide) stay in sync. For example, if the privacy policy promises “your data stays on your device”, our tests should verify that (no cloud traffic). And if this spec says “we log X”, ensure the privacy policy mentions logging appropriately. We also plan an audit checklist (as mentioned in deliverables) – e.g., every release, run through a checklist: “Is all network communication still local and secure? Did any developer accidentally introduce an external call? Are all new APIs covered by auth? Have we updated dependencies to fix known vulns?” etc. We can incorporate a simplified version of the audit checklist from governance
GitHub
, focusing on security items.

By the end of Section 5, the reader (and the project leaders) should be confident that not only is the design theoretically sound, but we have a clear plan to verify and maintain that security over time. We stress that security is not a one-time set-and-forget: it’s an ongoing process. Thus, we tie this into the Post-Generation Protocol next, which will institutionalize these checks and updates as part of WIRTHFORGE’s evolution.

🎨 Required Deliverables

To fully realize and document the Security & Privacy architecture for WIRTHFORGE, we will produce the following deliverables:

WF-TECH-006 Specification Document: The comprehensive technical write-up (this document) following the universal template. It details the security model, design rationales, and implementation guidance. Additionally, an Executive Summary will preface this spec for high-level stakeholders, concisely stating how WIRTHFORGE protects user data (e.g., “All AI processing is local; no data leaves the device; a secure web interface with TLS and token auth ensures only the rightful user can access the system”). This summary allows a quick grasp of key points without reading the full text.

Trust Boundary Diagrams: Visual aids depicting the security zones and data flows. We will create at least two diagrams: (1) a System Trust Zones Diagram showing the local core on one side, the web UI on the other, and the guarded interfaces (API, WebSocket) between them. It will illustrate components like the Model, Orchestrator, Database in the “trusted zone” and the Browser/UI and possible External Broker in “untrusted or less-trusted zones,” with a bold line labeled “Trust Boundary” between local and external. (2) a Threat Model Data Flow Diagram (possibly using Data Flow Diagram notation) that highlights entry points and mitigations – for example, showing an external entity attempting to connect and the firewall/token blocking it. These diagrams (to be delivered as Mermaid .mmd source and exported SVG/PNG) will help developers and auditors visually understand the security architecture at a glance. They will be named logically, e.g., WF-TECH-006-trust-boundaries.mmd and WF-TECH-006-threat-flow.mmd, and stored in the project’s asset repository.

Permission Schema JSON Files: A set of JSON schema definitions for security permission profiles, applicable to various component types:

Plugin Sandbox Policy Schema: Defines the allowable fields and values for plugin permission manifests (as described in Section 3). It will formalize the structure (with keys like readEvents, allowNetwork, etc. and what values they accept) and include validation rules (e.g., event names must be known types). This ensures any plugin’s manifest can be automatically validated against the schema to catch unsupported permissions or missing required fields. We expect a file like WF-TECH-006-plugin-permissions.json conforming to JSON Schema Draft-07 for integration into build or runtime checks.

Core Security Settings Schema: Optionally, if WIRTHFORGE has a config file for security settings (like toggling TLS, setting allowed origins, enabling developer mode), we provide a schema for that as well. This could be WF-TECH-006-core-security-schema.json documenting keys such as requireAuthToken (bool), allowedOrigins (list), enableSandbox (bool) etc., to standardize how these settings are defined and validated.

Governance Policy Extensions: If needed, we also contribute to the governance policies JSON (WF-FND-006 schemas) for security-related entries (for example, adding specifics under sandbox_policies or core_invariants in the governance JSON). Though not a separate file deliverable, this ties our work into the existing governance schema files
GitHub
.

Providing these machine-readable schemas serves a dual purpose: they act as an authoritative reference for developers implementing or configuring security, and they can be used in automated tests to ensure compliance (e.g., a plugin must ship a manifest that validates against our schema or it won’t load).

Example Authentication & TLS Code: To aid implementation, we will include code snippets or stub files demonstrating critical portions of the security setup:

A FastAPI dependency or middleware for authentication (as shown in Section 3) – possibly delivered as a Python module e.g. auth_middleware.py – that can be imported into the FastAPI app. It will contain the token verification logic and maybe a helper to generate tokens.

A server startup script snippet showing how to generate a self-signed cert and start Uvicorn with TLS. If appropriate, a script to install a local Certificate Authority for development is also provided (for dev convenience).

A client-side example of connecting with the token: e.g., a small HTML/JS sample (or notes in the documentation) illustrating how the token is included. If the UI is an SPA, we ensure the framework (React, Vue, etc.) is configured to send the token automatically.

These code examples (possibly in a code/WF-TECH-006/ folder in the repo) ensure that the engineering team has a starting point and reference implementation for each abstract concept described. They will be kept up to date alongside the main codebase to reflect any changes in libraries or approaches.

Sandbox Policy Examples: In addition to the schema, we will provide one or two concrete JSON examples of plugin sandbox policies in context. For instance, example_policies.json might contain a “typical visualization plugin policy” (read-only access to energy events) and a “data analysis plugin policy” (maybe allowed to log to a separate file but still no UI or net). These examples will be used in documentation and testing to validate that the sandbox enforcement works as expected. They act as templates for future plugin developers to follow, and for the security engine to test against.

Threat Model & Test Plan Document: While much of the threat model is in this spec, we will extract a concise Security Test Plan – possibly as an appendix or a separate testing checklist. This will list each major security feature and how to test it (somewhat mirroring Section 5 but formatted for QA). For example, it might be a markdown or PDF deliverable enumerating: “Test 1: Port scanning – Expect port closed externally. Test 2: Invalid auth – Expect 401. Test 3: XSS attempt – Expect output escaped or CSP block.” We include steps and expected results. This is useful for QA engineers or automated test frameworks to ensure nothing regresses. It also helps external auditors quickly see what we’ve considered and verified.

Security Audit Checklist & Procedures: Aligned with the governance audit checklist
GitHub
, we will create a focused Security Audit Checklist to be used internally at major release milestones. This checklist (could be a spreadsheet or JSON like WF-FND-006-audit-checklist.json expanded for security domain) will have items such as:

“Verify no new external dependencies bypass local-first (review network calls in code).”

“Run dependency audit (pip audit) and address any critical vulnerabilities.”

“Ensure all config defaults favor security (e.g., sandbox on, telemetry off).”

“Review access logs for any suspicious entries in last period.”

“Conduct a penetration test or code review focusing on any new features since last release.”

We will document the procedure for performing this audit, who is responsible (e.g., assign a Security Champion on the team per governance rules), and how to document the findings (likely feeding into the WF-TECH-011 Testing Strategy doc). The checklist will be delivered as part of the project’s meta documents, ensuring it’s easily referenceable and maintainable.

Privacy Policy Mapping: To support WF-BIZ-002 (Legal/Policy), we will produce a technical appendix or mapping document that translates the implementation to user-facing commitments. For instance, if the privacy policy says “WIRTHFORGE does not collect or transmit your personal data,” our mapping will cite the features that ensure this (localhost only, no telemetry code present, etc.). This deliverable might be a table in the BIZ-002 doc or a separate reference that legal can use to double-check that each statement has technical backing. It’s not a typical engineering deliverable, but it’s important for alignment between technical reality and public statements.

Data Handling & Compliance Docs: If needed for future certification or compliance (imagine WIRTHFORGE wants some security certification), we will have the foundational materials ready: architecture diagram, threat model, test results, etc., which are all outputs of this effort. While not a separate deliverable in the repo, this spec and its supporting files essentially serve as the documentation package for any security audit or review.

All deliverables will conform to WIRTHFORGE’s documentation and file naming standards, and will be linked in the project’s documentation index. For example, the JSON schemas will be placed in the assets/schemas/ directory and referenced in doc-index.json for WF-TECH-006, diagrams will go under assets/diagrams/ with proper naming, and code samples under a code/ directory as described. By generating these artifacts, we ensure that the security and privacy architecture is not only designed but also executable and verifiable. Developers will have concrete schemas and code to implement against; testers have clear plans to validate; and stakeholders have visual and textual proof that WIRTHFORGE meets its trust promises. This comprehensive deliverable set transforms the abstract goal of “Security & Privacy” into tangible pieces integrated into the project workflow and repository.

✅ Quality Validation Criteria

To verify that this Security & Privacy specification meets WIRTHFORGE’s standards and truly achieves its objectives, we will evaluate it against the following criteria:

Correctness & Completeness: Does the document address all key security requirements and potential vulnerabilities identified for a local-first, web-enhanced system? We will cross-check the Required Deliverables list and ensure every item (auth mechanism, TLS config, sandbox policies, threat mitigations, etc.) is thoroughly covered in the content
GitHub
. Each threat scenario we envisioned must have a corresponding mitigation described – we’ll simulate “what if” questions: What if a malicious plugin tries X? What if an attacker tries Y? – and confirm the spec has answers. For example, if the threat model mentioned CSRF, do we explicitly mention SameSite cookies or token checking? If we said we’d encrypt data at rest, did we specify how (algorithm, key management)? Completeness also means aligning with prior docs: e.g., WF-TECH-004 expects local data persistence; have we ensured that persistence is secure per this doc? We will also verify no “to-do” or placeholder remains unaddressed. Evidence of completeness will be the presence of concrete examples or policies for every abstract concept (we shouldn’t just say “we will have sandboxing” without showing how). If any security aspect is intentionally left out-of-scope, the document should state it and why (e.g., maybe we decide not to handle multi-user separation because app is single-user; that’s fine if explained). This criterion is satisfied when we can no longer identify a reasonable security question that this document doesn’t answer or explicitly defer.

Alignment with Core Principles and Architecture: We rigorously check that nothing in this spec contradicts WIRTHFORGE’s fundamental principles (from FND-001 and FND-006) or the architecture (FND-003). For instance:

Local-First Integrity: Ensure the design never requires a cloud service
GitHub
. If we introduced optional cloud usage (like Broker), confirm it’s truly optional and minimal. The quality check is to see if a user can run WIRTHFORGE fully offline indefinitely – and our design says “yes, absolutely.” If any feature would call out (like license verification or update check), we need to highlight that it’s optional or provide offline alternatives.

No Docker Rule: Confirm we haven’t inadvertently suggested using containers or anything that violates the simplicity trust. If we talked about sandboxing, did we assume needing Docker? We did not – we used native OS features, which is correct per principle
GitHub
.

Layered Isolation: Validate that the solution enforces the layer boundaries. For example, did we ensure the UI (Layer 5) cannot talk directly to the model (Layer 2)? We did via requiring it to go through Layer 4 APIs. We’ll double-check statements like “UI must never bypass L4 to call lower layers” are fulfilled
GitHub
 – meaning our API design has no shortcuts or debug modes that break this. Also, confirm that our mention of orchestrator and Decipher integration doesn’t create a new vulnerability (should be fine since they’re both core).

Governance Enforcement: Since FND-006 requires that new changes follow governance, we ensure this spec itself notes compliance – e.g., the Post-Generation Protocol has steps to update governance docs or check proposals. Essentially, the quality metric is that this doc strengthens adherence to core values. One could imagine doing a sanity check: if an external security expert read WIRTHFORGE’s manifesto (FND-001) and then this spec, would they say “yes, the implementation indeed follows through on the promises”? We aim for that consistency.

Clarity and Utility: We assess whether the document is understandable and actionable for its target audiences (developers, security reviewers, etc.). Are the sections well-structured (Document DNA through Post-Gen) and written in clear, concise language? We ensure paragraphs are not overly dense, key points are bullet-listed for scanability
GitHub
, and diagrams and examples are used to clarify complex topics. A specific check: the Content Architecture we planned (Sections 1–5) – did we follow it and cover each part in a logical order
GitHub
? This maintains coherence. We might have someone new to the project read it and summarize the security design to see if it comes across correctly. If any part is confusing (like overly technical without explanation, or too abstract), we refine it. We also watch out for undefined terms or acronyms – everything should either be common knowledge or explained (and will go to glossary if new). For code examples, make sure they’re correct and don’t assume too much context (they should be pseudo-real code matching our stack). The goal: a developer can use this spec as a reference manual while implementing security features, and a tester can use it to write test cases, without needing extra clarification. Clarity is met when internal team members can follow the spec to implement and external readers find it logically progressing and well-justified, as per WIRTHFORGE documentation standards
GitHub
.

Testability & Verifiability: Every security feature described should be testable either via unit tests, integration tests, or manual procedures, and we have outlined those in Section 5. We verify that none of the security measures are so abstract that one couldn’t verify them after implementation. For example, if we say “data is encrypted at rest,” we ensure there’s a way to check that (like try to open the DB file with SQLite browser – it should be unreadable). If we say “no external traffic,” one can monitor network interfaces to confirm. The spec should mention these verification methods. Also, the inclusion of schemas and checklists means we can programmatically or process-wise verify compliance (like validating plugin manifests against schema, or running the audit checklist every release). The quality check is that the document doesn’t just make claims – it provides means to validate them. An indicator of success here will be if our CI pipeline or QA process can directly incorporate pieces of this spec (like use the JSON schemas in tests, or follow the test plan provided). If anything seems too theoretical, we add concrete criteria. We also plan a “dry run” of the audit checklist on paper: simulate a release review using it and see if it would catch mistakes (for instance, we’d pretend a developer forgot to restrict an API and see if the checklist would have flagged something related).

Minimal Performance/UX Impact: Security often comes with trade-offs – we ensure the document acknowledges and mitigates them, meeting the project’s performance and UX targets. For performance, as mentioned, encryption and sandboxing overhead must not break 60 Hz updates. The spec references using asynchronous non-blocking calls and efficient libraries to maintain <5 ms latency
GitHub
. During quality review, we’ll see if we provided enough reasoning or data to be convincing. If needed, we incorporate a quick benchmark reference (like “local TLS adds ~0.5ms which is within our budget”). For UX, we check that we haven’t introduced undue friction: e.g., does the user have to click past a certificate warning? If yes, have we planned to avoid that via pre-installed certs or clear instructions? Does the user have to manage another password for data encryption? We suggested maybe not unless optional. We might run through user flows in a mental UX test: first install, first run – do they experience a smooth start? (Likely yes, all security under the hood). If not, we ensure improvements or at least document the steps (like “you may see a browser warning due to self-signed cert, here’s how to trust it”). Quality criterion here is that security enhancements do not undermine the WIRTHFORGE experience (which prides on immediacy and immersion). We satisfy it when we can confidently say the app remains easy to use and high-performance, with security mostly invisible except where it enhances trust (like a subtle lock icon).

Consistency & Terminology: The spec must use consistent terminology and integrate with WIRTHFORGE’s naming conventions. We verify all event names, component names, and references match those in other docs (e.g., we refer to “Decipher” not “Compiler” if that’s standardized, we use “Energy Frame” as defined, etc.). We ensure that any new terms we introduced (like “auth token” or “sandbox mode”) are clearly defined and will be added to WF-FND-006 (glossary) as needed
GitHub
. We double-check references to other documents to ensure we cite correctly and relevantly (for example, if we reference WF-FND-005 or WF-TECH-003, it’s indeed in context and correct). Part of consistency is also formatting: following the template, using the correct emoji markers, etc. We will flip through WF-TECH-003 and others to ensure we didn’t miss a section or use a wrong style (like our headings and lists should mirror those precedents). Passing this criterion means the document feels like part of the WIRTHFORGE corpus – consistent in voice and integrated in content.

By applying these validation criteria, we aim to ensure that WF-TECH-006 is not only a robust security design on paper but also a practically implementable and maintainable plan that upholds WIRTHFORGE’s highest ideals. Each criterion is essentially a lens to catch potential shortcomings: completeness to catch any missed scope, alignment to catch principle deviations, clarity to catch confusion, testability to catch hand-wavy claims, performance/UX to catch impractical solutions, and consistency to catch integration issues. The document will be iteratively refined under these checks, and only when all criteria are convincingly met will we consider this spec finalized and ready to drive implementation.

🔄 Post-Generation Protocol

After this Security & Privacy spec is drafted and approved, a series of follow-up actions will integrate WF-TECH-006 into WIRTHFORGE’s development and governance workflow:

Glossary and Documentation Updates: We will update WF-FND-006 (Glossary) to include any new security terms introduced. For example, terms like “Auth Token”, “Sandbox Policy”, “Trust Boundary”, “Broker Node” will be added with clear definitions, referencing this document as their source
GitHub
. If some terms existed but acquired a more specific meaning here (e.g. “Local-First” might now note “enforced via WF-TECH-006 measures”), we’ll tweak those glossary entries accordingly. We’ll also cross-check WF-META-001 (master guide) or any index that summarizes documents, to make sure WF-TECH-006 is properly described as the Security & Privacy spec in the context of the whole project. Essentially, we ensure the knowledge in this doc is not siloed: key points should be reflected in high-level documents (for instance, the Master Guide might list “Data never leaves device (see WF-TECH-006)” as a core attribute). This helps new team members quickly orient to our security stance.

Asset Integration: All artifacts produced (schemas, diagrams, code stubs, checklists) will be checked into the repository and linked with this doc. We will:

Add the diagrams to assets/diagrams and include them in the documentation site or wiki so they appear in the rendered docs. If the docs system allows, we will embed the SVGs or Mermaid live diagrams in the Security spec for clarity (with proper captions).

Place JSON schemas into assets/schemas (or a dedicated security/ folder) and ensure doc-index.json has entries or tags for them. Possibly update assets-manifest.yaml if such exists to list these new files as part of WF-TECH-006 deliverables.

Include code samples in a code/WF-TECH-006 directory in the repo, with clear README or comments so developers know how to use them. We may also integrate some of this code immediately into the main codebase (like implementing the auth middleware), depending on project timeline – if so, the spec will note which version includes these changes.

The audit checklist might live in the repository meta docs (maybe as WF-TECH-006-audit-checklist.md or integrated into an existing QA doc). We’ll confirm where to put it so it’s discoverable and version-controlled.

After adding, we’ll double-check that all references in this document to those assets (by name or link) are correct. E.g., if we said “see WF-TECH-006-plugin-permissions.json”, that file should exist now.

Dependency Graph and Cross-References Review: Now that WF-TECH-006 is defined, we need to update other documents that had forward references or dependencies on it:

WF-TECH-001 (System Startup) might have mentioned local data persistence or security in passing – we should insert a reference to this spec where appropriate (like in its Knowledge Checklist or cross-refs, “complies with security model in WF-TECH-006”).

WF-TECH-004 (State & Storage) already references privacy and WF-BIZ-002; we should ensure it also references this doc for security aspects (for instance, it mentions no external dependency
GitHub
, which is enforced here; we can add a note “(reinforced by WF-TECH-006 policies)”).

WF-UX documents: If any UI spec mentions using the WebSocket or API, it should note the requirement of auth token and such from this doc. Particularly, if a UX doc describes the UI’s architecture, adding “the UI will obtain an auth token per WF-TECH-006 to communicate” helps tie things.

WF-FND-005 (Module Philosophy) and WF-FND-007 (Module Strategy): since these talk about sandboxing and plugin integration, now that our spec is done, we can fill in any placeholders they had. For example, if FND-007 said “we will sandbox modules (see TECH-006)”, we now provide the specifics: perhaps excerpt a bit of our sandbox policy or at least ensure it’s not TBD anymore.

WF-BIZ-002 (Legal & Policy): This is important – the privacy policy or legal overview should now have concrete backing. We will collaborate with whomever writes BIZ-002 to incorporate statements like “All data is processed on-device and WIRTHFORGE’s architecture (see WF-TECH-006) prevents unauthorized data transmission.” Also if there are user-facing settings (like opting into cloud features), BIZ-002 can outline user consent steps which our design facilitates.

Also, update the Master Dependency Graph (maybe in WF-META-001 or a central diagram) to mark WF-TECH-006 as completed and show that it enables WF-BIZ-002 and WF-TECH-008. If any document was waiting on this (like plugin architecture TECH-015 might have been gated), we signal that now it can proceed using the foundations laid here.

Changelog and Versioning: We will assign a version number to this spec upon finalization, likely v1.0.0 (since this is the first full draft). In the project’s Changelog (perhaps CHANGELOG.md or a specific CHANGELOG-WF-TECH-006.md), we’ll record an entry like: “v1.0.0 – Established Security & Privacy architecture. Key features: local-only networking, TLS support, auth tokens, plugin sandboxing, data encryption. No known deviations from principles.” This provides a historical record. If during implementation any changes are made (for example, maybe we find that using TLS on Windows has an issue and we adjust to use an OS pipe instead), we’ll update the doc and bump a minor version, noting the change in the changelog. The governance (WF-FND-006) requires such traceability, and we’ll adhere to semantic versioning for the spec itself (meaningful changes like new requirements or design tweaks increment version appropriately). This way, anyone can see how the security design evolves over time and why.

Implementation & Prototyping: With the spec approved, the engineering team will move to implement these features. Part of post-generation is kicking off that work in a coordinated way. We’ll create tickets or tasks for each major item: e.g., “Implement auth token in API”, “Set up TLS on dev server”, “Create plugin sandbox scaffold”. During this phase, if any unforeseen challenges arise (say a library doesn’t support something), the team might need to adjust the spec. We have a process for that: discuss the needed change, ensure it still aligns with principles, update this document (and version bump). We note that no spec survives entirely unmodified after real coding begins – but because we included a lot of technical detail here, we hope changes will be minor. Still, the post-gen protocol includes a feedback loop: developers will feed implementation notes back into the doc. For instance, after implementing, we might add a line “Note: due to FastAPI limitations, we implemented token auth via cookie instead of header.” The idea is to keep the spec and the code in sync.

Security Review & Penetration Testing: Once initial implementation is done (or as it’s being done), we will schedule an internal security review. This could involve a separate security engineer or an external consultant reviewing the code and this spec side by side. The Post-Gen Protocol includes addressing any findings from that review. For example, the reviewer might say “Your random token should be at least 256 bits and use a CSPRNG” – we would ensure that and note it if not already explicit. Or they might test the app and find a header missing (like X-Frame-Options to prevent clickjacking) – that might be added to the spec as a new requirement and to the implementation. This step ensures an objective validation beyond the authors. We also plan to use tools (like OWASP ZAP for a quick scan, static code analysis for security) as part of QA. The results of these will feed into either confirming that our design is solid or highlighting tweaks. For any change, we follow governance: if it’s minor and doesn’t break principles, just update and log; if somehow a recommended change conflicts with a principle, that would escalate to a broader discussion (but that’s unlikely – most often security recommendations align with our principles, e.g., they'd never suggest sending data out).

Integration with QA/CI: We will integrate some security checks into the continuous integration pipeline. For instance, we might add a step that runs pip audit (to catch dep vulnerabilities) and another that runs a small script to ensure the server is binding to localhost (maybe not needed every build, but at least a test that fails if host is not 127.0.0.1). We can also include our JSON schemas in CI tests: e.g., if the codebase has sample plugin manifests, validate them against the schema as part of tests. The audit checklist could be partly automated too: e.g., one item could be “no calls to requests.get with external URLs” – we could grep the code in CI to flag any occurrence for review. Post-generation, we coordinate with the QA lead (if any) to embed these ideas. This ensures the security posture remains strong even as code changes – we don’t want someone later introducing an insecure feature unnoticed. By institutionalizing checks (some manual, some automated), we create a lasting guardrail.

User Communication & Documentation: As features roll out, we need to inform users (especially if something needs user action like accepting a cert). We plan to update user-facing documentation (like a README or help guide) to include a Security Notes section summarizing, in simple terms, what measures are in place and what the user might see. For instance, “WIRTHFORGE uses a self-signed certificate to secure the connection between its core and UI. The first time you run, your browser might warn that the connection isn’t trusted. It’s safe to proceed by accepting the certificate, or you can install the provided certificate authority to avoid warnings. See guide link…” This kind of guidance is crucial to ensure security doesn’t become a UX barrier. Post-spec, we’ll draft these notes and coordinate with whoever manages user docs or support. We’ll also ensure the privacy policy (once written) is visible to users and consistent (likely via the BIZ-002 doc or an in-app link to it). If any settings exist (like turning off data collection), we ensure they’re documented in the UI and default to secure.

Monitoring and Evolution: Finally, we outline how this security architecture can evolve. In governance terms, any future change that might weaken or alter these security measures must go through the formal proposal process
GitHub
GitHub
. We note in the protocol that WF-TECH-006 should be considered a “living” spec – as new threats emerge or new features (like multi-device access) are planned, this document should be revisited and updated. We likely set a periodic review (maybe annually or at major version releases) where the team reassesses if the threat model needs updating (e.g., if quantum computing breaks our encryption in 5 years, we’d revise to quantum-safe algorithms). Also, as users and community start using WIRTHFORGE, we keep channels open for security feedback – if someone reports a vulnerability, we will patch and update spec accordingly (with kudos if appropriate). We will add a note that any such incidents and responses will be added to the changelog for transparency.

By executing this Post-Generation Protocol, we ensure that WF-TECH-006 is not just a document but a driver of concrete improvements and practices in the WIRTHFORGE project. The spec becomes a living contract: it informs current development, adapts through review and feedback, and sets expectations for everyone (developers, users, auditors) about how seriously we take security and privacy. In the end, the success of WIRTHFORGE’s Security & Privacy will be measured not only by the absence of incidents, but by the confidence it instills – both in users trusting the platform with their data, and in the team’s ability to innovate without compromising on the project’s core values of local-first, user-centric computing. This protocol ensures that confidence is continually earned and reinforced at every step of WIRTHFORGE’s journey.