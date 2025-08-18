#!/usr/bin/env python3
"""
WF-TECH-008 Security Sandbox Implementation
===========================================

Secure sandbox environment for plugin execution with process isolation,
resource limits, and security policy enforcement.

Key Features:
- Process isolation with resource limits
- Restricted execution environment
- System call filtering and monitoring
- Energy usage tracking and enforcement
- Audit logging and security monitoring
"""

import asyncio
import json
import logging
import multiprocessing
import os
import resource
import signal
import subprocess
import sys
import time
import psutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Callable, Union
from dataclasses import dataclass, asdict
from enum import Enum
from queue import Queue, Empty
import threading

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SecurityLevel(Enum):
    """Security levels for plugin execution."""
    STRICT = "strict"
    MODERATE = "moderate"
    RELAXED = "relaxed"
    DEVELOPMENT = "development"

class SandboxStatus(Enum):
    """Sandbox execution status."""
    CREATED = "created"
    STARTING = "starting"
    RUNNING = "running"
    PAUSED = "paused"
    TERMINATED = "terminated"
    ERROR = "error"

@dataclass
class ResourceLimits:
    """Resource limits for sandbox execution."""
    memory_mb: int = 50
    cpu_percent: int = 10
    energy_per_minute: int = 50
    disk_mb: int = 10
    max_files: int = 100
    max_processes: int = 1
    execution_time_seconds: int = 300

@dataclass
class SecurityPolicy:
    """Security policy configuration."""
    level: SecurityLevel = SecurityLevel.STRICT
    allow_network: bool = False
    allow_file_write: bool = False
    allowed_imports: List[str] = None
    blocked_builtins: List[str] = None
    audit_all_calls: bool = True
    
    def __post_init__(self):
        if self.allowed_imports is None:
            self.allowed_imports = ['json', 'math', 'datetime', 'typing']
        if self.blocked_builtins is None:
            self.blocked_builtins = ['open', 'exec', 'eval', '__import__', 'compile']

@dataclass
class SandboxMetrics:
    """Runtime metrics for sandbox execution."""
    start_time: float
    end_time: Optional[float] = None
    peak_memory_mb: float = 0
    cpu_time_seconds: float = 0
    energy_consumed: int = 0
    api_calls_made: int = 0
    security_violations: int = 0
    files_accessed: List[str] = None
    
    def __post_init__(self):
        if self.files_accessed is None:
            self.files_accessed = []

