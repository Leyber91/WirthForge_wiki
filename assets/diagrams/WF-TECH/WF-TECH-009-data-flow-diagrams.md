# WF-TECH-009 Data Flow Diagrams

## Overview
Comprehensive data flow diagrams showing metrics collection, storage, and visualization pipeline in WIRTHFORGE's local-core architecture.

## 1. High-Level Metrics Architecture

```mermaid
graph TB
    subgraph "WIRTHFORGE Core System"
        DECIPHER[DECIPHER Engine<br/>60Hz Processing Loop]
        ENERGY[Energy Service<br/>Visual Truth System]
        ORCHESTRATOR[Orchestrator<br/>Multi-Model Coordination]
        PLUGINS[Plugin Modules<br/>Sandboxed Extensions]
        UI[Web UI<br/>User Interface]
    end
    
    subgraph "Metrics Collection Layer"
        COLLECTOR[Metrics Collector<br/>Real-time Aggregation]
        BUFFER[In-Memory Buffers<br/>Circular Queues]
        ALERTS[Alert Engine<br/>Threshold Monitoring]
    end
    
    subgraph "Local Storage (WF-TECH-004)"
        DB[(SQLite Database<br/>Unified State & Metrics)]
        SNAPSHOTS[metrics_snapshots]
        TIMESERIES[metrics_timeseries]
        ALERT_HISTORY[alert_history]
        SESSIONS[sessions]
    end
    
    subgraph "Web Dashboard"
        WEBSOCKET[WebSocket Server<br/>Real-time Updates]
        API[REST API<br/>Historical Data]
        DASHBOARD[React Dashboard<br/>Visualization Components]
    end
    
    subgraph "External Interfaces"
        EXPORT[Data Export<br/>JSON/CSV]
        BACKUP[Backup System<br/>Local-First]
    end
    
    %% Data Flow Connections
    DECIPHER --> COLLECTOR
    ENERGY --> COLLECTOR
    ORCHESTRATOR --> COLLECTOR
    PLUGINS --> COLLECTOR
    UI --> COLLECTOR
    
    COLLECTOR --> BUFFER
    BUFFER --> ALERTS
    COLLECTOR --> DB
    
    DB --> SNAPSHOTS
    DB --> TIMESERIES
    DB --> ALERT_HISTORY
    DB --> SESSIONS
    
    COLLECTOR --> WEBSOCKET
    DB --> API
    WEBSOCKET --> DASHBOARD
    API --> DASHBOARD
    
    DB --> EXPORT
    DB --> BACKUP
    
    %% Alert feedback loop
    ALERTS --> ORCHESTRATOR
    ALERTS --> UI
    
    %% Styling
    classDef coreSystem fill:#1e3a8a,stroke:#60a5fa,stroke-width:2px,color:#fff
    classDef metricsLayer fill:#059669,stroke:#10b981,stroke-width:2px,color:#fff
    classDef storage fill:#7c2d12,stroke:#ea580c,stroke-width:2px,color:#fff
    classDef dashboard fill:#7c3aed,stroke:#a855f7,stroke-width:2px,color:#fff
    classDef external fill:#374151,stroke:#6b7280,stroke-width:2px,color:#fff
    
    class DECIPHER,ENERGY,ORCHESTRATOR,PLUGINS,UI coreSystem
    class COLLECTOR,BUFFER,ALERTS metricsLayer
    class DB,SNAPSHOTS,TIMESERIES,ALERT_HISTORY,SESSIONS storage
    class WEBSOCKET,API,DASHBOARD dashboard
    class EXPORT,BACKUP external
```

## 2. Detailed Metrics Collection Flow

```mermaid
sequenceDiagram
    participant D as DECIPHER Engine
    participant E as Energy Service
    participant O as Orchestrator
    participant C as Metrics Collector
    participant B as Buffer System
    participant DB as SQLite Database
    participant A as Alert Engine
    participant WS as WebSocket
    participant UI as Dashboard UI
    
    Note over D,UI: 60Hz Processing Cycle (16.67ms budget)
    
    loop Every Frame (16.67ms)
        D->>C: Frame timing data
        E->>C: Energy fidelity metrics
        O->>C: Session/progression data
        
        C->>B: Store in circular buffers
        
        alt Every 1 second
            C->>C: Calculate aggregations
            C->>DB: Store metrics snapshot
            C->>A: Check alert thresholds
            
            alt Alert triggered
                A->>DB: Log alert
                A->>WS: Send alert notification
                A->>O: Trigger adaptation
            end
            
            C->>WS: Send real-time metrics
        end
    end
    
    WS->>UI: Real-time updates
    UI->>DB: Query historical data (via API)
    DB->>UI: Return historical metrics
```

