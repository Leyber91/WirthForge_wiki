#!/usr/bin/env python3
"""
WF-TECH-009 Metrics Accuracy Validation Tests
Golden-run replay and metrics validation system for WIRTHFORGE observability
Integrates with WF-TECH-007 testing framework for comprehensive validation
"""

import json
import time
import uuid
import sqlite3
import statistics
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
import logging
import unittest
from unittest.mock import Mock, patch
import tempfile
import shutil

# Import our metrics system
from WF_TECH_009_metrics_storage import MetricsCollector, MetricsSnapshot
from WF_TECH_009_performance_dashboard import FrameBudgetMonitor, PerformanceDashboard
from WF_TECH_009_alert_system import AlertEvaluator, AlertNotificationSystem

logger = logging.getLogger(__name__)

@dataclass
class GoldenRunScenario:
    """Golden run test scenario with expected outcomes"""
    name: str
    description: str
    duration_seconds: float
    events: List[Dict[str, Any]]
    expected_metrics: Dict[str, Any]
    tolerance_percentage: float = 5.0  # ±5% accuracy requirement from WF-TECH-007

@dataclass
class ValidationResult:
    """Validation test result"""
    test_name: str
    passed: bool
    actual_value: float
    expected_value: float
    tolerance: float
    error_percentage: float
    message: str

class MetricsOracle:
    """
    Energy oracle for metrics validation - ensures ±5% accuracy requirement
    Based on WF-TECH-007 energy truth validation principles
    """
    
    def __init__(self, tolerance_percentage: float = 5.0):
        self.tolerance_percentage = tolerance_percentage
        self.validation_results = []
        
    def validate_metric(self, test_name: str, actual: float, expected: float, 
                       custom_tolerance: Optional[float] = None) -> ValidationResult:
        """Validate a single metric against expected value"""
        tolerance = custom_tolerance or self.tolerance_percentage
        
        if expected == 0:
            # Handle zero expected values
            error_percentage = abs(actual) * 100
            passed = abs(actual) <= (tolerance / 100)
        else:
            error_percentage = abs((actual - expected) / expected) * 100
            passed = error_percentage <= tolerance
        
        result = ValidationResult(
            test_name=test_name,
            passed=passed,
            actual_value=actual,
            expected_value=expected,
            tolerance=tolerance,
            error_percentage=error_percentage,
            message=f"{'PASS' if passed else 'FAIL'}: {test_name} - "
                   f"Expected: {expected:.3f}, Actual: {actual:.3f}, "
                   f"Error: {error_percentage:.2f}% (tolerance: {tolerance}%)"
        )
        
        self.validation_results.append(result)
        return result
    
    def validate_metrics_batch(self, test_name: str, actual_metrics: Dict[str, float], 
                              expected_metrics: Dict[str, float]) -> List[ValidationResult]:
        """Validate multiple metrics at once"""
        results = []
        
        for metric_name, expected_value in expected_metrics.items():
            if metric_name in actual_metrics:
                actual_value = actual_metrics[metric_name]
                result = self.validate_metric(
                    f"{test_name}.{metric_name}",
                    actual_value,
                    expected_value
                )
                results.append(result)
            else:
                # Missing metric
                result = ValidationResult(
                    test_name=f"{test_name}.{metric_name}",
                    passed=False,
                    actual_value=0.0,
                    expected_value=expected_value,
                    tolerance=self.tolerance_percentage,
                    error_percentage=100.0,
                    message=f"FAIL: {test_name}.{metric_name} - Metric missing from actual results"
                )
                results.append(result)
        
        return results
    
    def get_validation_summary(self) -> Dict[str, Any]:
        """Get summary of all validation results"""
        if not self.validation_results:
            return {"total_tests": 0, "passed": 0, "failed": 0, "pass_rate": 0.0}
        
        passed = sum(1 for r in self.validation_results if r.passed)
        failed = len(self.validation_results) - passed
        pass_rate = (passed / len(self.validation_results)) * 100
        
        return {
            "total_tests": len(self.validation_results),
            "passed": passed,
            "failed": failed,
            "pass_rate": pass_rate,
            "results": [asdict(r) for r in self.validation_results]
        }

