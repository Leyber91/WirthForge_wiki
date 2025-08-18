"""
WF-UX-006 Performance Benchmarks Test Suite
Comprehensive performance testing and benchmarking for WIRTHFORGE optimization
"""

import time
import threading
import multiprocessing
import psutil
import statistics
import json
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import logging
import sys
import os

class BenchmarkCategory(Enum):
    """Benchmark test categories"""
    FRAME_TIMING = "frame_timing"
    CPU_PERFORMANCE = "cpu_performance"
    MEMORY_USAGE = "memory_usage"
    ADAPTATION_SPEED = "adaptation_speed"

@dataclass
class BenchmarkResult:
    """Individual benchmark test result"""
    name: str
    category: BenchmarkCategory
    duration_ms: float
    success: bool
    metrics: Dict[str, float]
    performance_score: Optional[float] = None
    notes: str = ""

@dataclass
class BenchmarkSuite:
    """Complete benchmark suite results"""
    suite_name: str
    timestamp: float
    total_tests: int
    passed_tests: int
    total_duration_ms: float
    overall_score: float
    results: List[BenchmarkResult]
    system_info: Dict[str, Any]

class PerformanceBenchmarks:
    """Comprehensive performance benchmark suite for WIRTHFORGE"""
    
    def __init__(self):
        self.frame_budget_ms = 16.67  # 60 FPS target
        self.results: List[BenchmarkResult] = []
        self.system_info = self._collect_system_info()
        self.logger = logging.getLogger(__name__)
    
    def _collect_system_info(self) -> Dict[str, Any]:
        """Collect system information for benchmark context"""
        return {
            "cpu_count": psutil.cpu_count(),
            "memory_total_gb": psutil.virtual_memory().total / (1024**3),
            "platform": sys.platform,
            "python_version": sys.version,
            "timestamp": time.time()
        }
    
    def run_all_benchmarks(self) -> BenchmarkSuite:
        """Run complete benchmark suite"""
        start_time = time.time()
        self.results = []
        
        self.logger.info("Starting performance benchmark suite")
        
        # Frame timing benchmarks
        self._run_frame_timing_benchmarks()
        
        # CPU performance benchmarks
        self._run_cpu_performance_benchmarks()
        
        # Memory usage benchmarks
        self._run_memory_usage_benchmarks()
        
        # Adaptation speed benchmarks
        self._run_adaptation_speed_benchmarks()
        
        # Calculate suite results
        total_duration = (time.time() - start_time) * 1000
        passed_tests = sum(1 for r in self.results if r.success)
        overall_score = self._calculate_overall_score()
        
        suite = BenchmarkSuite(
            suite_name="WF-UX-006 Performance Benchmarks",
            timestamp=start_time,
            total_tests=len(self.results),
            passed_tests=passed_tests,
            total_duration_ms=total_duration,
            overall_score=overall_score,
            results=self.results,
            system_info=self.system_info
        )
        
        self.logger.info(f"Benchmark suite completed: {passed_tests}/{len(self.results)} tests passed")
        return suite
    
    def _run_frame_timing_benchmarks(self) -> None:
        """Run frame timing performance benchmarks"""
        self.logger.info("Running frame timing benchmarks")
        
        # Basic frame timing test
        frame_times = []
        test_frames = 100
        
        start_time = time.perf_counter()
        
        for _ in range(test_frames):
            frame_start = time.perf_counter()
            
            # Simulate minimal frame work
            time.sleep(0.001)  # 1ms of work
            
            frame_end = time.perf_counter()
            frame_time_ms = (frame_end - frame_start) * 1000
            frame_times.append(frame_time_ms)
        
        total_time = (time.perf_counter() - start_time) * 1000
        
        avg_frame_time = statistics.mean(frame_times)
        max_frame_time = max(frame_times)
        frame_time_std = statistics.stdev(frame_times)
        
        # Performance score based on consistency and speed
        consistency_score = max(0, 100 - (frame_time_std * 10))
        speed_score = max(0, 100 - (avg_frame_time - 1.0) * 20)
        performance_score = (consistency_score + speed_score) / 2
        
        result = BenchmarkResult(
            name="basic_frame_timing",
            category=BenchmarkCategory.FRAME_TIMING,
            duration_ms=total_time,
            success=avg_frame_time < self.frame_budget_ms,
            metrics={
                "avg_frame_time_ms": avg_frame_time,
                "max_frame_time_ms": max_frame_time,
                "frame_time_std": frame_time_std,
                "frames_tested": test_frames
            },
            performance_score=performance_score
        )
        
        self.results.append(result)
        
        # Sustained frame rate test
        frame_times = []
        target_fps = 60
        test_duration = 3.0  # 3 seconds
        
        start_time = time.perf_counter()
        frame_count = 0
        
        while (time.perf_counter() - start_time) < test_duration:
            frame_start = time.perf_counter()
            
            # Simulate moderate frame work
            self._simulate_frame_work(5.0)  # 5ms of work
            
            frame_end = time.perf_counter()
            frame_time_ms = (frame_end - frame_start) * 1000
            frame_times.append(frame_time_ms)
            frame_count += 1
            
            # Target frame rate pacing
            target_frame_time = 1.0 / target_fps
            elapsed = frame_end - frame_start
            if elapsed < target_frame_time:
                time.sleep(target_frame_time - elapsed)
        
        total_time = (time.perf_counter() - start_time) * 1000
        actual_fps = frame_count / (total_time / 1000)
        avg_frame_time = statistics.mean(frame_times)
        overruns = sum(1 for ft in frame_times if ft > self.frame_budget_ms)
        
        # Performance score based on FPS achievement and overruns
        fps_score = min(100, (actual_fps / target_fps) * 100)
        overrun_penalty = (overruns / len(frame_times)) * 50
        performance_score = max(0, fps_score - overrun_penalty)
        
        result = BenchmarkResult(
            name="sustained_frame_rate",
            category=BenchmarkCategory.FRAME_TIMING,
            duration_ms=total_time,
            success=actual_fps >= (target_fps * 0.95),  # 95% of target
            metrics={
                "actual_fps": actual_fps,
                "target_fps": target_fps,
                "avg_frame_time_ms": avg_frame_time,
                "frame_overruns": overruns,
                "total_frames": frame_count
            },
            performance_score=performance_score
        )
        
        self.results.append(result)
    
    def _run_cpu_performance_benchmarks(self) -> None:
        """Run CPU performance benchmarks"""
        self.logger.info("Running CPU performance benchmarks")
        
        # CPU utilization efficiency test
        start_time = time.perf_counter()
        initial_cpu = psutil.cpu_percent(interval=1.0)
        
        # Perform CPU work
        work_duration = 2.0
        work_start = time.perf_counter()
        
        while (time.perf_counter() - work_start) < work_duration:
            # Simulate computational work
            result = sum(i * i for i in range(10000))
        
        final_cpu = psutil.cpu_percent(interval=1.0)
        total_time = (time.perf_counter() - start_time) * 1000
        
        cpu_increase = final_cpu - initial_cpu
        efficiency_score = min(100, cpu_increase * 2)  # Higher CPU usage = better efficiency
        
        result = BenchmarkResult(
            name="cpu_utilization_efficiency",
            category=BenchmarkCategory.CPU_PERFORMANCE,
            duration_ms=total_time,
            success=cpu_increase > 5.0,  # Should see CPU increase
            metrics={
                "initial_cpu_percent": initial_cpu,
                "final_cpu_percent": final_cpu,
                "cpu_increase": cpu_increase,
                "work_duration_s": work_duration
            },
            performance_score=efficiency_score
        )
        
        self.results.append(result)
        
        # Multithreading performance test
        def worker_task(work_size: int) -> float:
            start = time.perf_counter()
            result = sum(i * i for i in range(work_size))
            return time.perf_counter() - start
        
        work_size = 50000
        thread_counts = [1, 2, 4]
        results_by_threads = {}
        
        start_time = time.perf_counter()
        
        for thread_count in thread_counts:
            threads = []
            thread_start = time.perf_counter()
            
            for _ in range(thread_count):
                thread = threading.Thread(target=worker_task, args=(work_size // thread_count,))
                thread.start()
                threads.append(thread)
            
            for thread in threads:
                thread.join()
            
            thread_time = time.perf_counter() - thread_start
            results_by_threads[thread_count] = thread_time
        
        total_time = (time.perf_counter() - start_time) * 1000
        
        # Calculate scaling efficiency
        single_thread_time = results_by_threads[1]
        best_time = min(results_by_threads.values())
        scaling_efficiency = (single_thread_time / best_time) * 100
        
        result = BenchmarkResult(
            name="multithreading_performance",
            category=BenchmarkCategory.CPU_PERFORMANCE,
            duration_ms=total_time,
            success=scaling_efficiency > 120,  # Should see some improvement
            metrics={
                "single_thread_time_s": single_thread_time,
                "best_time_s": best_time,
                "scaling_efficiency": scaling_efficiency,
                "thread_results": results_by_threads
            },
            performance_score=min(100, scaling_efficiency / 2)
        )
        
        self.results.append(result)
    
    def _run_memory_usage_benchmarks(self) -> None:
        """Run memory usage benchmarks"""
        self.logger.info("Running memory usage benchmarks")
        
        import gc
        
        start_time = time.perf_counter()
        initial_memory = psutil.Process().memory_info().rss / (1024 * 1024)  # MB
        
        # Allocate and deallocate memory
        allocations = []
        allocation_count = 500
        allocation_size = 1024 * 1024  # 1MB each
        
        alloc_start = time.perf_counter()
        
        for _ in range(allocation_count):
            data = bytearray(allocation_size)
            allocations.append(data)
        
        alloc_time = time.perf_counter() - alloc_start
        peak_memory = psutil.Process().memory_info().rss / (1024 * 1024)
        
        # Deallocate
        dealloc_start = time.perf_counter()
        allocations.clear()
        gc.collect()
        dealloc_time = time.perf_counter() - dealloc_start
        
        final_memory = psutil.Process().memory_info().rss / (1024 * 1024)
        total_time = (time.perf_counter() - start_time) * 1000
        
        # Performance score based on allocation speed and cleanup
        alloc_speed_score = max(0, 100 - (alloc_time * 100))
        cleanup_score = max(0, 100 - ((final_memory - initial_memory) * 2))
        performance_score = (alloc_speed_score + cleanup_score) / 2
        
        result = BenchmarkResult(
            name="memory_allocation_performance",
            category=BenchmarkCategory.MEMORY_USAGE,
            duration_ms=total_time,
            success=alloc_time < 1.0 and (final_memory - initial_memory) < 100,
            metrics={
                "allocation_count": allocation_count,
                "allocation_size_mb": allocation_size / (1024 * 1024),
                "alloc_time_s": alloc_time,
                "dealloc_time_s": dealloc_time,
                "initial_memory_mb": initial_memory,
                "peak_memory_mb": peak_memory,
                "final_memory_mb": final_memory,
                "memory_leaked_mb": final_memory - initial_memory
            },
            performance_score=performance_score
        )
        
        self.results.append(result)
    
    def _run_adaptation_speed_benchmarks(self) -> None:
        """Run adaptation speed benchmarks"""
        self.logger.info("Running adaptation speed benchmarks")
        
        # Simulate quality adaptation response time
        start_time = time.perf_counter()
        
        # Simulate adaptation trigger detection
        detection_time = 0.002  # 2ms
        time.sleep(detection_time)
        
        # Simulate adaptation decision making
        decision_time = 0.003  # 3ms
        time.sleep(decision_time)
        
        # Simulate adaptation application
        application_time = 0.005  # 5ms
        time.sleep(application_time)
        
        total_adaptation_time = time.perf_counter() - start_time
        total_time_ms = total_adaptation_time * 1000
        
        # Performance score based on adaptation speed
        target_adaptation_time = 0.015  # 15ms target
        speed_score = max(0, 100 - ((total_adaptation_time - target_adaptation_time) * 1000))
        
        result = BenchmarkResult(
            name="adaptation_response_time",
            category=BenchmarkCategory.ADAPTATION_SPEED,
            duration_ms=total_time_ms,
            success=total_adaptation_time < target_adaptation_time,
            metrics={
                "total_adaptation_time_ms": total_time_ms,
                "target_time_ms": target_adaptation_time * 1000,
                "detection_time_ms": detection_time * 1000,
                "decision_time_ms": decision_time * 1000,
                "application_time_ms": application_time * 1000
            },
            performance_score=speed_score
        )
        
        self.results.append(result)
    
    def _simulate_frame_work(self, duration_ms: float) -> None:
        """Simulate frame processing work"""
        end_time = time.perf_counter() + (duration_ms / 1000.0)
        while time.perf_counter() < end_time:
            # Simulate computational work
            sum(i for i in range(100))
    
    def _calculate_overall_score(self) -> float:
        """Calculate overall benchmark suite score"""
        if not self.results:
            return 0.0
        
        scores = [r.performance_score for r in self.results if r.performance_score is not None]
        if not scores:
            return 0.0
        
        return statistics.mean(scores)
    
    def save_results(self, filename: str) -> None:
        """Save benchmark results to file"""
        suite = self.run_all_benchmarks()
        
        with open(filename, 'w') as f:
            json.dump(asdict(suite), f, indent=2, default=str)
        
        self.logger.info(f"Benchmark results saved to {filename}")

# Example usage
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    benchmarks = PerformanceBenchmarks()
    suite = benchmarks.run_all_benchmarks()
    
    print(f"Benchmark Suite: {suite.suite_name}")
    print(f"Total Tests: {suite.total_tests}")
    print(f"Passed: {suite.passed_tests}")
    print(f"Duration: {suite.total_duration_ms:.1f}ms")
    print(f"Overall Score: {suite.overall_score:.1f}")
    
    print("\nDetailed Results:")
    for result in suite.results:
        status = "PASS" if result.success else "FAIL"
        score = f"{result.performance_score:.1f}" if result.performance_score else "N/A"
        print(f"  {result.name}: {status} (Score: {score})")
    
    # Save results
    benchmarks.save_results("benchmark_results.json")