## 3. Energy Fidelity Measurement Pipeline

```mermaid
graph LR
    subgraph "Energy Truth System (WF-FND-002)"
        TOKENS[Token Processing<br/>Computational Events]
        ENERGY_CALC[Energy Unit Calculation<br/>EU = f(tokens, complexity)]
        VISUAL_ENGINE[Visual Engine<br/>Particle Rendering]
        PARTICLES[Energy Particles<br/>Visual Representation]
    end
    
    subgraph "Fidelity Measurement"
        COUNTER[Particle Counter<br/>Real-time Tracking]
        TIMER[Visual Lag Timer<br/>Render Delay]
        CALCULATOR[Fidelity Calculator<br/>Ratio Computation]
    end
    
    subgraph "Metrics Storage"
        FIDELITY_BUFFER[Fidelity Buffer<br/>60-second window]
        COHERENCE[Coherence Score<br/>Stability Metric]
        SNAPSHOT[Fidelity Snapshot<br/>Database Record]
    end
    
    TOKENS --> ENERGY_CALC
    ENERGY_CALC --> VISUAL_ENGINE
    VISUAL_ENGINE --> PARTICLES
    
    PARTICLES --> COUNTER
    VISUAL_ENGINE --> TIMER
    ENERGY_CALC --> CALCULATOR
    COUNTER --> CALCULATOR
    TIMER --> CALCULATOR
    
    CALCULATOR --> FIDELITY_BUFFER
    FIDELITY_BUFFER --> COHERENCE
    COHERENCE --> SNAPSHOT
    
    %% Styling
    classDef energy fill:#059669,stroke:#10b981,stroke-width:2px,color:#fff
    classDef measurement fill:#7c2d12,stroke:#ea580c,stroke-width:2px,color:#fff
    classDef storage fill:#1e3a8a,stroke:#60a5fa,stroke-width:2px,color:#fff
    
    class TOKENS,ENERGY_CALC,VISUAL_ENGINE,PARTICLES energy
    class COUNTER,TIMER,CALCULATOR measurement
    class FIDELITY_BUFFER,COHERENCE,SNAPSHOT storage
```

## 4. Alert System Data Flow

```mermaid
graph TD
    subgraph "Metrics Sources"
        FRAME[Frame Rate<br/>Current FPS]
        LATENCY[Latency<br/>P95 Response Time]
        ENERGY[Energy Fidelity<br/>Visual-Compute Ratio]
        ERRORS[Error Count<br/>System Failures]
        RESOURCES[Resource Usage<br/>CPU/Memory]
    end
    
    subgraph "Alert Engine"
        THRESHOLDS[Threshold Config<br/>YAML/JSON Rules]
        EVALUATOR[Condition Evaluator<br/>Real-time Checking]
        STATE[Alert State Manager<br/>Active/Resolved]
    end
    
    subgraph "Alert Actions"
        LOG[Alert Logging<br/>Database Record]
        NOTIFY[UI Notification<br/>Real-time Banner]
        ADAPT[Auto-Adaptation<br/>System Response]
        EXPORT[Alert Export<br/>Troubleshooting]
    end
    
    subgraph "Feedback Loops"
        ORCHESTRATOR_ADAPT[Orchestrator<br/>Performance Tuning]
        UI_WARN[UI Warning<br/>User Notification]
        SYSTEM_ADJUST[System Adjustment<br/>Resource Management]
    end
    
    FRAME --> EVALUATOR
    LATENCY --> EVALUATOR
    ENERGY --> EVALUATOR
    ERRORS --> EVALUATOR
    RESOURCES --> EVALUATOR
    
    THRESHOLDS --> EVALUATOR
    EVALUATOR --> STATE
    
    STATE --> LOG
    STATE --> NOTIFY
    STATE --> ADAPT
    STATE --> EXPORT
    
    ADAPT --> ORCHESTRATOR_ADAPT
    NOTIFY --> UI_WARN
    ADAPT --> SYSTEM_ADJUST
    
    %% Styling
    classDef metrics fill:#1e3a8a,stroke:#60a5fa,stroke-width:2px,color:#fff
    classDef engine fill:#7c2d12,stroke:#ea580c,stroke-width:2px,color:#fff
    classDef actions fill:#059669,stroke:#10b981,stroke-width:2px,color:#fff
    classDef feedback fill:#7c3aed,stroke:#a855f7,stroke-width:2px,color:#fff
    
    class FRAME,LATENCY,ENERGY,ERRORS,RESOURCES metrics
    class THRESHOLDS,EVALUATOR,STATE engine
    class LOG,NOTIFY,ADAPT,EXPORT actions
    class ORCHESTRATOR_ADAPT,UI_WARN,SYSTEM_ADJUST feedback
```

