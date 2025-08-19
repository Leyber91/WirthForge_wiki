# WF-OPS-001 Update Process Diagram

## Local Update System with Rollback
This diagram shows the comprehensive update process for WIRTHFORGE, emphasizing local control, safety, and rollback capabilities.

```mermaid
flowchart TD
    START([Update Check Initiated]) --> TRIGGER{{"Update Trigger\nSource"}}
    
    TRIGGER -->|Manual| MANUAL_CHECK[User Initiated Check]
    TRIGGER -->|Scheduled| AUTO_CHECK[Scheduled Check]
    TRIGGER -->|Startup| BOOT_CHECK[Startup Check]
    
    MANUAL_CHECK --> FETCH_MANIFEST[Fetch Update Manifest]
    AUTO_CHECK --> FETCH_MANIFEST
    BOOT_CHECK --> FETCH_MANIFEST
    
    FETCH_MANIFEST --> PARSE_MANIFEST[Parse Manifest JSON]
    PARSE_MANIFEST --> VERSION_COMPARE{{"Compare\nVersions"}}
    
    VERSION_COMPARE -->|Current| NO_UPDATE[No Updates Available]
    VERSION_COMPARE -->|Newer Available| UPDATE_AVAILABLE[Updates Available]
    
    UPDATE_AVAILABLE --> SHOW_UI[Show Update UI]
    SHOW_UI --> USER_CHOICE{{"User Decision"}}
    
    USER_CHOICE -->|Later| POSTPONE[Postpone Update]
    USER_CHOICE -->|Never| DISABLE[Disable Auto-Updates]
    USER_CHOICE -->|Update| PROCEED[Proceed with Update]
    
    PROCEED --> PRE_UPDATE[Pre-Update Checks]
    PRE_UPDATE --> DISK_SPACE{{"Sufficient\nDisk Space?"}}
    DISK_SPACE -->|No| SPACE_ERROR[Insufficient Space Error]
    DISK_SPACE -->|Yes| BACKUP_CURRENT[Backup Current Installation]
    
    BACKUP_CURRENT --> BACKUP_SUCCESS{{"Backup\nSuccessful?"}}
    BACKUP_SUCCESS -->|No| BACKUP_ERROR[Backup Failed Error]
    BACKUP_SUCCESS -->|Yes| DOWNLOAD_PACKAGES[Download Update Packages]
    
    DOWNLOAD_PACKAGES --> DOWNLOAD_PROGRESS[Show Download Progress]
    DOWNLOAD_PROGRESS --> VERIFY_PACKAGES[Verify Package Integrity]
    VERIFY_PACKAGES --> INTEGRITY_CHECK{{"Integrity\nValid?"}}
    
    INTEGRITY_CHECK -->|No| INTEGRITY_ERROR[Package Corrupted Error]
    INTEGRITY_CHECK -->|Yes| STOP_SERVICES[Stop WIRTHFORGE Services]
    
    STOP_SERVICES --> APPLY_UPDATES[Apply Updates]
    APPLY_UPDATES --> UPDATE_CORE[Update Core Files]
    UPDATE_CORE --> UPDATE_UI[Update Web UI]
    UPDATE_UI --> UPDATE_MODELS[Update AI Models]
    UPDATE_MODELS --> UPDATE_CONFIG[Update Configuration]
    UPDATE_CONFIG --> UPDATE_DB[Migrate Database]
    
    UPDATE_DB --> MIGRATION_SUCCESS{{"Migration\nSuccessful?"}}
    MIGRATION_SUCCESS -->|No| MIGRATION_ERROR[Database Migration Failed]
    MIGRATION_SUCCESS -->|Yes| START_SERVICES[Start Services]
    
    START_SERVICES --> SMOKE_TEST[Run Smoke Tests]
    SMOKE_TEST --> TEST_SERVER[Test Local Server]
    TEST_SERVER --> TEST_AI_LOAD[Test AI Model Loading]
    TEST_AI_LOAD --> TEST_DB_CONN[Test Database Connection]
    TEST_DB_CONN --> TEST_UI[Test Web UI]
    
    TEST_UI --> SMOKE_RESULT{{"All Tests\nPassed?"}}
    SMOKE_RESULT -->|Yes| UPDATE_SUCCESS[Update Successful]
    SMOKE_RESULT -->|No| ROLLBACK_INIT[Initialize Rollback]
    
    ROLLBACK_INIT --> STOP_NEW[Stop New Services]
    STOP_NEW --> RESTORE_BACKUP[Restore from Backup]
    RESTORE_BACKUP --> RESTORE_CONFIG[Restore Configuration]
    RESTORE_CONFIG --> RESTORE_DB[Restore Database]
    RESTORE_DB --> START_OLD[Start Previous Version]
    START_OLD --> ROLLBACK_TEST[Test Rollback]
    
    ROLLBACK_TEST --> ROLLBACK_SUCCESS{{"Rollback\nSuccessful?"}}
    ROLLBACK_SUCCESS -->|Yes| ROLLBACK_COMPLETE[Rollback Complete]
    ROLLBACK_SUCCESS -->|No| CRITICAL_ERROR[Critical System Error]
    
    UPDATE_SUCCESS --> CLEANUP[Cleanup Old Files]
    CLEANUP --> UPDATE_MANIFEST[Update Local Manifest]
    UPDATE_MANIFEST --> NOTIFY_SUCCESS[Notify User Success]
    
    ROLLBACK_COMPLETE --> NOTIFY_ROLLBACK[Notify User Rollback]
    NOTIFY_ROLLBACK --> SHOW_LOGS[Show Error Logs]
    
    %% Error handling paths
    SPACE_ERROR --> ERROR_DIALOG[Show Error Dialog]
    BACKUP_ERROR --> ERROR_DIALOG
    INTEGRITY_ERROR --> ERROR_DIALOG
    MIGRATION_ERROR --> ROLLBACK_INIT
    CRITICAL_ERROR --> EMERGENCY_MODE[Emergency Recovery Mode]
    
    ERROR_DIALOG --> RETRY_OPTION{{"User Wants\nto Retry?"}}
    RETRY_OPTION -->|Yes| PRE_UPDATE
    RETRY_OPTION -->|No| UPDATE_CANCELLED[Update Cancelled]
    
    EMERGENCY_MODE --> MANUAL_RECOVERY[Manual Recovery Guide]
    MANUAL_RECOVERY --> SUPPORT_CONTACT[Contact Support Info]
    
    %% Final states
    NO_UPDATE --> END([Update Check Complete])
    POSTPONE --> END
    DISABLE --> END
    NOTIFY_SUCCESS --> END
    SHOW_LOGS --> END
    UPDATE_CANCELLED --> END
    SUPPORT_CONTACT --> END
    
    subgraph "Update Types"
        CORE_UPDATE[Core Application Update]
        UI_UPDATE[Web UI Update]
        MODEL_UPDATE[AI Model Update]
        CONFIG_UPDATE[Configuration Update]
        PATCH_UPDATE[Security Patch]
    end
    
    subgraph "Backup Strategy"
        FULL_BACKUP[Full Installation Backup]
        INCREMENTAL[Incremental Backup]
        CONFIG_BACKUP[Configuration Backup]
        DATA_BACKUP[User Data Backup]
    end
    
    subgraph "Verification Methods"
        SHA256_CHECK[SHA-256 Checksum]
        DIGITAL_SIG[Digital Signature]
        SIZE_CHECK[File Size Verification]
        VERSION_CHECK[Version Validation]
    end
    
    %% Update type connections
    UPDATE_CORE -.-> CORE_UPDATE
    UPDATE_UI -.-> UI_UPDATE
    UPDATE_MODELS -.-> MODEL_UPDATE
    UPDATE_CONFIG -.-> CONFIG_UPDATE
    
    %% Backup strategy connections
    BACKUP_CURRENT -.-> FULL_BACKUP
    BACKUP_CURRENT -.-> CONFIG_BACKUP
    BACKUP_CURRENT -.-> DATA_BACKUP
    
    %% Verification connections
    VERIFY_PACKAGES -.-> SHA256_CHECK
    VERIFY_PACKAGES -.-> DIGITAL_SIG
    VERIFY_PACKAGES -.-> SIZE_CHECK
    VERIFY_PACKAGES -.-> VERSION_CHECK
    
    classDef startEnd fill:#e8f5e8,stroke:#2e7d32,stroke-width:3px
    classDef trigger fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef process fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef decision fill:#ffebee,stroke:#d32f2f,stroke-width:2px
    classDef success fill:#e0f2f1,stroke:#00695c,stroke-width:2px
    classDef error fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef rollback fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef info fill:#f5f5f5,stroke:#424242,stroke-width:1px
    
    class START,END startEnd
    class MANUAL_CHECK,AUTO_CHECK,BOOT_CHECK,SHOW_UI trigger
    class FETCH_MANIFEST,PARSE_MANIFEST,PRE_UPDATE,BACKUP_CURRENT,DOWNLOAD_PACKAGES,APPLY_UPDATES,SMOKE_TEST,CLEANUP process
    class VERSION_COMPARE,USER_CHOICE,DISK_SPACE,BACKUP_SUCCESS,INTEGRITY_CHECK,MIGRATION_SUCCESS,SMOKE_RESULT,ROLLBACK_SUCCESS,RETRY_OPTION decision
    class UPDATE_SUCCESS,NOTIFY_SUCCESS,UPDATE_MANIFEST success
    class SPACE_ERROR,BACKUP_ERROR,INTEGRITY_ERROR,MIGRATION_ERROR,CRITICAL_ERROR,ERROR_DIALOG error
    class ROLLBACK_INIT,RESTORE_BACKUP,ROLLBACK_COMPLETE,NOTIFY_ROLLBACK rollback
    class CORE_UPDATE,UI_UPDATE,MODEL_UPDATE,CONFIG_UPDATE,PATCH_UPDATE,FULL_BACKUP,INCREMENTAL,CONFIG_BACKUP,DATA_BACKUP,SHA256_CHECK,DIGITAL_SIG,SIZE_CHECK,VERSION_CHECK info
```