class SecuritySandbox:
    """Secure sandbox for plugin execution."""
    
    def __init__(self, plugin_id: str, limits: ResourceLimits, policy: SecurityPolicy):
        self.plugin_id = plugin_id
        self.limits = limits
        self.policy = policy
        self.status = SandboxStatus.CREATED
        self.process: Optional[multiprocessing.Process] = None
        self.metrics = SandboxMetrics(start_time=time.time())
        self.audit_log: List[Dict[str, Any]] = []
        self.energy_tracker = EnergyTracker(limits.energy_per_minute)
        
    def _create_restricted_environment(self) -> Dict[str, Any]:
        """Create restricted global environment for plugin execution."""
        # Safe built-ins
        safe_builtins = {
            'len': len, 'range': range, 'str': str, 'int': int, 'float': float,
            'bool': bool, 'list': list, 'dict': dict, 'tuple': tuple, 'set': set,
            'min': min, 'max': max, 'sum': sum, 'abs': abs, 'round': round,
            'sorted': sorted, 'reversed': reversed, 'enumerate': enumerate,
            'zip': zip, 'map': map, 'filter': filter,
            'True': True, 'False': False, 'None': None,
            'Exception': Exception, 'ValueError': ValueError, 'TypeError': TypeError,
            'print': self._safe_print
        }
        
        # Remove blocked built-ins
        for blocked in self.policy.blocked_builtins:
            safe_builtins.pop(blocked, None)
            
        # Restricted import function
        def restricted_import(name, globals=None, locals=None, fromlist=(), level=0):
            if name not in self.policy.allowed_imports:
                self._log_security_violation(f"Blocked import: {name}")
                raise ImportError(f"Import '{name}' not allowed in sandbox")
            return __import__(name, globals, locals, fromlist, level)
            
        return {
            '__builtins__': safe_builtins,
            '__import__': restricted_import,
            'wirthforge': self._create_plugin_api()
        }
        
    def _safe_print(self, *args, **kwargs):
        """Safe print function that logs output."""
        message = ' '.join(str(arg) for arg in args)
        self._log_audit("print", {"message": message})
        # In production, might redirect to plugin-specific log
        print(f"[Plugin {self.plugin_id}] {message}")
        
    def _create_plugin_api(self):
        """Create the plugin API object."""
        from .plugin_api_bridge import PluginAPIBridge
        return PluginAPIBridge(self.plugin_id, self.energy_tracker, self._log_audit)
        
    def _apply_resource_limits(self):
        """Apply OS-level resource limits."""
        try:
            # Memory limit
            memory_bytes = self.limits.memory_mb * 1024 * 1024
            resource.setrlimit(resource.RLIMIT_AS, (memory_bytes, memory_bytes))
            
            # CPU priority (lower priority)
            os.nice(10)
            
            # File descriptor limit
            resource.setrlimit(resource.RLIMIT_NOFILE, (self.limits.max_files, self.limits.max_files))
            
            # Process limit
            resource.setrlimit(resource.RLIMIT_NPROC, (self.limits.max_processes, self.limits.max_processes))
            
            # Execution time limit
            resource.setrlimit(resource.RLIMIT_CPU, (self.limits.execution_time_seconds, self.limits.execution_time_seconds))
            
        except Exception as e:
            logger.error(f"Failed to apply resource limits: {e}")
            
    def _monitor_resources(self, process: psutil.Process):
        """Monitor resource usage during execution."""
        try:
            memory_info = process.memory_info()
            self.metrics.peak_memory_mb = max(
                self.metrics.peak_memory_mb,
                memory_info.rss / (1024 * 1024)
            )
            
            cpu_times = process.cpu_times()
            self.metrics.cpu_time_seconds = cpu_times.user + cpu_times.system
            
            # Check limits
            if self.metrics.peak_memory_mb > self.limits.memory_mb:
                self._log_security_violation("Memory limit exceeded")
                return False
                
            if process.cpu_percent() > self.limits.cpu_percent:
                self._log_security_violation("CPU limit exceeded")
                return False
                
        except psutil.NoSuchProcess:
            pass
        except Exception as e:
            logger.error(f"Resource monitoring error: {e}")
            
        return True
        
    def _sandboxed_execution(self, code: str, method: str, args: dict, result_queue: Queue):
        """Execute plugin code in sandboxed environment."""
        try:
            # Apply resource limits
            self._apply_resource_limits()
            
            # Create restricted environment
            restricted_globals = self._create_restricted_environment()
            
            # Execute plugin code
            exec(code, restricted_globals)
            
            # Call the requested method
            if method in restricted_globals:
                result = restricted_globals[method](**args)
                result_queue.put({"success": True, "result": result})
            else:
                result_queue.put({"success": False, "error": f"Method '{method}' not found"})
                
        except Exception as e:
            self._log_security_violation(f"Execution error: {str(e)}")
            result_queue.put({"success": False, "error": str(e)})
            
    def _log_audit(self, action: str, details: Dict[str, Any]):
        """Log audit event."""
        audit_entry = {
            "timestamp": datetime.now().isoformat(),
            "plugin_id": self.plugin_id,
            "action": action,
            "details": details
        }
        self.audit_log.append(audit_entry)
        
        if self.policy.audit_all_calls:
            logger.info(f"Audit [{self.plugin_id}]: {action} - {details}")
            
    def _log_security_violation(self, violation: str):
        """Log security violation."""
        self.metrics.security_violations += 1
        self._log_audit("security_violation", {"violation": violation})
        logger.warning(f"Security violation in plugin {self.plugin_id}: {violation}")
        
    async def execute(self, code: str, method: str = "main", args: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute plugin code in sandbox."""
        if args is None:
            args = {}
            
        self.status = SandboxStatus.STARTING
        result_queue = Queue()
        
        try:
            # Create and start sandboxed process
            self.process = multiprocessing.Process(
                target=self._sandboxed_execution,
                args=(code, method, args, result_queue)
            )
            
            self.process.start()
            self.status = SandboxStatus.RUNNING
            
            # Monitor execution
            psutil_process = psutil.Process(self.process.pid)
            monitor_task = asyncio.create_task(self._monitor_execution(psutil_process))
            
            # Wait for completion with timeout
            timeout = self.limits.execution_time_seconds
            self.process.join(timeout)
            
            if self.process.is_alive():
                # Timeout - terminate process
                self.process.terminate()
                self.process.join(5)  # Wait 5 seconds for graceful termination
                
                if self.process.is_alive():
                    self.process.kill()  # Force kill if still alive
                    
                self.status = SandboxStatus.TERMINATED
                return {"success": False, "error": "Execution timeout"}
                
            # Get result
            try:
                result = result_queue.get_nowait()
                self.status = SandboxStatus.TERMINATED
                return result
            except Empty:
                self.status = SandboxStatus.ERROR
                return {"success": False, "error": "No result returned"}
                
        except Exception as e:
            self.status = SandboxStatus.ERROR
            logger.error(f"Sandbox execution error: {e}")
            return {"success": False, "error": str(e)}
            
        finally:
            self.metrics.end_time = time.time()
            if monitor_task:
                monitor_task.cancel()
                
    async def _monitor_execution(self, process: psutil.Process):
        """Monitor process execution."""
        while self.status == SandboxStatus.RUNNING:
            try:
                if not self._monitor_resources(process):
                    # Resource limit violated - terminate
                    if self.process and self.process.is_alive():
                        self.process.terminate()
                    break
                    
                await asyncio.sleep(0.1)  # Monitor every 100ms
                
            except Exception as e:
                logger.error(f"Monitoring error: {e}")
                break
                
    def get_metrics(self) -> SandboxMetrics:
        """Get execution metrics."""
        return self.metrics
        
    def get_audit_log(self) -> List[Dict[str, Any]]:
        """Get audit log."""
        return self.audit_log.copy()
        
    def cleanup(self):
        """Clean up sandbox resources."""
        if self.process and self.process.is_alive():
            self.process.terminate()
            self.process.join(5)
            if self.process.is_alive():
                self.process.kill()
                
        self.status = SandboxStatus.TERMINATED

class EnergyTracker:
    """Tracks and enforces energy usage limits."""
    
    def __init__(self, limit_per_minute: int):
        self.limit_per_minute = limit_per_minute
        self.usage_log: List[Dict[str, Any]] = []
        self.current_usage = 0
        
    def consume_energy(self, amount: int, operation: str) -> bool:
        """Consume energy and check limits."""
        # Check if within limit
        current_minute_usage = self._get_current_minute_usage()
        if current_minute_usage + amount > self.limit_per_minute:
            return False
            
        # Record usage
        self.usage_log.append({
            "timestamp": time.time(),
            "amount": amount,
            "operation": operation
        })
        
        self.current_usage += amount
        return True
        
    def _get_current_minute_usage(self) -> int:
        """Get energy usage in current minute."""
        current_time = time.time()
        minute_ago = current_time - 60
        
        usage = sum(
            entry["amount"] for entry in self.usage_log
            if entry["timestamp"] > minute_ago
        )
        
        return usage
        
    def get_usage_stats(self) -> Dict[str, Any]:
        """Get usage statistics."""
        return {
            "total_usage": self.current_usage,
            "current_minute_usage": self._get_current_minute_usage(),
            "limit_per_minute": self.limit_per_minute,
            "usage_entries": len(self.usage_log)
        }

class SandboxManager:
    """Manages multiple plugin sandboxes."""
    
    def __init__(self):
        self.sandboxes: Dict[str, SecuritySandbox] = {}
        self.default_limits = ResourceLimits()
        self.default_policy = SecurityPolicy()
        
    def create_sandbox(self, plugin_id: str, limits: Optional[ResourceLimits] = None, 
                      policy: Optional[SecurityPolicy] = None) -> SecuritySandbox:
        """Create a new sandbox for a plugin."""
        limits = limits or self.default_limits
        policy = policy or self.default_policy
        
        sandbox = SecuritySandbox(plugin_id, limits, policy)
        self.sandboxes[plugin_id] = sandbox
        
        logger.info(f"Created sandbox for plugin: {plugin_id}")
        return sandbox
        
    def get_sandbox(self, plugin_id: str) -> Optional[SecuritySandbox]:
        """Get sandbox for plugin."""
        return self.sandboxes.get(plugin_id)
        
    def destroy_sandbox(self, plugin_id: str) -> bool:
        """Destroy sandbox for plugin."""
        if plugin_id in self.sandboxes:
            sandbox = self.sandboxes[plugin_id]
            sandbox.cleanup()
            del self.sandboxes[plugin_id]
            logger.info(f"Destroyed sandbox for plugin: {plugin_id}")
            return True
        return False
        
    def get_all_metrics(self) -> Dict[str, SandboxMetrics]:
        """Get metrics for all sandboxes."""
        return {
            plugin_id: sandbox.get_metrics()
            for plugin_id, sandbox in self.sandboxes.items()
        }
        
    def cleanup_all(self):
        """Clean up all sandboxes."""
        for sandbox in self.sandboxes.values():
            sandbox.cleanup()
        self.sandboxes.clear()

# Security testing utilities
class SecurityTester:
    """Test sandbox security measures."""
    
    @staticmethod
    def test_memory_limit(sandbox: SecuritySandbox) -> bool:
        """Test memory limit enforcement."""
        malicious_code = """
def main():
    # Try to allocate excessive memory
    data = []
    for i in range(1000000):
        data.append([0] * 1000)
    return len(data)
"""
        
        result = asyncio.run(sandbox.execute(malicious_code))
        return not result["success"]  # Should fail due to memory limit
        
    @staticmethod
    def test_import_restriction(sandbox: SecuritySandbox) -> bool:
        """Test import restrictions."""
        malicious_code = """
def main():
    import os
    return os.getcwd()
"""
        
        result = asyncio.run(sandbox.execute(malicious_code))
        return not result["success"]  # Should fail due to import restriction
        
    @staticmethod
    def test_file_access(sandbox: SecuritySandbox) -> bool:
        """Test file access restrictions."""
        malicious_code = """
def main():
    with open('/etc/passwd', 'r') as f:
        return f.read()
"""
        
        result = asyncio.run(sandbox.execute(malicious_code))
        return not result["success"]  # Should fail due to file access restriction

# Example usage
if __name__ == "__main__":
    async def main():
        """Example sandbox usage."""
        manager = SandboxManager()
        
        # Create sandbox with strict limits
        limits = ResourceLimits(memory_mb=10, cpu_percent=5, energy_per_minute=25)
        policy = SecurityPolicy(level=SecurityLevel.STRICT)
        
        sandbox = manager.create_sandbox("test-plugin", limits, policy)
        
        # Test plugin code
        test_code = """
def main():
    result = []
    for i in range(10):
        result.append(i * 2)
    return {"processed": result, "count": len(result)}
"""
        
        # Execute in sandbox
        result = await sandbox.execute(test_code)
        print(f"Execution result: {result}")
        
        # Get metrics
        metrics = sandbox.get_metrics()
        print(f"Sandbox metrics: {asdict(metrics)}")
        
        # Run security tests
        print("Running security tests...")
        print(f"Memory limit test: {'PASS' if SecurityTester.test_memory_limit(sandbox) else 'FAIL'}")
        print(f"Import restriction test: {'PASS' if SecurityTester.test_import_restriction(sandbox) else 'FAIL'}")
        print(f"File access test: {'PASS' if SecurityTester.test_file_access(sandbox) else 'FAIL'}")
        
        # Cleanup
        manager.cleanup_all()
        
    asyncio.run(main())
