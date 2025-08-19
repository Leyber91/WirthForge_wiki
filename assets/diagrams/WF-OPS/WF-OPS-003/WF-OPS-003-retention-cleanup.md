# WF-OPS-003 Retention & Cleanup Flow

## Automated Backup Retention & Cleanup Process

```mermaid
flowchart TD
    subgraph "Cleanup Trigger"
        TIMER[Scheduled Cleanup<br/>Daily 2 AM]
        STORAGE[Storage Threshold<br/>85% full]
        MANUAL[Manual Cleanup<br/>User initiated]
        POLICY[Policy Change<br/>New retention rules]
    end
    
    subgraph "System Health Check"
        HEALTH[Monitor Health Check]
        LOAD[CPU < 60%]
        FPS[FPS ≥ 58]
        SERVICES[Services Running]
    end
    
    subgraph "Backup Analysis"
        SCAN[Scan All Backups]
        CLASSIFY[Classify by Type & Age]
        EVALUATE[Apply Retention Policies]
        IDENTIFY[Identify Candidates for Deletion]
    end
    
    subgraph "Safety Validation"
        PRESERVE[Check Preservation Tags]
        LAST_GOOD[Verify Last Known Good]
        INTEGRITY[Verify Backup Integrity]
        DEPENDENCIES[Check Recovery Dependencies]
    end
    
    subgraph "User Confirmation"
        PREVIEW[Show Deletion Preview]
        CONFIRM[User Confirmation Required]
        OVERRIDE[Allow Override/Postpone]
    end
    
    subgraph "Cleanup Execution"
        AUDIT_START[Log Cleanup Start]
        DELETE[Safe File Deletion]
        MANIFEST[Update Manifests]
        HASH_UPDATE[Update Hash Trees]
        AUDIT_END[Log Cleanup Complete]
    end
    
    subgraph "Post-Cleanup"
        VERIFY[Verify Remaining Backups]
        REPORT[Generate Cleanup Report]
        MONITOR[Update Monitoring Dashboard]
        SCHEDULE[Schedule Next Cleanup]
    end
    
    %% Flow Connections
    TIMER --> HEALTH
    STORAGE --> HEALTH
    MANUAL --> HEALTH
    POLICY --> HEALTH
    
    HEALTH --> LOAD
    LOAD --> FPS
    FPS --> SERVICES
    
    SERVICES --> SCAN
    SCAN --> CLASSIFY
    CLASSIFY --> EVALUATE
    EVALUATE --> IDENTIFY
    
    IDENTIFY --> PRESERVE
    PRESERVE --> LAST_GOOD
    LAST_GOOD --> INTEGRITY
    INTEGRITY --> DEPENDENCIES
    
    DEPENDENCIES --> PREVIEW
    PREVIEW --> CONFIRM
    CONFIRM --> OVERRIDE
    
    OVERRIDE --> AUDIT_START
    AUDIT_START --> DELETE
    DELETE --> MANIFEST
    MANIFEST --> HASH_UPDATE
    HASH_UPDATE --> AUDIT_END
    
    AUDIT_END --> VERIFY
    VERIFY --> REPORT
    REPORT --> MONITOR
    MONITOR --> SCHEDULE
    
    %% Error Paths
    HEALTH -.->|System Unhealthy| SCHEDULE
    INTEGRITY -.->|Corruption Found| REPORT
    CONFIRM -.->|User Declines| SCHEDULE
    DELETE -.->|Deletion Fails| REPORT
    
    %% Styling
    classDef trigger fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef health fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef analysis fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef safety fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef user fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef execution fill:#fce4ec,stroke:#ad1457,stroke-width:2px
    classDef post fill:#e0f2f1,stroke:#00695c,stroke-width:2px
    
    class TIMER,STORAGE,MANUAL,POLICY trigger
    class HEALTH,LOAD,FPS,SERVICES health
    class SCAN,CLASSIFY,EVALUATE,IDENTIFY analysis
    class PRESERVE,LAST_GOOD,INTEGRITY,DEPENDENCIES safety
    class PREVIEW,CONFIRM,OVERRIDE user
    class AUDIT_START,DELETE,MANIFEST,HASH_UPDATE,AUDIT_END execution
    class VERIFY,REPORT,MONITOR,SCHEDULE post
```

## Retention Policy Decision Tree