class GoldenRunRecorder:
    """Records golden run scenarios for deterministic replay testing"""
    
    def __init__(self, output_dir: str = "golden_runs"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        self.recording = False
        self.current_scenario = None
        self.recorded_events = []
        
    def start_recording(self, scenario_name: str, description: str):
        """Start recording a golden run scenario"""
        self.recording = True
        self.current_scenario = {
            "name": scenario_name,
            "description": description,
            "start_time": time.time(),
            "events": []
        }
        self.recorded_events = []
        logger.info(f"Started recording golden run: {scenario_name}")
    
    def record_event(self, event_type: str, data: Dict[str, Any]):
        """Record an event during golden run"""
        if not self.recording:
            return
        
        event = {
            "timestamp": time.time() - self.current_scenario["start_time"],
            "type": event_type,
            "data": data
        }
        self.recorded_events.append(event)
    
    def stop_recording(self, expected_metrics: Dict[str, Any]) -> str:
        """Stop recording and save golden run scenario"""
        if not self.recording:
            return ""
        
        self.recording = False
        
        scenario = GoldenRunScenario(
            name=self.current_scenario["name"],
            description=self.current_scenario["description"],
            duration_seconds=time.time() - self.current_scenario["start_time"],
            events=self.recorded_events,
            expected_metrics=expected_metrics
        )
        
        # Save to file
        filename = f"{scenario.name.replace(' ', '_').lower()}.json"
        filepath = self.output_dir / filename
        
        with open(filepath, 'w') as f:
            json.dump(asdict(scenario), f, indent=2)
        
        logger.info(f"Saved golden run scenario: {filepath}")
        return str(filepath)
    
    def load_scenario(self, filepath: str) -> GoldenRunScenario:
        """Load a golden run scenario from file"""
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        return GoldenRunScenario(**data)

class MetricsValidationTestSuite:
    """
    Comprehensive metrics validation test suite
    Implements deterministic testing with golden-run replay
    """
    
    def __init__(self, temp_dir: Optional[str] = None):
        self.temp_dir = temp_dir or tempfile.mkdtemp()
        self.oracle = MetricsOracle()
        self.recorder = GoldenRunRecorder()
        
        # Test database
        self.test_db_path = Path(self.temp_dir) / "test_metrics.db"
        
        logger.info(f"MetricsValidationTestSuite initialized in {self.temp_dir}")
    
    def cleanup(self):
        """Clean up test resources"""
        if Path(self.temp_dir).exists():
            shutil.rmtree(self.temp_dir)
    
    def test_frame_timing_accuracy(self) -> List[ValidationResult]:
        """Test frame timing measurement accuracy"""
        results = []
        
        # Create test monitor
        monitor = FrameBudgetMonitor(target_fps=60.0)
        
        # Test precise timing
        test_cases = [
            {"name": "perfect_frame", "sleep_time": 0.01667, "expected_fps": 60.0},
            {"name": "slow_frame", "sleep_time": 0.025, "expected_fps": 40.0},
            {"name": "fast_frame", "sleep_time": 0.010, "expected_fps": 100.0}
        ]
        
        for case in test_cases:
            frame_id = monitor.start_frame()
            time.sleep(case["sleep_time"])
            metrics = monitor.end_frame()
            
            # Validate FPS calculation
            result = self.oracle.validate_metric(
                f"frame_timing.{case['name']}.fps",
                metrics.fps,
                case["expected_fps"],
                custom_tolerance=10.0  # Allow 10% tolerance for timing
            )
            results.append(result)
            
            # Validate frame duration
            expected_duration = case["sleep_time"] * 1000  # Convert to ms
            result = self.oracle.validate_metric(
                f"frame_timing.{case['name']}.duration",
                metrics.duration_ms,
                expected_duration,
                custom_tolerance=15.0  # Allow 15% tolerance for sleep precision
            )
            results.append(result)
        
        return results
    
    def test_latency_measurement_accuracy(self) -> List[ValidationResult]:
        """Test latency measurement accuracy"""
        results = []
        
        # Create test collector
        collector = MetricsCollector(db_path=str(self.test_db_path))
        
        # Simulate known latencies
        test_latencies = [500, 800, 1200, 1500, 2000]  # milliseconds
        
        for latency_ms in test_latencies:
            collector.record_latency(latency_ms)
        
        # Get metrics and validate
        current_metrics = collector.get_current_metrics()
        latency_metrics = current_metrics["metrics"]["latency"]
        
        # Validate average latency
        expected_avg = statistics.mean(test_latencies)
        result = self.oracle.validate_metric(
            "latency.average_accuracy",
            latency_metrics["average_latency_ms"],
            expected_avg
        )
        results.append(result)
        
        # Validate P95 latency
        expected_p95 = statistics.quantiles(test_latencies, n=20)[18]
        result = self.oracle.validate_metric(
            "latency.p95_accuracy",
            latency_metrics["p95_latency_ms"],
            expected_p95
        )
        results.append(result)
        
        collector.stop_collection()
        return results
    
    def test_energy_fidelity_calculation(self) -> List[ValidationResult]:
        """Test energy fidelity calculation accuracy"""
        results = []
        
        collector = MetricsCollector(db_path=str(self.test_db_path))
        
        # Test known energy samples
        test_cases = [
            {"visual": 1000, "computed": 1000, "expected_fidelity": 1.0},
            {"visual": 900, "computed": 1000, "expected_fidelity": 0.9},
            {"visual": 800, "computed": 1000, "expected_fidelity": 0.8},
            {"visual": 1100, "computed": 1000, "expected_fidelity": 1.0}  # Capped at 1.0
        ]
        
        for i, case in enumerate(test_cases):
            collector.record_energy_sample(case["visual"], case["computed"])
            
            # Get current metrics
            current_metrics = collector.get_current_metrics()
            energy_metrics = current_metrics["metrics"]["energy_fidelity"]
            
            result = self.oracle.validate_metric(
                f"energy_fidelity.case_{i}",
                energy_metrics["fidelity_ratio"],
                case["expected_fidelity"]
            )
            results.append(result)
        
        collector.stop_collection()
        return results
    
    def test_alert_threshold_accuracy(self) -> List[ValidationResult]:
        """Test alert threshold evaluation accuracy"""
        results = []
        
        # Create test evaluator with known thresholds
        evaluator = AlertEvaluator()
        
        # Test FPS alert
        test_metrics = {
            "frame_stability": {
                "current_fps": 40.0  # Below 45 threshold
            }
        }
        
        evaluator.evaluate_metrics(test_metrics)
        active_alerts = evaluator.get_active_alerts()
        
        # Should trigger fps_critical alert
        fps_alert_triggered = any(
            "fps" in alert.rule_name.lower() and alert.severity == "critical"
            for alert in active_alerts
        )
        
        result = self.oracle.validate_metric(
            "alert.fps_critical_trigger",
            1.0 if fps_alert_triggered else 0.0,
            1.0  # Expected to trigger
        )
        results.append(result)
        
        return results
    
    def test_golden_run_replay(self, scenario_file: str) -> List[ValidationResult]:
        """Test golden run scenario replay"""
        results = []
        
        # Load scenario
        scenario = self.recorder.load_scenario(scenario_file)
        
        # Set up test environment
        collector = MetricsCollector(db_path=str(self.test_db_path))
        collector.start_collection()
        
        try:
            # Replay events
            start_time = time.time()
            for event in scenario.events:
                # Wait for event timestamp
                target_time = start_time + event["timestamp"]
                current_time = time.time()
                if target_time > current_time:
                    time.sleep(target_time - current_time)
                
                # Execute event
                self._execute_replay_event(collector, event)
            
            # Wait for final metrics collection
            time.sleep(1.0)
            
            # Get final metrics
            final_metrics = collector.get_current_metrics()
            
            # Validate against expected metrics
            results.extend(self.oracle.validate_metrics_batch(
                f"golden_run.{scenario.name}",
                self._flatten_metrics(final_metrics["metrics"]),
                scenario.expected_metrics
            ))
            
        finally:
            collector.stop_collection()
        
        return results
    
    def _execute_replay_event(self, collector: MetricsCollector, event: Dict[str, Any]):
        """Execute a single replay event"""
        event_type = event["type"]
        data = event["data"]
        
        if event_type == "frame_timing":
            collector.record_frame_time(data["frame_time_ms"])
        elif event_type == "latency":
            collector.record_latency(data["latency_ms"])
        elif event_type == "error":
            collector.record_error(data["error_type"])
        elif event_type == "energy_sample":
            collector.record_energy_sample(data["visual_energy"], data["computed_energy"])
    
    def _flatten_metrics(self, metrics: Dict[str, Any], prefix: str = "") -> Dict[str, float]:
        """Flatten nested metrics for validation"""
        flat = {}
        
        for key, value in metrics.items():
            full_key = f"{prefix}.{key}" if prefix else key
            
            if isinstance(value, dict):
                flat.update(self._flatten_metrics(value, full_key))
            elif isinstance(value, (int, float)):
                flat[full_key] = float(value)
        
        return flat
    
    def run_comprehensive_validation(self) -> Dict[str, Any]:
        """Run all validation tests"""
        all_results = []
        
        logger.info("Starting comprehensive metrics validation...")
        
        # Frame timing tests
        logger.info("Testing frame timing accuracy...")
        all_results.extend(self.test_frame_timing_accuracy())
        
        # Latency measurement tests
        logger.info("Testing latency measurement accuracy...")
        all_results.extend(self.test_latency_measurement_accuracy())
        
        # Energy fidelity tests
        logger.info("Testing energy fidelity calculation...")
        all_results.extend(self.test_energy_fidelity_calculation())
        
        # Alert threshold tests
        logger.info("Testing alert threshold accuracy...")
        all_results.extend(self.test_alert_threshold_accuracy())
        
        # Update oracle results
        self.oracle.validation_results = all_results
        
        # Generate summary
        summary = self.oracle.get_validation_summary()
        
        logger.info(f"Validation complete: {summary['passed']}/{summary['total_tests']} tests passed "
                   f"({summary['pass_rate']:.1f}%)")
        
        return summary

class PerformanceRegressionDetector:
    """Detects performance regressions using historical baselines"""
    
    def __init__(self, baseline_db_path: str):
        self.baseline_db_path = baseline_db_path
        self.regression_threshold = 10.0  # 10% performance degradation
        
    def establish_baseline(self, metrics: Dict[str, Any], version: str):
        """Establish performance baseline for a version"""
        with sqlite3.connect(self.baseline_db_path) as conn:
            cursor = conn.cursor()
            
            # Create baseline table if not exists
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS performance_baselines (
                    version TEXT PRIMARY KEY,
                    metrics_json TEXT NOT NULL,
                    established_at REAL NOT NULL
                )
            """)
            
            cursor.execute("""
                INSERT OR REPLACE INTO performance_baselines 
                (version, metrics_json, established_at)
                VALUES (?, ?, ?)
            """, (version, json.dumps(metrics), time.time()))
            
            conn.commit()
    
    def detect_regressions(self, current_metrics: Dict[str, Any], 
                          baseline_version: str) -> List[Dict[str, Any]]:
        """Detect performance regressions against baseline"""
        regressions = []
        
        with sqlite3.connect(self.baseline_db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT metrics_json FROM performance_baselines 
                WHERE version = ?
            """, (baseline_version,))
            
            row = cursor.fetchone()
            if not row:
                return [{"error": f"No baseline found for version {baseline_version}"}]
            
            baseline_metrics = json.loads(row[0])
        
        # Compare key performance metrics
        key_metrics = [
            "frame_stability.average_fps",
            "latency.p95_latency_ms",
            "energy_fidelity.fidelity_percentage",
            "resource_utilization.cpu_usage_percentage"
        ]
        
        flat_current = self._flatten_metrics(current_metrics)
        flat_baseline = self._flatten_metrics(baseline_metrics)
        
        for metric_path in key_metrics:
            if metric_path in flat_current and metric_path in flat_baseline:
                current_value = flat_current[metric_path]
                baseline_value = flat_baseline[metric_path]
                
                # Calculate regression (negative change for performance metrics)
                if baseline_value != 0:
                    change_percentage = ((current_value - baseline_value) / baseline_value) * 100
                    
                    # Determine if this is a regression based on metric type
                    is_regression = False
                    if "fps" in metric_path or "fidelity" in metric_path:
                        # Higher is better
                        is_regression = change_percentage < -self.regression_threshold
                    else:
                        # Lower is better (latency, CPU usage)
                        is_regression = change_percentage > self.regression_threshold
                    
                    if is_regression:
                        regressions.append({
                            "metric": metric_path,
                            "baseline_value": baseline_value,
                            "current_value": current_value,
                            "change_percentage": change_percentage,
                            "severity": "critical" if abs(change_percentage) > 20 else "warning"
                        })
        
        return regressions
    
    def _flatten_metrics(self, metrics: Dict[str, Any], prefix: str = "") -> Dict[str, float]:
        """Flatten nested metrics dictionary"""
        flat = {}
        
        for key, value in metrics.items():
            full_key = f"{prefix}.{key}" if prefix else key
            
            if isinstance(value, dict):
                flat.update(self._flatten_metrics(value, full_key))
            elif isinstance(value, (int, float)):
                flat[full_key] = float(value)
        
        return flat


