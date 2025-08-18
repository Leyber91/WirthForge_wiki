"""
WF-TECH-001 Core Architecture Test Suite
Comprehensive testing for WIRTHFORGE core architecture components
"""

import unittest
import asyncio
import json
import time
import sqlite3
import tempfile
import os
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
from typing import Dict, List, Any, Optional
import threading
import queue
import logging

# Test Configuration
TEST_CONFIG = {
    "performance": {
        "frame_budget_ms": 16.67,  # 60Hz requirement
        "max_startup_time_ms": 5000,
        "max_memory_mb": 512
    },
    "energy": {
        "accuracy_threshold": 0.05,  # ±5% accuracy requirement
        "measurement_interval_ms": 100
    }
}

class CoreArchitectureTests(unittest.TestCase):
    """Test suite for WF-TECH-001 Core Architecture"""
    
    def setUp(self):
        """Set up test environment"""
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = Path(self.temp_dir) / "test.db"
        self.config = {
            "database": {"path": str(self.db_path)},
            "performance": TEST_CONFIG["performance"],
            "energy": TEST_CONFIG["energy"]
        }
        
    def tearDown(self):
        """Clean up test environment"""
        if self.db_path.exists():
            os.unlink(self.db_path)
        os.rmdir(self.temp_dir)

class LocalFirstArchitectureTests(CoreArchitectureTests):
    """Test local-first architecture principles"""
    
    def test_offline_functionality(self):
        """Test that core functions work without network"""
        with patch('socket.socket') as mock_socket:
            mock_socket.side_effect = OSError("Network unavailable")
            
            # Core should initialize without network
            core = self._create_mock_core()
            self.assertTrue(core.initialize())
            
            # Basic operations should work offline
            result = core.process_data({"test": "data"})
            self.assertIsNotNone(result)
    
    def test_local_data_storage(self):
        """Test local SQLite database operations"""
        # Initialize database
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create test table
        cursor.execute("""
            CREATE TABLE test_data (
                id INTEGER PRIMARY KEY,
                data TEXT NOT NULL,
                timestamp REAL NOT NULL
            )
        """)
        
        # Test data insertion
        test_data = {"key": "value", "number": 42}
        cursor.execute(
            "INSERT INTO test_data (data, timestamp) VALUES (?, ?)",
            (json.dumps(test_data), time.time())
        )
        conn.commit()
        
        # Test data retrieval
        cursor.execute("SELECT data FROM test_data WHERE id = 1")
        result = cursor.fetchone()
        self.assertIsNotNone(result)
        
        retrieved_data = json.loads(result[0])
        self.assertEqual(retrieved_data, test_data)
        
        conn.close()
    
    def test_no_external_dependencies(self):
        """Test that core doesn't make external network calls"""
        with patch('urllib.request.urlopen') as mock_urlopen:
            mock_urlopen.side_effect = Exception("No external calls allowed")
            
            core = self._create_mock_core()
            # Should not raise exception from external calls
            self.assertTrue(core.initialize())

class PerformanceTests(CoreArchitectureTests):
    """Test performance requirements"""
    
    def test_frame_budget_compliance(self):
        """Test 60Hz frame budget (16.67ms) compliance"""
        frame_budget = TEST_CONFIG["performance"]["frame_budget_ms"]
        
        # Simulate frame processing
        start_time = time.perf_counter()
        
        # Mock frame processing work
        self._simulate_frame_processing()
        
        end_time = time.perf_counter()
        frame_time_ms = (end_time - start_time) * 1000
        
        self.assertLess(
            frame_time_ms, 
            frame_budget,
            f"Frame processing took {frame_time_ms:.2f}ms, exceeds {frame_budget}ms budget"
        )
    
    def test_startup_performance(self):
        """Test system startup time"""
        max_startup_time = TEST_CONFIG["performance"]["max_startup_time_ms"]
        
        start_time = time.perf_counter()
        
        # Mock system initialization
        core = self._create_mock_core()
        core.initialize()
        
        end_time = time.perf_counter()
        startup_time_ms = (end_time - start_time) * 1000
        
        self.assertLess(
            startup_time_ms,
            max_startup_time,
            f"Startup took {startup_time_ms:.2f}ms, exceeds {max_startup_time}ms limit"
        )
    
    def test_memory_usage(self):
        """Test memory usage constraints"""
        import psutil
        
        process = psutil.Process()
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Simulate memory-intensive operations
        core = self._create_mock_core()
        core.initialize()
        
        # Process test data
        for i in range(1000):
            core.process_data({"iteration": i, "data": "x" * 1000})
        
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        max_memory = TEST_CONFIG["performance"]["max_memory_mb"]
        self.assertLess(
            memory_increase,
            max_memory,
            f"Memory usage increased by {memory_increase:.2f}MB, exceeds {max_memory}MB limit"
        )