```mermaid
graph TD
    START[Backup Found] --> AGE{Check Age}
    
    AGE -->|< 7 days| KEEP_RECENT[Keep - Recent]
    AGE -->|7-30 days| WEEKLY{Weekly Backup?}
    AGE -->|30-365 days| MONTHLY{Monthly Backup?}
    AGE -->|> 365 days| YEARLY{Yearly Backup?}
    
    WEEKLY -->|Yes| KEEP_WEEKLY[Keep - Weekly]
    WEEKLY -->|No| COUNT_CHECK[Check Count Limits]
    
    MONTHLY -->|Yes| KEEP_MONTHLY[Keep - Monthly]
    MONTHLY -->|No| COUNT_CHECK
    
    YEARLY -->|Yes| PRESERVE_CHECK{Preservation Tag?}
    YEARLY -->|No| COUNT_CHECK
    
    PRESERVE_CHECK -->|Yes| KEEP_PRESERVE[Keep - Preserved]
    PRESERVE_CHECK -->|No| ARCHIVE_CHECK{Archive Policy?}
    
    ARCHIVE_CHECK -->|Keep| KEEP_ARCHIVE[Keep - Archived]
    ARCHIVE_CHECK -->|Delete| DELETE_CANDIDATE[Mark for Deletion]
    
    COUNT_CHECK --> SIZE_CHECK{Storage Limit?}
    SIZE_CHECK -->|Within Limit| KEEP_COUNT[Keep - Within Limits]
    SIZE_CHECK -->|Over Limit| PRIORITY{Backup Priority?}
    
    PRIORITY -->|High| KEEP_PRIORITY[Keep - High Priority]
    PRIORITY -->|Low| DELETE_CANDIDATE
    
    %% Safety Checks
    DELETE_CANDIDATE --> LAST_GOOD_CHECK{Last Known Good?}
    LAST_GOOD_CHECK -->|Yes| KEEP_SAFETY[Keep - Safety]
    LAST_GOOD_CHECK -->|No| INTEGRITY_CHECK{Integrity OK?}
    
    INTEGRITY_CHECK -->|Yes| CONFIRM_DELETE[Confirm Deletion]
    INTEGRITY_CHECK -->|No| QUARANTINE[Quarantine - Corrupted]
    
    CONFIRM_DELETE --> USER_CONFIRM{User Confirms?}
    USER_CONFIRM -->|Yes| DELETE_SAFE[Safe Delete]
    USER_CONFIRM -->|No| KEEP_USER[Keep - User Override]
    
    %% Final States
    KEEP_RECENT --> END[End]
    KEEP_WEEKLY --> END
    KEEP_MONTHLY --> END
    KEEP_PRESERVE --> END
    KEEP_ARCHIVE --> END
    KEEP_COUNT --> END
    KEEP_PRIORITY --> END
    KEEP_SAFETY --> END
    KEEP_USER --> END
    DELETE_SAFE --> END
    QUARANTINE --> END
    
    classDef keep fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef delete fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef decision fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef safety fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    
    class KEEP_RECENT,KEEP_WEEKLY,KEEP_MONTHLY,KEEP_PRESERVE,KEEP_ARCHIVE,KEEP_COUNT,KEEP_PRIORITY,KEEP_SAFETY,KEEP_USER keep
    class DELETE_CANDIDATE,DELETE_SAFE,QUARANTINE delete
    class AGE,WEEKLY,MONTHLY,YEARLY,PRESERVE_CHECK,ARCHIVE_CHECK,SIZE_CHECK,PRIORITY,LAST_GOOD_CHECK,INTEGRITY_CHECK,USER_CONFIRM decision
    class COUNT_CHECK,CONFIRM_DELETE safety
```

## Cleanup Safety Mechanisms

```mermaid
graph LR
    subgraph "Pre-Deletion Checks"
        A[Never Delete Last Known Good]
        B[Verify Backup Integrity]
        C[Check Preservation Tags]
        D[Validate Dependencies]
    end
    
    subgraph "User Controls"
        E[Preview Deletion List]
        F[Require Confirmation]
        G[Allow Override/Postpone]
        H[Emergency Stop]
    end
    
    subgraph "Audit Trail"
        I[Log All Decisions]
        J[Record User Actions]
        K[Hash Tree Updates]
        L[Cleanup Reports]
    end
    
    subgraph "Recovery Options"
        M[Undelete Window - 24h]
        N[Backup Recovery Tools]
        O[Emergency Restore]
        P[Corruption Detection]
    end
    
    A --> E
    B --> F
    C --> G
    D --> H
    
    E --> I
    F --> J
    G --> K
    H --> L
    
    I --> M
    J --> N
    K --> O
    L --> P
    
    classDef safety fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef user fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef audit fill:#e0f2f1,stroke:#00695c,stroke-width:2px
    classDef recovery fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    
    class A,B,C,D safety
    class E,F,G,H user
    class I,J,K,L audit
    class M,N,O,P recovery
```

## Performance-Aware Cleanup

### 1. Energy-Aware Scheduling
- **Low Load Windows**: Run cleanup during CPU < 60%, FPS ≥ 58
- **Monitoring Integration**: Coordinate with WF-OPS-002 for optimal timing
- **Pause/Resume**: Automatic pause when system load increases

### 2. Frame Budget Preservation
- **Chunked Processing**: Process deletions in small batches
- **Progress Tracking**: Real-time progress with frame budget monitoring
- **Background Operations**: Low-priority cleanup operations

### 3. Storage Optimization
- **Incremental Cleanup**: Process backups incrementally
- **Deferred Operations**: Defer heavy operations to idle periods
- **Memory Management**: Efficient memory usage during large cleanups

### 4. User Experience
- **Non-Blocking UI**: Cleanup runs without blocking user interface
- **Progress Indicators**: Visual feedback with energy-aware animations
- **Cancellation Support**: Allow user to stop cleanup operations
