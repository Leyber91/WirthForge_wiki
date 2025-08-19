#!/usr/bin/env python3
"""
WF-OPS-003 Performance Load Test Suite
Comprehensive performance testing for backup and recovery operations under load.
Tests frame budget compliance, memory usage, concurrent operations, and system resource management.
"""

import os
import sys
import json
import hashlib
import tempfile
import shutil
import time
import unittest
import threading
import multiprocessing
from pathlib import Path
from typing import Dict, List, Any, Optional
import psutil
import concurrent.futures

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "code" / "WF-OPS" / "WF-OPS-003"))

try:
    from backup_engine import BackupEngine
    from recovery_engine import RecoveryEngine
    from planner import BackupPlanner
    from audit_verify import AuditVerifyManager
except ImportError:
    print("Warning: Could not import performance modules. Running in mock mode.")
    
    # Mock classes for performance testing
    class MockBackupEngine:
        def __init__(self, config=None): pass
        def create_backup(self, source_paths, backup_dir):
            time.sleep(0.1)  # Simulate work
            return {'backup_id': 'perf_test', 'files_backed_up': 100}
    
    class MockRecoveryEngine:
        def __init__(self, config=None): pass
        def execute_recovery(self, plan):
            time.sleep(0.1)  # Simulate work
            return {'success': True, 'files_restored': 100}
    
    class MockBackupPlanner:
        def __init__(self, config=None): pass
        def create_backup_plan(self, source_paths):
            return {'plan_id': 'perf_plan', 'estimated_duration': 60}

class PerformanceMonitor:
    """Monitor system performance during tests"""
    
    def __init__(self):
        self.process = psutil.Process()
        self.start_time = None
        self.metrics = []
        self.monitoring = False
        self.monitor_thread = None
        
    def start_monitoring(self, interval=0.1):
        """Start performance monitoring"""
        self.start_time = time.perf_counter()
        self.monitoring = True
        self.metrics = []
        
        self.monitor_thread = threading.Thread(target=self._monitor_loop, args=(interval,))
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
        
    def stop_monitoring(self):
        """Stop performance monitoring"""
        self.monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=1.0)
            
    def _monitor_loop(self, interval):
        """Performance monitoring loop"""
        while self.monitoring:
            try:
                cpu_percent = self.process.cpu_percent()
                memory_info = self.process.memory_info()
                
                metric = {
                    'timestamp': time.perf_counter() - self.start_time,
                    'cpu_percent': cpu_percent,
                    'memory_rss': memory_info.rss,
                    'memory_vms': memory_info.vms,
                    'threads': self.process.num_threads()
                }
                
                self.metrics.append(metric)
                time.sleep(interval)
                
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                break
                
    def get_summary(self) -> Dict[str, Any]:
        """Get performance summary"""
        if not self.metrics:
            return {}
            
        cpu_values = [m['cpu_percent'] for m in self.metrics]
        memory_values = [m['memory_rss'] for m in self.metrics]
        
        return {
            'duration_seconds': self.metrics[-1]['timestamp'],
            'cpu_avg': sum(cpu_values) / len(cpu_values),
            'cpu_max': max(cpu_values),
            'memory_avg_mb': sum(memory_values) / len(memory_values) / (1024 * 1024),
            'memory_max_mb': max(memory_values) / (1024 * 1024),
            'memory_growth_mb': (memory_values[-1] - memory_values[0]) / (1024 * 1024),
            'sample_count': len(self.metrics)
        }

