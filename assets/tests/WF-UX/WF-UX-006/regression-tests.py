"""
WF-UX-006 Regression Tests
Performance regression detection and validation tests for WIRTHFORGE
"""

import time
import json
import statistics
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import unittest
import logging
import os

class RegressionSeverity(Enum):
    """Severity levels for performance regressions"""
    MINOR = "minor"          # 5-10% degradation
    MODERATE = "moderate"    # 10-25% degradation
    MAJOR = "major"         # 25-50% degradation
    CRITICAL = "critical"   # >50% degradation

@dataclass
class RegressionTest:
    """Individual regression test definition"""
    name: str
    description: str
    test_function: str
    baseline_value: float
    tolerance_percent: float
    critical_threshold_percent: float
    metric_name: str
    higher_is_better: bool = True

@dataclass
class RegressionResult:
    """Regression test result"""
    test_name: str
    baseline_value: float
    current_value: float
    change_percent: float
    severity: RegressionSeverity
    passed: bool
    metric_name: str
    notes: str = ""

@dataclass
class RegressionSuite:
    """Complete regression test suite results"""
    suite_name: str
    timestamp: float
    baseline_timestamp: float
    total_tests: int
    passed_tests: int
    regressions_detected: int
    results: List[RegressionResult]
    summary: Dict[str, Any]

