# WF-TECH-010 Performance Troubleshooting Guides

**Document ID**: WF-TECH-010  
**Version**: 1.0.0  
**Last Updated**: 2024-01-15  
**Category**: Performance Troubleshooting & Solutions

## Overview

Comprehensive troubleshooting guides for diagnosing and resolving performance issues in WIRTHFORGE across all hardware tiers.

## Quick Diagnostic Checklist

### Performance Triage Matrix
| Symptom | Likely Cause | Priority | Action |
|---------|--------------|----------|--------|
| Slow token generation | CPU/GPU bottleneck | High | Check resource usage |
| UI freezing/stuttering | Frame rate problems | High | Monitor frame times |
| High memory usage | Memory leaks | High | Run memory profiler |
| Model loading failures | VRAM exhaustion | High | Check GPU memory |
| Council sync delays | Threading issues | Medium | Analyze concurrency |
| Gradual degradation | Resource accumulation | Medium | Check for regressions |

## Token Generation Issues

### Diagnostic Script
```python
import psutil, time, json
from datetime import datetime

def diagnose_performance():
    data = {
        'cpu_percent': psutil.cpu_percent(interval=1),
        'memory_percent': psutil.virtual_memory().percent,
        'disk_usage': psutil.disk_usage('/').percent,
        'timestamp': datetime.now().isoformat()
    }
    
    # GPU detection
    try:
        import GPUtil
        gpus = GPUtil.getGPUs()
        if gpus:
            gpu = gpus[0]
            data['gpu_utilization'] = gpu.load * 100
            data['gpu_memory_percent'] = gpu.memoryUtil * 100
    except ImportError:
        data['gpu_available'] = False
    
    print(json.dumps(data, indent=2))
    
    # Issue detection
    issues = []
    if data['cpu_percent'] > 90: issues.append('HIGH_CPU_USAGE')
    if data['memory_percent'] > 85: issues.append('HIGH_MEMORY_USAGE')
    
    print(f"Issues: {', '.join(issues) if issues else 'None detected'}")

diagnose_performance()
```

### Common Solutions

**CPU Bottleneck**
- Reduce concurrent requests
- Lower model precision (FP16 → INT8)
- Disable background processes
- Optimize thread allocation

**GPU Memory Issues**
- Reduce batch size
- Enable model quantization
- Clear GPU cache regularly
- Use gradient checkpointing

**Model Loading Problems**
- Preload frequently used models
- Use faster storage (NVMe SSD)
- Implement memory-mapped files
- Add predictive loading

## UI Performance Issues

### Frame Rate Monitoring
```javascript
class PerformanceMonitor {
    constructor() {
        this.frameTimeHistory = [];
        this.lastFrameTime = performance.now();
    }
    
    startMonitoring() {
        this.monitorFrames();
    }
    
    monitorFrames() {
        const currentTime = performance.now();
        const frameTime = currentTime - this.lastFrameTime;
        this.frameTimeHistory.push(frameTime);
        
        if (this.frameTimeHistory.length > 60) {
            this.frameTimeHistory.shift();
        }
        
        this.lastFrameTime = currentTime;
        requestAnimationFrame(() => this.monitorFrames());
    }
    
    getReport() {
        const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b) / this.frameTimeHistory.length;
        const fps = 1000 / avgFrameTime;
        
        return {
            fps: fps,
            frameTime: avgFrameTime,
            grade: fps >= 55 ? 'EXCELLENT' : fps >= 30 ? 'GOOD' : 'POOR'
        };
    }
}
```

### UI Optimization Solutions

**DOM Performance**
- Batch DOM updates using DocumentFragment
- Minimize layout thrashing
- Use virtual scrolling for large lists
- Implement efficient event delegation

**Animation Performance**
- Use CSS transforms instead of layout changes
- Apply will-change property for animations
- Use requestAnimationFrame for smooth updates
- Avoid reading layout properties during animations

**Memory Management**
- Remove event listeners on component destroy
- Clear intervals and timeouts
- Nullify DOM element references
- Use WeakMap for object associations

## Memory Issues

### Memory Profiling
```python
import psutil, gc, tracemalloc

class MemoryProfiler:
    def __init__(self):
        tracemalloc.start()
        self.snapshots = []
    
    def take_snapshot(self, label=""):
        snapshot = tracemalloc.take_snapshot()
        process = psutil.Process()
        memory_info = process.memory_info()
        
        self.snapshots.append({
            'label': label,
            'rss_mb': memory_info.rss / 1024 / 1024,
            'snapshot': snapshot
        })
    
    def analyze_growth(self):
        if len(self.snapshots) < 2:
            return {'error': 'Need at least 2 snapshots'}
        
        first = self.snapshots[0]
        last = self.snapshots[-1]
        growth = last['rss_mb'] - first['rss_mb']
        
        return {'memory_growth_mb': growth}
    
    def force_gc(self):
        before = psutil.Process().memory_info().rss
        collected = gc.collect()
        after = psutil.Process().memory_info().rss
        freed_mb = (before - after) / 1024 / 1024
        
        return {'objects_collected': collected, 'freed_mb': freed_mb}
```

