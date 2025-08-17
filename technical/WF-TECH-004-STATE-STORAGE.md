WF-TECH-004 — State Management & Storage (Energy + DB)
🧬 Document DNA

Unique ID: WF-TECH-004

Category: TECH (Technical Specification)

Priority: P0 (Core System Functionality)

Development Phase: 1 (Implementation-ready)

Estimated Length: ~3,500 words

Document Type: Technical Design & Specification

🔗 Dependency Matrix

Required Before This:

WF-TECH-001 – System Runtime & Services: Provides the overall architecture and orchestrator process that will initialize and interact with the state manager (ensures a zero-config local startup and service graph)
GitHub
GitHub
.

WF-TECH-003 – Real-Time Protocol (WebSockets): Establishes the 60 Hz streaming channel for events between backend and UI. This protocol is essential for capturing live events (energy updates, etc.) that the state & storage layer will persist
GitHub
.

WF-FND-002 – Energy & Consciousness Framework: Defines the energy metaphors and 60 Hz frame timing budget that underpin how we quantify and record computational “energy” usage in real time
GitHub
. It provides the conceptual model (Energy Units, frame cadence) that the storage design must respect.

Enables After This:

WF-UX-006 – Unified Energy Visualization & UI Specs: Consumes the persistent state and event streams to render real-time and historical energy visuals. With state management in place, the UI can request session history or subscribe to state updates for unified visualization across sessions.

WF-UX-001 – Level 1: Lightning Strikes: Relies on this subsystem to track the user’s initial session data and energy usage, enabling features like session replays and basic progress tracking in the Level 1 experience. The local storage ensures that even the simplest user experiences have a stable backbone of data (e.g., recording the “lightning strikes” from the first AI interaction).

Cross-References:

WF-FND-004 – The Decipher (Central Compiler): Defines the real-time events (e.g. energyUpdateEvent) and internal state structures (frameState, energyAccumulator) that this document will leverage
GitHub
. The state & storage design must align with Decipher’s event schema and ensure every event can be logged and audited without impeding performance.

WF-FND-006 – Governance & Evolution: Provides guidelines for versioning, metrics collection, and audit trails
GitHub
 that influence how data is stored and evolved over time. Our design adheres to these governance rules by implementing schema version control, audit logs, and no external dependencies (the “local-first” governance mandate).

WF-FND-001 – Vision & Principles: Establishes the local-first and no_docker_rule principles (no cloud or container dependencies) that are strictly enforced here
GitHub
. The storage system must operate entirely on local hardware, supporting user autonomy and privacy as outlined in the manifesto.

WF-BIZ-002 – Licensing, Privacy & Terms: Informs data ownership and privacy requirements. This storage design aligns with the privacy policy by keeping all user data on-device, providing full user control (export/delete), and never sending sensitive content to external servers (supporting compliance with local data ownership clauses).

🎯 Core Objective

Define a local-first state management and storage subsystem that persistently tracks WIRTHFORGE’s real-time energy state, session history, and user progress entirely on the user’s device, guaranteeing full data ownership and privacy. This subsystem must capture every relevant event and state change (energy updates, user actions, session milestones) in a durable, queryable form without compromising the 60 Hz frame update performance, thereby enabling seamless session continuity, auditability, and deterministic replays of the AI experience.

📚 Knowledge Integration Checklist

Local-First & No-Cloud Enforcement: The design uses only local storage (SQLite database by default, optional MariaDB if configured) and runs entirely on the user’s machine
GitHub
. No external cloud services or containers are required, in line with the WIRTHFORGE manifesto’s user autonomy and privacy promises. The system binds any service to localhost and never transmits state data off-device, upholding the no_docker_rule and ensuring offline capability by default
GitHub
GitHub
.

Real-Time Performance (60 Hz Loop): All state updates and persistence operations are engineered to fit within the 16.67 ms frame budget
GitHub
. We integrate with the 60 Hz Energy Telemetry Loop (from WF-FND-002) so that recording of events (e.g., energy usage per frame) does not introduce frame drops or lag. Non-blocking I/O and buffering are used to ensure that even at peak load (60 events/sec), writing to disk or updating in-memory structures never violates real-time constraints.

Event Sourcing & Auditability: The system implements an event-sourcing model where every significant event (energy emission, user action, system decision) is appended to a session event log in JSON format
GitHub
. This log serves as an immutable audit trail, enabling complete traceability – every visual effect or state change can be traced back to a logged event
GitHub
. We incorporate an “audit mode” where absolutely all outputs (including debug info) are logged for verification purposes. The design ensures that from these events, the entire session state can be reconstructed deterministically (supporting debugging and validation needs).

Schema Versioning & Data Integrity: Following governance guidelines
GitHub
, we define clear JSON Schema versions for all persisted data structures (energy events, snapshots, user state records). The storage layer includes a version check on startup: if an older schema version is detected in the database, a migration routine is invoked to update data to the latest format. This guarantees forward compatibility and evolution of the data models without breaking existing user data. Integrity checks (via automated validators) run to confirm that events and state records conform to the expected schemas, preserving consistency across updates.

WebSocket & Live State Integration: The state manager hooks into the Real-Time Protocol (WF-TECH-003) so that incoming live events and outgoing state updates are synchronized between the in-memory state and UI. Every 60 Hz energyUpdateEvent emitted by the Decipher is not only broadcast to the UI via WebSocket, but also logged to the local database
GitHub
. Conversely, important user-generated events (e.g., user prompts or interactions) are captured and stored, in addition to being handled in real-time. The design ensures the storage layer and the WebSocket layer share the same event schema (no transformation needed), using the exact JSON event formats defined in the Decipher spec
GitHub
. This guarantees a strict contract between front-end and back-end data representations and that logging is literally capturing the same objects sent to the UI.

User Progress & Data Ownership: The solution treats user progress data (e.g. levels unlocked, session counts, cumulative energy usage) as first-class persisted information, so the platform can adapt to the user’s journey (per WF-FND-005’s progression policies) while storing this data locally. All user-specific data is owned by the user – we provide straightforward tools to export or backup this data (e.g., via a CLI command) and to purge it if the user requests, aligning with privacy requirements in WF-BIZ-002. No hidden caches or cloud sync are used; the user can inspect their data (human-readable JSON/YAML logs) at any time. Additionally, for privacy, the system avoids storing raw AI conversation content in long-term storage by default
GitHub
. Only abstracted metrics and events (energy counts, timestamps, event types) are logged, ensuring that sensitive text remains transient and local to the UI unless the user explicitly opts to save transcripts.

📝 Content Architecture
1) Opening Hook – Capturing Lightning in a Bottle

When a WIRTHFORGE session runs, AI “lightning” is constantly striking in the form of rapid-fire tokens and energy bursts. This section introduces how we capture those sparks in a bottle – preserving the ephemeral 60 Hz energy flares as a lasting record that the user controls. Imagine a real-time journal that writes down every flash of insight (energy pulse) and every user action the moment it occurs, all on your device. The user sees a dynamic visual of the AI’s energy in the UI, and simultaneously, backstage, a ledger is being written to – a secure local diary of the session’s life.

This opening paints the picture of trust through transparency: even if the AI session is as quick and elusive as lightning, WIRTHFORGE’s state management ensures there’s a robust memory of it. For example, as the AI generates a flurry of tokens that light up the UI with energy particles, the system is logging each “energy update” event with timestamp and metrics. If the app suddenly closed or the user wants to rewind, that energy trace is safely stored and can be replayed. All of this happens without any cloud service or external database – it’s like having a “black box” flight recorder for the AI running locally. The user can later open this black box to analyze what happened, replay the experience, or simply trust that nothing was lost in the moment. By setting this scene, we underscore why State & Storage is critical: it turns WIRTHFORGE from a transient experience into one with memory and continuity, owned entirely by the user. The hook emphasizes the core promise – what happens in WIRTHFORGE stays in WIRTHFORGE – as every joule of “energy” and every step of progress is captured under the user’s sole custody.

