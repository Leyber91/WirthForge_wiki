# WIRTHFORGE TECH Document Generation Prompts

## Web-Engaged Local-Core Architecture
**Core Philosophy**: Users MUST use the web interface, but ALL computation runs locally on their device. No cloud dependencies for core functionality.

---

## WF-TECH-001: System Runtime & Services

**PROMPT:**
```
Generate Document: WF-TECH-001 — System Runtime & Services

Follow the universal template. Use FND-003 for 5-layer boundaries, FND-006 for governance discipline.

Core Objective: Define the local runtime backbone that serves the mandatory web UI while keeping all computation local. Boot to 60Hz readiness in ≤2s on mid-tier hardware.

Architecture: Web-engaged local-core where users MUST access via browser interface, but all AI processing stays on their device.

Required Deliverables:
- Process graph: main orchestrator, DECIPHER runtime, local web server, energy state service
- C4 context/container/component diagrams (Mermaid)
- YAML manifest of all local processes
- Startup integrity checklist and boot sequence
- Integration seams for TECH-002/003/004
- Boot-time test spec (≤2s to 60Hz readiness)
- Local web server configuration for UI serving
- Process monitoring and health checks

Consumes: FND-003, FND-006
Enables: TECH-002, TECH-003, TECH-004, TECH-006

Emphasize: Local computation only, web UI mandatory, no Docker in core paths, native execution.
```

---

## WF-TECH-002: Local AI Integration & Turbo/Broker

**PROMPT:**
```
Generate Document: WF-TECH-002 — Local AI Integration & Turbo/Broker

Follow the universal template. Use FND-001 for local-first stance, FND-002 for EU mapping, FND-005 for council orchestration.

Core Objective: Implement Ollama integration with streaming tokens, model pool management, and optional "Turbo" local ensembles. All processing stays local while web UI provides control interface.

Architecture: Web-engaged local-core with browser-based controls but device-only computation.

Required Deliverables:
- Ollama native integration (no Docker, streaming tokens, telemetry capture)
- Model pool/load policy for local hardware tiers (Low/Mid/High)
- "Turbo" local ensemble coordination (4-6 models concurrently)
- Broker-Hybrid as optional satellite (opt-in, user-controlled)
- Model profile table per hardware tier with VRAM/CPU requirements
- Token→EU mapping implementation algorithms
- Web API endpoints for model control and monitoring
- Integration test spec ensuring energy-truth alignment
- Performance benchmarks per hardware tier

Consumes: FND-001/002/005, TECH-001
Enables: UX-001, UX-002, TECH-005

Emphasize: Local processing only, web interface for control, no mandatory cloud, native Ollama integration.
```

---

## WF-TECH-003: Real-Time Protocol (WebSockets)

**PROMPT:**
```
Generate Document: WF-TECH-003 — Real-Time Protocol (WebSockets)

Follow the universal template. Use FND-004 for DECIPHER outputs, TECH-001 for component hooks.

Core Objective: Define WebSocket channels connecting local backend to mandatory web UI at 60Hz with <5ms median latency.

Architecture: Local WebSocket server serving browser-based UI with real-time energy data streams.

Required Deliverables:
- Channel definitions (energy.*, experience.*, council.*, reward.*)
- JSON/MessagePack schemas for all event types
- Heartbeat/reconnect finite state machine
- Protocol lifecycle diagram with connection management
- Backpressure handling for 60Hz streams
- Binary energy frames specification for performance
- Contract tests for schema compliance and latency (<5ms median)
- Browser WebSocket client integration patterns
- Error handling and recovery procedures
- Message ordering and delivery guarantees

Consumes: TECH-001, FND-004
Enables: TECH-004, UX-006, UX-001

Emphasize: Local WebSocket server, browser client, 60Hz real-time performance, low latency.
```

---

## WF-TECH-004: State & Storage

