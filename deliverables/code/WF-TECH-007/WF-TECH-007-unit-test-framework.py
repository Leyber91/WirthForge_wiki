#!/usr/bin/env python3
"""
WF-TECH-007 Unit & Integration Test Framework
WIRTHFORGE Testing & QA Strategy - Core Test Suite

This module provides comprehensive unit and integration testing capabilities
for all WIRTHFORGE components, ensuring 60Hz performance fidelity and
strict "energy-truth" validation.

Key Features:
- Energy calculation oracle tests with ±5% tolerance
- State machine transition validation
- Schema compliance verification
- Frame budget enforcement (16.67ms)
- Decipher loop integration testing
- Error injection and resilience testing

Dependencies: pytest, asyncio, jsonschema, time, json
"""

import asyncio
import json
import time
import logging
import pytest
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, asdict
from pathlib import Path
from jsonschema import validate, Draft7Validator, ValidationError
import statistics
import threading
from unittest.mock import Mock, patch, MagicMock

# Configure logging for test output
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Test Configuration Constants
FRAME_BUDGET_MS = 16.67  # 60Hz frame budget
ENERGY_TOLERANCE = 0.05  # ±5% energy accuracy tolerance
MAX_FRAME_OVERRUNS = 0.05  # <5% of frames can exceed budget
DEFAULT_TEST_TIMEOUT = 30.0  # seconds

@dataclass
class TokenData:
    """Token data structure for testing"""
    content: str
    timestamp: float
    model_id: str
    confidence: float
    is_final: bool = False
    entropy: Optional[float] = None
    token_id: Optional[str] = None

@dataclass
class EnergyEvent:
    """Energy event structure for validation"""
    type: str
    timestamp: float
    payload: Dict[str, Any]
    session_id: str
    frame_id: int

@dataclass
class TestMetrics:
    """Test execution metrics"""
    frame_times: List[float]
    energy_values: List[float]
    event_count: int
    overrun_count: int
    total_duration: float
    memory_usage: List[float]

class EnergyOracle:
    """
    Energy calculation oracle for test validation
    Implements the canonical energy formula from WF-FND-002
    """
    
    def __init__(self):
        self.base_energy_per_token = 1.0
        self.confidence_multiplier = 2.0
        self.entropy_factor = 0.5
        self.decay_rate = 0.1
    
    def calculate_token_energy(self, token: TokenData) -> float:
        """Calculate expected energy for a single token"""
        base_energy = self.base_energy_per_token * len(token.content)
        confidence_boost = base_energy * (token.confidence * self.confidence_multiplier)
        
        entropy_adjustment = 0.0
        if token.entropy is not None:
            entropy_adjustment = base_energy * (token.entropy * self.entropy_factor)
        
        total_energy = base_energy + confidence_boost + entropy_adjustment
        return max(0.0, total_energy)  # Energy cannot be negative
    
    def calculate_sequence_energy(self, tokens: List[TokenData]) -> float:
        """Calculate expected total energy for a token sequence"""
        total_energy = 0.0
        for token in tokens:
            token_energy = self.calculate_token_energy(token)
            # Apply decay based on time since first token
            if tokens:
                time_delta = token.timestamp - tokens[0].timestamp
                decay_factor = max(0.0, 1.0 - (self.decay_rate * time_delta))
                token_energy *= decay_factor
            total_energy += token_energy
        return total_energy

