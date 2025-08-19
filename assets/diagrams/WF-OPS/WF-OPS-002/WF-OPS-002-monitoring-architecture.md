# WF-OPS-002 Monitoring Architecture Diagram

## Overview
This diagram illustrates the complete local-first monitoring architecture for WIRTHFORGE, showing how system, model, and UX metrics flow through collectors, aggregators, and real-time dashboards while maintaining 60Hz performance and strict localhost-only operation.

## Architecture Diagram

```mermaid
graph TB
    subgraph "Local System (127.0.0.1 only)"
        subgraph "Data Collection Layer"
            SC[System Collector<br/>CPU/GPU/Memory<br/>10Hz sampling]
            MC[Model Collector<br/>TPS/TTFT/Energy<br/>60Hz sampling]
            UC[UX Collector<br/>Frame Time/Jank<br/>60Hz sampling]
            NC[Network Collector<br/>Localhost Traffic<br/>1Hz sampling]
        end
        
        subgraph "Aggregation & Processing"
            AGG[Metrics Aggregator<br/>Rolling Windows<br/>1s/10s/5m buckets]
            PROC[Stream Processor<br/>Real-time filtering<br/>Energy calculations]
            CACHE[Memory Cache<br/>Hot metrics<br/>Last 5 minutes]
        end
        
        subgraph "Storage Layer"
            SQLITE[(SQLite Database<br/>Time-series tables<br/>Retention policies)]
            LOGS[(Log Files<br/>Structured JSON<br/>Rotation enabled)]
        end
        
        subgraph "Alert & Notification"
            AE[Alert Engine<br/>Rule evaluation<br/>Local DSL]
            NB[Notification Broker<br/>Toast/Sound only<br/>No external calls]
            RULES[(Alert Rules<br/>JSON configs<br/>User-defined)]
        end
        
        subgraph "Real-time Streaming"
            WS[WebSocket Server<br/>Port 9445<br/>Localhost bind]
            SSE[Server-Sent Events<br/>Fallback transport<br/>HTTP/2 streams]
            BUFFER[Stream Buffer<br/>60Hz rate limiting<br/>Backpressure handling]
        end
        
        subgraph "Web Dashboard UI"
            DASH[Dashboard Controller<br/>React components<br/>60Hz rendering]
            PANELS[Panel System<br/>System/Model/UX views<br/>Energy visualizations]
            CHARTS[Chart Engine<br/>Canvas-based<br/>Hardware accelerated]
            CONTROLS[User Controls<br/>Telemetry toggles<br/>Alert management]
        end
        
        subgraph "Analytics & Export"
            ANALYTICS[Local Analytics<br/>Privacy-preserving<br/>K-anonymization]
            EXPORT[Export Engine<br/>User-initiated<br/>Consent-gated]
            REPORTS[Report Generator<br/>Diagnostic bundles<br/>Local-only default]
        end
    end
    
    subgraph "External Interfaces (Optional)"
        USER_SHARE[User-Authorized Sharing<br/>Explicit consent<br/>Encrypted exports]
        BACKUP_SIG[Backup Signals<br/>To WF-OPS-003<br/>Health indicators]
    end
    
    %% Data Flow Connections
    SC --> AGG
    MC --> AGG
    UC --> AGG
    NC --> AGG
    
    AGG --> PROC
    PROC --> CACHE
    PROC --> SQLITE
    PROC --> LOGS
    
    AGG --> AE
    AE --> RULES
    AE --> NB
    
    PROC --> WS
    PROC --> SSE
    WS --> BUFFER
    SSE --> BUFFER
    
    BUFFER --> DASH
    DASH --> PANELS
    PANELS --> CHARTS
    DASH --> CONTROLS
    
    SQLITE --> ANALYTICS
    ANALYTICS --> EXPORT
    EXPORT --> REPORTS
    
    %% Optional External Flows
    EXPORT -.->|User Choice| USER_SHARE
    AE -.->|Health Signals| BACKUP_SIG
    
    %% Performance Constraints
    classDef performance fill:#ff6b6b,stroke:#d63031,stroke-width:2px,color:#fff
    classDef realtime fill:#74b9ff,stroke:#0984e3,stroke-width:2px,color:#fff
    classDef storage fill:#55a3ff,stroke:#2d3436,stroke-width:2px,color:#fff
    classDef security fill:#fd79a8,stroke:#e84393,stroke-width:2px,color:#fff
    
    class MC,UC,WS,SSE,BUFFER,DASH,CHARTS performance
    class AGG,PROC,CACHE realtime
    class SQLITE,LOGS,RULES storage
    class NB,EXPORT,USER_SHARE security
```