### Memory Optimization

**Model Memory Management**
- Implement LRU cache for models
- Use memory-mapped model files
- Enable automatic model eviction
- Monitor memory usage continuously

**Leak Prevention**
- Regular garbage collection
- Clear unused references
- Monitor object growth patterns
- Use memory profiling tools

## Council Performance Issues

### Council Diagnostics
```python
class CouncilDiagnostic:
    def __init__(self):
        self.response_times = {}
        self.sync_metrics = []
    
    def measure_council_performance(self, council_size, prompt):
        import time
        from concurrent.futures import ThreadPoolExecutor
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=council_size) as executor:
            tasks = [
                executor.submit(self.simulate_model, f"model_{i}", prompt)
                for i in range(council_size)
            ]
            responses = [task.result() for task in tasks]
        
        total_time = time.time() - start_time
        
        return {
            'total_time': total_time,
            'responses': len(responses),
            'efficiency': len(responses) / total_time if total_time > 0 else 0
        }
    
    def simulate_model(self, model_id, prompt):
        import random, time
        response_time = random.uniform(0.5, 3.0)
        time.sleep(response_time)
        return {'model_id': model_id, 'time': response_time}
```

### Council Optimization

**Load Balancing**
- Profile individual model performance
- Implement dynamic model selection
- Use timeout mechanisms for slow models
- Balance resource allocation

**Synchronization**
- Use asynchronous processing
- Implement early consensus detection
- Optimize inter-thread communication
- Reduce lock contention

## Performance Regression Detection

### Regression Monitoring
```python
class RegressionDetector:
    def __init__(self):
        self.performance_history = []
        self.regression_threshold = 0.15  # 15% degradation
    
    def record_metric(self, metric_name, value):
        import time
        self.performance_history.append({
            'timestamp': time.time(),
            'metric': metric_name,
            'value': value
        })
    
    def detect_regression(self, metric_name):
        import time
        current_time = time.time()
        baseline_cutoff = current_time - (24 * 3600)  # 24 hours
        
        baseline_data = [
            r['value'] for r in self.performance_history
            if r['metric'] == metric_name and r['timestamp'] < baseline_cutoff
        ]
        
        recent_data = [
            r['value'] for r in self.performance_history
            if r['metric'] == metric_name and r['timestamp'] >= baseline_cutoff
        ]
        
        if len(baseline_data) < 10 or len(recent_data) < 10:
            return {'status': 'insufficient_data'}
        
        baseline_avg = sum(baseline_data) / len(baseline_data)
        recent_avg = sum(recent_data) / len(recent_data)
        
        regression_pct = (baseline_avg - recent_avg) / baseline_avg if baseline_avg > 0 else 0
        is_regression = regression_pct > self.regression_threshold
        
        return {
            'status': 'regression' if is_regression else 'normal',
            'regression_percentage': regression_pct * 100,
            'baseline_avg': baseline_avg,
            'recent_avg': recent_avg
        }
```

## Emergency Recovery Procedures

### System Overload Recovery
1. **Immediate Actions**
   - Reduce council size to minimum (1-2 models)
   - Lower UI quality settings
   - Clear all caches
   - Force garbage collection

2. **Progressive Recovery**
   - Monitor system resources
   - Gradually increase performance settings
   - Re-enable features one by one
   - Validate stability at each step

### Critical Resource Exhaustion
```python
def emergency_recovery():
    import psutil, gc
    
    # Check system state
    memory = psutil.virtual_memory()
    cpu = psutil.cpu_percent()
    
    recovery_actions = []
    
    if memory.percent > 95:
        recovery_actions.append("critical_memory_cleanup")
        gc.collect()  # Force garbage collection
    
    if cpu > 98:
        recovery_actions.append("reduce_processing_load")
    
    return {
        'actions_taken': recovery_actions,
        'system_state': {
            'memory_percent': memory.percent,
            'cpu_percent': cpu
        }
    }
```

## Troubleshooting Workflow

### Step-by-Step Process
1. **Identify Symptoms** - Use diagnostic tools to gather metrics
2. **Classify Issue** - Match symptoms to known problem patterns
3. **Apply Solutions** - Implement appropriate fixes based on classification
4. **Validate Fix** - Confirm issue resolution with monitoring
5. **Document** - Record solution for future reference

### Escalation Matrix
- **Level 1**: Automatic recovery systems
- **Level 2**: User-initiated troubleshooting
- **Level 3**: Manual intervention required
- **Level 4**: System restart/reinstall needed

## Monitoring Integration

All troubleshooting procedures integrate with the monitoring system defined in `WF-TECH-010-monitoring-alerting-system.yaml` to provide:
- Automated issue detection
- Performance baseline tracking  
- Alert generation and routing
- Recovery action logging

---

**Next Steps**: Implement automated diagnostics and integrate with monitoring system for proactive issue detection.
