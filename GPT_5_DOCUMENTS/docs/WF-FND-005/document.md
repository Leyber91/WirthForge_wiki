# WF-FND-005: Module & Plugin Philosophy

## Document Metadata
- **Document ID**: WF-FND-005
- **Title**: Module & Plugin Philosophy
- **Version**: 1.1.0
- **Date**: 2025-08-13
- **Status**: Draft
- **Dependencies**: WF-FND-001, WF-FND-002, WF-FND-003, WF-FND-004
- **Enables**: WF-TECH-006, WF-UX-004

## Dependency Matrix
- **Required Before This**: Vision, energy framework, core architecture, and the Decipher runtime.
- **Enables After This**: Plugin SDK, sandbox APIs, adaptive-field UX layers.

## Core Objective
Establish a philosophy for extending WIRTHFORGE through sandboxed modules and plugins while preserving the 60 Hz energy loop and local-first guarantees.

## Content Architecture

### 1) Core Concepts
- **Sandboxed Modules**: Each plugin runs in an isolated process with explicit capabilities.
- **Capability Manifest**: Plugins declare required permissions (filesystem, network, model access).
- **Channel Separation**: Energy, experience, and council channels remain distinct to prevent cross-talk.

### 2) Implementation Details
- Orchestrator spawns plugin sandboxes and mediates all messages.
- Capabilities are enforced via a signed manifest validated on load.
- Plugins emit frame-aligned events and must respond within one tick.

### 3) Integration Points
- **WF-FND-004 Decipher** supplies the energy stream that plugins may observe.
- **WF-TECH-006 Plugin System** will provide concrete REST/WS APIs.
- **WF-UX-006 Visualization** consumes plugin outputs to render custom elements.

### 4) Validation & Metrics
- **Startup time**: sandbox init < 50 ms.
- **Isolation**: plugins cannot access resources outside declared capabilities.
- **Frame budget**: plugin handlers execute in < 5 ms per tick.

## 🎨 Required Deliverables
- [x] Philosophy document (this file)
- [x] Executive summary
- [x] Sandbox architecture diagram – `assets/diagrams/WF-FND-005-sandbox.mmd`
- [x] Plugin capabilities schema – `schemas/WF-FND-005-capabilities.json`
- [x] Example plugin sandbox code – `code/WF-FND-005/plugin-example.js`
- [x] Version control changelog

## ✅ Quality Criteria
- **Deterministic Scheduling**: Orchestrator processes plugin events predictably.
- **Capability Enforcement**: Runtime denies actions beyond manifest scope.
- **60 Hz Harmony**: Plugins respect frame timing and never block the loop.

## Conclusion
The module philosophy ensures WIRTHFORGE remains extensible without sacrificing local-first control or energy-truth visualization. Plugins operate as first-class citizens yet remain tightly sandboxed within the orchestrated frame system.
