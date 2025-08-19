# WF-OPS-003 Backup Architecture

## Local-First Backup & Recovery System Architecture

```mermaid
graph TB
    subgraph "User Interface Layer"
        UI[Web UI: Backup & Recovery]
        PROG[Progress Indicators]
        CTRL[Backup Controls]
    end
    
    subgraph "API & Coordination Layer"
        API[Local Backup API]
        SCHED[Energy-Aware Scheduler]
        COORD[Operation Coordinator]
    end
    
    subgraph "Planning & Intelligence"
        PLAN[Backup Planner]
        POL[Policy Engine]
        SCOPE[Scope Analyzer]
    end
    
    subgraph "Core Engines"
        BENG[Backup Engine]
        RENG[Recovery Engine]
        CRYPT[Encryption Helper]
        AUDIT[Audit & Verify Tool]
    end
    
    subgraph "Storage Layer"
        LOCAL[(Local Archives)]
        MANIFEST[Backup Manifests]
        HASH[Hash Trees]
        EXPORT[Encrypted Exports]
    end
    
    subgraph "Integration Points"
        MON[WF-OPS-002 Monitoring]
        DEPLOY[WF-OPS-001 Deployment]
        SEC[WF-TECH-007 Security]
    end
    
    subgraph "Live System"
        DB[(SQLite Database)]
        CONFIG[Configuration Files]
        LOGS[Audit Logs]
        CERTS[Certificates & Keys]
        MODELS[AI Models - Optional]
    end
    
    %% User Interface Connections
    UI --> API
    UI --> PROG
    UI --> CTRL
    
    %% API Layer Connections
    API --> SCHED
    API --> COORD
    API --> PLAN
    
    %% Planning Connections
    PLAN --> POL
    PLAN --> SCOPE
    PLAN --> MON
    
    %% Scheduler Connections
    SCHED --> MON
    SCHED --> BENG
    SCHED --> RENG
    
    %% Engine Connections
    COORD --> BENG
    COORD --> RENG
    COORD --> AUDIT
    
    BENG --> CRYPT
    BENG --> LOCAL
    BENG --> MANIFEST
    
    RENG --> CRYPT
    RENG --> LOCAL
    RENG --> AUDIT
    
    %% Storage Connections
    LOCAL --> MANIFEST
    LOCAL --> HASH
    MANIFEST --> HASH
    CRYPT --> EXPORT
    
    %% Live System Connections
    BENG --> DB
    BENG --> CONFIG
    BENG --> LOGS
    BENG --> CERTS
    BENG --> MODELS
    
    RENG --> DB
    RENG --> CONFIG
    RENG --> LOGS
    RENG --> CERTS
    RENG --> MODELS
    
    %% Integration Connections
    SCHED -.-> MON
    POL -.-> SEC
    DEPLOY -.-> CONFIG
    
    %% Audit Trail
    AUDIT --> HASH
    AUDIT -.-> SEC
    
    %% Performance Annotations
    classDef performance fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef security fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef storage fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef integration fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    
    class SCHED,COORD,PROG performance
    class CRYPT,AUDIT,POL,SEC security
    class LOCAL,MANIFEST,HASH,EXPORT storage
    class MON,DEPLOY,SEC integration
```

## Key Architecture Principles

### 1. Local-First Design
- **Primary Storage**: All backups stored locally by default
- **Optional Export**: Encrypted exports only with explicit user consent
- **No External Dependencies**: Operates entirely offline

### 2. Performance Preservation
- **Frame Budget Respect**: Maintains 60Hz UI responsiveness (≤16.67ms)
- **Energy-Aware Scheduling**: Coordinates with monitoring for safe backup windows
- **Throttling Capability**: Pauses operations when system under load

### 3. Security & Privacy
- **Content Addressing**: SHA-256 hashing for integrity verification
- **Immutable Audit Trail**: Cryptographic proof of backup integrity
- **Encryption by Choice**: User-controlled encryption for exports

### 4. Integration Points
- **WF-OPS-002**: Monitoring signals for scheduling and health reporting
- **WF-OPS-001**: File layout and service management integration
- **WF-TECH-007**: Security policies and encryption standards

### 5. Data Flow Patterns
- **Backup Flow**: Live System → Planner → Engine → Local Storage
- **Recovery Flow**: Local Storage → Recovery Engine → Live System
- **Audit Flow**: All operations → Audit Tool → Hash Trees
- **Export Flow**: Local Storage → Encryption → User-Controlled Export
