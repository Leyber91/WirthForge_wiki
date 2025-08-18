# WF-TECH-010 Capacity Planning Guidelines & Formulas

**Document ID**: WF-TECH-010  
**Version**: 1.0.0  
**Last Updated**: 2024-01-15  
**Category**: Performance & Capacity Planning

## Overview

This document provides mathematical formulas and guidelines for capacity planning in WIRTHFORGE's web-engaged local-core architecture. These formulas enable predictive scaling and resource allocation across hardware tiers.

## Core Capacity Formulas

### 1. Throughput Capacity Estimation

#### CPU-Only Systems (Low Tier)
```
Capacity_units = (CPU_cores × Base_TPS_per_core) / Reference_TPS
Base_TPS_per_core = CPU_clock_GHz × IPC_factor × Model_efficiency

Where:
- Reference_TPS = 50 (baseline capacity unit)
- IPC_factor = 2.5 (instructions per clock for AI workloads)
- Model_efficiency = 0.6 (quantized model efficiency factor)

Example: 4-core 3.0GHz CPU
Capacity_units = (4 × (3.0 × 2.5 × 0.6)) / 50 = 0.72 units (~36 TPS)
```

#### GPU-Accelerated Systems (Mid/High Tier)
```
Capacity_units = (GPU_TFLOPS × Utilization_factor × Memory_factor) / Reference_TFLOPS
Memory_factor = min(1.0, Available_VRAM_GB / Model_VRAM_requirement_GB)
Utilization_factor = 0.85 (realistic GPU utilization)

Where:
- Reference_TFLOPS = 20 (baseline GPU capacity)
- Model_VRAM_requirement varies by model size

Example: RTX 4060 (15 TFLOPS, 8GB VRAM)
For 7B model (6GB VRAM): Memory_factor = min(1.0, 8/6) = 1.0
Capacity_units = (15 × 0.85 × 1.0) / 20 = 0.64 units (~64 TPS)
```

### 2. Parallel Model Scaling

#### Contention-Adjusted Throughput
```
Effective_TPS = Base_TPS × N / (1 + (N-1) × α)

Where:
- N = number of parallel models
- α = contention factor (0 ≤ α ≤ 1)
- α values by tier:
  - Low: α = 1.0 (no parallelism)
  - Mid: α = 0.4 (moderate contention)
  - High: α = 0.2 (minimal contention)

Example: Mid-tier with 2 models (Base_TPS = 80)
Effective_TPS = 80 × 2 / (1 + (2-1) × 0.4) = 160 / 1.4 = 114 TPS
```

#### Council Efficiency Ratio
```
Council_efficiency = Actual_combined_TPS / (Sum_of_individual_TPS)
Target_efficiency by tier:
- Mid: ≥ 0.75
- High: ≥ 0.85
```

### 3. Memory & VRAM Budgeting

#### RAM Allocation Formula
```
Total_RAM_budget = Available_RAM × Safety_factor
Model_allocation = Total_RAM_budget × Model_ratio
Data_allocation = Total_RAM_budget × Data_ratio
Overhead_allocation = Total_RAM_budget × Overhead_ratio

Safety_factor by tier:
- Low: 0.8 (conservative)
- Mid: 0.85 (balanced)
- High: 0.9 (aggressive)

Allocation ratios:
- Model_ratio: 0.6 (model weights and context)
- Data_ratio: 0.2 (caches, buffers, session data)
- Overhead_ratio: 0.2 (OS, framework overhead)
```

#### VRAM Capacity Planning
```
Max_model_size_GB = (Available_VRAM × 0.8) / Bytes_per_parameter
Bytes_per_parameter by precision:
- FP32: 4 bytes
- FP16: 2 bytes
- INT8: 1 byte
- INT4: 0.5 bytes

Max_concurrent_models = floor(Available_VRAM × 0.8 / Average_model_VRAM)
```

#### Model Loading Decision Matrix
```
Load_decision = (Model_priority × Usage_frequency × Available_memory) / Model_size

Where:
- Model_priority: 1-10 scale
- Usage_frequency: accesses per hour
- Available_memory: free VRAM in GB
- Model_size: model VRAM requirement in GB

Load if Load_decision > Threshold:
- Low tier: 2.0
- Mid tier: 1.5
- High tier: 1.0
```

### 4. Auto-Scaling Heuristics