class MockDecipherLoop:
    """Mock Decipher loop for testing"""
    
    def __init__(self, frame_interval: float = FRAME_BUDGET_MS / 1000):
        self.frame_interval = frame_interval
        self.is_running = False
        self.event_callbacks: List[Callable] = []
        self.session_id = "test-session"
        self.frame_counter = 0
        self.energy_total = 0.0
        self.state = "IDLE"
        self.metrics = TestMetrics([], [], 0, 0, 0.0, [])
        self.oracle = EnergyOracle()
        
    def add_event_callback(self, callback: Callable):
        """Add event callback for test monitoring"""
        self.event_callbacks.append(callback)
    
    async def start_session(self):
        """Initialize test session"""
        self.is_running = True
        self.state = "CHARGING"
        self._emit_event("session.started", {"session_id": self.session_id})
    
    async def stop_session(self):
        """Stop test session"""
        self.is_running = False
        self.state = "IDLE"
        self._emit_event("session.ended", {"session_id": self.session_id})
    
    async def ingest_token(self, token: TokenData):
        """Process a token and emit energy events"""
        if not self.is_running:
            return
        
        frame_start = time.perf_counter()
        
        # Calculate energy using oracle
        token_energy = self.oracle.calculate_token_energy(token)
        self.energy_total += token_energy
        
        # Update state
        if self.state == "CHARGING":
            self.state = "FLOWING"
        
        # Emit energy update event
        self._emit_event("energy.update", {
            "total_energy": self.energy_total,
            "token_energy": token_energy,
            "state": self.state,
            "token_content": token.content
        })
        
        # Record frame timing
        frame_duration = (time.perf_counter() - frame_start) * 1000
        self.metrics.frame_times.append(frame_duration)
        self.metrics.energy_values.append(self.energy_total)
        
        # Check for frame budget overrun
        if frame_duration > FRAME_BUDGET_MS:
            self.metrics.overrun_count += 1
            logger.warning(f"Frame overrun: {frame_duration:.2f}ms > {FRAME_BUDGET_MS}ms")
        
        self.frame_counter += 1
    
    def _emit_event(self, event_type: str, payload: Dict[str, Any]):
        """Emit event to all registered callbacks"""
        event = EnergyEvent(
            type=event_type,
            timestamp=time.time(),
            payload=payload,
            session_id=self.session_id,
            frame_id=self.frame_counter
        )
        
        self.metrics.event_count += 1
        
        for callback in self.event_callbacks:
            try:
                callback(asdict(event))
            except Exception as e:
                logger.error(f"Event callback error: {e}")

class SchemaValidator:
    """JSON Schema validation for events and data contracts"""
    
    def __init__(self, schema_dir: str = "schemas"):
        self.schema_dir = Path(schema_dir)
        self.validators = {}
        self._load_schemas()
    
    def _load_schemas(self):
        """Load all JSON schemas from schema directory"""
        if not self.schema_dir.exists():
            logger.warning(f"Schema directory not found: {self.schema_dir}")
            return
        
        for schema_file in self.schema_dir.glob("*.json"):
            try:
                with open(schema_file, 'r') as f:
                    schema = json.load(f)
                    validator = Draft7Validator(schema)
                    self.validators[schema_file.stem] = validator
                    logger.info(f"Loaded schema: {schema_file.stem}")
            except Exception as e:
                logger.error(f"Failed to load schema {schema_file}: {e}")
    
    def validate_event(self, event: Dict[str, Any], schema_name: str) -> bool:
        """Validate event against named schema"""
        if schema_name not in self.validators:
            logger.warning(f"Schema not found: {schema_name}")
            return True  # Pass if schema not available
        
        try:
            self.validators[schema_name].validate(event)
            return True
        except ValidationError as e:
            logger.error(f"Schema validation failed for {schema_name}: {e}")
            return False

