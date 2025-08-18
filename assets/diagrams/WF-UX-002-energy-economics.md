# WF-UX-002 Energy Economics Model

## Energy Flow and Economy Overview

```mermaid
flowchart TD
    subgraph "Energy Generation Sources"
        TG[Token Generation<br/>+1 EU per token<br/>Base income stream]
        PS[Prompt Submission<br/>+5 EU per prompt<br/>Engagement reward]
        SC[Session Completion<br/>+10-50 EU<br/>Based on duration]
        QC[Quality Completion<br/>+20 EU bonus<br/>High coherence score]
    end
    
    subgraph "Performance Multipliers"
        SM[Speed Multiplier<br/>1.5x for >20 TPS<br/>2x for >50 TPS]
        MM[Multi-Model Multiplier<br/>1.5x for 2 models<br/>2x for 3+ models]
        EM[Efficiency Multiplier<br/>1.2x for >80% efficiency<br/>1.5x for >90% efficiency]
        CM[Combo Multiplier<br/>Additional 1.3x<br/>Multiple bonuses active]
    end
    
    subgraph "Energy Pool Management"
        EP[Energy Pool<br/>Central EU storage<br/>Real-time balance]
        TB[Total Balance<br/>Lifetime accumulation<br/>Progress tracking]
        AB[Available Balance<br/>Spendable amount<br/>After reservations]
    end
    
    subgraph "Energy Expenditure"
        LU[Level Upgrades<br/>100-3000 EU<br/>Mandatory progression]
        ST[Skill Tree Unlocks<br/>50-500 EU<br/>Optional enhancements]
        CH[Challenge Entry<br/>25-200 EU<br/>Competition fees]
        CE[Celebration Effects<br/>10-50 EU<br/>Visual upgrades]
    end
    
    subgraph "Economic Balancing"
        IR[Inflation Resistance<br/>Fixed EU values<br/>No devaluation]
        ER[Earning Rate Control<br/>Difficulty scaling<br/>Sustainable progression]
        SR[Spending Rate Limits<br/>Cooldown periods<br/>Prevent exploitation]
    end
    
    %% Flow connections
    TG --> SM
    PS --> MM
    SC --> EM
    QC --> CM
    
    SM --> EP
    MM --> EP
    EM --> EP
    CM --> EP
    
    EP --> TB
    EP --> AB
    
    AB --> LU
    AB --> ST
    AB --> CH
    AB --> CE
    
    LU --> IR
    ST --> ER
    CH --> SR
    CE --> IR
    
    %% Styling
    classDef generation fill:#10b981,stroke:#059669,stroke-width:2px,color:#ffffff
    classDef multiplier fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#ffffff
    classDef pool fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#1f2937
    classDef expenditure fill:#ef4444,stroke:#dc2626,stroke-width:2px,color:#ffffff
    classDef balancing fill:#8b5cf6,stroke:#7c3aed,stroke-width:2px,color:#ffffff
    
    class TG,PS,SC,QC generation
    class SM,MM,EM,CM multiplier
    class EP,TB,AB pool
    class LU,ST,CH,CE expenditure
    class IR,ER,SR balancing
```

## Level Progression Costs and Requirements

```mermaid
graph LR
    subgraph "Level 1 → 2"
        L1_Cost[100 EU Cost<br/>First Strike Achievement<br/>5 Completed Prompts]
        L1_Reward[Unlock: Dual Models<br/>Interference Visualization<br/>Council Features]
    end
    
    subgraph "Level 2 → 3"
        L2_Cost[500 EU Cost<br/>Council Member Achievement<br/>Multi-Model Session]
        L2_Reward[Unlock: Chain Editor<br/>Workflow Builder<br/>Persistent Memory]
    end
    
    subgraph "Level 3 → 4"
        L3_Cost[1000 EU Cost<br/>Architect Achievement<br/>Complex Chain Built]
        L3_Reward[Unlock: Adaptive Mode<br/>Dynamic Switching<br/>Performance Dashboard]
    end
    
    subgraph "Level 4 → 5"
        L4_Cost[2000 EU Cost<br/>Orchestrator Achievement<br/>3+ Model Mastery]
        L4_Reward[Unlock: Full Orchestra<br/>Resonance Mode<br/>Community Features]
    end
    
    subgraph "Mastery Beyond L5"
        L5_Cost[3000+ EU Investment<br/>All Achievements<br/>Community Leadership]
        L5_Reward[Prestige Badges<br/>Exclusive Challenges<br/>Beta Access]
    end
    
    L1_Cost --> L1_Reward
    L2_Cost --> L2_Reward
    L3_Cost --> L3_Reward
    L4_Cost --> L4_Reward
    L5_Cost --> L5_Reward
    
    L1_Reward -.-> L2_Cost
    L2_Reward -.-> L3_Cost
    L3_Reward -.-> L4_Cost
    L4_Reward -.-> L5_Cost
    
    classDef cost fill:#ef4444,stroke:#dc2626,stroke-width:2px,color:#ffffff
    classDef reward fill:#10b981,stroke:#059669,stroke-width:2px,color:#ffffff
    
    class L1_Cost,L2_Cost,L3_Cost,L4_Cost,L5_Cost cost
    class L1_Reward,L2_Reward,L3_Reward,L4_Reward,L5_Reward reward
```

