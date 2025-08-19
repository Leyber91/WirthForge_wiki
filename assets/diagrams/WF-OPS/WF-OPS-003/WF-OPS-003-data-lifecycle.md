# WF-OPS-003 Data Lifecycle

## Backup Data Lifecycle Management

```mermaid
graph TB
    subgraph "Data Generation"
        LIVE[Live System Data]
        CONFIG[Configuration Changes]
        USER[User Activities]
        AUDIT[System Events]
    end
    
    subgraph "Backup Creation"
        TRIGGER[Backup Triggers]
        PLAN[Backup Planning]
        EXEC[Backup Execution]
    end
    
    subgraph "Storage Tiers"
        RECENT[Recent Backups<br/>7 days]
        WEEKLY[Weekly Backups<br/>4 weeks]
        MONTHLY[Monthly Backups<br/>12 months]
        ARCHIVE[Long-term Archive<br/>User defined]
    end
    
    subgraph "Lifecycle Events"
        VERIFY[Integrity Verification]
        COMPRESS[Compression]
        ENCRYPT[Encryption]
        EXPORT[Export Operations]
    end
    
    subgraph "Retention Management"
        POLICY[Retention Policies]
        CLEANUP[Automated Cleanup]
        PRESERVE[Preservation Rules]
    end
    
    %% Data Flow
    LIVE --> TRIGGER
    CONFIG --> TRIGGER
    USER --> TRIGGER
    AUDIT --> TRIGGER
    
    TRIGGER --> PLAN
    PLAN --> EXEC
    
    EXEC --> RECENT
    RECENT --> VERIFY
    
    %% Aging Process
    RECENT -->|After 7 days| WEEKLY
    WEEKLY -->|After 4 weeks| MONTHLY
    MONTHLY -->|After 12 months| ARCHIVE
    
    %% Lifecycle Operations
    VERIFY --> COMPRESS
    COMPRESS --> ENCRYPT
    ENCRYPT --> EXPORT
    
    %% Retention Management
    POLICY --> CLEANUP
    CLEANUP --> RECENT
    CLEANUP --> WEEKLY
    CLEANUP --> MONTHLY
    
    PRESERVE --> ARCHIVE
    
    %% Styling
    classDef data fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef storage fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef process fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef policy fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    
    class LIVE,CONFIG,USER,AUDIT data
    class RECENT,WEEKLY,MONTHLY,ARCHIVE storage
    class TRIGGER,PLAN,EXEC,VERIFY,COMPRESS,ENCRYPT,EXPORT process
    class POLICY,CLEANUP,PRESERVE policy
```

## Backup Triggers & Scheduling

```mermaid
stateDiagram-v2
    [*] --> Monitoring
    
    Monitoring --> ScheduledBackup : Timer + Low Load
    Monitoring --> EventBackup : Critical Change
    Monitoring --> UserBackup : Manual Request
    
    ScheduledBackup --> PlanningPhase
    EventBackup --> PlanningPhase
    UserBackup --> PlanningPhase
    
    PlanningPhase --> SystemCheck
    SystemCheck --> LoadTooHigh : CPU > 85% or FPS < 58
    SystemCheck --> ExecuteBackup : System Healthy
    
    LoadTooHigh --> Defer
    Defer --> Monitoring : Wait for better window
    
    ExecuteBackup --> InProgress
    InProgress --> Completed : Success
    InProgress --> Failed : Error
    InProgress --> Paused : Load Spike
    
    Paused --> InProgress : Load Decreased
    Paused --> Failed : Timeout
    
    Completed --> Verification
    Failed --> Cleanup
    
    Verification --> StorageUpdate : Integrity OK
    Verification --> Failed : Corruption Detected
    
    StorageUpdate --> Monitoring
    Cleanup --> Monitoring
```

## Data Retention Policies

```mermaid
graph TD
    subgraph "Retention Rules"
        COUNT[Count-Based<br/>Keep last N backups]
        TIME[Time-Based<br/>Keep for X days/months]
        SIZE[Size-Based<br/>Keep within storage limit]
        PRESERVE[Preservation<br/>Never delete tagged backups]
    end
    
    subgraph "Backup Categories"
        FULL[Full Backups]
        INCR[Incremental Backups]
        DIFF[Differential Backups]
        SNAP[Snapshots]
    end
    
    subgraph "Retention Tiers"
        DAILY[Daily: 7 backups]
        WEEKLY[Weekly: 4 backups]
        MONTHLY[Monthly: 12 backups]
        YEARLY[Yearly: Indefinite]
    end
    
    subgraph "Cleanup Process"
        SCAN[Scan Backups]
        EVAL[Evaluate Retention]
        CONFIRM[User Confirmation]
        DELETE[Safe Deletion]
        AUDIT_LOG[Audit Logging]
    end
    
    %% Policy Application
    COUNT --> FULL
    COUNT --> INCR
    TIME --> DIFF
    SIZE --> SNAP
    PRESERVE --> YEARLY
    
    %% Tier Assignment
    FULL --> DAILY
    INCR --> DAILY
    DIFF --> WEEKLY
    SNAP --> MONTHLY
    
    %% Cleanup Flow
    SCAN --> EVAL
    EVAL --> CONFIRM
    CONFIRM --> DELETE
    DELETE --> AUDIT_LOG
    
    %% Safety Rules
    PRESERVE -.-> DELETE : Block Deletion
    CONFIRM -.-> DELETE : User Approval Required
    
    classDef policy fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef backup fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef tier fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef process fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    
    class COUNT,TIME,SIZE,PRESERVE policy
    class FULL,INCR,DIFF,SNAP backup
    class DAILY,WEEKLY,MONTHLY,YEARLY tier
    class SCAN,EVAL,CONFIRM,DELETE,AUDIT_LOG process
```

## Energy-Aware Lifecycle Management

### 1. Backup Timing Optimization
- **Low Load Windows**: Schedule during CPU < 60%, FPS ≥ 58
- **Energy Monitoring**: Coordinate with WF-OPS-002 for optimal timing
- **User Activity**: Defer during active user sessions

### 2. Progressive Processing
- **Chunked Operations**: Process files in small chunks to maintain frame budget
- **Pause/Resume**: Automatic pause when system load increases
- **Background Processing**: Low-priority background operations

### 3. Storage Optimization
- **Compression Scheduling**: Compress older backups during idle periods
- **Deduplication**: Content-addressed storage reduces redundancy
- **Cleanup Timing**: Run cleanup only during healthy system windows

### 4. Export Lifecycle
- **On-Demand Export**: Generate encrypted exports only when requested
- **Temporary Storage**: Clean up export files after user download
- **Consent Tracking**: Maintain audit trail of export permissions
