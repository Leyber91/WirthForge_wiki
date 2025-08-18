# WF-UX-001 Component Hierarchy Architecture

**Document ID**: WF-UX-001  
**Version**: 1.0.0  
**Last Updated**: 2024-01-15  
**Category**: UI Architecture Diagrams

## Component Hierarchy Overview

```mermaid
graph TB
    subgraph "WIRTHFORGE UI Architecture"
        subgraph "Application Root"
            APP[App Component]
            CTX[Context Providers]
            RTR[Router]
        end
        
        subgraph "Layout Components"
            HDR[Header]
            MAIN[MainCanvas]
            SIDE[Sidebar]
            FOOT[Footer]
        end
        
        subgraph "Visualization Components"
            LBV[LightningBoltVisual]
            ESV[EnergyStreamVisual]
            IOV[InterferenceOverlay]
            RCV[ResonanceCelebration]
            EMV[EnergyMeterVisual]
        end
        
        subgraph "Control Components"
            CP[ControlsPanel]
            MP[MetricsPanel]
            SP[SettingsPanel]
            NP[NotificationPanel]
        end
        
        subgraph "Interactive Components"
            BTN[Button]
            SLD[Slider]
            TOG[Toggle]
            INP[Input]
            SEL[Select]
        end
        
        subgraph "Display Components"
            TD[TokenDisplay]
            CD[ChatDisplay]
            PD[ProgressDisplay]
            AD[AlertDisplay]
        end
        
        subgraph "Utility Components"
            TT[Tooltip]
            MDL[Modal]
            LD[Loader]
            ERR[ErrorBoundary]
        end
    end
    
    APP --> CTX
    CTX --> RTR
    RTR --> HDR
    RTR --> MAIN
    RTR --> SIDE
    RTR --> FOOT
    
    MAIN --> LBV
    MAIN --> ESV
    MAIN --> IOV
    MAIN --> RCV
    MAIN --> TD
    MAIN --> CD
    
    SIDE --> CP
    SIDE --> MP
    SIDE --> SP
    SIDE --> NP
    
    CP --> BTN
    CP --> SLD
    CP --> TOG
    
    MP --> EMV
    MP --> PD
    
    SP --> INP
    SP --> SEL
    SP --> TOG
    
    NP --> AD
    
    HDR --> BTN
    HDR --> TT
    
    FOOT --> PD
    
    ERR --> APP
    MDL --> APP
    LD --> APP
```

## State Flow Architecture

```mermaid
stateDiagram-v2
    [*] --> Initializing
    
    Initializing --> Loading: Hardware Detection Complete
    Loading --> Ready: Assets Loaded
    
    Ready --> Idle: No Active Session
    Ready --> Active: User Input Received
    
    Idle --> Active: New Prompt
    Active --> Processing: Token Generation Started
    
    Processing --> Streaming: First Token Generated
    Streaming --> Processing: Continue Generation
    Streaming --> Complete: Generation Finished
    
    Complete --> Idle: Session Ended
    Complete --> Active: New Prompt
    
    Active --> Error: Generation Failed
    Processing --> Error: Model Error
    Streaming --> Error: Stream Interrupted
    
    Error --> Idle: Error Resolved
    Error --> Recovery: Auto Recovery
    Recovery --> Active: Recovery Complete
    
    state Processing {
        [*] --> ModelLoading
        ModelLoading --> TokenGeneration
        TokenGeneration --> EnergyCalculation
        EnergyCalculation --> UIUpdate
        UIUpdate --> TokenGeneration
        UIUpdate --> [*]
    }
    
    state Streaming {
        [*] --> TokenReceived
        TokenReceived --> VisualUpdate
        VisualUpdate --> MetricsUpdate
        MetricsUpdate --> TokenReceived
        MetricsUpdate --> [*]
    }
```

## Energy Event Flow

```mermaid
sequenceDiagram
    participant User as User
    participant UI as UI Components
    participant State as State Manager
    participant WS as WebSocket
    participant Backend as Local Backend
    participant Models as AI Models
    
    User->>UI: Submit Prompt
    UI->>State: Dispatch USER_INPUT
    State->>WS: Send PROMPT_REQUEST
    WS->>Backend: Forward Request
    Backend->>Models: Initialize Generation
    
    Models->>Backend: TOKEN_GENERATED
    Backend->>WS: TOKEN_STREAM Event
    WS->>State: Update Token State
    State->>UI: Trigger Re-render
    
    par Token Display
        UI->>UI: Update TokenDisplay
    and Energy Visualization
        UI->>UI: Update LightningBolt
        UI->>UI: Calculate Energy Metrics
    and Performance Monitoring
        UI->>UI: Update Frame Rate
        UI->>UI: Monitor Resource Usage
    end
    
    Models->>Backend: ENERGY_UPDATE
    Backend->>WS: ENERGY_METRICS Event
    WS->>State: Update Energy State
    State->>UI: Update Visualizations
    
    UI->>UI: Render Energy Effects
    UI->>UI: Update Progress Indicators
    
    Models->>Backend: GENERATION_COMPLETE
    Backend->>WS: STREAM_END Event
    WS->>State: Mark Complete
    State->>UI: Show Completion State
    
    UI->>User: Display Results
```