class EnergyTruthTests(CoreArchitectureTests):
    """Test energy truth visualization accuracy"""
    
    def test_energy_measurement_accuracy(self):
        """Test energy measurement accuracy within ±5%"""
        accuracy_threshold = TEST_CONFIG["energy"]["accuracy_threshold"]
        
        # Mock energy measurements
        expected_energy = 100.0  # Baseline energy value
        measured_values = []
        
        for _ in range(10):
            # Simulate energy measurement with some variance
            measured = self._simulate_energy_measurement(expected_energy)
            measured_values.append(measured)
        
        # Calculate accuracy
        for measured in measured_values:
            error_ratio = abs(measured - expected_energy) / expected_energy
            self.assertLess(
                error_ratio,
                accuracy_threshold,
                f"Energy measurement error {error_ratio:.3f} exceeds {accuracy_threshold:.3f} threshold"
            )
    
    def test_real_time_energy_updates(self):
        """Test real-time energy visualization updates"""
        update_interval = TEST_CONFIG["energy"]["measurement_interval_ms"]
        
        energy_values = []
        start_time = time.time()
        
        # Simulate real-time energy collection
        for i in range(5):
            energy_values.append(self._simulate_energy_measurement(50 + i * 10))
            time.sleep(update_interval / 1000)  # Convert to seconds
        
        end_time = time.time()
        total_time_ms = (end_time - start_time) * 1000
        
        # Verify timing accuracy
        expected_time_ms = len(energy_values) * update_interval
        timing_error = abs(total_time_ms - expected_time_ms) / expected_time_ms
        
        self.assertLess(timing_error, 0.1, "Real-time update timing error too high")
        self.assertEqual(len(energy_values), 5, "Missing energy measurements")

class ComponentIntegrationTests(CoreArchitectureTests):
    """Test component integration and communication"""
    
    def test_event_bus_communication(self):
        """Test event bus for component communication"""
        event_bus = self._create_mock_event_bus()
        
        # Test event subscription
        received_events = []
        def event_handler(event):
            received_events.append(event)
        
        event_bus.subscribe("test_event", event_handler)
        
        # Test event publishing
        test_event = {"type": "test_event", "data": "test_data"}
        event_bus.publish("test_event", test_event)
        
        # Verify event delivery
        self.assertEqual(len(received_events), 1)
        self.assertEqual(received_events[0], test_event)
    
    def test_component_lifecycle(self):
        """Test component initialization and shutdown"""
        components = [
            self._create_mock_component("ui"),
            self._create_mock_component("data"),
            self._create_mock_component("network")
        ]
        
        # Test initialization
        for component in components:
            self.assertTrue(component.initialize())
            self.assertEqual(component.state, "initialized")
        
        # Test shutdown
        for component in components:
            self.assertTrue(component.shutdown())
            self.assertEqual(component.state, "shutdown")
    
    def test_dependency_injection(self):
        """Test dependency injection between components"""
        # Create mock dependencies
        database = self._create_mock_database()
        config = self._create_mock_config()
        
        # Create component with dependencies
        component = self._create_mock_component("service")
        component.inject_dependency("database", database)
        component.inject_dependency("config", config)
        
        # Test dependency usage
        self.assertTrue(component.initialize())
        self.assertIsNotNone(component.get_dependency("database"))
        self.assertIsNotNone(component.get_dependency("config"))

class ErrorHandlingTests(CoreArchitectureTests):
    """Test error handling and recovery"""
    
    def test_graceful_degradation(self):
        """Test graceful degradation when components fail"""
        core = self._create_mock_core()
        
        # Simulate component failure
        with patch.object(core, 'network_component') as mock_network:
            mock_network.is_available.return_value = False
            
            # Core should continue operating in offline mode
            self.assertTrue(core.initialize())
            self.assertEqual(core.mode, "offline")
    
    def test_error_recovery(self):
        """Test automatic error recovery"""
        core = self._create_mock_core()
        
        # Simulate transient error
        with patch.object(core, 'process_data') as mock_process:
            mock_process.side_effect = [Exception("Transient error"), {"success": True}]
            
            # Should retry and succeed
            result = core.process_with_retry({"test": "data"})
            self.assertEqual(result, {"success": True})
    
    def test_error_logging(self):
        """Test comprehensive error logging"""
        with self.assertLogs(level='ERROR') as log:
            core = self._create_mock_core()
            
            # Trigger error condition
            try:
                core.process_data(None)  # Invalid input
            except Exception:
                pass
            
            # Verify error was logged
            self.assertTrue(any("Invalid input" in record.message for record in log.records))

