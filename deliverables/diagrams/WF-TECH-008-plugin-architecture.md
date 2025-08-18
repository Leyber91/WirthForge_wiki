# WF-TECH-008 Plugin Architecture Diagrams

This document contains comprehensive architecture diagrams for the WIRTHFORGE Plugin System, including C4 model diagrams, sequence flows, and component interactions.

## System Context Diagram (C4 Level 1)

```mermaid
graph TB
    subgraph "WIRTHFORGE System"
        CORE[WIRTHFORGE Core]
        PLUGIN_MGR[Plugin Manager]
        SANDBOX[Security Sandbox]
    end
    
    subgraph "External Actors"
        DEV[Plugin Developer]
        USER[End User]
        MARKETPLACE[Plugin Marketplace]
    end
    
    subgraph "Plugin Ecosystem"
        PLUGIN_A[Plugin A]
        PLUGIN_B[Plugin B]
        PLUGIN_C[Plugin C]
    end
    
    %% User interactions
    USER -->|Uses plugins| CORE
    DEV -->|Develops plugins| PLUGIN_A
    DEV -->|Publishes to| MARKETPLACE
    
    %% System interactions
    CORE -->|Manages| PLUGIN_MGR
    PLUGIN_MGR -->|Isolates| SANDBOX
    SANDBOX -->|Executes| PLUGIN_A
    SANDBOX -->|Executes| PLUGIN_B
    SANDBOX -->|Executes| PLUGIN_C
    
    %% Marketplace interactions
    PLUGIN_MGR -->|Downloads from| MARKETPLACE
    MARKETPLACE -->|Distributes| PLUGIN_A
    
    classDef system fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef external fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef plugin fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    
    class CORE,PLUGIN_MGR,SANDBOX system
    class DEV,USER,MARKETPLACE external
    class PLUGIN_A,PLUGIN_B,PLUGIN_C plugin
```

## Container Diagram (C4 Level 2)

```mermaid
graph TB
    subgraph "WIRTHFORGE Core System"
        ORCHESTRATOR[Orchestrator Engine]
        DECIPHER[DECIPHER Loop]
        ENERGY_SVC[Energy Service]
        WS_SERVER[WebSocket Server]
    end
    
    subgraph "Plugin Management Layer"
        PLUGIN_MGR[Plugin Manager]
        REGISTRY[Plugin Registry]
        LOADER[Plugin Loader]
        LIFECYCLE[Lifecycle Manager]
    end
    
    subgraph "Security Layer"
        SANDBOX[Security Sandbox]
        PERMISSION_MGR[Permission Manager]
        RESOURCE_MONITOR[Resource Monitor]
        API_GATEWAY[API Gateway]
    end
    
    subgraph "Plugin Runtime Environment"
        PYTHON_RUNTIME[Python Runtime]
        TS_RUNTIME[TypeScript Runtime]
        CAPABILITY_BROKER[Capability Broker]
        EVENT_BUS[Event Bus]
    end
    
    subgraph "External Systems"
        MARKETPLACE[Plugin Marketplace]
        FILE_SYSTEM[Local File System]
        NETWORK[Network Services]
    end
    
    %% Core system connections
    ORCHESTRATOR -->|Coordinates| PLUGIN_MGR
    DECIPHER -->|Requests capabilities| API_GATEWAY
    ENERGY_SVC -->|Monitors plugin energy| RESOURCE_MONITOR
    WS_SERVER -->|Broadcasts plugin events| EVENT_BUS
    
    %% Plugin management connections
    PLUGIN_MGR -->|Manages| REGISTRY
    PLUGIN_MGR -->|Controls| LOADER
    PLUGIN_MGR -->|Orchestrates| LIFECYCLE
    REGISTRY -->|Stores metadata| FILE_SYSTEM
    
    %% Security layer connections
    LOADER -->|Loads into| SANDBOX
    SANDBOX -->|Enforces| PERMISSION_MGR
    SANDBOX -->|Monitors| RESOURCE_MONITOR
    API_GATEWAY -->|Validates requests| PERMISSION_MGR
    
    %% Runtime environment connections
    SANDBOX -->|Executes Python| PYTHON_RUNTIME
    SANDBOX -->|Executes TypeScript| TS_RUNTIME
    PYTHON_RUNTIME -->|Accesses capabilities| CAPABILITY_BROKER
    TS_RUNTIME -->|Accesses capabilities| CAPABILITY_BROKER
    CAPABILITY_BROKER -->|Publishes events| EVENT_BUS
    
    %% External connections
    PLUGIN_MGR -->|Downloads from| MARKETPLACE
    MARKETPLACE -->|Provides packages| NETWORK
    
    classDef core fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef management fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef security fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef runtime fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef external fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    
    class ORCHESTRATOR,DECIPHER,ENERGY_SVC,WS_SERVER core
    class PLUGIN_MGR,REGISTRY,LOADER,LIFECYCLE management
    class SANDBOX,PERMISSION_MGR,RESOURCE_MONITOR,API_GATEWAY security
    class PYTHON_RUNTIME,TS_RUNTIME,CAPABILITY_BROKER,EVENT_BUS runtime
    class MARKETPLACE,FILE_SYSTEM,NETWORK external
```

