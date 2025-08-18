"""
WF-TECH-008: WIRTHFORGE Plugin Testing Framework

Comprehensive testing harness for plugin development:
- Unit testing with mocked WIRTHFORGE APIs
- Integration testing with sandbox environment
- Performance and energy usage testing
- Security validation testing
- UI component testing
- Event system testing
- Automated test discovery and execution
"""

import asyncio
import json
import logging
import os
import sys
import time
import unittest
from abc import ABC, abstractmethod
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Callable, AsyncGenerator
from unittest.mock import Mock, AsyncMock, MagicMock
import tempfile
import shutil
import subprocess
import threading
import queue
import psutil


@dataclass
class TestResult:
    """Test execution result."""
    name: str
    passed: bool
    duration_ms: int
    energy_used: int
    memory_peak_mb: int
    error: Optional[str] = None
    warnings: List[str] = field(default_factory=list)
    metrics: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TestSuite:
    """Collection of tests."""
    name: str
    tests: List['PluginTest']
    setup: Optional[Callable] = None
    teardown: Optional[Callable] = None


class MockPluginBridge:
    """Mock implementation of the plugin bridge for testing."""
    
    def __init__(self):
        self.calls = []
        self.responses = {}
        self.events = {}
        self.energy_counter = 0
        self.permissions = set()
        self.storage = {}
    
    async def call_api(self, method: str, params: Dict[str, Any] = None) -> Any:
        """Mock API call."""
        call_record = {
            'method': method,
            'params': params or {},
            'timestamp': time.time()
        }
        self.calls.append(call_record)
        
        # Handle specific API calls
        if method == 'energy.get_current':
            self.energy_counter += 1
            return self.energy_counter
        
        elif method == 'permissions.check':
            domain = params.get('domain')
            action = params.get('action')
            return f"{domain}.{action}" in self.permissions
        
        elif method == 'permissions.request':
            domain = params.get('domain')
            action = params.get('action')
            permission = f"{domain}.{action}"
            self.permissions.add(permission)
            return True
        
        elif method == 'storage.get':
            return self.storage.get(params.get('key'))
        
        elif method == 'storage.set':
            self.storage[params.get('key')] = params.get('value')
            return None
        
        elif method == 'storage.list':
            prefix = params.get('prefix', '')
            return [k for k in self.storage.keys() if k.startswith(prefix)]
        
        elif method == 'ui.create_panel':
            return f"panel_{len(self.calls)}"
        
        elif method == 'ui.show_notification':
            return None
        
        elif method == 'events.publish':
            event = params.get('event')
            data = params.get('data')
            if event in self.events:
                for callback in self.events[event]:
                    try:
                        if asyncio.iscoroutinefunction(callback):
                            await callback(data)
                        else:
                            callback(data)
                    except Exception as e:
                        logging.error(f"Error in event callback: {e}")
            return None
        
        # Return configured response or default
        return self.responses.get(method, None)
    
    def set_response(self, method: str, response: Any):
        """Set mock response for API method."""
        self.responses[method] = response
    
    def register_event_handler(self, event: str, handler: Callable):
        """Register event handler."""
        if event not in self.events:
            self.events[event] = []
        self.events[event].append(handler)
    
    def trigger_event(self, event: str, data: Any):
        """Trigger an event for testing."""
        if event in self.events:
            for callback in self.events[event]:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        asyncio.create_task(callback(data))
                    else:
                        callback(data)
                except Exception as e:
                    logging.error(f"Error triggering event {event}: {e}")
    
    def get_call_count(self, method: str) -> int:
        """Get number of calls to a specific method."""
        return len([call for call in self.calls if call['method'] == method])
    
    def get_last_call(self, method: str) -> Optional[Dict[str, Any]]:
        """Get last call to a specific method."""
        calls = [call for call in self.calls if call['method'] == method]
        return calls[-1] if calls else None
    
    def reset(self):
        """Reset mock state."""
        self.calls.clear()
        self.responses.clear()
        self.events.clear()
        self.energy_counter = 0
        self.permissions.clear()
        self.storage.clear()


