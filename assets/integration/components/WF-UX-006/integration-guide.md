# WF-UX-006 Performance Optimization Integration Guide

## Overview

This guide provides comprehensive integration instructions for implementing the WF-UX-006 Performance Optimization framework in WIRTHFORGE applications.

## Architecture Integration

### Core Components Integration

```python
# Main application integration
from assets.code.WF_UX_006.frame_timer import FrameTimer
from assets.code.WF_UX_006.performance_monitor import PerformanceMonitor
from assets.code.WF_UX_006.adaptive_manager import AdaptiveManager
from assets.code.WF_UX_006.plugin_sandbox import PluginSandbox
from assets.code.WF_UX_006.fallback_scenarios import FallbackManager
from assets.code.WF_UX_006.dashboard_ui import PerformanceDashboard

class WirthForgePerformanceSystem:
    def __init__(self):
        # Initialize core components
        self.frame_timer = FrameTimer()
        self.monitor = PerformanceMonitor()
        self.adaptive_manager = AdaptiveManager()
        self.fallback_manager = FallbackManager()
        self.dashboard = PerformanceDashboard()
        
        # Plugin sandboxes
        self.plugin_sandboxes = {}
        
        # Setup integration
        self._setup_integration()
    
    def _setup_integration(self):
        # Connect components
        self.dashboard.initialize_components(
            self.monitor, 
            self.adaptive_manager, 
            self.fallback_manager
        )
        
        # Setup callbacks
        self.monitor.add_alert_callback(self._handle_performance_alert)
        self.adaptive_manager.add_adaptation_callback(self._handle_quality_adaptation)
        self.fallback_manager.add_activation_callback(self._handle_fallback_activation)
```

### Configuration Integration

```python
# Load performance budgets configuration
import json

def load_performance_config():
    with open('assets/schemas/WF-UX-006/WF-UX-006-performance-budgets.json', 'r') as f:
        budgets_schema = json.load(f)
    
    with open('assets/schemas/WF-UX-006/WF-UX-006-thresholds.json', 'r') as f:
        thresholds_schema = json.load(f)
    
    return budgets_schema, thresholds_schema

# Apply device-specific configuration
def configure_for_device(device_tier, battery_level):
    budgets, thresholds = load_performance_config()
    
    # Select appropriate tier configuration
    tier_config = budgets['properties']['deviceTiers']['properties'][device_tier]
    
    # Apply battery-aware adjustments
    if battery_level < 30:
        # Apply battery saver modifications
        tier_config = apply_battery_saver(tier_config)
    
    return tier_config
```

## Monitoring Integration

### Real-time Metrics Collection

```python
# Integration with application main loop
class ApplicationMainLoop:
    def __init__(self):
        self.performance_system = WirthForgePerformanceSystem()
        self.running = True
    
    def run(self):
        self.performance_system.monitor.start_monitoring()
        
        while self.running:
            # Start frame timing
            self.performance_system.frame_timer.start_frame()
            
            # Application frame logic
            self.update_application()
            self.render_frame()
            
            # End frame timing and check budget
            frame_metrics = self.performance_system.frame_timer.end_frame()
            
            # Handle frame performance
            self.performance_system.adaptive_manager.handle_frame_performance(
                frame_metrics.frame_time_ms,
                frame_metrics.consecutive_overruns
            )
            
            # Update system metrics
            current_metrics = self.performance_system.monitor.get_current_metrics()
            if current_metrics:
                self.performance_system.adaptive_manager.handle_system_metrics(
                    current_metrics.cpu_percent,
                    current_metrics.gpu_percent,
                    current_metrics.memory_percent,
                    current_metrics.battery_percent,
                    current_metrics.thermal_state == "critical"
                )
```

### Plugin Integration