## 5. WebSocket Real-Time Communication

```mermaid
sequenceDiagram
    participant MC as Metrics Collector
    participant WS as WebSocket Server
    participant UI as Dashboard UI
    participant DB as Database
    participant AL as Alert Engine
    
    Note over MC,AL: Real-time metrics streaming
    
    UI->>WS: Connect to metrics channel
    WS->>UI: Connection established
    
    loop Every 1 second
        MC->>WS: Current metrics snapshot
        WS->>UI: Broadcast metrics update
        UI->>UI: Update charts & gauges
    end
    
    loop Alert checking
        AL->>AL: Evaluate thresholds
        alt Alert triggered
            AL->>WS: Alert notification
            WS->>UI: Alert message
            UI->>UI: Show alert banner
            AL->>DB: Log alert
        end
    end
    
    UI->>WS: Request historical data
    WS->>DB: Query metrics history
    DB->>WS: Return historical data
    WS->>UI: Historical metrics
    UI->>UI: Render historical charts
    
    Note over UI: User can export data
    UI->>WS: Export request
    WS->>DB: Generate export
    DB->>WS: Export data
    WS->>UI: Download link
```

## 6. Plugin Metrics Integration

```mermaid
graph TB
    subgraph "Plugin Sandbox (WF-TECH-008)"
        PLUGIN1[Plugin A<br/>Custom Module]
        PLUGIN2[Plugin B<br/>Third-party]
        PLUGIN3[Plugin C<br/>User-developed]
    end
    
    subgraph "Metrics API"
        PLUGIN_API[Plugin Metrics API<br/>Sandboxed Interface]
        VALIDATOR[Metric Validator<br/>Schema Checking]
        NAMESPACE[Namespace Manager<br/>Plugin Isolation]
    end
    
    subgraph "Core Metrics System"
        COLLECTOR[Metrics Collector<br/>Unified Aggregation]
        STORAGE[Metrics Storage<br/>Tagged by Plugin]
        DASHBOARD[Dashboard<br/>Plugin Metrics View]
    end
    
    subgraph "Security & Governance"
        MANIFEST[Plugin Manifest<br/>Declared Metrics]
        PERMISSIONS[Permission System<br/>User Approval]
        AUDIT[Audit Log<br/>Plugin Activity]
    end
    
    PLUGIN1 --> PLUGIN_API
    PLUGIN2 --> PLUGIN_API
    PLUGIN3 --> PLUGIN_API
    
    PLUGIN_API --> VALIDATOR
    VALIDATOR --> NAMESPACE
    NAMESPACE --> COLLECTOR
    
    COLLECTOR --> STORAGE
    STORAGE --> DASHBOARD
    
    MANIFEST --> PERMISSIONS
    PERMISSIONS --> PLUGIN_API
    PLUGIN_API --> AUDIT
    
    %% Styling
    classDef plugin fill:#7c3aed,stroke:#a855f7,stroke-width:2px,color:#fff
    classDef api fill:#059669,stroke:#10b981,stroke-width:2px,color:#fff
    classDef core fill:#1e3a8a,stroke:#60a5fa,stroke-width:2px,color:#fff
    classDef security fill:#7c2d12,stroke:#ea580c,stroke-width:2px,color:#fff
    
    class PLUGIN1,PLUGIN2,PLUGIN3 plugin
    class PLUGIN_API,VALIDATOR,NAMESPACE api
    class COLLECTOR,STORAGE,DASHBOARD core
    class MANIFEST,PERMISSIONS,AUDIT security
```

## 7. Privacy-Preserving Data Flow