## Key Architectural Principles

### 1. Local-First Operation
- **No External Dependencies**: All monitoring operates on localhost (127.0.0.1)
- **Offline Capable**: Full functionality without internet connectivity
- **Data Sovereignty**: All metrics stored locally by default

### 2. Performance Constraints
- **60Hz UI Rendering**: Dashboard maintains 60 FPS with 16.67ms frame budget
- **Non-Blocking Collection**: Collectors never impact main application performance
- **Efficient Aggregation**: Rolling windows prevent unbounded memory growth

### 3. Energy-Truth Visualization
- **Real Metrics Mapping**: Energy ribbons width = actual throughput
- **Token Velocity**: Particle speed maps to measured token/second rates
- **Entropy Visualization**: Particle density reflects actual entropy calculations

### 4. Privacy & Security
- **Telemetry Controls**: User toggles for all data collection
- **Local Notifications**: No external alert services
- **Consent-Gated Exports**: Explicit approval for any data sharing

## Component Details

### Data Collection Layer
- **System Collector**: Uses `psutil` and OS APIs for CPU/GPU/memory metrics
- **Model Collector**: Hooks into AI model runtime for performance metrics
- **UX Collector**: Monitors frame timing and interaction latency
- **Network Collector**: Tracks localhost-only network activity

### Aggregation & Processing
- **Metrics Aggregator**: Combines streams into time-windowed buckets
- **Stream Processor**: Real-time filtering and energy calculations
- **Memory Cache**: Hot metrics for immediate dashboard updates

### Storage Layer
- **SQLite Database**: Time-series tables with automatic retention
- **Log Files**: Structured JSON logs with rotation policies

### Alert & Notification
- **Alert Engine**: Evaluates user-defined rules against metric streams
- **Notification Broker**: Local-only notifications (toast, sound)
- **Alert Rules**: JSON-based DSL for flexible alert conditions

### Real-time Streaming
- **WebSocket Server**: Primary real-time transport on port 9445
- **Server-Sent Events**: HTTP/2 fallback for streaming
- **Stream Buffer**: Rate limiting and backpressure handling

### Web Dashboard UI
- **Dashboard Controller**: React-based component system
- **Panel System**: Modular views for different metric categories
- **Chart Engine**: Hardware-accelerated canvas rendering
- **User Controls**: Telemetry and alert management interface

### Analytics & Export
- **Local Analytics**: Privacy-preserving aggregations
- **Export Engine**: User-initiated data exports
- **Report Generator**: Diagnostic bundle creation

## Integration Points

### WF-OPS-001 Dependencies
- Uses localhost HTTPS server and SQLite database
- Leverages certificate infrastructure for secure WebSockets
- Integrates with service management for collector lifecycle

### WF-OPS-003 Integration
- Provides backup health signals and readiness indicators
- Monitors system load for safe backup windows
- Alerts on storage and performance issues

### WF-UX-006 Performance Optimization
- Consumes UX performance targets and jank budgets
- Provides real-time performance feedback for optimization
- Integrates with frame timing measurement systems

## Security Considerations

### Network Isolation
- All services bind to 127.0.0.1 only
- No external network connections in core monitoring
- Optional sharing requires explicit user consent

### Data Protection
- Metrics stored with user-controlled retention
- No PII or sensitive content in default exports
- Encryption for any external data sharing

### Access Control
- Web interface requires localhost access
- No remote monitoring capabilities
- User controls for all telemetry collection

## Performance Guarantees

### Real-time Constraints
- Dashboard rendering: ≥58 FPS average
- Frame budget: ≤16.67ms per frame (95th percentile)
- Stream latency: ≤100ms end-to-end

### Resource Efficiency
- Collector overhead: ≤2% CPU usage
- Memory footprint: ≤100MB for full monitoring stack
- Storage growth: Configurable retention with automatic cleanup

### Scalability Limits
- Metrics throughput: Up to 10,000 metrics/second
- Concurrent dashboard users: Up to 5 simultaneous connections
- Historical data: Configurable retention (default 30 days)

---

*This architecture diagram is part of the WF-OPS-002 asset collection and demonstrates the complete local-first monitoring system design.*