## Update Manifest Structure

```mermaid
graph TB
    subgraph "Update Manifest (JSON)"
        MANIFEST[update-manifest.json]
        
        subgraph "Version Information"
            CURRENT_VER[currentVersion]
            LATEST_VER[latestVersion]
            RELEASE_DATE[releaseDate]
            RELEASE_NOTES[releaseNotes]
        end
        
        subgraph "Package Information"
            PACKAGES[packages[]]
            PKG_CORE[core-update.zip]
            PKG_UI[ui-update.zip]
            PKG_MODELS[models-update.zip]
            PKG_CONFIG[config-update.zip]
        end
        
        subgraph "Verification Data"
            CHECKSUMS[checksums{}]
            SHA256[sha256 hashes]
            FILE_SIZES[fileSizes{}]
            SIGNATURES[digitalSignatures{}]
        end
        
        subgraph "Update Metadata"
            UPDATE_TYPE[updateType]
            PRIORITY[priority]
            ROLLBACK_INFO[rollbackInfo]
            DEPENDENCIES[dependencies[]]
        end
        
        subgraph "Compatibility"
            MIN_VERSION[minimumVersion]
            OS_SUPPORT[supportedOS[]]
            ARCH_SUPPORT[supportedArch[]]
            BREAKING_CHANGES[breakingChanges]
        end
    end
    
    MANIFEST --> CURRENT_VER
    MANIFEST --> LATEST_VER
    MANIFEST --> RELEASE_DATE
    MANIFEST --> RELEASE_NOTES
    
    MANIFEST --> PACKAGES
    PACKAGES --> PKG_CORE
    PACKAGES --> PKG_UI
    PACKAGES --> PKG_MODELS
    PACKAGES --> PKG_CONFIG
    
    MANIFEST --> CHECKSUMS
    CHECKSUMS --> SHA256
    CHECKSUMS --> FILE_SIZES
    CHECKSUMS --> SIGNATURES
    
    MANIFEST --> UPDATE_TYPE
    MANIFEST --> PRIORITY
    MANIFEST --> ROLLBACK_INFO
    MANIFEST --> DEPENDENCIES
    
    MANIFEST --> MIN_VERSION
    MANIFEST --> OS_SUPPORT
    MANIFEST --> ARCH_SUPPORT
    MANIFEST --> BREAKING_CHANGES
    
    classDef manifest fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef version fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef packages fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef verification fill:#ffebee,stroke:#d32f2f,stroke-width:2px
    classDef metadata fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef compatibility fill:#e0f2f1,stroke:#00695c,stroke-width:2px
    
    class MANIFEST manifest
    class CURRENT_VER,LATEST_VER,RELEASE_DATE,RELEASE_NOTES version
    class PACKAGES,PKG_CORE,PKG_UI,PKG_MODELS,PKG_CONFIG packages
    class CHECKSUMS,SHA256,FILE_SIZES,SIGNATURES verification
    class UPDATE_TYPE,PRIORITY,ROLLBACK_INFO,DEPENDENCIES metadata
    class MIN_VERSION,OS_SUPPORT,ARCH_SUPPORT,BREAKING_CHANGES compatibility
```