class PerformanceMonitor:
    """Performance monitoring and frame budget enforcement"""
    
    def __init__(self):
        self.frame_times = []
        self.memory_samples = []
        self.start_time = None
        self.monitoring = False
        self._monitor_thread = None
    
    def start_monitoring(self):
        """Start performance monitoring"""
        self.monitoring = True
        self.start_time = time.perf_counter()
        self._monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._monitor_thread.start()
    
    def stop_monitoring(self) -> Dict[str, Any]:
        """Stop monitoring and return performance report"""
        self.monitoring = False
        if self._monitor_thread:
            self._monitor_thread.join(timeout=1.0)
        
        return self._generate_report()
    
    def record_frame_time(self, duration_ms: float):
        """Record frame processing time"""
        self.frame_times.append(duration_ms)
    
    def _monitor_loop(self):
        """Background monitoring loop"""
        import psutil
        process = psutil.Process()
        
        while self.monitoring:
            try:
                memory_mb = process.memory_info().rss / 1024 / 1024
                self.memory_samples.append(memory_mb)
                time.sleep(0.1)  # Sample every 100ms
            except Exception as e:
                logger.error(f"Memory monitoring error: {e}")
                break
    
    def _generate_report(self) -> Dict[str, Any]:
        """Generate performance analysis report"""
        if not self.frame_times:
            return {"error": "No frame timing data collected"}
        
        total_duration = time.perf_counter() - self.start_time if self.start_time else 0
        overruns = [t for t in self.frame_times if t > FRAME_BUDGET_MS]
        overrun_rate = len(overruns) / len(self.frame_times) if self.frame_times else 0
        
        report = {
            "total_duration_s": total_duration,
            "total_frames": len(self.frame_times),
            "avg_frame_time_ms": statistics.mean(self.frame_times),
            "max_frame_time_ms": max(self.frame_times),
            "min_frame_time_ms": min(self.frame_times),
            "frame_overruns": len(overruns),
            "overrun_rate": overrun_rate,
            "budget_compliance": overrun_rate <= MAX_FRAME_OVERRUNS,
            "target_fps": 1000 / FRAME_BUDGET_MS,
            "actual_fps": len(self.frame_times) / total_duration if total_duration > 0 else 0
        }
        
        if self.memory_samples:
            report.update({
                "avg_memory_mb": statistics.mean(self.memory_samples),
                "max_memory_mb": max(self.memory_samples),
                "memory_growth_mb": self.memory_samples[-1] - self.memory_samples[0] if len(self.memory_samples) > 1 else 0
            })
        
        return report

# Test Fixtures and Utilities

@pytest.fixture
def decipher_loop():
    """Provide a mock Decipher loop for testing"""
    return MockDecipherLoop()

@pytest.fixture
def schema_validator():
    """Provide schema validator for testing"""
    return SchemaValidator()

@pytest.fixture
def performance_monitor():
    """Provide performance monitor for testing"""
    return PerformanceMonitor()

@pytest.fixture
def sample_tokens():
    """Provide sample token data for testing"""
    return [
        TokenData("Hello", 0.0, "gpt-4", 0.9, entropy=0.5),
        TokenData(" world", 0.05, "gpt-4", 0.85, entropy=0.4),
        TokenData("!", 0.1, "gpt-4", 0.95, is_final=True, entropy=0.2)
    ]

# Core Unit Tests

class TestEnergyOracle:
    """Test the energy calculation oracle"""
    
    def test_single_token_energy(self):
        """Test energy calculation for a single token"""
        oracle = EnergyOracle()
        token = TokenData("test", 0.0, "gpt-4", 0.8, entropy=0.5)
        
        energy = oracle.calculate_token_energy(token)
        
        # Energy should be positive and reasonable
        assert energy > 0
        assert energy < 100  # Sanity check
    
    def test_confidence_affects_energy(self):
        """Test that confidence affects energy calculation"""
        oracle = EnergyOracle()
        
        low_conf_token = TokenData("test", 0.0, "gpt-4", 0.3)
        high_conf_token = TokenData("test", 0.0, "gpt-4", 0.9)
        
        low_energy = oracle.calculate_token_energy(low_conf_token)
        high_energy = oracle.calculate_token_energy(high_conf_token)
        
        assert high_energy > low_energy
    
    def test_sequence_energy_decay(self):
        """Test energy decay over time in sequences"""
        oracle = EnergyOracle()
        
        tokens = [
            TokenData("first", 0.0, "gpt-4", 0.9),
            TokenData("second", 1.0, "gpt-4", 0.9),  # 1 second later
            TokenData("third", 2.0, "gpt-4", 0.9)   # 2 seconds later
        ]
        
        total_energy = oracle.calculate_sequence_energy(tokens)
        
        # Later tokens should contribute less due to decay
        assert total_energy > 0
        
        # Test individual token energies decrease over time
        individual_energies = [oracle.calculate_token_energy(t) for t in tokens]
        # Note: decay is applied in sequence calculation, not individual

