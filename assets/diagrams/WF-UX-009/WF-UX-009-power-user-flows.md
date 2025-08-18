# WF-UX-009 Power User Flow Diagrams

## Advanced User Journey Flow
This diagram shows the complete user journey for power users accessing advanced workflow features, from initial unlock through expert-level automation.

```mermaid
flowchart TD
    START([User Reaches Level 4]) --> CHECK{Check Current Level}
    CHECK -->|Level 4| L4[Level 4 Features Unlocked]
    CHECK -->|Level 5| L5[Level 5 Features Unlocked]
    
    L4 --> WF[Workflow Creation]
    L4 --> AD[Advanced Dashboard]
    L4 --> HP[Hotkey Programming]
    
    L5 --> SC[Script Console]
    L5 --> EPE[Energy Pattern Editor]
    L5 --> PM[Plugin Management]
    
    subgraph "Workflow Creation Flow"
        WF --> WE[Open Workflow Editor]
        WE --> DND[Drag & Drop Steps]
        DND --> CONFIG[Configure Parameters]
        CONFIG --> TEST[Test Workflow]
        TEST --> SAVE[Save Workflow]
        SAVE --> SCHEDULE{Schedule?}
        SCHEDULE -->|Yes| TIMER[Set Timer/Trigger]
        SCHEDULE -->|No| MANUAL[Manual Execution]
        TIMER --> QUEUE[Add to Scheduler]
        MANUAL --> RUN[Execute Now]
    end
    
    subgraph "Dashboard Customization"
        AD --> LAYOUT[Choose Layout]
        LAYOUT --> WIDGETS[Add Widgets]
        WIDGETS --> ARRANGE[Arrange Panels]
        ARRANGE --> ENERGY[Configure Energy Views]
        ENERGY --> SAVE_DASH[Save Dashboard]
        SAVE_DASH --> MONITOR[Monitor Activities]
    end
    
    subgraph "Scripting Workflow"
        SC --> EDITOR[Open Script Editor]
        EDITOR --> WRITE[Write Python Code]
        WRITE --> VALIDATE[Syntax Validation]
        VALIDATE --> SANDBOX[Run in Sandbox]
        SANDBOX --> DEBUG{Debug Needed?}
        DEBUG -->|Yes| FIX[Fix Issues]
        DEBUG -->|No| DEPLOY[Deploy Script]
        FIX --> VALIDATE
        DEPLOY --> AUTO[Add to Automation]
    end
    
    subgraph "Energy Pattern Creation"
        EPE --> CANVAS[Open Pattern Canvas]
        CANVAS --> DESIGN[Design Visualization]
        DESIGN --> BIND[Bind to Data Source]
        BIND --> PREVIEW[Preview Pattern]
        PREVIEW --> REFINE{Refine?}
        REFINE -->|Yes| DESIGN
        REFINE -->|No| APPLY[Apply to System]
        APPLY --> LIVE[Live Visualization]
    end
    
    subgraph "Plugin Development"
        PM --> CREATE[Create Plugin]
        CREATE --> MANIFEST[Write Manifest]
        MANIFEST --> CODE[Implement Plugin]
        CODE --> PACKAGE[Package Plugin]
        PACKAGE --> INSTALL[Install Locally]
        INSTALL --> ACTIVATE[Activate Plugin]
        ACTIVATE --> INTEGRATE[Integrate with System]
    end
    
    %% Cross-connections
    QUEUE --> MONITOR
    RUN --> MONITOR
    AUTO --> QUEUE
    LIVE --> MONITOR
    INTEGRATE --> MONITOR
    
    %% Return paths
    MONITOR --> OPTIMIZE{Optimize?}
    OPTIMIZE -->|Workflow| WF
    OPTIMIZE -->|Dashboard| AD
    OPTIMIZE -->|Script| SC
    OPTIMIZE -->|Pattern| EPE
    OPTIMIZE -->|Plugin| PM
    OPTIMIZE -->|No| END([Continuous Monitoring])
    
    classDef startEnd fill:#e8f5e8,stroke:#2e7d32,stroke-width:3px
    classDef level fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef workflow fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef dashboard fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef scripting fill:#fff8e1,stroke:#f9a825,stroke-width:2px
    classDef pattern fill:#e0f2f1,stroke:#00695c,stroke-width:2px
    classDef plugin fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef decision fill:#ffebee,stroke:#d32f2f,stroke-width:2px
    
    class START,END startEnd
    class L4,L5 level
    class WF,WE,DND,CONFIG,TEST,SAVE,TIMER,MANUAL,QUEUE,RUN workflow
    class AD,LAYOUT,WIDGETS,ARRANGE,ENERGY,SAVE_DASH,MONITOR dashboard
    class SC,EDITOR,WRITE,VALIDATE,SANDBOX,FIX,DEPLOY,AUTO scripting
    class EPE,CANVAS,DESIGN,BIND,PREVIEW,APPLY,LIVE pattern
    class PM,CREATE,MANIFEST,CODE,PACKAGE,INSTALL,ACTIVATE,INTEGRATE plugin
    class CHECK,SCHEDULE,DEBUG,REFINE,OPTIMIZE decision
```

