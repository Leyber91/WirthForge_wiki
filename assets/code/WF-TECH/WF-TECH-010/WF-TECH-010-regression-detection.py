#!/usr/bin/env python3
"""
WF-TECH-010 Performance Regression Detection System
WIRTHFORGE Performance & Capacity - Automated Regression Detection

This module implements comprehensive performance regression detection
with statistical analysis, alerting, and automated recovery mechanisms.
"""

import json
import sqlite3
import statistics
import time
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path
import logging
import numpy as np
from scipy import stats
import asyncio
import aiohttp
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RegressionSeverity(Enum):
    """Severity levels for performance regressions"""
    MINOR = "minor"
    MODERATE = "moderate"
    MAJOR = "major"
    CRITICAL = "critical"

class MetricType(Enum):
    """Types of performance metrics"""
    THROUGHPUT = "throughput"
    LATENCY = "latency"
    MEMORY = "memory"
    CPU = "cpu"
    GPU = "gpu"
    FRAME_RATE = "frame_rate"
    ERROR_RATE = "error_rate"

@dataclass
class PerformanceMetric:
    """Individual performance metric data point"""
    timestamp: float
    metric_type: MetricType
    value: float
    context: Dict[str, Any]
    hardware_tier: str
    test_scenario: str
    build_version: str

@dataclass
class BaselineStats:
    """Statistical baseline for performance metrics"""
    mean: float
    std_dev: float
    median: float
    p95: float
    p99: float
    sample_count: int
    confidence_interval: Tuple[float, float]
    last_updated: float

@dataclass
class RegressionAlert:
    """Performance regression alert"""
    metric_type: MetricType
    severity: RegressionSeverity
    current_value: float
    baseline_value: float
    degradation_percent: float
    statistical_significance: float
    context: Dict[str, Any]
    timestamp: float
    build_version: str