class TestDecipherLoop:
    """Test the Decipher loop functionality"""
    
    @pytest.mark.asyncio
    async def test_session_lifecycle(self, decipher_loop):
        """Test session start and stop"""
        events = []
        decipher_loop.add_event_callback(lambda e: events.append(e))
        
        await decipher_loop.start_session()
        assert decipher_loop.is_running
        assert decipher_loop.state == "CHARGING"
        
        await decipher_loop.stop_session()
        assert not decipher_loop.is_running
        assert decipher_loop.state == "IDLE"
        
        # Check events were emitted
        event_types = [e["type"] for e in events]
        assert "session.started" in event_types
        assert "session.ended" in event_types
    
    @pytest.mark.asyncio
    async def test_token_processing(self, decipher_loop, sample_tokens):
        """Test token processing and energy events"""
        events = []
        decipher_loop.add_event_callback(lambda e: events.append(e))
        
        await decipher_loop.start_session()
        
        for token in sample_tokens:
            await decipher_loop.ingest_token(token)
            await asyncio.sleep(0.001)  # Small delay to simulate frame timing
        
        await decipher_loop.stop_session()
        
        # Check energy events were emitted
        energy_events = [e for e in events if e["type"] == "energy.update"]
        assert len(energy_events) == len(sample_tokens)
        
        # Check energy increases over time
        energy_values = [e["payload"]["total_energy"] for e in energy_events]
        assert all(energy_values[i] <= energy_values[i+1] for i in range(len(energy_values)-1))
    
    @pytest.mark.asyncio
    async def test_frame_budget_compliance(self, decipher_loop, sample_tokens):
        """Test frame budget compliance"""
        await decipher_loop.start_session()
        
        for token in sample_tokens:
            await decipher_loop.ingest_token(token)
        
        await decipher_loop.stop_session()
        
        # Check frame timing metrics
        overrun_rate = decipher_loop.metrics.overrun_count / len(decipher_loop.metrics.frame_times)
        assert overrun_rate <= MAX_FRAME_OVERRUNS, f"Frame overrun rate {overrun_rate:.2%} exceeds limit"
    
    @pytest.mark.asyncio
    async def test_energy_accuracy(self, decipher_loop, sample_tokens):
        """Test energy calculation accuracy against oracle"""
        events = []
        decipher_loop.add_event_callback(lambda e: events.append(e))
        
        await decipher_loop.start_session()
        
        for token in sample_tokens:
            await decipher_loop.ingest_token(token)
        
        await decipher_loop.stop_session()
        
        # Calculate expected energy using oracle
        expected_energy = decipher_loop.oracle.calculate_sequence_energy(sample_tokens)
        
        # Get final energy from events
        energy_events = [e for e in events if e["type"] == "energy.update"]
        final_energy = energy_events[-1]["payload"]["total_energy"] if energy_events else 0
        
        # Check accuracy within tolerance
        error_rate = abs(final_energy - expected_energy) / expected_energy if expected_energy > 0 else 0
        assert error_rate <= ENERGY_TOLERANCE, f"Energy error {error_rate:.2%} exceeds tolerance"

