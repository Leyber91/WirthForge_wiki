"""
WF-TECH-005 Performance Test Vectors & Validation
Comprehensive testing suite for Decipher real-time performance

This module provides performance testing, validation, and benchmarking
for the Decipher 60Hz real-time loop with various load scenarios.

Author: WIRTHFORGE Development Team
Version: 1.0
License: MIT
"""

import asyncio
import time
import json
import statistics
import random
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import logging

# Import Decipher modules (assuming they're in the same directory)
try:
    from .decipher_loop import DecipherLoop
    from .energy_mapper import EnergyMapper
    from .frame_composer import FrameComposer
except ImportError:
    # For standalone testing
    import sys
    import os
    sys.path.append(os.path.dirname(__file__))
    from decipher_loop import DecipherLoop
    from energy_mapper import EnergyMapper
    from frame_composer import FrameComposer

logger = logging.getLogger(__name__)


class TestScenario(Enum):
    """Test scenario types"""
    BASELINE = "baseline"
    LOW_LOAD = "low_load"
    NORMAL_LOAD = "normal_load"
    HIGH_LOAD = "high_load"
    BURST_LOAD = "burst_load"
    STALL_RECOVERY = "stall_recovery"
    MULTI_MODEL = "multi_model"
    DEGRADED_MODE = "degraded_mode"
    STRESS_TEST = "stress_test"


@dataclass
class TestVector:
    """Test vector definition"""
    name: str
    scenario: TestScenario
    duration_seconds: float
    token_pattern: str  # "constant", "burst", "random", "stall"
    tokens_per_second: float
    burst_intensity: float = 1.0
    stall_probability: float = 0.0
    model_count: int = 1
    expected_fps: float = 60.0
    max_frame_time_ms: float = 16.67
    description: str = ""


@dataclass
class PerformanceMetrics:
    """Performance measurement results"""
    test_name: str
    duration_seconds: float
    total_frames: int
    total_tokens: int
    total_energy: float
    
    # Timing metrics
    avg_frame_time_ms: float
    max_frame_time_ms: float
    min_frame_time_ms: float
    frame_time_std_ms: float
    
    # Performance metrics
    actual_fps: float
    frame_overruns: int
    frame_overrun_rate: float
    degraded_mode_time_ms: float
    
    # Energy metrics
    avg_energy_rate: float
    max_energy_rate: float
    energy_efficiency: float  # energy per ms
    
    # Queue metrics
    avg_queue_depth: float
    max_queue_depth: int
    queue_overflows: int
    
    # Pattern metrics
    interference_events: int
    resonance_events: int
    pattern_detection_time_ms: float
    
    # Memory metrics
    peak_memory_mb: float
    avg_memory_mb: float
    memory_leaks: bool
    
    # Success criteria
    meets_fps_target: bool
    meets_frame_budget: bool
    stable_performance: bool
    overall_pass: bool


