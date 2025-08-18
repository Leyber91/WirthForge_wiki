#!/usr/bin/env python3
"""
WF-TECH-007 Performance Benchmarking Suite
==========================================

Comprehensive performance benchmarking system for WIRTHFORGE.
Consolidates all performance testing capabilities with historical tracking,
comparative analysis, and automated performance regression detection.

Key Features:
- Multi-dimensional performance benchmarking
- Historical performance tracking
- Regression detection and alerting
- Performance profiling and analysis
- Automated performance reporting
- Benchmark comparison and trending
"""

import asyncio
import json
import logging
import statistics
import time
import psutil
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Callable
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor
import sqlite3
import hashlib

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class BenchmarkConfig:
    """Configuration for a performance benchmark."""
    name: str
    description: str
    category: str
    target_metric: str
    threshold_value: float
    threshold_operator: str  # "<=", ">=", "==", "<", ">"
    warmup_iterations: int = 5
    test_iterations: int = 20
    timeout_seconds: int = 300
    tags: List[str] = None

@dataclass
class BenchmarkResult:
    """Results from a performance benchmark execution."""
    benchmark_name: str
    category: str
    timestamp: str
    duration_seconds: float
    iterations: int
    metrics: Dict[str, float]
    statistics: Dict[str, float]
    passed: bool
    threshold_violations: List[str]
    system_info: Dict[str, Any]
    git_commit: Optional[str] = None

@dataclass
class SystemMetrics:
    """System resource metrics during benchmark execution."""
    cpu_percent: float
    memory_mb: float
    memory_percent: float
    disk_io_read_mb: float
    disk_io_write_mb: float
    network_sent_mb: float
    network_recv_mb: float
    timestamp: float

class PerformanceProfiler:
    """Profiles system resources during benchmark execution."""
    
    def __init__(self, sampling_interval: float = 0.1):
        self.sampling_interval = sampling_interval
        self.metrics: List[SystemMetrics] = []
        self.running = False
        self.thread: Optional[threading.Thread] = None
        
    def start_profiling(self):
        """Start resource profiling."""
        self.running = True
        self.metrics.clear()
        self.thread = threading.Thread(target=self._profile_loop)
        self.thread.start()
        
    def stop_profiling(self) -> List[SystemMetrics]:
        """Stop profiling and return collected metrics."""
        self.running = False
        if self.thread:
            self.thread.join()
        return self.metrics.copy()
        
    def _profile_loop(self):
        """Main profiling loop."""
        process = psutil.Process()
        last_disk_io = psutil.disk_io_counters()
        last_network_io = psutil.net_io_counters()
        
        while self.running:
            try:
                # CPU and Memory
                cpu_percent = psutil.cpu_percent()
                memory_info = process.memory_info()
                memory_percent = process.memory_percent()
                
                # Disk I/O
                current_disk_io = psutil.disk_io_counters()
                disk_read_mb = (current_disk_io.read_bytes - last_disk_io.read_bytes) / (1024 * 1024)
                disk_write_mb = (current_disk_io.write_bytes - last_disk_io.write_bytes) / (1024 * 1024)
                last_disk_io = current_disk_io
                
                # Network I/O
                current_network_io = psutil.net_io_counters()
                network_sent_mb = (current_network_io.bytes_sent - last_network_io.bytes_sent) / (1024 * 1024)
                network_recv_mb = (current_network_io.bytes_recv - last_network_io.bytes_recv) / (1024 * 1024)
                last_network_io = current_network_io
                
                metrics = SystemMetrics(
                    cpu_percent=cpu_percent,
                    memory_mb=memory_info.rss / (1024 * 1024),
                    memory_percent=memory_percent,
                    disk_io_read_mb=disk_read_mb,
                    disk_io_write_mb=disk_write_mb,
                    network_sent_mb=network_sent_mb,
                    network_recv_mb=network_recv_mb,
                    timestamp=time.time()
                )
                
                self.metrics.append(metrics)
                
            except Exception as e:
                logger.warning(f"Profiling error: {e}")
                
            time.sleep(self.sampling_interval)