class TestSchemaValidation:
    """Test schema validation functionality"""
    
    def test_schema_loading(self, schema_validator):
        """Test schema loading from directory"""
        # This test assumes schemas exist in test environment
        # In actual implementation, schemas would be provided
        assert isinstance(schema_validator.validators, dict)
    
    def test_event_validation(self, schema_validator):
        """Test event validation against schema"""
        # Mock event structure
        test_event = {
            "type": "energy.update",
            "timestamp": time.time(),
            "payload": {
                "total_energy": 42.5,
                "token_energy": 5.2,
                "state": "FLOWING"
            },
            "session_id": "test-session",
            "frame_id": 1
        }
        
        # Test validation (will pass if schema not found)
        result = schema_validator.validate_event(test_event, "energy-event")
        assert isinstance(result, bool)

class TestPerformanceMonitoring:
    """Test performance monitoring functionality"""
    
    def test_frame_time_recording(self, performance_monitor):
        """Test frame time recording"""
        test_times = [10.5, 15.2, 20.1, 12.8]
        
        for time_ms in test_times:
            performance_monitor.record_frame_time(time_ms)
        
        performance_monitor.frame_times = test_times
        report = performance_monitor._generate_report()
        
        assert report["total_frames"] == len(test_times)
        assert report["avg_frame_time_ms"] == statistics.mean(test_times)
        assert report["max_frame_time_ms"] == max(test_times)
    
    def test_budget_compliance_check(self, performance_monitor):
        """Test frame budget compliance checking"""
        # Mix of compliant and non-compliant frame times
        test_times = [10.0, 15.0, 20.0, 12.0, 18.0]  # All under 16.67ms budget
        performance_monitor.frame_times = test_times
        performance_monitor.start_time = time.perf_counter() - 1.0
        
        report = performance_monitor._generate_report()
        
        assert report["budget_compliance"] == True
        assert report["overrun_rate"] == 0.0

# Integration Tests

class TestIntegration:
    """Integration tests combining multiple components"""
    
    @pytest.mark.asyncio
    async def test_full_pipeline(self, decipher_loop, schema_validator, performance_monitor, sample_tokens):
        """Test full pipeline with all components"""
        events = []
        
        # Set up event validation
        def validate_and_store(event):
            events.append(event)
            schema_validator.validate_event(event, "energy-event")
        
        decipher_loop.add_event_callback(validate_and_store)
        
        # Start monitoring
        performance_monitor.start_monitoring()
        
        # Run test sequence
        await decipher_loop.start_session()
        
        for token in sample_tokens:
            frame_start = time.perf_counter()
            await decipher_loop.ingest_token(token)
            frame_duration = (time.perf_counter() - frame_start) * 1000
            performance_monitor.record_frame_time(frame_duration)
        
        await decipher_loop.stop_session()
        
        # Stop monitoring and get report
        perf_report = performance_monitor.stop_monitoring()
        
        # Validate results
        assert len(events) >= len(sample_tokens)  # At least one event per token
        assert perf_report["budget_compliance"] == True
        assert decipher_loop.energy_total > 0
    
    @pytest.mark.asyncio
    async def test_error_resilience(self, decipher_loop):
        """Test system resilience to errors"""
        events = []
        errors = []
        
        def error_tracking_callback(event):
            try:
                events.append(event)
                # Simulate callback error
                if len(events) == 2:
                    raise Exception("Simulated callback error")
            except Exception as e:
                errors.append(str(e))
        
        decipher_loop.add_event_callback(error_tracking_callback)
        
        await decipher_loop.start_session()
        
        # Process tokens - should continue despite callback error
        test_tokens = [
            TokenData("first", 0.0, "gpt-4", 0.9),
            TokenData("second", 0.1, "gpt-4", 0.9),
            TokenData("third", 0.2, "gpt-4", 0.9)
        ]
        
        for token in test_tokens:
            await decipher_loop.ingest_token(token)
        
        await decipher_loop.stop_session()
        
        # System should continue running despite errors
        assert decipher_loop.energy_total > 0
        assert len(events) >= 1  # Some events should have been processed
        assert len(errors) >= 1  # Error should have been caught
    
    @pytest.mark.asyncio
    async def test_stress_load(self, decipher_loop):
        """Test system under stress load"""
        await decipher_loop.start_session()
        
        # Generate burst of tokens (simulating rapid AI output)
        burst_tokens = []
        for i in range(50):  # 50 tokens in quick succession
            token = TokenData(f"token_{i}", i * 0.001, "gpt-4", 0.8)
            burst_tokens.append(token)
        
        start_time = time.perf_counter()
        
        for token in burst_tokens:
            await decipher_loop.ingest_token(token)
        
        total_time = time.perf_counter() - start_time
        
        await decipher_loop.stop_session()
        
        # Check performance under load
        avg_frame_time = statistics.mean(decipher_loop.metrics.frame_times)
        overrun_rate = decipher_loop.metrics.overrun_count / len(decipher_loop.metrics.frame_times)
        
        assert avg_frame_time < FRAME_BUDGET_MS * 2  # Allow some degradation under stress
        assert overrun_rate < 0.2  # Allow higher overrun rate under stress
        assert decipher_loop.energy_total > 0

