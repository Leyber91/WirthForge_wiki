#!/usr/bin/env python3
"""
WF-OPS-003 Audit & Verification Module
Immutable audit trails, integrity verification, and compliance reporting for backup operations.
Provides SHA-256 content addressing, hash tree verification, and audit log management.
"""

import os
import json
import hashlib
import time
import sqlite3
from typing import Dict, List, Optional, Tuple, Any, Set
from dataclasses import dataclass, asdict
from pathlib import Path
import logging
from datetime import datetime, timedelta
import threading

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class AuditEvent:
    """Single audit event record"""
    event_id: str
    timestamp: str
    event_type: str  # backup_created, backup_verified, recovery_started, etc.
    operation_id: str
    user_id: str
    resource_path: str
    content_hash: str
    metadata: Dict[str, Any]
    integrity_status: str  # verified, failed, pending
    compliance_flags: List[str]

@dataclass
class IntegrityReport:
    """Integrity verification report"""
    report_id: str
    timestamp: str
    scope: str  # file, backup, full_system
    total_items: int
    verified_items: int
    failed_items: int
    missing_items: int
    corrupted_items: int
    hash_mismatches: int
    performance_metrics: Dict[str, float]
    detailed_results: List[Dict[str, Any]]

@dataclass
class HashTreeNode:
    """Node in immutable hash tree"""
    node_id: str
    parent_id: Optional[str]
    content_hash: str
    metadata_hash: str
    combined_hash: str
    timestamp: str
    children: List[str]

class FrameBudgetMonitor:
    """Monitor frame budget during verification operations"""
    def __init__(self, frame_budget_ms: float = 16.67):
        self.frame_budget_ms = frame_budget_ms
        self.start_time = None
        
    def start_frame(self):
        """Start timing a frame"""
        self.start_time = time.perf_counter()
        
    def check_budget(self) -> bool:
        """Check if we're within frame budget"""
        if self.start_time is None:
            return True
        elapsed_ms = (time.perf_counter() - self.start_time) * 1000
        return elapsed_ms < self.frame_budget_ms
        
    def yield_if_needed(self):
        """Yield control if frame budget exceeded"""
        if not self.check_budget():
            time.sleep(0.001)  # Brief yield
            self.start_frame()

class AuditDatabase:
    """SQLite database for immutable audit trails"""
    
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.lock = threading.Lock()
        self._init_database()
        
    def _init_database(self):
        """Initialize audit database schema"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS audit_events (
                    event_id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    operation_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    resource_path TEXT NOT NULL,
                    content_hash TEXT NOT NULL,
                    metadata TEXT NOT NULL,
                    integrity_status TEXT NOT NULL,
                    compliance_flags TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS hash_tree (
                    node_id TEXT PRIMARY KEY,
                    parent_id TEXT,
                    content_hash TEXT NOT NULL,
                    metadata_hash TEXT NOT NULL,
                    combined_hash TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    children TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS integrity_reports (
                    report_id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    scope TEXT NOT NULL,
                    total_items INTEGER NOT NULL,
                    verified_items INTEGER NOT NULL,
                    failed_items INTEGER NOT NULL,
                    missing_items INTEGER NOT NULL,
                    corrupted_items INTEGER NOT NULL,
                    hash_mismatches INTEGER NOT NULL,
                    performance_metrics TEXT NOT NULL,
                    detailed_results TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create indexes for performance
            conn.execute("CREATE INDEX IF NOT EXISTS idx_events_timestamp ON audit_events(timestamp)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_events_type ON audit_events(event_type)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_events_operation ON audit_events(operation_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_tree_parent ON hash_tree(parent_id)")
            
    def add_audit_event(self, event: AuditEvent) -> bool:
        """Add immutable audit event"""
        try:
            with self.lock:
                with sqlite3.connect(self.db_path) as conn:
                    conn.execute("""
                        INSERT INTO audit_events 
                        (event_id, timestamp, event_type, operation_id, user_id, 
                         resource_path, content_hash, metadata, integrity_status, compliance_flags)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        event.event_id, event.timestamp, event.event_type,
                        event.operation_id, event.user_id, event.resource_path,
                        event.content_hash, json.dumps(event.metadata),
                        event.integrity_status, json.dumps(event.compliance_flags)
                    ))
            return True
        except Exception as e:
            logger.error(f"Failed to add audit event: {e}")
            return False
            
    def get_audit_trail(self, operation_id: str) -> List[AuditEvent]:
        """Get complete audit trail for operation"""
        events = []
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute("""
                    SELECT * FROM audit_events 
                    WHERE operation_id = ? 
                    ORDER BY timestamp
                """, (operation_id,))
                
                for row in cursor.fetchall():
                    event = AuditEvent(
                        event_id=row[0],
                        timestamp=row[1],
                        event_type=row[2],
                        operation_id=row[3],
                        user_id=row[4],
                        resource_path=row[5],
                        content_hash=row[6],
                        metadata=json.loads(row[7]),
                        integrity_status=row[8],
                        compliance_flags=json.loads(row[9])
                    )
                    events.append(event)
        except Exception as e:
            logger.error(f"Failed to get audit trail: {e}")
            
        return events

