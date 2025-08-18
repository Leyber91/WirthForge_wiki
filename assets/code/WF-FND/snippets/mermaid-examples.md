# WF-FND-001 Mermaid Code Snippets

## Reusable Diagram Components for WIRTHFORGE Foundation

### Energy Flow Particle System
```mermaid
graph LR
    A[User Input] --> B{Energy Generation}
    B --> C[🔥 Forge Energy<br/>Sharp Pulses]
    B --> D[💎 Scholar Energy<br/>Structured Flows]
    B --> E[🌟 Sage Energy<br/>Consciousness Mist]
    
    C --> F[Particle Visualization]
    D --> F
    E --> F
    
    F --> G[Real-time Rendering<br/>≤16.67ms Budget]
    
    classDef energyNode fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#000
    classDef forgeNode fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#fff
    classDef scholarNode fill:#2563eb,stroke:#1d4ed8,stroke-width:2px,color:#fff
    classDef sageNode fill:#7c3aed,stroke:#6d28d9,stroke-width:2px,color:#fff
    classDef renderNode fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff
    
    class A,B energyNode
    class C forgeNode
    class D scholarNode
    class E sageNode
    class F,G renderNode
```

### Three Doors Decision Tree
```mermaid
graph TD
    A[New User] --> B{Personality Assessment}
    B -->|Action-Oriented| C[🔥 Forge Door]
    B -->|Knowledge-Seeking| D[💎 Scholar Door]
    B -->|Wisdom-Focused| E[🌟 Sage Door]
    
    C --> C1[Volcanic Aesthetics]
    C --> C2[Direct AI Responses]
    C --> C3[Solution-Focused]
    
    D --> D1[Crystalline Visuals]
    D --> D2[Analytical AI]
    D --> D3[Citation-Heavy]
    
    E --> E1[Ethereal Patterns]
    E --> E2[Intuitive AI]
    E --> E3[Holistic Perspectives]
    
    C1 --> F[Personalized Experience]
    C2 --> F
    C3 --> F
    D1 --> F
    D2 --> F
    D3 --> F
    E1 --> F
    E2 --> F
    E3 --> F
    
    classDef assessNode fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#000
    classDef forgeNode fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#fff
    classDef scholarNode fill:#2563eb,stroke:#1d4ed8,stroke-width:2px,color:#fff
    classDef sageNode fill:#7c3aed,stroke:#6d28d9,stroke-width:2px,color:#fff
    classDef outcomeNode fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff
    
    class A,B assessNode
    class C,C1,C2,C3 forgeNode
    class D,D1,D2,D3 scholarNode
    class E,E1,E2,E3 sageNode
    class F outcomeNode
```

### Progressive Gamification Levels
```mermaid
graph TB
    A[Level 1: Lightning Strikes] --> B[Level 2: Council]
    B --> C[Level 3: Structured Architectures]
    C --> D[Level 4: Adaptive Fields]
    D --> E[Level 5: Resonance Fields]
    
    A --> A1[Single AI Query/Response]
    A --> A2[Instant Gratification]
    A --> A3[Foundation Building]
    
    B --> B1[Multiple Models in Parallel]
    B --> B2[Collaborative AI Discussion]
    B --> B3[Ensemble Intelligence Intro]
    
    C --> C1[Complex Query Chains]
    C --> C2[Memory & Context Management]
    C --> C3[Advanced Prompt Engineering]
    
    D --> D1[Dynamic Model Swapping]
    D --> D2[Specialized Orchestration]
    D --> D3[Hybrid Local-Cloud]
    
    E --> E1[6 Concurrent Models]
    E --> E2[Emergent Intelligence]
    E --> E3[Peak AI Mastery]
    
    classDef level1 fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#000
    classDef level2 fill:#60a5fa,stroke:#3b82f6,stroke-width:2px,color:#fff
    classDef level3 fill:#c084fc,stroke:#a855f7,stroke-width:2px,color:#fff
    classDef level4 fill:#34d399,stroke:#10b981,stroke-width:2px,color:#000
    classDef level5 fill:#f87171,stroke:#ef4444,stroke-width:2px,color:#fff
    classDef feature fill:#e2e8f0,stroke:#64748b,stroke-width:1px,color:#000
    
    class A,A1,A2,A3 level1
    class B,B1,B2,B3 level2
    class C,C1,C2,C3 level3
    class D,D1,D2,D3 level4
    class E,E1,E2,E3 level5
```