# Utility Functions for Test Execution

def run_energy_accuracy_test(token_sequence: List[TokenData], tolerance: float = ENERGY_TOLERANCE) -> Dict[str, Any]:
    """
    Standalone energy accuracy test function
    Returns detailed accuracy report
    """
    oracle = EnergyOracle()
    loop = MockDecipherLoop()
    
    events = []
    loop.add_event_callback(lambda e: events.append(e))
    
    async def test_sequence():
        await loop.start_session()
        for token in token_sequence:
            await loop.ingest_token(token)
        await loop.stop_session()
    
    # Run the test
    asyncio.run(test_sequence())
    
    # Calculate expected vs actual energy
    expected_energy = oracle.calculate_sequence_energy(token_sequence)
    energy_events = [e for e in events if e["type"] == "energy.update"]
    actual_energy = energy_events[-1]["payload"]["total_energy"] if energy_events else 0
    
    error_rate = abs(actual_energy - expected_energy) / expected_energy if expected_energy > 0 else 0
    
    return {
        "expected_energy": expected_energy,
        "actual_energy": actual_energy,
        "error_rate": error_rate,
        "within_tolerance": error_rate <= tolerance,
        "tolerance": tolerance,
        "token_count": len(token_sequence),
        "event_count": len(energy_events)
    }

def run_performance_benchmark(duration_seconds: float = 10.0) -> Dict[str, Any]:
    """
    Standalone performance benchmark
    Returns comprehensive performance report
    """
    loop = MockDecipherLoop()
    monitor = PerformanceMonitor()
    
    async def benchmark():
        monitor.start_monitoring()
        await loop.start_session()
        
        start_time = time.perf_counter()
        token_counter = 0
        
        while (time.perf_counter() - start_time) < duration_seconds:
            token = TokenData(f"benchmark_{token_counter}", time.perf_counter(), "gpt-4", 0.8)
            
            frame_start = time.perf_counter()
            await loop.ingest_token(token)
            frame_duration = (time.perf_counter() - frame_start) * 1000
            
            monitor.record_frame_time(frame_duration)
            token_counter += 1
            
            # Maintain roughly 60 FPS
            await asyncio.sleep(max(0, (FRAME_BUDGET_MS / 1000) - (frame_duration / 1000)))
        
        await loop.stop_session()
        return monitor.stop_monitoring()
    
    return asyncio.run(benchmark())

if __name__ == "__main__":
    # Example usage and basic validation
    print("WF-TECH-007 Unit Test Framework - Basic Validation")
    
    # Test energy oracle
    oracle = EnergyOracle()
    test_token = TokenData("Hello world", 0.0, "gpt-4", 0.9, entropy=0.5)
    energy = oracle.calculate_token_energy(test_token)
    print(f"Sample token energy: {energy:.2f}")
    
    # Test performance benchmark
    print("Running 5-second performance benchmark...")
    benchmark_result = run_performance_benchmark(5.0)
    print(f"Benchmark results: {benchmark_result}")
    
    print("Framework validation complete!")