class PerformanceDatabase:
    """SQLite database for storing performance metrics and baselines"""
    
    def __init__(self, db_path: str = "performance_metrics.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize database schema"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp REAL NOT NULL,
                    metric_type TEXT NOT NULL,
                    value REAL NOT NULL,
                    context TEXT NOT NULL,
                    hardware_tier TEXT NOT NULL,
                    test_scenario TEXT NOT NULL,
                    build_version TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS baselines (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    metric_type TEXT NOT NULL,
                    hardware_tier TEXT NOT NULL,
                    test_scenario TEXT NOT NULL,
                    mean REAL NOT NULL,
                    std_dev REAL NOT NULL,
                    median REAL NOT NULL,
                    p95 REAL NOT NULL,
                    p99 REAL NOT NULL,
                    sample_count INTEGER NOT NULL,
                    confidence_lower REAL NOT NULL,
                    confidence_upper REAL NOT NULL,
                    last_updated REAL NOT NULL,
                    UNIQUE(metric_type, hardware_tier, test_scenario)
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS regression_alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    metric_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    current_value REAL NOT NULL,
                    baseline_value REAL NOT NULL,
                    degradation_percent REAL NOT NULL,
                    statistical_significance REAL NOT NULL,
                    context TEXT NOT NULL,
                    timestamp REAL NOT NULL,
                    build_version TEXT NOT NULL,
                    acknowledged BOOLEAN DEFAULT FALSE,
                    resolved BOOLEAN DEFAULT FALSE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.execute("CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_metrics_type_tier ON metrics(metric_type, hardware_tier)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON regression_alerts(timestamp)")
    
    def store_metric(self, metric: PerformanceMetric):
        """Store a performance metric"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO metrics (timestamp, metric_type, value, context, 
                                   hardware_tier, test_scenario, build_version)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                metric.timestamp,
                metric.metric_type.value,
                metric.value,
                json.dumps(metric.context),
                metric.hardware_tier,
                metric.test_scenario,
                metric.build_version
            ))
    
    def get_metrics(self, metric_type: MetricType, hardware_tier: str, 
                   test_scenario: str, days_back: int = 30) -> List[PerformanceMetric]:
        """Retrieve metrics for baseline calculation"""
        cutoff_time = time.time() - (days_back * 24 * 3600)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT timestamp, metric_type, value, context, hardware_tier, 
                       test_scenario, build_version
                FROM metrics
                WHERE metric_type = ? AND hardware_tier = ? AND test_scenario = ?
                  AND timestamp > ?
                ORDER BY timestamp DESC
            """, (metric_type.value, hardware_tier, test_scenario, cutoff_time))
            
            metrics = []
            for row in cursor.fetchall():
                metrics.append(PerformanceMetric(
                    timestamp=row[0],
                    metric_type=MetricType(row[1]),
                    value=row[2],
                    context=json.loads(row[3]),
                    hardware_tier=row[4],
                    test_scenario=row[5],
                    build_version=row[6]
                ))
            
            return metrics
    
    def store_baseline(self, metric_type: MetricType, hardware_tier: str,
                      test_scenario: str, baseline: BaselineStats):
        """Store or update baseline statistics"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO baselines 
                (metric_type, hardware_tier, test_scenario, mean, std_dev, median,
                 p95, p99, sample_count, confidence_lower, confidence_upper, last_updated)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                metric_type.value, hardware_tier, test_scenario,
                baseline.mean, baseline.std_dev, baseline.median,
                baseline.p95, baseline.p99, baseline.sample_count,
                baseline.confidence_interval[0], baseline.confidence_interval[1],
                baseline.last_updated
            ))
    
    def get_baseline(self, metric_type: MetricType, hardware_tier: str,
                    test_scenario: str) -> Optional[BaselineStats]:
        """Retrieve baseline statistics"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT mean, std_dev, median, p95, p99, sample_count,
                       confidence_lower, confidence_upper, last_updated
                FROM baselines
                WHERE metric_type = ? AND hardware_tier = ? AND test_scenario = ?
            """, (metric_type.value, hardware_tier, test_scenario))
            
            row = cursor.fetchone()
            if row:
                return BaselineStats(
                    mean=row[0], std_dev=row[1], median=row[2],
                    p95=row[3], p99=row[4], sample_count=row[5],
                    confidence_interval=(row[6], row[7]),
                    last_updated=row[8]
                )
            return None
    
    def store_alert(self, alert: RegressionAlert):
        """Store regression alert"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO regression_alerts 
                (metric_type, severity, current_value, baseline_value,
                 degradation_percent, statistical_significance, context,
                 timestamp, build_version)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                alert.metric_type.value, alert.severity.value,
                alert.current_value, alert.baseline_value,
                alert.degradation_percent, alert.statistical_significance,
                json.dumps(alert.context), alert.timestamp, alert.build_version
            ))

class StatisticalAnalyzer:
    """Statistical analysis for performance regression detection"""
    
    @staticmethod
    def calculate_baseline(values: List[float], confidence_level: float = 0.95) -> BaselineStats:
        """Calculate baseline statistics from historical data"""
        if len(values) < 10:
            raise ValueError("Insufficient data for baseline calculation (minimum 10 samples)")
        
        values_array = np.array(values)
        mean = np.mean(values_array)
        std_dev = np.std(values_array, ddof=1)
        median = np.median(values_array)
        p95 = np.percentile(values_array, 95)
        p99 = np.percentile(values_array, 99)
        
        # Calculate confidence interval
        alpha = 1 - confidence_level
        t_critical = stats.t.ppf(1 - alpha/2, len(values) - 1)
        margin_error = t_critical * (std_dev / np.sqrt(len(values)))
        confidence_interval = (mean - margin_error, mean + margin_error)
        
        return BaselineStats(
            mean=mean,
            std_dev=std_dev,
            median=median,
            p95=p95,
            p99=p99,
            sample_count=len(values),
            confidence_interval=confidence_interval,
            last_updated=time.time()
        )
    
    @staticmethod
    def detect_regression(current_values: List[float], baseline: BaselineStats,
                         significance_threshold: float = 0.05) -> Tuple[bool, float, float]:
        """
        Detect performance regression using statistical tests
        Returns: (is_regression, p_value, effect_size)
        """
        if len(current_values) < 5:
            return False, 1.0, 0.0
        
        current_array = np.array(current_values)
        current_mean = np.mean(current_array)
        
        # One-sample t-test against baseline mean
        t_stat, p_value = stats.ttest_1samp(current_array, baseline.mean)
        
        # Calculate effect size (Cohen's d)
        pooled_std = np.sqrt(((len(current_values) - 1) * np.var(current_array, ddof=1) +
                             (baseline.sample_count - 1) * baseline.std_dev**2) /
                            (len(current_values) + baseline.sample_count - 2))
        effect_size = abs(current_mean - baseline.mean) / pooled_std
        
        # Check if regression is statistically significant and practically meaningful
        is_regression = (p_value < significance_threshold and 
                        current_mean < baseline.mean and  # Performance degradation
                        effect_size > 0.2)  # Small effect size threshold
        
        return is_regression, p_value, effect_size
    
    @staticmethod
    def calculate_degradation_percent(current_value: float, baseline_value: float) -> float:
        """Calculate percentage degradation from baseline"""
        if baseline_value == 0:
            return 0.0
        return ((baseline_value - current_value) / baseline_value) * 100