# Unit tests using unittest framework
class TestMetricsValidation(unittest.TestCase):
    """Unit tests for metrics validation system"""
    
    def setUp(self):
        self.test_suite = MetricsValidationTestSuite()
    
    def tearDown(self):
        self.test_suite.cleanup()
    
    def test_oracle_accuracy_validation(self):
        """Test metrics oracle validation accuracy"""
        oracle = MetricsOracle(tolerance_percentage=5.0)
        
        # Test passing validation
        result = oracle.validate_metric("test_pass", 100.0, 102.0)
        self.assertTrue(result.passed)
        self.assertLess(result.error_percentage, 5.0)
        
        # Test failing validation
        result = oracle.validate_metric("test_fail", 100.0, 120.0)
        self.assertFalse(result.passed)
        self.assertGreater(result.error_percentage, 5.0)
    
    def test_frame_timing_validation(self):
        """Test frame timing validation"""
        results = self.test_suite.test_frame_timing_accuracy()
        
        # Should have results for all test cases
        self.assertGreater(len(results), 0)
        
        # At least some tests should pass (timing precision varies)
        passed_tests = sum(1 for r in results if r.passed)
        self.assertGreater(passed_tests, 0)
    
    def test_energy_fidelity_validation(self):
        """Test energy fidelity calculation validation"""
        results = self.test_suite.test_energy_fidelity_calculation()
        
        # Should have results for all test cases
        self.assertEqual(len(results), 4)
        
        # All energy fidelity calculations should be accurate
        passed_tests = sum(1 for r in results if r.passed)
        self.assertEqual(passed_tests, 4)


