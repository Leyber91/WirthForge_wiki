# WF-UX-003 Effect Mapping

```mermaid
graph LR
    A[Energy Level E(t)] --> B{Threshold Gates}
    
    B -->|E < 0.2| C[Dormant State]
    B -->|0.2 ≤ E < 0.5| D[Awakening State]
    B -->|0.5 ≤ E < 0.8| E[Active State]
    B -->|E ≥ 0.8| F[Resonance State]
    
    C --> G[Dim Pulse Effect]
    G --> H[Opacity: 0.1-0.3]
    G --> I[Color: Cool Blue #1E40AF]
    G --> J[Animation: Slow Fade 2s]
    
    D --> K[Lightning Sparks]
    K --> L[Opacity: 0.3-0.6]
    K --> M[Color: Electric Blue #3B82F6]
    K --> N[Animation: Random Flicker 0.5s]
    
    E --> O[Energy Streams]
    O --> P[Opacity: 0.6-0.9]
    O --> Q[Color: Gradient Blue→Gold]
    O --> R[Animation: Flow 1s Linear]
    
    F --> S[Resonance Field]
    S --> T[Opacity: 0.9-1.0]
    S --> U[Color: Aurora Spectrum]
    S --> V[Animation: Harmonic Wave 0.3s]
    
    W[Model Count] --> X{Multi-Model?}
    X -->|Single| Y[Lightning Bolt Pattern]
    X -->|Dual| Z[Interference Waves]
    X -->|3+| AA[Particle Swarm]
    
    Y --> BB[Jagged Path Generation]
    Z --> CC[Wave Intersection Calc]
    AA --> DD[Flocking Behavior]
    
    EE[Token Speed] --> FF{Tokens/Second}
    FF -->|< 10| GG[Slow Pulse]
    FF -->|10-30| HH[Medium Flow]
    FF -->|30-50| II[Fast Stream]
    FF -->|> 50| JJ[Lightning Burst]
    
    KK[Diversity Index] --> LL{DI Value}
    LL -->|DI < 0.3| MM[Monochrome Effect]
    LL -->|0.3 ≤ DI < 0.7| NN[Dual Color]
    LL -->|DI ≥ 0.7| OO[Rainbow Spectrum]
    
    PP[Hardware Tier] --> QQ{Performance Level}
    QQ -->|Low| RR[Simplified Effects]
    QQ -->|Mid| SS[Standard Effects]
    QQ -->|High| TT[Enhanced Effects]
    
    RR --> UU[2D Canvas Fallback]
    SS --> VV[WebGL Basic Shaders]
    TT --> WW[WebGL Advanced + Post-FX]
    
    style A fill:#F59E0B
    style F fill:#10B981
    style S fill:#8B5CF6
    style AA fill:#EC4899
```

## Effect State Mapping

### Energy Thresholds
- **Dormant (E < 0.2)**: Minimal activity, dim pulsing
- **Awakening (0.2-0.5)**: Initial sparks, building energy
- **Active (0.5-0.8)**: Full energy streams, dynamic flow
- **Resonance (E ≥ 0.8)**: Peak performance, harmonic fields

### Visual Parameters
- **Opacity**: Direct correlation with energy level
- **Color**: Temperature mapping (cool → warm → spectrum)
- **Animation**: Speed increases with energy intensity
- **Complexity**: More particles/effects at higher energy

### Multi-Model Adaptations
- **Single Model**: Classic lightning bolt visualization
- **Dual Models**: Wave interference patterns
- **3+ Models**: Particle swarm with flocking behavior

### Performance Scaling
- **Low Tier**: 2D canvas with basic animations
- **Mid Tier**: WebGL with standard particle effects
- **High Tier**: Advanced shaders with post-processing