## Component Diagram (C4 Level 3) - Plugin Manager

```mermaid
graph TB
    subgraph "Plugin Manager Components"
        subgraph "Discovery & Registry"
            DISCOVERY[Plugin Discovery]
            REGISTRY[Plugin Registry]
            METADATA[Metadata Parser]
            VALIDATOR[Package Validator]
        end
        
        subgraph "Installation & Lifecycle"
            INSTALLER[Plugin Installer]
            UNINSTALLER[Plugin Uninstaller]
            UPDATER[Plugin Updater]
            LIFECYCLE[Lifecycle Controller]
        end
        
        subgraph "Runtime Management"
            LOADER[Plugin Loader]
            ACTIVATOR[Plugin Activator]
            DEACTIVATOR[Plugin Deactivator]
            MONITOR[Health Monitor]
        end
        
        subgraph "Security & Isolation"
            SANDBOX_MGR[Sandbox Manager]
            PERMISSION_CTRL[Permission Controller]
            RESOURCE_LIMITER[Resource Limiter]
            AUDIT_LOG[Audit Logger]
        end
    end
    
    subgraph "External Interfaces"
        CLI[Plugin CLI]
        REST_API[REST API]
        MARKETPLACE_API[Marketplace API]
        FILE_STORE[Plugin Storage]
    end
    
    %% Discovery flow
    CLI -->|Triggers| DISCOVERY
    DISCOVERY -->|Queries| MARKETPLACE_API
    DISCOVERY -->|Validates| VALIDATOR
    VALIDATOR -->|Parses| METADATA
    METADATA -->|Registers| REGISTRY
    
    %% Installation flow
    REGISTRY -->|Initiates| INSTALLER
    INSTALLER -->|Downloads| MARKETPLACE_API
    INSTALLER -->|Stores| FILE_STORE
    INSTALLER -->|Updates| LIFECYCLE
    
    %% Runtime flow
    LIFECYCLE -->|Loads| LOADER
    LOADER -->|Activates| ACTIVATOR
    ACTIVATOR -->|Creates| SANDBOX_MGR
    SANDBOX_MGR -->|Enforces| PERMISSION_CTRL
    SANDBOX_MGR -->|Limits| RESOURCE_LIMITER
    
    %% Monitoring flow
    ACTIVATOR -->|Monitors| MONITOR
    MONITOR -->|Reports to| AUDIT_LOG
    RESOURCE_LIMITER -->|Logs violations| AUDIT_LOG
    
    %% Management operations
    REST_API -->|Manages| LIFECYCLE
    LIFECYCLE -->|Controls| UPDATER
    LIFECYCLE -->|Controls| UNINSTALLER
    UNINSTALLER -->|Deactivates| DEACTIVATOR
    DEACTIVATOR -->|Cleans up| FILE_STORE
    
    classDef discovery fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef lifecycle fill:#fff8e1,stroke:#f57c00,stroke-width:2px
    classDef runtime fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef security fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef external fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    
    class DISCOVERY,REGISTRY,METADATA,VALIDATOR discovery
    class INSTALLER,UNINSTALLER,UPDATER,LIFECYCLE lifecycle
    class LOADER,ACTIVATOR,DEACTIVATOR,MONITOR runtime
    class SANDBOX_MGR,PERMISSION_CTRL,RESOURCE_LIMITER,AUDIT_LOG security
    class CLI,REST_API,MARKETPLACE_API,FILE_STORE external
```

