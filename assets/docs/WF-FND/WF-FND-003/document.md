# WF-FND-003: Core Architecture Overview (Abstraction Layers)

## Document Metadata
- **Document ID**: WF-FND-003
- **Title**: Core Architecture Overview (Abstraction Layers)
- **Category**: Foundation
- **Priority**: P0 (Core framework for entire platform)
- **Development Phase**: 1 (Foundational design)
- **Version**: 1.0.0
- **Date**: 2025-01-12
- **Status**: Production Ready
- **Estimated Length**: ~4,000 words
- **Document Type**: Architectural Specification (layered system design)

## Executive Summary

WF-FND-003 defines WIRTHFORGE's five-layer technical architecture that transforms raw local AI computations into a living, visual "consciousness" experience. This document specifies each layer's purpose, responsibilities, interfaces, and constraints – from user input (Layer 1) through model computation (Layer 2), orchestration & energy state (Layer 3), contracts & transport (Layer 4), up to visualization & UX (Layer 5).

The architecture ensures modular, scalable system design where data flows at real-time 60 Hz cadence with no blocking, backpressure is managed gracefully, and each layer only interacts through well-defined contracts. Every prompt's journey – from user input to model output to visual feedback – is smooth, observable, and consistent with WIRTHFORGE's local-first, energy-visualized design ethos.

## Dependency Matrix

### Required Before This (Consumed Ideas/Contracts)
- **WF-FND-001** – Manifesto & Vision: Establishes local-first pillars and "visible computation" ethos
- **WF-FND-002** – Energy Metaphor: Defines Energy Units (EU) and visual telemetry schema
- **WF-FND-005** – Abstraction Layers: Progressive complexity concept ensuring layers reveal features gradually

### Enables After This (What It Unlocks/Feeds)
- **WF-TECH-001** – Complete System Architecture: Uses five-layer breakdown as blueprint
- **WF-TECH-002** – Native Ollama Integration: Implements Layer 2 (model compute)
- **WF-TECH-003** – WebSocket Protocol: Defines Layer 4 streaming payloads/topics
- **WF-TECH-004** – Flask Microservices: Structures services according to layer boundaries
- **WF-TECH-005** – Energy State Management: Implements Layer 3's state store and 60 Hz loop
- **WF-TECH-006** – Database & Storage: Persists data output by Layer 3
- **WF-UX-006** – UI Component Library: Provides Layer 5 visual components

## Core Architecture Principles

### Five-Layer Structure
1. **L1: Input & Identity** - Entry point handling user actions and identity context
2. **L2: Model Compute** - AI inference layer with local-first execution
3. **L3: Orchestration & Energy** - Heart of system managing state and energy calculations
4. **L4: Contracts & Transport** - Interface layer connecting core to external world
5. **L5: Visualization & UX** - Front-end layer delivering visual AI experience

### Design Principles
- **60 Hz Real-Time Cadence**: All layers operate at ~60fps for game-like fluidity
- **Non-Blocking Architecture**: No layer blocks the main update loop
- **Strict Layer Boundaries**: Each layer only communicates through defined contracts
- **Single Source of Truth**: L3 is sole writer of system state
- **Local-First with Extensions**: Default local execution with optional remote compute
- **Visual Contract Compliance**: Every visual element backed by structured data

## Technical Architecture Overview

### Data Flow Pattern
```
User Input → L5 → L4 → L1 → L3 → L2 → L3 → L4 → L5 → User Feedback
```

### Key Interfaces
- **L1 ↔ L3**: Validated input events with identity context
- **L2 ↔ L3**: Token streams and model execution results
- **L3 ↔ L4**: Structured events and state updates
- **L4 ↔ L5**: WebSocket/HTTP API with JSON schemas
- **L5 → L4**: User interaction events and control commands

