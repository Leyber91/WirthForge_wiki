#!/usr/bin/env python3
"""
WF-OPS-003 Backup Engine
Local-first backup engine with SHA-256 content addressing and frame budget compliance
"""

import os
import sys
import json
import time
import sqlite3
import hashlib
import shutil
import gzip
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any, Iterator
from dataclasses import dataclass
from pathlib import Path
import threading
import queue

# Performance monitoring
import psutil
from performance_hooks import FrameBudgetMonitor, PerformanceTracker

CHUNK_SIZE = 1024 * 1024  # 1MB chunks for file processing
FRAME_BUDGET_MS = 16.67   # 60Hz frame budget

@dataclass
class BackupItem:
    """Represents a single item in a backup"""
    path: str
    size: int
    sha256: str
    compressed: bool = False
    encrypted: bool = False
    modified_utc: str = ""
    permissions: str = ""

@dataclass
class BackupManifest:
    """Backup manifest containing all backup metadata"""
    backup_id: str
    created_utc: str
    strategy: str
    includes: List[str]
    excludes: List[str]
    root_hash: str
    items: List[BackupItem]
    wf_version: str
    engine_ver: str
    governance: Dict[str, bool]
    performance: Dict[str, Any]
    dependencies: Dict[str, Any]

class WirthForgeBackupEngine:
    """
    Local-first backup engine that creates content-addressed backups
    with SHA-256 integrity verification and frame budget compliance
    """
    
    def __init__(self, config_path: str = "config/backup-engine.json"):
        self.config_path = config_path
        self.config = self._load_config()
        self.backup_root = Path(self.config.get("backup_root", "backups"))
        self.source_root = Path(self.config.get("source_root", "data"))
        
        # Performance monitoring
        self.frame_monitor = FrameBudgetMonitor(FRAME_BUDGET_MS)
        self.performance_tracker = PerformanceTracker()
        
        # Progress tracking
        self.progress_callback = None
        self.current_operation = None
        
        # Ensure backup directory exists
        self.backup_root.mkdir(parents=True, exist_ok=True)
        
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    def _load_config(self) -> Dict[str, Any]:
        """Load backup engine configuration"""
        try:
            with open(self.config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return self._default_config()
    
    def _default_config(self) -> Dict[str, Any]:
        """Default backup engine configuration"""
        return {
            "backup_root": "backups",
            "source_root": "data",
            "compression_enabled": True,
            "compression_level": 6,
            "frame_budget_ms": 16.67,
            "max_frame_overruns": 5,
            "chunk_size": 1024 * 1024,
            "verify_after_backup": True,
            "component_paths": {
                "db": "data/wirthforge.db",
                "config": "config/",
                "logs": "logs/",
                "certs": "certs/",
                "models": "models/",
                "audit": "audit/"
            }
        }
    
    def create_backup(self, 
                     backup_id: str,
                     strategy: str,
                     includes: List[str],
                     excludes: Optional[List[str]] = None,
                     parent_backup_id: Optional[str] = None) -> BackupManifest:
        """Create a new backup with the specified parameters"""
        
        start_time = time.perf_counter()
        self.performance_tracker.start_operation(backup_id)
        
        try:
            self.logger.info(f"Starting backup {backup_id} with strategy {strategy}")
            
            # Create backup directory
            backup_dir = self.backup_root / backup_id
            backup_dir.mkdir(parents=True, exist_ok=True)
            
            # Initialize manifest
            manifest = BackupManifest(
                backup_id=backup_id,
                created_utc=datetime.utcnow().isoformat() + "Z",
                strategy=strategy,
                includes=includes,
                excludes=excludes or [],
                root_hash="",  # Will be calculated later
                items=[],
                wf_version="1.0.0",
                engine_ver="1.0",
                governance={
                    "local_first": True,
                    "ui_presence": True,
                    "frame_budget_respected": True,
                    "no_external_calls": True
                },
                performance={},
                dependencies={}
            )
            
            # Set up dependencies for incremental/differential backups
            if parent_backup_id:
                manifest.dependencies = {
                    "parent_backup_id": parent_backup_id
                }
                if strategy == "incremental":
                    manifest.dependencies["base_backup_id"] = self._find_base_backup(parent_backup_id)
            
            # Process each component
            total_size = 0
            frame_overruns = 0
            
            for component in includes:
                if component in excludes:
                    continue
                
                component_path = self.config["component_paths"].get(component)
                if not component_path:
                    self.logger.warning(f"Unknown component: {component}")
                    continue
                
                source_path = Path(component_path)
                if not source_path.exists():
                    self.logger.warning(f"Component path does not exist: {source_path}")
                    continue
                
                # Process component with frame budget monitoring
                component_items, component_size, overruns = self._backup_component(
                    source_path, backup_dir, component, strategy, parent_backup_id
                )
                
                manifest.items.extend(component_items)
                total_size += component_size
                frame_overruns += overruns
                
                # Update progress
                if self.progress_callback:
                    progress = len(manifest.items) / len(includes) * 100
                    self.progress_callback(backup_id, progress, f"Processed {component}")
            
            # Calculate root hash
            manifest.root_hash = self._calculate_root_hash(manifest.items)
            
            # Record performance metrics
            end_time = time.perf_counter()
            performance_metrics = self.performance_tracker.end_operation(backup_id)
            
            manifest.performance = {
                "duration_ms": int((end_time - start_time) * 1000),
                "total_size_bytes": total_size,
                "avg_frame_time_ms": performance_metrics.get("avg_frame_time_ms", 0),
                "max_frame_time_ms": performance_metrics.get("max_frame_time_ms", 0),
                "frame_overruns": frame_overruns,
                "bytes_per_second": int(total_size / (end_time - start_time)) if end_time > start_time else 0
            }
            
            # Update governance flags based on performance
            manifest.governance["frame_budget_respected"] = frame_overruns <= self.config.get("max_frame_overruns", 5)
            
            # Save manifest
            self._save_manifest(manifest, backup_dir)
            
            # Verify backup if configured
            if self.config.get("verify_after_backup", True):
                if not self._verify_backup(manifest, backup_dir):
                    raise RuntimeError(f"Backup verification failed for {backup_id}")
            
            self.logger.info(f"Backup {backup_id} completed successfully")
            return manifest
            
        except Exception as e:
            self.logger.error(f"Backup {backup_id} failed: {e}")
            # Cleanup partial backup
            backup_dir = self.backup_root / backup_id
            if backup_dir.exists():
                shutil.rmtree(backup_dir)
            raise
    
    def _backup_component(self, 
                         source_path: Path, 
                         backup_dir: Path, 
                         component: str,
                         strategy: str,
                         parent_backup_id: Optional[str]) -> Tuple[List[BackupItem], int, int]:
        """Backup a single component with frame budget monitoring"""
        
        items = []
        total_size = 0
        frame_overruns = 0
        
        if source_path.is_file():
            # Single file
            item, size, overruns = self._backup_file(source_path, backup_dir, strategy, parent_backup_id)
            if item:
                items.append(item)
                total_size += size
                frame_overruns += overruns
        
        elif source_path.is_dir():
            # Directory - recursively backup all files
            for file_path in source_path.rglob("*"):
                if file_path.is_file():
                    frame_start = time.perf_counter()
                    
                    item, size, overruns = self._backup_file(file_path, backup_dir, strategy, parent_backup_id)
                    if item:
                        items.append(item)
                        total_size += size
                        frame_overruns += overruns
                    
                    # Check frame budget
                    frame_time = (time.perf_counter() - frame_start) * 1000
                    self.frame_monitor.record_frame_time(frame_time)
                    self.performance_tracker.record_frame_time(self.current_operation or "backup", frame_time)
                    
                    if frame_time > FRAME_BUDGET_MS:
                        frame_overruns += 1
                        # Brief pause to allow UI updates
                        time.sleep(0.001)
        
        return items, total_size, frame_overruns
    
    def _backup_file(self, 
                    source_path: Path, 
                    backup_dir: Path, 
                    strategy: str,
                    parent_backup_id: Optional[str]) -> Tuple[Optional[BackupItem], int, int]:
        """Backup a single file with content addressing"""
        
        frame_overruns = 0
        
        try:
            # Calculate file hash
            file_hash = self._sha256_file(source_path)
            
            # For incremental/differential, check if file changed
            if strategy in ["incremental", "differential"] and parent_backup_id:
                if not self._file_changed_since_backup(source_path, file_hash, parent_backup_id):
                    # File unchanged, skip
                    return None, 0, 0
            
            # Determine destination path
            relative_path = source_path.relative_to(self.source_root)
            dest_path = backup_dir / relative_path
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Copy file with hash verification
            file_size = source_path.stat().st_size
            copied_hash = self._copy_with_hash(source_path, dest_path)
            
            # Verify hash matches
            if copied_hash != file_hash:
                raise RuntimeError(f"Hash mismatch for {source_path}: expected {file_hash}, got {copied_hash}")
            
            # Get file metadata
            stat = source_path.stat()
            
            # Create backup item
            item = BackupItem(
                path=str(relative_path),
                size=file_size,
                sha256=file_hash,
                compressed=False,  # Compression handled separately if needed
                encrypted=False,
                modified_utc=datetime.fromtimestamp(stat.st_mtime).isoformat() + "Z",
                permissions=oct(stat.st_mode)[-3:]
            )
            
            return item, file_size, frame_overruns
            
        except Exception as e:
            self.logger.error(f"Failed to backup file {source_path}: {e}")
            return None, 0, frame_overruns
    
    def _sha256_file(self, file_path: Path) -> str:
        """Calculate SHA-256 hash of a file"""
        hash_obj = hashlib.sha256()
        
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(CHUNK_SIZE), b''):
                hash_obj.update(chunk)
        
        return hash_obj.hexdigest()
    
    def _copy_with_hash(self, source_path: Path, dest_path: Path) -> str:
        """Copy file while calculating hash"""
        hash_obj = hashlib.sha256()
        
        with open(source_path, 'rb') as src, open(dest_path, 'wb') as dst:
            for chunk in iter(lambda: src.read(CHUNK_SIZE), b''):
                dst.write(chunk)
                hash_obj.update(chunk)
        
        return hash_obj.hexdigest()
    
    def _file_changed_since_backup(self, file_path: Path, current_hash: str, parent_backup_id: str) -> bool:
        """Check if file has changed since parent backup"""
        try:
            parent_manifest_path = self.backup_root / parent_backup_id / "manifest.json"
            if not parent_manifest_path.exists():
                return True  # Parent backup not found, assume changed
            
            with open(parent_manifest_path, 'r') as f:
                parent_manifest = json.load(f)
            
            relative_path = str(file_path.relative_to(self.source_root))
            
            for item in parent_manifest.get("items", []):
                if item["path"] == relative_path:
                    return item["sha256"] != current_hash
            
            return True  # File not in parent backup, assume new
            
        except Exception as e:
            self.logger.warning(f"Could not check file change status: {e}")
            return True  # Assume changed on error
    
    def _find_base_backup(self, parent_backup_id: str) -> str:
        """Find the base full backup for incremental chains"""
        try:
            parent_manifest_path = self.backup_root / parent_backup_id / "manifest.json"
            if not parent_manifest_path.exists():
                return parent_backup_id
            
            with open(parent_manifest_path, 'r') as f:
                parent_manifest = json.load(f)
            
            if parent_manifest.get("strategy") == "full":
                return parent_backup_id
            
            # Recursively find base backup
            parent_deps = parent_manifest.get("dependencies", {})
            if "base_backup_id" in parent_deps:
                return parent_deps["base_backup_id"]
            elif "parent_backup_id" in parent_deps:
                return self._find_base_backup(parent_deps["parent_backup_id"])
            
            return parent_backup_id
            
        except Exception as e:
            self.logger.warning(f"Could not find base backup: {e}")
            return parent_backup_id
    
    def _calculate_root_hash(self, items: List[BackupItem]) -> str:
        """Calculate root hash for the entire backup"""
        hash_obj = hashlib.sha256()
        
        # Sort items by path for consistent hashing
        sorted_items = sorted(items, key=lambda x: x.path)
        
        for item in sorted_items:
            # Include path and hash in root hash calculation
            hash_obj.update(item.path.encode('utf-8'))
            hash_obj.update(item.sha256.encode('utf-8'))
        
        return "sha256:" + hash_obj.hexdigest()
    
    def _save_manifest(self, manifest: BackupManifest, backup_dir: Path):
        """Save backup manifest to JSON file"""
        manifest_path = backup_dir / "manifest.json"
        
        # Convert to dictionary
        manifest_dict = {
            "backup_id": manifest.backup_id,
            "created_utc": manifest.created_utc,
            "strategy": manifest.strategy,
            "includes": manifest.includes,
            "excludes": manifest.excludes,
            "root_hash": manifest.root_hash,
            "items": [{
                "path": item.path,
                "size": item.size,
                "sha256": item.sha256,
                "compressed": item.compressed,
                "encrypted": item.encrypted,
                "modified_utc": item.modified_utc,
                "permissions": item.permissions
            } for item in manifest.items],
            "wf_version": manifest.wf_version,
            "engine_ver": manifest.engine_ver,
            "governance": manifest.governance,
            "performance": manifest.performance,
            "dependencies": manifest.dependencies
        }
        
        with open(manifest_path, 'w') as f:
            json.dump(manifest_dict, f, indent=2)
    
    def _verify_backup(self, manifest: BackupManifest, backup_dir: Path) -> bool:
        """Verify backup integrity"""
        self.logger.info(f"Verifying backup {manifest.backup_id}")
        
        try:
            # Verify each file
            for item in manifest.items:
                file_path = backup_dir / item.path
                if not file_path.exists():
                    self.logger.error(f"Backup file missing: {item.path}")
                    return False
                
                # Verify file hash
                actual_hash = self._sha256_file(file_path)
                if actual_hash != item.sha256:
                    self.logger.error(f"Hash mismatch for {item.path}: expected {item.sha256}, got {actual_hash}")
                    return False
            
            # Verify root hash
            calculated_root_hash = self._calculate_root_hash(manifest.items)
            if calculated_root_hash != manifest.root_hash:
                self.logger.error(f"Root hash mismatch: expected {manifest.root_hash}, got {calculated_root_hash}")
                return False
            
            self.logger.info(f"Backup {manifest.backup_id} verification successful")
            return True
            
        except Exception as e:
            self.logger.error(f"Backup verification failed: {e}")
            return False
    
    def load_manifest(self, backup_id: str) -> Optional[BackupManifest]:
        """Load backup manifest from file"""
        try:
            manifest_path = self.backup_root / backup_id / "manifest.json"
            if not manifest_path.exists():
                return None
            
            with open(manifest_path, 'r') as f:
                data = json.load(f)
            
            items = []
            for item_data in data.get("items", []):
                item = BackupItem(
                    path=item_data["path"],
                    size=item_data["size"],
                    sha256=item_data["sha256"],
                    compressed=item_data.get("compressed", False),
                    encrypted=item_data.get("encrypted", False),
                    modified_utc=item_data.get("modified_utc", ""),
                    permissions=item_data.get("permissions", "")
                )
                items.append(item)
            
            manifest = BackupManifest(
                backup_id=data["backup_id"],
                created_utc=data["created_utc"],
                strategy=data["strategy"],
                includes=data["includes"],
                excludes=data["excludes"],
                root_hash=data["root_hash"],
                items=items,
                wf_version=data["wf_version"],
                engine_ver=data["engine_ver"],
                governance=data["governance"],
                performance=data.get("performance", {}),
                dependencies=data.get("dependencies", {})
            )
            
            return manifest
            
        except Exception as e:
            self.logger.error(f"Failed to load manifest for {backup_id}: {e}")
            return None
    
    def list_backups(self) -> List[str]:
        """List all available backup IDs"""
        backups = []
        
        for backup_dir in self.backup_root.iterdir():
            if backup_dir.is_dir() and (backup_dir / "manifest.json").exists():
                backups.append(backup_dir.name)
        
        return sorted(backups, reverse=True)  # Most recent first
    
    def get_backup_info(self, backup_id: str) -> Optional[Dict[str, Any]]:
        """Get backup information summary"""
        manifest = self.load_manifest(backup_id)
        if not manifest:
            return None
        
        total_size = sum(item.size for item in manifest.items)
        
        return {
            "backup_id": manifest.backup_id,
            "created_utc": manifest.created_utc,
            "strategy": manifest.strategy,
            "includes": manifest.includes,
            "excludes": manifest.excludes,
            "total_size_bytes": total_size,
            "file_count": len(manifest.items),
            "root_hash": manifest.root_hash,
            "performance": manifest.performance,
            "governance": manifest.governance
        }
    
    def set_progress_callback(self, callback):
        """Set progress callback function"""
        self.progress_callback = callback

