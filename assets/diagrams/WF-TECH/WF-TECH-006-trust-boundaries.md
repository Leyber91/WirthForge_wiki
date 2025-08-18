# WF-TECH-006 Trust Boundary Diagrams
## WIRTHFORGE Security & Privacy Architecture

### Trust Boundary Overview

```mermaid
graph TB
    subgraph "External Environment (Untrusted)"
        EXT[External Network]
        BROWSER[Web Browser]
        MALWARE[Potential Malware]
    end
    
    subgraph "Trust Boundary 1: Network Perimeter"
        subgraph "Localhost Only Zone (127.0.0.1)"
            FIREWALL[OS Firewall Rules]
            TLS[TLS Termination]
            
            subgraph "Trust Boundary 2: Authentication Layer"
                AUTH[Authentication Middleware]
                SESSION[Session Management]
                CSRF[CSRF Protection]
                RATE[Rate Limiting]
            end
            
            subgraph "Trust Boundary 3: Application Core"
                subgraph "Layer 1: Orchestrator (Highest Trust)"
                    ORCH[Orchestrator Service]
                    CONFIG[Configuration Manager]
                end
                
                subgraph "Layer 2: Core Services (High Trust)"
                    DECIPHER[Decipher Engine]
                    STATE[State Storage]
                    EVENTS[Event System]
                end
                
                subgraph "Layer 3: Business Logic (Medium Trust)"
                    COUNCIL[Council System]
                    ENERGY[Energy Processing]
                    EXPERIENCE[Experience Engine]
                end
                
                subgraph "Layer 4: Integration (Lower Trust)"
                    API[API Gateway]
                    LOGGING[Audit Logging]
                    MONITOR[System Monitoring]
                end
            end
            
            subgraph "Trust Boundary 4: Plugin Sandbox (Isolated)"
                SANDBOX1[Plugin Sandbox 1]
                SANDBOX2[Plugin Sandbox 2]
                SANDBOX3[Plugin Sandbox N]
            end
            
            subgraph "Trust Boundary 5: Web UI (Lowest Trust)"
                WEBUI[Web UI Server]
                STATIC[Static Assets]
                WEBSOCKET[WebSocket Handler]
            end
        end
    end
    
    subgraph "Trust Boundary 6: Data Layer"
        ENCRYPT[Encryption at Rest]
        BACKUP[Encrypted Backups]
        AUDIT_LOG[Audit Logs]
    end
    
    %% External connections (blocked by default)
    EXT -.->|Blocked| FIREWALL
    MALWARE -.->|Blocked| FIREWALL
    
    %% Allowed browser connection
    BROWSER -->|HTTPS Only| TLS
    TLS --> AUTH
    
    %% Authentication flow
    AUTH --> SESSION
    AUTH --> CSRF
    AUTH --> RATE
    
    %% Authenticated requests flow
    SESSION --> WEBUI
    WEBUI --> API
    API --> ORCH
    
    %% Core service interactions
    ORCH --> DECIPHER
    ORCH --> STATE
    ORCH --> EVENTS
    ORCH --> CONFIG
    
    %% Business logic interactions
    DECIPHER --> COUNCIL
    DECIPHER --> ENERGY
    STATE --> EXPERIENCE
    
    %% Plugin isolation
    API -.->|Restricted IPC| SANDBOX1
    API -.->|Restricted IPC| SANDBOX2
    API -.->|Restricted IPC| SANDBOX3
    
    %% Data layer connections
    STATE --> ENCRYPT
    LOGGING --> AUDIT_LOG
    ENCRYPT --> BACKUP
    
    %% WebSocket for real-time updates
    WEBUI --> WEBSOCKET
    EVENTS --> WEBSOCKET
    
    %% Monitoring connections
    ORCH --> MONITOR
    MONITOR --> LOGGING
    
    classDef untrusted fill:#ffcccc,stroke:#ff0000,stroke-width:2px
    classDef boundary fill:#ffffcc,stroke:#ffaa00,stroke-width:2px
    classDef highTrust fill:#ccffcc,stroke:#00aa00,stroke-width:2px
    classDef mediumTrust fill:#ccccff,stroke:#0000aa,stroke-width:2px
    classDef lowTrust fill:#ffccff,stroke:#aa00aa,stroke-width:2px
    classDef isolated fill:#ccffff,stroke:#00aaaa,stroke-width:2px
    
    class EXT,BROWSER,MALWARE untrusted
    class FIREWALL,TLS,AUTH,SESSION,CSRF,RATE boundary
    class ORCH,CONFIG,DECIPHER,STATE,EVENTS highTrust
    class COUNCIL,ENERGY,EXPERIENCE,API mediumTrust
    class WEBUI,STATIC,WEBSOCKET,LOGGING,MONITOR lowTrust
    class SANDBOX1,SANDBOX2,SANDBOX3 isolated
```