## Expert Mode Activation Flow
This sequence shows how users transition between normal and expert modes.

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Main UI
    participant PG as Progression Gate
    participant PM as Power Mode
    participant WO as Workflow Orchestrator
    participant EM as Energy Manager
    
    U->>UI: Request Expert Mode
    UI->>PG: Check User Level
    PG->>PG: Validate Level 4+
    
    alt Level 4+ Verified
        PG->>PM: Enable Power Features
        PM->>UI: Show Advanced Menus
        UI->>U: Expert Mode Activated
        
        U->>PM: Access Advanced Dashboard
        PM->>EM: Request Energy Streams
        EM->>PM: Provide Real-time Data
        PM->>UI: Render Advanced Widgets
        
        U->>PM: Create Workflow
        PM->>WO: Initialize Workflow Builder
        WO->>PM: Provide Step Templates
        PM->>UI: Show Workflow Editor
        
        U->>UI: Configure Workflow Steps
        UI->>WO: Validate Step Configuration
        WO->>WO: Check Resource Requirements
        WO->>UI: Confirm Valid Workflow
        
        U->>UI: Execute Workflow
        UI->>WO: Start Workflow Execution
        WO->>EM: Monitor Energy Usage
        EM->>UI: Stream Progress Updates
        UI->>U: Show Real-time Progress
        
    else Level < 4
        PG->>UI: Access Denied
        UI->>U: Show Level Requirement
        UI->>U: Suggest Progression Path
    end
    
    Note over U,EM: All operations maintain 60Hz UI updates
    Note over WO,EM: Energy truth preserved throughout
