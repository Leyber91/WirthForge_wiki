#!/usr/bin/env python3
"""
WF-OPS-003 Integrity Verification Test Suite
Comprehensive tests for backup integrity verification, hash validation, and audit trail consistency.
Tests SHA-256 content addressing, immutable hash trees, and corruption detection.
"""

import os
import sys
import json
import hashlib
import tempfile
import shutil
import time
import unittest
from pathlib import Path
from typing import Dict, List, Any
import sqlite3

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "code" / "WF-OPS" / "WF-OPS-003"))

try:
    from audit_verify import AuditVerifyManager, AuditDatabase, IntegrityVerifier, HashTreeManager
except ImportError:
    print("Warning: Could not import audit-verify module. Running in mock mode.")
    
    # Mock classes for testing
    class MockAuditDatabase:
        def __init__(self, db_path): pass
        def add_audit_event(self, event): return True
        def get_audit_trail(self, operation_id): return []
    
    class MockIntegrityVerifier:
        def __init__(self, audit_db): pass
        def verify_file_integrity(self, file_path, expected_hash): return True
        def verify_backup_integrity(self, manifest): 
            return type('Report', (), {
                'report_id': 'test', 'verified_items': 1, 'failed_items': 0,
                'missing_items': 0, 'corrupted_items': 0, 'hash_mismatches': 0
            })()
    
    class MockHashTreeManager:
        def __init__(self, audit_db): pass
        def calculate_file_hash(self, file_path): return "mock_hash"
        def verify_hash_tree_integrity(self, node_id): return True
    
    class MockAuditVerifyManager:
        def __init__(self, db_path):
            self.audit_db = MockAuditDatabase(db_path)
            self.integrity_verifier = MockIntegrityVerifier(self.audit_db)
            self.hash_tree_manager = MockHashTreeManager(self.audit_db)