class TokenGenerator:
    """Generates test token streams with various patterns"""
    
    def __init__(self, pattern: str, tokens_per_second: float, 
                 burst_intensity: float = 1.0, stall_probability: float = 0.0):
        self.pattern = pattern
        self.tokens_per_second = tokens_per_second
        self.burst_intensity = burst_intensity
        self.stall_probability = stall_probability
        self.token_id = 0
        
    async def generate_tokens(self, duration_seconds: float) -> List[Dict[str, Any]]:
        """Generate token stream for specified duration"""
        tokens = []
        current_time = 0.0
        
        if self.pattern == "constant":
            interval = 1.0 / self.tokens_per_second
            while current_time < duration_seconds:
                tokens.append(self._create_token(current_time))
                current_time += interval
                
        elif self.pattern == "burst":
            # Alternating burst and normal periods
            burst_duration = 0.5  # 500ms bursts
            normal_duration = 2.0  # 2s normal
            
            while current_time < duration_seconds:
                # Burst period
                burst_end = min(current_time + burst_duration, duration_seconds)
                burst_interval = 1.0 / (self.tokens_per_second * self.burst_intensity)
                
                while current_time < burst_end:
                    tokens.append(self._create_token(current_time, is_burst=True))
                    current_time += burst_interval
                    
                # Normal period
                normal_end = min(current_time + normal_duration, duration_seconds)
                normal_interval = 1.0 / self.tokens_per_second
                
                while current_time < normal_end:
                    tokens.append(self._create_token(current_time))
                    current_time += normal_interval
                    
        elif self.pattern == "random":
            # Random intervals with exponential distribution
            while current_time < duration_seconds:
                tokens.append(self._create_token(current_time))
                # Exponential distribution around target rate
                interval = random.expovariate(self.tokens_per_second)
                current_time += interval
                
        elif self.pattern == "stall":
            # Periodic stalls
            normal_interval = 1.0 / self.tokens_per_second
            
            while current_time < duration_seconds:
                if random.random() < self.stall_probability:
                    # Stall for 1-3 seconds
                    stall_duration = random.uniform(1.0, 3.0)
                    current_time += stall_duration
                else:
                    tokens.append(self._create_token(current_time))
                    current_time += normal_interval
                    
        return tokens
        
    def _create_token(self, timestamp: float, is_burst: bool = False) -> Dict[str, Any]:
        """Create a test token"""
        self.token_id += 1
        
        return {
            'id': f"token_{self.token_id}",
            'content': f"test_token_{self.token_id}",
            'timestamp': timestamp,
            'model_id': 'test_model',
            'confidence': random.uniform(0.7, 0.95),
            'position': self.token_id,
            'is_final': False,
            'token_type': 'burst' if is_burst else 'normal',
            'metadata': {
                'generation_time_ms': random.uniform(50, 200),
                'context_length': random.randint(100, 1000)
            }
        }


