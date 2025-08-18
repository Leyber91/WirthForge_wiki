#!/usr/bin/env python3
"""
WF-TECH-009 Debugging and Troubleshooting Interfaces
Advanced debugging tools for WIRTHFORGE observability system
Provides real-time system inspection, anomaly detection, and diagnostic capabilities
"""

import json
import time
import sqlite3
import threading
from typing import Dict, List, Optional, Any, Tuple, Callable
from dataclasses import dataclass, asdict
from pathlib import Path
import logging
from enum import Enum
from datetime import datetime, timedelta
import statistics
import traceback
import psutil
import sys

logger = logging.getLogger(__name__)

class DiagnosticLevel(Enum):
    """Diagnostic severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class SystemComponent(Enum):
    """WIRTHFORGE system components"""
    DECIPHER = "decipher"
    ENERGY_SERVICE = "energy_service"
    ORCHESTRATOR = "orchestrator"
    METRICS_COLLECTOR = "metrics_collector"
    DASHBOARD = "dashboard"
    ALERT_SYSTEM = "alert_system"
    PLUGIN_MANAGER = "plugin_manager"
    DATABASE = "database"
    WEBSOCKET = "websocket"

@dataclass
class DiagnosticResult:
    """Result of a diagnostic check"""
    component: SystemComponent
    check_name: str
    level: DiagnosticLevel
    message: str
    details: Dict[str, Any]
    timestamp: float
    remediation: Optional[str] = None

@dataclass
class PerformanceProfile:
    """Performance profiling data"""
    component: str
    function_name: str
    call_count: int
    total_time: float
    average_time: float
    max_time: float
    min_time: float
    memory_usage_mb: float

class SystemProfiler:
    """
    Real-time system profiler for WIRTHFORGE components
    Tracks performance, memory usage, and resource consumption
    """
    
    def __init__(self):
        self.profiles: Dict[str, List[float]] = {}
        self.memory_snapshots: List[Tuple[float, float]] = []
        self.cpu_snapshots: List[Tuple[float, float]] = []
        self.profiling_active = False
        self.profile_lock = threading.Lock()
        
    def start_profiling(self):
        """Start system profiling"""
        self.profiling_active = True
        self.profiles.clear()
        self.memory_snapshots.clear()
        self.cpu_snapshots.clear()
        
        # Start background monitoring
        threading.Thread(target=self._monitor_system_resources, daemon=True).start()
        
    def stop_profiling(self):
        """Stop system profiling"""
        self.profiling_active = False
        
    def profile_function(self, component: str, function_name: str):
        """Decorator for profiling function execution"""
        def decorator(func: Callable):
            def wrapper(*args, **kwargs):
                if not self.profiling_active:
                    return func(*args, **kwargs)
                
                start_time = time.time()
                start_memory = self._get_memory_usage()
                
                try:
                    result = func(*args, **kwargs)
                    return result
                finally:
                    end_time = time.time()
                    execution_time = end_time - start_time
                    
                    profile_key = f"{component}.{function_name}"
                    
                    with self.profile_lock:
                        if profile_key not in self.profiles:
                            self.profiles[profile_key] = []
                        
                        self.profiles[profile_key].append(execution_time)
            
            return wrapper
        return decorator
    
    def _monitor_system_resources(self):
        """Monitor system resources in background"""
        while self.profiling_active:
            try:
                # CPU usage
                cpu_percent = psutil.cpu_percent(interval=1)
                self.cpu_snapshots.append((time.time(), cpu_percent))
                
                # Memory usage
                memory_mb = self._get_memory_usage()
                self.memory_snapshots.append((time.time(), memory_mb))
                
                # Keep only last 1000 snapshots
                if len(self.cpu_snapshots) > 1000:
                    self.cpu_snapshots = self.cpu_snapshots[-1000:]
                if len(self.memory_snapshots) > 1000:
                    self.memory_snapshots = self.memory_snapshots[-1000:]
                
                time.sleep(5)  # Sample every 5 seconds
                
            except Exception as e:
                logger.error(f"Error monitoring system resources: {e}")
                time.sleep(10)
    
    def _get_memory_usage(self) -> float:
        """Get current memory usage in MB"""
        process = psutil.Process()
        return process.memory_info().rss / (1024 * 1024)
    
    def get_performance_report(self) -> Dict[str, PerformanceProfile]:
        """Generate performance report"""
        report = {}
        
        with self.profile_lock:
            for profile_key, times in self.profiles.items():
                if not times:
                    continue
                
                component, function_name = profile_key.split('.', 1)
                
                # Calculate statistics
                total_time = sum(times)
                call_count = len(times)
                average_time = total_time / call_count
                max_time = max(times)
                min_time = min(times)
                
                # Estimate memory usage
                memory_usage = self._get_memory_usage()
                
                report[profile_key] = PerformanceProfile(
                    component=component,
                    function_name=function_name,
                    call_count=call_count,
                    total_time=total_time,
                    average_time=average_time,
                    max_time=max_time,
                    min_time=min_time,
                    memory_usage_mb=memory_usage
                )
        
        return report

class AnomalyDetector:
    """
    Detects anomalies in metrics and system behavior
    Uses statistical analysis and pattern recognition
    """
    
    def __init__(self, sensitivity: float = 2.0):
        self.sensitivity = sensitivity
        self.baseline_data: Dict[str, List[float]] = {}
        self.anomalies: List[Dict[str, Any]] = []
        
    def add_baseline_data(self, metric_name: str, value: float):
        """Add data point to baseline for anomaly detection"""
        if metric_name not in self.baseline_data:
            self.baseline_data[metric_name] = []
        
        self.baseline_data[metric_name].append(value)
        
        # Keep only last 1000 points for baseline
        if len(self.baseline_data[metric_name]) > 1000:
            self.baseline_data[metric_name] = self.baseline_data[metric_name][-1000:]
    
    def detect_anomalies(self, current_metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Detect anomalies in current metrics"""
        anomalies = []
        
        flat_metrics = self._flatten_metrics(current_metrics)
        
        for metric_name, value in flat_metrics.items():
            if not isinstance(value, (int, float)):
                continue
            
            anomaly = self._check_metric_anomaly(metric_name, value)
            if anomaly:
                anomalies.append(anomaly)
                self.anomalies.append(anomaly)
        
        # Keep only recent anomalies
        cutoff_time = time.time() - 3600  # Last hour
        self.anomalies = [a for a in self.anomalies if a['timestamp'] > cutoff_time]
        
        return anomalies
    
    def _check_metric_anomaly(self, metric_name: str, value: float) -> Optional[Dict[str, Any]]:
        """Check if a metric value is anomalous"""
        if metric_name not in self.baseline_data:
            self.add_baseline_data(metric_name, value)
            return None
        
        baseline = self.baseline_data[metric_name]
        
        if len(baseline) < 10:
            self.add_baseline_data(metric_name, value)
            return None
        
        # Calculate statistics
        mean = statistics.mean(baseline)
        stdev = statistics.stdev(baseline) if len(baseline) > 1 else 0
        
        if stdev == 0:
            if value != mean:
                severity = "high" if abs(value - mean) > mean * 0.5 else "medium"
                return {
                    "metric_name": metric_name,
                    "value": value,
                    "expected": mean,
                    "deviation": abs(value - mean),
                    "severity": severity,
                    "timestamp": time.time(),
                    "type": "no_variation_baseline"
                }
            return None
        
        # Check for statistical anomaly
        z_score = abs(value - mean) / stdev
        
        if z_score > self.sensitivity:
            severity = "critical" if z_score > 3 else "high" if z_score > 2.5 else "medium"
            
            anomaly = {
                "metric_name": metric_name,
                "value": value,
                "expected": mean,
                "z_score": z_score,
                "deviation": abs(value - mean),
                "severity": severity,
                "timestamp": time.time(),
                "type": "statistical_anomaly"
            }
            
            return anomaly
        
        # Add to baseline if not anomalous
        self.add_baseline_data(metric_name, value)
        return None
    
    def _flatten_metrics(self, metrics: Dict[str, Any], prefix: str = "") -> Dict[str, Any]:
        """Flatten nested metrics dictionary"""
        flat = {}
        for key, value in metrics.items():
            full_key = f"{prefix}.{key}" if prefix else key
            if isinstance(value, dict):
                flat.update(self._flatten_metrics(value, full_key))
            else:
                flat[full_key] = value
        return flat