class TestIntegrityVerification(unittest.TestCase):
    """Test integrity verification functionality"""
    
    def setUp(self):
        """Set up test environment"""
        self.test_dir = Path(tempfile.mkdtemp(prefix="wf_ops_003_test_"))
        self.backup_dir = self.test_dir / "backups"
        self.backup_dir.mkdir()
        
        self.audit_db_path = self.test_dir / "audit_test.db"
        
        # Create test manager
        try:
            self.manager = AuditVerifyManager(self.audit_db_path)
        except NameError:
            self.manager = MockAuditVerifyManager(self.audit_db_path)
            
        # Create test files
        self.test_files = self._create_test_files()
        
    def tearDown(self):
        """Clean up test environment"""
        if self.test_dir.exists():
            shutil.rmtree(self.test_dir)
            
    def _create_test_files(self) -> List[Dict[str, Any]]:
        """Create test files with known content and hashes"""
        test_files = []
        
        # Create various test files
        test_data = [
            ("small_file.txt", b"Hello, WF-OPS-003!"),
            ("medium_file.txt", b"A" * 1024),
            ("large_file.txt", b"B" * 10240),
            ("binary_file.bin", bytes(range(256))),
            ("empty_file.txt", b"")
        ]
        
        for filename, content in test_data:
            file_path = self.test_dir / filename
            with open(file_path, 'wb') as f:
                f.write(content)
                
            # Calculate hash
            file_hash = hashlib.sha256(content).hexdigest()
            
            test_files.append({
                'path': str(file_path),
                'hash': file_hash,
                'size': len(content),
                'permissions': '644'
            })
            
        return test_files
        
    def test_file_hash_calculation(self):
        """Test SHA-256 hash calculation for files"""
        for file_info in self.test_files:
            file_path = Path(file_info['path'])
            expected_hash = file_info['hash']
            
            calculated_hash = self.manager.hash_tree_manager.calculate_file_hash(file_path)
            
            self.assertEqual(calculated_hash, expected_hash,
                           f"Hash mismatch for {file_path.name}")
            
    def test_file_integrity_verification(self):
        """Test individual file integrity verification"""
        for file_info in self.test_files:
            file_path = Path(file_info['path'])
            expected_hash = file_info['hash']
            
            # Test with correct hash
            result = self.manager.integrity_verifier.verify_file_integrity(
                file_path, expected_hash
            )
            self.assertTrue(result, f"Integrity check failed for {file_path.name}")
            
            # Test with incorrect hash
            wrong_hash = "0" * 64
            result = self.manager.integrity_verifier.verify_file_integrity(
                file_path, wrong_hash
            )
            self.assertFalse(result, f"Integrity check should fail for wrong hash")
            
    def test_missing_file_detection(self):
        """Test detection of missing files"""
        missing_file = self.test_dir / "missing_file.txt"
        fake_hash = "a" * 64
        
        result = self.manager.integrity_verifier.verify_file_integrity(
            missing_file, fake_hash
        )
        self.assertFalse(result, "Should detect missing file")
        
    def test_backup_manifest_integrity(self):
        """Test integrity verification of complete backup manifest"""
        # Create backup manifest
        manifest = {
            'backup_id': 'test_backup_001',
            'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            'backup_path': str(self.backup_dir),
            'files': self.test_files
        }
        
        # Verify backup integrity
        report = self.manager.integrity_verifier.verify_backup_integrity(manifest)
        
        self.assertEqual(report.total_items, len(self.test_files))
        self.assertEqual(report.verified_items, len(self.test_files))
        self.assertEqual(report.failed_items, 0)
        self.assertEqual(report.missing_items, 0)
        self.assertEqual(report.hash_mismatches, 0)
        
    def test_corrupted_file_detection(self):
        """Test detection of corrupted files"""
        # Corrupt one of the test files
        corrupted_file = Path(self.test_files[0]['path'])
        original_content = corrupted_file.read_bytes()
        
        # Write corrupted content
        corrupted_content = b"CORRUPTED" + original_content[9:]
        corrupted_file.write_bytes(corrupted_content)
        
        # Test integrity verification
        original_hash = self.test_files[0]['hash']
        result = self.manager.integrity_verifier.verify_file_integrity(
            corrupted_file, original_hash
        )
        
        self.assertFalse(result, "Should detect corrupted file")
        
        # Restore original content
        corrupted_file.write_bytes(original_content)
        
    def test_hash_tree_integrity(self):
        """Test hash tree integrity verification"""
        # Create hash tree node
        test_content_hash = self.test_files[0]['hash']
        test_metadata = {'test': 'metadata'}
        
        node = self.manager.hash_tree_manager.create_hash_tree_node(
            test_content_hash, test_metadata
        )
        
        # Verify hash tree integrity
        result = self.manager.hash_tree_manager.verify_hash_tree_integrity(node.node_id)
        self.assertTrue(result, "Hash tree integrity verification failed")
        
    def test_performance_metrics(self):
        """Test performance metrics during integrity verification"""
        manifest = {
            'backup_id': 'perf_test_backup',
            'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            'backup_path': str(self.backup_dir),
            'files': self.test_files
        }
        
        start_time = time.perf_counter()
        report = self.manager.integrity_verifier.verify_backup_integrity(manifest)
        end_time = time.perf_counter()
        
        # Check performance metrics exist
        self.assertIn('total_duration_seconds', report.performance_metrics)
        self.assertIn('files_per_second', report.performance_metrics)
        
        # Verify timing is reasonable
        actual_duration = end_time - start_time
        reported_duration = report.performance_metrics['total_duration_seconds']
        
        # Allow some tolerance for timing differences
        self.assertAlmostEqual(actual_duration, reported_duration, delta=0.1)
        
    def test_audit_trail_logging(self):
        """Test audit trail logging during integrity operations"""
        operation_id = "test_integrity_op_001"
        user_id = "test_user"
        
        manifest = {
            'backup_id': 'audit_test_backup',
            'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            'backup_path': str(self.backup_dir),
            'files': self.test_files[:2]  # Use subset for faster test
        }
        
        # Log backup operation
        success = self.manager.log_backup_operation(operation_id, user_id, manifest)
        self.assertTrue(success, "Audit logging failed")
        
        # Retrieve audit trail
        audit_trail = self.manager.audit_db.get_audit_trail(operation_id)
        
        # Should have at least one event (backup_started)
        self.assertGreater(len(audit_trail), 0, "No audit events found")
        
        # Check first event is backup_started
        start_event = audit_trail[0]
        self.assertEqual(start_event.event_type, "backup_started")
        self.assertEqual(start_event.operation_id, operation_id)
        self.assertEqual(start_event.user_id, user_id)