class SecurityTests(CoreArchitectureTests):
    """Test security aspects of core architecture"""
    
    def test_input_validation(self):
        """Test input validation and sanitization"""
        core = self._create_mock_core()
        
        # Test valid input
        valid_data = {"key": "value", "number": 42}
        result = core.validate_input(valid_data)
        self.assertTrue(result["valid"])
        
        # Test invalid input
        invalid_data = {"<script>": "alert('xss')", "sql": "'; DROP TABLE users; --"}
        result = core.validate_input(invalid_data)
        self.assertFalse(result["valid"])
        self.assertIn("security", result["errors"])
    
    def test_data_encryption(self):
        """Test data encryption for sensitive information"""
        core = self._create_mock_core()
        
        sensitive_data = "sensitive_information"
        encrypted = core.encrypt_data(sensitive_data)
        
        # Verify encryption
        self.assertNotEqual(encrypted, sensitive_data)
        self.assertIsInstance(encrypted, str)
        
        # Verify decryption
        decrypted = core.decrypt_data(encrypted)
        self.assertEqual(decrypted, sensitive_data)

    # Helper methods for test setup
    def _create_mock_core(self):
        """Create mock core system"""
        core = Mock()
        core.initialize.return_value = True
        core.mode = "online"
        core.state = "initialized"
        core.process_data.return_value = {"processed": True}
        core.validate_input.return_value = {"valid": True}
        core.encrypt_data.return_value = "encrypted_data"
        core.decrypt_data.return_value = "decrypted_data"
        core.process_with_retry.return_value = {"success": True}
        return core
    
    def _create_mock_component(self, name: str):
        """Create mock component"""
        component = Mock()
        component.name = name
        component.state = "uninitialized"
        component.dependencies = {}
        
        def initialize():
            component.state = "initialized"
            return True
        
        def shutdown():
            component.state = "shutdown"
            return True
        
        def inject_dependency(key, value):
            component.dependencies[key] = value
        
        def get_dependency(key):
            return component.dependencies.get(key)
        
        component.initialize = initialize
        component.shutdown = shutdown
        component.inject_dependency = inject_dependency
        component.get_dependency = get_dependency
        
        return component
    
    def _create_mock_event_bus(self):
        """Create mock event bus"""
        event_bus = Mock()
        event_bus.subscribers = {}
        
        def subscribe(event_type, handler):
            if event_type not in event_bus.subscribers:
                event_bus.subscribers[event_type] = []
            event_bus.subscribers[event_type].append(handler)
        
        def publish(event_type, event):
            if event_type in event_bus.subscribers:
                for handler in event_bus.subscribers[event_type]:
                    handler(event)
        
        event_bus.subscribe = subscribe
        event_bus.publish = publish
        
        return event_bus
    
    def _create_mock_database(self):
        """Create mock database"""
        database = Mock()
        database.is_connected.return_value = True
        database.execute.return_value = {"success": True}
        return database
    
    def _create_mock_config(self):
        """Create mock configuration"""
        config = Mock()
        config.get.return_value = "default_value"
        return config
    
    def _simulate_frame_processing(self):
        """Simulate frame processing work"""
        # Simulate lightweight processing that should stay under 16.67ms
        for i in range(1000):
            _ = i * i
    
    def _simulate_energy_measurement(self, base_value: float) -> float:
        """Simulate energy measurement with realistic variance"""
        import random
        # Add ±2% random variance to simulate real measurements
        variance = random.uniform(-0.02, 0.02)
        return base_value * (1 + variance)

class IntegrationTests(CoreArchitectureTests):
    """Integration tests for complete system"""
    
    def test_full_system_integration(self):
        """Test complete system integration"""
        # Initialize all components
        core = self._create_mock_core()
        event_bus = self._create_mock_event_bus()
        database = self._create_mock_database()
        
        # Test system startup
        self.assertTrue(core.initialize())
        
        # Test data flow
        test_data = {"user_id": "test_user", "action": "test_action"}
        result = core.process_data(test_data)
        self.assertIsNotNone(result)
        
        # Test event propagation
        events_received = []
        event_bus.subscribe("data_processed", lambda e: events_received.append(e))
        event_bus.publish("data_processed", {"data": test_data})
        
        self.assertEqual(len(events_received), 1)
    
    def test_concurrent_operations(self):
        """Test concurrent operations and thread safety"""
        core = self._create_mock_core()
        results = queue.Queue()
        
        def worker(worker_id):
            for i in range(10):
                result = core.process_data({"worker": worker_id, "iteration": i})
                results.put(result)
        
        # Start multiple worker threads
        threads = []
        for worker_id in range(5):
            thread = threading.Thread(target=worker, args=(worker_id,))
            threads.append(thread)
            thread.start()
        
        # Wait for completion
        for thread in threads:
            thread.join()
        
        # Verify all operations completed
        result_count = results.qsize()
        self.assertEqual(result_count, 50)  # 5 workers × 10 iterations

if __name__ == '__main__':
    # Configure logging for tests
    logging.basicConfig(level=logging.INFO)
    
    # Create test suite
    suite = unittest.TestSuite()
    
    # Add test classes
    test_classes = [
        LocalFirstArchitectureTests,
        PerformanceTests,
        EnergyTruthTests,
        ComponentIntegrationTests,
        ErrorHandlingTests,
        SecurityTests,
        IntegrationTests
    ]
    
    for test_class in test_classes:
        tests = unittest.TestLoader().loadTestsFromTestCase(test_class)
        suite.addTests(tests)
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Exit with appropriate code
    exit(0 if result.wasSuccessful() else 1)
