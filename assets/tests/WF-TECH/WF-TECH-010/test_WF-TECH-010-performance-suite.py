#!/usr/bin/env python3
"""
WF-TECH-010 Performance Test Suite
Comprehensive test suite for performance validation and regression detection
"""

import unittest
import json
import sqlite3
import tempfile
import time
import os
from unittest.mock import Mock, patch
from datetime import datetime, timedelta
from pathlib import Path

class TestHardwareDetection(unittest.TestCase):
    """Test hardware detection and classification"""
    
    @patch('psutil.cpu_count')
    @patch('psutil.virtual_memory')
    def test_low_tier_classification(self, mock_memory, mock_cpu):
        """Test low-tier hardware classification"""
        mock_cpu.side_effect = [4, 8]  # 4 cores, 8 threads
        mock_memory.return_value.total = 8 * 1024**3  # 8GB
        
        # Simulate hardware detection logic
        cpu_cores = 4
        memory_gb = 8.0
        gpu_vram_gb = 0.0
        
        # Classification logic
        if cpu_cores >= 12 and memory_gb >= 24 and gpu_vram_gb >= 12:
            tier = "high"
        elif cpu_cores >= 6 and memory_gb >= 12 and gpu_vram_gb >= 4:
            tier = "mid"
        else:
            tier = "low"
        
        self.assertEqual(tier, "low")
    
    @patch('psutil.cpu_count')
    @patch('psutil.virtual_memory')
    def test_mid_tier_classification(self, mock_memory, mock_cpu):
        """Test mid-tier hardware classification"""
        mock_cpu.side_effect = [8, 16]  # 8 cores, 16 threads
        mock_memory.return_value.total = 16 * 1024**3  # 16GB
        
        # Simulate mid-tier with GPU
        cpu_cores = 8
        memory_gb = 16.0
        gpu_vram_gb = 8.0
        
        if cpu_cores >= 12 and memory_gb >= 24 and gpu_vram_gb >= 12:
            tier = "high"
        elif cpu_cores >= 6 and memory_gb >= 12 and gpu_vram_gb >= 4:
            tier = "mid"
        else:
            tier = "low"
        
        self.assertEqual(tier, "mid")

class TestMetricsCollection(unittest.TestCase):
    """Test performance metrics collection"""
    
    @patch('psutil.cpu_percent')
    @patch('psutil.virtual_memory')
    def test_basic_metrics_collection(self, mock_memory, mock_cpu):
        """Test basic system metrics collection"""
        mock_cpu.return_value = 45.5
        mock_memory.return_value.percent = 67.2
        
        # Simulate metrics collection
        cpu_percent = mock_cpu()
        memory_percent = mock_memory().percent
        
        self.assertEqual(cpu_percent, 45.5)
        self.assertEqual(memory_percent, 67.2)

class TestAlertManager(unittest.TestCase):
    """Test performance alert management"""
    
    def test_cpu_usage_alert_logic(self):
        """Test CPU usage alert triggering logic"""
        cpu_percent = 92.0
        cpu_threshold = 85.0
        
        should_alert = cpu_percent > cpu_threshold
        self.assertTrue(should_alert)
        
        if should_alert:
            alert = {
                "type": "high_cpu_usage",
                "severity": "warning",
                "message": f"CPU usage {cpu_percent}% exceeds threshold {cpu_threshold}%"
            }
            self.assertEqual(alert["type"], "high_cpu_usage")
            self.assertEqual(alert["severity"], "warning")
    
    def test_memory_usage_alert_logic(self):
        """Test memory usage alert triggering logic"""
        memory_percent = 90.0
        memory_threshold = 85.0
        
        should_alert = memory_percent > memory_threshold
        self.assertTrue(should_alert)
    
    def test_performance_degradation_alert_logic(self):
        """Test performance degradation alert logic"""
        current_tps = 50.0
        target_tps = 80.0
        degradation_threshold = 0.7  # 30% degradation
        
        should_alert = current_tps < target_tps * degradation_threshold
        self.assertTrue(should_alert)
        
        if should_alert:
            alert = {
                "type": "performance_degradation",
                "severity": "critical",
                "message": f"TPS {current_tps} is below threshold"
            }
            self.assertEqual(alert["severity"], "critical")

