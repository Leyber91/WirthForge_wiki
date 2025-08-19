# WF-OPS-003 Recovery Sequence

## Backup Recovery Flow with Safety Checks

```mermaid
sequenceDiagram
    participant U as User (Web UI)
    participant API as Backup API
    participant R as Recovery Engine
    participant A as Archive Storage
    participant V as Audit Verifier
    participant L as Live System
    participant M as WF-OPS-002 Monitor
    participant S as Service Manager

    Note over U,S: Recovery Initiation Phase
    U->>API: Select backup_id + recovery scope
    API->>A: List available backups
    A-->>API: Backup manifests with metadata
    API-->>U: Display backup options + integrity status

    Note over U,S: Pre-Recovery Validation
    U->>API: Confirm recovery selection
    API->>V: Verify backup integrity
    V->>A: Read manifest + hash trees
    V->>A: Validate SHA-256 checksums
    V-->>API: Integrity verification result
    
    alt Integrity Check Fails
        API-->>U: Error: Backup corrupted, suggest alternatives
    else Integrity Check Passes
        API->>R: Initialize recovery process
    end

    Note over U,S: System Safety Preparation
    R->>M: Request system health check
    M-->>R: Current load + frame budget status
    
    alt System Under Load
        R-->>U: Suggest defer recovery (high load detected)
        U->>R: Confirm proceed or reschedule
    end

    R->>S: Request graceful service shutdown
    S->>L: Stop WirthForge services
    S-->>R: Services stopped confirmation

    Note over U,S: Recovery Execution Phase
    R->>A: Open backup archive
    A-->>R: Backup manifest + file list
    
    loop For each backup item
        R->>A: Read backup item
        A-->>R: File data + expected hash
        R->>R: Verify item hash
        
        alt Hash Mismatch
            R->>R: Log corruption, skip item
        else Hash Valid
            R->>L: Write to live system
            R->>R: Update progress counter
        end
        
        R-->>U: Progress update (% complete)
    end

    Note over U,S: Post-Recovery Validation
    R->>L: Verify restored files exist
    R->>L: Check database integrity
    L-->>R: File system validation results

    R->>S: Start services in verify mode
    S->>L: Launch WirthForge (test mode)
    L-->>S: Service startup status

    alt Smoke Tests Fail
        R->>S: Emergency rollback
        S->>L: Restore previous state
        R-->>U: Recovery failed, system rolled back
    else Smoke Tests Pass
        R->>S: Confirm production mode
        S->>L: Switch to normal operation
        R->>V: Record successful recovery
        V->>A: Update audit trail
        R-->>U: Recovery completed successfully
    end

    Note over U,S: Cleanup & Monitoring
    R->>M: Resume normal monitoring
    M->>M: Verify system health post-recovery
    M-->>U: System status dashboard update
```

## Recovery Scope Options

### 1. Configuration Only
```mermaid
graph LR
    A[config.json] --> B[User Settings]
    A --> C[Policy Files]
    A --> D[UI Preferences]
    
    style A fill:#e3f2fd
    style B fill:#f1f8e9
    style C fill:#f1f8e9
    style D fill:#f1f8e9
```

### 2. Database Only
```mermaid
graph LR
    A[wirthforge.db] --> B[User Data]
    A --> C[Session State]
    A --> D[Audit Records]
    
    style A fill:#e8eaf6
    style B fill:#f1f8e9
    style C fill:#f1f8e9
    style D fill:#f1f8e9
```

### 3. Full System Recovery
```mermaid
graph TB
    A[Full Backup] --> B[Configuration]
    A --> C[Database]
    A --> D[Certificates]
    A --> E[Audit Logs]
    A --> F[Models - Optional]
    
    style A fill:#ffebee
    style B fill:#f1f8e9
    style C fill:#f1f8e9
    style D fill:#f1f8e9
    style E fill:#f1f8e9
    style F fill:#fff3e0
```

## Safety Mechanisms

### 1. Pre-Recovery Checks
- Backup integrity verification (SHA-256)
- System load assessment
- Service dependency validation
- Disk space availability

### 2. During Recovery
- Progressive hash validation
- Atomic file operations
- Progress tracking with rollback points
- Frame budget monitoring

### 3. Post-Recovery Validation
- Service startup verification
- Database consistency checks
- Configuration validation
- Smoke test execution

### 4. Emergency Rollback
- Automatic rollback on smoke test failure
- Manual rollback option during recovery
- Previous state preservation
- Audit trail of rollback events