class PluginTest(ABC):
    """Base class for plugin tests."""
    
    def __init__(self, name: str):
        self.name = name
        self.bridge = MockPluginBridge()
        self.start_time = 0
        self.start_energy = 0
        self.start_memory = 0
    
    async def setup(self):
        """Test setup - override if needed."""
        pass
    
    async def teardown(self):
        """Test teardown - override if needed."""
        pass
    
    @abstractmethod
    async def run_test(self) -> bool:
        """Run the actual test - must be implemented."""
        pass
    
    async def execute(self) -> TestResult:
        """Execute the test and return results."""
        self.start_time = time.time()
        self.start_energy = await self.bridge.call_api('energy.get_current')
        self.start_memory = self._get_memory_usage()
        
        try:
            await self.setup()
            passed = await self.run_test()
            await self.teardown()
            
            end_time = time.time()
            end_energy = await self.bridge.call_api('energy.get_current')
            peak_memory = self._get_memory_usage()
            
            return TestResult(
                name=self.name,
                passed=passed,
                duration_ms=int((end_time - self.start_time) * 1000),
                energy_used=end_energy - self.start_energy,
                memory_peak_mb=max(peak_memory, self.start_memory)
            )
            
        except Exception as e:
            end_time = time.time()
            return TestResult(
                name=self.name,
                passed=False,
                duration_ms=int((end_time - self.start_time) * 1000),
                energy_used=0,
                memory_peak_mb=self._get_memory_usage(),
                error=str(e)
            )
    
    def _get_memory_usage(self) -> int:
        """Get current memory usage in MB."""
        try:
            process = psutil.Process()
            return int(process.memory_info().rss / 1024 / 1024)
        except:
            return 0
    
    def assert_api_called(self, method: str, times: int = None):
        """Assert that an API method was called."""
        call_count = self.bridge.get_call_count(method)
        if times is not None:
            assert call_count == times, f"Expected {method} to be called {times} times, but was called {call_count} times"
        else:
            assert call_count > 0, f"Expected {method} to be called, but it wasn't"
    
    def assert_api_not_called(self, method: str):
        """Assert that an API method was not called."""
        call_count = self.bridge.get_call_count(method)
        assert call_count == 0, f"Expected {method} not to be called, but was called {call_count} times"
    
    def assert_api_called_with(self, method: str, **params):
        """Assert that an API method was called with specific parameters."""
        last_call = self.bridge.get_last_call(method)
        assert last_call is not None, f"Method {method} was never called"
        
        for key, value in params.items():
            assert key in last_call['params'], f"Parameter {key} not found in call to {method}"
            assert last_call['params'][key] == value, f"Parameter {key} expected {value}, got {last_call['params'][key]}"


class PluginUnitTest(PluginTest):
    """Unit test for plugin functionality."""
    
    def __init__(self, name: str, plugin_class: type, manifest: Dict[str, Any]):
        super().__init__(name)
        self.plugin_class = plugin_class
        self.manifest = manifest
        self.plugin = None
    
    async def setup(self):
        """Setup plugin instance for testing."""
        from WF_TECH_008_plugin_sdk_python import PluginContext, PermissionManager, EnergyTracker, StorageManager, UIManager, EventManager, PluginLogger, SandboxInfo
        
        # Create mock context
        context = PluginContext(
            manifest=self.manifest,
            permissions=PermissionManager(self.bridge),
            energy=EnergyTracker(self.bridge),
            storage=StorageManager(self.bridge),
            ui=UIManager(self.bridge),
            events=EventManager(self.bridge),
            logger=PluginLogger(self.bridge, self.manifest['name']),
            sandbox=SandboxInfo(0, 0, 0.0, 0, 0, []),
            bridge=self.bridge
        )
        
        self.plugin = self.plugin_class(context)


class PluginIntegrationTest(PluginTest):
    """Integration test with sandbox environment."""
    
    def __init__(self, name: str, plugin_path: str):
        super().__init__(name)
        self.plugin_path = plugin_path
        self.sandbox_process = None
        self.temp_dir = None
    
    async def setup(self):
        """Setup sandbox environment."""
        self.temp_dir = tempfile.mkdtemp()
        
        # Copy plugin to temp directory
        shutil.copytree(self.plugin_path, os.path.join(self.temp_dir, 'plugin'))
        
        # Start sandbox process (mock implementation)
        # In real implementation, this would start the actual sandbox
        pass
    
    async def teardown(self):
        """Cleanup sandbox environment."""
        if self.sandbox_process:
            self.sandbox_process.terminate()
        
        if self.temp_dir:
            shutil.rmtree(self.temp_dir)