## Rollback Recovery Process

```mermaid
sequenceDiagram
    participant U as User
    participant UM as Update Manager
    participant FS as File System
    participant DB as Database
    participant SRV as Services
    participant BK as Backup System
    
    Note over U,BK: Update Failure Detected
    
    U->>UM: Update failed notification
    UM->>SRV: Stop new version services
    SRV-->>UM: Services stopped
    
    UM->>BK: Request rollback to previous version
    BK->>FS: Restore application files
    FS-->>BK: Files restored
    
    BK->>DB: Restore database backup
    DB-->>BK: Database restored
    
    BK->>FS: Restore configuration files
    FS-->>BK: Configuration restored
    
    UM->>SRV: Start previous version services
    SRV-->>UM: Services started
    
    UM->>UM: Run health checks
    UM->>U: Rollback complete notification
    
    alt Health Check Fails
        UM->>U: Critical error - manual intervention required
        U->>UM: Request emergency recovery
        UM->>BK: Activate emergency recovery mode
        BK->>U: Show manual recovery instructions
    end
    
    Note over U,BK: System restored to previous working state
```

## Key Update Principles

### 1. **Safety First**
- Complete backup before any changes
- Comprehensive verification of all packages
- Smoke testing after updates
- Automatic rollback on failure

### 2. **Local Control**
- User controls update timing and approval
- No forced updates or automatic installations
- Complete offline update capability
- Local manifest and package management

### 3. **Reliability**
- Multiple verification methods (checksums, signatures)
- Incremental update support for large files
- Robust error handling and recovery
- Detailed logging for troubleshooting

### 4. **User Experience**
- Clear progress indication during updates
- Informative error messages and solutions
- Minimal downtime during update process
- Seamless rollback when needed

### 5. **Security**
- Digital signature verification
- Secure download channels
- No elevation of privileges during updates
- Audit trail of all update activities

This update system ensures WIRTHFORGE can evolve safely while maintaining local-first principles and providing users with complete control over their installation.
