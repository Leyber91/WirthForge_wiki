# WF-OPS-002 Streaming Pipeline Diagram

## Overview
This diagram details the real-time streaming pipeline that delivers metrics from collectors to dashboards at 60Hz while maintaining performance constraints and energy-truth visualization principles.

## Streaming Pipeline Diagram

```mermaid
sequenceDiagram
    participant SC as System Collector
    participant MC as Model Collector  
    participant UC as UX Collector
    participant AGG as Aggregator
    participant PROC as Stream Processor
    participant CACHE as Memory Cache
    participant WS as WebSocket Server
    participant DASH as Dashboard
    participant CHARTS as Chart Engine

    Note over SC,CHARTS: 60Hz Real-time Streaming Pipeline

    %% Collection Phase (Different Frequencies)
    loop Every 100ms (10Hz)
        SC->>AGG: System Metrics<br/>{cpu: 45.2, mem: 67.8, gpu: 23.1}
    end
    
    loop Every 16.67ms (60Hz)
        MC->>AGG: Model Metrics<br/>{tps: 18.4, ttft: 120, energy: 0.66}
        UC->>AGG: UX Metrics<br/>{frame_time: 14.2, jank_count: 0}
    end

    %% Aggregation Phase
    AGG->>PROC: Batched Events<br/>Window: 1s/10s/5m
    
    %% Processing Phase  
    PROC->>PROC: Calculate Energy Ribbons<br/>width = throughput<br/>speed = token_velocity
    PROC->>PROC: Detect Anomalies<br/>Frame budget violations<br/>Performance degradation
    PROC->>CACHE: Hot Metrics<br/>Last 5 minutes
    
    %% Streaming Phase
    PROC->>WS: Real-time Stream<br/>60Hz rate limited
    
    %% Dashboard Update Phase
    loop Every 16.67ms (60Hz)
        WS->>DASH: Metrics Update<br/>JSON payload
        DASH->>DASH: Validate Frame Budget<br/>≤16.67ms processing
        DASH->>CHARTS: Render Update<br/>Energy visualizations
        CHARTS->>CHARTS: Hardware Accelerated<br/>Canvas rendering
    end

    %% Backpressure Handling
    alt Stream Buffer Full
        WS->>DASH: Backpressure Signal
        DASH->>DASH: Drop Non-Critical Updates<br/>Maintain 60Hz core
    else Normal Flow
        WS->>DASH: Full Metrics Payload
    end

    %% Performance Monitoring
    DASH->>UC: Frame Timing Feedback<br/>Self-monitoring
    UC->>AGG: Dashboard Performance<br/>Meta-metrics
```

## Pipeline Flow Details

### 1. Multi-Frequency Collection
```mermaid
gantt
    title Collector Sampling Frequencies
    dateFormat X
    axisFormat %L ms
    
    section System (10Hz)
    CPU/Memory/GPU    :0, 100
    Network I/O       :0, 100
    Disk Usage        :0, 100
    
    section Model (60Hz) 
    Token Rate        :0, 16
    TTFT Timing       :0, 16
    Energy Calc       :0, 16
    
    section UX (60Hz)
    Frame Timing      :0, 16
    Input Latency     :0, 16
    Jank Detection    :0, 16
```

### 2. Stream Processing Pipeline
```mermaid
flowchart LR
    subgraph "Input Streams"
        S1[System<br/>10Hz]
        S2[Model<br/>60Hz]  
        S3[UX<br/>60Hz]
    end
    
    subgraph "Aggregation Layer"
        AGG[Time Window<br/>Aggregator]
        BUFFER[Stream Buffer<br/>Backpressure]
    end
    
    subgraph "Processing Layer"
        ENERGY[Energy Calculator<br/>Ribbon/Particle mapping]
        ANOMALY[Anomaly Detector<br/>Performance issues]
        FILTER[Stream Filter<br/>Relevance scoring]
    end
    
    subgraph "Output Streams"
        WS_OUT[WebSocket<br/>60Hz limited]
        SSE_OUT[Server-Sent Events<br/>HTTP/2 fallback]
    end
    
    S1 --> AGG
    S2 --> AGG
    S3 --> AGG
    
    AGG --> BUFFER
    BUFFER --> ENERGY
    BUFFER --> ANOMALY
    BUFFER --> FILTER
    
    ENERGY --> WS_OUT
    ANOMALY --> WS_OUT
    FILTER --> SSE_OUT
    
    classDef highFreq fill:#ff6b6b,stroke:#d63031,stroke-width:2px
    classDef processing fill:#74b9ff,stroke:#0984e3,stroke-width:2px
    classDef output fill:#00b894,stroke:#00a085,stroke-width:2px
    
    class S2,S3 highFreq
    class ENERGY,ANOMALY,FILTER processing
    class WS_OUT,SSE_OUT output
```