## Plugin Lifecycle Sequence Diagram

```mermaid
sequenceDiagram
    participant DEV as Plugin Developer
    participant CLI as Plugin CLI
    participant MGR as Plugin Manager
    participant REG as Registry
    participant SAND as Sandbox
    participant CORE as WIRTHFORGE Core
    
    Note over DEV,CORE: Plugin Development & Installation
    
    DEV->>CLI: wirthforge plugin create my-plugin
    CLI->>MGR: Initialize plugin project
    MGR->>REG: Register development plugin
    REG-->>CLI: Project template created
    
    Note over DEV,CORE: Plugin Development
    DEV->>DEV: Develop plugin code
    DEV->>CLI: wirthforge plugin validate
    CLI->>MGR: Validate plugin package
    MGR->>MGR: Check manifest, dependencies
    MGR-->>CLI: Validation results
    
    Note over DEV,CORE: Plugin Installation
    DEV->>CLI: wirthforge plugin install ./my-plugin
    CLI->>MGR: Install plugin request
    MGR->>REG: Check compatibility
    REG-->>MGR: Compatibility confirmed
    
    MGR->>SAND: Create sandbox environment
    SAND->>SAND: Initialize security context
    SAND-->>MGR: Sandbox ready
    
    MGR->>MGR: Load plugin into sandbox
    MGR->>REG: Register active plugin
    MGR-->>CLI: Installation complete
    
    Note over DEV,CORE: Plugin Activation & Runtime
    CORE->>MGR: Request plugin capability
    MGR->>REG: Lookup plugin
    REG-->>MGR: Plugin metadata
    
    MGR->>SAND: Execute plugin method
    SAND->>SAND: Validate permissions
    SAND->>SAND: Execute in isolated context
    SAND-->>MGR: Execution result
    MGR-->>CORE: Capability response
    
    Note over DEV,CORE: Plugin Monitoring
    loop Health Monitoring
        MGR->>SAND: Check plugin health
        SAND-->>MGR: Health status
        alt Plugin unhealthy
            MGR->>SAND: Terminate plugin
            MGR->>REG: Mark plugin inactive
        end
    end
    
    Note over DEV,CORE: Plugin Uninstallation
    DEV->>CLI: wirthforge plugin uninstall my-plugin
    CLI->>MGR: Uninstall request
    MGR->>SAND: Deactivate plugin
    SAND->>SAND: Clean up resources
    SAND-->>MGR: Cleanup complete
    
    MGR->>REG: Unregister plugin
    MGR->>MGR: Remove plugin files
    MGR-->>CLI: Uninstallation complete
```

## Security Sandbox Architecture