class PerformanceRegressionTests:
    """
    Performance regression testing suite
    Detects performance degradations by comparing against baseline metrics
    """
    
    def __init__(self, baseline_file: str):
        """
        Initialize regression test suite
        
        Args:
            baseline_file: Path to baseline performance data
        """
        self.baseline_file = baseline_file
        self.baseline_data: Dict[str, float] = {}
        self.baseline_timestamp = 0.0
        
        # Test definitions
        self.regression_tests = self._define_regression_tests()
        
        # Results
        self.results: List[RegressionResult] = []
        
        # Logger
        self.logger = logging.getLogger(__name__)
        
        # Load baseline data
        self._load_baseline()
    
    def _define_regression_tests(self) -> List[RegressionTest]:
        """Define regression tests to run"""
        return [
            RegressionTest(
                name="frame_time_regression",
                description="Frame time should not increase significantly",
                test_function="test_frame_time_performance",
                baseline_value=0.0,  # Will be loaded from baseline
                tolerance_percent=10.0,
                critical_threshold_percent=25.0,
                metric_name="avg_frame_time_ms",
                higher_is_better=False
            ),
            RegressionTest(
                name="fps_regression",
                description="FPS should not decrease significantly",
                test_function="test_fps_performance",
                baseline_value=0.0,
                tolerance_percent=5.0,
                critical_threshold_percent=15.0,
                metric_name="actual_fps",
                higher_is_better=True
            ),
            RegressionTest(
                name="cpu_efficiency_regression",
                description="CPU efficiency should not degrade",
                test_function="test_cpu_efficiency",
                baseline_value=0.0,
                tolerance_percent=15.0,
                critical_threshold_percent=30.0,
                metric_name="cpu_efficiency_score",
                higher_is_better=True
            ),
            RegressionTest(
                name="memory_usage_regression",
                description="Memory usage should not increase significantly",
                test_function="test_memory_usage",
                baseline_value=0.0,
                tolerance_percent=20.0,
                critical_threshold_percent=40.0,
                metric_name="peak_memory_mb",
                higher_is_better=False
            ),
            RegressionTest(
                name="adaptation_speed_regression",
                description="Adaptation speed should not slow down",
                test_function="test_adaptation_speed",
                baseline_value=0.0,
                tolerance_percent=25.0,
                critical_threshold_percent=50.0,
                metric_name="adaptation_time_ms",
                higher_is_better=False
            ),
            RegressionTest(
                name="plugin_overhead_regression",
                description="Plugin overhead should not increase",
                test_function="test_plugin_overhead",
                baseline_value=0.0,
                tolerance_percent=20.0,
                critical_threshold_percent=35.0,
                metric_name="plugin_overhead_ms",
                higher_is_better=False
            )
        ]
    
    def _load_baseline(self) -> None:
        """Load baseline performance data"""
        if not os.path.exists(self.baseline_file):
            self.logger.error(f"Baseline file not found: {self.baseline_file}")
            return
        
        try:
            with open(self.baseline_file, 'r') as f:
                baseline_suite = json.load(f)
            
            self.baseline_timestamp = baseline_suite.get("timestamp", 0.0)
            
            # Extract baseline values from results
            for result in baseline_suite.get("results", []):
                result_name = result.get("name", "")
                metrics = result.get("metrics", {})
                
                # Map result names to test metrics
                if result_name == "basic_frame_timing":
                    self.baseline_data["avg_frame_time_ms"] = metrics.get("avg_frame_time_ms", 0.0)
                elif result_name == "sustained_frame_rate":
                    self.baseline_data["actual_fps"] = metrics.get("actual_fps", 0.0)
                elif result_name == "cpu_utilization_efficiency":
                    self.baseline_data["cpu_efficiency_score"] = result.get("performance_score", 0.0)
                elif result_name == "memory_allocation_performance":
                    self.baseline_data["peak_memory_mb"] = metrics.get("peak_memory_mb", 0.0)
                elif result_name == "adaptation_response_time":
                    self.baseline_data["adaptation_time_ms"] = metrics.get("total_adaptation_time_ms", 0.0)
            
            # Update test baseline values
            for test in self.regression_tests:
                if test.metric_name in self.baseline_data:
                    test.baseline_value = self.baseline_data[test.metric_name]
            
            self.logger.info(f"Loaded baseline data from {self.baseline_file}")
            
        except Exception as e:
            self.logger.error(f"Failed to load baseline: {e}")
    
    def run_regression_tests(self, current_results_file: str) -> RegressionSuite:
        """
        Run regression tests against current performance data
        
        Args:
            current_results_file: Path to current performance results
            
        Returns:
            Regression test suite results
        """
        start_time = time.time()
        self.results = []
        
        self.logger.info("Starting performance regression tests")
        
        # Load current results
        current_data = self._load_current_results(current_results_file)
        if not current_data:
            return self._create_empty_suite(start_time)
        
        # Run each regression test
        for test in self.regression_tests:
            if test.baseline_value == 0.0:
                self.logger.warning(f"No baseline data for test: {test.name}")
                continue
            
            current_value = current_data.get(test.metric_name)
            if current_value is None:
                self.logger.warning(f"No current data for metric: {test.metric_name}")
                continue
            
            result = self._evaluate_regression(test, current_value)
            self.results.append(result)
        
        # Create suite summary
        passed_tests = sum(1 for r in self.results if r.passed)
        regressions = sum(1 for r in self.results if not r.passed)
        
        suite = RegressionSuite(
            suite_name="WF-UX-006 Regression Tests",
            timestamp=start_time,
            baseline_timestamp=self.baseline_timestamp,
            total_tests=len(self.results),
            passed_tests=passed_tests,
            regressions_detected=regressions,
            results=self.results,
            summary=self._create_summary()
        )
        
        self.logger.info(f"Regression tests completed: {regressions} regressions detected")
        return suite
    
    def _load_current_results(self, results_file: str) -> Dict[str, float]:
        """Load current performance results"""
        if not os.path.exists(results_file):
            self.logger.error(f"Current results file not found: {results_file}")
            return {}
        
        try:
            with open(results_file, 'r') as f:
                current_suite = json.load(f)
            
            current_data = {}
            
            # Extract current values from results
            for result in current_suite.get("results", []):
                result_name = result.get("name", "")
                metrics = result.get("metrics", {})
                
                # Map result names to test metrics
                if result_name == "basic_frame_timing":
                    current_data["avg_frame_time_ms"] = metrics.get("avg_frame_time_ms", 0.0)
                elif result_name == "sustained_frame_rate":
                    current_data["actual_fps"] = metrics.get("actual_fps", 0.0)
                elif result_name == "cpu_utilization_efficiency":
                    current_data["cpu_efficiency_score"] = result.get("performance_score", 0.0)
                elif result_name == "memory_allocation_performance":
                    current_data["peak_memory_mb"] = metrics.get("peak_memory_mb", 0.0)
                elif result_name == "adaptation_response_time":
                    current_data["adaptation_time_ms"] = metrics.get("total_adaptation_time_ms", 0.0)
            
            return current_data
            
        except Exception as e:
            self.logger.error(f"Failed to load current results: {e}")
            return {}
    
    def _evaluate_regression(self, test: RegressionTest, current_value: float) -> RegressionResult:
        """Evaluate a single regression test"""
        baseline_value = test.baseline_value
        
        # Calculate percentage change
        if baseline_value == 0:
            change_percent = 0.0
        else:
            if test.higher_is_better:
                # For metrics where higher is better (FPS, efficiency)
                change_percent = ((current_value - baseline_value) / baseline_value) * 100
            else:
                # For metrics where lower is better (frame time, memory usage)
                change_percent = ((baseline_value - current_value) / baseline_value) * 100
        
        # Determine if regression occurred
        is_regression = change_percent < -test.tolerance_percent
        
        # Determine severity
        severity = self._determine_severity(change_percent, test)
        
        # Test passes if no significant regression
        passed = not is_regression
        
        # Create notes
        notes = self._create_regression_notes(test, baseline_value, current_value, change_percent)
        
        return RegressionResult(
            test_name=test.name,
            baseline_value=baseline_value,
            current_value=current_value,
            change_percent=change_percent,
            severity=severity,
            passed=passed,
            metric_name=test.metric_name,
            notes=notes
        )
    
    def _determine_severity(self, change_percent: float, test: RegressionTest) -> RegressionSeverity:
        """Determine regression severity based on change percentage"""
        if change_percent >= -test.tolerance_percent:
            return RegressionSeverity.MINOR
        elif change_percent >= -test.critical_threshold_percent:
            return RegressionSeverity.MODERATE
        elif change_percent >= -50.0:
            return RegressionSeverity.MAJOR
        else:
            return RegressionSeverity.CRITICAL
    
    def _create_regression_notes(self, test: RegressionTest, baseline: float, 
                               current: float, change_percent: float) -> str:
        """Create descriptive notes for regression result"""
        direction = "improved" if change_percent > 0 else "degraded"
        
        if test.higher_is_better:
            if change_percent > 0:
                return f"Performance improved by {change_percent:.1f}%"
            else:
                return f"Performance degraded by {abs(change_percent):.1f}%"
        else:
            if change_percent > 0:
                return f"Metric improved (reduced) by {change_percent:.1f}%"
            else:
                return f"Metric degraded (increased) by {abs(change_percent):.1f}%"
    
    def _create_summary(self) -> Dict[str, Any]:
        """Create regression test summary"""
        if not self.results:
            return {}
        
        regressions_by_severity = {
            RegressionSeverity.MINOR: 0,
            RegressionSeverity.MODERATE: 0,
            RegressionSeverity.MAJOR: 0,
            RegressionSeverity.CRITICAL: 0
        }
        
        total_change = 0.0
        worst_regression = 0.0
        best_improvement = 0.0
        
        for result in self.results:
            if not result.passed:
                regressions_by_severity[result.severity] += 1
            
            total_change += result.change_percent
            worst_regression = min(worst_regression, result.change_percent)
            best_improvement = max(best_improvement, result.change_percent)
        
        avg_change = total_change / len(self.results) if self.results else 0.0
        
        return {
            "average_change_percent": avg_change,
            "worst_regression_percent": worst_regression,
            "best_improvement_percent": best_improvement,
            "regressions_by_severity": {k.value: v for k, v in regressions_by_severity.items()},
            "total_regressions": sum(regressions_by_severity.values()),
            "regression_rate": (sum(regressions_by_severity.values()) / len(self.results)) * 100
        }
    
    def _create_empty_suite(self, start_time: float) -> RegressionSuite:
        """Create empty regression suite when no data available"""
        return RegressionSuite(
            suite_name="WF-UX-006 Regression Tests",
            timestamp=start_time,
            baseline_timestamp=self.baseline_timestamp,
            total_tests=0,
            passed_tests=0,
            regressions_detected=0,
            results=[],
            summary={"error": "No current performance data available"}
        )
    
    def generate_regression_report(self, suite: RegressionSuite, output_file: str) -> None:
        """Generate detailed regression report"""
        report = {
            "regression_test_report": {
                "suite_info": {
                    "name": suite.suite_name,
                    "timestamp": suite.timestamp,
                    "baseline_timestamp": suite.baseline_timestamp,
                    "total_tests": suite.total_tests,
                    "passed_tests": suite.passed_tests,
                    "regressions_detected": suite.regressions_detected
                },
                "summary": suite.summary,
                "detailed_results": []
            }
        }
        
        # Add detailed results
        for result in suite.results:
            report["regression_test_report"]["detailed_results"].append({
                "test_name": result.test_name,
                "metric": result.metric_name,
                "baseline_value": result.baseline_value,
                "current_value": result.current_value,
                "change_percent": result.change_percent,
                "severity": result.severity.value,
                "passed": result.passed,
                "notes": result.notes
            })
        
        # Write report
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        self.logger.info(f"Regression report saved to {output_file}")
    
    def save_results(self, suite: RegressionSuite, filename: str) -> None:
        """Save regression test results"""
        with open(filename, 'w') as f:
            json.dump(asdict(suite), f, indent=2, default=str)
        
        self.logger.info(f"Regression results saved to {filename}")