class RegressionDetector:
    """Main regression detection engine"""
    
    def __init__(self, db_path: str = "performance_metrics.db"):
        self.db = PerformanceDatabase(db_path)
        self.analyzer = StatisticalAnalyzer()
        self.thresholds = self._load_thresholds()
        self.alert_callbacks = []
    
    def _load_thresholds(self) -> Dict[str, Dict[str, float]]:
        """Load regression detection thresholds"""
        return {
            MetricType.THROUGHPUT.value: {
                "minor": 5.0,      # 5% degradation
                "moderate": 10.0,  # 10% degradation
                "major": 20.0,     # 20% degradation
                "critical": 30.0   # 30% degradation
            },
            MetricType.LATENCY.value: {
                "minor": 10.0,     # 10% increase
                "moderate": 20.0,  # 20% increase
                "major": 35.0,     # 35% increase
                "critical": 50.0   # 50% increase
            },
            MetricType.MEMORY.value: {
                "minor": 15.0,     # 15% increase
                "moderate": 25.0,  # 25% increase
                "major": 40.0,     # 40% increase
                "critical": 60.0   # 60% increase
            },
            MetricType.FRAME_RATE.value: {
                "minor": 5.0,      # 5% decrease
                "moderate": 10.0,  # 10% decrease
                "major": 20.0,     # 20% decrease
                "critical": 30.0   # 30% decrease
            },
            MetricType.ERROR_RATE.value: {
                "minor": 50.0,     # 50% increase
                "moderate": 100.0, # 100% increase
                "major": 200.0,    # 200% increase
                "critical": 500.0  # 500% increase
            }
        }
    
    def add_alert_callback(self, callback):
        """Add callback function for regression alerts"""
        self.alert_callbacks.append(callback)
    
    def record_metric(self, metric: PerformanceMetric):
        """Record a new performance metric"""
        self.db.store_metric(metric)
        
        # Check for immediate regression if we have enough recent data
        self._check_immediate_regression(metric)
    
    def _check_immediate_regression(self, metric: PerformanceMetric):
        """Check for regression with recent data points"""
        # Get recent metrics (last 10 data points)
        recent_metrics = self.db.get_metrics(
            metric.metric_type, metric.hardware_tier, 
            metric.test_scenario, days_back=1
        )
        
        if len(recent_metrics) < 5:
            return  # Not enough data for immediate check
        
        # Get baseline
        baseline = self.db.get_baseline(
            metric.metric_type, metric.hardware_tier, metric.test_scenario
        )
        
        if not baseline:
            return  # No baseline available
        
        # Check for regression
        recent_values = [m.value for m in recent_metrics[:10]]
        is_regression, p_value, effect_size = self.analyzer.detect_regression(
            recent_values, baseline
        )
        
        if is_regression:
            current_mean = statistics.mean(recent_values)
            degradation = self.analyzer.calculate_degradation_percent(
                current_mean, baseline.mean
            )
            
            severity = self._determine_severity(metric.metric_type, degradation)
            
            alert = RegressionAlert(
                metric_type=metric.metric_type,
                severity=severity,
                current_value=current_mean,
                baseline_value=baseline.mean,
                degradation_percent=degradation,
                statistical_significance=p_value,
                context={
                    "effect_size": effect_size,
                    "sample_size": len(recent_values),
                    "hardware_tier": metric.hardware_tier,
                    "test_scenario": metric.test_scenario
                },
                timestamp=time.time(),
                build_version=metric.build_version
            )
            
            self._handle_alert(alert)
    
    def _determine_severity(self, metric_type: MetricType, degradation_percent: float) -> RegressionSeverity:
        """Determine severity level based on degradation percentage"""
        thresholds = self.thresholds.get(metric_type.value, self.thresholds[MetricType.THROUGHPUT.value])
        
        if degradation_percent >= thresholds["critical"]:
            return RegressionSeverity.CRITICAL
        elif degradation_percent >= thresholds["major"]:
            return RegressionSeverity.MAJOR
        elif degradation_percent >= thresholds["moderate"]:
            return RegressionSeverity.MODERATE
        else:
            return RegressionSeverity.MINOR
    
    def _handle_alert(self, alert: RegressionAlert):
        """Handle regression alert"""
        # Store alert
        self.db.store_alert(alert)
        
        # Log alert
        logger.warning(f"Performance regression detected: {alert.metric_type.value} "
                      f"degraded by {alert.degradation_percent:.1f}% "
                      f"(severity: {alert.severity.value})")
        
        # Notify callbacks
        for callback in self.alert_callbacks:
            try:
                callback(alert)
            except Exception as e:
                logger.error(f"Alert callback failed: {e}")
    
    def update_baselines(self, days_back: int = 30, min_samples: int = 20):
        """Update all baselines with recent historical data"""
        # Get all unique metric combinations
        with sqlite3.connect(self.db.db_path) as conn:
            cursor = conn.execute("""
                SELECT DISTINCT metric_type, hardware_tier, test_scenario
                FROM metrics
                WHERE timestamp > ?
            """, (time.time() - days_back * 24 * 3600,))
            
            combinations = cursor.fetchall()
        
        for metric_type_str, hardware_tier, test_scenario in combinations:
            metric_type = MetricType(metric_type_str)
            metrics = self.db.get_metrics(metric_type, hardware_tier, test_scenario, days_back)
            
            if len(metrics) >= min_samples:
                values = [m.value for m in metrics]
                baseline = self.analyzer.calculate_baseline(values)
                self.db.store_baseline(metric_type, hardware_tier, test_scenario, baseline)
                
                logger.info(f"Updated baseline for {metric_type.value} "
                           f"({hardware_tier}, {test_scenario}): "
                           f"mean={baseline.mean:.2f}, samples={baseline.sample_count}")
    
    def run_regression_analysis(self, build_version: str) -> List[RegressionAlert]:
        """Run comprehensive regression analysis for a build version"""
        alerts = []
        
        # Get all baselines
        with sqlite3.connect(self.db.db_path) as conn:
            cursor = conn.execute("SELECT metric_type, hardware_tier, test_scenario FROM baselines")
            baseline_combinations = cursor.fetchall()
        
        for metric_type_str, hardware_tier, test_scenario in baseline_combinations:
            metric_type = MetricType(metric_type_str)
            baseline = self.db.get_baseline(metric_type, hardware_tier, test_scenario)
            
            if not baseline:
                continue
            
            # Get recent metrics for this build
            with sqlite3.connect(self.db.db_path) as conn:
                cursor = conn.execute("""
                    SELECT value FROM metrics
                    WHERE metric_type = ? AND hardware_tier = ? AND test_scenario = ?
                      AND build_version = ?
                    ORDER BY timestamp DESC
                    LIMIT 50
                """, (metric_type_str, hardware_tier, test_scenario, build_version))
                
                values = [row[0] for row in cursor.fetchall()]
            
            if len(values) >= 5:
                is_regression, p_value, effect_size = self.analyzer.detect_regression(values, baseline)
                
                if is_regression:
                    current_mean = statistics.mean(values)
                    degradation = self.analyzer.calculate_degradation_percent(current_mean, baseline.mean)
                    severity = self._determine_severity(metric_type, degradation)
                    
                    alert = RegressionAlert(
                        metric_type=metric_type,
                        severity=severity,
                        current_value=current_mean,
                        baseline_value=baseline.mean,
                        degradation_percent=degradation,
                        statistical_significance=p_value,
                        context={
                            "effect_size": effect_size,
                            "sample_size": len(values),
                            "hardware_tier": hardware_tier,
                            "test_scenario": test_scenario
                        },
                        timestamp=time.time(),
                        build_version=build_version
                    )
                    
                    alerts.append(alert)
                    self._handle_alert(alert)
        
        return alerts