#### Scale-Up Triggers
```
Scale_up_score = (1 - CPU_util/100) × CPU_weight + 
                 (1 - GPU_util/100) × GPU_weight + 
                 (1 - Memory_util/100) × Memory_weight

Weights:
- CPU_weight: 0.3
- GPU_weight: 0.5
- Memory_weight: 0.2

Scale up if: Scale_up_score > 0.3 AND sustained for > 30 seconds
```

#### Scale-Down Triggers
```
Performance_degradation = (Target_FPS - Current_FPS) / Target_FPS +
                         (Current_latency - Target_latency) / Target_latency +
                         (Current_memory - Target_memory) / Target_memory

Scale down if: Performance_degradation > 0.15 AND sustained for > 10 seconds
```

### 5. Frame Budget Allocation

#### 60Hz Frame Budget Distribution (16.67ms total)
```
Token_processing_budget = 8.0ms (48%)
Energy_calculation_budget = 3.0ms (18%)
UI_rendering_budget = 4.0ms (24%)
System_overhead_budget = 1.67ms (10%)

Dynamic adjustment:
If Token_processing > budget:
  Reduce Energy_calculation by 50%
  Reduce UI_rendering quality
  
If UI_rendering > budget:
  Drop non-essential visual effects
  Reduce particle count by 50%
```

### 6. Quality Scaling Formulas

#### Visual Quality Adjustment
```
Quality_level = min(1.0, Performance_headroom / Target_headroom)
Performance_headroom = (Target_FPS - Current_FPS) / Target_FPS

Quality adjustments:
- Particle_count = Base_particles × Quality_level²
- Effect_complexity = Base_complexity × Quality_level
- Render_resolution = Base_resolution × sqrt(Quality_level)
```

#### Adaptive Model Selection
```
Model_suitability = (Hardware_score × Performance_weight + 
                    Accuracy_score × Quality_weight) / 
                   (Memory_requirement × Memory_penalty)

Select model with highest Model_suitability score
```

## Capacity Planning Scenarios

### Scenario 1: Single User, Standard Workload
```
Expected_prompts_per_hour = 20
Average_tokens_per_response = 500
Peak_concurrent_models = 1 (Low), 2 (Mid), 4 (High)
Memory_growth_rate = 50MB/hour
```

### Scenario 2: Power User, Heavy Workload
```
Expected_prompts_per_hour = 60
Average_tokens_per_response = 1000
Peak_concurrent_models = 1 (Low), 3 (Mid), 6 (High)
Memory_growth_rate = 200MB/hour
Plugin_overhead = 20% additional CPU/Memory
```

### Scenario 3: Extended Session (8+ hours)
```
Memory_leak_tolerance = 100MB/hour
Performance_degradation_max = 5%
Auto_cleanup_triggers:
- Memory > 90% → Aggressive GC
- Session > 4 hours → Model reload
- Cache > 2GB → Cache flush
```

## Implementation Guidelines

### 1. Real-Time Monitoring
- Sample metrics every 1 second
- Calculate rolling averages over 30 seconds
- Trigger adjustments based on 10-second sustained conditions

### 2. Predictive Scaling
- Use exponential smoothing for trend prediction
- Forecast resource needs 60 seconds ahead
- Pre-load models when scale-up predicted

### 3. Graceful Degradation
- Implement 5 quality levels (Ultra → Low)
- Each level reduces resource usage by 20%
- Maintain minimum viable performance at all levels

### 4. Recovery Procedures
- Auto-recovery timeout: 30 seconds
- Fallback to lower tier if persistent issues
- Emergency mode: Single model, minimal effects

## Validation & Testing

### Formula Accuracy Testing
- Benchmark actual vs predicted performance
- Target accuracy: ±10% for throughput, ±15% for memory
- Calibrate formulas monthly with real usage data

### Edge Case Handling
- Memory exhaustion scenarios
- Thermal throttling conditions
- Network latency impacts (for hybrid mode)
- Plugin interference patterns

## Future Enhancements

### Machine Learning Integration
```
Predicted_performance = ML_model(Hardware_profile, Workload_pattern, Historical_data)
Confidence_interval = ±20% initially, improving to ±5% with data
```

### Dynamic Formula Adjustment
- Self-tuning coefficients based on observed performance
- Hardware-specific optimization profiles
- User behavior pattern recognition

---

**Note**: These formulas provide baseline estimates. Real-world performance may vary based on specific hardware configurations, thermal conditions, and workload patterns. Regular calibration against actual measurements is recommended.