### Network Security Boundaries

```mermaid
graph LR
    subgraph "Internet (Untrusted)"
        INTERNET[Internet Traffic]
        ATTACKER[Potential Attackers]
    end
    
    subgraph "OS Network Stack"
        NETFILTER[Netfilter/Windows Firewall]
        LOOPBACK[Loopback Interface 127.0.0.1]
    end
    
    subgraph "WIRTHFORGE Network Boundary"
        subgraph "Port 8145 (Primary)"
            TLS8145[TLS Server]
            HTTP8145[HTTP Handler]
        end
        
        subgraph "Port 8146 (Backup)"
            TLS8146[TLS Server]
            HTTP8146[HTTP Handler]
        end
        
        CERT_STORE[Certificate Store]
    end
    
    subgraph "Application Services"
        AUTH_SVC[Authentication Service]
        MAIN_APP[Main Application]
    end
    
    %% Blocked external access
    INTERNET -.->|BLOCKED| NETFILTER
    ATTACKER -.->|BLOCKED| NETFILTER
    
    %% Allowed localhost connections
    LOOPBACK --> TLS8145
    LOOPBACK --> TLS8146
    
    %% TLS termination
    TLS8145 --> HTTP8145
    TLS8146 --> HTTP8146
    
    %% Certificate management
    CERT_STORE --> TLS8145
    CERT_STORE --> TLS8146
    
    %% Application flow
    HTTP8145 --> AUTH_SVC
    HTTP8146 --> AUTH_SVC
    AUTH_SVC --> MAIN_APP
    
    classDef blocked fill:#ffcccc,stroke:#ff0000,stroke-width:3px
    classDef network fill:#ffffcc,stroke:#ffaa00,stroke-width:2px
    classDef secure fill:#ccffcc,stroke:#00aa00,stroke-width:2px
    classDef app fill:#ccccff,stroke:#0000aa,stroke-width:2px
    
    class INTERNET,ATTACKER blocked
    class NETFILTER,LOOPBACK network
    class TLS8145,TLS8146,CERT_STORE secure
    class AUTH_SVC,MAIN_APP app
```

### Plugin Sandbox Architecture