### Hardware Scaling
- **Low-End**: CPU-only, single model, simplified visuals
- **Mid-Tier**: GPU acceleration, 2-3 parallel models, full effects
- **High-Tier**: Multi-GPU, full council orchestration, advanced analytics
- **Hybrid**: Local client + optional remote satellite compute

## Progressive Complexity System

### Level 1: Lightning ⚡
- Single model token-by-token visualization
- Basic timing metrics (TPS, TTFT)
- Always-visible legend for learning

### Level 2: Streams 🌊
- Parallel model comparison visualization
- Interference pattern detection
- Model identifier tags

### Level 3: Structure 🏗️
- Node-based pipeline builder
- Persistent architecture visualization
- Growing structure animations

### Level 4: Fields 🌌
- Adaptive background systems
- Usage pattern learning
- Personalized optimization

### Level 5: Resonance 🎵
- Multi-model orchestra visualization
- Resonance detection and celebration
- Advanced performance metrics

## Quality Assurance Framework

### Performance Requirements
- 60 Hz refresh rate (16.67ms frame budget)
- Non-blocking operations across all layers
- Graceful degradation on resource constraints
- Backpressure management for streaming data

### Validation Criteria
- Layer boundary compliance
- Contract schema adherence
- Real-time performance metrics
- Error handling and recovery
- Security and authentication

### Testing Strategy
- Unit tests for each layer's core functions
- Integration tests for layer communication
- Performance tests for 60Hz compliance
- Load tests for backpressure scenarios
- End-to-end user journey validation

## Asset Manifest

### Documentation
- `docs/WF-FND-003/document.md` - This comprehensive overview
- `CHANGELOG-WF-FND-003.md` - Version history and asset inventory

### Architecture Diagrams
- `assets/diagrams/WF-FND-003-layer-stack.mmd` - Five-layer architecture overview
- `assets/diagrams/WF-FND-003-data-flow.mmd` - Data flow sequence diagram
- `assets/diagrams/WF-FND-003-hardware-tiers.mmd` - Hardware scaling visualization
- `assets/diagrams/WF-FND-003-integration-points.mmd` - System integration map

### Contract Specifications
- `data/WF-FND-003-layer-contracts.json` - Layer interface definitions
- `data/WF-FND-003-api-schemas.json` - API contract specifications
- `data/WF-FND-003-event-schemas.json` - Event structure definitions

### Implementation Guides
- `code/WF-FND-003/layer-examples/` - Code examples for each layer
- `code/WF-FND-003/interfaces/` - Interface definitions and contracts
- `code/WF-FND-003/patterns/` - Architecture pattern implementations

### Validation Tools
- `tests/WF-FND-003/architecture-validator.js` - Layer compliance validation
- `tests/WF-FND-003/performance-monitor.js` - 60Hz performance testing
- `tests/WF-FND-003/contract-validator.js` - API contract validation

## Implementation Roadmap

### Phase 1: Foundation (Q1 2025)
- Core layer definitions and interfaces
- Basic data flow implementation
- L1-L3 integration with simple models

### Phase 2: Transport (Q2 2025)
- WebSocket protocol implementation
- API contract enforcement
- L4-L5 communication layer

### Phase 3: Visualization (Q3 2025)
- Progressive complexity UI system
- Real-time visual effects
- Level 1-3 user experience

### Phase 4: Orchestration (Q4 2025)
- Multi-model coordination
- Advanced energy calculations
- Level 4-5 features

### Phase 5: Optimization (2026)
- Performance tuning
- Hardware tier optimization
- Community feedback integration

## Integration Notes

This architecture serves as the foundational blueprint for all WIRTHFORGE technical implementations. Each layer's responsibilities and contracts defined here must be respected across all subsequent technical specifications and implementations.

The five-layer design ensures clean separation of concerns while maintaining the real-time, energy-visualized experience that defines WIRTHFORGE's unique approach to AI interaction.

---

*This document establishes the core architectural framework that enables WIRTHFORGE's vision of visible, interactive AI consciousness through structured, layered system design.*