### 3. Energy-Truth Visualization Mapping
```mermaid
graph TB
    subgraph "Raw Metrics"
        TPS[Tokens/Second<br/>18.4 tps]
        TTFT[Time to First Token<br/>120ms]
        ENTROPY[Entropy Bits<br/>3.2 bits]
        THROUGHPUT[Total Throughput<br/>2.1 MB/s]
    end
    
    subgraph "Energy Calculations"
        VELOCITY[Token Velocity<br/>tps * entropy_factor]
        DENSITY[Particle Density<br/>entropy / max_entropy]
        WIDTH[Ribbon Width<br/>throughput / baseline]
        SPEED[Animation Speed<br/>velocity / max_velocity]
    end
    
    subgraph "Visual Elements"
        RIBBONS[Energy Ribbons<br/>Flowing streams]
        PARTICLES[Energy Particles<br/>Moving dots]
        LIGHTNING[Lightning Effects<br/>Burst patterns]
        RIPPLES[Interference Ripples<br/>Multi-model sync]
    end
    
    TPS --> VELOCITY
    ENTROPY --> DENSITY
    THROUGHPUT --> WIDTH
    VELOCITY --> SPEED
    
    VELOCITY --> RIBBONS
    DENSITY --> PARTICLES
    WIDTH --> RIBBONS
    SPEED --> LIGHTNING
    
    VELOCITY --> RIPPLES
    DENSITY --> RIPPLES
    
    classDef metrics fill:#ddd,stroke:#999,stroke-width:1px
    classDef calc fill:#74b9ff,stroke:#0984e3,stroke-width:2px
    classDef visual fill:#fd79a8,stroke:#e84393,stroke-width:2px
    
    class TPS,TTFT,ENTROPY,THROUGHPUT metrics
    class VELOCITY,DENSITY,WIDTH,SPEED calc
    class RIBBONS,PARTICLES,LIGHTNING,RIPPLES visual
```

## Performance Constraints & Guarantees

### Frame Budget Enforcement
```javascript
// Pseudo-code for frame budget enforcement
class StreamProcessor {
    processMetrics(metrics, frameStartTime) {
        const FRAME_BUDGET_MS = 16.67;
        const processed = [];
        
        for (const metric of metrics) {
            const elapsed = performance.now() - frameStartTime;
            if (elapsed > FRAME_BUDGET_MS * 0.8) {
                // Defer remaining metrics to next frame
                this.deferredQueue.push(...metrics.slice(processed.length));
                break;
            }
            processed.push(this.processMetric(metric));
        }
        
        return processed;
    }
}
```

### Backpressure Handling
```mermaid
stateDiagram-v2
    [*] --> Normal
    Normal --> Pressure: Buffer > 80%
    Pressure --> Critical: Buffer > 95%
    Critical --> Drop: Buffer Full
    Drop --> Pressure: Buffer < 90%
    Pressure --> Normal: Buffer < 50%
    
    Normal : Full Metrics Stream
    Pressure : Reduce Non-Critical
    Critical : Core Metrics Only
    Drop : Emergency Shedding
```

## Stream Message Formats

### System Metrics Stream
```json
{
  "timestamp": 1724049600123,
  "source": "system",
  "type": "metrics",
  "data": {
    "cpu_percent": 45.2,
    "memory_percent": 67.8,
    "gpu_utilization": 23.1,
    "gpu_memory_mb": 2048,
    "disk_io_read_mb": 12.4,
    "disk_io_write_mb": 8.7,
    "network_bytes_in": 1024,
    "network_bytes_out": 512
  },
  "window": "10s_avg",
  "frame_budget_used_ms": 2.1
}
```

### Model Performance Stream
```json
{
  "timestamp": 1724049600140,
  "source": "model:llama7b",
  "type": "performance",
  "data": {
    "tokens_per_second": 18.4,
    "ttft_ms": 120,
    "queue_wait_ms": 45,
    "cache_hit_rate": 0.85,
    "batch_size": 4,
    "energy_normalized": 0.66,
    "entropy_bits": 3.2,
    "gpu_utilization": 74.0,
    "vram_used_mb": 5221
  },
  "energy_visual": {
    "ribbon_width": 0.73,
    "particle_density": 0.64,
    "animation_speed": 0.82,
    "lightning_intensity": 0.45
  },
  "frame_budget_used_ms": 1.8
}
```

### UX Performance Stream
```json
{
  "timestamp": 1724049600156,
  "source": "ui",
  "type": "performance",
  "data": {
    "frame_time_ms": 14.2,
    "dropped_frames": 0,
    "input_latency_ms": 8.5,
    "paint_time_ms": 3.2,
    "layout_time_ms": 2.1,
    "jank_budget_used": 0.85,
    "interaction_score": 0.95
  },
  "alerts": {
    "frame_budget_breach": false,
    "sustained_jank": false,
    "input_lag_warning": false
  },
  "frame_budget_used_ms": 0.9
}
```

## Quality Assurance

### Stream Integrity Checks
- **Timestamp Ordering**: Enforce chronological message delivery
- **Frame Budget Compliance**: Monitor processing time per message
- **Data Completeness**: Validate required fields in each stream
- **Rate Limiting**: Enforce 60Hz maximum for high-frequency streams

### Performance Monitoring
- **End-to-End Latency**: Collector → Dashboard ≤ 100ms
- **Stream Throughput**: Support up to 10,000 metrics/second
- **Memory Usage**: Stream buffers ≤ 50MB total
- **CPU Overhead**: Stream processing ≤ 5% CPU usage

### Error Handling
- **Connection Drops**: Automatic WebSocket reconnection
- **Buffer Overflow**: Graceful metric shedding
- **Processing Errors**: Isolate and log without stream interruption
- **Performance Degradation**: Automatic quality reduction

---

*This streaming pipeline diagram is part of the WF-OPS-002 asset collection and demonstrates the real-time data flow architecture for local-first monitoring.*