### Local-First Architecture Flow
```mermaid
graph TD
    A[User Request] --> B[Local Processing Check]
    B -->|Sufficient| C[Native Ollama Models]
    B -->|Insufficient| D[Broker Decision]
    
    C --> C1[Model 1: Primary]
    C --> C2[Model 2: Secondary]
    C --> C3[Model 3-6: Ensemble]
    
    D --> D1{Premium User?}
    D1 -->|Yes| D2[Satellite Cloud Access]
    D1 -->|No| D3[Local Fallback]
    
    C1 --> E[Energy Visualization]
    C2 --> E
    C3 --> E
    D2 --> E
    D3 --> E
    
    E --> F[Real-time Rendering]
    F --> G[User Experience]
    
    G --> H[Performance Metrics]
    H --> I[Optimization Loop]
    I --> B
    
    classDef localNode fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff
    classDef cloudNode fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#000
    classDef processNode fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    classDef visualNode fill:#a855f7,stroke:#9333ea,stroke-width:2px,color:#fff
    classDef feedbackNode fill:#6b7280,stroke:#4b5563,stroke-width:2px,color:#fff
    
    class A,B,C,C1,C2,C3,D3 localNode
    class D,D1,D2 cloudNode
    class E,F,G processNode
    class H,I feedbackNode
```

### Business Model Transparency
```mermaid
graph LR
    A[User Entry] --> B{Tier Selection}
    B -->|Free Choice| C[Free Tier]
    B -->|Premium Choice| D[Premium Tier]
    
    C --> C1[Full Platform Access]
    C --> C2[All Three Doors]
    C --> C3[5 Gamification Levels]
    C --> C4[Unlimited Local Usage]
    C --> C5[Max 3 Ads/Day]
    
    D --> D1[Ad-Free Experience]
    D --> D2[2× Energy Multiplier]
    D --> D3[Priority Support]
    D --> D4[Early Features]
    D --> D5[Satellite Cloud Access]
    D --> D6[$9.42/month]
    
    C1 --> E[User Empowerment]
    C2 --> E
    C3 --> E
    C4 --> E
    C5 --> E
    D1 --> E
    D2 --> E
    D3 --> E
    D4 --> E
    D5 --> E
    D6 --> E
    
    E --> F[Sustainable Platform]
    F --> G[Community Growth]
    G --> H[Innovation Cycle]
    H --> A
    
    classDef entryNode fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#000
    classDef freeNode fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff
    classDef premiumNode fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    classDef outcomeNode fill:#a855f7,stroke:#9333ea,stroke-width:2px,color:#fff
    classDef cycleNode fill:#6b7280,stroke:#4b5563,stroke-width:2px,color:#fff
    
    class A,B entryNode
    class C,C1,C2,C3,C4,C5 freeNode
    class D,D1,D2,D3,D4,D5,D6 premiumNode
    class E,F outcomeNode
    class G,H cycleNode
```

## Usage Guidelines

### Color Scheme Standards
- **Forge (🔥)**: `#dc2626` (red-600) for action-oriented elements
- **Scholar (💎)**: `#2563eb` (blue-600) for knowledge-focused elements  
- **Sage (🌟)**: `#7c3aed` (purple-600) for consciousness-seeking elements
- **Energy**: `#f59e0b` (amber-500) for energy-related nodes
- **Success**: `#10b981` (emerald-500) for positive outcomes
- **Neutral**: `#6b7280` (gray-500) for supporting elements

### Node Styling Best Practices
1. **Consistent stroke-width**: Use 2px for primary nodes, 1px for secondary
2. **High contrast**: Ensure text color contrasts well with fill color
3. **Semantic colors**: Match colors to Three Doors system and energy metaphors
4. **Accessibility**: All color combinations meet WCAG 2.2 AA standards

### Diagram Complexity Guidelines
- **Maximum nodes**: 20-25 nodes per diagram for readability
- **Maximum depth**: 5 levels deep to avoid cognitive overload
- **Branching factor**: No more than 4 branches from single node
- **Text length**: Keep node text under 3 lines, 20 characters per line

### Performance Considerations
- **Rendering time**: All diagrams must render within 2 seconds
- **File size**: Keep .mmd files under 5KB for optimal loading
- **Browser compatibility**: Test in Chrome, Firefox, Safari, Edge
- **Mobile responsive**: Ensure diagrams scale properly on mobile devices

### Validation Checklist
- [ ] Color contrast ratios meet accessibility standards
- [ ] All text is legible at minimum zoom levels
- [ ] Diagram flows logically from left-to-right or top-to-bottom
- [ ] Node relationships are clear and unambiguous
- [ ] Styling classes are applied consistently
- [ ] Mermaid syntax is valid and error-free

*These snippets provide reusable components for all WIRTHFORGE documentation while maintaining visual consistency and accessibility standards.*