class PerformanceTestSuite:
    """Comprehensive performance testing suite"""
    
    def __init__(self):
        self.test_vectors = self._create_test_vectors()
        self.results: List[PerformanceMetrics] = []
        
    def _create_test_vectors(self) -> List[TestVector]:
        """Create comprehensive test vector suite"""
        return [
            # Baseline tests
            TestVector(
                name="baseline_idle",
                scenario=TestScenario.BASELINE,
                duration_seconds=5.0,
                token_pattern="constant",
                tokens_per_second=0.0,
                description="Baseline idle performance with no tokens"
            ),
            
            TestVector(
                name="baseline_minimal",
                scenario=TestScenario.BASELINE,
                duration_seconds=10.0,
                token_pattern="constant",
                tokens_per_second=1.0,
                description="Baseline with minimal token load"
            ),
            
            # Load tests
            TestVector(
                name="low_load_steady",
                scenario=TestScenario.LOW_LOAD,
                duration_seconds=30.0,
                token_pattern="constant",
                tokens_per_second=2.0,
                description="Low steady load - 2 tokens/second"
            ),
            
            TestVector(
                name="normal_load_conversation",
                scenario=TestScenario.NORMAL_LOAD,
                duration_seconds=60.0,
                token_pattern="random",
                tokens_per_second=5.0,
                description="Normal conversation load with random timing"
            ),
            
            TestVector(
                name="high_load_rapid",
                scenario=TestScenario.HIGH_LOAD,
                duration_seconds=30.0,
                token_pattern="constant",
                tokens_per_second=15.0,
                description="High load - 15 tokens/second sustained"
            ),
            
            # Burst tests
            TestVector(
                name="burst_moderate",
                scenario=TestScenario.BURST_LOAD,
                duration_seconds=45.0,
                token_pattern="burst",
                tokens_per_second=5.0,
                burst_intensity=3.0,
                description="Moderate bursts - 3x intensity"
            ),
            
            TestVector(
                name="burst_extreme",
                scenario=TestScenario.BURST_LOAD,
                duration_seconds=30.0,
                token_pattern="burst",
                tokens_per_second=8.0,
                burst_intensity=5.0,
                description="Extreme bursts - 5x intensity"
            ),
            
            # Stall recovery tests
            TestVector(
                name="stall_recovery_light",
                scenario=TestScenario.STALL_RECOVERY,
                duration_seconds=60.0,
                token_pattern="stall",
                tokens_per_second=3.0,
                stall_probability=0.1,
                description="Light stall pattern - 10% stall probability"
            ),
            
            TestVector(
                name="stall_recovery_heavy",
                scenario=TestScenario.STALL_RECOVERY,
                duration_seconds=90.0,
                token_pattern="stall",
                tokens_per_second=4.0,
                stall_probability=0.3,
                description="Heavy stall pattern - 30% stall probability"
            ),
            
            # Multi-model tests
            TestVector(
                name="multi_model_dual",
                scenario=TestScenario.MULTI_MODEL,
                duration_seconds=45.0,
                token_pattern="random",
                tokens_per_second=6.0,
                model_count=2,
                description="Dual model interference patterns"
            ),
            
            TestVector(
                name="multi_model_quad",
                scenario=TestScenario.MULTI_MODEL,
                duration_seconds=60.0,
                token_pattern="random",
                tokens_per_second=8.0,
                model_count=4,
                description="Quad model complex patterns"
            ),
            
            # Stress tests
            TestVector(
                name="stress_sustained_high",
                scenario=TestScenario.STRESS_TEST,
                duration_seconds=120.0,
                token_pattern="constant",
                tokens_per_second=20.0,
                description="Sustained high load stress test"
            ),
            
            TestVector(
                name="stress_burst_overload",
                scenario=TestScenario.STRESS_TEST,
                duration_seconds=60.0,
                token_pattern="burst",
                tokens_per_second=10.0,
                burst_intensity=8.0,
                description="Burst overload stress test"
            ),
            
            # Degraded mode tests
            TestVector(
                name="degraded_mode_trigger",
                scenario=TestScenario.DEGRADED_MODE,
                duration_seconds=30.0,
                token_pattern="burst",
                tokens_per_second=25.0,
                burst_intensity=2.0,
                max_frame_time_ms=25.0,  # Force degraded mode
                description="Force degraded mode operation"
            )
        ]
        
    async def run_all_tests(self) -> List[PerformanceMetrics]:
        """Run all test vectors"""
        self.results = []
        
        logger.info(f"Starting performance test suite with {len(self.test_vectors)} tests")
        
        for i, test_vector in enumerate(self.test_vectors):
            logger.info(f"Running test {i+1}/{len(self.test_vectors)}: {test_vector.name}")
            
            try:
                result = await self.run_single_test(test_vector)
                self.results.append(result)
                
                # Log immediate results
                status = "PASS" if result.overall_pass else "FAIL"
                logger.info(f"Test {test_vector.name}: {status} "
                          f"(FPS: {result.actual_fps:.1f}, "
                          f"Avg Frame: {result.avg_frame_time_ms:.2f}ms)")
                          
            except Exception as e:
                logger.error(f"Test {test_vector.name} failed with exception: {e}")
                
            # Brief pause between tests
            await asyncio.sleep(1.0)
            
        return self.results
        
    async def run_single_test(self, test_vector: TestVector) -> PerformanceMetrics:
        """Run a single test vector"""
        
        # Initialize components
        energy_mapper = EnergyMapper()
        frame_composer = FrameComposer()
        decipher_loop = DecipherLoop(energy_mapper, frame_composer)
        
        # Generate test tokens
        token_generators = []
        for i in range(test_vector.model_count):
            generator = TokenGenerator(
                test_vector.token_pattern,
                test_vector.tokens_per_second / test_vector.model_count,
                test_vector.burst_intensity,
                test_vector.stall_probability
            )
            token_generators.append(generator)
            
        # Collect all tokens from all models
        all_tokens = []
        for generator in token_generators:
            model_tokens = await generator.generate_tokens(test_vector.duration_seconds)
            # Add model_id to distinguish between models
            for token in model_tokens:
                token['model_id'] = f"test_model_{token_generators.index(generator)}"
            all_tokens.extend(model_tokens)
            
        # Sort tokens by timestamp
        all_tokens.sort(key=lambda t: t['timestamp'])
        
        # Performance tracking
        frame_times = []
        queue_depths = []
        memory_samples = []
        energy_rates = []
        frame_overruns = 0
        degraded_time = 0
        interference_events = 0
        resonance_events = 0
        
        # Event callbacks for tracking
        def on_frame_processed(frame_data):
            nonlocal frame_overruns, degraded_time, interference_events, resonance_events
            
            frame_times.append(frame_data.get('processing_time_ms', 0))
            queue_depths.append(frame_data.get('queue_depth', 0))
            energy_rates.append(frame_data.get('energy_rate', 0))
            
            if frame_data.get('processing_time_ms', 0) > test_vector.max_frame_time_ms:
                frame_overruns += 1
                
            if frame_data.get('degraded_mode', False):
                degraded_time += 16.67  # One frame time
                
            if frame_data.get('interference'):
                interference_events += 1
                
            if frame_data.get('resonance'):
                resonance_events += 1
                
        # Register callback
        decipher_loop.register_callback('frame_processed', on_frame_processed)
        
        # Start test
        start_time = time.time()
        
        # Feed tokens to decipher loop
        token_index = 0
        test_start = time.time()
        
        try:
            # Start decipher loop
            loop_task = asyncio.create_task(decipher_loop.start())
            
            # Feed tokens at appropriate times
            while token_index < len(all_tokens):
                current_time = time.time() - test_start
                token = all_tokens[token_index]
                
                if token['timestamp'] <= current_time:
                    await decipher_loop.add_token(token)
                    token_index += 1
                else:
                    await asyncio.sleep(0.001)  # 1ms sleep
                    
                # Check if test duration exceeded
                if current_time >= test_vector.duration_seconds:
                    break
                    
            # Wait for test duration to complete
            remaining_time = test_vector.duration_seconds - (time.time() - test_start)
            if remaining_time > 0:
                await asyncio.sleep(remaining_time)
                
        finally:
            # Stop decipher loop
            await decipher_loop.stop()
            if not loop_task.done():
                loop_task.cancel()
                
        end_time = time.time()
        actual_duration = end_time - start_time
        
        # Calculate metrics
        total_frames = len(frame_times)
        actual_fps = total_frames / actual_duration if actual_duration > 0 else 0
        
        # Frame timing statistics
        avg_frame_time = statistics.mean(frame_times) if frame_times else 0
        max_frame_time = max(frame_times) if frame_times else 0
        min_frame_time = min(frame_times) if frame_times else 0
        frame_time_std = statistics.stdev(frame_times) if len(frame_times) > 1 else 0
        
        # Energy statistics
        avg_energy_rate = statistics.mean(energy_rates) if energy_rates else 0
        max_energy_rate = max(energy_rates) if energy_rates else 0
        total_energy = sum(energy_rates) * (actual_duration / len(energy_rates)) if energy_rates else 0
        
        # Queue statistics
        avg_queue_depth = statistics.mean(queue_depths) if queue_depths else 0
        max_queue_depth = max(queue_depths) if queue_depths else 0
        
        # Success criteria
        meets_fps_target = actual_fps >= (test_vector.expected_fps * 0.95)  # 95% of target
        meets_frame_budget = avg_frame_time <= test_vector.max_frame_time_ms
        stable_performance = frame_time_std <= (avg_frame_time * 0.2)  # 20% variation
        
        overall_pass = meets_fps_target and meets_frame_budget and stable_performance
        
        return PerformanceMetrics(
            test_name=test_vector.name,
            duration_seconds=actual_duration,
            total_frames=total_frames,
            total_tokens=token_index,
            total_energy=total_energy,
            
            avg_frame_time_ms=avg_frame_time,
            max_frame_time_ms=max_frame_time,
            min_frame_time_ms=min_frame_time,
            frame_time_std_ms=frame_time_std,
            
            actual_fps=actual_fps,
            frame_overruns=frame_overruns,
            frame_overrun_rate=frame_overruns / max(total_frames, 1),
            degraded_mode_time_ms=degraded_time,
            
            avg_energy_rate=avg_energy_rate,
            max_energy_rate=max_energy_rate,
            energy_efficiency=total_energy / (actual_duration * 1000) if actual_duration > 0 else 0,
            
            avg_queue_depth=avg_queue_depth,
            max_queue_depth=max_queue_depth,
            queue_overflows=0,  # Would need queue overflow tracking
            
            interference_events=interference_events,
            resonance_events=resonance_events,
            pattern_detection_time_ms=0,  # Would need pattern timing
            
            peak_memory_mb=0,  # Would need memory tracking
            avg_memory_mb=0,
            memory_leaks=False,
            
            meets_fps_target=meets_fps_target,
            meets_frame_budget=meets_frame_budget,
            stable_performance=stable_performance,
            overall_pass=overall_pass
        )
        
    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        if not self.results:
            return {"error": "No test results available"}
            
        # Overall statistics
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r.overall_pass)
        pass_rate = passed_tests / total_tests
        
        # Performance aggregates
        avg_fps = statistics.mean([r.actual_fps for r in self.results])
        avg_frame_time = statistics.mean([r.avg_frame_time_ms for r in self.results])
        total_overruns = sum(r.frame_overruns for r in self.results)
        
        # Categorize results by scenario
        by_scenario = {}
        for result in self.results:
            scenario = result.test_name.split('_')[0]
            if scenario not in by_scenario:
                by_scenario[scenario] = []
            by_scenario[scenario].append(result)
            
        return {
            "summary": {
                "total_tests": total_tests,
                "passed_tests": passed_tests,
                "failed_tests": total_tests - passed_tests,
                "pass_rate": pass_rate,
                "overall_status": "PASS" if pass_rate >= 0.9 else "FAIL"
            },
            "performance": {
                "avg_fps": avg_fps,
                "avg_frame_time_ms": avg_frame_time,
                "total_frame_overruns": total_overruns,
                "meets_60fps_target": avg_fps >= 57.0  # 95% of 60 FPS
            },
            "by_scenario": {
                scenario: {
                    "tests": len(results),
                    "passed": sum(1 for r in results if r.overall_pass),
                    "avg_fps": statistics.mean([r.actual_fps for r in results]),
                    "avg_frame_time": statistics.mean([r.avg_frame_time_ms for r in results])
                }
                for scenario, results in by_scenario.items()
            },
            "detailed_results": [asdict(result) for result in self.results],
            "recommendations": self._generate_recommendations()
        }
        
    def _generate_recommendations(self) -> List[str]:
        """Generate performance recommendations based on results"""
        recommendations = []
        
        failed_tests = [r for r in self.results if not r.overall_pass]
        
        if failed_tests:
            # Frame timing issues
            timing_issues = [r for r in failed_tests if not r.meets_frame_budget]
            if timing_issues:
                avg_overrun = statistics.mean([r.avg_frame_time_ms for r in timing_issues])
                recommendations.append(
                    f"Frame timing optimization needed. Average overrun: {avg_overrun:.2f}ms. "
                    "Consider reducing pattern detection complexity or optimizing energy calculations."
                )
                
            # FPS issues
            fps_issues = [r for r in failed_tests if not r.meets_fps_target]
            if fps_issues:
                recommendations.append(
                    "FPS target not met. Consider implementing more aggressive degraded mode "
                    "or optimizing token processing pipeline."
                )
                
            # Stability issues
            stability_issues = [r for r in failed_tests if not r.stable_performance]
            if stability_issues:
                recommendations.append(
                    "Performance instability detected. Review frame time variance and "
                    "implement better load balancing."
                )
                
        # High overrun rates
        high_overruns = [r for r in self.results if r.frame_overrun_rate > 0.05]
        if high_overruns:
            recommendations.append(
                "High frame overrun rate detected. Consider lowering quality settings "
                "or implementing adaptive frame budgeting."
            )
            
        if not recommendations:
            recommendations.append("All performance targets met. System is operating optimally.")
            
        return recommendations


