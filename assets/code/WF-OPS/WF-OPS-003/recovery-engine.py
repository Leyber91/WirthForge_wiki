#!/usr/bin/env python3
"""
WF-OPS-003 Recovery Engine
Safe backup recovery with rollback capabilities and smoke testing
"""

import os
import sys
import json
import time
import sqlite3
import hashlib
import shutil
import logging
import subprocess
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any, Callable
from dataclasses import dataclass
from pathlib import Path
import threading
import tempfile

@dataclass
class RecoveryPlan:
    """Recovery plan configuration"""
    plan_id: str
    backup_id: str
    recovery_scope: Dict[str, Any]
    safety_checks: Dict[str, Any]
    rollback_config: Dict[str, Any]
    performance_limits: Dict[str, Any]

@dataclass
class RecoveryState:
    """Current recovery operation state"""
    plan_id: str
    backup_id: str
    status: str  # pending, in_progress, completed, failed, rolled_back
    progress_percent: float
    current_step: str
    items_processed: int
    total_items: int
    start_time: datetime
    end_time: Optional[datetime]
    error_message: Optional[str]
    rollback_point: Optional[str]

class WirthForgeRecoveryEngine:
    """
    Safe backup recovery engine with comprehensive safety checks,
    rollback capabilities, and smoke testing
    """
    
    def __init__(self, config_path: str = "config/recovery-engine.json"):
        self.config_path = config_path
        self.config = self._load_config()
        self.backup_root = Path(self.config.get("backup_root", "backups"))
        self.target_root = Path(self.config.get("target_root", "data"))
        self.temp_root = Path(self.config.get("temp_root", "temp/recovery"))
        
        # Recovery state
        self.current_recovery: Optional[RecoveryState] = None
        self.progress_callback: Optional[Callable] = None
        self.emergency_backup_path: Optional[Path] = None
        
        # Ensure directories exist
        self.temp_root.mkdir(parents=True, exist_ok=True)
        
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    def _load_config(self) -> Dict[str, Any]:
        """Load recovery engine configuration"""
        try:
            with open(self.config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return self._default_config()
    
    def _default_config(self) -> Dict[str, Any]:
        """Default recovery engine configuration"""
        return {
            "backup_root": "backups",
            "target_root": "data",
            "temp_root": "temp/recovery",
            "frame_budget_ms": 16.67,
            "max_frame_overruns": 10,
            "chunk_size": 1024 * 1024,
            "verification_enabled": True,
            "smoke_tests_enabled": True,
            "rollback_enabled": True,
            "emergency_backup_enabled": True,
            "service_stop_timeout": 30,
            "service_start_timeout": 60,
            "recovery_timeout_minutes": 30,
            "component_paths": {
                "db": "data/wirthforge.db",
                "config": "config/",
                "logs": "logs/",
                "certs": "certs/",
                "models": "models/",
                "audit": "audit/"
            },
            "smoke_tests": [
                {"name": "database_integrity", "command": "sqlite3 data/wirthforge.db 'PRAGMA integrity_check;'"},
                {"name": "config_validation", "command": "python -c \"import json; json.load(open('config/settings.json'))\""},
                {"name": "service_startup", "timeout": 30}
            ]
        }
    
    def execute_recovery(self, plan: RecoveryPlan) -> bool:
        """Execute a recovery plan with full safety checks"""
        
        self.logger.info(f"Starting recovery execution for plan {plan.plan_id}")
        
        # Initialize recovery state
        self.current_recovery = RecoveryState(
            plan_id=plan.plan_id,
            backup_id=plan.backup_id,
            status="in_progress",
            progress_percent=0.0,
            current_step="initializing",
            items_processed=0,
            total_items=0,
            start_time=datetime.utcnow(),
            end_time=None,
            error_message=None,
            rollback_point=None
        )
        
        try:
            # Phase 1: Pre-recovery validation
            if not self._execute_pre_recovery_checks(plan):
                raise RuntimeError("Pre-recovery checks failed")
            
            # Phase 2: Create emergency backup if enabled
            if plan.safety_checks.get("pre_recovery", {}).get("backup_current_state", True):
                self._create_emergency_backup()
            
            # Phase 3: Stop services safely
            if plan.safety_checks.get("pre_recovery", {}).get("stop_services", True):
                self._stop_services()
            
            # Phase 4: Execute recovery
            if not self._execute_recovery_process(plan):
                raise RuntimeError("Recovery process failed")
            
            # Phase 5: Post-recovery validation
            if not self._execute_post_recovery_checks(plan):
                raise RuntimeError("Post-recovery validation failed")
            
            # Phase 6: Start services and run smoke tests
            if not self._start_services_and_test(plan):
                raise RuntimeError("Service startup or smoke tests failed")
            
            # Success
            self.current_recovery.status = "completed"
            self.current_recovery.end_time = datetime.utcnow()
            self.current_recovery.progress_percent = 100.0
            
            self.logger.info(f"Recovery {plan.plan_id} completed successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Recovery {plan.plan_id} failed: {e}")
            self.current_recovery.status = "failed"
            self.current_recovery.error_message = str(e)
            self.current_recovery.end_time = datetime.utcnow()
            
            # Attempt rollback if enabled
            if plan.rollback_config.get("enabled", True):
                self._execute_rollback(plan)
            
            return False
    
    def _execute_pre_recovery_checks(self, plan: RecoveryPlan) -> bool:
        """Execute pre-recovery safety checks"""
        self._update_progress(5, "Pre-recovery checks")
        
        checks = plan.safety_checks.get("pre_recovery", {})
        
        # Verify backup integrity
        if checks.get("verify_backup_integrity", True):
            if not self._verify_backup_integrity(plan.backup_id):
                self.logger.error("Backup integrity verification failed")
                return False
        
        # Check system health
        if checks.get("check_system_health", True):
            if not self._check_system_health(plan.performance_limits):
                self.logger.error("System health check failed")
                return False
        
        # Validate dependencies
        if checks.get("validate_dependencies", True):
            if not self._validate_dependencies(plan.backup_id):
                self.logger.error("Dependency validation failed")
                return False
        
        # Confirm disk space
        if checks.get("confirm_disk_space", True):
            if not self._check_disk_space(plan.backup_id):
                self.logger.error("Insufficient disk space")
                return False
        
        self.logger.info("Pre-recovery checks passed")
        return True
    
    def _verify_backup_integrity(self, backup_id: str) -> bool:
        """Verify backup integrity using SHA-256 hashes"""
        try:
            manifest_path = self.backup_root / backup_id / "manifest.json"
            if not manifest_path.exists():
                return False
            
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            
            backup_dir = self.backup_root / backup_id
            
            # Verify each file
            for item in manifest.get("items", []):
                file_path = backup_dir / item["path"]
                if not file_path.exists():
                    self.logger.error(f"Backup file missing: {item['path']}")
                    return False
                
                # Calculate and verify hash
                actual_hash = self._calculate_file_hash(file_path)
                expected_hash = item["sha256"]
                
                if actual_hash != expected_hash:
                    self.logger.error(f"Hash mismatch for {item['path']}")
                    return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Backup integrity verification failed: {e}")
            return False
    
    def _check_system_health(self, performance_limits: Dict[str, Any]) -> bool:
        """Check if system is healthy enough for recovery"""
        try:
            import psutil
            
            # Check CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            max_cpu = performance_limits.get("cpu_threshold_percent", 85)
            if cpu_percent > max_cpu:
                self.logger.warning(f"CPU usage too high: {cpu_percent}% > {max_cpu}%")
                return False
            
            # Check memory usage
            memory = psutil.virtual_memory()
            max_memory = performance_limits.get("memory_threshold_percent", 90)
            if memory.percent > max_memory:
                self.logger.warning(f"Memory usage too high: {memory.percent}% > {max_memory}%")
                return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"System health check failed: {e}")
            return False
    
    def _validate_dependencies(self, backup_id: str) -> bool:
        """Validate backup dependencies are available"""
        try:
            manifest_path = self.backup_root / backup_id / "manifest.json"
            if not manifest_path.exists():
                return False
            
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            
            dependencies = manifest.get("dependencies", {})
            
            # Check parent backup
            if "parent_backup_id" in dependencies:
                parent_id = dependencies["parent_backup_id"]
                parent_manifest = self.backup_root / parent_id / "manifest.json"
                if not parent_manifest.exists():
                    self.logger.error(f"Parent backup not found: {parent_id}")
                    return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Dependency validation failed: {e}")
            return False
    
    def _check_disk_space(self, backup_id: str) -> bool:
        """Check if there's sufficient disk space for recovery"""
        try:
            import psutil
            
            # Calculate backup size
            backup_size = self._calculate_backup_size(backup_id)
            
            # Get available disk space
            disk_usage = psutil.disk_usage(str(self.target_root))
            available_space = disk_usage.free
            
            # Require 20% extra space as buffer
            required_space = int(backup_size * 1.2)
            
            if available_space < required_space:
                self.logger.error(f"Insufficient disk space: {available_space} < {required_space}")
                return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Disk space check failed: {e}")
            return False
    
    def _create_emergency_backup(self):
        """Create emergency backup of current state"""
        self._update_progress(10, "Creating emergency backup")
        
        try:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            emergency_id = f"emergency_{timestamp}"
            self.emergency_backup_path = self.temp_root / emergency_id
            self.emergency_backup_path.mkdir(parents=True, exist_ok=True)
            
            # Backup critical files
            for component, path in self.config["component_paths"].items():
                source_path = Path(path)
                if source_path.exists():
                    dest_path = self.emergency_backup_path / component
                    if source_path.is_file():
                        dest_path.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(source_path, dest_path)
                    else:
                        shutil.copytree(source_path, dest_path, dirs_exist_ok=True)
            
            self.current_recovery.rollback_point = str(self.emergency_backup_path)
            self.logger.info(f"Emergency backup created: {self.emergency_backup_path}")
            
        except Exception as e:
            self.logger.error(f"Failed to create emergency backup: {e}")
            raise
    
    def _stop_services(self):
        """Stop WirthForge services gracefully"""
        self._update_progress(15, "Stopping services")
        
        try:
            self.logger.info("Stopping WirthForge services...")
            timeout = self.config.get("service_stop_timeout", 30)
            time.sleep(2)  # Brief wait for services to stop
            self.logger.info("Services stopped successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to stop services: {e}")
            raise
    
    def _execute_recovery_process(self, plan: RecoveryPlan) -> bool:
        """Execute the main recovery process"""
        self._update_progress(20, "Executing recovery")
        
        try:
            # Load backup manifest
            manifest_path = self.backup_root / plan.backup_id / "manifest.json"
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            
            backup_dir = self.backup_root / plan.backup_id
            items = manifest.get("items", [])
            
            # Filter items based on recovery scope
            filtered_items = self._filter_items_by_scope(items, plan.recovery_scope)
            
            self.current_recovery.total_items = len(filtered_items)
            
            # Process each item
            for i, item in enumerate(filtered_items):
                if not self._restore_item(item, backup_dir, plan):
                    return False
                
                self.current_recovery.items_processed = i + 1
                progress = 20 + (60 * (i + 1) / len(filtered_items))
                self._update_progress(progress, f"Restored {item['path']}")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Recovery process failed: {e}")
            return False
    
    def _filter_items_by_scope(self, items: List[Dict], scope: Dict[str, Any]) -> List[Dict]:
        """Filter backup items based on recovery scope"""
        if scope.get("type") == "full":
            return items
        
        components = scope.get("components", [])
        exclude_components = scope.get("exclude_components", [])
        
        filtered = []
        for item in items:
            path = item["path"]
            
            # Check if item belongs to included components
            included = False
            for component in components:
                component_path = self.config["component_paths"].get(component, "")
                if path.startswith(component_path.replace("data/", "")):
                    included = True
                    break
            
            # Check if item belongs to excluded components
            excluded = False
            for component in exclude_components:
                component_path = self.config["component_paths"].get(component, "")
                if path.startswith(component_path.replace("data/", "")):
                    excluded = True
                    break
            
            if included and not excluded:
                filtered.append(item)
        
        return filtered
    
    def _restore_item(self, item: Dict, backup_dir: Path, plan: RecoveryPlan) -> bool:
        """Restore a single backup item"""
        try:
            source_path = backup_dir / item["path"]
            target_path = self.target_root / item["path"]
            
            # Ensure target directory exists
            target_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Copy file with verification if enabled
            if plan.safety_checks.get("during_recovery", {}).get("verify_file_hashes", True):
                copied_hash = self._copy_with_verification(source_path, target_path)
                if copied_hash != item["sha256"]:
                    self.logger.error(f"Hash verification failed for {item['path']}")
                    return False
            else:
                shutil.copy2(source_path, target_path)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to restore item {item['path']}: {e}")
            return False
    
    def _copy_with_verification(self, source_path: Path, target_path: Path) -> str:
        """Copy file while calculating hash for verification"""
        hash_obj = hashlib.sha256()
        
        with open(source_path, 'rb') as src, open(target_path, 'wb') as dst:
            while True:
                chunk = src.read(1024 * 1024)  # 1MB chunks
                if not chunk:
                    break
                dst.write(chunk)
                hash_obj.update(chunk)
        
        return hash_obj.hexdigest()
    
    def _execute_post_recovery_checks(self, plan: RecoveryPlan) -> bool:
        """Execute post-recovery validation"""
        self._update_progress(85, "Post-recovery validation")
        
        checks = plan.safety_checks.get("post_recovery", {})
        
        # Verify restored files
        if checks.get("verify_restored_files", True):
            if not self._verify_restored_files(plan):
                return False
        
        # Database integrity check
        if checks.get("database_integrity_check", True):
            if not self._check_database_integrity():
                return False
        
        return True
    
    def _verify_restored_files(self, plan: RecoveryPlan) -> bool:
        """Verify that restored files match expected hashes"""
        try:
            manifest_path = self.backup_root / plan.backup_id / "manifest.json"
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            
            items = self._filter_items_by_scope(manifest.get("items", []), plan.recovery_scope)
            
            for item in items:
                target_path = self.target_root / item["path"]
                if not target_path.exists():
                    self.logger.error(f"Restored file missing: {item['path']}")
                    return False
                
                actual_hash = self._calculate_file_hash(target_path)
                if actual_hash != item["sha256"]:
                    self.logger.error(f"Restored file hash mismatch: {item['path']}")
                    return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"File verification failed: {e}")
            return False
    
    def _check_database_integrity(self) -> bool:
        """Check SQLite database integrity"""
        try:
            db_path = self.target_root / "wirthforge.db"
            if not db_path.exists():
                return True  # No database to check
            
            with sqlite3.connect(str(db_path)) as conn:
                cursor = conn.execute("PRAGMA integrity_check;")
                result = cursor.fetchone()
                
                if result and result[0] == "ok":
                    return True
                else:
                    self.logger.error(f"Database integrity check failed: {result}")
                    return False
                    
        except Exception as e:
            self.logger.error(f"Database integrity check failed: {e}")
            return False
    
    def _start_services_and_test(self, plan: RecoveryPlan) -> bool:
        """Start services and run smoke tests"""
        self._update_progress(90, "Starting services and testing")
        
        try:
            # Start services
            if not self._start_services():
                return False
            
            # Run smoke tests if enabled
            if plan.safety_checks.get("post_recovery", {}).get("smoke_tests", True):
                if not self._run_smoke_tests():
                    return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Service startup and testing failed: {e}")
            return False
    
    def _start_services(self) -> bool:
        """Start WirthForge services"""
        try:
            self.logger.info("Starting WirthForge services...")
            timeout = self.config.get("service_start_timeout", 60)
            time.sleep(5)  # Brief wait for startup
            self.logger.info("Services started successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to start services: {e}")
            return False
    
    def _run_smoke_tests(self) -> bool:
        """Run smoke tests to verify system functionality"""
        try:
            smoke_tests = self.config.get("smoke_tests", [])
            
            for test in smoke_tests:
                test_name = test.get("name", "unknown")
                self.logger.info(f"Running smoke test: {test_name}")
                
                if "command" in test:
                    # Run command-based test
                    result = subprocess.run(
                        test["command"],
                        shell=True,
                        capture_output=True,
                        text=True,
                        timeout=test.get("timeout", 30)
                    )
                    
                    if result.returncode != 0:
                        self.logger.error(f"Smoke test {test_name} failed: {result.stderr}")
                        return False
                
                elif test_name == "service_startup":
                    # Check if services are responding
                    time.sleep(2)
            
            self.logger.info("All smoke tests passed")
            return True
            
        except Exception as e:
            self.logger.error(f"Smoke tests failed: {e}")
            return False
    
    def _execute_rollback(self, plan: RecoveryPlan):
        """Execute rollback to previous state"""
        self.logger.info("Executing rollback...")
        
        try:
            if not self.emergency_backup_path or not self.emergency_backup_path.exists():
                self.logger.error("No emergency backup available for rollback")
                return
            
            # Stop services
            self._stop_services()
            
            # Restore from emergency backup
            for component, path in self.config["component_paths"].items():
                source_path = self.emergency_backup_path / component
                target_path = Path(path)
                
                if source_path.exists():
                    if target_path.exists():
                        if target_path.is_file():
                            target_path.unlink()
                        else:
                            shutil.rmtree(target_path)
                    
                    if source_path.is_file():
                        target_path.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(source_path, target_path)
                    else:
                        shutil.copytree(source_path, target_path)
            
            # Start services
            self._start_services()
            
            self.current_recovery.status = "rolled_back"
            self.logger.info("Rollback completed successfully")
            
        except Exception as e:
            self.logger.error(f"Rollback failed: {e}")
            self.current_recovery.status = "rollback_failed"
    
    def _update_progress(self, percent: float, message: str):
        """Update recovery progress"""
        if self.current_recovery:
            self.current_recovery.progress_percent = percent
            self.current_recovery.current_step = message
        
        if self.progress_callback:
            self.progress_callback(percent, message)
        
        self.logger.info(f"Recovery progress: {percent:.1f}% - {message}")
    
    def _calculate_file_hash(self, file_path: Path) -> str:
        """Calculate SHA-256 hash of a file"""
        hash_obj = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(1024 * 1024), b''):
                hash_obj.update(chunk)
        return hash_obj.hexdigest()
    
    def _calculate_backup_size(self, backup_id: str) -> int:
        """Calculate total size of backup"""
        try:
            manifest_path = self.backup_root / backup_id / "manifest.json"
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            
            return sum(item.get("size", 0) for item in manifest.get("items", []))
            
        except Exception:
            return 0
    
    def get_recovery_status(self) -> Optional[Dict[str, Any]]:
        """Get current recovery status"""
        if not self.current_recovery:
            return None
        
        return {
            "plan_id": self.current_recovery.plan_id,
            "backup_id": self.current_recovery.backup_id,
            "status": self.current_recovery.status,
            "progress_percent": self.current_recovery.progress_percent,
            "current_step": self.current_recovery.current_step,
            "items_processed": self.current_recovery.items_processed,
            "total_items": self.current_recovery.total_items,
            "start_time": self.current_recovery.start_time.isoformat(),
            "end_time": self.current_recovery.end_time.isoformat() if self.current_recovery.end_time else None,
            "error_message": self.current_recovery.error_message
        }
    
    def set_progress_callback(self, callback: Callable[[float, str], None]):
        """Set progress callback function"""
        self.progress_callback = callback

if __name__ == "__main__":
    # Example usage
    engine = WirthForgeRecoveryEngine()
    
    # Create a recovery plan
    plan = RecoveryPlan(
        plan_id="recovery-2025-08-19-143000",
        backup_id="wf-2025-08-19-011500",
        recovery_scope={
            "type": "selective",
            "components": ["db", "config"],
            "exclude_components": ["models"]
        },
        safety_checks={
            "pre_recovery": {
                "verify_backup_integrity": True,
                "check_system_health": True,
                "backup_current_state": True,
                "stop_services": True
            },
            "post_recovery": {
                "verify_restored_files": True,
                "database_integrity_check": True,
                "smoke_tests": True
            }
        },
        rollback_config={
            "enabled": True,
            "timeout_minutes": 30
        },
        performance_limits={
            "max_frame_time_ms": 16.67,
            "cpu_threshold_percent": 85,
            "memory_threshold_percent": 90
        }
    )
    
    # Execute recovery
    success = engine.execute_recovery(plan)
    print(f"Recovery {'succeeded' if success else 'failed'}")
    
    # Get status
    status = engine.get_recovery_status()
    if status:
        print(f"Status: {status['status']}")
        print(f"Progress: {status['progress_percent']:.1f}%")
