#!/usr/bin/env python3
"""
WF-TECH-009 Metrics Storage and Aggregation System
Local-first metrics collection, storage, and aggregation with SQLite backend
Integrates with WF-TECH-004 state management for unified data persistence
"""

import sqlite3
import json
import time
import threading
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
import logging
from collections import deque, defaultdict
import statistics

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class MetricsSnapshot:
    """Single metrics snapshot following WF-TECH-009 schema"""
    session_id: str
    timestamp: str
    schema_version: str = "1.0.0"
    metrics: Dict[str, Any] = None
    alerts: List[Dict[str, Any]] = None
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.metrics is None:
            self.metrics = {}
        if self.alerts is None:
            self.alerts = []
        if self.metadata is None:
            self.metadata = {}

class MetricsCollector:
    """
    Local-first metrics collection and aggregation system
    Integrates with WF-TECH-004 SQLite database for unified storage
    """
    
    def __init__(self, db_path: str = "wirthforge_metrics.db", 
                 collection_interval: float = 1.0,
                 retention_days: int = 30):
        self.db_path = Path(db_path)
        self.collection_interval = collection_interval
        self.retention_days = retention_days
        self.session_id = str(uuid.uuid4())
        self.running = False
        self.collection_thread = None
        
        # In-memory aggregation buffers (60Hz frame budget: 16.67ms)
        self.frame_times = deque(maxlen=3600)  # Last hour of frame times
        self.latencies = deque(maxlen=1000)    # Last 1000 latencies
        self.error_counts = defaultdict(int)
        self.energy_samples = deque(maxlen=3600)
        
        # Alert system
        self.alert_thresholds = self._load_default_thresholds()
        self.active_alerts = {}
        
        # Initialize database
        self._init_database()
        
        logger.info(f"MetricsCollector initialized with session {self.session_id}")

    def _load_default_thresholds(self) -> Dict[str, Dict[str, Any]]:
        """Load default alert thresholds from WF-FND-006 governance requirements"""
        return {
            "frame_rate_drop": {
                "threshold": 55.0,  # FPS
                "duration_seconds": 5,
                "severity": "warning",
                "message": "Frame rate dropped below 55 FPS"
            },
            "latency_spike": {
                "threshold": 2000.0,  # ms P95
                "severity": "critical", 
                "message": "95th percentile latency exceeded 2 seconds"
            },
            "energy_fidelity_low": {
                "threshold": 0.8,  # 80% fidelity
                "severity": "warning",
                "message": "Energy visualization fidelity below 80%"
            },
            "high_error_rate": {
                "threshold": 10,  # errors per minute
                "severity": "critical",
                "message": "Error rate exceeded 10 per minute"
            },
            "memory_usage_high": {
                "threshold": 85.0,  # percentage
                "severity": "warning", 
                "message": "Memory usage above 85%"
            },
            "cpu_usage_high": {
                "threshold": 90.0,  # percentage
                "duration_seconds": 30,
                "severity": "warning",
                "message": "CPU usage above 90% for extended period"
            }
        }

    def _init_database(self):
        """Initialize SQLite database with metrics tables"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Metrics snapshots table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS metrics_snapshots (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        session_id TEXT NOT NULL,
                        timestamp TEXT NOT NULL,
                        schema_version TEXT NOT NULL,
                        metrics_json TEXT NOT NULL,
                        alerts_json TEXT,
                        metadata_json TEXT,
                        created_at REAL NOT NULL,
                        FOREIGN KEY (session_id) REFERENCES sessions(id)
                    )
                """)
                
                # Time-series metrics for detailed analysis
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS metrics_timeseries (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        session_id TEXT NOT NULL,
                        timestamp TEXT NOT NULL,
                        metric_name TEXT NOT NULL,
                        metric_value REAL NOT NULL,
                        metric_unit TEXT,
                        tags_json TEXT,
                        created_at REAL NOT NULL,
                        INDEX(session_id, metric_name, timestamp)
                    )
                """)
                
                # Alert history table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS alert_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        session_id TEXT NOT NULL,
                        alert_id TEXT NOT NULL,
                        alert_type TEXT NOT NULL,
                        metric_name TEXT NOT NULL,
                        threshold_value REAL,
                        actual_value REAL,
                        message TEXT NOT NULL,
                        triggered_at TEXT NOT NULL,
                        resolved_at TEXT,
                        duration_ms INTEGER,
                        created_at REAL NOT NULL
                    )
                """)
                
                # Session metadata table (extends WF-TECH-004)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS sessions (
                        id TEXT PRIMARY KEY,
                        started_at TEXT NOT NULL,
                        ended_at TEXT,
                        wirthforge_version TEXT,
                        system_info_json TEXT,
                        total_metrics_collected INTEGER DEFAULT 0,
                        created_at REAL NOT NULL
                    )
                """)
                
                # Create indexes for performance
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_snapshots_session_time ON metrics_snapshots(session_id, timestamp)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_timeseries_session_metric ON metrics_timeseries(session_id, metric_name)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_session ON alert_history(session_id)")
                
                conn.commit()
                logger.info("Database initialized successfully")
                
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            raise

    def start_collection(self):
        """Start metrics collection in background thread"""
        if self.running:
            logger.warning("Metrics collection already running")
            return
            
        self.running = True
        self.collection_thread = threading.Thread(target=self._collection_loop, daemon=True)
        self.collection_thread.start()
        
        # Register session
        self._register_session()
        logger.info("Metrics collection started")

    def stop_collection(self):
        """Stop metrics collection and finalize session"""
        if not self.running:
            return
            
        self.running = False
        if self.collection_thread:
            self.collection_thread.join(timeout=5.0)
            
        self._finalize_session()
        logger.info("Metrics collection stopped")

    def _register_session(self):
        """Register new session in database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO sessions (id, started_at, wirthforge_version, system_info_json, created_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    self.session_id,
                    datetime.utcnow().isoformat(),
                    "1.0.0",  # TODO: Get from actual version
                    json.dumps(self._get_system_info()),
                    time.time()
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to register session: {e}")

    def _finalize_session(self):
        """Finalize session in database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE sessions 
                    SET ended_at = ?, total_metrics_collected = (
                        SELECT COUNT(*) FROM metrics_snapshots WHERE session_id = ?
                    )
                    WHERE id = ?
                """, (
                    datetime.utcnow().isoformat(),
                    self.session_id,
                    self.session_id
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to finalize session: {e}")

    def _get_system_info(self) -> Dict[str, Any]:
        """Get system information for metadata"""
        import platform
        import psutil
        
        return {
            "os": platform.system(),
            "os_version": platform.version(),
            "cpu_cores": psutil.cpu_count(),
            "total_memory_mb": psutil.virtual_memory().total / (1024 * 1024),
            "gpu_available": False,  # TODO: Detect GPU
            "python_version": platform.python_version()
        }

    def _collection_loop(self):
        """Main collection loop running at specified interval"""
        while self.running:
            try:
                start_time = time.time()
                
                # Collect current metrics
                snapshot = self._collect_snapshot()
                
                # Store snapshot
                self._store_snapshot(snapshot)
                
                # Check alerts
                self._check_alerts(snapshot)
                
                # Cleanup old data
                self._cleanup_old_data()
                
                # Maintain collection interval
                elapsed = time.time() - start_time
                sleep_time = max(0, self.collection_interval - elapsed)
                if sleep_time > 0:
                    time.sleep(sleep_time)
                    
            except Exception as e:
                logger.error(f"Collection loop error: {e}")
                time.sleep(self.collection_interval)

    def _collect_snapshot(self) -> MetricsSnapshot:
        """Collect current metrics snapshot"""
        timestamp = datetime.utcnow().isoformat()
        
        # Calculate aggregated metrics
        metrics = {
            "latency": self._calculate_latency_metrics(),
            "frame_stability": self._calculate_frame_metrics(),
            "progression_rate": self._calculate_progression_metrics(),
            "error_counts": self._calculate_error_metrics(),
            "energy_fidelity": self._calculate_energy_metrics(),
            "resource_utilization": self._calculate_resource_metrics(),
            "throughput": self._calculate_throughput_metrics()
        }
        
        # Get active alerts
        alerts = list(self.active_alerts.values())
        
        # Metadata
        metadata = {
            "collection_interval_ms": self.collection_interval * 1000,
            "measurement_window_seconds": 60,
            "wirthforge_version": "1.0.0",
            "system_info": self._get_system_info()
        }
        
        return MetricsSnapshot(
            session_id=self.session_id,
            timestamp=timestamp,
            metrics=metrics,
            alerts=alerts,
            metadata=metadata
        )

    def _calculate_latency_metrics(self) -> Dict[str, float]:
        """Calculate latency metrics from recent samples"""
        if not self.latencies:
            return {
                "prompt_to_response_ms": 0.0,
                "p50_latency_ms": 0.0,
                "p95_latency_ms": 0.0,
                "p99_latency_ms": 0.0,
                "average_latency_ms": 0.0,
                "model_computation_ms": 0.0,
                "decipher_processing_ms": 0.0,
                "ui_render_ms": 0.0
            }
        
        latencies_list = list(self.latencies)
        return {
            "prompt_to_response_ms": latencies_list[-1] if latencies_list else 0.0,
            "p50_latency_ms": statistics.median(latencies_list),
            "p95_latency_ms": statistics.quantiles(latencies_list, n=20)[18] if len(latencies_list) > 20 else max(latencies_list),
            "p99_latency_ms": statistics.quantiles(latencies_list, n=100)[98] if len(latencies_list) > 100 else max(latencies_list),
            "average_latency_ms": statistics.mean(latencies_list),
            "model_computation_ms": statistics.mean(latencies_list) * 0.7,  # Estimated
            "decipher_processing_ms": statistics.mean(latencies_list) * 0.2,  # Estimated
            "ui_render_ms": statistics.mean(latencies_list) * 0.1  # Estimated
        }

    def _calculate_frame_metrics(self) -> Dict[str, float]:
        """Calculate frame stability metrics"""
        if not self.frame_times:
            return {
                "current_fps": 60.0,
                "average_fps": 60.0,
                "frame_drops_count": 0,
                "frame_drops_percentage": 0.0,
                "longest_frame_ms": 16.67,
                "frame_budget_violations": 0,
                "frame_stability_score": 100.0
            }
        
        frame_times_list = list(self.frame_times)
        frame_budget_ms = 16.67  # 60Hz target
        
        # Calculate FPS from frame times
        fps_values = [1000.0 / ft for ft in frame_times_list if ft > 0]
        current_fps = fps_values[-1] if fps_values else 60.0
        average_fps = statistics.mean(fps_values) if fps_values else 60.0
        
        # Count frame drops (frames exceeding budget)
        violations = [ft for ft in frame_times_list if ft > frame_budget_ms]
        frame_drops_count = len(violations)
        frame_drops_percentage = (frame_drops_count / len(frame_times_list)) * 100
        
        # Stability score (inverse of frame drop percentage)
        stability_score = max(0, 100 - frame_drops_percentage)
        
        return {
            "current_fps": current_fps,
            "average_fps": average_fps,
            "frame_drops_count": frame_drops_count,
            "frame_drops_percentage": frame_drops_percentage,
            "longest_frame_ms": max(frame_times_list),
            "frame_budget_violations": frame_drops_count,
            "frame_stability_score": stability_score
        }

    def _calculate_progression_metrics(self) -> Dict[str, Any]:
        """Calculate user progression metrics"""
        # TODO: Integrate with actual progression system
        return {
            "current_level": 1,
            "experience_points": 0,
            "levels_per_hour": 0.0,
            "xp_per_minute": 0.0,
            "session_duration_minutes": 0.0,
            "total_sessions": 1,
            "progression_velocity": "optimal"
        }

    def _calculate_error_metrics(self) -> Dict[str, int]:
        """Calculate error and reliability metrics"""
        total_errors = sum(self.error_counts.values())
        return {
            "total_errors": total_errors,
            "errors_per_minute": total_errors / max(1, len(self.frame_times) / 60),
            "critical_errors": self.error_counts.get("critical", 0),
            "plugin_errors": self.error_counts.get("plugin", 0),
            "model_errors": self.error_counts.get("model", 0),
            "ui_errors": self.error_counts.get("ui", 0),
            "network_errors": self.error_counts.get("network", 0),
            "uptime_percentage": 99.9,  # TODO: Calculate actual uptime
            "mean_time_between_failures_minutes": 1440.0  # TODO: Calculate MTBF
        }

    def _calculate_energy_metrics(self) -> Dict[str, float]:
        """Calculate energy fidelity metrics"""
        if not self.energy_samples:
            return {
                "visual_energy_units": 0.0,
                "computed_energy_units": 0.0,
                "fidelity_ratio": 1.0,
                "fidelity_percentage": 100.0,
                "particle_count": 0,
                "token_to_particle_ratio": 1.0,
                "visual_lag_ms": 0.0,
                "energy_coherence_score": 100.0
            }
        
        # TODO: Integrate with actual energy system
        return {
            "visual_energy_units": 1000.0,
            "computed_energy_units": 1000.0,
            "fidelity_ratio": 0.95,
            "fidelity_percentage": 95.0,
            "particle_count": 100,
            "token_to_particle_ratio": 1.0,
            "visual_lag_ms": 5.0,
            "energy_coherence_score": 95.0
        }

    def _calculate_resource_metrics(self) -> Dict[str, float]:
        """Calculate system resource utilization"""
        try:
            import psutil
            
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            
            return {
                "cpu_usage_percentage": cpu_percent,
                "memory_usage_mb": memory.used / (1024 * 1024),
                "memory_usage_percentage": memory.percent,
                "gpu_usage_percentage": 0.0,  # TODO: GPU monitoring
                "disk_io_mb_per_sec": 0.0,  # TODO: Disk I/O monitoring
                "network_io_kb_per_sec": 0.0  # TODO: Network I/O monitoring
            }
        except ImportError:
            logger.warning("psutil not available, using mock resource metrics")
            return {
                "cpu_usage_percentage": 25.0,
                "memory_usage_mb": 1024.0,
                "memory_usage_percentage": 50.0,
                "gpu_usage_percentage": 0.0,
                "disk_io_mb_per_sec": 0.0,
                "network_io_kb_per_sec": 0.0
            }

    def _calculate_throughput_metrics(self) -> Dict[str, float]:
        """Calculate system throughput metrics"""
        # TODO: Integrate with actual processing pipeline
        return {
            "tokens_per_second": 50.0,
            "prompts_per_minute": 5.0,
            "total_tokens_processed": 1000,
            "total_prompts_processed": 20,
            "queue_depth": 0,
            "backpressure_events": 0
        }

    def _store_snapshot(self, snapshot: MetricsSnapshot):
        """Store metrics snapshot in database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO metrics_snapshots 
                    (session_id, timestamp, schema_version, metrics_json, alerts_json, metadata_json, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    snapshot.session_id,
                    snapshot.timestamp,
                    snapshot.schema_version,
                    json.dumps(snapshot.metrics),
                    json.dumps(snapshot.alerts),
                    json.dumps(snapshot.metadata),
                    time.time()
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to store snapshot: {e}")

    def _check_alerts(self, snapshot: MetricsSnapshot):
        """Check metrics against alert thresholds"""
        metrics = snapshot.metrics
        
        # Check frame rate
        if "frame_stability" in metrics:
            fps = metrics["frame_stability"].get("current_fps", 60.0)
            self._check_threshold("frame_rate_drop", fps, lambda x, t: x < t)
        
        # Check latency
        if "latency" in metrics:
            p95_latency = metrics["latency"].get("p95_latency_ms", 0.0)
            self._check_threshold("latency_spike", p95_latency, lambda x, t: x > t)
        
        # Check energy fidelity
        if "energy_fidelity" in metrics:
            fidelity = metrics["energy_fidelity"].get("fidelity_ratio", 1.0)
            self._check_threshold("energy_fidelity_low", fidelity, lambda x, t: x < t)
        
        # Check error rate
        if "error_counts" in metrics:
            error_rate = metrics["error_counts"].get("errors_per_minute", 0.0)
            self._check_threshold("high_error_rate", error_rate, lambda x, t: x > t)
        
        # Check resource usage
        if "resource_utilization" in metrics:
            memory_pct = metrics["resource_utilization"].get("memory_usage_percentage", 0.0)
            cpu_pct = metrics["resource_utilization"].get("cpu_usage_percentage", 0.0)
            self._check_threshold("memory_usage_high", memory_pct, lambda x, t: x > t)
            self._check_threshold("cpu_usage_high", cpu_pct, lambda x, t: x > t)

    def _check_threshold(self, alert_name: str, value: float, condition_func):
        """Check if metric value violates threshold"""
        if alert_name not in self.alert_thresholds:
            return
            
        threshold_config = self.alert_thresholds[alert_name]
        threshold = threshold_config["threshold"]
        
        if condition_func(value, threshold):
            # Threshold violated
            if alert_name not in self.active_alerts:
                # New alert
                alert_id = str(uuid.uuid4())
                alert = {
                    "id": alert_id,
                    "type": threshold_config["severity"],
                    "metric": alert_name,
                    "threshold": threshold,
                    "current_value": value,
                    "message": threshold_config["message"],
                    "timestamp": datetime.utcnow().isoformat(),
                    "duration_ms": 0,
                    "auto_resolved": True
                }
                self.active_alerts[alert_name] = alert
                self._log_alert(alert, "triggered")
                logger.warning(f"Alert triggered: {alert['message']} (value: {value})")
        else:
            # Threshold not violated
            if alert_name in self.active_alerts:
                # Resolve existing alert
                alert = self.active_alerts.pop(alert_name)
                self._log_alert(alert, "resolved")
                logger.info(f"Alert resolved: {alert['message']}")

    def _log_alert(self, alert: Dict[str, Any], action: str):
        """Log alert to database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                if action == "triggered":
                    cursor.execute("""
                        INSERT INTO alert_history 
                        (session_id, alert_id, alert_type, metric_name, threshold_value, 
                         actual_value, message, triggered_at, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        self.session_id,
                        alert["id"],
                        alert["type"],
                        alert["metric"],
                        alert["threshold"],
                        alert["current_value"],
                        alert["message"],
                        alert["timestamp"],
                        time.time()
                    ))
                elif action == "resolved":
                    cursor.execute("""
                        UPDATE alert_history 
                        SET resolved_at = ?, duration_ms = ?
                        WHERE alert_id = ?
                    """, (
                        datetime.utcnow().isoformat(),
                        alert.get("duration_ms", 0),
                        alert["id"]
                    ))
                
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to log alert: {e}")

    def _cleanup_old_data(self):
        """Clean up old metrics data based on retention policy"""
        try:
            cutoff_time = datetime.utcnow() - timedelta(days=self.retention_days)
            cutoff_timestamp = cutoff_time.isoformat()
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Clean up old snapshots
                cursor.execute("DELETE FROM metrics_snapshots WHERE timestamp < ?", (cutoff_timestamp,))
                
                # Clean up old timeseries data
                cursor.execute("DELETE FROM metrics_timeseries WHERE timestamp < ?", (cutoff_timestamp,))
                
                # Clean up old alerts
                cursor.execute("DELETE FROM alert_history WHERE triggered_at < ?", (cutoff_timestamp,))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Failed to cleanup old data: {e}")

    # Public API methods for external integration
    
    def record_frame_time(self, frame_time_ms: float):
        """Record frame processing time for stability metrics"""
        self.frame_times.append(frame_time_ms)

    def record_latency(self, latency_ms: float):
        """Record end-to-end latency measurement"""
        self.latencies.append(latency_ms)

    def record_error(self, error_type: str):
        """Record system error for reliability metrics"""
        self.error_counts[error_type] += 1

    def record_energy_sample(self, visual_energy: float, computed_energy: float):
        """Record energy fidelity sample"""
        self.energy_samples.append({
            "visual": visual_energy,
            "computed": computed_energy,
            "timestamp": time.time()
        })

    def get_current_metrics(self) -> Dict[str, Any]:
        """Get current metrics snapshot for real-time dashboard"""
        snapshot = self._collect_snapshot()
        return asdict(snapshot)

    def get_metrics_history(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get historical metrics for dashboard charts"""
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            cutoff_timestamp = cutoff_time.isoformat()
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT timestamp, metrics_json 
                    FROM metrics_snapshots 
                    WHERE session_id = ? AND timestamp >= ?
                    ORDER BY timestamp
                """, (self.session_id, cutoff_timestamp))
                
                results = []
                for row in cursor.fetchall():
                    timestamp, metrics_json = row
                    results.append({
                        "timestamp": timestamp,
                        "metrics": json.loads(metrics_json)
                    })
                
                return results
                
        except Exception as e:
            logger.error(f"Failed to get metrics history: {e}")
            return []

    def export_metrics(self, output_path: str, format: str = "json"):
        """Export metrics data for analysis or backup"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM metrics_snapshots 
                    WHERE session_id = ?
                    ORDER BY timestamp
                """, (self.session_id,))
                
                if format == "json":
                    data = []
                    for row in cursor.fetchall():
                        data.append({
                            "id": row[0],
                            "session_id": row[1],
                            "timestamp": row[2],
                            "schema_version": row[3],
                            "metrics": json.loads(row[4]),
                            "alerts": json.loads(row[5]) if row[5] else [],
                            "metadata": json.loads(row[6]) if row[6] else {}
                        })
                    
                    with open(output_path, 'w') as f:
                        json.dump(data, f, indent=2)
                
                logger.info(f"Metrics exported to {output_path}")
                
        except Exception as e:
            logger.error(f"Failed to export metrics: {e}")


if __name__ == "__main__":
    # Example usage
    collector = MetricsCollector()
    
    try:
        collector.start_collection()
        
        # Simulate some metrics
        import random
        for i in range(10):
            collector.record_frame_time(random.uniform(15, 20))
            collector.record_latency(random.uniform(800, 1500))
            time.sleep(1)
        
        # Get current metrics
        current = collector.get_current_metrics()
        print("Current metrics:", json.dumps(current, indent=2))
        
    finally:
        collector.stop_collection()
