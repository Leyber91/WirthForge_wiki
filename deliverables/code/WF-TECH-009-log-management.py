#!/usr/bin/env python3
"""
WF-TECH-009 Local Log Management and Rotation
Efficient log management system for WIRTHFORGE observability with automatic rotation,
compression, and retention policies. Integrates with metrics collection and alerting.
"""

import os
import gzip
import json
import time
import logging
import threading
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
from datetime import datetime, timedelta
from enum import Enum
import sqlite3
import shutil
import hashlib

class LogLevel(Enum):
    """Log levels for WIRTHFORGE observability"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"
    METRICS = "METRICS"  # Special level for metrics data
    ALERT = "ALERT"      # Special level for alert events

@dataclass
class LogRotationConfig:
    """Configuration for log rotation"""
    max_file_size_mb: int = 10
    max_files: int = 5
    compress_rotated: bool = True
    retention_days: int = 30
    rotation_interval_hours: int = 24

@dataclass
class LogEntry:
    """Structured log entry"""
    timestamp: float
    level: LogLevel
    component: str
    message: str
    data: Optional[Dict[str, Any]] = None
    session_id: Optional[str] = None
    correlation_id: Optional[str] = None

class StructuredLogger:
    """
    Structured logger for WIRTHFORGE observability
    Outputs JSON-formatted logs for easy parsing and analysis
    """
    
    def __init__(self, component: str, log_dir: str):
        self.component = component
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # Create component-specific log file
        self.log_file = self.log_dir / f"{component}.log"
        
        # Setup Python logger
        self.logger = logging.getLogger(f"wirthforge.{component}")
        self.logger.setLevel(logging.DEBUG)
        
        # Remove existing handlers
        for handler in self.logger.handlers[:]:
            self.logger.removeHandler(handler)
        
        # Add structured file handler
        handler = logging.FileHandler(str(self.log_file))
        handler.setFormatter(StructuredLogFormatter())
        self.logger.addHandler(handler)
        
        # Thread-local storage for context
        self._local = threading.local()
    
    def set_context(self, session_id: Optional[str] = None, 
                   correlation_id: Optional[str] = None):
        """Set logging context for current thread"""
        self._local.session_id = session_id
        self._local.correlation_id = correlation_id
    
    def _create_log_entry(self, level: LogLevel, message: str, 
                         data: Optional[Dict[str, Any]] = None) -> LogEntry:
        """Create structured log entry"""
        return LogEntry(
            timestamp=time.time(),
            level=level,
            component=self.component,
            message=message,
            data=data,
            session_id=getattr(self._local, 'session_id', None),
            correlation_id=getattr(self._local, 'correlation_id', None)
        )
    
    def debug(self, message: str, data: Optional[Dict[str, Any]] = None):
        """Log debug message"""
        entry = self._create_log_entry(LogLevel.DEBUG, message, data)
        self.logger.debug(json.dumps(asdict(entry)))
    
    def info(self, message: str, data: Optional[Dict[str, Any]] = None):
        """Log info message"""
        entry = self._create_log_entry(LogLevel.INFO, message, data)
        self.logger.info(json.dumps(asdict(entry)))
    
    def warning(self, message: str, data: Optional[Dict[str, Any]] = None):
        """Log warning message"""
        entry = self._create_log_entry(LogLevel.WARNING, message, data)
        self.logger.warning(json.dumps(asdict(entry)))
    
    def error(self, message: str, data: Optional[Dict[str, Any]] = None):
        """Log error message"""
        entry = self._create_log_entry(LogLevel.ERROR, message, data)
        self.logger.error(json.dumps(asdict(entry)))
    
    def critical(self, message: str, data: Optional[Dict[str, Any]] = None):
        """Log critical message"""
        entry = self._create_log_entry(LogLevel.CRITICAL, message, data)
        self.logger.critical(json.dumps(asdict(entry)))
    
    def metrics(self, message: str, metrics_data: Dict[str, Any]):
        """Log metrics data"""
        entry = self._create_log_entry(LogLevel.METRICS, message, metrics_data)
        self.logger.info(json.dumps(asdict(entry)))
    
    def alert(self, message: str, alert_data: Dict[str, Any]):
        """Log alert event"""
        entry = self._create_log_entry(LogLevel.ALERT, message, alert_data)
        self.logger.error(json.dumps(asdict(entry)))

class StructuredLogFormatter(logging.Formatter):
    """Custom formatter that passes through JSON logs unchanged"""
    
    def format(self, record):
        # If the message is already JSON, pass it through
        try:
            json.loads(record.getMessage())
            return record.getMessage()
        except json.JSONDecodeError:
            # Fall back to standard formatting for non-JSON messages
            return super().format(record)

class LogRotator:
    """
    Handles log file rotation, compression, and cleanup
    Implements size-based and time-based rotation strategies
    """
    
    def __init__(self, config: LogRotationConfig):
        self.config = config
        self.rotation_lock = threading.Lock()
    
    def should_rotate(self, log_file: Path) -> bool:
        """Check if log file should be rotated"""
        if not log_file.exists():
            return False
        
        # Check file size
        file_size_mb = log_file.stat().st_size / (1024 * 1024)
        if file_size_mb >= self.config.max_file_size_mb:
            return True
        
        # Check file age
        file_age_hours = (time.time() - log_file.stat().st_mtime) / 3600
        if file_age_hours >= self.config.rotation_interval_hours:
            return True
        
        return False
    
    def rotate_log(self, log_file: Path) -> bool:
        """Rotate a log file"""
        with self.rotation_lock:
            if not log_file.exists():
                return False
            
            try:
                # Generate timestamp for rotated file
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                base_name = log_file.stem
                
                # Create rotated filename
                if self.config.compress_rotated:
                    rotated_file = log_file.parent / f"{base_name}_{timestamp}.log.gz"
                else:
                    rotated_file = log_file.parent / f"{base_name}_{timestamp}.log"
                
                # Rotate the file
                if self.config.compress_rotated:
                    self._compress_and_move(log_file, rotated_file)
                else:
                    shutil.move(str(log_file), str(rotated_file))
                
                # Clean up old rotated files
                self._cleanup_old_files(log_file.parent, base_name)
                
                return True
                
            except Exception as e:
                logging.error(f"Failed to rotate log file {log_file}: {e}")
                return False
    
    def _compress_and_move(self, source: Path, destination: Path):
        """Compress and move log file"""
        with open(source, 'rb') as f_in:
            with gzip.open(destination, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)
        
        # Remove original file
        source.unlink()
    
    def _cleanup_old_files(self, log_dir: Path, base_name: str):
        """Clean up old rotated log files"""
        # Find all rotated files for this log
        pattern = f"{base_name}_*.log*"
        rotated_files = list(log_dir.glob(pattern))
        
        # Sort by modification time (newest first)
        rotated_files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
        
        # Remove files beyond max_files limit
        for old_file in rotated_files[self.config.max_files:]:
            try:
                old_file.unlink()
            except Exception as e:
                logging.error(f"Failed to remove old log file {old_file}: {e}")
        
        # Remove files older than retention period
        cutoff_time = time.time() - (self.config.retention_days * 86400)
        for old_file in rotated_files:
            if old_file.stat().st_mtime < cutoff_time:
                try:
                    old_file.unlink()
                except Exception as e:
                    logging.error(f"Failed to remove expired log file {old_file}: {e}")

class LogAnalyzer:
    """
    Analyzes log files for patterns, errors, and insights
    Provides log-based metrics and alerting
    """
    
    def __init__(self, log_dir: str):
        self.log_dir = Path(log_dir)
        
    def analyze_logs(self, hours_back: int = 24) -> Dict[str, Any]:
        """Analyze logs from the specified time period"""
        cutoff_time = time.time() - (hours_back * 3600)
        
        analysis = {
            "time_range": {
                "start": cutoff_time,
                "end": time.time(),
                "hours": hours_back
            },
            "log_counts": {},
            "error_patterns": [],
            "performance_issues": [],
            "alert_summary": {},
            "component_health": {}
        }
        
        # Analyze all log files
        for log_file in self.log_dir.glob("*.log"):
            component_name = log_file.stem
            component_analysis = self._analyze_component_logs(log_file, cutoff_time)
            
            analysis["log_counts"][component_name] = component_analysis["counts"]
            analysis["component_health"][component_name] = component_analysis["health"]
            
            # Aggregate error patterns
            analysis["error_patterns"].extend(component_analysis["errors"])
            analysis["performance_issues"].extend(component_analysis["performance"])
        
        # Analyze rotated/compressed logs
        for log_file in self.log_dir.glob("*.log.gz"):
            self._analyze_compressed_logs(log_file, cutoff_time, analysis)
        
        return analysis
    
    def _analyze_component_logs(self, log_file: Path, cutoff_time: float) -> Dict[str, Any]:
        """Analyze logs for a specific component"""
        counts = {level.value: 0 for level in LogLevel}
        errors = []
        performance_issues = []
        
        try:
            with open(log_file, 'r') as f:
                for line in f:
                    try:
                        log_entry = json.loads(line.strip())
                        
                        # Skip entries outside time range
                        if log_entry.get('timestamp', 0) < cutoff_time:
                            continue
                        
                        level = log_entry.get('level', 'INFO')
                        counts[level] = counts.get(level, 0) + 1
                        
                        # Detect error patterns
                        if level in ['ERROR', 'CRITICAL']:
                            errors.append({
                                "timestamp": log_entry.get('timestamp'),
                                "message": log_entry.get('message'),
                                "component": log_entry.get('component'),
                                "data": log_entry.get('data')
                            })
                        
                        # Detect performance issues
                        if level == 'METRICS':
                            self._check_performance_metrics(log_entry, performance_issues)
                        
                    except json.JSONDecodeError:
                        # Skip non-JSON lines
                        continue
                        
        except Exception as e:
            logging.error(f"Failed to analyze log file {log_file}: {e}")
        
        # Calculate component health score
        total_logs = sum(counts.values())
        error_rate = (counts.get('ERROR', 0) + counts.get('CRITICAL', 0)) / max(total_logs, 1)
        health_score = max(0, 100 - (error_rate * 100))
        
        return {
            "counts": counts,
            "errors": errors,
            "performance": performance_issues,
            "health": {
                "score": health_score,
                "total_logs": total_logs,
                "error_rate": error_rate
            }
        }
    
    def _check_performance_metrics(self, log_entry: Dict[str, Any], 
                                  performance_issues: List[Dict[str, Any]]):
        """Check for performance issues in metrics logs"""
        data = log_entry.get('data', {})
        
        # Check for frame rate issues
        if 'frame_stability' in data:
            fps = data['frame_stability'].get('current_fps', 60)
            if fps < 45:  # Below acceptable threshold
                performance_issues.append({
                    "type": "low_fps",
                    "timestamp": log_entry.get('timestamp'),
                    "value": fps,
                    "component": log_entry.get('component')
                })
        
        # Check for high latency
        if 'latency' in data:
            avg_latency = data['latency'].get('average_latency_ms', 0)
            if avg_latency > 2000:  # Above acceptable threshold
                performance_issues.append({
                    "type": "high_latency",
                    "timestamp": log_entry.get('timestamp'),
                    "value": avg_latency,
                    "component": log_entry.get('component')
                })
        
        # Check for energy fidelity issues
        if 'energy_fidelity' in data:
            fidelity = data['energy_fidelity'].get('fidelity_ratio', 1.0)
            if fidelity < 0.8:  # Below acceptable threshold
                performance_issues.append({
                    "type": "low_energy_fidelity",
                    "timestamp": log_entry.get('timestamp'),
                    "value": fidelity,
                    "component": log_entry.get('component')
                })
    
    def _analyze_compressed_logs(self, log_file: Path, cutoff_time: float, 
                               analysis: Dict[str, Any]):
        """Analyze compressed log files"""
        try:
            with gzip.open(log_file, 'rt') as f:
                for line in f:
                    try:
                        log_entry = json.loads(line.strip())
                        
                        # Skip entries outside time range
                        if log_entry.get('timestamp', 0) < cutoff_time:
                            continue
                        
                        # Add to analysis (simplified for compressed logs)
                        component = log_entry.get('component', 'unknown')
                        level = log_entry.get('level', 'INFO')
                        
                        if component not in analysis["log_counts"]:
                            analysis["log_counts"][component] = {l.value: 0 for l in LogLevel}
                        
                        analysis["log_counts"][component][level] += 1
                        
                    except json.JSONDecodeError:
                        continue
                        
        except Exception as e:
            logging.error(f"Failed to analyze compressed log file {log_file}: {e}")

class LogManager:
    """
    Main log management system for WIRTHFORGE observability
    Coordinates logging, rotation, and analysis
    """
    
    def __init__(self, log_dir: str, rotation_config: Optional[LogRotationConfig] = None):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        self.rotation_config = rotation_config or LogRotationConfig()
        self.rotator = LogRotator(self.rotation_config)
        self.analyzer = LogAnalyzer(str(self.log_dir))
        
        # Component loggers
        self.loggers: Dict[str, StructuredLogger] = {}
        
        # Background rotation thread
        self.rotation_thread = None
        self.rotation_stop_event = threading.Event()
        
        # Start background rotation
        self.start_rotation_service()
    
    def get_logger(self, component: str) -> StructuredLogger:
        """Get or create logger for component"""
        if component not in self.loggers:
            self.loggers[component] = StructuredLogger(component, str(self.log_dir))
        
        return self.loggers[component]
    
    def start_rotation_service(self):
        """Start background log rotation service"""
        if self.rotation_thread and self.rotation_thread.is_alive():
            return
        
        self.rotation_stop_event.clear()
        self.rotation_thread = threading.Thread(
            target=self._rotation_worker,
            daemon=True
        )
        self.rotation_thread.start()
    
    def stop_rotation_service(self):
        """Stop background log rotation service"""
        if self.rotation_thread:
            self.rotation_stop_event.set()
            self.rotation_thread.join(timeout=5)
    
    def _rotation_worker(self):
        """Background worker for log rotation"""
        while not self.rotation_stop_event.is_set():
            try:
                # Check all log files for rotation
                for log_file in self.log_dir.glob("*.log"):
                    if self.rotator.should_rotate(log_file):
                        self.rotator.rotate_log(log_file)
                
                # Sleep for rotation check interval (every 10 minutes)
                self.rotation_stop_event.wait(600)
                
            except Exception as e:
                logging.error(f"Error in log rotation worker: {e}")
                self.rotation_stop_event.wait(60)  # Wait 1 minute before retry
    
    def force_rotation(self, component: Optional[str] = None):
        """Force rotation of log files"""
        if component:
            log_file = self.log_dir / f"{component}.log"
            if log_file.exists():
                self.rotator.rotate_log(log_file)
        else:
            # Rotate all log files
            for log_file in self.log_dir.glob("*.log"):
                self.rotator.rotate_log(log_file)
    
    def get_log_analysis(self, hours_back: int = 24) -> Dict[str, Any]:
        """Get comprehensive log analysis"""
        return self.analyzer.analyze_logs(hours_back)
    
    def get_log_statistics(self) -> Dict[str, Any]:
        """Get log file statistics"""
        stats = {
            "total_log_files": 0,
            "total_size_mb": 0,
            "components": {},
            "rotated_files": 0,
            "compressed_files": 0
        }
        
        # Analyze current log files
        for log_file in self.log_dir.glob("*.log"):
            component = log_file.stem
            size_mb = log_file.stat().st_size / (1024 * 1024)
            
            stats["total_log_files"] += 1
            stats["total_size_mb"] += size_mb
            
            stats["components"][component] = {
                "size_mb": size_mb,
                "last_modified": log_file.stat().st_mtime,
                "line_count": self._count_lines(log_file)
            }
        
        # Count rotated files
        stats["rotated_files"] = len(list(self.log_dir.glob("*_*.log")))
        stats["compressed_files"] = len(list(self.log_dir.glob("*.log.gz")))
        
        return stats
    
    def _count_lines(self, file_path: Path) -> int:
        """Count lines in a file"""
        try:
            with open(file_path, 'r') as f:
                return sum(1 for _ in f)
        except Exception:
            return 0
    
    def export_logs(self, component: Optional[str] = None, 
                   hours_back: int = 24) -> str:
        """Export logs to a compressed archive"""
        import tarfile
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        export_file = self.log_dir / f"logs_export_{timestamp}.tar.gz"
        
        cutoff_time = time.time() - (hours_back * 3600)
        
        with tarfile.open(export_file, 'w:gz') as tar:
            for log_file in self.log_dir.glob("*.log*"):
                # Filter by component if specified
                if component and not log_file.name.startswith(component):
                    continue
                
                # Filter by time if the file is old enough
                if log_file.stat().st_mtime >= cutoff_time:
                    tar.add(log_file, arcname=log_file.name)
        
        return str(export_file)
    
    def cleanup_logs(self, days_to_keep: Optional[int] = None):
        """Clean up old log files"""
        days = days_to_keep or self.rotation_config.retention_days
        cutoff_time = time.time() - (days * 86400)
        
        removed_count = 0
        
        # Clean up rotated log files
        for log_file in self.log_dir.glob("*_*.log*"):
            if log_file.stat().st_mtime < cutoff_time:
                try:
                    log_file.unlink()
                    removed_count += 1
                except Exception as e:
                    logging.error(f"Failed to remove old log file {log_file}: {e}")
        
        return removed_count


# Integration with WIRTHFORGE metrics system
class MetricsLogger:
    """Specialized logger for metrics data"""
    
    def __init__(self, log_manager: LogManager):
        self.logger = log_manager.get_logger("metrics")
        
    def log_metrics_snapshot(self, metrics: Dict[str, Any], session_id: str):
        """Log a metrics snapshot"""
        self.logger.set_context(session_id=session_id)
        self.logger.metrics("Metrics snapshot collected", metrics)
    
    def log_alert_triggered(self, alert_data: Dict[str, Any], session_id: str):
        """Log an alert event"""
        self.logger.set_context(session_id=session_id)
        self.logger.alert("Alert triggered", alert_data)
    
    def log_performance_issue(self, issue_type: str, details: Dict[str, Any], 
                            session_id: str):
        """Log a performance issue"""
        self.logger.set_context(session_id=session_id)
        self.logger.warning(f"Performance issue detected: {issue_type}", details)


if __name__ == "__main__":
    # Example usage and testing
    import tempfile
    
    # Create temporary log directory
    log_dir = tempfile.mkdtemp()
    
    # Initialize log manager
    rotation_config = LogRotationConfig(
        max_file_size_mb=1,  # Small size for testing
        max_files=3,
        compress_rotated=True,
        retention_days=7
    )
    
    log_manager = LogManager(log_dir, rotation_config)
    
    try:
        # Test component logging
        metrics_logger = log_manager.get_logger("metrics_collector")
        dashboard_logger = log_manager.get_logger("dashboard")
        
        # Log some test data
        metrics_logger.info("Metrics collection started", {
            "session_id": "test_session_123",
            "collection_interval": 1000
        })
        
        metrics_logger.metrics("Frame metrics collected", {
            "frame_stability": {
                "current_fps": 58.5,
                "frame_drops": 2
            },
            "latency": {
                "average_latency_ms": 1250
            }
        })
        
        dashboard_logger.warning("High latency detected", {
            "latency_ms": 2500,
            "threshold_ms": 2000
        })
        
        # Test metrics logger integration
        metrics_integration = MetricsLogger(log_manager)
        metrics_integration.log_metrics_snapshot({
            "frame_stability": {"current_fps": 45.2},
            "energy_fidelity": {"fidelity_ratio": 0.85}
        }, "session_456")
        
        # Get log statistics
        stats = log_manager.get_log_statistics()
        print("Log Statistics:", json.dumps(stats, indent=2))
        
        # Get log analysis
        analysis = log_manager.get_log_analysis(hours_back=1)
        print("Log Analysis:", json.dumps(analysis, indent=2))
        
        # Test log export
        export_file = log_manager.export_logs(hours_back=1)
        print(f"Logs exported to: {export_file}")
        
    finally:
        log_manager.stop_rotation_service()
        
        # Cleanup
        import shutil
        shutil.rmtree(log_dir)
