#!/usr/bin/env python3
"""
WF-TECH-010 Performance Monitoring System
Comprehensive performance monitoring, capacity planning, and optimization module
"""

import asyncio
import json
import sqlite3
import time
import psutil
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
import threading
from concurrent.futures import ThreadPoolExecutor
import statistics

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class HardwareProfile:
    """Hardware profile configuration"""
    profile_id: str
    tier: str  # low, mid, high
    cpu_cores: int
    cpu_threads: int
    memory_gb: float
    gpu_present: bool
    gpu_vram_gb: float
    storage_type: str
    performance_targets: Dict[str, float]

@dataclass
class PerformanceMetrics:
    """Performance metrics snapshot"""
    timestamp: datetime
    session_id: str
    cpu_percent: float
    memory_percent: float
    gpu_percent: Optional[float]
    gpu_memory_percent: Optional[float]
    tokens_per_second: float
    frame_rate_fps: float
    active_requests: int
    queue_length: int

class HardwareDetector:
    """Detects and classifies hardware capabilities"""
    
    def __init__(self):
        self.profile: Optional[HardwareProfile] = None
        self._gpu_available = self._detect_gpu()
    
    def _detect_gpu(self) -> bool:
        """Detect GPU availability"""
        try:
            import GPUtil
            gpus = GPUtil.getGPUs()
            return len(gpus) > 0
        except ImportError:
            return False
    
    def detect_hardware(self) -> HardwareProfile:
        """Detect and classify hardware"""
        # CPU detection
        cpu_cores = psutil.cpu_count(logical=False)
        cpu_threads = psutil.cpu_count(logical=True)
        
        # Memory detection
        memory = psutil.virtual_memory()
        memory_gb = memory.total / (1024**3)
        
        # GPU detection
        gpu_vram_gb = 0.0
        if self._gpu_available:
            try:
                import GPUtil
                gpus = GPUtil.getGPUs()
                if gpus:
                    gpu_vram_gb = gpus[0].memoryTotal / 1024  # Convert MB to GB
            except ImportError:
                pass
        
        # Storage detection (simplified)
        storage_type = "NVMe_SSD"  # Default assumption
        
        # Tier classification
        tier = self._classify_tier(cpu_cores, memory_gb, gpu_vram_gb)
        
        # Performance targets based on tier
        targets = self._get_performance_targets(tier)
        
        profile = HardwareProfile(
            profile_id=f"auto_detected_{int(time.time())}",
            tier=tier,
            cpu_cores=cpu_cores,
            cpu_threads=cpu_threads,
            memory_gb=memory_gb,
            gpu_present=self._gpu_available,
            gpu_vram_gb=gpu_vram_gb,
            storage_type=storage_type,
            performance_targets=targets
        )
        
        self.profile = profile
        logger.info(f"Detected hardware tier: {tier}")
        return profile
    
    def _classify_tier(self, cpu_cores: int, memory_gb: float, gpu_vram_gb: float) -> str:
        """Classify hardware into tiers"""
        if cpu_cores >= 12 and memory_gb >= 24 and gpu_vram_gb >= 12:
            return "high"
        elif cpu_cores >= 6 and memory_gb >= 12 and gpu_vram_gb >= 4:
            return "mid"
        else:
            return "low"
    
    def _get_performance_targets(self, tier: str) -> Dict[str, float]:
        """Get performance targets for tier"""
        targets = {
            "low": {
                "target_tps": 30.0,
                "target_ttft_ms": 2000.0,
                "target_fps": 30.0,
                "max_memory_usage_percent": 80.0
            },
            "mid": {
                "target_tps": 80.0,
                "target_ttft_ms": 1000.0,
                "target_fps": 60.0,
                "max_memory_usage_percent": 85.0
            },
            "high": {
                "target_tps": 200.0,
                "target_ttft_ms": 500.0,
                "target_fps": 60.0,
                "max_memory_usage_percent": 90.0
            }
        }
        return targets.get(tier, targets["low"])