2) Core Concepts – Energy State, Session History, and User Progress

In this section, we define the key concepts and components that make up the state management and storage design:

Local Energy State: “Energy state” refers to the live metrics and status of the AI’s computation at any given frame. This includes values like the current energy output of the AI model (e.g., tokens per second translated into Energy Units (EU)), any ongoing “accumulated” energy for the session, and transient pattern states (like whether interference or resonance has been detected this frame). The frame state is the in-memory representation of these metrics at the granularity of a single 1/60th second frame. It might contain fields such as the frame timestamp, energy produced in that frame, smoothed values from an EMA filter, and flags for special events (e.g., an interferenceDetected = true if multiple streams overlap). This frame state is updated continuously by the Decipher engine. We treat this as an ephemeral structure optimized for speed (it lives in Python memory or shared memory), and we ensure it can update at 60 Hz reliably. Only necessary parts of the frame state are persisted – we don’t write 60 updates per second to disk (that would be overkill and could hurt performance). Instead, we log summary events or important changes. For example, the system might generate an energyUpdateEvent at the end of each second or when certain thresholds are crossed, rather than every frame, to record noteworthy state changes while keeping the log concise. The energy accumulator is another concept here: it’s essentially a running total of energy expended since the session started (e.g., cumulative token count or compute effort). This accumulator is part of the state; it lives in memory for quick updates each frame and is periodically saved (to ensure it’s not lost on a crash). By defining energy state this way, we capture both the instantaneous picture (frame-level) and the running context (accumulations, trends) of the AI’s activity.

Session History (Event Log): Rather than storing just the end state, WIRTHFORGE embraces an event-sourcing approach for session data. The Session Event Log is an append-only log of discrete events that occur during a session. Each event is a JSON object conforming to a schema (we define schemas for each event type, such as energy.event for energy updates, experience.event for user-visible outputs, user.action for user inputs, etc.). Examples of events include: an energyUpdateEvent with fields like energy amount, frame ID, timestamp; a userPromptEvent when the user submits a query or instruction; an aiResponseEvent when the AI produces an output; an experienceEvent for major UX milestones (like completing a “Door” or level). This log essentially narrates the session. It’s stored in the local database in chronological order. We also support exporting this log as a human-readable YAML or JSON file for the user (e.g., a user can save their session history as session-2025-08-17.yaml to revisit later). The concept of audit trail is inherent in the session history – because we log every key event with a timestamp and a unique ID, we can later audit what happened. For instance, if the UI shows an unexpected spike in energy, one can check the log and find the exact energyUpdateEvent and possibly an associated tokenStreamEvent that caused it, complete with timing and source. The event log is immutable for the session (events are never updated or deleted during the session), ensuring consistency. If a correction is needed (say an event was mis-logged), a new event would be issued (like an error or correction event) rather than altering history. This concept aligns with the principle that the system’s behavior is fully traceable and deterministic: given the same sequence of events from the log, one should be able to replay them and reconstruct what the UI showed.

User Progress State: Beyond ephemeral session data, WIRTHFORGE also maintains a persistent user profile/progress record. This includes what “level” or stage the user is in (e.g., have they unlocked Level 2 “Parallel Streams”?), which “doors” they have opened, any achievements or usage statistics, and configuration preferences that need to persist across sessions. The user state is stored as a small JSON-structured record (or set of records) in local storage. Key fields might be: userId (although for a local app this might just be one default user or device ID), currentLevel, unlockedPaths, totalSessions, totalEnergyConsumed (lifetime aggregate of energy units over all sessions, feeding into metrics for the user’s journey), etc. This user state is loaded at startup (to configure the experience appropriately, e.g., enabling or disabling certain features per the progression system WF-FND-005) and saved whenever it changes (for example, when the user completes a session that increases their progression or when they adjust a setting). The concept here is full ownership and transparency: the user’s progress is not hidden in some cloud or behind an opaque account system – it’s right there in a local database or file that the user can inspect. If the user wants to back it up or modify it (not recommended except via the app UI), they can, since it’s just data on disk under their control. This persistent state ties in with business/legal (WF-BIZ-002) requirements that users can export or delete their data: for instance, a user could delete their progress file to “reset” the app, or copy it to another machine if they wanted to transfer their experience. We ensure that user consent and intent govern this data – nothing is ever uploaded without permission, and the user is empowered to manage it.

JSON-First Schema Design: A unifying concept for all of the above is that our data structures are defined in JSON schemas first, and the storage implementation is built around those schemas. Instead of starting with relational tables and squeezing JSON in, we start with a rich JSON representation (since the data – events and states – are naturally hierarchical and semi-structured). We then map these JSON schemas to the storage layer. In practice, this means we have well-defined JSON Schema files for things like EnergyState, Event types, Snapshot, etc., and these are versioned. SQLite is used as the primary store, with either columns matching JSON fields or a JSON column depending on the case (SQLite has JSON support through JSON1 extension). For example, for the event log, we might use a table events(session_id TEXT, timestamp TEXT, type TEXT, data JSON) – here the data column holds the full JSON event (which adheres to one of our schemas) and separate columns for quick filtering like type or timestamp. This JSON-first approach means even if the underlying DB is relational, the contract of the data is a JSON document, making it easier to export, visualize, and evolve (adding a new field in a JSON schema is easier than altering a bunch of table columns, and we can use dynamic JSON queries to access it). Moreover, it aligns with the system’s philosophy of transparency: JSON is human-readable and easily convertible to YAML, so a user or developer can look at the stored data without needing proprietary tools. MariaDB optional support is provided simply because some advanced users might prefer a more robust SQL engine or already have it set up; but even with MariaDB, the design remains JSON-first (MariaDB has JSON column support as well). We explicitly only allow MariaDB in a local configuration (pointing to a local file or socket) – not a cloud instance – to remain within the local-first boundary. If configured, the system will create the same tables in MariaDB instead of SQLite, but the higher-level code doesn’t change at all – thanks to using SQLAlchemy or a similar abstraction, switching DB backends is seamless and purely user-configured. In all cases, no external network calls or credentials are involved for databases.

Snapshot and Recovery: Another concept is how we handle snapshots. While the event log allows full replay, it may become inefficient to replay a very long log for recovery. So the state manager implements periodic state snapshots – essentially a dump of the entire relevant in-memory state at a point in time (for example, at the end of each session, or every N minutes for long sessions). A snapshot contains things like the current accumulator value, any ongoing patterns or context needed to resume, and references (or keys) to the last events. Snapshots are stored in the database (or a file) as JSON blobs, each tagged with a version and timestamp. The concept of version resilience means that each snapshot is tagged with the schema version it’s using, and the loader can handle older versions (possibly via migration or backward-compat code). Recovery is the process of restoring the in-memory state from the most recent snapshot and then replaying any events that occurred after that snapshot. We design the recovery routine to be robust: if the app crashes or is closed ungracefully, on next startup it will detect an “unclean shutdown”, then automatically load the last snapshot and replay the event log from that snapshot’s timestamp forward. The result is that the user’s session can be reconstructed up to the last committed event before crash – often with no perceptible loss. This gives the system a deterministic replay capability: not only for crash recovery but also for debugging and testing (developers can feed an older log into the system to reproduce an issue exactly). We will delve into how this is implemented in practice in the next section.

By establishing these core concepts – energy state at 60Hz (ephemeral vs persistent parts), event log for session history, user progress for cross-session data, and a JSON-centric, snapshot-augmented persistence approach – we set the foundation for the implementation. These concepts ensure that our state management is not just a database, but a living, evolving narrative of the WIRTHFORGE experience that remains under the user’s control.

3) Implementation Details – Architecture & Algorithms

Now we dive into the concrete design and steps for implementing the state and storage system. This covers the database schema, in-memory data handling, routine operations (logging events, taking snapshots), and the code structures or algorithms that make it all work efficiently.