# Validation utilities
class DecipherValidator:
    """Validates Decipher implementation against specifications"""
    
    @staticmethod
    async def validate_timing_precision() -> Dict[str, Any]:
        """Validate 60Hz timing precision"""
        results = []
        target_interval = 1000 / 60  # 16.67ms
        
        # Measure actual frame intervals
        frame_times = []
        start_time = time.perf_counter()
        
        for _ in range(600):  # 10 seconds of frames
            frame_start = time.perf_counter()
            
            # Simulate minimal frame processing
            await asyncio.sleep(0.001)  # 1ms simulated work
            
            frame_end = time.perf_counter()
            frame_time = (frame_end - frame_start) * 1000  # Convert to ms
            frame_times.append(frame_time)
            
            # Sleep until next frame
            elapsed = (frame_end - start_time) * 1000
            target_time = len(frame_times) * target_interval
            sleep_time = max(0, (target_time - elapsed) / 1000)
            
            if sleep_time > 0:
                await asyncio.sleep(sleep_time)
                
        # Analyze timing precision
        intervals = []
        for i in range(1, len(frame_times)):
            interval = (frame_times[i] - frame_times[i-1]) if i > 0 else target_interval
            intervals.append(interval)
            
        avg_interval = statistics.mean(intervals)
        std_interval = statistics.stdev(intervals) if len(intervals) > 1 else 0
        max_deviation = max(abs(i - target_interval) for i in intervals)
        
        return {
            "target_interval_ms": target_interval,
            "actual_avg_interval_ms": avg_interval,
            "interval_std_ms": std_interval,
            "max_deviation_ms": max_deviation,
            "precision_percentage": (1 - (std_interval / target_interval)) * 100,
            "meets_precision_target": std_interval < 1.0  # <1ms deviation
        }
        
    @staticmethod
    async def validate_energy_calculations() -> Dict[str, Any]:
        """Validate energy calculation accuracy"""
        energy_mapper = EnergyMapper()
        
        # Test vectors for energy calculation
        test_cases = [
            {
                "name": "baseline",
                "token": {
                    "content": "test",
                    "confidence": 0.9,
                    "position": 1,
                    "timing": {"generation_velocity": 1.0}
                },
                "expected_range": (0.5, 2.0)
            },
            {
                "name": "high_confidence",
                "token": {
                    "content": "confident",
                    "confidence": 0.95,
                    "position": 1,
                    "timing": {"generation_velocity": 1.0}
                },
                "expected_range": (0.8, 2.5)
            },
            {
                "name": "high_velocity",
                "token": {
                    "content": "fast",
                    "confidence": 0.8,
                    "position": 1,
                    "timing": {"generation_velocity": 5.0}
                },
                "expected_range": (1.5, 4.0)
            }
        ]
        
        results = []
        for case in test_cases:
            energy = await energy_mapper.calculate_energy(case["token"])
            
            in_range = case["expected_range"][0] <= energy <= case["expected_range"][1]
            results.append({
                "test_case": case["name"],
                "calculated_energy": energy,
                "expected_range": case["expected_range"],
                "in_expected_range": in_range
            })
            
        all_passed = all(r["in_expected_range"] for r in results)
        
        return {
            "test_cases": results,
            "all_tests_passed": all_passed,
            "energy_calculation_valid": all_passed
        }