```mermaid
graph TB
    subgraph "Host System"
        HOST_OS[Host Operating System]
        WIRTHFORGE_CORE[WIRTHFORGE Core]
        PLUGIN_MGR[Plugin Manager]
    end
    
    subgraph "Sandbox Environment"
        subgraph "Process Isolation"
            SANDBOX_PROC[Sandbox Process]
            NAMESPACE[Linux Namespaces]
            CGROUPS[Control Groups]
        end
        
        subgraph "Runtime Environments"
            PYTHON_VM[Python Virtual Machine]
            NODE_VM[Node.js Runtime]
            WASM_VM[WebAssembly Runtime]
        end
        
        subgraph "Security Controls"
            SECCOMP[Seccomp Filter]
            APPARMOR[AppArmor Profile]
            CAPABILITIES[Linux Capabilities]
            RESOURCE_LIMITS[Resource Limits]
        end
        
        subgraph "API Gateway"
            CAPABILITY_PROXY[Capability Proxy]
            PERMISSION_CHECK[Permission Checker]
            AUDIT_LOGGER[Audit Logger]
            RATE_LIMITER[Rate Limiter]
        end
    end
    
    subgraph "Plugin Code"
        PLUGIN_A[Plugin A Code]
        PLUGIN_B[Plugin B Code]
        PLUGIN_C[Plugin C Code]
    end
    
    %% Host to sandbox communication
    WIRTHFORGE_CORE -->|IPC| CAPABILITY_PROXY
    PLUGIN_MGR -->|Controls| SANDBOX_PROC
    
    %% Sandbox process isolation
    SANDBOX_PROC -->|Isolates| NAMESPACE
    SANDBOX_PROC -->|Limits| CGROUPS
    NAMESPACE -->|Contains| PYTHON_VM
    NAMESPACE -->|Contains| NODE_VM
    NAMESPACE -->|Contains| WASM_VM
    
    %% Security enforcement
    SANDBOX_PROC -->|Enforces| SECCOMP
    SANDBOX_PROC -->|Applies| APPARMOR
    SANDBOX_PROC -->|Drops| CAPABILITIES
    CGROUPS -->|Enforces| RESOURCE_LIMITS
    
    %% Plugin execution
    PYTHON_VM -->|Executes| PLUGIN_A
    NODE_VM -->|Executes| PLUGIN_B
    WASM_VM -->|Executes| PLUGIN_C
    
    %% API gateway controls
    PLUGIN_A -->|Calls API| CAPABILITY_PROXY
    PLUGIN_B -->|Calls API| CAPABILITY_PROXY
    PLUGIN_C -->|Calls API| CAPABILITY_PROXY
    
    CAPABILITY_PROXY -->|Validates| PERMISSION_CHECK
    CAPABILITY_PROXY -->|Logs| AUDIT_LOGGER
    CAPABILITY_PROXY -->|Throttles| RATE_LIMITER
    
    %% Security boundaries
    PERMISSION_CHECK -.->|Blocks unauthorized| PLUGIN_A
    RATE_LIMITER -.->|Throttles excessive| PLUGIN_B
    RESOURCE_LIMITS -.->|Kills resource hogs| PLUGIN_C
    
    classDef host fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef sandbox fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef security fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef runtime fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef plugin fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    
    class HOST_OS,WIRTHFORGE_CORE,PLUGIN_MGR host
    class SANDBOX_PROC,NAMESPACE,CGROUPS,CAPABILITY_PROXY sandbox
    class SECCOMP,APPARMOR,CAPABILITIES,RESOURCE_LIMITS,PERMISSION_CHECK,AUDIT_LOGGER,RATE_LIMITER security
    class PYTHON_VM,NODE_VM,WASM_VM runtime
    class PLUGIN_A,PLUGIN_B,PLUGIN_C plugin
```

## Plugin API Integration Flow

```mermaid
sequenceDiagram
    participant PLUGIN as Plugin Code
    participant PROXY as Capability Proxy
    participant PERM as Permission Manager
    participant AUDIT as Audit Logger
    participant CORE as WIRTHFORGE Core
    participant ENERGY as Energy Service
    
    Note over PLUGIN,ENERGY: Plugin API Call Flow
    
    PLUGIN->>PROXY: Call WIRTHFORGE API
    PROXY->>PERM: Check permissions
    
    alt Permission granted
        PERM-->>PROXY: Permission OK
        PROXY->>AUDIT: Log API call
        PROXY->>CORE: Forward API request
        
        alt Energy-related API
            CORE->>ENERGY: Process energy request
            ENERGY->>ENERGY: Update energy state
            ENERGY-->>CORE: Energy response
        end
        
        CORE-->>PROXY: API response
        PROXY->>AUDIT: Log response
        PROXY-->>PLUGIN: Return result
        
    else Permission denied
        PERM-->>PROXY: Permission denied
        PROXY->>AUDIT: Log security violation
        PROXY-->>PLUGIN: Throw SecurityError
    end
    
    Note over PLUGIN,ENERGY: Resource Monitoring
    
    loop Continuous Monitoring
        PROXY->>PROXY: Monitor resource usage
        alt Resource limit exceeded
            PROXY->>AUDIT: Log resource violation
            PROXY->>PLUGIN: Throttle or terminate
        end
    end
    
    Note over PLUGIN,ENERGY: Event Publishing
    
    PLUGIN->>PROXY: Publish event
    PROXY->>PERM: Check event permissions
    PERM-->>PROXY: Permission OK
    PROXY->>CORE: Forward event
    CORE->>CORE: Broadcast to subscribers
    PROXY->>AUDIT: Log event publication
```