```python
# Plugin system integration
class PluginManager:
    def __init__(self, performance_system):
        self.performance_system = performance_system
        self.active_plugins = {}
    
    def load_plugin(self, plugin_id, plugin_module):
        # Create sandboxed environment
        sandbox = PluginSandbox(plugin_id)
        
        # Start plugin in sandbox
        if sandbox.start_plugin(plugin_module):
            self.active_plugins[plugin_id] = sandbox
            self.performance_system.plugin_sandboxes[plugin_id] = sandbox
            return True
        return False
    
    def execute_plugin_method(self, plugin_id, method, args):
        if plugin_id in self.active_plugins:
            sandbox = self.active_plugins[plugin_id]
            return sandbox.execute_plugin_call(method, args)
        return None
```

## Quality Adaptation Integration

### Automatic Quality Scaling

```python
# Graphics system integration
class GraphicsSystem:
    def __init__(self, performance_system):
        self.performance_system = performance_system
        self.current_settings = None
        
        # Register for quality changes
        self.performance_system.adaptive_manager.add_settings_callback(
            self._apply_quality_settings
        )
    
    def _apply_quality_settings(self, settings):
        self.current_settings = settings
        
        # Apply settings to rendering pipeline
        self.set_particle_count(settings.particle_count)
        self.set_texture_resolution(settings.texture_resolution)
        self.set_shadow_quality(settings.shadow_quality)
        self.enable_antialiasing(settings.antialiasing)
        self.enable_post_processing(settings.post_processing)
        
        print(f"Applied quality settings: {settings.level.name}")
```

### Fallback Scenario Integration

```python
# UI system integration with fallback scenarios
class UISystem:
    def __init__(self, performance_system):
        self.performance_system = performance_system
        self.static_mode = False
        
        # Register for fallback events
        self.performance_system.fallback_manager.add_activation_callback(
            self._handle_fallback_activation
        )
    
    def _handle_fallback_activation(self, scenario):
        if scenario.name == "emergency_mode":
            self.enable_static_mode()
        elif scenario.name == "battery_conservation":
            self.reduce_animation_frequency()
    
    def enable_static_mode(self):
        self.static_mode = True
        # Disable all animations and transitions
        self.disable_animations()
        self.use_static_backgrounds()
```

## Testing Integration

### Automated Performance Testing

```python
# CI/CD integration for performance testing
import subprocess
import sys

def run_performance_tests():
    """Run performance test suite in CI/CD pipeline"""
    
    # Run benchmarks
    benchmark_result = subprocess.run([
        sys.executable, 
        'assets/tests/WF-UX-006/performance-benchmarks.py'
    ], capture_output=True, text=True)
    
    if benchmark_result.returncode != 0:
        print("Benchmark tests failed")
        return False
    
    # Run regression tests
    regression_result = subprocess.run([
        sys.executable,
        'assets/tests/WF-UX-006/regression-tests.py',
        'baseline_results.json',
        'current_results.json'
    ], capture_output=True, text=True)
    
    if regression_result.returncode != 0:
        print("Regression tests detected performance degradation")
        return False
    
    # Run tier simulation
    tier_result = subprocess.run([
        sys.executable,
        'assets/tests/WF-UX-006/tier-simulation.py'
    ], capture_output=True, text=True)
    
    if tier_result.returncode != 0:
        print("Tier simulation tests failed")
        return False
    
    print("All performance tests passed")
    return True

# GitHub Actions workflow integration
def create_performance_check_workflow():
    workflow = """
name: Performance Check
on: [push, pull_request]
jobs:
  performance-test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: 3.9
    - name: Install dependencies
      run: pip install -r requirements.txt
    - name: Run performance tests
      run: python scripts/run_performance_tests.py
    - name: Upload results
      uses: actions/upload-artifact@v2
      with:
        name: performance-results
        path: performance_results/
"""
    return workflow
```

## Dashboard Integration

### Web Dashboard Deployment