class BenchmarkDatabase:
    """SQLite database for storing benchmark results and history."""
    
    def __init__(self, db_path: str = "benchmark_results.db"):
        self.db_path = db_path
        self._init_database()
        
    def _init_database(self):
        """Initialize database schema."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS benchmark_results (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    benchmark_name TEXT NOT NULL,
                    category TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    duration_seconds REAL NOT NULL,
                    iterations INTEGER NOT NULL,
                    metrics TEXT NOT NULL,
                    statistics TEXT NOT NULL,
                    passed BOOLEAN NOT NULL,
                    threshold_violations TEXT NOT NULL,
                    system_info TEXT NOT NULL,
                    git_commit TEXT
                )
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_benchmark_name_timestamp 
                ON benchmark_results(benchmark_name, timestamp)
            """)
            
    def store_result(self, result: BenchmarkResult):
        """Store benchmark result in database."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO benchmark_results (
                    benchmark_name, category, timestamp, duration_seconds,
                    iterations, metrics, statistics, passed,
                    threshold_violations, system_info, git_commit
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                result.benchmark_name,
                result.category,
                result.timestamp,
                result.duration_seconds,
                result.iterations,
                json.dumps(result.metrics),
                json.dumps(result.statistics),
                result.passed,
                json.dumps(result.threshold_violations),
                json.dumps(result.system_info),
                result.git_commit
            ))
            
    def get_historical_results(self, benchmark_name: str, days: int = 30) -> List[BenchmarkResult]:
        """Get historical results for a benchmark."""
        cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT * FROM benchmark_results 
                WHERE benchmark_name = ? AND timestamp >= ?
                ORDER BY timestamp DESC
            """, (benchmark_name, cutoff_date))
            
            results = []
            for row in cursor.fetchall():
                result = BenchmarkResult(
                    benchmark_name=row[1],
                    category=row[2],
                    timestamp=row[3],
                    duration_seconds=row[4],
                    iterations=row[5],
                    metrics=json.loads(row[6]),
                    statistics=json.loads(row[7]),
                    passed=bool(row[8]),
                    threshold_violations=json.loads(row[9]),
                    system_info=json.loads(row[10]),
                    git_commit=row[11]
                )
                results.append(result)
                
            return results