3.1 Local Database Schema (SQLite): The local database serves as the durable store for all session and user data. We design it in a normalized yet JSON-friendly way. Key tables and their schemas are as follows:

session table: stores metadata about each session (run) of WIRTHFORGE. Columns: session_id (primary key, could be a UUID or timestamp-based ID), start_time (datetime), end_time (datetime, null if session is in progress), version (schema version used), and perhaps summary stats like total_energy (cumulative energy consumed in that session) for quick reference. Each time the user starts WIRTHFORGE (from launch to exit), a new session record is created.

event table: stores the event log. Columns: event_id (primary key, could be autoincrement or a GUID), session_id (foreign key to session), timestamp (datetime, ISO 8601 string or numeric), type (text, e.g., “energy.update”, “user.prompt”, etc.), and data (JSON blob containing the full event details as per schema). We index by session_id and timestamp so we can retrieve events for a session quickly in order. The JSON in data includes all fields defined by that event’s schema (for example, an energy update event might have { "eu": 5.3, "frame": 1234, "model": "Llama2-7B", ... }). By storing the whole JSON, we ensure forward compatibility (new fields get stored without requiring new columns).

snapshot table: stores state snapshots for sessions. Columns: snapshot_id (PK), session_id (FK), timestamp (when the snapshot was taken), state (JSON blob of the snapshot), version (schema version of the snapshot format). We may take a snapshot at the end of each session and potentially interim snapshots for long sessions. Snapshots allow fast recovery: instead of replaying from the very start, we can load the last snapshot and then replay only events after that point. The state JSON will include things like accumulator totals, last processed event ID, and any other needed context (it might also include some cached model or orchestrator state if relevant, though most of that is reconstructed via events).

user table (or user_state): stores the persistent user profile (likely just one row for single-user scenario). Columns: user_id (PK, maybe just “default”), level (int for current unlocked level), experience_points or similar (if we quantify progress), preferences (JSON for any user settings), and aggregate stats like total_sessions, total_energy. This table is small but important for tying into UX progression and for displaying stats to the user. If multiple profiles were ever supported, this table structure accommodates it, but normally there's one primary user row.

audit table (optional or merged): We might not need a separate audit table since the event log itself serves as an audit trail. However, if governance (WF-FND-006) requires tracking certain sensitive changes (like security-related events or policy changes), we could either log those as special events or maintain an audit log table. For now, assume the event table, with its variety of event types (including system events), suffices.

Below is a simplified entity-relationship diagram of these tables and relationships (shown with Mermaid syntax):