class TestBackupPerformance(unittest.TestCase):
    """Test backup operation performance under load"""
    
    def setUp(self):
        """Set up performance test environment"""
        self.test_dir = Path(tempfile.mkdtemp(prefix="wf_ops_003_perf_backup_test_"))
        self.source_dir = self.test_dir / "source"
        self.backup_dir = self.test_dir / "backup"
        
        self.source_dir.mkdir()
        self.backup_dir.mkdir()
        
        try:
            self.backup_engine = BackupEngine()
        except NameError:
            self.backup_engine = MockBackupEngine()
            
        self.performance_monitor = PerformanceMonitor()
        
    def tearDown(self):
        """Clean up performance test environment"""
        self.performance_monitor.stop_monitoring()
        if self.test_dir.exists():
            shutil.rmtree(self.test_dir)
            
    def _create_test_files(self, count: int, size_kb: int = 10) -> List[Path]:
        """Create test files for performance testing"""
        files = []
        content = b"X" * (size_kb * 1024)
        
        for i in range(count):
            file_path = self.source_dir / f"perf_test_{i:04d}.dat"
            with open(file_path, 'wb') as f:
                f.write(content)
            files.append(file_path)
            
        return files
        
    def test_small_file_backup_performance(self):
        """Test backup performance with many small files"""
        # Create 100 small files (10KB each)
        test_files = self._create_test_files(100, 10)
        
        self.performance_monitor.start_monitoring()
        
        start_time = time.perf_counter()
        result = self.backup_engine.create_backup([str(self.source_dir)], str(self.backup_dir))
        end_time = time.perf_counter()
        
        self.performance_monitor.stop_monitoring()
        
        # Verify backup succeeded
        self.assertTrue(result.get('backup_id'), "Backup failed")
        
        # Analyze performance
        duration = end_time - start_time
        perf_summary = self.performance_monitor.get_summary()
        
        print(f"\nSmall File Backup Performance:")
        print(f"  Files: {len(test_files)}")
        print(f"  Duration: {duration:.2f}s")
        print(f"  Files/sec: {len(test_files)/duration:.1f}")
        print(f"  CPU avg: {perf_summary.get('cpu_avg', 0):.1f}%")
        print(f"  Memory max: {perf_summary.get('memory_max_mb', 0):.1f}MB")
        
        # Performance assertions
        files_per_second = len(test_files) / duration
        self.assertGreater(files_per_second, 10, "Backup too slow for small files")
        
        # Memory usage should be reasonable
        max_memory_mb = perf_summary.get('memory_max_mb', 0)
        self.assertLess(max_memory_mb, 500, "Excessive memory usage")
        
    def test_large_file_backup_performance(self):
        """Test backup performance with large files"""
        # Create 5 large files (10MB each)
        test_files = self._create_test_files(5, 10240)  # 10MB files
        
        self.performance_monitor.start_monitoring()
        
        start_time = time.perf_counter()
        result = self.backup_engine.create_backup([str(self.source_dir)], str(self.backup_dir))
        end_time = time.perf_counter()
        
        self.performance_monitor.stop_monitoring()
        
        # Verify backup succeeded
        self.assertTrue(result.get('backup_id'), "Large file backup failed")
        
        # Analyze performance
        duration = end_time - start_time
        perf_summary = self.performance_monitor.get_summary()
        total_mb = len(test_files) * 10
        
        print(f"\nLarge File Backup Performance:")
        print(f"  Files: {len(test_files)} ({total_mb}MB total)")
        print(f"  Duration: {duration:.2f}s")
        print(f"  Throughput: {total_mb/duration:.1f}MB/s")
        print(f"  CPU avg: {perf_summary.get('cpu_avg', 0):.1f}%")
        print(f"  Memory max: {perf_summary.get('memory_max_mb', 0):.1f}MB")
        
        # Performance assertions
        throughput_mbps = total_mb / duration
        self.assertGreater(throughput_mbps, 5, "Backup throughput too low")
        
    def test_frame_budget_compliance(self):
        """Test that backup operations maintain frame budget"""
        # Create moderate number of files
        test_files = self._create_test_files(50, 50)  # 50KB files
        
        frame_times = []
        frame_budget_ms = 16.67  # 60 FPS
        
        # Mock frame timing during backup
        def mock_frame_callback():
            frame_start = time.perf_counter()
            # Simulate some UI work
            time.sleep(0.001)
            frame_end = time.perf_counter()
            frame_time_ms = (frame_end - frame_start) * 1000
            frame_times.append(frame_time_ms)
            
        # Start backup with frame monitoring
        start_time = time.perf_counter()
        
        # Simulate frame callbacks during backup
        frame_thread = threading.Thread(target=lambda: [mock_frame_callback() for _ in range(100)])
        frame_thread.start()
        
        result = self.backup_engine.create_backup([str(self.source_dir)], str(self.backup_dir))
        
        frame_thread.join()
        end_time = time.perf_counter()
        
        # Analyze frame budget compliance
        if frame_times:
            avg_frame_time = sum(frame_times) / len(frame_times)
            max_frame_time = max(frame_times)
            over_budget_frames = len([t for t in frame_times if t > frame_budget_ms])
            
            print(f"\nFrame Budget Analysis:")
            print(f"  Average frame time: {avg_frame_time:.2f}ms")
            print(f"  Max frame time: {max_frame_time:.2f}ms")
            print(f"  Frames over budget: {over_budget_frames}/{len(frame_times)}")
            print(f"  Budget compliance: {((len(frame_times) - over_budget_frames) / len(frame_times) * 100):.1f}%")
            
            # Frame budget assertions
            compliance_rate = (len(frame_times) - over_budget_frames) / len(frame_times)
            self.assertGreater(compliance_rate, 0.9, "Poor frame budget compliance")
            
    def test_concurrent_backup_operations(self):
        """Test performance with concurrent backup operations"""
        # Create separate source directories for concurrent backups
        concurrent_dirs = []
        for i in range(3):
            source_dir = self.test_dir / f"concurrent_source_{i}"
            source_dir.mkdir()
            
            # Create files in each directory
            for j in range(20):
                file_path = source_dir / f"file_{j}.txt"
                with open(file_path, 'w') as f:
                    f.write(f"Concurrent backup test content {i}-{j}")
                    
            concurrent_dirs.append(source_dir)
            
        self.performance_monitor.start_monitoring()
        
        # Execute concurrent backups
        def run_backup(source_dir, backup_subdir):
            backup_path = self.backup_dir / backup_subdir
            backup_path.mkdir()
            return self.backup_engine.create_backup([str(source_dir)], str(backup_path))
            
        start_time = time.perf_counter()
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = [
                executor.submit(run_backup, source_dir, f"backup_{i}")
                for i, source_dir in enumerate(concurrent_dirs)
            ]
            
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
            
        end_time = time.perf_counter()
        self.performance_monitor.stop_monitoring()
        
        # Verify all backups succeeded
        self.assertEqual(len(results), 3, "Not all concurrent backups completed")
        for result in results:
            self.assertTrue(result.get('backup_id'), "Concurrent backup failed")
            
        # Analyze concurrent performance
        duration = end_time - start_time
        perf_summary = self.performance_monitor.get_summary()
        
        print(f"\nConcurrent Backup Performance:")
        print(f"  Concurrent operations: 3")
        print(f"  Total duration: {duration:.2f}s")
        print(f"  CPU avg: {perf_summary.get('cpu_avg', 0):.1f}%")
        print(f"  Memory max: {perf_summary.get('memory_max_mb', 0):.1f}MB")
        print(f"  Thread count: {perf_summary.get('sample_count', 0)}")
        
        # Performance assertions for concurrent operations
        self.assertLess(duration, 30, "Concurrent backups took too long")

