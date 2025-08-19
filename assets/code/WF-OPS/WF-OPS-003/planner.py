#!/usr/bin/env python3
"""
WF-OPS-003 Backup Planner
Energy-aware backup planning with monitoring integration and performance budgets
"""

import os
import sys
import json
import time
import sqlite3
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum
import threading
import queue

# Performance monitoring
import psutil
from performance_hooks import FrameBudgetMonitor, PerformanceTracker

class BackupStrategy(Enum):
    FULL = "full"
    INCREMENTAL = "incremental"
    DIFFERENTIAL = "differential"

class BackupTrigger(Enum):
    SCHEDULED = "scheduled"
    MANUAL = "manual"
    EVENT = "event"
    POLICY = "policy"

@dataclass
class BackupPlan:
    """Represents a planned backup operation"""
    plan_id: str
    backup_id: str
    created_utc: str
    strategy: BackupStrategy
    trigger: BackupTrigger
    includes: List[str]
    excludes: List[str]
    estimated_size_bytes: int
    estimated_duration_ms: int
    scheduled_utc: str
    priority: int
    performance_budget: Dict[str, float]
    dependencies: List[str]
    governance_checks: Dict[str, bool]

@dataclass
class SystemHealth:
    """Current system health metrics"""
    cpu_percent: float
    memory_percent: float
    disk_usage_percent: float
    fps: float
    frame_time_ms: float
    load_average: float
    is_healthy: bool