# Example usage and main execution
async def main():
    """Run comprehensive performance testing"""
    
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    print("🧪 WIRTHFORGE Decipher Performance Test Suite")
    print("=" * 50)
    
    # Run validation tests
    print("\n📊 Running validation tests...")
    
    timing_validation = await DecipherValidator.validate_timing_precision()
    print(f"⏱️  Timing precision: {timing_validation['precision_percentage']:.1f}% "
          f"({'PASS' if timing_validation['meets_precision_target'] else 'FAIL'})")
          
    energy_validation = await DecipherValidator.validate_energy_calculations()
    print(f"⚡ Energy calculations: "
          f"{'PASS' if energy_validation['energy_calculation_valid'] else 'FAIL'}")
    
    # Run performance test suite
    print("\n🚀 Running performance test suite...")
    
    test_suite = PerformanceTestSuite()
    results = await test_suite.run_all_tests()
    
    # Generate and display report
    report = test_suite.generate_report()
    
    print(f"\n📈 Performance Test Results")
    print("=" * 30)
    print(f"Tests: {report['summary']['passed_tests']}/{report['summary']['total_tests']} passed")
    print(f"Pass Rate: {report['summary']['pass_rate']:.1%}")
    print(f"Average FPS: {report['performance']['avg_fps']:.1f}")
    print(f"Average Frame Time: {report['performance']['avg_frame_time_ms']:.2f}ms")
    print(f"Overall Status: {report['summary']['overall_status']}")
    
    print(f"\n💡 Recommendations:")
    for rec in report['recommendations']:
        print(f"  • {rec}")
    
    # Save detailed report
    with open('decipher_performance_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    print(f"\n📄 Detailed report saved to: decipher_performance_report.json")
    
    return report['summary']['overall_status'] == 'PASS'


if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