class MetricsCollector:
    """Collects system and application metrics"""
    
    def __init__(self):
        self.session_id = f"session_{int(time.time())}"
        self._gpu_available = self._check_gpu()
    
    def _check_gpu(self) -> bool:
        """Check GPU availability"""
        try:
            import GPUtil
            return len(GPUtil.getGPUs()) > 0
        except ImportError:
            return False
    
    def collect_metrics(self) -> PerformanceMetrics:
        """Collect current performance metrics"""
        # System metrics
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        
        # GPU metrics
        gpu_percent = None
        gpu_memory_percent = None
        if self._gpu_available:
            try:
                import GPUtil
                gpus = GPUtil.getGPUs()
                if gpus:
                    gpu = gpus[0]
                    gpu_percent = gpu.load * 100
                    gpu_memory_percent = gpu.memoryUtil * 100
            except ImportError:
                pass
        
        # Application metrics (simulated for demo)
        tokens_per_second = self._simulate_tps()
        frame_rate_fps = self._simulate_fps()
        active_requests = self._simulate_requests()
        queue_length = max(0, active_requests - 2)
        
        return PerformanceMetrics(
            timestamp=datetime.now(),
            session_id=self.session_id,
            cpu_percent=cpu_percent,
            memory_percent=memory_percent,
            gpu_percent=gpu_percent,
            gpu_memory_percent=gpu_memory_percent,
            tokens_per_second=tokens_per_second,
            frame_rate_fps=frame_rate_fps,
            active_requests=active_requests,
            queue_length=queue_length
        )
    
    def _simulate_tps(self) -> float:
        """Simulate token generation rate"""
        import random
        base_tps = 50.0
        variation = random.uniform(0.8, 1.2)
        return base_tps * variation
    
    def _simulate_fps(self) -> float:
        """Simulate frame rate"""
        import random
        base_fps = 60.0
        variation = random.uniform(0.9, 1.0)
        return base_fps * variation
    
    def _simulate_requests(self) -> int:
        """Simulate active requests"""
        import random
        return random.randint(0, 5)

class AlertManager:
    """Manages performance alerts and notifications"""
    
    def __init__(self, hardware_profile: HardwareProfile):
        self.hardware_profile = hardware_profile
        self.alert_history: List[Dict] = []
        self.alert_cooldowns: Dict[str, datetime] = {}
    
    def check_alerts(self, metrics: PerformanceMetrics) -> List[Dict]:
        """Check metrics against alert thresholds"""
        alerts = []
        current_time = datetime.now()
        
        # CPU usage alert
        cpu_threshold = 90.0 if self.hardware_profile.tier == "high" else 85.0
        if metrics.cpu_percent > cpu_threshold:
            alert = self._create_alert(
                "high_cpu_usage",
                f"CPU usage {metrics.cpu_percent:.1f}% exceeds threshold {cpu_threshold}%",
                "warning",
                current_time
            )
            if self._should_trigger_alert("high_cpu_usage", current_time):
                alerts.append(alert)
        
        # Memory usage alert
        memory_threshold = self.hardware_profile.performance_targets["max_memory_usage_percent"]
        if metrics.memory_percent > memory_threshold:
            alert = self._create_alert(
                "high_memory_usage",
                f"Memory usage {metrics.memory_percent:.1f}% exceeds threshold {memory_threshold}%",
                "warning",
                current_time
            )
            if self._should_trigger_alert("high_memory_usage", current_time):
                alerts.append(alert)
        
        # Performance degradation alert
        target_tps = self.hardware_profile.performance_targets["target_tps"]
        if metrics.tokens_per_second < target_tps * 0.7:  # 30% degradation
            alert = self._create_alert(
                "performance_degradation",
                f"TPS {metrics.tokens_per_second:.1f} is 30% below target {target_tps}",
                "critical",
                current_time
            )
            if self._should_trigger_alert("performance_degradation", current_time):
                alerts.append(alert)
        
        # Frame rate alert
        target_fps = self.hardware_profile.performance_targets["target_fps"]
        if metrics.frame_rate_fps < 30:
            alert = self._create_alert(
                "low_frame_rate",
                f"Frame rate {metrics.frame_rate_fps:.1f} FPS below acceptable threshold",
                "warning",
                current_time
            )
            if self._should_trigger_alert("low_frame_rate", current_time):
                alerts.append(alert)
        
        # Store alerts
        self.alert_history.extend(alerts)
        
        return alerts
    
    def _create_alert(self, alert_type: str, message: str, severity: str, timestamp: datetime) -> Dict:
        """Create alert dictionary"""
        return {
            "type": alert_type,
            "message": message,
            "severity": severity,
            "timestamp": timestamp.isoformat(),
            "hardware_tier": self.hardware_profile.tier
        }
    
    def _should_trigger_alert(self, alert_type: str, current_time: datetime) -> bool:
        """Check if alert should be triggered based on cooldown"""
        cooldown_minutes = 5  # 5 minute cooldown
        
        if alert_type in self.alert_cooldowns:
            last_alert = self.alert_cooldowns[alert_type]
            if current_time - last_alert < timedelta(minutes=cooldown_minutes):
                return False
        
        self.alert_cooldowns[alert_type] = current_time
        return True