class WirthForgeBackupPlanner:
    """
    Energy-aware backup planner that coordinates with WF-OPS-002 monitoring
    to schedule backups during optimal system windows
    """
    
    def __init__(self, config_path: str = "config/backup-planner.json"):
        self.config_path = config_path
        self.config = self._load_config()
        self.db_path = self.config.get("database_path", "data/backup_planner.db")
        self.monitoring_client = None
        self.frame_monitor = FrameBudgetMonitor(budget_ms=16.67)
        self.performance_tracker = PerformanceTracker()
        
        # Initialize database
        self._init_database()
        
        # Load retention policies
        self.retention_policies = self._load_retention_policies()
        
        # Planning queue and worker
        self.planning_queue = queue.Queue()
        self.planning_thread = None
        self.running = False
        
        # Performance thresholds
        self.performance_thresholds = {
            "max_cpu_percent": self.config.get("max_cpu_percent", 60),
            "min_fps": self.config.get("min_fps", 58),
            "max_memory_percent": self.config.get("max_memory_percent", 80),
            "frame_budget_ms": self.config.get("frame_budget_ms", 16.67)
        }
        
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    def _load_config(self) -> Dict[str, Any]:
        """Load planner configuration"""
        try:
            with open(self.config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return self._default_config()
    
    def _default_config(self) -> Dict[str, Any]:
        """Default planner configuration"""
        return {
            "database_path": "data/backup_planner.db",
            "monitoring_endpoint": "ws://127.0.0.1:8080",
            "max_cpu_percent": 60,
            "min_fps": 58,
            "max_memory_percent": 80,
            "frame_budget_ms": 16.67,
            "planning_interval_seconds": 300,
            "backup_components": {
                "db": {"priority": 10, "avg_size_mb": 50},
                "config": {"priority": 9, "avg_size_mb": 1},
                "logs": {"priority": 7, "avg_size_mb": 10},
                "certs": {"priority": 8, "avg_size_mb": 1},
                "models": {"priority": 5, "avg_size_mb": 2000},
                "audit": {"priority": 9, "avg_size_mb": 5}
            },
            "schedule_templates": {
                "daily": {"hour": 2, "minute": 0},
                "weekly": {"day": 0, "hour": 2, "minute": 0},
                "monthly": {"day": 1, "hour": 2, "minute": 0}
            }
        }
    
    def _init_database(self):
        """Initialize SQLite database for backup planning"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS backup_plans (
                    plan_id TEXT PRIMARY KEY,
                    backup_id TEXT NOT NULL,
                    created_utc TEXT NOT NULL,
                    strategy TEXT NOT NULL,
                    trigger_type TEXT NOT NULL,
                    includes TEXT NOT NULL,
                    excludes TEXT,
                    estimated_size_bytes INTEGER,
                    estimated_duration_ms INTEGER,
                    scheduled_utc TEXT,
                    priority INTEGER DEFAULT 5,
                    performance_budget TEXT,
                    dependencies TEXT,
                    governance_checks TEXT,
                    status TEXT DEFAULT 'planned',
                    executed_utc TEXT,
                    execution_result TEXT
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS backup_history (
                    backup_id TEXT PRIMARY KEY,
                    plan_id TEXT,
                    strategy TEXT NOT NULL,
                    components TEXT NOT NULL,
                    size_bytes INTEGER,
                    duration_ms INTEGER,
                    created_utc TEXT NOT NULL,
                    performance_metrics TEXT,
                    success BOOLEAN DEFAULT TRUE,
                    FOREIGN KEY (plan_id) REFERENCES backup_plans (plan_id)
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS system_health_log (
                    timestamp_utc TEXT PRIMARY KEY,
                    cpu_percent REAL,
                    memory_percent REAL,
                    disk_usage_percent REAL,
                    fps REAL,
                    frame_time_ms REAL,
                    load_average REAL,
                    is_healthy BOOLEAN
                )
            """)
    
    def _load_retention_policies(self) -> Dict[str, Any]:
        """Load retention policies from configuration"""
        policies_path = self.config.get("retention_policies_path", "config/retention-policy.json")
        try:
            with open(policies_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return self._default_retention_policy()
    
    def _default_retention_policy(self) -> Dict[str, Any]:
        """Default retention policy"""
        return {
            "policy_id": "retention-policy-default",
            "retention_rules": {
                "count_based": {
                    "enabled": True,
                    "daily_backups": 7,
                    "weekly_backups": 4,
                    "monthly_backups": 12
                },
                "time_based": {
                    "enabled": True,
                    "recent_retention_days": 7,
                    "weekly_retention_days": 30,
                    "monthly_retention_days": 365
                }
            }
        }
    
    def start(self):
        """Start the backup planner service"""
        self.running = True
        self.planning_thread = threading.Thread(target=self._planning_worker, daemon=True)
        self.planning_thread.start()
        self.logger.info("Backup planner started")
    
    def stop(self):
        """Stop the backup planner service"""
        self.running = False
        if self.planning_thread:
            self.planning_thread.join(timeout=5)
        self.logger.info("Backup planner stopped")
    
    def _planning_worker(self):
        """Background worker for backup planning"""
        while self.running:
            try:
                # Check for scheduled planning tasks
                self._process_scheduled_backups()
                
                # Process planning queue
                try:
                    task = self.planning_queue.get(timeout=1)
                    self._process_planning_task(task)
                    self.planning_queue.task_done()
                except queue.Empty:
                    continue
                    
            except Exception as e:
                self.logger.error(f"Planning worker error: {e}")
            
            time.sleep(self.config.get("planning_interval_seconds", 300))
    
    def get_system_health(self) -> SystemHealth:
        """Get current system health metrics"""
        start_time = time.perf_counter()
        
        try:
            # Get system metrics
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Get performance metrics from frame monitor
            frame_time_ms = self.frame_monitor.get_average_frame_time()
            fps = 1000.0 / frame_time_ms if frame_time_ms > 0 else 60.0
            
            # Calculate load average (simplified)
            load_average = psutil.getloadavg()[0] if hasattr(psutil, 'getloadavg') else cpu_percent / 100.0
            
            # Determine if system is healthy for backup operations
            is_healthy = (
                cpu_percent < self.performance_thresholds["max_cpu_percent"] and
                fps >= self.performance_thresholds["min_fps"] and
                memory.percent < self.performance_thresholds["max_memory_percent"] and
                frame_time_ms <= self.performance_thresholds["frame_budget_ms"]
            )
            
            health = SystemHealth(
                cpu_percent=cpu_percent,
                memory_percent=memory.percent,
                disk_usage_percent=disk.percent,
                fps=fps,
                frame_time_ms=frame_time_ms,
                load_average=load_average,
                is_healthy=is_healthy
            )
            
            # Log health metrics
            self._log_system_health(health)
            
            return health
            
        finally:
            # Track frame time for this operation
            frame_time = (time.perf_counter() - start_time) * 1000
            self.frame_monitor.record_frame_time(frame_time)
    
    def _log_system_health(self, health: SystemHealth):
        """Log system health to database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO system_health_log 
                (timestamp_utc, cpu_percent, memory_percent, disk_usage_percent, 
                 fps, frame_time_ms, load_average, is_healthy)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                datetime.utcnow().isoformat(),
                health.cpu_percent,
                health.memory_percent,
                health.disk_usage_percent,
                health.fps,
                health.frame_time_ms,
                health.load_average,
                health.is_healthy
            ))
    
    def create_backup_plan(self, 
                          strategy: BackupStrategy,
                          trigger: BackupTrigger,
                          includes: List[str],
                          excludes: Optional[List[str]] = None,
                          scheduled_time: Optional[datetime] = None,
                          priority: int = 5) -> BackupPlan:
        """Create a new backup plan"""
        
        # Generate unique IDs
        timestamp = datetime.utcnow().strftime("%Y-%m-%d-%H%M%S")
        plan_id = f"plan-{timestamp}"
        backup_id = f"wf-{timestamp}"
        
        # Estimate backup size and duration
        estimated_size, estimated_duration = self._estimate_backup_metrics(includes, excludes or [])
        
        # Set default scheduled time if not provided
        if scheduled_time is None:
            scheduled_time = self._find_next_optimal_window()
        
        # Create performance budget
        performance_budget = {
            "max_frame_time_ms": self.performance_thresholds["frame_budget_ms"],
            "max_cpu_percent": self.performance_thresholds["max_cpu_percent"],
            "max_memory_percent": self.performance_thresholds["max_memory_percent"]
        }
        
        # Determine dependencies for incremental/differential backups
        dependencies = []
        if strategy in [BackupStrategy.INCREMENTAL, BackupStrategy.DIFFERENTIAL]:
            dependencies = self._find_backup_dependencies(strategy)
        
        # Governance checks
        governance_checks = {
            "local_first": True,
            "ui_presence": True,
            "frame_budget_respected": True,
            "no_external_calls": True
        }
        
        plan = BackupPlan(
            plan_id=plan_id,
            backup_id=backup_id,
            created_utc=datetime.utcnow().isoformat(),
            strategy=strategy,
            trigger=trigger,
            includes=includes,
            excludes=excludes or [],
            estimated_size_bytes=estimated_size,
            estimated_duration_ms=estimated_duration,
            scheduled_utc=scheduled_time.isoformat(),
            priority=priority,
            performance_budget=performance_budget,
            dependencies=dependencies,
            governance_checks=governance_checks
        )
        
        # Save plan to database
        self._save_backup_plan(plan)
        
        self.logger.info(f"Created backup plan {plan_id} for {backup_id}")
        return plan
    
    def _estimate_backup_metrics(self, includes: List[str], excludes: List[str]) -> Tuple[int, int]:
        """Estimate backup size and duration"""
        total_size_mb = 0
        components = self.config["backup_components"]
        
        for component in includes:
            if component not in excludes and component in components:
                total_size_mb += components[component]["avg_size_mb"]
        
        # Convert to bytes
        total_size_bytes = int(total_size_mb * 1024 * 1024)
        
        # Estimate duration (assume 50 MB/s throughput with overhead)
        base_throughput_mbps = 50
        overhead_factor = 1.5
        estimated_duration_ms = int((total_size_mb / base_throughput_mbps) * 1000 * overhead_factor)
        
        return total_size_bytes, estimated_duration_ms
    
    def _find_next_optimal_window(self) -> datetime:
        """Find the next optimal backup window based on system health patterns"""
        # For now, use default schedule (2 AM next day)
        now = datetime.utcnow()
        next_backup = now.replace(hour=2, minute=0, second=0, microsecond=0)
        
        if next_backup <= now:
            next_backup += timedelta(days=1)
        
        return next_backup
    
    def _find_backup_dependencies(self, strategy: BackupStrategy) -> List[str]:
        """Find backup dependencies for incremental/differential strategies"""
        dependencies = []
        
        with sqlite3.connect(self.db_path) as conn:
            if strategy == BackupStrategy.INCREMENTAL:
                # Find most recent backup
                cursor = conn.execute("""
                    SELECT backup_id FROM backup_history 
                    WHERE success = TRUE 
                    ORDER BY created_utc DESC 
                    LIMIT 1
                """)
                result = cursor.fetchone()
                if result:
                    dependencies.append(result[0])
            
            elif strategy == BackupStrategy.DIFFERENTIAL:
                # Find most recent full backup
                cursor = conn.execute("""
                    SELECT backup_id FROM backup_history 
                    WHERE strategy = 'full' AND success = TRUE 
                    ORDER BY created_utc DESC 
                    LIMIT 1
                """)
                result = cursor.fetchone()
                if result:
                    dependencies.append(result[0])
        
        return dependencies
    
    def _save_backup_plan(self, plan: BackupPlan):
        """Save backup plan to database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO backup_plans 
                (plan_id, backup_id, created_utc, strategy, trigger_type,
                 includes, excludes, estimated_size_bytes, estimated_duration_ms,
                 scheduled_utc, priority, performance_budget, dependencies, governance_checks)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                plan.plan_id,
                plan.backup_id,
                plan.created_utc,
                plan.strategy.value,
                plan.trigger.value,
                json.dumps(plan.includes),
                json.dumps(plan.excludes),
                plan.estimated_size_bytes,
                plan.estimated_duration_ms,
                plan.scheduled_utc,
                plan.priority,
                json.dumps(plan.performance_budget),
                json.dumps(plan.dependencies),
                json.dumps(plan.governance_checks)
            ))
    
    def get_pending_plans(self) -> List[BackupPlan]:
        """Get all pending backup plans"""
        plans = []
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT plan_id, backup_id, created_utc, strategy, trigger_type,
                       includes, excludes, estimated_size_bytes, estimated_duration_ms,
                       scheduled_utc, priority, performance_budget, dependencies, governance_checks
                FROM backup_plans 
                WHERE status = 'planned'
                ORDER BY priority DESC, scheduled_utc ASC
            """)
            
            for row in cursor.fetchall():
                plan = BackupPlan(
                    plan_id=row[0],
                    backup_id=row[1],
                    created_utc=row[2],
                    strategy=BackupStrategy(row[3]),
                    trigger=BackupTrigger(row[4]),
                    includes=json.loads(row[5]),
                    excludes=json.loads(row[6]) if row[6] else [],
                    estimated_size_bytes=row[7],
                    estimated_duration_ms=row[8],
                    scheduled_utc=row[9],
                    priority=row[10],
                    performance_budget=json.loads(row[11]),
                    dependencies=json.loads(row[12]),
                    governance_checks=json.loads(row[13])
                )
                plans.append(plan)
        
        return plans
    
    def should_execute_backup(self, plan: BackupPlan) -> Tuple[bool, str]:
        """Determine if a backup should be executed now"""
        # Check if scheduled time has passed
        scheduled_time = datetime.fromisoformat(plan.scheduled_utc.replace('Z', '+00:00'))
        if datetime.utcnow() < scheduled_time.replace(tzinfo=None):
            return False, "Not yet scheduled"
        
        # Check system health
        health = self.get_system_health()
        if not health.is_healthy:
            return False, f"System unhealthy: CPU={health.cpu_percent:.1f}%, FPS={health.fps:.1f}"
        
        # Check dependencies
        if plan.dependencies:
            missing_deps = self._check_dependencies(plan.dependencies)
            if missing_deps:
                return False, f"Missing dependencies: {missing_deps}"
        
        # Check governance requirements
        if not all(plan.governance_checks.values()):
            return False, "Governance checks failed"
        
        return True, "Ready for execution"
    
    def _check_dependencies(self, dependencies: List[str]) -> List[str]:
        """Check if backup dependencies are available"""
        missing = []
        
        with sqlite3.connect(self.db_path) as conn:
            for dep_id in dependencies:
                cursor = conn.execute("""
                    SELECT backup_id FROM backup_history 
                    WHERE backup_id = ? AND success = TRUE
                """, (dep_id,))
                
                if not cursor.fetchone():
                    missing.append(dep_id)
        
        return missing
    
    def _process_scheduled_backups(self):
        """Process scheduled backup plans"""
        pending_plans = self.get_pending_plans()
        
        for plan in pending_plans:
            should_execute, reason = self.should_execute_backup(plan)
            
            if should_execute:
                self.logger.info(f"Executing backup plan {plan.plan_id}")
                self._execute_backup_plan(plan)
            else:
                self.logger.debug(f"Skipping backup plan {plan.plan_id}: {reason}")
    
    def _execute_backup_plan(self, plan: BackupPlan):
        """Execute a backup plan (delegates to backup engine)"""
        # Update plan status
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                UPDATE backup_plans 
                SET status = 'executing', executed_utc = ?
                WHERE plan_id = ?
            """, (datetime.utcnow().isoformat(), plan.plan_id))
        
        # This would typically call the backup engine
        # For now, we'll just log the execution
        self.logger.info(f"Backup plan {plan.plan_id} handed off to backup engine")
    
    def _process_planning_task(self, task: Dict[str, Any]):
        """Process a planning task from the queue"""
        task_type = task.get("type")
        
        if task_type == "create_scheduled_backup":
            self._create_scheduled_backup(task)
        elif task_type == "update_retention":
            self._update_retention_policies(task)
        elif task_type == "health_check":
            self.get_system_health()
    
    def _create_scheduled_backup(self, task: Dict[str, Any]):
        """Create a scheduled backup based on task parameters"""
        strategy = BackupStrategy(task.get("strategy", "incremental"))
        includes = task.get("includes", ["db", "config", "logs"])
        excludes = task.get("excludes", [])
        priority = task.get("priority", 5)
        
        plan = self.create_backup_plan(
            strategy=strategy,
            trigger=BackupTrigger.SCHEDULED,
            includes=includes,
            excludes=excludes,
            priority=priority
        )
        
        self.logger.info(f"Created scheduled backup plan: {plan.plan_id}")
    
    def schedule_backup(self, 
                       strategy: str = "incremental",
                       includes: Optional[List[str]] = None,
                       excludes: Optional[List[str]] = None,
                       priority: int = 5) -> str:
        """Schedule a new backup (public API)"""
        
        if includes is None:
            includes = ["db", "config", "logs"]
        
        plan = self.create_backup_plan(
            strategy=BackupStrategy(strategy),
            trigger=BackupTrigger.MANUAL,
            includes=includes,
            excludes=excludes or [],
            priority=priority
        )
        
        return plan.plan_id
    
    def get_backup_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get backup history"""
        history = []
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT backup_id, strategy, components, size_bytes, duration_ms,
                       created_utc, success
                FROM backup_history 
                ORDER BY created_utc DESC 
                LIMIT ?
            """, (limit,))
            
            for row in cursor.fetchall():
                history.append({
                    "backup_id": row[0],
                    "strategy": row[1],
                    "components": json.loads(row[2]) if row[2] else [],
                    "size_bytes": row[3],
                    "duration_ms": row[4],
                    "created_utc": row[5],
                    "success": bool(row[6])
                })
        
        return history

# Performance monitoring utilities
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
    planner = WirthForgeBackupPlanner()
    planner.start()
    
    try:
        # Create a backup plan
        plan_id = planner.schedule_backup(
            strategy="incremental",
            includes=["db", "config", "logs"],
            priority=7
        )
        
        print(f"Created backup plan: {plan_id}")
        
        # Check system health
        health = planner.get_system_health()
        print(f"System health: CPU={health.cpu_percent:.1f}%, FPS={health.fps:.1f}")
        
        # Get pending plans
        pending = planner.get_pending_plans()
        print(f"Pending plans: {len(pending)}")
        
        # Keep running
        time.sleep(10)
        
    finally:
        planner.stop()