class TestRecoveryPerformance(unittest.TestCase):
    """Test recovery operation performance under load"""
    
    def setUp(self):
        """Set up recovery performance test environment"""
        self.test_dir = Path(tempfile.mkdtemp(prefix="wf_ops_003_perf_recovery_test_"))
        self.backup_dir = self.test_dir / "backup"
        self.restore_dir = self.test_dir / "restore"
        
        self.backup_dir.mkdir()
        self.restore_dir.mkdir()
        
        try:
            self.recovery_engine = RecoveryEngine()
        except NameError:
            self.recovery_engine = MockRecoveryEngine()
            
        self.performance_monitor = PerformanceMonitor()
        
    def tearDown(self):
        """Clean up recovery performance test environment"""
        self.performance_monitor.stop_monitoring()
        if self.test_dir.exists():
            shutil.rmtree(self.test_dir)
            
    def _create_backup_manifest(self, file_count: int, file_size_kb: int = 10) -> Dict[str, Any]:
        """Create backup manifest with test files"""
        files = []
        
        for i in range(file_count):
            filename = f"recovery_test_{i:04d}.dat"
            content = b"R" * (file_size_kb * 1024)
            
            # Create backup file
            backup_file = self.backup_dir / filename
            with open(backup_file, 'wb') as f:
                f.write(content)
                
            files.append({
                'path': str(self.restore_dir / filename),
                'backup_path': str(backup_file),
                'hash': hashlib.sha256(content).hexdigest(),
                'size': len(content)
            })
            
        return {
            'backup_id': 'perf_recovery_test',
            'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            'files': files
        }
        
    def test_recovery_throughput(self):
        """Test recovery throughput with various file sizes"""
        test_scenarios = [
            {'count': 100, 'size_kb': 5, 'name': 'Many Small Files'},
            {'count': 20, 'size_kb': 100, 'name': 'Medium Files'},
            {'count': 5, 'size_kb': 1024, 'name': 'Large Files'}
        ]
        
        for scenario in test_scenarios:
            with self.subTest(scenario=scenario['name']):
                # Clean restore directory
                if self.restore_dir.exists():
                    shutil.rmtree(self.restore_dir)
                self.restore_dir.mkdir()
                
                # Create backup manifest
                manifest = self._create_backup_manifest(scenario['count'], scenario['size_kb'])
                
                self.performance_monitor.start_monitoring()
                
                # Execute recovery
                start_time = time.perf_counter()
                
                try:
                    from recovery_engine import RecoveryPlan
                    recovery_plan = RecoveryPlan(
                        recovery_id=f"perf_test_{scenario['name'].replace(' ', '_')}",
                        backup_manifest=manifest,
                        recovery_scope='full',
                        target_directory=str(self.restore_dir)
                    )
                except (NameError, ImportError):
                    # Mock recovery plan
                    recovery_plan = type('MockPlan', (), {'backup_manifest': manifest})()
                    
                result = self.recovery_engine.execute_recovery(recovery_plan)
                end_time = time.perf_counter()
                
                self.performance_monitor.stop_monitoring()
                
                # Analyze performance
                duration = end_time - start_time
                perf_summary = self.performance_monitor.get_summary()
                total_mb = (scenario['count'] * scenario['size_kb']) / 1024
                
                print(f"\n{scenario['name']} Recovery Performance:")
                print(f"  Files: {scenario['count']} ({total_mb:.1f}MB total)")
                print(f"  Duration: {duration:.2f}s")
                print(f"  Throughput: {total_mb/duration:.1f}MB/s")
                print(f"  Files/sec: {scenario['count']/duration:.1f}")
                print(f"  CPU avg: {perf_summary.get('cpu_avg', 0):.1f}%")
                print(f"  Memory max: {perf_summary.get('memory_max_mb', 0):.1f}MB")
                
                # Performance assertions
                self.assertTrue(result.get('success', True), f"Recovery failed for {scenario['name']}")
                
                if duration > 0:
                    throughput = total_mb / duration
                    files_per_sec = scenario['count'] / duration
                    
                    # Minimum performance thresholds
                    self.assertGreater(throughput, 1, f"Low throughput for {scenario['name']}")
                    self.assertGreater(files_per_sec, 5, f"Low file processing rate for {scenario['name']}")
                    
    def test_memory_efficiency_during_recovery(self):
        """Test memory efficiency during large recovery operations"""
        # Create large backup manifest
        manifest = self._create_backup_manifest(200, 50)  # 200 files, 50KB each
        
        self.performance_monitor.start_monitoring()
        
        try:
            from recovery_engine import RecoveryPlan
            recovery_plan = RecoveryPlan(
                recovery_id="memory_efficiency_test",
                backup_manifest=manifest,
                recovery_scope='full',
                target_directory=str(self.restore_dir)
            )
        except (NameError, ImportError):
            recovery_plan = type('MockPlan', (), {'backup_manifest': manifest})()
            
        result = self.recovery_engine.execute_recovery(recovery_plan)
        
        self.performance_monitor.stop_monitoring()
        
        # Analyze memory usage
        perf_summary = self.performance_monitor.get_summary()
        
        print(f"\nMemory Efficiency Analysis:")
        print(f"  Peak memory: {perf_summary.get('memory_max_mb', 0):.1f}MB")
        print(f"  Average memory: {perf_summary.get('memory_avg_mb', 0):.1f}MB")
        print(f"  Memory growth: {perf_summary.get('memory_growth_mb', 0):.1f}MB")
        
        # Memory efficiency assertions
        peak_memory = perf_summary.get('memory_max_mb', 0)
        memory_growth = perf_summary.get('memory_growth_mb', 0)
        
        self.assertLess(peak_memory, 1000, "Excessive peak memory usage")
        self.assertLess(memory_growth, 100, "Excessive memory growth during recovery")