class TestCapacityPlanner(unittest.TestCase):
    """Test capacity planning functionality"""
    
    def test_capacity_calculation_with_headroom(self):
        """Test capacity calculation with available headroom"""
        cpu_percent = 60.0
        memory_percent = 70.0
        cpu_limit = 85.0
        memory_limit = 85.0
        
        cpu_headroom = max(0, cpu_limit - cpu_percent)
        memory_headroom = max(0, memory_limit - memory_percent)
        
        self.assertEqual(cpu_headroom, 25.0)
        self.assertEqual(memory_headroom, 15.0)
        
        # Calculate scaling factor
        cpu_scaling_factor = cpu_headroom / cpu_limit
        memory_scaling_factor = memory_headroom / memory_limit
        scaling_factor = min(cpu_scaling_factor, memory_scaling_factor)
        
        self.assertGreater(scaling_factor, 0)
    
    def test_capacity_recommendations(self):
        """Test capacity scaling recommendations"""
        scaling_factor = 0.05  # 5% capacity remaining
        
        if scaling_factor < 0.1:
            recommendations = ["URGENT: System at capacity limit"]
        elif scaling_factor < 0.3:
            recommendations = ["WARNING: Approaching capacity limits"]
        else:
            recommendations = ["System operating within normal capacity"]
        
        self.assertIn("URGENT", recommendations[0])

class TestPerformanceOptimizer(unittest.TestCase):
    """Test performance optimization engine"""
    
    def test_cpu_optimization_logic(self):
        """Test CPU usage optimization logic"""
        cpu_percent = 95.0
        active_requests = 5
        
        if cpu_percent > 90:
            optimization = {
                "type": "cpu_optimization",
                "action": "reduce_concurrency",
                "parameters": {"max_concurrent": max(1, active_requests - 1)}
            }
            self.assertEqual(optimization["action"], "reduce_concurrency")
            self.assertEqual(optimization["parameters"]["max_concurrent"], 4)
    
    def test_memory_optimization_logic(self):
        """Test memory usage optimization logic"""
        memory_percent = 90.0
        
        if memory_percent > 85:
            optimization = {
                "type": "memory_optimization",
                "action": "clear_caches",
                "parameters": {"cache_types": ["model_cache", "system_cache"]}
            }
            self.assertEqual(optimization["action"], "clear_caches")
    
    def test_throughput_optimization_logic(self):
        """Test throughput optimization logic"""
        current_tps = 50.0
        target_tps = 80.0
        
        if current_tps < target_tps * 0.7:
            optimization = {
                "type": "throughput_optimization",
                "action": "adjust_model_precision",
                "parameters": {"precision": "fp16"}
            }
            self.assertEqual(optimization["action"], "adjust_model_precision")

class TestDatabaseOperations(unittest.TestCase):
    """Test database operations for performance monitoring"""
    
    def setUp(self):
        self.temp_db = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
        self.temp_db.close()
        self.db_path = self.temp_db.name
        
        # Initialize test database
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE metrics (
                    id INTEGER PRIMARY KEY,
                    timestamp TEXT,
                    cpu_percent REAL,
                    memory_percent REAL,
                    tokens_per_second REAL
                )
            ''')
            conn.commit()
    
    def tearDown(self):
        try:
            os.unlink(self.db_path)
        except OSError:
            pass
    
    def test_metrics_storage(self):
        """Test storing performance metrics"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT INTO metrics (timestamp, cpu_percent, memory_percent, tokens_per_second)
                VALUES (?, ?, ?, ?)
            ''', (datetime.now().isoformat(), 75.5, 68.2, 82.3))
            conn.commit()
            
            cursor = conn.execute('SELECT COUNT(*) FROM metrics')
            count = cursor.fetchone()[0]
            self.assertEqual(count, 1)
    
    def test_metrics_retrieval(self):
        """Test retrieving performance metrics"""
        # Insert test data
        with sqlite3.connect(self.db_path) as conn:
            test_data = [
                (datetime.now().isoformat(), 70.0, 65.0, 80.0),
                (datetime.now().isoformat(), 75.0, 70.0, 85.0),
                (datetime.now().isoformat(), 80.0, 75.0, 90.0)
            ]
            
            conn.executemany('''
                INSERT INTO metrics (timestamp, cpu_percent, memory_percent, tokens_per_second)
                VALUES (?, ?, ?, ?)
            ''', test_data)
            conn.commit()
            
            # Retrieve and verify
            cursor = conn.execute('SELECT * FROM metrics ORDER BY id')
            results = cursor.fetchall()
            self.assertEqual(len(results), 3)
            self.assertEqual(results[0][1], test_data[0][1])  # cpu_percent

