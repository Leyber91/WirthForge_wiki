"""
WF-TECH-002 Data Management Test Suite
Comprehensive testing for WIRTHFORGE data management and local storage
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
import hashlib
import shutil

# Test Configuration
TEST_CONFIG = {
    "performance": {
        "query_timeout_ms": 100,
        "batch_size": 1000,
        "max_db_size_mb": 100
    },
    "data_integrity": {
        "checksum_algorithm": "sha256",
        "backup_interval_minutes": 5
    }
}

class DataManagementTests(unittest.TestCase):
    """Test suite for WF-TECH-002 Data Management"""
    
    def setUp(self):
        """Set up test environment"""
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = Path(self.temp_dir) / "test.db"
        self.backup_dir = Path(self.temp_dir) / "backups"
        self.backup_dir.mkdir(exist_ok=True)
        
        # Initialize test database
        self.conn = sqlite3.connect(self.db_path)
        self._create_test_tables()
        
    def tearDown(self):
        """Clean up test environment"""
        if hasattr(self, 'conn'):
            self.conn.close()
        shutil.rmtree(self.temp_dir)
    
    def _create_test_tables(self):
        """Create test database tables"""
        cursor = self.conn.cursor()
        
        # User data table
        cursor.execute("""
            CREATE TABLE users (
                id INTEGER PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT NOT NULL,
                created_at REAL NOT NULL,
                data_hash TEXT
            )
        """)
        
        # Energy metrics table
        cursor.execute("""
            CREATE TABLE energy_metrics (
                id INTEGER PRIMARY KEY,
                user_id INTEGER,
                timestamp REAL NOT NULL,
                energy_value REAL NOT NULL,
                measurement_type TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        # Session data table
        cursor.execute("""
            CREATE TABLE sessions (
                id TEXT PRIMARY KEY,
                user_id INTEGER,
                start_time REAL NOT NULL,
                end_time REAL,
                data TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        self.conn.commit()

class LocalStorageTests(DataManagementTests):
    """Test local SQLite storage functionality"""
    
    def test_database_creation(self):
        """Test database file creation and structure"""
        self.assertTrue(self.db_path.exists())
        
        # Verify tables exist
        cursor = self.conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        
        expected_tables = ['users', 'energy_metrics', 'sessions']
        for table in expected_tables:
            self.assertIn(table, tables)
    
    def test_data_insertion(self):
        """Test data insertion with integrity checks"""
        cursor = self.conn.cursor()
        
        # Insert test user
        user_data = {
            "username": "test_user",
            "email": "test@example.com",
            "created_at": time.time()
        }
        
        # Calculate data hash for integrity
        data_hash = self._calculate_data_hash(user_data)
        
        cursor.execute("""
            INSERT INTO users (username, email, created_at, data_hash)
            VALUES (?, ?, ?, ?)
        """, (user_data["username"], user_data["email"], 
              user_data["created_at"], data_hash))
        
        self.conn.commit()
        
        # Verify insertion
        cursor.execute("SELECT * FROM users WHERE username = ?", ("test_user",))
        result = cursor.fetchone()
        
        self.assertIsNotNone(result)
        self.assertEqual(result[1], "test_user")
        self.assertEqual(result[4], data_hash)
    
    def test_data_retrieval_performance(self):
        """Test data retrieval performance meets requirements"""
        cursor = self.conn.cursor()
        
        # Insert test data
        test_users = []
        for i in range(1000):
            user_data = {
                "username": f"user_{i}",
                "email": f"user_{i}@example.com",
                "created_at": time.time()
            }
            test_users.append((
                user_data["username"],
                user_data["email"],
                user_data["created_at"],
                self._calculate_data_hash(user_data)
            ))
        
        cursor.executemany("""
            INSERT INTO users (username, email, created_at, data_hash)
            VALUES (?, ?, ?, ?)
        """, test_users)
        self.conn.commit()
        
        # Test query performance
        start_time = time.perf_counter()
        
        cursor.execute("SELECT * FROM users WHERE username LIKE 'user_5%'")
        results = cursor.fetchall()
        
        end_time = time.perf_counter()
        query_time_ms = (end_time - start_time) * 1000
        
        max_query_time = TEST_CONFIG["performance"]["query_timeout_ms"]
        self.assertLess(
            query_time_ms,
            max_query_time,
            f"Query took {query_time_ms:.2f}ms, exceeds {max_query_time}ms limit"
        )
        self.assertGreater(len(results), 0)
    
    def test_batch_operations(self):
        """Test batch insert/update operations"""
        cursor = self.conn.cursor()
        batch_size = TEST_CONFIG["performance"]["batch_size"]
        
        # Prepare batch data
        energy_data = []
        for i in range(batch_size):
            energy_data.append((
                1,  # user_id
                time.time() + i,
                50.0 + (i % 100),  # energy_value
                "cpu_usage"
            ))
        
        # Test batch insert performance
        start_time = time.perf_counter()
        
        cursor.executemany("""
            INSERT INTO energy_metrics (user_id, timestamp, energy_value, measurement_type)
            VALUES (?, ?, ?, ?)
        """, energy_data)
        self.conn.commit()
        
        end_time = time.perf_counter()
        batch_time_ms = (end_time - start_time) * 1000
        
        # Verify all records inserted
        cursor.execute("SELECT COUNT(*) FROM energy_metrics")
        count = cursor.fetchone()[0]
        self.assertEqual(count, batch_size)
        
        # Performance should be reasonable for batch operations
        self.assertLess(batch_time_ms, 1000, "Batch operation too slow")

class DataIntegrityTests(DataManagementTests):
    """Test data integrity and validation"""
    
    def test_data_checksums(self):
        """Test data integrity with checksums"""
        cursor = self.conn.cursor()
        
        # Insert data with checksum
        original_data = {"key": "value", "number": 42}
        data_json = json.dumps(original_data, sort_keys=True)
        checksum = self._calculate_data_hash(original_data)
        
        cursor.execute("""
            INSERT INTO sessions (id, user_id, start_time, data)
            VALUES (?, ?, ?, ?)
        """, ("session_1", 1, time.time(), data_json))
        self.conn.commit()
        
        # Retrieve and verify checksum
        cursor.execute("SELECT data FROM sessions WHERE id = ?", ("session_1",))
        result = cursor.fetchone()
        
        retrieved_data = json.loads(result[0])
        retrieved_checksum = self._calculate_data_hash(retrieved_data)
        
        self.assertEqual(checksum, retrieved_checksum)
    
    def test_foreign_key_constraints(self):
        """Test foreign key constraint enforcement"""
        cursor = self.conn.cursor()
        
        # Enable foreign key constraints
        cursor.execute("PRAGMA foreign_keys = ON")
        
        # Try to insert energy metric with invalid user_id
        with self.assertRaises(sqlite3.IntegrityError):
            cursor.execute("""
                INSERT INTO energy_metrics (user_id, timestamp, energy_value, measurement_type)
                VALUES (?, ?, ?, ?)
            """, (999, time.time(), 50.0, "cpu_usage"))
            self.conn.commit()
    
    def test_data_validation(self):
        """Test data validation rules"""
        cursor = self.conn.cursor()
        
        # Test unique constraint
        cursor.execute("""
            INSERT INTO users (username, email, created_at)
            VALUES (?, ?, ?)
        """, ("unique_user", "unique@example.com", time.time()))
        self.conn.commit()
        
        # Try to insert duplicate username
        with self.assertRaises(sqlite3.IntegrityError):
            cursor.execute("""
                INSERT INTO users (username, email, created_at)
                VALUES (?, ?, ?)
            """, ("unique_user", "another@example.com", time.time()))
            self.conn.commit()
    
    def test_transaction_rollback(self):
        """Test transaction rollback on errors"""
        cursor = self.conn.cursor()
        
        try:
            cursor.execute("BEGIN TRANSACTION")
            
            # Insert valid data
            cursor.execute("""
                INSERT INTO users (username, email, created_at)
                VALUES (?, ?, ?)
            """, ("rollback_user", "rollback@example.com", time.time()))
            
            # Insert invalid data (should fail)
            cursor.execute("""
                INSERT INTO users (username, email, created_at)
                VALUES (?, ?, ?)
            """, ("rollback_user", "duplicate@example.com", time.time()))  # Duplicate username
            
            cursor.execute("COMMIT")
            
        except sqlite3.IntegrityError:
            cursor.execute("ROLLBACK")
        
        # Verify no data was inserted due to rollback
        cursor.execute("SELECT COUNT(*) FROM users WHERE username = ?", ("rollback_user",))
        count = cursor.fetchone()[0]
        self.assertEqual(count, 0)

class BackupRecoveryTests(DataManagementTests):
    """Test backup and recovery functionality"""
    
    def test_database_backup(self):
        """Test database backup creation"""
        # Add test data
        cursor = self.conn.cursor()
        cursor.execute("""
            INSERT INTO users (username, email, created_at)
            VALUES (?, ?, ?)
        """, ("backup_user", "backup@example.com", time.time()))
        self.conn.commit()
        
        # Create backup
        backup_path = self.backup_dir / f"backup_{int(time.time())}.db"
        self._create_backup(backup_path)
        
        self.assertTrue(backup_path.exists())
        
        # Verify backup integrity
        backup_conn = sqlite3.connect(backup_path)
        backup_cursor = backup_conn.cursor()
        
        backup_cursor.execute("SELECT username FROM users WHERE username = ?", ("backup_user",))
        result = backup_cursor.fetchone()
        
        self.assertIsNotNone(result)
        self.assertEqual(result[0], "backup_user")
        
        backup_conn.close()
    
    def test_database_recovery(self):
        """Test database recovery from backup"""
        # Create backup with test data
        cursor = self.conn.cursor()
        cursor.execute("""
            INSERT INTO users (username, email, created_at)
            VALUES (?, ?, ?)
        """, ("recovery_user", "recovery@example.com", time.time()))
        self.conn.commit()
        
        backup_path = self.backup_dir / "recovery_backup.db"
        self._create_backup(backup_path)
        
        # Simulate data corruption (delete data)
        cursor.execute("DELETE FROM users WHERE username = ?", ("recovery_user",))
        self.conn.commit()
        
        # Verify data is gone
        cursor.execute("SELECT COUNT(*) FROM users WHERE username = ?", ("recovery_user",))
        count = cursor.fetchone()[0]
        self.assertEqual(count, 0)
        
        # Restore from backup
        self._restore_from_backup(backup_path)
        
        # Verify data is restored
        cursor.execute("SELECT username FROM users WHERE username = ?", ("recovery_user",))
        result = cursor.fetchone()
        
        self.assertIsNotNone(result)
        self.assertEqual(result[0], "recovery_user")
    
    def test_incremental_backup(self):
        """Test incremental backup functionality"""
        # Create initial backup
        initial_backup = self.backup_dir / "initial.db"
        self._create_backup(initial_backup)
        
        # Add new data
        cursor = self.conn.cursor()
        cursor.execute("""
            INSERT INTO users (username, email, created_at)
            VALUES (?, ?, ?)
        """, ("incremental_user", "incremental@example.com", time.time()))
        self.conn.commit()
        
        # Create incremental backup
        incremental_backup = self.backup_dir / "incremental.db"
        self._create_backup(incremental_backup)
        
        # Verify incremental backup contains new data
        inc_conn = sqlite3.connect(incremental_backup)
        inc_cursor = inc_conn.cursor()
        
        inc_cursor.execute("SELECT COUNT(*) FROM users")
        count = inc_cursor.fetchone()[0]
        
        self.assertGreater(count, 0)
        inc_conn.close()

class ConcurrencyTests(DataManagementTests):
    """Test concurrent data access"""
    
    def test_concurrent_reads(self):
        """Test concurrent read operations"""
        # Insert test data
        cursor = self.conn.cursor()
        for i in range(100):
            cursor.execute("""
                INSERT INTO users (username, email, created_at)
                VALUES (?, ?, ?)
            """, (f"concurrent_user_{i}", f"user_{i}@example.com", time.time()))
        self.conn.commit()
        
        results = queue.Queue()
        
        def read_worker(worker_id):
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("SELECT COUNT(*) FROM users")
            count = cursor.fetchone()[0]
            results.put((worker_id, count))
            
            conn.close()
        
        # Start multiple read workers
        threads = []
        for i in range(5):
            thread = threading.Thread(target=read_worker, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for completion
        for thread in threads:
            thread.join()
        
        # Verify all reads succeeded
        self.assertEqual(results.qsize(), 5)
        
        # All should return same count
        counts = []
        while not results.empty():
            worker_id, count = results.get()
            counts.append(count)
        
        self.assertTrue(all(count == counts[0] for count in counts))
    
    def test_write_locking(self):
        """Test write operation locking"""
        results = queue.Queue()
        
        def write_worker(worker_id):
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            try:
                cursor.execute("""
                    INSERT INTO users (username, email, created_at)
                    VALUES (?, ?, ?)
                """, (f"write_user_{worker_id}", f"write_{worker_id}@example.com", time.time()))
                conn.commit()
                results.put((worker_id, "success"))
            except Exception as e:
                results.put((worker_id, f"error: {str(e)}"))
            finally:
                conn.close()
        
        # Start multiple write workers
        threads = []
        for i in range(3):
            thread = threading.Thread(target=write_worker, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for completion
        for thread in threads:
            thread.join()
        
        # Verify all writes succeeded
        success_count = 0
        while not results.empty():
            worker_id, result = results.get()
            if result == "success":
                success_count += 1
        
        self.assertEqual(success_count, 3)

class DataMigrationTests(DataManagementTests):
    """Test data migration and schema evolution"""
    
    def test_schema_migration(self):
        """Test database schema migration"""
        cursor = self.conn.cursor()
        
        # Add test data to existing schema
        cursor.execute("""
            INSERT INTO users (username, email, created_at)
            VALUES (?, ?, ?)
        """, ("migration_user", "migration@example.com", time.time()))
        self.conn.commit()
        
        # Simulate schema migration (add new column)
        cursor.execute("ALTER TABLE users ADD COLUMN last_login REAL")
        
        # Verify migration
        cursor.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in cursor.fetchall()]
        
        self.assertIn("last_login", columns)
        
        # Verify existing data is preserved
        cursor.execute("SELECT username FROM users WHERE username = ?", ("migration_user",))
        result = cursor.fetchone()
        self.assertIsNotNone(result)
    
    def test_data_export_import(self):
        """Test data export and import functionality"""
        cursor = self.conn.cursor()
        
        # Insert test data
        test_data = [
            ("export_user_1", "export1@example.com", time.time()),
            ("export_user_2", "export2@example.com", time.time())
        ]
        
        cursor.executemany("""
            INSERT INTO users (username, email, created_at)
            VALUES (?, ?, ?)
        """, test_data)
        self.conn.commit()
        
        # Export data
        export_file = self.temp_dir / "export.json"
        self._export_data(export_file)
        
        self.assertTrue(export_file.exists())
        
        # Clear database
        cursor.execute("DELETE FROM users")
        self.conn.commit()
        
        # Import data
        self._import_data(export_file)
        
        # Verify import
        cursor.execute("SELECT COUNT(*) FROM users")
        count = cursor.fetchone()[0]
        self.assertEqual(count, 2)

    # Helper methods
    def _calculate_data_hash(self, data: dict) -> str:
        """Calculate SHA256 hash of data"""
        data_json = json.dumps(data, sort_keys=True)
        return hashlib.sha256(data_json.encode()).hexdigest()
    
    def _create_backup(self, backup_path: Path):
        """Create database backup"""
        shutil.copy2(self.db_path, backup_path)
    
    def _restore_from_backup(self, backup_path: Path):
        """Restore database from backup"""
        self.conn.close()
        shutil.copy2(backup_path, self.db_path)
        self.conn = sqlite3.connect(self.db_path)
    
    def _export_data(self, export_file: Path):
        """Export database data to JSON"""
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM users")
        users = cursor.fetchall()
        
        export_data = {
            "users": [
                {
                    "id": row[0],
                    "username": row[1],
                    "email": row[2],
                    "created_at": row[3]
                }
                for row in users
            ]
        }
        
        with open(export_file, 'w') as f:
            json.dump(export_data, f, indent=2)
    
    def _import_data(self, import_file: Path):
        """Import data from JSON file"""
        with open(import_file, 'r') as f:
            import_data = json.load(f)
        
        cursor = self.conn.cursor()
        for user in import_data["users"]:
            cursor.execute("""
                INSERT INTO users (username, email, created_at)
                VALUES (?, ?, ?)
            """, (user["username"], user["email"], user["created_at"]))
        
        self.conn.commit()

if __name__ == '__main__':
    # Configure logging for tests
    logging.basicConfig(level=logging.INFO)
    
    # Create test suite
    suite = unittest.TestSuite()
    
    # Add test classes
    test_classes = [
        LocalStorageTests,
        DataIntegrityTests,
        BackupRecoveryTests,
        ConcurrencyTests,
        DataMigrationTests
    ]
    
    for test_class in test_classes:
        tests = unittest.TestLoader().loadTestsFromTestCase(test_class)
        suite.addTests(tests)
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Exit with appropriate code
    exit(0 if result.wasSuccessful() else 1)