class RegressionTestRunner:
    """Test runner for automated regression testing"""
    
    def __init__(self, baseline_file: str, current_results_file: str):
        self.baseline_file = baseline_file
        self.current_results_file = current_results_file
        self.logger = logging.getLogger(__name__)
    
    def run_automated_regression_check(self) -> bool:
        """
        Run automated regression check
        
        Returns:
            True if no critical regressions detected
        """
        try:
            # Create regression test suite
            regression_tests = PerformanceRegressionTests(self.baseline_file)
            
            # Run tests
            suite = regression_tests.run_regression_tests(self.current_results_file)
            
            # Check for critical regressions
            critical_regressions = [
                r for r in suite.results 
                if not r.passed and r.severity == RegressionSeverity.CRITICAL
            ]
            
            major_regressions = [
                r for r in suite.results 
                if not r.passed and r.severity == RegressionSeverity.MAJOR
            ]
            
            # Log results
            if critical_regressions:
                self.logger.error(f"CRITICAL: {len(critical_regressions)} critical regressions detected!")
                for regression in critical_regressions:
                    self.logger.error(f"  {regression.test_name}: {regression.change_percent:.1f}% degradation")
            
            if major_regressions:
                self.logger.warning(f"WARNING: {len(major_regressions)} major regressions detected")
                for regression in major_regressions:
                    self.logger.warning(f"  {regression.test_name}: {regression.change_percent:.1f}% degradation")
            
            # Generate report
            report_file = f"regression_report_{int(time.time())}.json"
            regression_tests.generate_regression_report(suite, report_file)
            
            # Return success if no critical regressions
            return len(critical_regressions) == 0
            
        except Exception as e:
            self.logger.error(f"Regression test failed: {e}")
            return False

# Example usage
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # Example baseline and current results files
    baseline_file = "baseline_results.json"
    current_file = "current_results.json"
    
    if os.path.exists(baseline_file) and os.path.exists(current_file):
        # Run regression tests
        regression_tests = PerformanceRegressionTests(baseline_file)
        suite = regression_tests.run_regression_tests(current_file)
        
        print(f"Regression Test Suite: {suite.suite_name}")
        print(f"Total Tests: {suite.total_tests}")
        print(f"Passed: {suite.passed_tests}")
        print(f"Regressions: {suite.regressions_detected}")
        
        if suite.summary:
            print(f"Average Change: {suite.summary.get('average_change_percent', 0):.1f}%")
            print(f"Worst Regression: {suite.summary.get('worst_regression_percent', 0):.1f}%")
        
        print("\nDetailed Results:")
        for result in suite.results:
            status = "PASS" if result.passed else f"FAIL ({result.severity.value})"
            print(f"  {result.test_name}: {status} ({result.change_percent:+.1f}%)")
        
        # Save results
        regression_tests.save_results(suite, "regression_results.json")
        regression_tests.generate_regression_report(suite, "regression_report.json")
    else:
        print("Baseline or current results file not found")
        print("Please run performance benchmarks first to generate baseline data")