```mermaid
graph TB
    subgraph "Host System (Untrusted for Plugins)"
        HOST_FS[Host Filesystem]
        HOST_NET[Host Network]
        HOST_PROC[Host Processes]
    end
    
    subgraph "WIRTHFORGE Core (Trusted)"
        PLUGIN_MGR[Plugin Manager]
        SANDBOX_MGR[Sandbox Manager]
        IPC_BROKER[IPC Broker]
        RESOURCE_MON[Resource Monitor]
    end
    
    subgraph "Plugin Sandbox 1"
        subgraph "Process Isolation"
            PROC1[Isolated Process]
            ENV1[Restricted Environment]
        end
        
        subgraph "Resource Limits"
            MEM1[Memory Limit: 128MB]
            CPU1[CPU Limit: 20%]
            TIME1[Time Limit: 5min]
        end
        
        subgraph "Filesystem Isolation"
            TEMP1[Temp Directory Only]
            CHROOT1[Chroot Jail]
        end
        
        subgraph "Network Isolation"
            NO_NET1[No Network Access]
        end
        
        PLUGIN1[Plugin Code]
    end
    
    subgraph "Plugin Sandbox 2"
        subgraph "Process Isolation"
            PROC2[Isolated Process]
            ENV2[Restricted Environment]
        end
        
        subgraph "Resource Limits"
            MEM2[Memory Limit: 64MB]
            CPU2[CPU Limit: 10%]
            TIME2[Time Limit: 2min]
        end
        
        subgraph "Filesystem Isolation"
            TEMP2[Temp Directory Only]
            CHROOT2[Chroot Jail]
        end
        
        subgraph "Network Isolation"
            NO_NET2[No Network Access]
        end
        
        PLUGIN2[Plugin Code]
    end
    
    %% Blocked access to host resources
    PLUGIN1 -.->|BLOCKED| HOST_FS
    PLUGIN1 -.->|BLOCKED| HOST_NET
    PLUGIN1 -.->|BLOCKED| HOST_PROC
    
    PLUGIN2 -.->|BLOCKED| HOST_FS
    PLUGIN2 -.->|BLOCKED| HOST_NET
    PLUGIN2 -.->|BLOCKED| HOST_PROC
    
    %% Controlled access through sandbox manager
    PLUGIN_MGR --> SANDBOX_MGR
    SANDBOX_MGR --> PROC1
    SANDBOX_MGR --> PROC2
    
    %% IPC communication (restricted)
    PLUGIN1 <-.->|Restricted IPC| IPC_BROKER
    PLUGIN2 <-.->|Restricted IPC| IPC_BROKER
    IPC_BROKER --> PLUGIN_MGR
    
    %% Resource monitoring
    RESOURCE_MON --> MEM1
    RESOURCE_MON --> CPU1
    RESOURCE_MON --> MEM2
    RESOURCE_MON --> CPU2
    
    classDef untrusted fill:#ffcccc,stroke:#ff0000,stroke-width:2px
    classDef trusted fill:#ccffcc,stroke:#00aa00,stroke-width:2px
    classDef isolated fill:#ccffff,stroke:#00aaaa,stroke-width:2px
    classDef limits fill:#ffffcc,stroke:#ffaa00,stroke-width:2px
    
    class HOST_FS,HOST_NET,HOST_PROC untrusted
    class PLUGIN_MGR,SANDBOX_MGR,IPC_BROKER,RESOURCE_MON trusted
    class PROC1,ENV1,PROC2,ENV2,PLUGIN1,PLUGIN2 isolated
    class MEM1,CPU1,TIME1,MEM2,CPU2,TIME2 limits
```

### Data Flow Security Model

```mermaid
sequenceDiagram
    participant Browser as Web Browser
    participant FW as Firewall
    participant TLS as TLS Layer
    participant Auth as Authentication
    participant API as API Gateway
    participant Core as Core Services
    participant Plugin as Plugin Sandbox
    participant Data as Data Layer
    
    Note over Browser,Data: Secure Request Flow
    
    Browser->>FW: HTTPS Request to 127.0.0.1:8145
    FW->>FW: Validate localhost only
    FW->>TLS: Forward to TLS handler
    TLS->>TLS: Verify certificate
    TLS->>Auth: Decrypt and forward
    
    Auth->>Auth: Validate session token
    Auth->>Auth: Check CSRF token
    Auth->>Auth: Apply rate limiting
    
    alt Authentication Success
        Auth->>API: Authenticated request
        API->>Core: Process business logic
        
        opt Plugin Required
            Core->>Plugin: Restricted IPC call
            Plugin->>Plugin: Execute in sandbox
            Plugin-->>Core: Return result (if allowed)
        end
        
        Core->>Data: Store/retrieve data
        Data->>Data: Encrypt at rest
        
        Core-->>API: Response data
        API-->>Auth: Processed response
        Auth-->>TLS: Add security headers
        TLS-->>Browser: Encrypted response
        
    else Authentication Failure
        Auth->>Auth: Log security event
        Auth-->>TLS: 401 Unauthorized
        TLS-->>Browser: Error response
    end
    
    Note over Browser,Data: All data encrypted in transit and at rest
```

### Security Event Flow