class AlertManager:
    """Manages regression alerts and notifications"""
    
    def __init__(self, webhook_url: Optional[str] = None):
        self.webhook_url = webhook_url
        self.notification_history = []
    
    async def send_webhook_alert(self, alert: RegressionAlert):
        """Send alert via webhook"""
        if not self.webhook_url:
            return
        
        payload = {
            "type": "performance_regression",
            "severity": alert.severity.value,
            "metric": alert.metric_type.value,
            "degradation_percent": alert.degradation_percent,
            "current_value": alert.current_value,
            "baseline_value": alert.baseline_value,
            "build_version": alert.build_version,
            "timestamp": alert.timestamp,
            "context": alert.context
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(self.webhook_url, json=payload) as response:
                    if response.status == 200:
                        logger.info(f"Webhook alert sent successfully for {alert.metric_type.value}")
                    else:
                        logger.error(f"Webhook alert failed: {response.status}")
        except Exception as e:
            logger.error(f"Webhook alert error: {e}")
    
    def format_alert_message(self, alert: RegressionAlert) -> str:
        """Format alert for human-readable notification"""
        return f"""
🚨 Performance Regression Detected

Metric: {alert.metric_type.value.title()}
Severity: {alert.severity.value.upper()}
Degradation: {alert.degradation_percent:.1f}%
Current Value: {alert.current_value:.2f}
Baseline Value: {alert.baseline_value:.2f}
Build Version: {alert.build_version}
Hardware Tier: {alert.context.get('hardware_tier', 'unknown')}
Test Scenario: {alert.context.get('test_scenario', 'unknown')}
Statistical Significance: p={alert.statistical_significance:.4f}

Time: {datetime.fromtimestamp(alert.timestamp).isoformat()}
        """.strip()

# Example usage and testing
if __name__ == "__main__":
    # Initialize regression detector
    detector = RegressionDetector()
    alert_manager = AlertManager()
    
    # Add alert callback
    detector.add_alert_callback(
        lambda alert: print(alert_manager.format_alert_message(alert))
    )
    
    # Simulate some performance data
    import random
    
    # Generate baseline data (good performance)
    for i in range(50):
        metric = PerformanceMetric(
            timestamp=time.time() - (50-i) * 3600,  # Hourly data points
            metric_type=MetricType.THROUGHPUT,
            value=80 + random.gauss(0, 5),  # 80 TPS ± 5
            context={"test_run": i},
            hardware_tier="mid",
            test_scenario="standard_load",
            build_version="1.0.0"
        )
        detector.record_metric(metric)
    
    # Update baselines
    detector.update_baselines(days_back=7)
    
    # Simulate regression (degraded performance)
    for i in range(10):
        metric = PerformanceMetric(
            timestamp=time.time() - i * 60,  # Recent data
            metric_type=MetricType.THROUGHPUT,
            value=65 + random.gauss(0, 3),  # Degraded to 65 TPS
            context={"test_run": 50+i},
            hardware_tier="mid",
            test_scenario="standard_load",
            build_version="1.1.0"
        )
        detector.record_metric(metric)
    
    # Run comprehensive analysis
    alerts = detector.run_regression_analysis("1.1.0")
    print(f"\nDetected {len(alerts)} regressions")