```mermaid
graph LR
    subgraph "Data Sources"
        RAW[Raw System Data<br/>Full Context]
        USER[User Interactions<br/>Prompts & Responses]
        SYSTEM[System Events<br/>Internal Operations]
    end
    
    subgraph "Privacy Layer"
        FILTER[Content Filter<br/>Remove Sensitive Data]
        HASH[Hash Generator<br/>Anonymize Identifiers]
        AGGREGATE[Aggregator<br/>Statistical Summary]
    end
    
    subgraph "Metrics Storage"
        CLEAN[Clean Metrics<br/>No PII/Content]
        LOCAL[Local Database<br/>User-Controlled]
        EXPORT[Optional Export<br/>User-Initiated]
    end
    
    subgraph "Privacy Controls"
        RETENTION[Retention Policy<br/>Auto-Cleanup]
        ACCESS[Access Control<br/>Local-Only]
        CONSENT[User Consent<br/>Export Approval]
    end
    
    RAW --> FILTER
    USER --> FILTER
    SYSTEM --> FILTER
    
    FILTER --> HASH
    FILTER --> AGGREGATE
    
    HASH --> CLEAN
    AGGREGATE --> CLEAN
    
    CLEAN --> LOCAL
    LOCAL --> EXPORT
    
    RETENTION --> LOCAL
    ACCESS --> LOCAL
    CONSENT --> EXPORT
    
    %% Styling
    classDef data fill:#374151,stroke:#6b7280,stroke-width:2px,color:#fff
    classDef privacy fill:#059669,stroke:#10b981,stroke-width:2px,color:#fff
    classDef storage fill:#1e3a8a,stroke:#60a5fa,stroke-width:2px,color:#fff
    classDef controls fill:#7c2d12,stroke:#ea580c,stroke-width:2px,color:#fff
    
    class RAW,USER,SYSTEM data
    class FILTER,HASH,AGGREGATE privacy
    class CLEAN,LOCAL,EXPORT storage
    class RETENTION,ACCESS,CONSENT controls
```

## 8. Performance Monitoring Data Pipeline

```mermaid
graph TD
    subgraph "60Hz Processing Loop"
        FRAME_START[Frame Start<br/>Timestamp]
        DECIPHER_PROC[DECIPHER Processing<br/>Token Generation]
        ENERGY_RENDER[Energy Rendering<br/>Visual Updates]
        UI_UPDATE[UI Update<br/>DOM Manipulation]
        FRAME_END[Frame End<br/>Timestamp]
    end
    
    subgraph "Performance Measurement"
        TIMER[Frame Timer<br/>Delta Calculation]
        BUDGET[Budget Monitor<br/>16.67ms Target]
        PROFILER[Performance Profiler<br/>Component Breakdown]
    end
    
    subgraph "Metrics Aggregation"
        FPS_CALC[FPS Calculator<br/>Rolling Average]
        STABILITY[Stability Score<br/>Variance Analysis]
        BOTTLENECK[Bottleneck Detection<br/>Component Analysis]
    end
    
    subgraph "Alert & Adaptation"
        THRESHOLD[Performance Thresholds<br/>FPS < 55, Frame > 20ms]
        ALERT_GEN[Alert Generation<br/>Performance Warnings]
        AUTO_ADAPT[Auto-Adaptation<br/>Quality Reduction]
    end
    
    FRAME_START --> TIMER
    DECIPHER_PROC --> PROFILER
    ENERGY_RENDER --> PROFILER
    UI_UPDATE --> PROFILER
    FRAME_END --> TIMER
    
    TIMER --> BUDGET
    TIMER --> FPS_CALC
    PROFILER --> BOTTLENECK
    
    FPS_CALC --> STABILITY
    BUDGET --> THRESHOLD
    STABILITY --> THRESHOLD
    
    THRESHOLD --> ALERT_GEN
    THRESHOLD --> AUTO_ADAPT
    
    %% Styling
    classDef processing fill:#1e3a8a,stroke:#60a5fa,stroke-width:2px,color:#fff
    classDef measurement fill:#059669,stroke:#10b981,stroke-width:2px,color:#fff
    classDef aggregation fill:#7c3aed,stroke:#a855f7,stroke-width:2px,color:#fff
    classDef adaptation fill:#7c2d12,stroke:#ea580c,stroke-width:2px,color:#fff
    
    class FRAME_START,DECIPHER_PROC,ENERGY_RENDER,UI_UPDATE,FRAME_END processing
    class TIMER,BUDGET,PROFILER measurement
    class FPS_CALC,STABILITY,BOTTLENECK aggregation
    class THRESHOLD,ALERT_GEN,AUTO_ADAPT adaptation
```

These diagrams provide comprehensive visualization of the metrics data flow throughout the WIRTHFORGE system, from collection through storage to real-time dashboard presentation, while maintaining local-first principles and privacy protection.