# Performance monitoring utilities (imported from planner.py)
class FrameBudgetMonitor:
    """Monitor frame budget compliance during backup operations"""
    
    def __init__(self, budget_ms: float = 16.67):
        self.budget_ms = budget_ms
        self.frame_times = []
        self.violations = 0
    
    def record_frame_time(self, frame_time_ms: float):
        """Record a frame time measurement"""
        self.frame_times.append(frame_time_ms)
        
        if frame_time_ms > self.budget_ms:
            self.violations += 1
        
        # Keep only recent measurements
        if len(self.frame_times) > 1000:
            self.frame_times = self.frame_times[-500:]
    
    def get_average_frame_time(self) -> float:
        """Get average frame time"""
        if not self.frame_times:
            return 0.0
        return sum(self.frame_times) / len(self.frame_times)
    
    def get_violation_rate(self) -> float:
        """Get frame budget violation rate"""
        if not self.frame_times:
            return 0.0
        return self.violations / len(self.frame_times)

class PerformanceTracker:
    """Track performance metrics during backup operations"""
    
    def __init__(self):
        self.metrics = {}
    
    def start_operation(self, operation_id: str):
        """Start tracking an operation"""
        self.metrics[operation_id] = {
            "start_time": time.perf_counter(),
            "frame_times": [],
            "cpu_samples": [],
            "memory_samples": []
        }
    
    def record_frame_time(self, operation_id: str, frame_time_ms: float):
        """Record frame time for an operation"""
        if operation_id in self.metrics:
            self.metrics[operation_id]["frame_times"].append(frame_time_ms)
    
    def end_operation(self, operation_id: str) -> Dict[str, Any]:
        """End tracking and return metrics"""
        if operation_id not in self.metrics:
            return {}
        
        metrics = self.metrics[operation_id]
        end_time = time.perf_counter()
        
        result = {
            "duration_ms": (end_time - metrics["start_time"]) * 1000,
            "avg_frame_time_ms": sum(metrics["frame_times"]) / len(metrics["frame_times"]) if metrics["frame_times"] else 0,
            "max_frame_time_ms": max(metrics["frame_times"]) if metrics["frame_times"] else 0,
            "frame_violations": len([ft for ft in metrics["frame_times"] if ft > 16.67])
        }
        
        del self.metrics[operation_id]
        return result

if __name__ == "__main__":
    # Example usage
    engine = WirthForgeBackupEngine()
    
    # Create a full backup
    manifest = engine.create_backup(
        backup_id="wf-2025-08-19-143000",
        strategy="full",
        includes=["db", "config", "logs"]
    )
    
    print(f"Backup created: {manifest.backup_id}")
    print(f"Total items: {len(manifest.items)}")
    print(f"Root hash: {manifest.root_hash}")
    print(f"Performance: {manifest.performance}")
    
    # List all backups
    backups = engine.list_backups()
    print(f"Available backups: {backups}")