class CapacityPlanner:
    """Handles capacity planning and resource allocation"""
    
    def __init__(self, hardware_profile: HardwareProfile):
        self.hardware_profile = hardware_profile
        self.historical_metrics: List[PerformanceMetrics] = []
    
    def add_metrics(self, metrics: PerformanceMetrics):
        """Add metrics to historical data"""
        self.historical_metrics.append(metrics)
        
        # Keep only last 24 hours of data
        cutoff_time = datetime.now() - timedelta(hours=24)
        self.historical_metrics = [
            m for m in self.historical_metrics 
            if m.timestamp > cutoff_time
        ]
    
    def calculate_capacity(self) -> Dict[str, Any]:
        """Calculate current system capacity"""
        if not self.historical_metrics:
            return {"error": "No historical data available"}
        
        recent_metrics = self.historical_metrics[-10:]  # Last 10 measurements
        
        avg_cpu = statistics.mean(m.cpu_percent for m in recent_metrics)
        avg_memory = statistics.mean(m.memory_percent for m in recent_metrics)
        avg_tps = statistics.mean(m.tokens_per_second for m in recent_metrics)
        
        # Calculate remaining capacity
        cpu_headroom = max(0, 85 - avg_cpu)  # Keep 15% buffer
        memory_headroom = max(0, self.hardware_profile.performance_targets["max_memory_usage_percent"] - avg_memory)
        
        # Estimate additional capacity
        cpu_scaling_factor = cpu_headroom / 85
        memory_scaling_factor = memory_headroom / self.hardware_profile.performance_targets["max_memory_usage_percent"]
        
        scaling_factor = min(cpu_scaling_factor, memory_scaling_factor)
        additional_tps = avg_tps * scaling_factor
        
        return {
            "current_utilization": {
                "cpu_percent": avg_cpu,
                "memory_percent": avg_memory,
                "tokens_per_second": avg_tps
            },
            "remaining_capacity": {
                "cpu_headroom_percent": cpu_headroom,
                "memory_headroom_percent": memory_headroom,
                "additional_tps": additional_tps
            },
            "scaling_recommendations": self._get_scaling_recommendations(scaling_factor)
        }
    
    def _get_scaling_recommendations(self, scaling_factor: float) -> List[str]:
        """Get scaling recommendations based on current capacity"""
        recommendations = []
        
        if scaling_factor < 0.1:  # Less than 10% capacity remaining
            recommendations.append("URGENT: System at capacity limit")
            recommendations.append("Consider reducing concurrent operations")
            recommendations.append("Implement request throttling")
            
        elif scaling_factor < 0.3:  # Less than 30% capacity remaining
            recommendations.append("WARNING: Approaching capacity limits")
            recommendations.append("Monitor resource usage closely")
            recommendations.append("Prepare for scaling actions")
            
        else:
            recommendations.append("System operating within normal capacity")
            recommendations.append("Continue monitoring trends")
        
        return recommendations