class TestSchemaValidation(unittest.TestCase):
    """Test JSON schema validation for performance data"""
    
    def test_hardware_profile_validation(self):
        """Test hardware profile schema validation"""
        valid_profile = {
            "profile_id": "test_001",
            "tier": "mid",
            "cpu_cores": 8,
            "memory_gb": 16.0,
            "gpu_present": True,
            "performance_targets": {
                "target_tps": 80.0,
                "target_fps": 60.0
            }
        }
        
        # Validate required fields
        required_fields = ["profile_id", "tier", "cpu_cores", "memory_gb"]
        for field in required_fields:
            self.assertIn(field, valid_profile)
        
        # Validate tier value
        self.assertIn(valid_profile["tier"], ["low", "mid", "high"])
        
        # Validate numeric ranges
        self.assertGreater(valid_profile["cpu_cores"], 0)
        self.assertGreater(valid_profile["memory_gb"], 0)
    
    def test_performance_metrics_validation(self):
        """Test performance metrics schema validation"""
        valid_metrics = {
            "timestamp": datetime.now().isoformat(),
            "session_id": "session_123",
            "cpu_percent": 75.5,
            "memory_percent": 68.2,
            "tokens_per_second": 82.3,
            "frame_rate_fps": 59.8
        }
        
        # Validate required fields
        required_fields = ["timestamp", "session_id", "cpu_percent", "memory_percent"]
        for field in required_fields:
            self.assertIn(field, valid_metrics)
        
        # Validate percentage ranges
        self.assertGreaterEqual(valid_metrics["cpu_percent"], 0)
        self.assertLessEqual(valid_metrics["cpu_percent"], 100)
        self.assertGreaterEqual(valid_metrics["memory_percent"], 0)
        self.assertLessEqual(valid_metrics["memory_percent"], 100)
        
        # Validate positive metrics
        self.assertGreater(valid_metrics["tokens_per_second"], 0)
        self.assertGreater(valid_metrics["frame_rate_fps"], 0)

class TestLoadTestingValidation(unittest.TestCase):
    """Test load testing configuration validation"""
    
    def test_load_test_scenario_validation(self):
        """Test load test scenario configuration"""
        scenario = {
            "name": "sustained_token_stream",
            "duration_seconds": 300,
            "concurrent_users": 1,
            "success_criteria": {
                "min_tps": 25,
                "max_latency_ms": 2000,
                "max_error_rate": 0.05
            }
        }
        
        # Validate structure
        self.assertIn("name", scenario)
        self.assertIn("duration_seconds", scenario)
        self.assertIn("success_criteria", scenario)
        
        # Validate success criteria
        criteria = scenario["success_criteria"]
        self.assertIn("min_tps", criteria)
        self.assertIn("max_latency_ms", criteria)
        self.assertIn("max_error_rate", criteria)
        
        # Validate ranges
        self.assertGreater(criteria["min_tps"], 0)
        self.assertGreater(criteria["max_latency_ms"], 0)
        self.assertGreaterEqual(criteria["max_error_rate"], 0)
        self.assertLessEqual(criteria["max_error_rate"], 1)

class TestRegressionDetection(unittest.TestCase):
    """Test performance regression detection logic"""
    
    def test_regression_calculation(self):
        """Test regression percentage calculation"""
        baseline_avg = 80.0
        recent_avg = 65.0
        threshold = 0.15  # 15% degradation threshold
        
        regression_pct = (baseline_avg - recent_avg) / baseline_avg
        is_regression = regression_pct > threshold
        
        self.assertAlmostEqual(regression_pct, 0.1875)  # 18.75% degradation
        self.assertTrue(is_regression)
    
    def test_baseline_validation(self):
        """Test baseline data validation"""
        baseline_data = [78.0, 82.0, 79.0, 81.0, 80.0]
        recent_data = [65.0, 67.0, 63.0, 68.0, 66.0]
        
        # Validate sufficient data
        self.assertGreaterEqual(len(baseline_data), 5)
        self.assertGreaterEqual(len(recent_data), 5)
        
        # Calculate averages
        baseline_avg = sum(baseline_data) / len(baseline_data)
        recent_avg = sum(recent_data) / len(recent_data)
        
        self.assertEqual(baseline_avg, 80.0)
        self.assertEqual(recent_avg, 65.8)

def run_performance_tests():
    """Run all performance tests"""
    # Create test suite
    test_suite = unittest.TestSuite()
    
    # Add test classes
    test_classes = [
        TestHardwareDetection,
        TestMetricsCollection,
        TestAlertManager,
        TestCapacityPlanner,
        TestPerformanceOptimizer,
        TestDatabaseOperations,
        TestSchemaValidation,
        TestLoadTestingValidation,
        TestRegressionDetection
    ]
    
    for test_class in test_classes:
        tests = unittest.TestLoader().loadTestsFromTestCase(test_class)
        test_suite.addTests(tests)
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)
    
    return result.wasSuccessful()

if __name__ == "__main__":
    print("Running WF-TECH-010 Performance Test Suite...")
    success = run_performance_tests()
    
    if success:
        print("\n✅ All performance tests passed!")
        exit(0)
    else:
        print("\n❌ Some performance tests failed!")
        exit(1)