## Plugin Marketplace Integration

```mermaid
graph TB
    subgraph "Plugin Marketplace"
        MARKETPLACE_API[Marketplace API]
        PACKAGE_STORE[Package Storage]
        METADATA_DB[Metadata Database]
        SIGNING_SVC[Package Signing Service]
        REVIEW_SYS[Review System]
    end
    
    subgraph "WIRTHFORGE Client"
        PLUGIN_MGR[Plugin Manager]
        PKG_VALIDATOR[Package Validator]
        SIG_VERIFIER[Signature Verifier]
        LOCAL_REGISTRY[Local Registry]
        INSTALLER[Plugin Installer]
    end
    
    subgraph "Developer Tools"
        PLUGIN_CLI[Plugin CLI]
        BUILD_TOOLS[Build Tools]
        PUBLISHER[Package Publisher]
        SIGNING_CLIENT[Signing Client]
    end
    
    %% Publishing flow
    PLUGIN_CLI -->|Build package| BUILD_TOOLS
    BUILD_TOOLS -->|Sign package| SIGNING_CLIENT
    SIGNING_CLIENT -->|Request signature| SIGNING_SVC
    SIGNING_SVC -->|Return signed package| SIGNING_CLIENT
    SIGNING_CLIENT -->|Publish| PUBLISHER
    PUBLISHER -->|Upload| MARKETPLACE_API
    MARKETPLACE_API -->|Store| PACKAGE_STORE
    MARKETPLACE_API -->|Index| METADATA_DB
    MARKETPLACE_API -->|Queue for review| REVIEW_SYS
    
    %% Discovery flow
    PLUGIN_MGR -->|Search plugins| MARKETPLACE_API
    MARKETPLACE_API -->|Query| METADATA_DB
    METADATA_DB -->|Return results| MARKETPLACE_API
    MARKETPLACE_API -->|Return metadata| PLUGIN_MGR
    
    %% Installation flow
    PLUGIN_MGR -->|Download package| MARKETPLACE_API
    MARKETPLACE_API -->|Serve package| PACKAGE_STORE
    PACKAGE_STORE -->|Return package| PLUGIN_MGR
    PLUGIN_MGR -->|Validate| PKG_VALIDATOR
    PKG_VALIDATOR -->|Verify signature| SIG_VERIFIER
    SIG_VERIFIER -->|Check against| SIGNING_SVC
    
    alt Validation successful
        PKG_VALIDATOR -->|Install| INSTALLER
        INSTALLER -->|Register| LOCAL_REGISTRY
    else Validation failed
        PKG_VALIDATOR -->|Reject| PLUGIN_MGR
    end
    
    classDef marketplace fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef client fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef developer fill:#fff8e1,stroke:#f57c00,stroke-width:2px
    
    class MARKETPLACE_API,PACKAGE_STORE,METADATA_DB,SIGNING_SVC,REVIEW_SYS marketplace
    class PLUGIN_MGR,PKG_VALIDATOR,SIG_VERIFIER,LOCAL_REGISTRY,INSTALLER client
    class PLUGIN_CLI,BUILD_TOOLS,PUBLISHER,SIGNING_CLIENT developer
```

## Resource Management & Monitoring