```mermaid
graph TD
    subgraph "Event Sources"
        AUTH_FAIL[Authentication Failures]
        RATE_LIMIT[Rate Limit Violations]
        CSRF_FAIL[CSRF Violations]
        PLUGIN_VIOL[Plugin Violations]
        NET_ANOM[Network Anomalies]
        CONFIG_CHG[Configuration Changes]
    end
    
    subgraph "Security Event Processing"
        EVENT_COLLECT[Event Collector]
        EVENT_FILTER[Event Filter]
        SEVERITY_CLASS[Severity Classifier]
    end
    
    subgraph "Response Actions"
        LOG_EVENT[Log to Audit Trail]
        ALERT_ADMIN[Alert Administrator]
        BLOCK_IP[Block IP Address]
        SUSPEND_SESSION[Suspend Session]
        QUARANTINE_PLUGIN[Quarantine Plugin]
    end
    
    subgraph "Monitoring & Analysis"
        DASHBOARD[Security Dashboard]
        REPORTS[Security Reports]
        FORENSICS[Forensic Analysis]
    end
    
    %% Event flow
    AUTH_FAIL --> EVENT_COLLECT
    RATE_LIMIT --> EVENT_COLLECT
    CSRF_FAIL --> EVENT_COLLECT
    PLUGIN_VIOL --> EVENT_COLLECT
    NET_ANOM --> EVENT_COLLECT
    CONFIG_CHG --> EVENT_COLLECT
    
    EVENT_COLLECT --> EVENT_FILTER
    EVENT_FILTER --> SEVERITY_CLASS
    
    %% Response routing
    SEVERITY_CLASS -->|INFO| LOG_EVENT
    SEVERITY_CLASS -->|WARNING| LOG_EVENT
    SEVERITY_CLASS -->|WARNING| ALERT_ADMIN
    SEVERITY_CLASS -->|ERROR| LOG_EVENT
    SEVERITY_CLASS -->|ERROR| SUSPEND_SESSION
    SEVERITY_CLASS -->|CRITICAL| LOG_EVENT
    SEVERITY_CLASS -->|CRITICAL| ALERT_ADMIN
    SEVERITY_CLASS -->|CRITICAL| BLOCK_IP
    SEVERITY_CLASS -->|CRITICAL| QUARANTINE_PLUGIN
    
    %% Monitoring connections
    LOG_EVENT --> DASHBOARD
    LOG_EVENT --> REPORTS
    LOG_EVENT --> FORENSICS
    
    classDef source fill:#ffcccc,stroke:#ff0000,stroke-width:2px
    classDef process fill:#ffffcc,stroke:#ffaa00,stroke-width:2px
    classDef response fill:#ccffcc,stroke:#00aa00,stroke-width:2px
    classDef monitor fill:#ccccff,stroke:#0000aa,stroke-width:2px
    
    class AUTH_FAIL,RATE_LIMIT,CSRF_FAIL,PLUGIN_VIOL,NET_ANOM,CONFIG_CHG source
    class EVENT_COLLECT,EVENT_FILTER,SEVERITY_CLASS process
    class LOG_EVENT,ALERT_ADMIN,BLOCK_IP,SUSPEND_SESSION,QUARANTINE_PLUGIN response
    class DASHBOARD,REPORTS,FORENSICS monitor
```

## Trust Boundary Enforcement

### Layer 1: Network Perimeter
- **Enforcement**: OS-level firewall rules, localhost-only binding
- **Controls**: Port restrictions, TLS encryption, certificate validation
- **Monitoring**: Connection attempts, certificate expiry, network anomalies

### Layer 2: Authentication Boundary  
- **Enforcement**: Session token validation, CSRF protection, rate limiting
- **Controls**: HTTP-only cookies, secure headers, timing attack prevention
- **Monitoring**: Failed authentication attempts, session anomalies, brute force detection

### Layer 3: Application Core
- **Enforcement**: Service-to-service authentication, API authorization
- **Controls**: Least privilege access, input validation, output encoding
- **Monitoring**: Service interactions, data access patterns, privilege escalation attempts

### Layer 4: Plugin Sandbox
- **Enforcement**: Process isolation, resource limits, import restrictions
- **Controls**: Filesystem sandboxing, network blocking, IPC restrictions
- **Monitoring**: Resource usage, permission violations, escape attempts

### Layer 5: Data Protection
- **Enforcement**: Encryption at rest, secure key management, access logging
- **Controls**: Data minimization, retention policies, backup encryption
- **Monitoring**: Data access patterns, encryption key usage, backup integrity

## Security Assumptions

1. **Host OS Security**: The underlying operating system provides basic process isolation and memory protection
2. **TLS Implementation**: The TLS library correctly implements cryptographic protocols
3. **Python Runtime**: The Python interpreter provides basic module import controls
4. **Localhost Trust**: Traffic on 127.0.0.1 originates from the local machine
5. **Certificate Store**: The local certificate store is protected from unauthorized modification

## Threat Model Integration

These trust boundaries are designed to defend against the threats identified in the WF-TECH-006 threat model:
- **External Network Attacks**: Blocked by network perimeter controls
- **Cross-Site Attacks**: Mitigated by authentication boundary controls  
- **Plugin Malware**: Contained by sandbox isolation controls
- **Data Exfiltration**: Prevented by data protection controls
- **Privilege Escalation**: Limited by application core access controls
