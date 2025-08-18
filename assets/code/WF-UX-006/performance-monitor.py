"""
WF-UX-006 Performance Monitor
Real-time system performance monitoring and metrics collection
"""

import time
import psutil
import threading
from typing import Dict, Any, Optional, Callable, List
from dataclasses import dataclass, asdict
from collections import deque
import json
import logging
from enum import Enum

class AlertLevel(Enum):
    """Performance alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"

@dataclass
class SystemMetrics:
    """System performance metrics snapshot"""
    timestamp: float
    cpu_percent: float
    cpu_per_core: List[float]
    memory_percent: float
    memory_used_mb: float
    memory_available_mb: float
    gpu_percent: Optional[float] = None
    gpu_memory_used_mb: Optional[float] = None
    gpu_memory_total_mb: Optional[float] = None
    battery_percent: Optional[float] = None
    battery_plugged: Optional[bool] = None
    thermal_state: Optional[str] = None
    disk_io_read_mb: float = 0.0
    disk_io_write_mb: float = 0.0
    network_sent_mb: float = 0.0
    network_recv_mb: float = 0.0

@dataclass
class PerformanceAlert:
    """Performance alert information"""
    level: AlertLevel
    metric: str
    value: float
    threshold: float
    message: str
    timestamp: float
    duration: Optional[float] = None

class PerformanceMonitor:
    """
    Real-time performance monitoring system
    Collects system metrics and triggers alerts based on thresholds
    """
    
    def __init__(self, 
                 collection_interval: float = 1.0,
                 history_size: int = 300,
                 enable_gpu_monitoring: bool = True):
        """
        Initialize performance monitor
        
        Args:
            collection_interval: Metrics collection interval in seconds
            history_size: Number of metric snapshots to retain
            enable_gpu_monitoring: Whether to monitor GPU metrics
        """
        self.collection_interval = collection_interval
        self.history_size = history_size
        self.enable_gpu_monitoring = enable_gpu_monitoring
        
        # Metrics storage
        self.metrics_history: deque = deque(maxlen=history_size)
        self.current_metrics: Optional[SystemMetrics] = None
        
        # Thresholds (loaded from config)
        self.thresholds = self._load_default_thresholds()
        
        # Alert system
        self.alerts: deque = deque(maxlen=100)
        self.alert_callbacks: List[Callable[[PerformanceAlert], None]] = []
        self.active_alerts: Dict[str, PerformanceAlert] = {}
        
        # Monitoring control
        self._monitoring = False
        self._monitor_thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()
        
        # GPU monitoring setup
        self._gpu_available = False
        if enable_gpu_monitoring:
            self._setup_gpu_monitoring()
        
        # Initial baseline
        self._baseline_metrics: Optional[SystemMetrics] = None
        
        # Logger
        self.logger = logging.getLogger(__name__)
    
    def _load_default_thresholds(self) -> Dict[str, Dict[str, float]]:
        """Load default performance thresholds"""
        return {
            "cpu": {
                "warning": 70.0,
                "critical": 85.0,
                "sustained_duration": 5.0
            },
            "memory": {
                "warning": 80.0,
                "critical": 90.0
            },
            "gpu": {
                "warning": 80.0,
                "critical": 90.0,
                "memory_warning": 80.0,
                "memory_critical": 90.0
            },
            "battery": {
                "normal": 50.0,
                "conservative": 30.0,
                "emergency": 15.0,
                "critical": 5.0
            },
            "thermal": {
                "warning": 75.0,
                "critical": 85.0
            }
        }
    
    def _setup_gpu_monitoring(self) -> None:
        """Setup GPU monitoring if available"""
        try:
            import GPUtil
            gpus = GPUtil.getGPUs()
            self._gpu_available = len(gpus) > 0
            if self._gpu_available:
                self.logger.info(f"GPU monitoring enabled: {len(gpus)} GPU(s) detected")
        except ImportError:
            self.logger.warning("GPUtil not available, GPU monitoring disabled")
            self._gpu_available = False
    
    def _collect_system_metrics(self) -> SystemMetrics:
        """Collect current system metrics"""
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=None)
        cpu_per_core = psutil.cpu_percent(interval=None, percpu=True)
        
        # Memory metrics
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        memory_used_mb = memory.used / (1024 * 1024)
        memory_available_mb = memory.available / (1024 * 1024)
        
        # Disk I/O
        disk_io = psutil.disk_io_counters()
        disk_io_read_mb = disk_io.read_bytes / (1024 * 1024) if disk_io else 0.0
        disk_io_write_mb = disk_io.write_bytes / (1024 * 1024) if disk_io else 0.0
        
        # Network I/O
        net_io = psutil.net_io_counters()
        network_sent_mb = net_io.bytes_sent / (1024 * 1024) if net_io else 0.0
        network_recv_mb = net_io.bytes_recv / (1024 * 1024) if net_io else 0.0
        
        # Battery metrics
        battery = psutil.sensors_battery()
        battery_percent = battery.percent if battery else None
        battery_plugged = battery.power_plugged if battery else None
        
        # GPU metrics
        gpu_percent = None
        gpu_memory_used_mb = None
        gpu_memory_total_mb = None
        
        if self._gpu_available:
            try:
                import GPUtil
                gpus = GPUtil.getGPUs()
                if gpus:
                    gpu = gpus[0]  # Use first GPU
                    gpu_percent = gpu.load * 100
                    gpu_memory_used_mb = gpu.memoryUsed
                    gpu_memory_total_mb = gpu.memoryTotal
            except Exception as e:
                self.logger.warning(f"GPU metrics collection failed: {e}")
        
        # Thermal state (simplified)
        thermal_state = None
        try:
            temps = psutil.sensors_temperatures()
            if temps:
                # Get CPU temperature if available
                for name, entries in temps.items():
                    if 'cpu' in name.lower() or 'core' in name.lower():
                        if entries:
                            temp = entries[0].current
                            if temp > self.thresholds["thermal"]["critical"]:
                                thermal_state = "critical"
                            elif temp > self.thresholds["thermal"]["warning"]:
                                thermal_state = "warning"
                            else:
                                thermal_state = "normal"
                            break
        except Exception:
            pass
        
        return SystemMetrics(
            timestamp=time.time(),
            cpu_percent=cpu_percent,
            cpu_per_core=cpu_per_core,
            memory_percent=memory_percent,
            memory_used_mb=memory_used_mb,
            memory_available_mb=memory_available_mb,
            gpu_percent=gpu_percent,
            gpu_memory_used_mb=gpu_memory_used_mb,
            gpu_memory_total_mb=gpu_memory_total_mb,
            battery_percent=battery_percent,
            battery_plugged=battery_plugged,
            thermal_state=thermal_state,
            disk_io_read_mb=disk_io_read_mb,
            disk_io_write_mb=disk_io_write_mb,
            network_sent_mb=network_sent_mb,
            network_recv_mb=network_recv_mb
        )
    
    def _check_thresholds(self, metrics: SystemMetrics) -> None:
        """Check metrics against thresholds and generate alerts"""
        current_time = time.time()
        
        # CPU threshold check
        if metrics.cpu_percent > self.thresholds["cpu"]["critical"]:
            self._create_alert(
                AlertLevel.CRITICAL,
                "cpu_utilization",
                metrics.cpu_percent,
                self.thresholds["cpu"]["critical"],
                f"CPU utilization critical: {metrics.cpu_percent:.1f}%",
                current_time
            )
        elif metrics.cpu_percent > self.thresholds["cpu"]["warning"]:
            self._create_alert(
                AlertLevel.WARNING,
                "cpu_utilization",
                metrics.cpu_percent,
                self.thresholds["cpu"]["warning"],
                f"CPU utilization high: {metrics.cpu_percent:.1f}%",
                current_time
            )
        
        # Memory threshold check
        if metrics.memory_percent > self.thresholds["memory"]["critical"]:
            self._create_alert(
                AlertLevel.CRITICAL,
                "memory_utilization",
                metrics.memory_percent,
                self.thresholds["memory"]["critical"],
                f"Memory utilization critical: {metrics.memory_percent:.1f}%",
                current_time
            )
        elif metrics.memory_percent > self.thresholds["memory"]["warning"]:
            self._create_alert(
                AlertLevel.WARNING,
                "memory_utilization",
                metrics.memory_percent,
                self.thresholds["memory"]["warning"],
                f"Memory utilization high: {metrics.memory_percent:.1f}%",
                current_time
            )
        
        # GPU threshold check
        if metrics.gpu_percent is not None:
            if metrics.gpu_percent > self.thresholds["gpu"]["critical"]:
                self._create_alert(
                    AlertLevel.CRITICAL,
                    "gpu_utilization",
                    metrics.gpu_percent,
                    self.thresholds["gpu"]["critical"],
                    f"GPU utilization critical: {metrics.gpu_percent:.1f}%",
                    current_time
                )
            elif metrics.gpu_percent > self.thresholds["gpu"]["warning"]:
                self._create_alert(
                    AlertLevel.WARNING,
                    "gpu_utilization",
                    metrics.gpu_percent,
                    self.thresholds["gpu"]["warning"],
                    f"GPU utilization high: {metrics.gpu_percent:.1f}%",
                    current_time
                )
        
        # Battery threshold check
        if metrics.battery_percent is not None and not metrics.battery_plugged:
            if metrics.battery_percent < self.thresholds["battery"]["critical"]:
                self._create_alert(
                    AlertLevel.EMERGENCY,
                    "battery_level",
                    metrics.battery_percent,
                    self.thresholds["battery"]["critical"],
                    f"Battery critical: {metrics.battery_percent:.1f}%",
                    current_time
                )
            elif metrics.battery_percent < self.thresholds["battery"]["emergency"]:
                self._create_alert(
                    AlertLevel.CRITICAL,
                    "battery_level",
                    metrics.battery_percent,
                    self.thresholds["battery"]["emergency"],
                    f"Battery low: {metrics.battery_percent:.1f}%",
                    current_time
                )
            elif metrics.battery_percent < self.thresholds["battery"]["conservative"]:
                self._create_alert(
                    AlertLevel.WARNING,
                    "battery_level",
                    metrics.battery_percent,
                    self.thresholds["battery"]["conservative"],
                    f"Battery moderate: {metrics.battery_percent:.1f}%",
                    current_time
                )
        
        # Thermal threshold check
        if metrics.thermal_state == "critical":
            self._create_alert(
                AlertLevel.CRITICAL,
                "thermal_state",
                0.0,  # No numeric value for thermal state
                0.0,
                "System thermal state critical",
                current_time
            )
        elif metrics.thermal_state == "warning":
            self._create_alert(
                AlertLevel.WARNING,
                "thermal_state",
                0.0,
                0.0,
                "System thermal state elevated",
                current_time
            )
    
    def _create_alert(self, 
                     level: AlertLevel, 
                     metric: str, 
                     value: float, 
                     threshold: float, 
                     message: str, 
                     timestamp: float) -> None:
        """Create and process a performance alert"""
        alert_key = f"{metric}_{level.value}"
        
        # Check if this is a new alert or continuation
        if alert_key in self.active_alerts:
            # Update existing alert duration
            existing_alert = self.active_alerts[alert_key]
            existing_alert.duration = timestamp - existing_alert.timestamp
        else:
            # Create new alert
            alert = PerformanceAlert(
                level=level,
                metric=metric,
                value=value,
                threshold=threshold,
                message=message,
                timestamp=timestamp
            )
            
            self.active_alerts[alert_key] = alert
            self.alerts.append(alert)
            
            # Trigger callbacks
            for callback in self.alert_callbacks:
                try:
                    callback(alert)
                except Exception as e:
                    self.logger.error(f"Alert callback failed: {e}")
    
    def _monitor_loop(self) -> None:
        """Main monitoring loop (runs in separate thread)"""
        while self._monitoring:
            try:
                # Collect metrics
                metrics = self._collect_system_metrics()
                
                with self._lock:
                    self.current_metrics = metrics
                    self.metrics_history.append(metrics)
                
                # Check thresholds
                self._check_thresholds(metrics)
                
                # Clear resolved alerts
                self._clear_resolved_alerts(metrics)
                
                # Sleep until next collection
                time.sleep(self.collection_interval)
                
            except Exception as e:
                self.logger.error(f"Monitoring loop error: {e}")
                time.sleep(self.collection_interval)
    
    def _clear_resolved_alerts(self, metrics: SystemMetrics) -> None:
        """Clear alerts that are no longer active"""
        resolved_keys = []
        
        for key, alert in self.active_alerts.items():
            if alert.metric == "cpu_utilization" and metrics.cpu_percent < alert.threshold:
                resolved_keys.append(key)
            elif alert.metric == "memory_utilization" and metrics.memory_percent < alert.threshold:
                resolved_keys.append(key)
            elif alert.metric == "gpu_utilization" and metrics.gpu_percent and metrics.gpu_percent < alert.threshold:
                resolved_keys.append(key)
            elif alert.metric == "battery_level" and metrics.battery_percent and metrics.battery_percent > alert.threshold:
                resolved_keys.append(key)
            elif alert.metric == "thermal_state" and metrics.thermal_state == "normal":
                resolved_keys.append(key)
        
        for key in resolved_keys:
            del self.active_alerts[key]
    
    def start_monitoring(self) -> None:
        """Start performance monitoring"""
        if self._monitoring:
            return
        
        self._monitoring = True
        self._monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._monitor_thread.start()
        
        # Collect baseline
        self._baseline_metrics = self._collect_system_metrics()
        
        self.logger.info("Performance monitoring started")
    
    def stop_monitoring(self) -> None:
        """Stop performance monitoring"""
        self._monitoring = False
        if self._monitor_thread:
            self._monitor_thread.join(timeout=5.0)
        
        self.logger.info("Performance monitoring stopped")
    
    def get_current_metrics(self) -> Optional[SystemMetrics]:
        """Get current system metrics"""
        with self._lock:
            return self.current_metrics
    
    def get_metrics_history(self, duration_seconds: Optional[float] = None) -> List[SystemMetrics]:
        """Get metrics history, optionally filtered by duration"""
        with self._lock:
            if duration_seconds is None:
                return list(self.metrics_history)
            
            cutoff_time = time.time() - duration_seconds
            return [m for m in self.metrics_history if m.timestamp >= cutoff_time]
    
    def get_active_alerts(self) -> List[PerformanceAlert]:
        """Get currently active alerts"""
        return list(self.active_alerts.values())
    
    def get_alert_history(self) -> List[PerformanceAlert]:
        """Get alert history"""
        return list(self.alerts)
    
    def add_alert_callback(self, callback: Callable[[PerformanceAlert], None]) -> None:
        """Add callback for performance alerts"""
        self.alert_callbacks.append(callback)
    
    def update_thresholds(self, thresholds: Dict[str, Dict[str, float]]) -> None:
        """Update performance thresholds"""
        self.thresholds.update(thresholds)
    
    def export_metrics(self, format: str = "json") -> str:
        """Export metrics in specified format"""
        with self._lock:
            data = {
                "current_metrics": asdict(self.current_metrics) if self.current_metrics else None,
                "baseline_metrics": asdict(self._baseline_metrics) if self._baseline_metrics else None,
                "metrics_history": [asdict(m) for m in self.metrics_history],
                "active_alerts": [asdict(a) for a in self.active_alerts.values()],
                "alert_history": [asdict(a) for a in self.alerts],
                "thresholds": self.thresholds
            }
        
        if format == "json":
            return json.dumps(data, indent=2, default=str)
        else:
            raise ValueError(f"Unsupported export format: {format}")

# Example usage and testing
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    def alert_handler(alert: PerformanceAlert):
        print(f"ALERT [{alert.level.value.upper()}]: {alert.message}")
    
    # Create and start monitor
    monitor = PerformanceMonitor(collection_interval=1.0)
    monitor.add_alert_callback(alert_handler)
    monitor.start_monitoring()
    
    try:
        # Monitor for 30 seconds
        for i in range(30):
            time.sleep(1)
            metrics = monitor.get_current_metrics()
            if metrics:
                print(f"CPU: {metrics.cpu_percent:.1f}% | "
                      f"Memory: {metrics.memory_percent:.1f}% | "
                      f"GPU: {metrics.gpu_percent:.1f}% | "
                      f"Battery: {metrics.battery_percent}%")
    
    finally:
        monitor.stop_monitoring()
        
        # Export final metrics
        export_data = monitor.export_metrics()
        print("\nFinal metrics exported to JSON")