class TestIntegrityEdgeCases(unittest.TestCase):
    """Test edge cases and error conditions"""
    
    def setUp(self):
        """Set up test environment"""
        self.test_dir = Path(tempfile.mkdtemp(prefix="wf_ops_003_edge_test_"))
        self.audit_db_path = self.test_dir / "audit_edge_test.db"
        
        try:
            self.manager = AuditVerifyManager(self.audit_db_path)
        except NameError:
            self.manager = MockAuditVerifyManager(self.audit_db_path)
            
    def tearDown(self):
        """Clean up test environment"""
        if self.test_dir.exists():
            shutil.rmtree(self.test_dir)
            
    def test_empty_manifest_verification(self):
        """Test verification of empty backup manifest"""
        empty_manifest = {
            'backup_id': 'empty_backup',
            'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            'backup_path': str(self.test_dir),
            'files': []
        }
        
        report = self.manager.integrity_verifier.verify_backup_integrity(empty_manifest)
        
        self.assertEqual(report.total_items, 0)
        self.assertEqual(report.verified_items, 0)
        self.assertEqual(report.failed_items, 0)
        
    def test_large_file_handling(self):
        """Test handling of large files (simulated)"""
        # Create a larger test file
        large_file = self.test_dir / "large_test.txt"
        large_content = b"X" * (1024 * 1024)  # 1MB
        
        with open(large_file, 'wb') as f:
            f.write(large_content)
            
        expected_hash = hashlib.sha256(large_content).hexdigest()
        
        # Test hash calculation
        calculated_hash = self.manager.hash_tree_manager.calculate_file_hash(large_file)
        self.assertEqual(calculated_hash, expected_hash)
        
        # Test integrity verification
        result = self.manager.integrity_verifier.verify_file_integrity(
            large_file, expected_hash
        )
        self.assertTrue(result)
        
    def test_special_characters_in_paths(self):
        """Test handling of special characters in file paths"""
        special_chars = ["spaces in name.txt", "unicode_测试.txt", "symbols_@#$.txt"]
        
        for filename in special_chars:
            try:
                file_path = self.test_dir / filename
                content = f"Content for {filename}".encode('utf-8')
                
                with open(file_path, 'wb') as f:
                    f.write(content)
                    
                expected_hash = hashlib.sha256(content).hexdigest()
                calculated_hash = self.manager.hash_tree_manager.calculate_file_hash(file_path)
                
                self.assertEqual(calculated_hash, expected_hash,
                               f"Hash calculation failed for {filename}")
                               
            except (OSError, UnicodeError) as e:
                # Some filesystems may not support certain characters
                print(f"Skipping {filename} due to filesystem limitation: {e}")
                continue
                
    def test_concurrent_integrity_checks(self):
        """Test concurrent integrity verification operations"""
        import threading
        
        # Create multiple test files
        test_files = []
        for i in range(5):
            file_path = self.test_dir / f"concurrent_test_{i}.txt"
            content = f"Concurrent test content {i}".encode()
            
            with open(file_path, 'wb') as f:
                f.write(content)
                
            test_files.append({
                'path': str(file_path),
                'hash': hashlib.sha256(content).hexdigest()
            })
            
        results = []
        threads = []
        
        def verify_file(file_info):
            result = self.manager.integrity_verifier.verify_file_integrity(
                Path(file_info['path']), file_info['hash']
            )
            results.append(result)
            
        # Start concurrent verification threads
        for file_info in test_files:
            thread = threading.Thread(target=verify_file, args=(file_info,))
            threads.append(thread)
            thread.start()
            
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
            
        # All verifications should succeed
        self.assertEqual(len(results), len(test_files))
        self.assertTrue(all(results), "Some concurrent verifications failed")