```

## Workflow Creation Decision Tree
This diagram shows the decision-making process for creating different types of workflows.

```mermaid
flowchart TD
    START([Create New Workflow]) --> PURPOSE{What's the Purpose?}
    
    PURPOSE -->|Data Processing| DATA[Data Workflow]
    PURPOSE -->|AI Orchestration| AI[AI Workflow]
    PURPOSE -->|Automation| AUTO[Automation Workflow]
    PURPOSE -->|Integration| INTEG[Integration Workflow]
    
    subgraph "Data Processing Workflows"
        DATA --> BATCH{Batch Processing?}
        BATCH -->|Yes| BATCH_STEPS[Configure Batch Steps]
        BATCH -->|No| STREAM_STEPS[Configure Streaming Steps]
        BATCH_STEPS --> DATA_SOURCE[Select Data Source]
        STREAM_STEPS --> DATA_SOURCE
        DATA_SOURCE --> TRANSFORM[Add Transformations]
        TRANSFORM --> OUTPUT[Define Output Format]
        OUTPUT --> DATA_SCHED[Schedule Execution]
    end
    
    subgraph "AI Orchestration Workflows"
        AI --> MODELS{Multiple Models?}
        MODELS -->|Yes| COUNCIL[Council Configuration]
        MODELS -->|No| SINGLE[Single Model Setup]
        COUNCIL --> CONSENSUS[Set Consensus Rules]
        SINGLE --> PROMPT[Configure Prompts]
        CONSENSUS --> PROMPT
        PROMPT --> CHAIN{Chain Prompts?}
        CHAIN -->|Yes| SEQUENCE[Define Sequence]
        CHAIN -->|No| PARALLEL[Parallel Execution]
        SEQUENCE --> AI_SCHED[Schedule AI Tasks]
        PARALLEL --> AI_SCHED
    end
    
    subgraph "Automation Workflows"
        AUTO --> TRIGGER{Trigger Type?}
        TRIGGER -->|Time-based| TIMER_CONFIG[Configure Timer]
        TRIGGER -->|Event-based| EVENT_CONFIG[Configure Events]
        TRIGGER -->|Manual| MANUAL_CONFIG[Manual Triggers]
        TIMER_CONFIG --> ACTIONS[Define Actions]
        EVENT_CONFIG --> ACTIONS
        MANUAL_CONFIG --> ACTIONS
        ACTIONS --> CONDITIONS[Set Conditions]
        CONDITIONS --> AUTO_SCHED[Schedule Automation]
    end
    
    subgraph "Integration Workflows"
        INTEG --> EXTERNAL{External Tool?}
        EXTERNAL -->|API| API_CONFIG[Configure API Calls]
        EXTERNAL -->|File| FILE_CONFIG[Configure File Operations]
        EXTERNAL -->|Plugin| PLUGIN_CONFIG[Configure Plugin Integration]
        API_CONFIG --> MAPPING[Data Mapping]
        FILE_CONFIG --> MAPPING
        PLUGIN_CONFIG --> MAPPING
        MAPPING --> SECURITY[Security Settings]
        SECURITY --> INTEG_SCHED[Schedule Integration]
    end
    
    %% Convergence
    DATA_SCHED --> VALIDATE[Validate Workflow]
    AI_SCHED --> VALIDATE
    AUTO_SCHED --> VALIDATE
    INTEG_SCHED --> VALIDATE
    
    VALIDATE --> TEST[Test Workflow]
    TEST --> RESULTS{Test Results?}
    RESULTS -->|Pass| DEPLOY[Deploy Workflow]
    RESULTS -->|Fail| DEBUG[Debug Issues]
    DEBUG --> VALIDATE
    
    DEPLOY --> MONITOR[Monitor Execution]
    MONITOR --> OPTIMIZE{Optimize?}
    OPTIMIZE -->|Yes| TUNE[Performance Tuning]
    OPTIMIZE -->|No| COMPLETE([Workflow Active])
    TUNE --> MONITOR
    
    classDef start fill:#e8f5e8,stroke:#2e7d32,stroke-width:3px
    classDef decision fill:#ffebee,stroke:#d32f2f,stroke-width:2px
    classDef data fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef ai fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef automation fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef integration fill:#e0f2f1,stroke:#00695c,stroke-width:2px
    classDef process fill:#fff8e1,stroke:#f9a825,stroke-width:2px
    
    class START,COMPLETE start
    class PURPOSE,BATCH,MODELS,CHAIN,TRIGGER,EXTERNAL,RESULTS,OPTIMIZE decision
    class DATA,DATA_SOURCE,TRANSFORM,OUTPUT,DATA_SCHED,BATCH_STEPS,STREAM_STEPS data
    class AI,COUNCIL,SINGLE,CONSENSUS,PROMPT,SEQUENCE,PARALLEL,AI_SCHED ai
    class AUTO,TIMER_CONFIG,EVENT_CONFIG,MANUAL_CONFIG,ACTIONS,CONDITIONS,AUTO_SCHED automation
    class INTEG,API_CONFIG,FILE_CONFIG,PLUGIN_CONFIG,MAPPING,SECURITY,INTEG_SCHED integration
    class VALIDATE,TEST,DEBUG,DEPLOY,MONITOR,TUNE process
```

## Key User Experience Principles

### **Progressive Disclosure**
- Features unlock based on user progression level
- Expert mode provides additional interface complexity
- Beginners see simplified views by default
- Advanced features are clearly marked and gated

### **Workflow Flexibility**
- Multiple workflow types support different use cases
- Visual editor for non-technical users
- Script console for advanced automation
- Template library for common patterns

### **Real-time Feedback**
- All workflows provide live progress updates
- Energy visualization shows computational cost
- Error states are clearly communicated
- Performance metrics are always visible

### **Local-First Operation**
- All workflows execute on user's device
- No cloud dependencies for core functionality
- External integrations use localhost APIs
- Data privacy maintained throughout process

This flow design ensures that power users can efficiently create, manage, and optimize advanced workflows while maintaining WIRTHFORGE's core principles of energy-truth, local-first operation, and 60Hz responsiveness.