**PROMPT:**
```
Generate Document: WF-TECH-004 — State & Storage

Follow the universal template. Use FND-002 for EU/coherence metrics, TECH-001/003 for integration points.

Core Objective: Define local data persistence for energy state, session history, and user progress. All data stays on user's device with full ownership.

Architecture: Local database serving web UI via API, with complete user data ownership and control.

Required Deliverables:
- Database schema design (Postgres/SQLite for local deployment)
- In-memory frame state management for 60Hz performance
- Event log and audit trail structure
- Snapshot/recovery mechanisms for system resilience
- ERD diagrams showing all data relationships
- Event-sourcing flow diagram
- JSON schemas for energy.event, snapshots, and user data
- Data integrity check logic and validation
- Replay tool specification for debugging
- Local backup/export functionality
- Migration scripts for schema updates

Consumes: TECH-001, TECH-003, FND-002
Enables: UX-006, UX-001, BIZ-002

Emphasize: Local data only, user ownership, web API for browser access, privacy by design.
```

---

## WF-TECH-005: DECIPHER Implementation

**PROMPT:**
```
Generate Document: WF-TECH-005 — DECIPHER Implementation

Follow the universal template. Use FND-002/004 for energy mapping and event contracts.

Core Objective: Implement the 60Hz real-time compiler that transforms token streams into energy events within 16.67ms frame budget.

Architecture: Local processing engine serving energy data to web UI in real-time with strict timing guarantees.

Required Deliverables:
- Compiler loop implementation (Python with performance optimizations)
- Token→EU mapping algorithms with real-time constraints
- Frame composer with 16.67ms budget enforcement
- Drop/degrade policy for overload scenarios
- Runtime sequence diagrams showing timing flows
- Backpressure handling and queue management
- JSON schema for energy.frame events
- Performance test vectors and benchmarks
- Integration with web UI via TECH-003 WebSockets
- Profiling and optimization guidelines
- Error handling and recovery procedures

Consumes: TECH-001, FND-002/004
Enables: UX-006, UX-001, TECH-009

Emphasize: Local compilation, web delivery, strict timing constraints, 60Hz performance.
```

---

## WF-TECH-006: Security & Privacy

**PROMPT:**
```
Generate Document: WF-TECH-006 — Security & Privacy

Follow the universal template. Use FND-001 for trust principles, FND-006 for governance.

Core Objective: Ensure local data boundaries, secure web UI access, and privacy protection in web-engaged local-core architecture.

Architecture: Security zones between local core and web interface, with user data never leaving device.

Required Deliverables:
- Local data boundary enforcement mechanisms
- Web UI authentication and session management
- HTTPS/TLS configuration for local web server
- Sandbox permissions for plugins and extensions
- Threat model analysis and mitigations
- Trust boundary diagrams showing security zones
- Permission system JSON schemas
- Security audit checklist and procedures
- Privacy policy technical requirements
- Data encryption at rest and in transit (local only)
- Secure communication between components
- Vulnerability assessment procedures

Consumes: TECH-001, FND-001/006
Enables: BIZ-002, TECH-008

Emphasize: Local data protection, secure web access, no cloud data leakage, privacy by design.
```

---

## WF-TECH-007: Testing & QA

**PROMPT:**
```
Generate Document: WF-TECH-007 — Testing & QA

Follow the universal template. Use FND-002/004/005/006 for test requirements and quality gates.

Core Objective: Define comprehensive testing strategy for web-engaged local-core system ensuring 60Hz performance and energy-truth validation.

Architecture: Multi-layer testing approach covering local core, web interface, and their integration.

Required Deliverables:
- Unit/integration test frameworks for all components
- Golden-run replay harness for deterministic testing
- Frame-budget performance tests (16.67ms enforcement)
- Schema regression testing for all data contracts
- Visual-truth validation suite for energy visualizations
- Web UI automated testing (Playwright/Cypress)
- Local-core integration tests
- End-to-end user journey tests
- QA pipeline diagrams and automation
- Test coverage matrix and requirements
- Performance benchmarking suite
- Acceptance criteria and rollback procedures

Consumes: FND-002/004/005/006, TECH-001
Enables: Launch readiness, TECH-009

Emphasize: End-to-end testing of web UI + local core integration, performance validation, energy-truth verification.
```

---

## WF-TECH-008: Plugin / Module Architecture & Sandbox

