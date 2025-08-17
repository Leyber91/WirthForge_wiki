# WF-TECH-001-PROCESS-GRAPH: Main Orchestrator Components

## Process Graph: Core Runtime Architecture

```mermaid
graph TB
    subgraph "WIRTHFORGE Core Runtime"
        O[Orchestrator<br/>Main Loop<br/>60Hz]
        ES[Energy State<br/>Service]
        DS[DECIPHER<br/>Runtime]
        WS[Local Web<br/>Server]
    end
    
    subgraph "External Processes"
        M[Model Engine<br/>Ollama]
        UI[Web UI<br/>Browser]
    end
    
    subgraph "System Resources"
        HW[Hardware<br/>Detection]
        FS[File System<br/>Models/Config]
        NET[Network<br/>Localhost Only]
    end
    
    O --> ES
    O --> DS
    O --> WS
    O --> M
    WS --> UI
    O --> HW
    O --> FS
    WS --> NET
    
    ES -.-> DS
    DS -.-> WS
    M -.-> O
    UI -.-> WS
```

## Component Descriptions

- **Orchestrator**: Central 60Hz control loop managing all system components
- **Energy State Service**: Real-time energy metrics and state management
- **DECIPHER Runtime**: Token→energy mapping and compilation
- **Local Web Server**: FastAPI server serving browser-based UI
- **Model Engine**: Ollama process for local AI inference
- **Web UI**: Browser-based interface for user interaction
- **Hardware Detection**: Auto-detection of CPU/GPU/RAM capabilities
- **File System**: Local storage for models, config, and logs
- **Network**: Localhost-only networking for security