class PerformanceOptimizer:
    """Automatic performance optimization engine"""
    
    def __init__(self, hardware_profile: HardwareProfile):
        self.hardware_profile = hardware_profile
        self.optimization_history: List[Dict] = []
    
    def optimize_performance(self, metrics: PerformanceMetrics, alerts: List[Dict]) -> List[Dict]:
        """Apply automatic performance optimizations"""
        optimizations = []
        
        for alert in alerts:
            if alert["type"] == "high_cpu_usage":
                optimization = self._optimize_cpu_usage(metrics)
                if optimization:
                    optimizations.append(optimization)
            
            elif alert["type"] == "high_memory_usage":
                optimization = self._optimize_memory_usage(metrics)
                if optimization:
                    optimizations.append(optimization)
            
            elif alert["type"] == "performance_degradation":
                optimization = self._optimize_throughput(metrics)
                if optimization:
                    optimizations.append(optimization)
            
            elif alert["type"] == "low_frame_rate":
                optimization = self._optimize_ui_performance(metrics)
                if optimization:
                    optimizations.append(optimization)
        
        # Store optimization history
        self.optimization_history.extend(optimizations)
        
        return optimizations
    
    def _optimize_cpu_usage(self, metrics: PerformanceMetrics) -> Optional[Dict]:
        """Optimize CPU usage"""
        if metrics.cpu_percent > 90:
            return {
                "type": "cpu_optimization",
                "action": "reduce_concurrency",
                "description": "Reduce concurrent inference requests",
                "parameters": {"max_concurrent": max(1, metrics.active_requests - 1)},
                "timestamp": datetime.now().isoformat()
            }
        return None
    
    def _optimize_memory_usage(self, metrics: PerformanceMetrics) -> Optional[Dict]:
        """Optimize memory usage"""
        if metrics.memory_percent > 85:
            return {
                "type": "memory_optimization",
                "action": "clear_caches",
                "description": "Clear model and system caches",
                "parameters": {"cache_types": ["model_cache", "system_cache"]},
                "timestamp": datetime.now().isoformat()
            }
        return None
    
    def _optimize_throughput(self, metrics: PerformanceMetrics) -> Optional[Dict]:
        """Optimize throughput performance"""
        target_tps = self.hardware_profile.performance_targets["target_tps"]
        if metrics.tokens_per_second < target_tps * 0.7:
            return {
                "type": "throughput_optimization",
                "action": "adjust_model_precision",
                "description": "Reduce model precision to improve throughput",
                "parameters": {"precision": "fp16"},
                "timestamp": datetime.now().isoformat()
            }
        return None
    
    def _optimize_ui_performance(self, metrics: PerformanceMetrics) -> Optional[Dict]:
        """Optimize UI performance"""
        if metrics.frame_rate_fps < 30:
            return {
                "type": "ui_optimization",
                "action": "reduce_ui_quality",
                "description": "Reduce UI quality settings to improve frame rate",
                "parameters": {"quality_level": "medium"},
                "timestamp": datetime.now().isoformat()
            }
        return None