def create_sample_golden_run():
    """Create a sample golden run scenario for testing"""
    recorder = GoldenRunRecorder()
    
    recorder.start_recording(
        "stable_performance",
        "60 FPS stable performance with consistent latency"
    )
    
    # Simulate stable performance events
    for i in range(60):  # 1 second at 60 FPS
        recorder.record_event("frame_timing", {"frame_time_ms": 16.67})
        recorder.record_event("latency", {"latency_ms": 1000})
        recorder.record_event("energy_sample", {
            "visual_energy": 100,
            "computed_energy": 100
        })
        time.sleep(0.01)  # Small delay between events
    
    # Define expected metrics
    expected_metrics = {
        "frame_stability.average_fps": 60.0,
        "latency.average_latency_ms": 1000.0,
        "energy_fidelity.fidelity_ratio": 1.0
    }
    
    scenario_file = recorder.stop_recording(expected_metrics)
    return scenario_file


if __name__ == "__main__":
    # Run validation tests
    test_suite = MetricsValidationTestSuite()
    
    try:
        # Run comprehensive validation
        summary = test_suite.run_comprehensive_validation()
        
        print("=== METRICS VALIDATION SUMMARY ===")
        print(f"Total Tests: {summary['total_tests']}")
        print(f"Passed: {summary['passed']}")
        print(f"Failed: {summary['failed']}")
        print(f"Pass Rate: {summary['pass_rate']:.1f}%")
        
        # Show failed tests
        failed_tests = [r for r in summary['results'] if not r['passed']]
        if failed_tests:
            print("\n=== FAILED TESTS ===")
            for test in failed_tests:
                print(f"❌ {test['message']}")
        
        # Create and test golden run
        print("\n=== GOLDEN RUN TEST ===")
        scenario_file = create_sample_golden_run()
        golden_results = test_suite.test_golden_run_replay(scenario_file)
        
        golden_passed = sum(1 for r in golden_results if r.passed)
        print(f"Golden Run: {golden_passed}/{len(golden_results)} tests passed")
        
        # Run unit tests
        print("\n=== UNIT TESTS ===")
        unittest.main(argv=[''], exit=False, verbosity=2)
        
    finally:
        test_suite.cleanup()