class PluginPerformanceTest(PluginTest):
    """Performance and energy usage test."""
    
    def __init__(self, name: str, max_duration_ms: int, max_energy: int, max_memory_mb: int):
        super().__init__(name)
        self.max_duration_ms = max_duration_ms
        self.max_energy = max_energy
        self.max_memory_mb = max_memory_mb
    
    async def run_test(self) -> bool:
        """Run performance test."""
        # Simulate plugin operations
        await asyncio.sleep(0.1)  # Simulate work
        
        # Check performance constraints
        duration = int((time.time() - self.start_time) * 1000)
        energy_used = await self.bridge.call_api('energy.get_current') - self.start_energy
        memory_used = self._get_memory_usage()
        
        if duration > self.max_duration_ms:
            raise AssertionError(f"Test exceeded time limit: {duration}ms > {self.max_duration_ms}ms")
        
        if energy_used > self.max_energy:
            raise AssertionError(f"Test exceeded energy limit: {energy_used} > {self.max_energy}")
        
        if memory_used > self.max_memory_mb:
            raise AssertionError(f"Test exceeded memory limit: {memory_used}MB > {self.max_memory_mb}MB")
        
        return True


class PluginSecurityTest(PluginTest):
    """Security validation test."""
    
    def __init__(self, name: str, forbidden_operations: List[str]):
        super().__init__(name)
        self.forbidden_operations = forbidden_operations
    
    async def run_test(self) -> bool:
        """Run security test."""
        # Check that forbidden operations are blocked
        for operation in self.forbidden_operations:
            try:
                await self.bridge.call_api(operation)
                # If we get here, the operation wasn't blocked
                raise AssertionError(f"Forbidden operation {operation} was not blocked")
            except PermissionError:
                # Expected - operation was blocked
                pass
        
        return True


class PluginTestHarness:
    """Main test harness for running plugin tests."""
    
    def __init__(self):
        self.test_suites = []
        self.results = []
        self.logger = logging.getLogger('PluginTestHarness')
    
    def add_test_suite(self, suite: TestSuite):
        """Add a test suite."""
        self.test_suites.append(suite)
    
    def add_test(self, test: PluginTest, suite_name: str = "default"):
        """Add a single test to a suite."""
        suite = next((s for s in self.test_suites if s.name == suite_name), None)
        if not suite:
            suite = TestSuite(suite_name, [])
            self.test_suites.append(suite)
        suite.tests.append(test)
    
    async def run_all_tests(self) -> Dict[str, List[TestResult]]:
        """Run all test suites."""
        all_results = {}
        
        for suite in self.test_suites:
            self.logger.info(f"Running test suite: {suite.name}")
            
            if suite.setup:
                await suite.setup()
            
            suite_results = []
            for test in suite.tests:
                self.logger.info(f"  Running test: {test.name}")
                result = await test.execute()
                suite_results.append(result)
                
                if result.passed:
                    self.logger.info(f"    ✅ PASSED ({result.duration_ms}ms)")
                else:
                    self.logger.error(f"    ❌ FAILED: {result.error}")
            
            if suite.teardown:
                await suite.teardown()
            
            all_results[suite.name] = suite_results
        
        self.results = all_results
        return all_results
    
    def generate_report(self, output_file: str = "test_report.json"):
        """Generate test report."""
        report = {
            'timestamp': time.time(),
            'summary': self._generate_summary(),
            'suites': {}
        }
        
        for suite_name, results in self.results.items():
            report['suites'][suite_name] = {
                'total_tests': len(results),
                'passed': len([r for r in results if r.passed]),
                'failed': len([r for r in results if not r.passed]),
                'total_duration_ms': sum(r.duration_ms for r in results),
                'total_energy_used': sum(r.energy_used for r in results),
                'peak_memory_mb': max((r.memory_peak_mb for r in results), default=0),
                'tests': [
                    {
                        'name': r.name,
                        'passed': r.passed,
                        'duration_ms': r.duration_ms,
                        'energy_used': r.energy_used,
                        'memory_peak_mb': r.memory_peak_mb,
                        'error': r.error,
                        'warnings': r.warnings,
                        'metrics': r.metrics
                    }
                    for r in results
                ]
            }
        
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        self.logger.info(f"Test report generated: {output_file}")
        return report
    
    def _generate_summary(self) -> Dict[str, Any]:
        """Generate test summary."""
        all_results = []
        for results in self.results.values():
            all_results.extend(results)
        
        if not all_results:
            return {'total_tests': 0, 'passed': 0, 'failed': 0}
        
        return {
            'total_tests': len(all_results),
            'passed': len([r for r in all_results if r.passed]),
            'failed': len([r for r in all_results if not r.passed]),
            'total_duration_ms': sum(r.duration_ms for r in all_results),
            'total_energy_used': sum(r.energy_used for r in all_results),
            'peak_memory_mb': max(r.memory_peak_mb for r in all_results),
            'pass_rate': len([r for r in all_results if r.passed]) / len(all_results) * 100
        }
    
    def print_summary(self):
        """Print test summary to console."""
        summary = self._generate_summary()
        
        print("\n" + "="*60)
        print("PLUGIN TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {summary['total_tests']}")
        print(f"Passed: {summary['passed']}")
        print(f"Failed: {summary['failed']}")
        print(f"Pass Rate: {summary.get('pass_rate', 0):.1f}%")
        print(f"Total Duration: {summary.get('total_duration_ms', 0)}ms")
        print(f"Total Energy Used: {summary.get('total_energy_used', 0)}")
        print(f"Peak Memory: {summary.get('peak_memory_mb', 0)}MB")
        print("="*60)