erDiagram
    USER ||--o{ SESSION : "starts"
    SESSION ||--o{ EVENT : "has many"
    SESSION ||--o{ SNAPSHOT : "has snapshots"
    USER {
        string user_id PK
        int currentLevel
        int totalSessions
        float totalEnergy
        JSON preferences
    }
    SESSION {
        string session_id PK
        datetime start_time
        datetime end_time
        int version
        float total_energy
        string user_id FK
    }
    EVENT {
        int event_id PK
        string session_id FK
        datetime timestamp
        string type
        JSON data
    }
    SNAPSHOT {
        int snapshot_id PK
        string session_id FK
        datetime timestamp
        JSON state
        int version
    }


Figure: Entity-Relationship diagram of the local storage schema (tables for user profile, session, event log, and snapshots).

For SQLite, the schema can be created with a SQL script (deliverable WF-TECH-004-DBSchema.sql) containing CREATE TABLE statements reflecting the above structure. We ensure foreign key constraints are enabled (SQLite needs PRAGMA foreign_keys = ON), so that deleting a session can, for example, cascade to its events and snapshots (useful for a “delete my data” feature). Additionally, we use transactions when writing events to ensure consistency (multiple events or an event plus a snapshot can be committed atomically if needed).

3.2 In-Memory State Management: On the in-memory side (runtime), the State Manager is implemented as a Python module (part of the orchestrator process, likely layer 3). This component holds the live frameState and related structures, and provides an interface to log events and update the database asynchronously. Key elements of the implementation include:

An in-memory data structure for the current state, e.g., a Python dict or a lightweight dataclass object that contains fields like current_energy_level, accumulator_total, frame_count, and references to any active phenomena (like current_interference_pattern if any). This structure is updated every frame by the Decipher engine’s loop. For example, each time Decipher computes new energy values from incoming tokens (say 60 times a second), it calls a method like state_manager.update_frame_state(energy_delta, metrics) which updates the in-memory state accordingly. This update is very fast (just assignments and maybe some calculation for smoothing). We make sure this update function is non-blocking and does not perform any I/O. It might enqueue an event for later but returns immediately to not stall the 60Hz loop.

A thread or coroutine for persistence: To avoid disk I/O on the main thread (which could cause a frame drop), we employ an asynchronous mechanism for writing to the database. For instance, we might use Python’s asyncio with a background task that listens on an internal queue of events. When Decipher produces an event (like an energy update), the State Manager enqueues that event (in memory), and the background task will pick it up and write it to SQLite. This decoupling ensures that even if the disk write takes a few milliseconds, it doesn’t block the real-time loop. If the queue starts to build up (e.g., if disk is unusually slow), we can have a strategy: drop non-critical events or combine multiple events into one transaction to catch up. This is part of meeting the real-time budget – by design, logging is eventual (a slight buffer) rather than immediate synchronous at every frame.

Efficient data structures: We use batching for writes – e.g., accumulate events for 200 ms and write 12-15 events in one go, rather than 60 separate writes per second. SQLite can handle many writes per second, but batching improves throughput and reduces wear on disk (especially if on SSD). The batch size is tuned so that in worst case (burst of events) it still doesn’t violate memory constraints or lose data. Also, reading is needed for certain operations (like loading a snapshot or retrieving user state). Those reads are infrequent (startup or end of session) and can be synchronous. But any read that might happen during a session (like the UI requesting some stats) is done asynchronously too, using the same queue or an async interface.

Data Validation Hooks: Each time an event is about to be persisted, we optionally run it through a validator (a function or schema check). In Python, we might use a library like jsonschema with our JSON Schema definitions to validate the event structure. This can be done in the background thread to not slow down the producer. Invalid data should theoretically never occur if all producers adhere to the contract, but having this check is a governance requirement (no invalid data should slip into persistent store). If a validation fails, the system can log an error event and either drop the bad data or attempt a correction if possible. Similarly, after writing, we could have integrity assertions (like foreign key constraint checks which the DB enforces, or sanity checks such as monotonic timestamps).

3.3 Event Logging & Structure: The actual content of events follows the schemas defined (deliverables WF-TECH-004-events.json and WF-TECH-004-energy-state.json cover these). Some key event types and their usage in implementation:

Energy Update Event (energy.update): Emitted at a controlled frequency (not necessarily every frame; could be aggregated to, say, 10 Hz or only when changes exceed a threshold) to record the state of the energy metrics. Fields might include session_id, timestamp, frame_id, energy (energy units at this moment), accumulator (total energy so far), model_id (which model produced this, if multiple possible), and maybe fps (to log if frame rate is holding). This event is created by Decipher’s energy loop and handed to the State Manager, which queues it for DB and simultaneously packages it to send over WebSocket to the UI. By logging these events, we create a timeline of the AI’s activity.

User Action Event (user.action): Whenever the user does something significant (enters a prompt, clicks a special control, chooses a suggestion, etc.), an event is created. For a prompt, for example, it could be user.prompt with data: the prompt ID, maybe an anonymized or hash of the prompt text (since we might not store raw text), and a reference to any energy cost (perhaps starting a new session or context). If the user toggles a setting or triggers a “pause,” those can be events too. The code capturing user events might reside partly in the UI; however, the design is that the backend is the source of truth for events. That means even if the UI initiates something, it should go through the backend (via WebSocket or API) and then the backend logs it. This prevents discrepancies where the UI thought something happened but the backend missed it. Implementation-wise, when the UI sends a message (like a prompt event) to the FastAPI server, the backend handler will log the event and then forward it to Decipher to act on it.

AI Output Events (experience.output or ai.tokenStream): As the AI generates output tokens, Decipher will emit events (possibly one per token or a batch per frame). These events might contain the token content, or for privacy, we might segregate them. Our design choice is that detailed token-level events may not be fully persisted by default (to avoid storing possibly sensitive content), but we might log aggregate or reference. For instance, we can log an event that “response X started at time Y and ended at time Z, producing N tokens,” without recording every token. However, to support deterministic replay of the exact same UI, we have to consider whether storing the tokens is necessary. We could allow an opt-in debug mode where full token streams are logged (still locally). In normal mode, we log just enough to regenerate energy patterns but not the exact text. This is a trade-off between privacy and reproducibility. The code for handling AI outputs will likely interact with both the Decipher and the state manager: Decipher raises events for tokens or message completion, and state manager decides how to log them (full or summary).

System Events and Errors: The design also includes logging system-level events, like system.start (when a session begins), system.end (session closed normally), and error events (error type) if something goes wrong (e.g., model fails to load, or a late frame occurrence). These are crucial for audit trails. The implementation in orchestrator (TECH-001) will call the state manager at appropriate points: e.g., after all init complete, log a system.start with some info; on shutdown, log a system.end with duration, etc. The state manager provides simple APIs like log_event(type, data_dict) that other parts of the system can call.

To illustrate, here is a YAML snippet example of what a portion of an event log might look like (for human-friendly viewing):

- session_id: "20250817T190000Z_001"
  timestamp: "2025-08-17T19:00:05.123456"
  type: "system.start"
  data:
    version: "1.0.0"
    user_id: "default"
    model_id: "ollama/llama2"
    mode: "offline"
- session_id: "20250817T190000Z_001"
  timestamp: "2025-08-17T19:00:05.130000"
  type: "user.prompt"
  data:
    prompt_id: "abc123"
    interface: "text"
    truncated: false
- session_id: "20250817T190000Z_001"
  timestamp: "2025-08-17T19:00:05.150000"
  type: "energy.update"
  data:
    frame: 1
    energy: 4.2   # Energy Units in this frame
    accumulator: 4.2   # total so far
    model_id: "ollama/llama2"
    fps: 60
- session_id: "20250817T190000Z_001"
  timestamp: "2025-08-17T19:00:05.167000"
  type: "ai.output"
  data:
    token: "Hello"
    prompt_id: "abc123"
    token_index: 1
    is_last: false
- session_id: "20250817T190000Z_001"
  timestamp: "2025-08-17T19:00:05.183000"
  type: "energy.update"
  data:
    frame: 2
    energy: 5.0
    accumulator: 9.2
    model_id: "ollama/llama2"
    fps: 60


(This is an illustrative excerpt of events: a session start, a user prompt event, an energy update at frame 1, an AI token output event, another energy update at frame 2, etc., in YAML form.)

The actual implementation will store these in the database as described, but this shows how the events capture both user actions and system updates in lockstep.

3.4 Snapshots & Recovery Routines: We implement snapshot creation and recovery as follows:

Taking a Snapshot: A snapshot is essentially a serialized dump of the important parts of memory state. The State Manager includes a function like create_snapshot(session_id) that collects current state: e.g., accumulator_total, current frame number, any incomplete AI output (if, say, mid-response), and other context. It then writes this into the snapshot table (with a new snapshot_id and timestamp). We might trigger create_snapshot in a few scenarios:

On graceful shutdown of a session (user closes the app or ends a session) – a final snapshot to mark end-state.

Periodically during long sessions – e.g., every 1 minute or 1000 events, whichever comes first. This ensures that if a crash happens, we don’t have to replay too far.

Before applying a migration – if we are about to upgrade schemas, perhaps snapshot the state in old version, just in case (for rollback).

The snapshot writing is done carefully: we use a single transaction to write the snapshot and possibly mark its session record with a “snapshot taken at X”. This way we know which snapshot is latest for each session.

Recovery Process: When WIRTHFORGE starts up (or when a session is started), the orchestrator (TECH-001) will check if the previous session ended cleanly. This could be done by looking at the last session record: if end_time is null or a flag abnormal_termination is true, then we have an unclean shutdown. In that case, the orchestrator will invoke the State Manager’s recovery routine. The routine goes:

Find the latest snapshot for that session (if any). If found, load it (which gives an in-memory state).

Then query the event log for all events for that session with timestamp after the snapshot’s timestamp (or after last applied event if snapshot stored that).

Replay those events in order by feeding them through the same handlers that would run in real time. For example, if a user.prompt event is encountered, it might reinject that prompt into Decipher (or mark as already processed if the snapshot indicates the AI was mid-response). For energy.update events, it might update the in-memory accumulator (though ideally the snapshot already has final accumulator up to that point, so maybe those can be skipped or just used for verification).

The replay happens quickly (faster than real-time, since we can process events back-to-back). We build the state up to the last event that was logged. After that, the session can continue as if it never stopped. One challenge is if an AI generation was in progress; in such case, we might have to restart that generation or mark it as interrupted. We’ll note that limitation, but often the events will include an error event if something cut off unexpectedly, which the UI can handle (like show a warning).

The end result is that upon recovery, the user sees the UI exactly as it was (or very close) before the crash: all the energy visuals up to last logged frame, and any partially completed output can either resume or be cleanly indicated. We treat recovery as a special kind of session start (perhaps continuing the same session ID or starting a new one that references the old).

Version resilience: If the snapshot is from an older version of the schema, the recovery loader will detect a version mismatch. In such cases, we invoke a migration function specific to snapshots (e.g., if a field was renamed or structure changed between versions, we translate the old JSON to new format before applying it). Because snapshots and events are stored as JSON, migration is relatively straightforward: a Python script can load the JSON, tweak keys, etc. We maintain a small migration map or use the JSON Schema definitions (with deprecated or replacedBy annotations if any) to guide this. Similarly, for events, if an old event type is deprecated, we either skip it or convert it to a newer equivalent event during replay.

Testing recovery: We implement unit tests (see WF-TECH-004/state-consistency.spec.md deliverable) to simulate a crash and ensure that after recovery, the in-memory state matches what it would have been without the interruption. For instance, run a session for X events, take a snapshot, then “crash” (stop processing), then load snapshot and replay events – the final accumulator and other state should match an uninterrupted run. The code for snapshot and recovery will be carefully reviewed for race conditions (we don’t want to snapshot while events are being written; we might pause event writing briefly or coordinate via locks when snapshotting).

3.5 Data Integrity and Validation (Python Logic): The implementation includes a Data Validator component (which could be a part of State Manager or a separate utility) that can be run to verify the integrity of stored data. This is essentially a script or function that goes through the database and checks for consistency:

All events referenced by snapshots exist and vice versa (no missing event IDs).

Timestamps are non-decreasing within a session.

Foreign key relations (each event’s session_id matches a session record, etc.) are intact (the DB enforces this, but an extra logical check doesn’t hurt).

The JSON in each event and snapshot conforms to the latest schema (or the version they claim). For each JSON blob, we attempt to validate against the appropriate JSON Schema. If an older version is encountered, the tool can flag it or even auto-upgrade it if possible.

Check that accumulators and totals are internally consistent: e.g., the final snapshot’s total_energy equals the sum of all energy.update events’ energy values (within tolerance or accounting for any resets).

This validator can be run as part of a maintenance CLI tool or during development tests. It helps catch any bugs in event logging (for example, if an event was not logged due to a crash, we might find a mismatch where the session’s total_energy doesn’t equal the sum, prompting investigation).

3.6 Tools and Scripts: To support the system, a few scripts/tools will be implemented:

Replay Tool: A command-line or Python tool (deliverable WF-TECH-004-replay.py) that reads a session event log (from the DB or an exported file) and replays it through the system’s logic to reproduce outputs. This can be used by developers to debug or by the system itself for validating that changes haven’t broken determinism. It will instantiate a Decipher in a special mode where instead of connecting to a live model, it consumes events from the log to simulate model outputs. The tool can output a summary or even regenerate the UI visuals in a headless way (e.g., generating a timeline of energy values to compare with original). For now, the primary goal is to check that given the same input events, the same state results.

Backup & Export CLI: A simple CLI (deliverable WF-TECH-004-backup-cli.py) that allows the user or an admin to export all their data. This might provide commands like backup --format zip --include-media which would dump the SQLite file or convert the DB contents to a JSON/YAML bundle. Since all data is local, this is straightforward: the tool can just copy the database file (as a backup) and/or execute SQL queries to output data in JSON. Similarly, an export could produce a sanitized log of a session (with or without AI text) that a user could share for troubleshooting or keep as a record. Importantly, the tool also supports delete or reset operations in line with privacy terms (e.g., backup-cli.py purge --session 20250817T190000Z_001 to delete that session’s data, or purge --all to wipe everything for a fresh start, after confirming). These operations essentially run DELETE statements on the appropriate tables and possibly remove any files (if snapshots were stored as separate files).

Migration Script Template: As the system evolves, if we introduce changes to how data is stored (new tables, new fields), we will include migration instructions. We provide a template (deliverable WF-TECH-004-migrate-template.sql or a Python migration script) that shows how to perform a basic schema migration. For example, if we decided to add a new column or split one table, the template illustrates using SQL (or SQLAlchemy migrations) to alter the table, and perhaps how to update existing JSON data by running an UPDATE that calls a JSON function. Although this is more of a developer deliverable, including it ensures that when we bump schema versions, we have a tested path to upgrade user data in place without requiring a reset.

3.7 Integration of FastAPI and Flask: The architecture calls for using FastAPI to serve the backend API and WebSocket, integrated with a central Flask-based hub if applicable. In practice, we will likely run the FastAPI app (possibly via Uvicorn) as the main web server for the application, because it can handle both REST and WebSocket with high performance and async support
GitHub
. The mention of a “central Flask hub” can be interpreted as either an earlier design or the idea that parts of the application (maybe the orchestrator or an admin console) were initially planned with Flask. We have decided to consolidate on FastAPI for the runtime services, due to its async nature which aligns well with our needs (e.g., writing to DB asynchronously, handling WebSocket events). The integration is as follows: the orchestrator (TECH-001) on startup launches the FastAPI server, but we can still use Flask for specific tasks like serving a UI (if it’s a local web UI, Flask could serve static files). However, FastAPI can do that too. So effectively, the storage system exposes certain HTTP endpoints via FastAPI that allow retrieval of stored data:

e.g., GET /api/sessions/{id}/events to fetch event log for a session (with pagination maybe),

GET /api/user/state to fetch user profile info,

POST /api/export to trigger an export (which might just return a file or prepare one).

These endpoints simply query the local DB and return JSON, making sure to do so asynchronously (using something like await database.fetch_all(query) with an async DB driver). They are protected (if needed) by the fact that everything is local; we might not need auth for local API, but perhaps a token could be used if the UI is web-based to prevent other local apps from accessing (a minor concern).

Additionally, the WebSocket integration (TECH-003) is critical: the FastAPI WebSocket route will on each new event broadcast it to connected clients. Our State Manager can have hooks such that when an event is logged, it also emits it via an internal pub-sub to any WS connections. FastAPI’s event loop and our background tasks for DB writes can safely coexist via asyncio. If the orchestrator was using Flask for something, that can run in the same process if needed, but likely we keep things simple: one FastAPI app.

Finally, no cloud dependencies is reiterated here: even though FastAPI is a web framework, it’s serving to localhost only
GitHub
. In code, we ensure the server defaults to 127.0.0.1 and a config flag would be needed to even allow external binding (which might be useful for power users wanting to connect a second device as a client, but that’s beyond our core scope). By default, all integration points (UI, orchestrator, storage) communicate internally on the device.

The implementation details above give the exact blueprint of how to build the state management: database setup, Python logic for real-time handling, and integration with the rest of the stack. Next, we consider how this integrates and interacts with other modules and what assurances we have that it meets quality goals.

4) Integration Points – Connecting the Dots Across Layers

This section describes how the State & Storage subsystem hooks into other parts of WIRTHFORGE, ensuring a seamless flow from data generation to persistence to usage in UI and other subsystems:

Integration with Orchestrator (TECH-001): During system startup (zero-config boot), the orchestrator is responsible for initializing the state management subsystem
GitHub
GitHub
. Concretely, this means:

The orchestrator calls a setup routine (e.g., state_manager.init()) early in the startup sequence. This routine will open/prepare the local database (apply migrations if needed, ensure the schema exists by running the DDL if it’s the first run) and load the user profile. If the user profile doesn’t exist (first run ever), it creates a default entry with initial values (Level 1, etc.).

The orchestrator also passes context like the chosen database backend (SQLite vs MariaDB) and the file paths from config into the state manager at init. This way, if a user has configured an external file path or different DB, it’s applied. But notably, orchestrator will not proceed if the DB fails to open – it will log a fatal error and halt with a message, because running WIRTHFORGE without state persistence would violate assumptions (we treat the state DB as critical infrastructure).

After init, the orchestrator, as it starts up other components (e.g., the model, the WebSocket server), will connect event hooks: for example, orchestrator might have an event bus internally. The State Manager subscribes to certain events: when the model is loaded, when a new session is starting, etc., and logs those as events. The orchestrator basically announces “session start” with details, and the state manager logs the system.start event as shown earlier.

When shutting down, orchestrator calls state_manager.shutdown() which will gracefully close the database (ensuring all queued events are flushed to disk) and possibly write the final snapshot for the session. It also marks the session record with end_time. If the shutdown is orderly, it sets a flag indicating a clean exit. This integration ensures that the next startup can detect if last time was clean or not.

Integration with Decipher (FND-004 / TECH-005): The Decipher engine (which runs the 60Hz loop and processes AI outputs) is a primary producer and consumer of state information:

As a producer: Decipher generates energy metrics and events as it runs. We integrate by having the State Manager register callback hooks with Decipher. For instance, Decipher might have a callback list for “onFrameComplete” or “onTokenProcessed”. The state manager’s hook would be called with relevant data (like “frame ended, X energy this frame”). The hook then creates an event and queues it as described. Because Decipher operates in real-time, these hooks are designed to be minimal (just capturing data and queueing it). Decipher will also call into State Manager for events like interference detected, resonance pattern started, etc., if those concepts are part of FND-004 – essentially any time the Decipher wants to inform the rest of the system of something, it goes through the state manager (which logs it and forwards to UI).

As a consumer: Decipher may need to read from state storage in some cases. For example, if WIRTHFORGE supports continuing a conversation from a previous session, Decipher might need to load some state (like the last user prompt, or a cached model state). Our state system can provide that by retrieving the last snapshot of a previous session. However, by design, each session is separate (unless we implement multi-session continuity explicitly). But one clear consumer case: energy accumulator. Decipher might not inherently know how much energy was used in previous sessions or earlier in the session if it restarts. The state manager provides an API like get_accumulated_energy() which Decipher could query at session start or any time to adjust its internal calculations or UI displays. Another case: for experience orchestrator (FND-005), certain triggers might depend on historical data (e.g., only allow a user to open a certain path if they’ve had at least N sessions or consumed N energy). The orchestrator or Decipher could fetch that info from the state manager (which reads from user profile data). Essentially, the State Manager becomes the single source of truth for any data that needs to persist or be counted beyond the immediate scope of one frame’s computation.

Integration with WebSocket Protocol (TECH-003): We have touched on this, but in detail:

The FastAPI WebSocket server (established in TECH-003) is the channel to the front-end. State Manager integrates by broadcasting events to WebSocket topics. For simplicity, we might have one main channel for all events initially (the UI will filter by type). So when State Manager logs an event, it also pushes it out on the WS. Because our events are already JSON and conform to schemas known by UI, this is straightforward. For example, when an energy.update event is logged, simultaneously an in-memory copy of that JSON is sent to all connected clients (there might just be one client, the local UI).

Conversely, when the UI or any external source sends a message via WS (like a user prompt event, or a command), the FastAPI handler for that will call the State Manager to log it and then forward it to the appropriate internal logic (like Decipher). This ensures even user-initiated events go through State Manager.

One subtle integration point: initial state sync. When a UI client connects (or reconnects), it may have missed some events (especially if it connected after session start or after a glitch). The state system, upon a new WS connection, can send a snapshot or the latest state immediately to bring the client up to speed. For example, it might send the most recent accumulator value and any ongoing event information. We might define a special message type state.sync or reuse snapshot for this purpose. The implementation listens for the on_connect event of WebSocket and responds by querying the current state (which could just be the last snapshot or the last few events) and emitting them to that client. This way, even if the UI reloads, it can get the session history quickly.

We ensure that WebSocket message structure exactly matches what we log (no divergence). According to TECH-003’s design, messages are JSON and include energy, experience, etc., and they align with Decipher’s outputs
GitHub
. Our State Manager uses those same schemas for DB, so the UI and DB are essentially “two consumers of the same stream.” This alignment greatly reduces bugs – if the UI can parse it, the DB can store it and vice versa.

Integration with UX Components (UX-001 & UX-006): The persistent state enables richer UX features:

UX-006 (Unified Energy Visualization): This document will detail how the UI visualizes energy over time and across sessions. Our integration is that the UI can query historical data to show trends or summaries. For instance, UX-006 might include a dashboard of your “energy usage today” or a replay slider. The State Manager provides APIs or endpoints to get this data. We anticipate providing an endpoint like /api/sessions/today/summary that returns total energy and events from today’s sessions, or even pre-aggregated data for performance. The design ensures that storing data in JSON doesn’t hinder such queries: we can still do SQL aggregations or use the JSON each event to compute stats.

The visualizations in UX-006 are also governed by what data is available. Since we log at least a subset of frames (maybe not every single frame’s energy but many per second), the UI can draw a continuous graph of energy over the timeline of a session. If needed, we could even allow the UI to subscribe to an event stream of historic data for a “replay mode” – essentially the UI requests the event list and then animates them as if in real-time but faster or scrub-able. That synergy is only possible because we decided to store the events.

UX-001 (Lightning Strikes level): In the initial user experience, some integration points could be: after the user finishes their first session or achieves a certain milestone (like generating their first “lightning strike”), the system might unlock something or display a summary. The state manager might trigger an event like experience.levelUp or simply the UX can ask “has the user finished a full session?” by checking the user profile or session logs. For example, to implement a tutorial completion, the app might check if a session record exists and how many events it had.

Additionally, if UX-001 implements a session recap feature (like “Here’s the energy you generated in this session!”), it will gather that info from the state store – maybe by reading the accumulator or calculating from the log. This integration ensures that even the simplest UX flows (like concluding a session) are backed by real data, not dummy values.

Forward Links: The presence of a robust local storage means future UX levels (UX-002+ for multi-stream etc.) can build features like comparing two sessions’ energy patterns, or community sharing (export and share a session log for others to replay – still local-first but user-initiated). Our design lays the groundwork for those by normalizing how sessions are recorded.

Integration with Security/Privacy (TECH-005 & BIZ-002): We want to mention that since this subsystem handles user data, it also integrates with the security and privacy policies:

If TECH-005 (Security & Privacy) defines any data classification or encryption requirements, we integrate by potentially encrypting certain data at rest (though on local device, we might choose not to unless sensitive). We could, for instance, encrypt the user table if it contained any credentials (currently not, since it’s offline). But at least, we ensure that our stored data respects privacy: no hidden telemetry. BIZ-002 likely mandates that if any analytics or metrics are to be shared, it’s opt-in. Our event log could be a treasure trove of analytics (how often features are used, etc.), but by default, it stays local. If one day an export to a cloud or a bug report is needed, the user would manually do it.

Integration with privacy also means implementing the right to be forgotten easily: if a user says “delete my data”, one can just delete the SQLite file or use our CLI which wipes all tables – since nothing is stored elsewhere, that completes the request.

We will also integrate with any consent flows: e.g., on first run, the app might inform the user that it keeps data locally and give them a chance to opt-out of even local logging if they want a completely transient mode. We can support a “private session” mode where the event logging is turned off (or stored only in memory). If this is desired, the orchestrator can instruct state manager not to persist certain things. We note this as a capability aligning to privacy (though it may not be in initial scope, it’s doable thanks to centralized state handling).

In summary, the State & Storage subsystem is not an island – it touches the orchestrator, the Decipher engine, the real-time network layer, the UX, and even policy layers. By clearly defining these integration points, we ensure the design is cascade-aware: it acknowledges what came before (foundation and tech docs) and what comes after (UX and Biz docs that rely on it). This document effectively enables those next steps by providing the necessary contracts and guarantees (for instance, UX-006 can confidently assume event logs exist to draw historical graphs, and BIZ-002 can affirm that user data stays local and exportable thanks to this design).

5) Validation & Metrics – Ensuring Quality and Performance

Finally, we outline how to validate that the state management system meets its requirements and the metrics we will use to measure its success:

Correctness & Consistency Tests: We will develop a suite of tests (including WF-TECH-004/state-consistency.spec.md) to automatically verify the correctness of the storage system. Key scenarios include:

Deterministic Replay Test: Run a simulated session (with a known sequence of events), record all events to the DB, then reset and replay those events through the system. The final state (accumulators, etc.) after replay should exactly match the original final state. We can use an assert on each important state variable. This test validates that our event logging is complete and that no state is left out of the log (if something is missing, the replay would diverge).

Crash Recovery Test: Simulate an ungraceful shutdown by, for example, terminating the process after a certain number of events, then run the recovery routine on restart. The test passes if the recovered state equals the state if the session had run to completion. This involves comparing in-memory state objects or certain key values (like total_energy, last processed prompt ID, etc.). It also verifies that no events are lost or duplicated on recovery.

Data Integrity Test: Populate the database with some sample data and run the Data Validator tool. It should report no errors for a correct dataset. We also intentionally introduce some inconsistencies (like remove an event or corrupt a JSON) to ensure the validator catches them. While this is more for development, it ensures the validator works and our assumptions about integrity hold.

Multi-session Continuity Test: Start a session, end it, start a new session. Ensure that user profile aggregated values updated correctly (e.g., total_sessions incremented, total_energy adds up the previous session). Also ensure that session separation is maintained (events of old session are not accessible as current session events, etc.). This checks the logic around session boundaries and initialization/teardown.

Performance & Frame Budget Metrics: Because this system lives in the real-time loop, we monitor its performance. We set up metrics to measure:

Logging Latency: How much time does it take to log an event (from the moment Decipher emits it to the moment it’s written to disk)? We strive for sub-frame latencies. By using the async queue, most of the time the answer will be “near zero” on the producer side, but we can still measure end-to-end. We could insert timestamps in events for when produced vs when persisted, and occasionally log the difference. Our target is a median logging latency < 5 ms and 99th percentile maybe < 20 ms, which ensures even spikes don’t accumulate dangerously.

Frame Loop Impact: We will instrument the frame loop to detect any overruns (taking >16.67ms). If any are detected, we check if the state manager was active in that frame (e.g., maybe a large batch write happened). The goal is to keep the state manager’s contribution extremely low (say under 1 ms per frame on average). We can use profiling or built-in counters to measure how long state updates take. Since a lot happens asynchronously, we also watch for backlog: if our event queue length keeps growing, that’s a sign we can’t keep up. We set a threshold (like if > 120 events queued, equivalent to 2 seconds of backlog, raise a warning or drop events).

Database I/O Throughput: We might log metrics about how many writes per second we’re doing and how big the DB grows per minute of usage. This helps ensure we don’t inadvertently write too much (e.g., if we were logging every token as an event in normal mode, the DB would balloon; we likely avoid that as discussed). Our target might be something like: one minute of heavy usage (60 events/sec) should result in at most a few hundred KB of data. Given JSON overhead, etc., we check that. We can compress older records or vacuüm the database occasionally to control size.

Energy & Accuracy Metrics: We also validate that the energy values and other metrics stored are accurate and in sync with the actual AI activity:

We can cross-verify with the model’s own telemetry. For example, if the model (Ollama) reports that it processed X tokens, and our accumulator says Y energy (with some formula from FND-002), do those correlate properly? A test can feed a known input of 100 tokens and ensure that the logged energy events reflect whatever the expected energy formula outcome is for 100 tokens. This ties back to the correctness of applying the Energy Framework (WF-FND-002) in our logging.

If interference or resonance events are part of Decipher, we ensure that whenever Decipher claims such an event, we log an event for it. A consistency check is: if the UI showed an interference pattern graphic, there must be a corresponding interferenceEvent in the log. We could test this by forcing an interference scenario and then checking the log.

Security & Privacy Validation: We review the system against security requirements:

Ensure that no data is sent outside: We can simulate a session and monitor network traffic (there should be none besides localhost). Our code review ensures all external calls (if any) are behind optional user actions.

Ensure that if a user opts out of logging or uses a “private session”, no events are written to disk (we might test a flag that disables DB writes and see that indeed nothing is stored for that session).

Ensure data export does not accidentally include sensitive info beyond what is intended. We test the export tool on a session where the user said something private; in normal mode, that content shouldn’t appear in the exported log unless user explicitly wanted transcript. So the export tool by default might exclude raw text fields (or replace them with “[redacted]” or a hash). We verify that behavior matches the privacy guidelines
GitHub
.

User Experience Validation: While this is a technical component, its success is partially measured by user experience:

Does the user notice any lag or stutter due to state saving? (They should not; if we see any dropped frames correlating with disk writes, that’s a bug).

When the user finishes a session and reopens the app, do they see their progress correctly updated? (Test going from Level 1 to 2 after meeting criteria, ensure the flag persisted.)

If the user uses the backup tool, can they successfully restore on a fresh install and pick up where they left off? (This could be a manual or integration test: simulate copying the DB file to a new environment and check that the app recognizes the old state.)

Check that the system scales: If a user runs a marathon session (say 4 hours generating thousands of events), does the app remain stable and the database not become a bottleneck? This involves a stress test.

Metrics Collection: Ironically, to improve the system we might want to collect some metrics of usage, but since we cannot phone home, we rely on local logs for this. The state manager could keep an internal count of events processed, average latency, etc., and expose it in a developer mode. But likely, evaluation of metrics will be done by developers during testing rather than by the live system.

We conclude that if all these validation points are satisfied, the State & Storage subsystem will be production-ready: it will reliably capture the energetic dance of WIRTHFORGE’s AI in a local ledger, without ever dropping the beat. This gives both the developers and users confidence that the system’s behavior is transparent, debuggable, and under the user’s ultimate control.

🎨 Required Deliverables

As part of this specification, the following artifacts will be produced to ensure the design is implementation-ready and verifiable:

Complete Technical Document (this file) – The full specification of WF-TECH-004 (State Management & Storage), including all sections above, which serves as the primary reference for engineers and stakeholders.

Database Schema Definition (SQL) – A SQL script named WF-TECH-004-DBSchema.sql containing the DDL commands to create the necessary tables (user, session, event, snapshot, etc.) and indexes in SQLite. This script will reflect the ER diagram and include any pragmas or engine-specific tweaks (e.g., enabling foreign keys). It should run idempotently (check if tables exist).

JSON Schema Files:

WF-TECH-004-energy-state.json – JSON Schema defining the structure of the Energy State data, including definitions for frameState, energyAccumulator, etc., and any composite state objects that might be part of a snapshot. This schema formalizes what a snapshot or in-memory state JSON looks like if exported.

WF-TECH-004-events.json – JSON Schema covering all Event types pertinent to this subsystem (likely referencing or including definitions from WF-FND-004’s schemas). It will have subschemas for each event type like energyUpdateEvent, userActionEvent, snapshotEvent (if any), etc., specifying required fields and data types.

ER Diagram (Mermaid format): A diagram file WF-TECH-004-erd.mmd illustrating the entity relationships of the storage design (as shown above in section 3.1). This Mermaid markup can be rendered to visualize how tables relate. It ensures that developers implementing the database and those writing queries have a clear map of the data model.

Event Sourcing Flow Diagram (Mermaid): A sequence or flow diagram WF-TECH-004-event-sourcing.mmd depicting the end-to-end flow of events from generation to persistence to recovery. This will graphically show components (Decipher -> State Manager -> DB -> UI, etc.) and the lifecycle of events and snapshots. It complements the textual description by making the 60Hz loop and asynchronous logging visually clear.

YAML Audit Trail Spec/Example: A YAML-formatted example (in a file WF-TECH-004-audit-example.yaml) demonstrating a snippet of an event log with commentary. This is essentially a reference that shows how the audit trail is structured in practice, useful for documentation and for ensuring readability of exported logs.

Snapshot & Recovery Script (Python): A reference Python script WF-TECH-004-snapshot-recovery.py providing pseudo-code or an example implementation of the snapshot creation and recovery process. This will act as guidance or a starting point for developers, covering the logic to fetch the last snapshot, replay events, and handle version upgrades in code form.

Data Validator Script (Python): WF-TECH-004-validate.py which contains logic to scan the database for integrity (as described in Validation section). It will use the JSON schemas to validate records and print out any inconsistencies. This can double as a maintenance tool.

Replay/Debug Tool: WF-TECH-004-replay.py that reads events (from a JSON file or directly from the DB for a given session ID) and replays them through a simulated pipeline. This could be a CLI that prints each event and the resulting state changes, helping developers follow the sequence of events step by step for a given session.

Backup/Export Utility: Provided as either a script or integrated CLI command (for example, an extension to the main app CLI) – here as WF-TECH-004-backup-cli.py – which can dump all user data to an external file or restore from it. This deliverable ensures that the user’s data is not locked in – they have a way to back it up or move it.

Migration Template: A template file WF-TECH-004-migration.sql (or .py) outlining how to perform a simple migration (perhaps adding a new field to the event JSON or new table). It will contain placeholder steps and notes for future migrations, serving as a guide so that when schema changes happen, maintainers follow a consistent process.

Test Specification: A markdown test spec WF-TECH-004/state-consistency.spec.md describing test cases that must pass for this subsystem (like the replay test, recovery test, etc. mentioned in Validation). This is not code but a structured description of tests (which can later be turned into automated tests). It ensures QA can verify this component thoroughly.

All file-based deliverables are named with the WF-TECH-004- prefix and a descriptive suffix for clarity. They will be stored in the repository (e.g., under docs/WF-TECH-004/ for documentation, schemas/ for JSON schemas, code/ or scripts/ for Python scripts, and assets/diagrams/ for Mermaid diagrams, as per the WIRTHFORGE project structure
GitHub
).

Each deliverable supports the core objective: from schemas that enforce correctness, to diagrams that communicate design, to code samples that accelerate implementation. By producing these, we ensure that the transition from design to actual code is smooth and unambiguous.

✅ Quality Validation Criteria

To consider WF-TECH-004 successfully implemented and documented, it must meet the following criteria:

Completeness: All aspects of local state and storage are addressed. The deliverables list is fully realized, and each required artifact is present and consistent with the others. For example, the JSON schemas should align with the described database fields and event properties in the text, and the diagrams should reflect the same structures. No required feature (local persistence, snapshotting, event logging, user data handling) is left unspecified.

Technical Accuracy: The design must be technically sound and feasible. This means the solution as described can be implemented in the chosen stack (Python 3.11+ with FastAPI, SQLite, etc.) without contradictions. Data types and throughput claims are realistic (e.g., SQLite can handle 60 inserts/sec, which it can). All references to external concepts (like 60 Hz timing, or JSON schema usage) are correctly applied according to standards and previous WIRTHFORGE docs. Integration points with other modules use the correct interfaces and data from those modules (e.g., using the event definitions from Decipher exactly
GitHub
).

Performance Compliance: The design honors the 60 Hz performance budget. We have clear strategies for async writes and batching; the validation will include checking that these strategies are sufficient. A performance test or analysis should indicate that under typical load, the state manager’s operations fit in the allowed frame budget (no frame drops due to logging). If any high-load scenario might break this, the design should have mitigation (and it does, via backpressure or dropping non-critical events).

WIRTHFORGE Principle Alignment: The solution strictly adheres to WIRTHFORGE’s core principles:

Local-First: No cloud or external dependencies at runtime (validated by code review and runtime tests for network calls)
GitHub
.

Energy-Truth: All computational activities are reflected in logged energy events or related records, ensuring “what you compute is what you see (and store)”. There should be no unexplained UI energy phenomenon that isn’t backed by data in the state store.

Emergence-Detected (not fabricated): Any higher-level patterns (like resonance or interference) logged in state come from actual computations (Decipher detection) rather than arbitrary insertion. This is more on Decipher, but our logging should ensure those events are captured when they occur, preserving the authenticity of emergent behavior records.

Transparency & Auditability: The entire design is transparent to users (their data is in accessible formats) and to developers (we log extensively to allow audit). Meeting this criterion might involve a review to ensure even error conditions or edge cases produce events or logs rather than silently failing.

Security & Privacy: No personal/sensitive data leaves the device; the user has control over data retention. This is met when features like data export/delete function correctly and no background telemetry exists. We can verify no connections open to external hosts and data can be wiped clean on command.

Consistency with Glossary: All terminology used is consistent with WF-FND-006 (glossary) definitions. For instance, if “Energy Unit (EU)” or “frame” or “accumulator” are defined in the glossary, our document used them in that context. We link or explain on first use of terms like no_docker_rule, Energy Units, etc. (In a final edit, ensure first occurrences are annotated if needed). This avoids any ambiguity for readers cross-referencing terms.

Inter-document Cascade: This spec properly bridges to the next documents. In validation, we check that the content here does not conflict with any assumptions in UX-001/UX-006 or BIZ-002. In fact, it should provide what those need. For example, if UX-006 expects an API for fetching history, our design includes it. If BIZ-002 expects the ability to export data, we provided it. Essentially, downstream docs (UX/BIZ) should have their prerequisites satisfied by this design. Any forward references we made (like pointing out that UX will use the data) should be true and actionable.

Document Quality: The document itself should follow the universal template structure and be clearly written (which affects maintainability). This means our sections are in the correct order, we have included all relevant sections (which we have: DNA, dependencies, objective, etc.), and the writing is clear, with short paragraphs and lists where appropriate. All citations or cross-references included should be accurate and helpful for someone verifying the rationale
GitHub
GitHub
. The presence of diagrams and examples contributes to understanding (so part of quality is that those examples are correct and illustrate the intended point).

Testing & Measurability: Criteria for success are defined in a way that QA or automated tests can measure them. E.g., we said “median logging latency < 5 ms” – we should have a way to measure that (perhaps in a dev mode). Or “no frame drops” – we should run a high-load scenario and ensure frame timing remains steady. If any criteria cannot be tested or measured, that would be a gap. So we ensure each key claim (performance or functional) can be tied to a test or monitoring.

Meeting all these validation criteria will indicate that the state management and storage subsystem is ready to be built and integrated with confidence. It’s not just about building it to spec, but building it to a high standard of reliability and alignment with the WIRTHFORGE vision.

🔄 Post-Generation Protocol

After completing this document and its deliverables, several follow-up actions are required to integrate it into the living WIRTHFORGE documentation and development process:

Glossary Update (WF-FND-006): Review terminology introduced in this doc and update the central glossary. For example, ensure entries exist for terms like “Energy Accumulator”, “Snapshot”, “Event Log”, etc., or add them with concise definitions if they are new. Also update any definitions that might have evolved (if “frameState” or other terms were previously vague, now we have concrete meaning to record). Ensuring glossary alignment will help all other docs (and new team members) speak the same language.

Dependency Graph Revision: Mark WF-TECH-004 as completed in the global dependency graph (Mermaid diagram in WF-META-001) and verify its links. We should confirm that the “enables” links from WF-TECH-004 to UX-006 and UX-001 are depicted, and add any new cross-links we introduced (for instance, if we think WF-BIZ-002 should reference this doc, ensure the dependency matrix in BIZ-002 includes it). Basically, update WF-META-001-deps.mmd if needed to reflect the role of this doc in the cascade.

Version Bumping: Assign an initial version number to the artifacts of this doc (likely v1.0.0 for the first full implementation). Document this in a changelog (CHANGELOG-WF-TECH-004.md) noting that this is the first complete version derived from the spec. Any changes during implementation should increment patch or minor version accordingly. We follow SemVer for these artifacts, as mandated in governance
GitHub
.

Integration with Source Control: All deliverable files (schemas, diagrams, scripts) should be added to the repository in their respective locations as per the assets manifest. The document text (and summary if needed) goes into the docs folder. Ensure that references between docs (links or IDs) are correct now that files exist. This post-gen step might involve minor edits to link these files (for instance, embedding the final diagram images once rendered).

Cascade Next Documents: With WF-TECH-004 now specified, it unblocks UX and BIZ documents that depend on it. In particular:

WF-UX-006 (Unified Energy Visualization) and WF-UX-001 (Lightning Strikes) can now proceed or be updated to incorporate how they will use the state data. We should coordinate with the authors of those docs (or the prompt generation system) to ensure they reference the specific APIs or data structures from tech-004. For example, UX-006 might include a requirement like “pull energy history via State API (per TECH-004) to render graphs”. If needed, generate or revise UX-006 and UX-001 with knowledge from this spec.

WF-BIZ-002 (Licensing, Privacy & Terms) should reflect that all user data is local and under user control because of this subsystem. If BIZ-002 is not yet written or needs confirmation, we note that this design fulfills the privacy promise (local data, export, delete). The legal text or privacy policy can now explicitly mention that “WIRTHFORGE stores all user data (e.g., AI interactions, usage metrics) on the user’s device in an accessible form, never on company servers” — a statement backed by this implementation. We may need to provide a summary of our approach to whoever drafts BIZ-002.

Feedback Loop: If any issues or gaps were identified by implementing this doc (for example, during test writing, we realized a need for an additional field or a different approach), loop back those changes into the document and schemas. Update the version and changelog accordingly. Essentially, treat this spec as living until the implementation is proven in practice.

Announce & Educate: Once implemented, communicate to the team (or in docs) how to use the new state management features. This might involve updating README or user guides for developers: e.g., how to run the replay tool, or how to interpret the event log. This isn’t exactly “post-gen” for the doc itself, but it’s a consequence – ensuring that this spec doesn’t sit in isolation but actively guides development and usage.

By following this post-generation protocol, we ensure that WF-TECH-004 is not just a document, but a coordinated piece of the WIRTHFORGE project. It triggers the next steps (both document generation and coding tasks), maintains alignment across the documentation suite, and upholds the principle of a “living specification”. In closing, the completion of WF-TECH-004 strengthens the foundation for the user-facing experiences to come: with state and storage solidified, the project can confidently move on to bringing the AI’s energy to life in the UI (UX docs) and assuring users of their data rights (BIZ docs), knowing that the underpinnings are robust and true to WIRTHFORGE’s vision.
GitHub
GitHub