**PROMPT:**
```
Generate Document: WF-TECH-008 — Plugin / Module Architecture & Sandbox

Follow the universal template. Use FND-003 for layer boundaries, FND-006 for governance controls.

Core Objective: Define secure plugin system that extends functionality while maintaining local-core security and web UI integration.

Architecture: Sandboxed plugin execution with web UI integration points and strict security boundaries.

Required Deliverables:
- Plugin manifest format and capability descriptors
- Sandbox policy enforcement mechanisms
- Resource limits and isolation procedures
- Web UI plugin integration patterns and APIs
- Module loading diagrams and lifecycle
- Sample plugin.yaml specifications
- JSON schemas for capability tokens and permissions
- Promotion workflow for trusted plugins
- Security isolation tests and validation
- Plugin marketplace preparation (interfaces)
- Developer SDK and documentation
- Plugin debugging and profiling tools

Consumes: TECH-001, FND-003/006
Enables: UX-002/003/004/005, future marketplace

Emphasize: Secure local execution, web UI integration, governance compliance, developer experience.
```

---

## WF-TECH-009: Observability & Metrics

**PROMPT:**
```
Generate Document: WF-TECH-009 — Observability & Metrics

Follow the universal template. Use FND-006 for metrics governance, FND-002 for energy-fidelity KPIs.

Core Objective: Define metrics collection, monitoring, and dashboard systems for web-engaged local-core architecture with privacy-first approach.

Architecture: Local metrics collection and aggregation with web-based monitoring dashboards, no external telemetry by default.

Required Deliverables:
- Metrics schema (latency, frame stability, progression rate, error counts, energy fidelity)
- Local metrics storage and aggregation systems
- Web dashboard specifications and mockups
- Data flow diagrams (DECIPHER → storage → web UI)
- JSON schemas for metrics.snapshot and aggregations
- Performance monitoring dashboards
- Alert thresholds and notification systems
- Metrics accuracy validation tests
- Privacy-preserving analytics approaches
- Local log management and rotation
- Debugging and troubleshooting interfaces

Consumes: TECH-004, FND-002/006
Enables: TECH-010, governance reviews, operational insights

Emphasize: Local metrics collection, web-based monitoring, privacy-preserving telemetry, operational visibility.
```

---

## WF-TECH-010: Performance & Capacity

**PROMPT:**
```
Generate Document: WF-TECH-010 — Performance & Capacity

Follow the universal template. Use FND-002 for performance targets, FND-006 for capacity planning governance.

Core Objective: Define performance optimization strategies and capacity planning for web-engaged local-core system across hardware tiers.

Architecture: Tiered performance optimization with web UI responsiveness and local processing efficiency.

Required Deliverables:
- Hardware tier classification (Low/Mid/High) with specifications
- Performance matrices and benchmarks per tier
- Capacity planning guidelines and formulas
- Performance tuning playbooks and procedures
- Council scaling rules for parallel processing
- Memory/VRAM budget allocation strategies
- Web UI performance optimization techniques
- Load testing specifications and scenarios
- Performance regression detection systems
- Scalability analysis and recommendations
- Resource monitoring and alerting
- Performance troubleshooting guides

Consumes: TECH-001, FND-002/006
Enables: Scalable deployment, hardware optimization, performance predictability

Emphasize: Local hardware optimization, web UI performance, multi-tier support, predictable scaling.
```

---

## Asset Requirements for TECH Documents

### Common Assets Across All TECH Documents:
- **Diagrams**: Architecture diagrams (C4 model), sequence flows, component interactions
- **Schemas**: API contracts, data formats, configuration files (JSON/YAML)
- **Code**: Implementation stubs, algorithms, integration patterns (Python/TypeScript)
- **Tests**: Unit tests, integration tests, performance benchmarks

### Specific Asset Types:
- **TECH-001**: Process graphs, system topology, boot sequences
- **TECH-002**: Model integration flows, hardware compatibility matrices
- **TECH-003**: Protocol specifications, WebSocket schemas, timing diagrams
- **TECH-004**: Database schemas, ERDs, data flow diagrams
- **TECH-005**: Compiler algorithms, performance profiles, timing analysis
- **TECH-006**: Security models, threat assessments, trust boundaries
- **TECH-007**: Test frameworks, QA pipelines, validation suites
- **TECH-008**: Plugin architectures, sandbox specifications, capability models
- **TECH-009**: Metrics schemas, dashboard mockups, monitoring flows
- **TECH-010**: Performance matrices, capacity models, optimization guides