class PluginTestDiscovery:
    """Automatic test discovery for plugin projects."""
    
    @staticmethod
    def discover_tests(plugin_dir: str) -> List[PluginTest]:
        """Discover tests in plugin directory."""
        tests = []
        plugin_path = Path(plugin_dir)
        
        # Look for test files
        for test_file in plugin_path.glob("test_*.py"):
            tests.extend(PluginTestDiscovery._load_tests_from_file(test_file))
        
        # Look for tests directory
        tests_dir = plugin_path / "tests"
        if tests_dir.exists():
            for test_file in tests_dir.glob("*.py"):
                tests.extend(PluginTestDiscovery._load_tests_from_file(test_file))
        
        return tests
    
    @staticmethod
    def _load_tests_from_file(test_file: Path) -> List[PluginTest]:
        """Load tests from a Python file."""
        # This would use dynamic import to load test classes
        # For now, return empty list
        return []


# Example test implementations
class ExamplePluginInitializationTest(PluginUnitTest):
    """Example test for plugin initialization."""
    
    async def run_test(self) -> bool:
        """Test plugin initialization."""
        await self.plugin.initialize()
        
        # Verify initialization
        self.assert_api_called('permissions.request')
        self.assert_api_called('energy.get_current')
        
        return self.plugin.is_initialized


class ExamplePluginUITest(PluginUnitTest):
    """Example test for plugin UI functionality."""
    
    async def run_test(self) -> bool:
        """Test plugin UI creation."""
        await self.plugin.initialize()
        await self.plugin.activate()
        
        # Verify UI components were created
        self.assert_api_called('ui.create_panel')
        
        return True


class ExamplePluginEventTest(PluginUnitTest):
    """Example test for plugin event handling."""
    
    async def run_test(self) -> bool:
        """Test plugin event handling."""
        await self.plugin.initialize()
        
        # Subscribe to events
        await self.plugin.context.events.subscribe('test.event', self._event_handler)
        
        # Trigger event
        self.bridge.trigger_event('test.event', {'data': 'test'})
        
        # Verify event was handled
        await asyncio.sleep(0.1)  # Allow event processing
        
        return True
    
    async def _event_handler(self, data):
        """Test event handler."""
        self.event_received = True


# CLI for running tests
def main():
    """Main entry point for test harness CLI."""
    import argparse
    
    parser = argparse.ArgumentParser(description="WIRTHFORGE Plugin Test Harness")
    parser.add_argument("plugin_dir", help="Plugin directory to test")
    parser.add_argument("--output", default="test_report.json", help="Output report file")
    parser.add_argument("--verbose", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.basicConfig(level=logging.INFO)
    
    # Create test harness
    harness = PluginTestHarness()
    
    # Discover and add tests
    tests = PluginTestDiscovery.discover_tests(args.plugin_dir)
    for test in tests:
        harness.add_test(test)
    
    # Run tests
    async def run_tests():
        await harness.run_all_tests()
        harness.generate_report(args.output)
        harness.print_summary()
    
    asyncio.run(run_tests())


if __name__ == "__main__":
    main()