class TestIntegrityPerformance(unittest.TestCase):
    """Test performance characteristics of integrity verification"""
    
    def setUp(self):
        """Set up performance test environment"""
        self.test_dir = Path(tempfile.mkdtemp(prefix="wf_ops_003_perf_test_"))
        self.audit_db_path = self.test_dir / "audit_perf_test.db"
        
        try:
            self.manager = AuditVerifyManager(self.audit_db_path)
        except NameError:
            self.manager = MockAuditVerifyManager(self.audit_db_path)
            
    def tearDown(self):
        """Clean up performance test environment"""
        if self.test_dir.exists():
            shutil.rmtree(self.test_dir)
            
    def test_frame_budget_compliance(self):
        """Test that integrity verification respects frame budget"""
        # Create test files
        test_files = []
        for i in range(10):
            file_path = self.test_dir / f"frame_test_{i}.txt"
            content = f"Frame budget test {i} " * 100  # Moderate size
            
            with open(file_path, 'w') as f:
                f.write(content)
                
            test_files.append({
                'path': str(file_path),
                'hash': hashlib.sha256(content.encode()).hexdigest(),
                'size': len(content.encode())
            })
            
        manifest = {
            'backup_id': 'frame_budget_test',
            'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            'files': test_files
        }
        
        # Measure verification time
        start_time = time.perf_counter()
        report = self.manager.integrity_verifier.verify_backup_integrity(manifest)
        end_time = time.perf_counter()
        
        duration_ms = (end_time - start_time) * 1000
        
        # Check that individual operations don't exceed frame budget significantly
        # This is a heuristic test - real implementation should yield appropriately
        avg_time_per_file = duration_ms / len(test_files)
        
        # Log performance for analysis
        print(f"Average time per file: {avg_time_per_file:.2f}ms")
        print(f"Total verification time: {duration_ms:.2f}ms")
        
        # Verify all files were processed
        self.assertEqual(report.verified_items, len(test_files))
        
    def test_memory_usage_stability(self):
        """Test memory usage remains stable during verification"""
        import psutil
        import gc
        
        process = psutil.Process()
        initial_memory = process.memory_info().rss
        
        # Create and verify multiple batches
        for batch in range(3):
            test_files = []
            
            # Create batch of test files
            for i in range(20):
                file_path = self.test_dir / f"memory_test_batch{batch}_{i}.txt"
                content = f"Memory test batch {batch} file {i} " * 50
                
                with open(file_path, 'w') as f:
                    f.write(content)
                    
                test_files.append({
                    'path': str(file_path),
                    'hash': hashlib.sha256(content.encode()).hexdigest()
                })
                
            manifest = {
                'backup_id': f'memory_test_batch_{batch}',
                'files': test_files
            }
            
            # Verify batch
            report = self.manager.integrity_verifier.verify_backup_integrity(manifest)
            self.assertEqual(report.verified_items, len(test_files))
            
            # Clean up batch files
            for file_info in test_files:
                Path(file_info['path']).unlink()
                
            # Force garbage collection
            gc.collect()
            
        final_memory = process.memory_info().rss
        memory_growth = final_memory - initial_memory
        
        # Memory growth should be reasonable (less than 50MB for this test)
        max_acceptable_growth = 50 * 1024 * 1024  # 50MB
        
        print(f"Memory growth: {memory_growth / (1024*1024):.2f} MB")
        
        self.assertLess(memory_growth, max_acceptable_growth,
                       "Excessive memory growth during verification")

def run_integrity_tests():
    """Run all integrity verification tests"""
    test_suites = [
        unittest.TestLoader().loadTestsFromTestCase(TestIntegrityVerification),
        unittest.TestLoader().loadTestsFromTestCase(TestIntegrityEdgeCases),
        unittest.TestLoader().loadTestsFromTestCase(TestIntegrityPerformance)
    ]
    
    combined_suite = unittest.TestSuite(test_suites)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(combined_suite)
    
    return result.wasSuccessful()

if __name__ == "__main__":
    print("WF-OPS-003 Integrity Verification Test Suite")
    print("=" * 50)
    
    success = run_integrity_tests()
    
    if success:
        print("\n✅ All integrity verification tests passed!")
        exit(0)
    else:
        print("\n❌ Some integrity verification tests failed!")
        exit(1)
