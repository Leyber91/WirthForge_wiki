# WF-TECH-001-C4-DIAGRAMS: System Architecture Views

## C4 Context Diagram: System Boundaries

```mermaid
graph TB
    subgraph "User's Local Machine"
        U[User]
        WF[WIRTHFORGE System]
        B[Web Browser]
        OS[Operating System]
    end
    
    subgraph "External (Optional)"
        MR[Model Repository<br/>Hugging Face/Ollama]
    end
    
    U --> B
    B --> WF
    WF --> OS
    WF -.-> MR
    
    style WF fill:#e1f5fe
    style MR fill:#fff3e0
```

## C4 Container Diagram: Internal Architecture

```mermaid
graph TB
    subgraph "WIRTHFORGE Application"
        subgraph "Core Engine (Python)"
            O[Orchestrator<br/>asyncio main loop]
            ES[Energy State Manager<br/>in-memory + SQLite]
            DC[DECIPHER Compiler<br/>token→energy mapping]
        end
        
        subgraph "Transport Layer"
            API[FastAPI Server<br/>REST + WebSocket]
            WS[WebSocket Handler<br/>real-time streams]
        end
        
        subgraph "External Integrations"
            OL[Ollama Client<br/>HTTP/streaming]
            FS[File System<br/>config/models/logs]
        end
    end
    
    subgraph "External Processes"
        M[Ollama Server<br/>model inference]
        UI[Web Browser<br/>React/TypeScript UI]
    end
    
    O --> ES
    O --> DC
    O --> API
    API --> WS
    O --> OL
    O --> FS
    OL --> M
    WS --> UI
    
    style O fill:#c8e6c9
    style API fill:#e3f2fd
    style M fill:#fff9c4
    style UI fill:#fce4ec
```

## C4 Component Diagram: Orchestrator Internals

```mermaid
graph TB
    subgraph "Orchestrator Component"
        ML[Main Loop<br/>60Hz timer]
        HW[Hardware Detector<br/>CPU/GPU/RAM]
        SC[Startup Controller<br/>boot sequence]
        EL[Event Loop<br/>asyncio tasks]
        
        subgraph "State Management"
            CS[Config State<br/>hardware profile]
            RS[Runtime State<br/>process status]
            ES[Energy State<br/>real-time metrics]
        end
        
        subgraph "Integration Interfaces"
            MI[Model Interface<br/>Ollama adapter]
            AI[API Interface<br/>FastAPI bridge]
            FI[File Interface<br/>config/logs]
        end
    end
    
    ML --> EL
    SC --> HW
    SC --> CS
    EL --> RS
    ML --> ES
    
    MI --> CS
    AI --> RS
    FI --> CS
    
    style ML fill:#4caf50
    style SC fill:#2196f3
    style ES fill:#ff9800
```

## Architecture Notes

- **Context Level**: Shows WIRTHFORGE as a local-first system with optional external model downloads
- **Container Level**: Reveals internal Python components and external Ollama process
- **Component Level**: Details orchestrator internals with clear separation of concerns
- **Web-Engaged**: All user interaction through browser interface
- **Local-Core**: All computation happens on user's device