class SystemDiagnostics:
    """
    Comprehensive system diagnostics for WIRTHFORGE components
    Performs health checks, connectivity tests, and configuration validation
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.diagnostic_results: List[DiagnosticResult] = []
        
    def run_full_diagnostics(self) -> List[DiagnosticResult]:
        """Run comprehensive system diagnostics"""
        self.diagnostic_results.clear()
        
        # Database diagnostics
        self._check_database_health()
        
        # Metrics collection diagnostics
        self._check_metrics_collection()
        
        # Performance diagnostics
        self._check_performance_thresholds()
        
        # Configuration diagnostics
        self._check_configuration()
        
        return self.diagnostic_results
    
    def _check_database_health(self):
        """Check database connectivity and integrity"""
        try:
            db_path = self.config.get('database', {}).get('path', 'metrics.db')
            
            # Test connection
            with sqlite3.connect(db_path) as conn:
                cursor = conn.cursor()
                
                # Check if tables exist
                cursor.execute("""
                    SELECT name FROM sqlite_master 
                    WHERE type='table' AND name='metrics_snapshots'
                """)
                
                if not cursor.fetchone():
                    self._add_diagnostic(
                        SystemComponent.DATABASE,
                        "table_missing",
                        DiagnosticLevel.ERROR,
                        "Metrics table missing from database",
                        {"table": "metrics_snapshots", "db_path": db_path},
                        "Run database initialization script"
                    )
                else:
                    self._add_diagnostic(
                        SystemComponent.DATABASE,
                        "health_check",
                        DiagnosticLevel.INFO,
                        "Database health check passed",
                        {"db_path": db_path}
                    )
        
        except Exception as e:
            self._add_diagnostic(
                SystemComponent.DATABASE,
                "connection_error",
                DiagnosticLevel.CRITICAL,
                f"Database connection failed: {str(e)}",
                {"error": str(e)},
                "Check database file permissions and disk space"
            )
    
    def _check_metrics_collection(self):
        """Check metrics collection system"""
        try:
            metrics_config = self.config.get('metrics', {})
            collection_interval = metrics_config.get('collection_interval_ms', 1000)
            
            if collection_interval < 100:
                self._add_diagnostic(
                    SystemComponent.METRICS_COLLECTOR,
                    "collection_interval",
                    DiagnosticLevel.WARNING,
                    "Metrics collection interval too aggressive",
                    {"interval_ms": collection_interval},
                    "Increase collection interval to reduce overhead"
                )
            
            # Check frame budget compliance
            target_fps = metrics_config.get('target_fps', 60)
            frame_budget_ms = 1000 / target_fps
            
            if collection_interval > frame_budget_ms:
                self._add_diagnostic(
                    SystemComponent.METRICS_COLLECTOR,
                    "frame_budget",
                    DiagnosticLevel.WARNING,
                    "Metrics collection may impact frame budget",
                    {
                        "collection_interval_ms": collection_interval,
                        "frame_budget_ms": frame_budget_ms
                    },
                    "Optimize metrics collection or reduce frequency"
                )
            else:
                self._add_diagnostic(
                    SystemComponent.METRICS_COLLECTOR,
                    "frame_budget",
                    DiagnosticLevel.INFO,
                    "Metrics collection within frame budget",
                    {
                        "collection_interval_ms": collection_interval,
                        "frame_budget_ms": frame_budget_ms
                    }
                )
        
        except Exception as e:
            self._add_diagnostic(
                SystemComponent.METRICS_COLLECTOR,
                "configuration_error",
                DiagnosticLevel.ERROR,
                f"Metrics configuration error: {str(e)}",
                {"error": str(e)}
            )
    
    def _check_performance_thresholds(self):
        """Check performance threshold configuration"""
        try:
            # Check system resources
            cpu_percent = psutil.cpu_percent(interval=1)
            memory_info = psutil.virtual_memory()
            
            # CPU check
            if cpu_percent > 80:
                self._add_diagnostic(
                    SystemComponent.ORCHESTRATOR,
                    "high_cpu",
                    DiagnosticLevel.WARNING,
                    f"High CPU usage: {cpu_percent:.1f}%",
                    {"cpu_percent": cpu_percent},
                    "Check for resource-intensive processes"
                )
            
            # Memory check
            if memory_info.percent > 85:
                self._add_diagnostic(
                    SystemComponent.ORCHESTRATOR,
                    "high_memory",
                    DiagnosticLevel.WARNING,
                    f"High memory usage: {memory_info.percent:.1f}%",
                    {"memory_percent": memory_info.percent},
                    "Check for memory leaks or reduce memory usage"
                )
        
        except Exception as e:
            self._add_diagnostic(
                SystemComponent.ORCHESTRATOR,
                "resource_check_error",
                DiagnosticLevel.ERROR,
                f"Resource check failed: {str(e)}",
                {"error": str(e)}
            )
    
    def _check_configuration(self):
        """Check system configuration validity"""
        try:
            # Check required configuration sections
            required_sections = ['database', 'metrics']
            missing_sections = [section for section in required_sections 
                              if section not in self.config]
            
            if missing_sections:
                self._add_diagnostic(
                    SystemComponent.ORCHESTRATOR,
                    "missing_config",
                    DiagnosticLevel.ERROR,
                    "Missing required configuration sections",
                    {"missing_sections": missing_sections},
                    "Add missing configuration sections"
                )
            
            # Check configuration values
            if 'metrics' in self.config:
                metrics_config = self.config['metrics']
                target_fps = metrics_config.get('target_fps', 60)
                
                if target_fps < 30 or target_fps > 120:
                    self._add_diagnostic(
                        SystemComponent.ORCHESTRATOR,
                        "invalid_fps_target",
                        DiagnosticLevel.WARNING,
                        f"Unusual FPS target: {target_fps}",
                        {"target_fps": target_fps},
                        "Verify FPS target is appropriate for your use case"
                    )
        
        except Exception as e:
            self._add_diagnostic(
                SystemComponent.ORCHESTRATOR,
                "config_validation_error",
                DiagnosticLevel.ERROR,
                f"Configuration validation failed: {str(e)}",
                {"error": str(e)}
            )
    
    def _add_diagnostic(self, component: SystemComponent, check_name: str,
                       level: DiagnosticLevel, message: str, details: Dict[str, Any],
                       remediation: Optional[str] = None):
        """Add diagnostic result"""
        result = DiagnosticResult(
            component=component,
            check_name=check_name,
            level=level,
            message=message,
            details=details,
            timestamp=time.time(),
            remediation=remediation
        )
        
        self.diagnostic_results.append(result)
    
    def get_health_score(self) -> Dict[str, Any]:
        """Calculate overall system health score"""
        if not self.diagnostic_results:
            return {"score": 0, "status": "unknown"}
        
        # Weight diagnostic levels
        weights = {
            DiagnosticLevel.INFO: 0,
            DiagnosticLevel.WARNING: -10,
            DiagnosticLevel.ERROR: -25,
            DiagnosticLevel.CRITICAL: -50
        }
        
        total_score = 100
        issue_count = {"warning": 0, "error": 0, "critical": 0}
        
        for result in self.diagnostic_results:
            total_score += weights[result.level]
            
            if result.level == DiagnosticLevel.WARNING:
                issue_count["warning"] += 1
            elif result.level == DiagnosticLevel.ERROR:
                issue_count["error"] += 1
            elif result.level == DiagnosticLevel.CRITICAL:
                issue_count["critical"] += 1
        
        # Ensure score doesn't go below 0
        total_score = max(0, total_score)
        
        # Determine status
        if total_score >= 90:
            status = "excellent"
        elif total_score >= 75:
            status = "good"
        elif total_score >= 50:
            status = "fair"
        elif total_score >= 25:
            status = "poor"
        else:
            status = "critical"
        
        return {
            "score": total_score,
            "status": status,
            "issue_count": issue_count,
            "total_checks": len(self.diagnostic_results)
        }

class DebugInterface:
    """
    Main debugging interface for WIRTHFORGE observability
    Provides unified access to all debugging and troubleshooting tools
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.profiler = SystemProfiler()
        self.anomaly_detector = AnomalyDetector()
        self.diagnostics = SystemDiagnostics(config)
        
    def start_debug_session(self):
        """Start comprehensive debugging session"""
        self.profiler.start_profiling()
        logger.info("Debug session started")
        
    def stop_debug_session(self):
        """Stop debugging session"""
        self.profiler.stop_profiling()
        logger.info("Debug session stopped")
        
    def get_system_status(self) -> Dict[str, Any]:
        """Get comprehensive system status"""
        # Run diagnostics
        diagnostic_results = self.diagnostics.run_full_diagnostics()
        health_score = self.diagnostics.get_health_score()
        
        # Get performance data
        performance_report = self.profiler.get_performance_report()
        
        # Get anomaly data
        anomaly_summary = self.anomaly_detector.get_anomaly_summary() if hasattr(self.anomaly_detector, 'get_anomaly_summary') else {}
        
        return {
            "timestamp": time.time(),
            "health": health_score,
            "diagnostics": [asdict(result) for result in diagnostic_results],
            "performance": {
                "profiles": {k: asdict(v) for k, v in performance_report.items()}
            },
            "anomalies": anomaly_summary,
            "system_info": {
                "python_version": sys.version,
                "platform": sys.platform,
                "cpu_count": psutil.cpu_count(),
                "memory_total_gb": psutil.virtual_memory().total / (1024**3)
            }
        }
    
    def analyze_metrics(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze current metrics for issues"""
        # Detect anomalies
        anomalies = self.anomaly_detector.detect_anomalies(metrics)
        
        # Performance analysis
        analysis = {
            "timestamp": time.time(),
            "metrics_health": "good",
            "anomalies": anomalies,
            "recommendations": []
        }
        
        # Check specific metric thresholds
        flat_metrics = self._flatten_metrics(metrics)
        
        # FPS analysis
        fps = flat_metrics.get('frame_stability.current_fps', 60)
        if fps < 45:
            analysis["metrics_health"] = "poor"
            analysis["recommendations"].append({
                "type": "performance",
                "message": f"Low FPS detected: {fps:.1f}",
                "action": "Check for performance bottlenecks"
            })
        
        # Latency analysis
        latency = flat_metrics.get('latency.average_latency_ms', 0)
        if latency > 2000:
            analysis["metrics_health"] = "poor"
            analysis["recommendations"].append({
                "type": "performance",
                "message": f"High latency detected: {latency:.1f}ms",
                "action": "Optimize processing pipeline"
            })
        
        return analysis
    
    def _flatten_metrics(self, metrics: Dict[str, Any], prefix: str = "") -> Dict[str, Any]:
        """Flatten nested metrics dictionary"""
        flat = {}
        for key, value in metrics.items():
            full_key = f"{prefix}.{key}" if prefix else key
            if isinstance(value, dict):
                flat.update(self._flatten_metrics(value, full_key))
            else:
                flat[full_key] = value
        return flat
    
    def generate_debug_report(self) -> str:
        """Generate comprehensive debug report"""
        status = self.get_system_status()
        
        report = {
            "report_generated": datetime.now().isoformat(),
            "system_status": status,
            "configuration": self.config,
            "recommendations": self._generate_recommendations(status)
        }
        
        return json.dumps(report, indent=2)
    
    def _generate_recommendations(self, status: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on system status"""
        recommendations = []
        
        health_score = status["health"]["score"]
        
        if health_score < 50:
            recommendations.append("System health is poor - immediate attention required")
        elif health_score < 75:
            recommendations.append("System health needs improvement")
        
        # Check for specific issues
        for diagnostic in status["diagnostics"]:
            if diagnostic["level"] in ["error", "critical"] and diagnostic.get("remediation"):
                recommendations.append(diagnostic["remediation"])
        
        return recommendations


def create_debug_dashboard_spec() -> Dict[str, Any]:
    """Create debug dashboard UI specification"""
    return {
        "title": "WIRTHFORGE Debug Dashboard",
        "layout": {
            "type": "grid",
            "columns": 2,
            "sections": [
                {
                    "title": "System Health",
                    "type": "health_score",
                    "data_source": "/api/debug/health",
                    "refresh_interval": 5000
                },
                {
                    "title": "Performance Metrics",
                    "type": "performance_chart",
                    "data_source": "/api/debug/performance",
                    "refresh_interval": 1000
                },
                {
                    "title": "Diagnostic Results",
                    "type": "diagnostic_table",
                    "data_source": "/api/debug/diagnostics",
                    "refresh_interval": 10000
                },
                {
                    "title": "Anomaly Detection",
                    "type": "anomaly_list",
                    "data_source": "/api/debug/anomalies",
                    "refresh_interval": 5000
                }
            ]
        },
        "actions": [
            {
                "name": "start_profiling",
                "label": "Start Profiling",
                "endpoint": "/api/debug/start-profiling"
            },
            {
                "name": "stop_profiling",
                "label": "Stop Profiling",
                "endpoint": "/api/debug/stop-profiling"
            },
            {
                "name": "export_report",
                "label": "Export Debug Report",
                "endpoint": "/api/debug/export-report"
            }
        ]
    }


if __name__ == "__main__":
    # Example usage and testing
    config = {
        "database": {
            "path": "test_metrics.db"
        },
        "metrics": {
            "collection_interval_ms": 1000,
            "target_fps": 60
        }
    }
    
    # Initialize debug interface
    debug_interface = DebugInterface(config)
    
    try:
        # Start debug session
        debug_interface.start_debug_session()
        
        # Get system status
        status = debug_interface.get_system_status()
        print("System Status:", json.dumps(status, indent=2))
        
        # Test metrics analysis
        test_metrics = {
            "frame_stability": {
                "current_fps": 45.2,
                "frame_drops": 5
            },
            "latency": {
                "average_latency_ms": 1800
            },
            "energy_fidelity": {
                "fidelity_ratio": 0.85
            }
        }
        
        analysis = debug_interface.analyze_metrics(test_metrics)
        print("Metrics Analysis:", json.dumps(analysis, indent=2))
        
        # Generate debug report
        report = debug_interface.generate_debug_report()
        print("Debug Report Generated")
        
    finally:
        debug_interface.stop_debug_session()