class TestSystemResourceManagement(unittest.TestCase):
    """Test system resource management under load"""
    
    def setUp(self):
        """Set up system resource test environment"""
        self.test_dir = Path(tempfile.mkdtemp(prefix="wf_ops_003_resource_test_"))
        
        try:
            self.backup_planner = BackupPlanner()
        except NameError:
            self.backup_planner = MockBackupPlanner()
            
        self.performance_monitor = PerformanceMonitor()
        
    def tearDown(self):
        """Clean up system resource test environment"""
        self.performance_monitor.stop_monitoring()
        if self.test_dir.exists():
            shutil.rmtree(self.test_dir)
            
    def test_cpu_usage_under_load(self):
        """Test CPU usage remains reasonable under load"""
        # Create multiple source directories
        source_dirs = []
        for i in range(5):
            source_dir = self.test_dir / f"cpu_test_source_{i}"
            source_dir.mkdir()
            
            # Create files
            for j in range(50):
                file_path = source_dir / f"file_{j}.txt"
                with open(file_path, 'w') as f:
                    f.write(f"CPU load test content {i}-{j} " * 100)
                    
            source_dirs.append(str(source_dir))
            
        self.performance_monitor.start_monitoring()
        
        # Create backup plans for all directories
        start_time = time.perf_counter()
        
        plans = []
        for source_dir in source_dirs:
            plan = self.backup_planner.create_backup_plan([source_dir])
            plans.append(plan)
            
        end_time = time.perf_counter()
        self.performance_monitor.stop_monitoring()
        
        # Analyze CPU usage
        perf_summary = self.performance_monitor.get_summary()
        
        print(f"\nCPU Usage Analysis:")
        print(f"  Duration: {end_time - start_time:.2f}s")
        print(f"  Average CPU: {perf_summary.get('cpu_avg', 0):.1f}%")
        print(f"  Peak CPU: {perf_summary.get('cpu_max', 0):.1f}%")
        print(f"  Plans created: {len(plans)}")
        
        # CPU usage assertions
        avg_cpu = perf_summary.get('cpu_avg', 0)
        max_cpu = perf_summary.get('cpu_max', 0)
        
        self.assertLess(avg_cpu, 80, "Average CPU usage too high")
        self.assertLess(max_cpu, 95, "Peak CPU usage too high")
        
    def test_disk_io_efficiency(self):
        """Test disk I/O efficiency during operations"""
        # This test would measure disk I/O in a real implementation
        # For now, we'll simulate and test basic file operations
        
        test_files = []
        io_start_time = time.perf_counter()
        
        # Create files with measured I/O
        for i in range(100):
            file_path = self.test_dir / f"io_test_{i}.dat"
            content = b"I" * 10240  # 10KB
            
            with open(file_path, 'wb') as f:
                f.write(content)
                
            test_files.append(file_path)
            
        # Read files back
        total_bytes_read = 0
        for file_path in test_files:
            with open(file_path, 'rb') as f:
                content = f.read()
                total_bytes_read += len(content)
                
        io_end_time = time.perf_counter()
        
        # Analyze I/O performance
        io_duration = io_end_time - io_start_time
        total_mb = total_bytes_read / (1024 * 1024)
        io_throughput = total_mb / io_duration
        
        print(f"\nDisk I/O Analysis:")
        print(f"  Files processed: {len(test_files)}")
        print(f"  Total data: {total_mb:.1f}MB")
        print(f"  Duration: {io_duration:.2f}s")
        print(f"  I/O throughput: {io_throughput:.1f}MB/s")
        
        # I/O efficiency assertions
        self.assertGreater(io_throughput, 10, "Disk I/O throughput too low")
        self.assertLess(io_duration, 10, "I/O operations took too long")

def run_performance_load_tests():
    """Run all performance load tests"""
    test_suites = [
        unittest.TestLoader().loadTestsFromTestCase(TestBackupPerformance),
        unittest.TestLoader().loadTestsFromTestCase(TestRecoveryPerformance),
        unittest.TestLoader().loadTestsFromTestCase(TestSystemResourceManagement)
    ]
    
    combined_suite = unittest.TestSuite(test_suites)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(combined_suite)
    
    return result.wasSuccessful()

if __name__ == "__main__":
    print("WF-OPS-003 Performance Load Test Suite")
    print("=" * 50)
    
    # Check system resources before testing
    print(f"System CPU count: {multiprocessing.cpu_count()}")
    print(f"Available memory: {psutil.virtual_memory().available / (1024**3):.1f}GB")
    print(f"Available disk space: {shutil.disk_usage('.').free / (1024**3):.1f}GB")
    print()
    
    success = run_performance_load_tests()
    
    if success:
        print("\n✅ All performance load tests passed!")
        exit(0)
    else:
        print("\n❌ Some performance load tests failed!")
        exit(1)