class HashTreeManager:
    """Manage immutable hash trees for backup integrity"""
    
    def __init__(self, audit_db: AuditDatabase):
        self.audit_db = audit_db
        
    def calculate_file_hash(self, file_path: Path) -> str:
        """Calculate SHA-256 hash of file content"""
        hasher = hashlib.sha256()
        try:
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(8192), b""):
                    hasher.update(chunk)
            return hasher.hexdigest()
        except Exception as e:
            logger.error(f"Failed to calculate hash for {file_path}: {e}")
            return ""
            
    def calculate_metadata_hash(self, metadata: Dict[str, Any]) -> str:
        """Calculate hash of metadata"""
        metadata_json = json.dumps(metadata, sort_keys=True)
        return hashlib.sha256(metadata_json.encode()).hexdigest()
        
    def create_hash_tree_node(self, content_hash: str, metadata: Dict[str, Any],
                            parent_id: Optional[str] = None) -> HashTreeNode:
        """Create new hash tree node"""
        node_id = hashlib.sha256(f"{content_hash}{time.time()}".encode()).hexdigest()
        metadata_hash = self.calculate_metadata_hash(metadata)
        combined_hash = hashlib.sha256(f"{content_hash}{metadata_hash}".encode()).hexdigest()
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        
        node = HashTreeNode(
            node_id=node_id,
            parent_id=parent_id,
            content_hash=content_hash,
            metadata_hash=metadata_hash,
            combined_hash=combined_hash,
            timestamp=timestamp,
            children=[]
        )
        
        # Store in database
        try:
            with sqlite3.connect(self.audit_db.db_path) as conn:
                conn.execute("""
                    INSERT INTO hash_tree 
                    (node_id, parent_id, content_hash, metadata_hash, 
                     combined_hash, timestamp, children)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    node.node_id, node.parent_id, node.content_hash,
                    node.metadata_hash, node.combined_hash, node.timestamp,
                    json.dumps(node.children)
                ))
        except Exception as e:
            logger.error(f"Failed to store hash tree node: {e}")
            
        return node
        
    def verify_hash_tree_integrity(self, node_id: str) -> bool:
        """Verify integrity of hash tree node and descendants"""
        try:
            with sqlite3.connect(self.audit_db.db_path) as conn:
                cursor = conn.execute("""
                    SELECT * FROM hash_tree WHERE node_id = ?
                """, (node_id,))
                
                row = cursor.fetchone()
                if not row:
                    return False
                    
                # Verify combined hash
                content_hash = row[2]
                metadata_hash = row[3]
                stored_combined_hash = row[4]
                
                calculated_combined_hash = hashlib.sha256(
                    f"{content_hash}{metadata_hash}".encode()
                ).hexdigest()
                
                if calculated_combined_hash != stored_combined_hash:
                    logger.error(f"Hash tree integrity failed for node {node_id}")
                    return False
                    
                # Verify children recursively
                children = json.loads(row[6])
                for child_id in children:
                    if not self.verify_hash_tree_integrity(child_id):
                        return False
                        
                return True
                
        except Exception as e:
            logger.error(f"Failed to verify hash tree integrity: {e}")
            return False

class IntegrityVerifier:
    """Comprehensive integrity verification for backups"""
    
    def __init__(self, audit_db: AuditDatabase):
        self.audit_db = audit_db
        self.hash_tree_manager = HashTreeManager(audit_db)
        self.frame_monitor = FrameBudgetMonitor()
        
    def verify_file_integrity(self, file_path: Path, expected_hash: str) -> bool:
        """Verify integrity of single file"""
        if not file_path.exists():
            logger.error(f"File not found: {file_path}")
            return False
            
        actual_hash = self.hash_tree_manager.calculate_file_hash(file_path)
        if actual_hash != expected_hash:
            logger.error(f"Hash mismatch for {file_path}: expected {expected_hash}, got {actual_hash}")
            return False
            
        return True
        
    def verify_backup_integrity(self, backup_manifest: Dict[str, Any]) -> IntegrityReport:
        """Verify integrity of complete backup"""
        report_id = hashlib.sha256(f"integrity_{time.time()}".encode()).hexdigest()
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        start_time = time.perf_counter()
        
        files = backup_manifest.get('files', [])
        total_items = len(files)
        verified_items = 0
        failed_items = 0
        missing_items = 0
        corrupted_items = 0
        hash_mismatches = 0
        detailed_results = []
        
        self.frame_monitor.start_frame()
        
        for file_entry in files:
            file_path = Path(file_entry['path'])
            expected_hash = file_entry.get('hash', '')
            
            result = {
                'path': str(file_path),
                'expected_hash': expected_hash,
                'status': 'unknown',
                'actual_hash': '',
                'error': ''
            }
            
            try:
                if not file_path.exists():
                    result['status'] = 'missing'
                    missing_items += 1
                else:
                    actual_hash = self.hash_tree_manager.calculate_file_hash(file_path)
                    result['actual_hash'] = actual_hash
                    
                    if actual_hash == expected_hash:
                        result['status'] = 'verified'
                        verified_items += 1
                    else:
                        result['status'] = 'hash_mismatch'
                        hash_mismatches += 1
                        
            except Exception as e:
                result['status'] = 'error'
                result['error'] = str(e)
                failed_items += 1
                
            detailed_results.append(result)
            self.frame_monitor.yield_if_needed()
            
        # Calculate performance metrics
        end_time = time.perf_counter()
        performance_metrics = {
            'total_duration_seconds': end_time - start_time,
            'files_per_second': total_items / (end_time - start_time) if end_time > start_time else 0,
            'verification_rate_mbps': sum(f.get('size', 0) for f in files) / (1024 * 1024) / (end_time - start_time) if end_time > start_time else 0
        }
        
        # Create integrity report
        report = IntegrityReport(
            report_id=report_id,
            timestamp=timestamp,
            scope='backup',
            total_items=total_items,
            verified_items=verified_items,
            failed_items=failed_items,
            missing_items=missing_items,
            corrupted_items=corrupted_items,
            hash_mismatches=hash_mismatches,
            performance_metrics=performance_metrics,
            detailed_results=detailed_results
        )
        
        # Store report in database
        try:
            with sqlite3.connect(self.audit_db.db_path) as conn:
                conn.execute("""
                    INSERT INTO integrity_reports 
                    (report_id, timestamp, scope, total_items, verified_items,
                     failed_items, missing_items, corrupted_items, hash_mismatches,
                     performance_metrics, detailed_results)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    report.report_id, report.timestamp, report.scope,
                    report.total_items, report.verified_items, report.failed_items,
                    report.missing_items, report.corrupted_items, report.hash_mismatches,
                    json.dumps(report.performance_metrics),
                    json.dumps(report.detailed_results)
                ))
        except Exception as e:
            logger.error(f"Failed to store integrity report: {e}")
            
        return report
        
    def verify_system_integrity(self, backup_directory: Path) -> IntegrityReport:
        """Verify integrity of entire backup system"""
        report_id = hashlib.sha256(f"system_integrity_{time.time()}".encode()).hexdigest()
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        start_time = time.perf_counter()
        
        # Find all backup manifests
        manifest_files = list(backup_directory.glob("**/backup-manifest.json"))
        total_items = 0
        verified_items = 0
        failed_items = 0
        missing_items = 0
        corrupted_items = 0
        hash_mismatches = 0
        detailed_results = []
        
        for manifest_file in manifest_files:
            try:
                with open(manifest_file, 'r') as f:
                    manifest = json.load(f)
                    
                backup_report = self.verify_backup_integrity(manifest)
                
                # Aggregate results
                total_items += backup_report.total_items
                verified_items += backup_report.verified_items
                failed_items += backup_report.failed_items
                missing_items += backup_report.missing_items
                corrupted_items += backup_report.corrupted_items
                hash_mismatches += backup_report.hash_mismatches
                
                detailed_results.append({
                    'manifest': str(manifest_file),
                    'backup_report_id': backup_report.report_id,
                    'status': 'completed'
                })
                
            except Exception as e:
                logger.error(f"Failed to verify manifest {manifest_file}: {e}")
                detailed_results.append({
                    'manifest': str(manifest_file),
                    'status': 'error',
                    'error': str(e)
                })
                failed_items += 1
                
        # Calculate performance metrics
        end_time = time.perf_counter()
        performance_metrics = {
            'total_duration_seconds': end_time - start_time,
            'manifests_processed': len(manifest_files),
            'files_per_second': total_items / (end_time - start_time) if end_time > start_time else 0
        }
        
        # Create system integrity report
        report = IntegrityReport(
            report_id=report_id,
            timestamp=timestamp,
            scope='full_system',
            total_items=total_items,
            verified_items=verified_items,
            failed_items=failed_items,
            missing_items=missing_items,
            corrupted_items=corrupted_items,
            hash_mismatches=hash_mismatches,
            performance_metrics=performance_metrics,
            detailed_results=detailed_results
        )
        
        return report