```python
# Flask web application for performance dashboard
from flask import Flask, render_template, jsonify
import threading

class WebPerformanceDashboard:
    def __init__(self, performance_system):
        self.app = Flask(__name__)
        self.performance_system = performance_system
        self._setup_routes()
    
    def _setup_routes(self):
        @self.app.route('/')
        def dashboard():
            return render_template('performance_dashboard.html')
        
        @self.app.route('/api/metrics')
        def get_metrics():
            current_metrics = self.performance_system.monitor.get_current_metrics()
            if current_metrics:
                return jsonify({
                    'cpu_percent': current_metrics.cpu_percent,
                    'memory_percent': current_metrics.memory_percent,
                    'gpu_percent': current_metrics.gpu_percent,
                    'battery_percent': current_metrics.battery_percent,
                    'timestamp': current_metrics.timestamp
                })
            return jsonify({})
        
        @self.app.route('/api/quality')
        def get_quality():
            current_quality = self.performance_system.adaptive_manager.get_current_quality()
            return jsonify({'quality_level': current_quality.name})
    
    def start_server(self, host='localhost', port=5000):
        self.app.run(host=host, port=port, threaded=True)
```

## Deployment Considerations

### Production Deployment

1. **Configuration Management**
   - Use environment-specific configuration files
   - Implement configuration validation
   - Support runtime configuration updates

2. **Monitoring and Alerting**
   - Integrate with existing monitoring systems
   - Set up performance alerts
   - Configure log aggregation

3. **Scaling Considerations**
   - Implement distributed monitoring for multi-instance deployments
   - Consider performance data aggregation strategies
   - Plan for high-frequency metrics collection

### Security Considerations

1. **Plugin Sandboxing**
   - Enforce strict resource limits
   - Implement proper isolation
   - Monitor for security violations

2. **Data Privacy**
   - Ensure no sensitive data in performance logs
   - Implement data retention policies
   - Consider GDPR compliance for metrics collection

## Troubleshooting

### Common Integration Issues

1. **Frame Timer Accuracy**
   - Ensure high-resolution timing is available
   - Account for system timer resolution
   - Handle timer drift in long-running applications

2. **Memory Monitoring**
   - Handle memory measurement variations
   - Account for garbage collection impact
   - Consider memory fragmentation effects

3. **Plugin Sandbox Limitations**
   - Test plugin compatibility thoroughly
   - Handle sandbox startup failures gracefully
   - Implement fallback for unsupported plugins

### Performance Debugging

```python
# Debug utilities for performance issues
class PerformanceDebugger:
    def __init__(self, performance_system):
        self.performance_system = performance_system
    
    def generate_debug_report(self):
        report = {
            'current_metrics': self.performance_system.monitor.get_current_metrics(),
            'quality_level': self.performance_system.adaptive_manager.get_current_quality(),
            'active_fallbacks': self.performance_system.fallback_manager.get_status(),
            'plugin_status': {
                pid: sandbox.get_status() 
                for pid, sandbox in self.performance_system.plugin_sandboxes.items()
            }
        }
        return report
    
    def export_performance_trace(self, duration_seconds=60):
        # Export detailed performance trace for analysis
        trace_data = self.performance_system.monitor.get_metrics_history(duration_seconds)
        return trace_data
```

## Best Practices

1. **Initialization Order**
   - Initialize monitoring before other systems
   - Start frame timing early in the application lifecycle
   - Configure thresholds before starting adaptation

2. **Error Handling**
   - Implement graceful degradation for monitoring failures
   - Handle plugin sandbox crashes appropriately
   - Provide fallback behavior for all performance systems

3. **Performance Impact**
   - Minimize monitoring overhead
   - Use efficient data structures for metrics storage
   - Implement sampling for high-frequency events

4. **Testing Strategy**
   - Include performance tests in CI/CD pipeline
   - Test across different hardware tiers
   - Validate adaptation behavior under stress

This integration guide provides the foundation for implementing the WF-UX-006 Performance Optimization framework in production WIRTHFORGE applications.