class PerformanceBenchmarkSuite:
    """Main performance benchmarking suite."""
    
    def __init__(self, db_path: str = "benchmark_results.db"):
        self.database = BenchmarkDatabase(db_path)
        self.profiler = PerformanceProfiler()
        self.benchmarks: Dict[str, BenchmarkConfig] = {}
        self.results: List[BenchmarkResult] = []
        
        # Load default benchmarks
        self._load_default_benchmarks()
        
    def _load_default_benchmarks(self):
        """Load default WIRTHFORGE performance benchmarks."""
        default_benchmarks = [
            BenchmarkConfig(
                name="frame_budget_compliance",
                description="60Hz frame budget compliance (16.67ms)",
                category="performance",
                target_metric="avg_frame_time_ms",
                threshold_value=16.67,
                threshold_operator="<=",
                warmup_iterations=10,
                test_iterations=60,
                tags=["frame-rate", "ui", "critical"]
            ),
            BenchmarkConfig(
                name="energy_calculation_performance",
                description="Energy calculation throughput",
                category="computation",
                target_metric="calculations_per_second",
                threshold_value=10000.0,
                threshold_operator=">=",
                warmup_iterations=5,
                test_iterations=20,
                tags=["energy", "computation", "core"]
            ),
            BenchmarkConfig(
                name="websocket_latency",
                description="WebSocket communication latency",
                category="network",
                target_metric="avg_latency_ms",
                threshold_value=10.0,
                threshold_operator="<=",
                warmup_iterations=5,
                test_iterations=100,
                tags=["websocket", "network", "realtime"]
            ),
            BenchmarkConfig(
                name="memory_efficiency",
                description="Memory usage efficiency",
                category="memory",
                target_metric="memory_mb_per_session",
                threshold_value=50.0,
                threshold_operator="<=",
                warmup_iterations=3,
                test_iterations=10,
                tags=["memory", "efficiency", "scalability"]
            ),
            BenchmarkConfig(
                name="ui_responsiveness",
                description="UI interaction responsiveness",
                category="ui",
                target_metric="interaction_response_ms",
                threshold_value=100.0,
                threshold_operator="<=",
                warmup_iterations=5,
                test_iterations=50,
                tags=["ui", "responsiveness", "ux"]
            ),
            BenchmarkConfig(
                name="concurrent_user_handling",
                description="Concurrent user session handling",
                category="scalability",
                target_metric="max_concurrent_users",
                threshold_value=100.0,
                threshold_operator=">=",
                warmup_iterations=2,
                test_iterations=5,
                tags=["scalability", "concurrency", "load"]
            ),
            BenchmarkConfig(
                name="visual_rendering_performance",
                description="Energy visualization rendering performance",
                category="graphics",
                target_metric="render_time_ms",
                threshold_value=8.0,
                threshold_operator="<=",
                warmup_iterations=10,
                test_iterations=30,
                tags=["graphics", "rendering", "visual"]
            ),
            BenchmarkConfig(
                name="data_processing_throughput",
                description="Real-time data processing throughput",
                category="data",
                target_metric="events_per_second",
                threshold_value=5000.0,
                threshold_operator=">=",
                warmup_iterations=3,
                test_iterations=15,
                tags=["data", "throughput", "realtime"]
            )
        ]
        
        for benchmark in default_benchmarks:
            self.benchmarks[benchmark.name] = benchmark
            
    async def run_benchmark(self, benchmark_name: str) -> BenchmarkResult:
        """Run a specific benchmark."""
        if benchmark_name not in self.benchmarks:
            raise ValueError(f"Benchmark '{benchmark_name}' not found")
            
        config = self.benchmarks[benchmark_name]
        logger.info(f"Running benchmark: {config.name}")
        
        # Get system info
        system_info = {
            "cpu_count": psutil.cpu_count(),
            "memory_total_gb": psutil.virtual_memory().total / (1024**3),
            "python_version": f"{psutil.PYTHON_VERSION}",
            "platform": psutil.PLATFORM
        }
        
        # Start profiling
        self.profiler.start_profiling()
        
        start_time = time.time()
        metrics_list = []
        threshold_violations = []
        
        try:
            # Warmup iterations
            logger.info(f"Warmup: {config.warmup_iterations} iterations")
            for _ in range(config.warmup_iterations):
                await self._execute_benchmark_iteration(config)
                
            # Test iterations
            logger.info(f"Testing: {config.test_iterations} iterations")
            for i in range(config.test_iterations):
                iteration_metrics = await self._execute_benchmark_iteration(config)
                metrics_list.append(iteration_metrics)
                
                if (i + 1) % 10 == 0:
                    logger.info(f"Completed {i + 1}/{config.test_iterations} iterations")
                    
        except Exception as e:
            logger.error(f"Benchmark execution failed: {e}")
            raise
            
        finally:
            # Stop profiling
            system_metrics = self.profiler.stop_profiling()
            
        duration = time.time() - start_time
        
        # Calculate statistics
        aggregated_metrics = self._aggregate_metrics(metrics_list)
        statistics = self._calculate_statistics(metrics_list, config.target_metric)
        
        # Check thresholds
        target_value = statistics.get(f"{config.target_metric}_mean", 0)
        passed = self._evaluate_threshold(
            target_value, config.threshold_value, config.threshold_operator
        )
        
        if not passed:
            threshold_violations.append(
                f"{config.target_metric}: {target_value} {config.threshold_operator} {config.threshold_value}"
            )
            
        # Add system resource statistics
        if system_metrics:
            cpu_usage = statistics.mean([m.cpu_percent for m in system_metrics])
            memory_usage = statistics.mean([m.memory_mb for m in system_metrics])
            aggregated_metrics.update({
                "avg_cpu_percent": cpu_usage,
                "avg_memory_mb": memory_usage,
                "max_memory_mb": max([m.memory_mb for m in system_metrics])
            })
            
        # Create result
        result = BenchmarkResult(
            benchmark_name=config.name,
            category=config.category,
            timestamp=datetime.now().isoformat(),
            duration_seconds=duration,
            iterations=config.test_iterations,
            metrics=aggregated_metrics,
            statistics=statistics,
            passed=passed,
            threshold_violations=threshold_violations,
            system_info=system_info,
            git_commit=self._get_git_commit()
        )
        
        # Store result
        self.database.store_result(result)
        self.results.append(result)
        
        logger.info(f"Benchmark '{config.name}' completed: {'PASSED' if passed else 'FAILED'}")
        return result
        
    async def _execute_benchmark_iteration(self, config: BenchmarkConfig) -> Dict[str, float]:
        """Execute a single benchmark iteration."""
        iteration_start = time.time()
        
        # Simulate different benchmark types
        if config.name == "frame_budget_compliance":
            metrics = await self._benchmark_frame_budget()
        elif config.name == "energy_calculation_performance":
            metrics = await self._benchmark_energy_calculation()
        elif config.name == "websocket_latency":
            metrics = await self._benchmark_websocket_latency()
        elif config.name == "memory_efficiency":
            metrics = await self._benchmark_memory_efficiency()
        elif config.name == "ui_responsiveness":
            metrics = await self._benchmark_ui_responsiveness()
        elif config.name == "concurrent_user_handling":
            metrics = await self._benchmark_concurrent_users()
        elif config.name == "visual_rendering_performance":
            metrics = await self._benchmark_visual_rendering()
        elif config.name == "data_processing_throughput":
            metrics = await self._benchmark_data_processing()
        else:
            # Generic benchmark
            await asyncio.sleep(0.01)  # Simulate work
            metrics = {"generic_metric": time.time() - iteration_start}
            
        iteration_time = time.time() - iteration_start
        metrics["iteration_time_ms"] = iteration_time * 1000
        
        return metrics
        
    async def _benchmark_frame_budget(self) -> Dict[str, float]:
        """Benchmark frame budget compliance."""
        frame_times = []
        
        for _ in range(60):  # 1 second at 60 FPS
            frame_start = time.time()
            
            # Simulate frame processing
            await asyncio.sleep(0.01)  # 10ms of work
            
            frame_time = (time.time() - frame_start) * 1000
            frame_times.append(frame_time)
            
        return {
            "avg_frame_time_ms": statistics.mean(frame_times),
            "max_frame_time_ms": max(frame_times),
            "frame_budget_violations": sum(1 for t in frame_times if t > 16.67)
        }
        
    async def _benchmark_energy_calculation(self) -> Dict[str, float]:
        """Benchmark energy calculation performance."""
        start_time = time.time()
        calculations = 0
        
        # Run calculations for 1 second
        end_time = start_time + 1.0
        while time.time() < end_time:
            # Simulate energy calculation
            result = sum(i * 1.414 for i in range(100))
            calculations += 1
            
        duration = time.time() - start_time
        
        return {
            "calculations_per_second": calculations / duration,
            "total_calculations": calculations
        }
        
    async def _benchmark_websocket_latency(self) -> Dict[str, float]:
        """Benchmark WebSocket communication latency."""
        # Simulate WebSocket round-trip
        latencies = []
        
        for _ in range(10):
            start = time.time()
            await asyncio.sleep(0.005)  # Simulate network latency
            latency = (time.time() - start) * 1000
            latencies.append(latency)
            
        return {
            "avg_latency_ms": statistics.mean(latencies),
            "max_latency_ms": max(latencies),
            "min_latency_ms": min(latencies)
        }
        
    async def _benchmark_memory_efficiency(self) -> Dict[str, float]:
        """Benchmark memory usage efficiency."""
        process = psutil.Process()
        initial_memory = process.memory_info().rss / (1024 * 1024)
        
        # Simulate session creation
        sessions = []
        for _ in range(10):
            session_data = {"data": list(range(1000))}
            sessions.append(session_data)
            
        final_memory = process.memory_info().rss / (1024 * 1024)
        memory_per_session = (final_memory - initial_memory) / 10
        
        # Cleanup
        del sessions
        
        return {
            "memory_mb_per_session": memory_per_session,
            "total_memory_mb": final_memory
        }
        
    async def _benchmark_ui_responsiveness(self) -> Dict[str, float]:
        """Benchmark UI interaction responsiveness."""
        response_times = []
        
        for _ in range(20):
            start = time.time()
            # Simulate UI interaction processing
            await asyncio.sleep(0.02)  # 20ms processing
            response_time = (time.time() - start) * 1000
            response_times.append(response_time)
            
        return {
            "interaction_response_ms": statistics.mean(response_times),
            "max_response_ms": max(response_times)
        }
        
    async def _benchmark_concurrent_users(self) -> Dict[str, float]:
        """Benchmark concurrent user handling."""
        max_users = 0
        
        # Simulate ramping up concurrent users
        for user_count in range(10, 201, 10):
            try:
                # Simulate user sessions
                tasks = []
                for _ in range(user_count):
                    task = asyncio.create_task(asyncio.sleep(0.1))
                    tasks.append(task)
                    
                await asyncio.gather(*tasks)
                max_users = user_count
                
            except Exception:
                break
                
        return {
            "max_concurrent_users": max_users,
            "user_ramp_success": max_users >= 100
        }
        
    async def _benchmark_visual_rendering(self) -> Dict[str, float]:
        """Benchmark visual rendering performance."""
        render_times = []
        
        for _ in range(20):
            start = time.time()
            # Simulate rendering work
            await asyncio.sleep(0.005)  # 5ms rendering
            render_time = (time.time() - start) * 1000
            render_times.append(render_time)
            
        return {
            "render_time_ms": statistics.mean(render_times),
            "max_render_time_ms": max(render_times)
        }
        
    async def _benchmark_data_processing(self) -> Dict[str, float]:
        """Benchmark data processing throughput."""
        start_time = time.time()
        events_processed = 0
        
        # Process events for 1 second
        end_time = start_time + 1.0
        while time.time() < end_time:
            # Simulate event processing
            for _ in range(100):
                events_processed += 1
                
        duration = time.time() - start_time
        
        return {
            "events_per_second": events_processed / duration,
            "total_events": events_processed
        }
        
    def _aggregate_metrics(self, metrics_list: List[Dict[str, float]]) -> Dict[str, float]:
        """Aggregate metrics from multiple iterations."""
        if not metrics_list:
            return {}
            
        aggregated = {}
        all_keys = set()
        for metrics in metrics_list:
            all_keys.update(metrics.keys())
            
        for key in all_keys:
            values = [m.get(key, 0) for m in metrics_list]
            aggregated[f"{key}_mean"] = statistics.mean(values)
            aggregated[f"{key}_median"] = statistics.median(values)
            aggregated[f"{key}_min"] = min(values)
            aggregated[f"{key}_max"] = max(values)
            if len(values) > 1:
                aggregated[f"{key}_stdev"] = statistics.stdev(values)
                
        return aggregated
        
    def _calculate_statistics(self, metrics_list: List[Dict[str, float]], target_metric: str) -> Dict[str, float]:
        """Calculate detailed statistics for benchmark results."""
        if not metrics_list:
            return {}
            
        stats = {}
        
        # Target metric statistics
        if target_metric in metrics_list[0]:
            values = [m[target_metric] for m in metrics_list]
            stats[f"{target_metric}_mean"] = statistics.mean(values)
            stats[f"{target_metric}_median"] = statistics.median(values)
            stats[f"{target_metric}_min"] = min(values)
            stats[f"{target_metric}_max"] = max(values)
            if len(values) > 1:
                stats[f"{target_metric}_stdev"] = statistics.stdev(values)
                stats[f"{target_metric}_variance"] = statistics.variance(values)
                
        # General statistics
        stats["total_iterations"] = len(metrics_list)
        
        return stats
        
    def _evaluate_threshold(self, value: float, threshold: float, operator: str) -> bool:
        """Evaluate threshold condition."""
        if operator == "<=":
            return value <= threshold
        elif operator == ">=":
            return value >= threshold
        elif operator == "==":
            return abs(value - threshold) < 0.001
        elif operator == "!=":
            return abs(value - threshold) >= 0.001
        elif operator == "<":
            return value < threshold
        elif operator == ">":
            return value > threshold
        else:
            logger.warning(f"Unknown operator: {operator}")
            return True
            
    def _get_git_commit(self) -> Optional[str]:
        """Get current git commit hash."""
        try:
            import subprocess
            result = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                return result.stdout.strip()
        except Exception:
            pass
        return None
        
    async def run_all_benchmarks(self) -> List[BenchmarkResult]:
        """Run all configured benchmarks."""
        logger.info(f"Running {len(self.benchmarks)} benchmarks")
        
        results = []
        for benchmark_name in self.benchmarks:
            try:
                result = await self.run_benchmark(benchmark_name)
                results.append(result)
            except Exception as e:
                logger.error(f"Benchmark {benchmark_name} failed: {e}")
                
        return results
        
    def generate_performance_report(self) -> Dict[str, Any]:
        """Generate comprehensive performance report."""
        if not self.results:
            return {"error": "No benchmark results available"}
            
        total_benchmarks = len(self.results)
        passed_benchmarks = sum(1 for r in self.results if r.passed)
        
        # Category breakdown
        categories = {}
        for result in self.results:
            if result.category not in categories:
                categories[result.category] = {"total": 0, "passed": 0}
            categories[result.category]["total"] += 1
            if result.passed:
                categories[result.category]["passed"] += 1
                
        # Performance trends (requires historical data)
        trends = {}
        for result in self.results:
            historical = self.database.get_historical_results(result.benchmark_name, 30)
            if len(historical) > 1:
                recent_values = [h.metrics.get(f"{self.benchmarks[result.benchmark_name].target_metric}_mean", 0) 
                               for h in historical[:5]]
                if recent_values:
                    trend_direction = "improving" if recent_values[0] < recent_values[-1] else "degrading"
                    trends[result.benchmark_name] = {
                        "direction": trend_direction,
                        "recent_average": statistics.mean(recent_values)
                    }
                    
        report = {
            "summary": {
                "total_benchmarks": total_benchmarks,
                "passed_benchmarks": passed_benchmarks,
                "success_rate": passed_benchmarks / total_benchmarks if total_benchmarks > 0 else 0,
                "execution_timestamp": datetime.now().isoformat()
            },
            "category_breakdown": categories,
            "performance_trends": trends,
            "benchmark_results": [asdict(result) for result in self.results],
            "system_info": self.results[0].system_info if self.results else {}
        }
        
        return report
        
    def save_report(self, filepath: str):
        """Save performance report to file."""
        report = self.generate_performance_report()
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        
        with open(filepath, 'w') as f:
            json.dump(report, f, indent=2)
            
        logger.info(f"Performance report saved to {filepath}")

# Main execution
if __name__ == "__main__":
    async def main():
        """Main benchmark execution."""
        suite = PerformanceBenchmarkSuite()
        
        print("WIRTHFORGE Performance Benchmark Suite")
        print("=" * 50)
        
        # Run all benchmarks
        results = await suite.run_all_benchmarks()
        
        # Generate and save report
        suite.save_report("reports/performance_benchmark_report.json")
        
        # Print summary
        passed = sum(1 for r in results if r.passed)
        total = len(results)
        
        print(f"\nBenchmark Summary:")
        print(f"Total: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {passed/total*100:.1f}%")
        
        # Print failed benchmarks
        failed = [r for r in results if not r.passed]
        if failed:
            print(f"\nFailed Benchmarks:")
            for result in failed:
                print(f"- {result.benchmark_name}: {result.threshold_violations}")
                
    asyncio.run(main())