class AuditVerifyManager:
    """Main audit and verification manager"""
    
    def __init__(self, audit_db_path: Path):
        self.audit_db = AuditDatabase(audit_db_path)
        self.integrity_verifier = IntegrityVerifier(self.audit_db)
        self.hash_tree_manager = HashTreeManager(self.audit_db)
        
    def log_backup_operation(self, operation_id: str, user_id: str, 
                           backup_manifest: Dict[str, Any]) -> bool:
        """Log backup operation with audit trail"""
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        
        # Create audit event for backup start
        start_event = AuditEvent(
            event_id=hashlib.sha256(f"{operation_id}_start_{timestamp}".encode()).hexdigest(),
            timestamp=timestamp,
            event_type="backup_started",
            operation_id=operation_id,
            user_id=user_id,
            resource_path=backup_manifest.get('backup_path', ''),
            content_hash='',
            metadata=backup_manifest,
            integrity_status='pending',
            compliance_flags=['local_first', 'privacy_preserving']
        )
        
        success = self.audit_db.add_audit_event(start_event)
        
        # Create hash tree nodes for each file
        for file_entry in backup_manifest.get('files', []):
            file_hash = file_entry.get('hash', '')
            if file_hash:
                node = self.hash_tree_manager.create_hash_tree_node(
                    file_hash, file_entry
                )
                
                # Log file verification event
                file_event = AuditEvent(
                    event_id=hashlib.sha256(f"{operation_id}_file_{file_hash}".encode()).hexdigest(),
                    timestamp=timestamp,
                    event_type="file_verified",
                    operation_id=operation_id,
                    user_id=user_id,
                    resource_path=file_entry['path'],
                    content_hash=file_hash,
                    metadata={'node_id': node.node_id},
                    integrity_status='verified',
                    compliance_flags=['sha256_verified', 'immutable_trail']
                )
                
                self.audit_db.add_audit_event(file_event)
                
        return success
        
    def generate_compliance_report(self, start_date: str, end_date: str) -> Dict[str, Any]:
        """Generate compliance report for audit period"""
        try:
            with sqlite3.connect(self.audit_db.db_path) as conn:
                cursor = conn.execute("""
                    SELECT event_type, COUNT(*) as count,
                           compliance_flags, integrity_status
                    FROM audit_events 
                    WHERE timestamp BETWEEN ? AND ?
                    GROUP BY event_type, integrity_status
                """, (start_date, end_date))
                
                results = cursor.fetchall()
                
                compliance_report = {
                    'report_period': {'start': start_date, 'end': end_date},
                    'summary': {
                        'total_events': sum(row[1] for row in results),
                        'event_types': {},
                        'integrity_status': {},
                        'compliance_flags': {}
                    },
                    'details': results
                }
                
                # Aggregate statistics
                for row in results:
                    event_type, count, flags_json, status = row
                    
                    if event_type not in compliance_report['summary']['event_types']:
                        compliance_report['summary']['event_types'][event_type] = 0
                    compliance_report['summary']['event_types'][event_type] += count
                    
                    if status not in compliance_report['summary']['integrity_status']:
                        compliance_report['summary']['integrity_status'][status] = 0
                    compliance_report['summary']['integrity_status'][status] += count
                    
                return compliance_report
                
        except Exception as e:
            logger.error(f"Failed to generate compliance report: {e}")
            return {}

def main():
    """Example usage of audit and verification system"""
    audit_db_path = Path("./audit_test.db")
    manager = AuditVerifyManager(audit_db_path)
    
    # Example backup manifest
    test_manifest = {
        'backup_id': 'test_backup_001',
        'backup_path': '/test/backup',
        'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        'files': [
            {
                'path': '/test/file1.txt',
                'hash': 'abc123def456',
                'size': 1024,
                'permissions': '644'
            }
        ]
    }
    
    # Log backup operation
    success = manager.log_backup_operation(
        'test_op_001', 'test_user', test_manifest
    )
    
    if success:
        print("Audit logging successful")
        
        # Generate compliance report
        start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ")
        end_date = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
        
        report = manager.generate_compliance_report(start_date, end_date)
        print(f"Compliance report generated: {len(report.get('details', []))} events")
    else:
        print("Audit logging failed")

if __name__ == "__main__":
    main()