class PerformanceMonitor:
    """Main performance monitoring system"""
    
    def __init__(self, db_path: str = "performance_monitor.db"):
        self.db_path = db_path
        self.running = False
        self.monitor_thread: Optional[threading.Thread] = None
        
        # Initialize components
        self.hardware_detector = HardwareDetector()
        self.metrics_collector = MetricsCollector()
        
        # Detect hardware and initialize dependent components
        self.hardware_profile = self.hardware_detector.detect_hardware()
        self.alert_manager = AlertManager(self.hardware_profile)
        self.capacity_planner = CapacityPlanner(self.hardware_profile)
        self.optimizer = PerformanceOptimizer(self.hardware_profile)
        
        # Initialize database
        self._init_database()
    
    def _init_database(self):
        """Initialize SQLite database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    cpu_percent REAL NOT NULL,
                    memory_percent REAL NOT NULL,
                    gpu_percent REAL,
                    gpu_memory_percent REAL,
                    tokens_per_second REAL NOT NULL,
                    frame_rate_fps REAL NOT NULL,
                    active_requests INTEGER NOT NULL,
                    queue_length INTEGER NOT NULL
                )
            ''')
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    alert_type TEXT NOT NULL,
                    message TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    hardware_tier TEXT NOT NULL
                )
            ''')
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS optimizations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    optimization_type TEXT NOT NULL,
                    action TEXT NOT NULL,
                    description TEXT NOT NULL,
                    parameters TEXT NOT NULL
                )
            ''')
            
            conn.commit()
    
    def start_monitoring(self, interval_seconds: float = 1.0):
        """Start performance monitoring"""
        if self.running:
            logger.warning("Monitoring already running")
            return
        
        self.running = True
        self.monitor_thread = threading.Thread(
            target=self._monitoring_loop,
            args=(interval_seconds,),
            daemon=True
        )
        self.monitor_thread.start()
        logger.info("Performance monitoring started")
    
    def stop_monitoring(self):
        """Stop performance monitoring"""
        self.running = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5.0)
        logger.info("Performance monitoring stopped")
    
    def _monitoring_loop(self, interval_seconds: float):
        """Main monitoring loop"""
        while self.running:
            try:
                # Collect metrics
                metrics = self.metrics_collector.collect_metrics()
                
                # Store metrics in database
                self._store_metrics(metrics)
                
                # Add to capacity planner
                self.capacity_planner.add_metrics(metrics)
                
                # Check for alerts
                alerts = self.alert_manager.check_alerts(metrics)
                
                # Store alerts in database
                for alert in alerts:
                    self._store_alert(alert)
                
                # Apply optimizations if needed
                optimizations = self.optimizer.optimize_performance(metrics, alerts)
                
                # Store optimizations in database
                for optimization in optimizations:
                    self._store_optimization(optimization)
                
                # Log current status
                if alerts or optimizations:
                    logger.info(f"Metrics: CPU={metrics.cpu_percent:.1f}%, "
                              f"Memory={metrics.memory_percent:.1f}%, "
                              f"TPS={metrics.tokens_per_second:.1f}, "
                              f"FPS={metrics.frame_rate_fps:.1f}")
                    
                    if alerts:
                        logger.warning(f"Alerts triggered: {len(alerts)}")
                    
                    if optimizations:
                        logger.info(f"Optimizations applied: {len(optimizations)}")
                
                time.sleep(interval_seconds)
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                time.sleep(interval_seconds)
    
    def _store_metrics(self, metrics: PerformanceMetrics):
        """Store metrics in database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT INTO metrics (
                    timestamp, session_id, cpu_percent, memory_percent,
                    gpu_percent, gpu_memory_percent, tokens_per_second,
                    frame_rate_fps, active_requests, queue_length
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                metrics.timestamp.isoformat(),
                metrics.session_id,
                metrics.cpu_percent,
                metrics.memory_percent,
                metrics.gpu_percent,
                metrics.gpu_memory_percent,
                metrics.tokens_per_second,
                metrics.frame_rate_fps,
                metrics.active_requests,
                metrics.queue_length
            ))
            conn.commit()
    
    def _store_alert(self, alert: Dict):
        """Store alert in database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT INTO alerts (timestamp, alert_type, message, severity, hardware_tier)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                alert["timestamp"],
                alert["type"],
                alert["message"],
                alert["severity"],
                alert["hardware_tier"]
            ))
            conn.commit()
    
    def _store_optimization(self, optimization: Dict):
        """Store optimization in database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT INTO optimizations (timestamp, optimization_type, action, description, parameters)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                optimization["timestamp"],
                optimization["type"],
                optimization["action"],
                optimization["description"],
                json.dumps(optimization["parameters"])
            ))
            conn.commit()
    
    def get_status_report(self) -> Dict[str, Any]:
        """Get comprehensive status report"""
        # Get latest metrics
        latest_metrics = self.metrics_collector.collect_metrics()
        
        # Get capacity analysis
        capacity_analysis = self.capacity_planner.calculate_capacity()
        
        # Get recent alerts
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute('''
                SELECT * FROM alerts 
                WHERE timestamp > datetime('now', '-1 hour')
                ORDER BY timestamp DESC
                LIMIT 10
            ''')
            recent_alerts = [dict(zip([col[0] for col in cursor.description], row)) 
                           for row in cursor.fetchall()]
        
        return {
            "hardware_profile": asdict(self.hardware_profile),
            "current_metrics": asdict(latest_metrics),
            "capacity_analysis": capacity_analysis,
            "recent_alerts": recent_alerts,
            "monitoring_status": "running" if self.running else "stopped"
        }

def main():
    """Example usage of the performance monitoring system"""
    # Initialize performance monitor
    monitor = PerformanceMonitor()
    
    try:
        # Start monitoring
        monitor.start_monitoring(interval_seconds=2.0)
        
        # Let it run for a demo period
        print("Performance monitoring started. Press Ctrl+C to stop.")
        print(f"Hardware tier detected: {monitor.hardware_profile.tier}")
        print(f"Target TPS: {monitor.hardware_profile.performance_targets['target_tps']}")
        
        # Print status reports periodically
        for i in range(10):  # Run for 20 seconds
            time.sleep(2)
            if i % 5 == 0:  # Every 10 seconds
                status = monitor.get_status_report()
                print(f"\n--- Status Report ---")
                print(f"CPU: {status['current_metrics']['cpu_percent']:.1f}%")
                print(f"Memory: {status['current_metrics']['memory_percent']:.1f}%")
                print(f"TPS: {status['current_metrics']['tokens_per_second']:.1f}")
                print(f"FPS: {status['current_metrics']['frame_rate_fps']:.1f}")
                
                if status['recent_alerts']:
                    print(f"Recent alerts: {len(status['recent_alerts'])}")
    
    except KeyboardInterrupt:
        print("\nStopping monitoring...")
    
    finally:
        monitor.stop_monitoring()
        print("Monitoring stopped.")

if __name__ == "__main__":
    main()