## Skill Tree Economics

```mermaid
sankey-beta
    %% Energy sources
    Token Generation,Energy Pool,1000
    Prompt Completion,Energy Pool,500
    Achievement Rewards,Energy Pool,800
    Performance Bonuses,Energy Pool,600
    
    %% Energy allocation
    Energy Pool,Level Progression,1500
    Energy Pool,Visualization Skills,400
    Energy Pool,Model Control,500
    Energy Pool,Workflow Skills,350
    Energy Pool,Performance Skills,300
    Energy Pool,Community Skills,250
    Energy Pool,Reserve Balance,600
    
    %% Skill subcategories
    Visualization Skills,Enhanced Lightning,100
    Visualization Skills,Custom Themes,150
    Visualization Skills,3D Effects,150
    
    Model Control,Third Model Slot,200
    Model Control,Advanced Council,150
    Model Control,AI Personalities,150
    
    Workflow Skills,Chain Templates,100
    Workflow Skills,Auto-Workflows,125
    Workflow Skills,Sharing Tools,125
    
    Performance Skills,Speed Optimization,100
    Performance Skills,GPU Acceleration,100
    Performance Skills,Tuning Tools,100
    
    Community Skills,Leaderboards,75
    Community Skills,Challenges,100
    Community Skills,Events,75
```

## Economic Balancing Mechanisms

```mermaid
graph TB
    subgraph "Earning Rate Control"
        BR[Base Rate<br/>1 EU per token<br/>Consistent foundation]
        DR[Difficulty Ramp<br/>Higher levels require<br/>more EU per advancement]
        DM[Diminishing Returns<br/>Repeated actions<br/>yield less EU over time]
    end
    
    subgraph "Spending Limitations"
        CD[Cooldown Periods<br/>24hr between<br/>major purchases]
        ML[Maximum Limits<br/>Daily spending caps<br/>Prevent exploitation]
        PG[Progress Gates<br/>Achievement requirements<br/>Beyond EU cost]
    end
    
    subgraph "Value Preservation"
        FV[Fixed Values<br/>EU costs never<br/>increase arbitrarily]
        NI[No Inflation<br/>Stable economy<br/>Long-term fairness]
        RR[Retroactive Rewards<br/>Past achievements<br/>maintain value]
    end
    
    subgraph "Engagement Incentives"
        DB[Daily Bonuses<br/>Login rewards<br/>Consistent engagement]
        WB[Weekly Challenges<br/>Special objectives<br/>Bonus EU opportunities]
        SB[Streak Bonuses<br/>Consecutive usage<br/>Loyalty rewards]
    end
    
    BR --> DR
    DR --> DM
    DM --> CD
    CD --> ML
    ML --> PG
    PG --> FV
    FV --> NI
    NI --> RR
    RR --> DB
    DB --> WB
    WB --> SB
    
    classDef earning fill:#10b981,stroke:#059669,stroke-width:2px,color:#ffffff
    classDef spending fill:#ef4444,stroke:#dc2626,stroke-width:2px,color:#ffffff
    classDef preservation fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#ffffff
    classDef incentive fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#ffffff
    
    class BR,DR,DM earning
    class CD,ML,PG spending
    class FV,NI,RR preservation
    class DB,WB,SB incentive
```

## Real-Time Energy Tracking

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant EnergyTracker
    participant AchievementSystem
    participant ProgressionManager
    
    User->>UI: Submit Prompt
    UI->>EnergyTracker: Track Session Start
    
    loop Token Generation
        EnergyTracker->>EnergyTracker: +1 EU per token
        EnergyTracker->>UI: Update Energy Display
        
        alt High Speed Detected
            EnergyTracker->>EnergyTracker: Apply Speed Multiplier
            EnergyTracker->>UI: Show Speed Bonus
        end
        
        alt Multi-Model Active
            EnergyTracker->>EnergyTracker: Apply Model Multiplier
            EnergyTracker->>UI: Show Complexity Bonus
        end
    end
    
    EnergyTracker->>AchievementSystem: Check Achievement Triggers
    
    alt Achievement Unlocked
        AchievementSystem->>EnergyTracker: Award Bonus EU
        AchievementSystem->>UI: Show Achievement Notification
    end
    
    EnergyTracker->>ProgressionManager: Update Total Balance
    
    alt Level Up Available
        ProgressionManager->>UI: Show Level Up Option
        User->>ProgressionManager: Confirm Level Up
        ProgressionManager->>EnergyTracker: Deduct Level Cost
        ProgressionManager->>UI: Trigger Celebration
    end
    
    EnergyTracker->>UI: Final Energy Update
```