```mermaid
graph TB
    subgraph "Resource Monitoring System"
        subgraph "Metrics Collection"
            CPU_MONITOR[CPU Monitor]
            MEM_MONITOR[Memory Monitor]
            IO_MONITOR[I/O Monitor]
            NET_MONITOR[Network Monitor]
            ENERGY_MONITOR[Energy Monitor]
        end
        
        subgraph "Resource Controllers"
            CPU_LIMITER[CPU Limiter]
            MEM_LIMITER[Memory Limiter]
            IO_LIMITER[I/O Limiter]
            NET_LIMITER[Network Limiter]
            ENERGY_BUDGET[Energy Budget]
        end
        
        subgraph "Policy Engine"
            POLICY_MGR[Policy Manager]
            THRESHOLD_MGR[Threshold Manager]
            ACTION_ENGINE[Action Engine]
            ALERT_MGR[Alert Manager]
        end
    end
    
    subgraph "Plugin Sandboxes"
        SANDBOX_A[Plugin A Sandbox]
        SANDBOX_B[Plugin B Sandbox]
        SANDBOX_C[Plugin C Sandbox]
    end
    
    subgraph "WIRTHFORGE Core"
        ORCHESTRATOR[Orchestrator]
        ENERGY_SVC[Energy Service]
        METRICS_SVC[Metrics Service]
    end
    
    %% Monitoring connections
    SANDBOX_A -->|Reports metrics| CPU_MONITOR
    SANDBOX_A -->|Reports metrics| MEM_MONITOR
    SANDBOX_A -->|Reports metrics| IO_MONITOR
    SANDBOX_A -->|Reports metrics| NET_MONITOR
    SANDBOX_A -->|Reports metrics| ENERGY_MONITOR
    
    SANDBOX_B -->|Reports metrics| CPU_MONITOR
    SANDBOX_C -->|Reports metrics| CPU_MONITOR
    
    %% Resource control
    CPU_LIMITER -->|Throttles| SANDBOX_A
    MEM_LIMITER -->|Limits| SANDBOX_B
    IO_LIMITER -->|Throttles| SANDBOX_C
    NET_LIMITER -->|Blocks| SANDBOX_A
    ENERGY_BUDGET -->|Suspends| SANDBOX_B
    
    %% Policy enforcement
    CPU_MONITOR -->|Feeds data| POLICY_MGR
    MEM_MONITOR -->|Feeds data| POLICY_MGR
    IO_MONITOR -->|Feeds data| POLICY_MGR
    NET_MONITOR -->|Feeds data| POLICY_MGR
    ENERGY_MONITOR -->|Feeds data| POLICY_MGR
    
    POLICY_MGR -->|Configures| THRESHOLD_MGR
    THRESHOLD_MGR -->|Triggers| ACTION_ENGINE
    ACTION_ENGINE -->|Controls| CPU_LIMITER
    ACTION_ENGINE -->|Controls| MEM_LIMITER
    ACTION_ENGINE -->|Controls| IO_LIMITER
    ACTION_ENGINE -->|Controls| NET_LIMITER
    ACTION_ENGINE -->|Controls| ENERGY_BUDGET
    
    ACTION_ENGINE -->|Sends alerts| ALERT_MGR
    ALERT_MGR -->|Notifies| ORCHESTRATOR
    
    %% Integration with core
    ENERGY_MONITOR -->|Reports to| ENERGY_SVC
    CPU_MONITOR -->|Reports to| METRICS_SVC
    MEM_MONITOR -->|Reports to| METRICS_SVC
    
    classDef monitoring fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef control fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef policy fill:#fff8e1,stroke:#f57c00,stroke-width:2px
    classDef sandbox fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef core fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    
    class CPU_MONITOR,MEM_MONITOR,IO_MONITOR,NET_MONITOR,ENERGY_MONITOR monitoring
    class CPU_LIMITER,MEM_LIMITER,IO_LIMITER,NET_LIMITER,ENERGY_BUDGET control
    class POLICY_MGR,THRESHOLD_MGR,ACTION_ENGINE,ALERT_MGR policy
    class SANDBOX_A,SANDBOX_B,SANDBOX_C sandbox
    class ORCHESTRATOR,ENERGY_SVC,METRICS_SVC core
```

---

## Summary

These diagrams provide comprehensive architectural views of the WIRTHFORGE Plugin System:

1. **System Context**: High-level view of plugin ecosystem
2. **Container Diagram**: Detailed system components and their relationships
3. **Component Diagram**: Internal structure of the Plugin Manager
4. **Lifecycle Sequence**: Plugin installation and runtime flow
5. **Security Architecture**: Sandbox isolation and security controls
6. **API Integration**: Plugin-to-core communication flow
7. **Marketplace Integration**: Plugin distribution and installation
8. **Resource Management**: Monitoring and resource control system

Each diagram follows C4 model principles and provides clear visualization of component interactions, security boundaries, and data flows within the plugin architecture.
