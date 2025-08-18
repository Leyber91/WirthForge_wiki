"""
WF-UX-006 Plugin Sandbox
Performance-isolated plugin execution environment with strict resource limits
"""

import time
import threading
import multiprocessing
import queue
import signal
import psutil
import os
from typing import Dict, Any, Optional, Callable, List, Union
from dataclasses import dataclass
from enum import Enum
import json
import logging
import traceback
import resource
import sys

class PluginState(Enum):
    """Plugin execution states"""
    IDLE = "idle"
    LOADING = "loading"
    RUNNING = "running"
    THROTTLED = "throttled"
    SUSPENDED = "suspended"
    TERMINATED = "terminated"
    ERROR = "error"

class ViolationType(Enum):
    """Types of resource violations"""
    FRAME_TIME = "frame_time"
    CPU_USAGE = "cpu_usage"
    MEMORY_USAGE = "memory_usage"
    THREAD_COUNT = "thread_count"
    FILE_HANDLES = "file_handles"
    NETWORK_CALLS = "network_calls"
    DISK_IO = "disk_io"

@dataclass
class ResourceLimits:
    """Resource limits for plugin execution"""
    max_frame_time_ms: float = 8.0  # Max frame time budget
    max_cpu_percent: float = 25.0   # Max CPU usage
    max_memory_mb: float = 100.0    # Max memory usage
    max_threads: int = 4            # Max thread count
    max_file_handles: int = 20      # Max open file handles
    max_network_calls_per_sec: int = 10  # Max network requests
    max_disk_io_mb_per_sec: float = 5.0  # Max disk I/O

@dataclass
class ResourceUsage:
    """Current resource usage metrics"""
    frame_time_ms: float = 0.0
    cpu_percent: float = 0.0
    memory_mb: float = 0.0
    thread_count: int = 0
    file_handle_count: int = 0
    network_calls_per_sec: int = 0
    disk_io_mb_per_sec: float = 0.0

@dataclass
class ViolationEvent:
    """Resource violation event"""
    timestamp: float
    plugin_id: str
    violation_type: ViolationType
    current_value: float
    limit_value: float
    severity: str
    action_taken: str

class PluginSandbox:
    """
    Isolated execution environment for plugins with strict resource monitoring
    Enforces frame time budgets and system resource limits
    """
    
    def __init__(self, plugin_id: str, limits: Optional[ResourceLimits] = None):
        """
        Initialize plugin sandbox
        
        Args:
            plugin_id: Unique plugin identifier
            limits: Resource limits (uses defaults if None)
        """
        self.plugin_id = plugin_id
        self.limits = limits or ResourceLimits()
        
        # State management
        self.state = PluginState.IDLE
        self.process: Optional[multiprocessing.Process] = None
        self.process_id: Optional[int] = None
        
        # Resource monitoring
        self.current_usage = ResourceUsage()
        self.violation_history: List[ViolationEvent] = []
        self.violation_count = 0
        self.consecutive_violations = 0
        
        # Frame timing
        self.frame_start_time = 0.0
        self.frame_budget_ms = self.limits.max_frame_time_ms
        self.frame_overruns = 0
        
        # Throttling control
        self.throttle_level = 0  # 0 = no throttling, 1-5 = increasing throttle
        self.throttle_sleep_ms = 0.0
        self.last_throttle_time = 0.0
        
        # Communication
        self.command_queue = multiprocessing.Queue()
        self.result_queue = multiprocessing.Queue()
        self.shutdown_event = multiprocessing.Event()
        
        # Callbacks
        self.violation_callbacks: List[Callable[[ViolationEvent], None]] = []
        self.state_callbacks: List[Callable[[PluginState], None]] = []
        
        # Monitoring thread
        self._monitoring = False
        self._monitor_thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()
        
        # Logger
        self.logger = logging.getLogger(f"sandbox.{plugin_id}")
    
    def start_plugin(self, plugin_module: str, plugin_args: Dict[str, Any] = None) -> bool:
        """
        Start plugin in sandboxed environment
        
        Args:
            plugin_module: Python module path for the plugin
            plugin_args: Arguments to pass to plugin
            
        Returns:
            True if started successfully
        """
        if self.state != PluginState.IDLE:
            self.logger.warning(f"Cannot start plugin in state: {self.state}")
            return False
        
        try:
            self._set_state(PluginState.LOADING)
            
            # Create sandboxed process
            self.process = multiprocessing.Process(
                target=self._plugin_worker,
                args=(plugin_module, plugin_args or {}),
                daemon=True
            )
            
            self.process.start()
            self.process_id = self.process.pid
            
            # Start monitoring
            self._start_monitoring()
            
            self._set_state(PluginState.RUNNING)
            self.logger.info(f"Plugin started with PID: {self.process_id}")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to start plugin: {e}")
            self._set_state(PluginState.ERROR)
            return False
    
    def stop_plugin(self, timeout: float = 5.0) -> bool:
        """
        Stop plugin execution
        
        Args:
            timeout: Maximum time to wait for graceful shutdown
            
        Returns:
            True if stopped successfully
        """
        if self.state == PluginState.IDLE:
            return True
        
        try:
            # Signal shutdown
            self.shutdown_event.set()
            
            # Stop monitoring
            self._stop_monitoring()
            
            if self.process and self.process.is_alive():
                # Try graceful shutdown first
                self.process.join(timeout=timeout)
                
                if self.process.is_alive():
                    # Force termination
                    self.logger.warning(f"Force terminating plugin {self.plugin_id}")
                    self.process.terminate()
                    self.process.join(timeout=2.0)
                    
                    if self.process.is_alive():
                        # Kill if still alive
                        self.process.kill()
                        self.process.join()
            
            self._set_state(PluginState.TERMINATED)
            self.logger.info(f"Plugin {self.plugin_id} stopped")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error stopping plugin: {e}")
            return False
    
    def start_frame(self) -> None:
        """Start frame timing measurement"""
        self.frame_start_time = time.perf_counter()
    
    def end_frame(self) -> float:
        """
        End frame timing and check budget
        
        Returns:
            Frame time in milliseconds
        """
        if self.frame_start_time == 0.0:
            return 0.0
        
        frame_time = (time.perf_counter() - self.frame_start_time) * 1000.0
        self.current_usage.frame_time_ms = frame_time
        
        # Check frame budget violation
        if frame_time > self.frame_budget_ms:
            self.frame_overruns += 1
            self._handle_violation(
                ViolationType.FRAME_TIME,
                frame_time,
                self.frame_budget_ms
            )
        
        self.frame_start_time = 0.0
        return frame_time
    
    def execute_plugin_call(self, method: str, args: Dict[str, Any] = None, 
                          timeout: float = None) -> Any:
        """
        Execute plugin method call with timeout and monitoring
        
        Args:
            method: Plugin method to call
            args: Method arguments
            timeout: Call timeout (uses frame budget if None)
            
        Returns:
            Method result or None if failed/timeout
        """
        if self.state != PluginState.RUNNING:
            self.logger.warning(f"Cannot execute call in state: {self.state}")
            return None
        
        if timeout is None:
            timeout = self.frame_budget_ms / 1000.0
        
        try:
            # Apply throttling if active
            if self.throttle_sleep_ms > 0:
                time.sleep(self.throttle_sleep_ms / 1000.0)
            
            # Start frame timing
            self.start_frame()
            
            # Send command to plugin process
            command = {
                "method": method,
                "args": args or {},
                "timeout": timeout
            }
            
            self.command_queue.put(command, timeout=1.0)
            
            # Wait for result
            try:
                result = self.result_queue.get(timeout=timeout)
                
                if isinstance(result, dict) and result.get("error"):
                    self.logger.error(f"Plugin error: {result['error']}")
                    return None
                
                return result
                
            except queue.Empty:
                self.logger.warning(f"Plugin call timeout: {method}")
                self._handle_violation(
                    ViolationType.FRAME_TIME,
                    timeout * 1000.0,
                    self.frame_budget_ms
                )
                return None
            
        except Exception as e:
            self.logger.error(f"Plugin call failed: {e}")
            return None
        
        finally:
            # End frame timing
            self.end_frame()
    
    def _plugin_worker(self, plugin_module: str, plugin_args: Dict[str, Any]) -> None:
        """Plugin worker process main function"""
        try:
            # Set resource limits for this process
            self._set_process_limits()
            
            # Import and initialize plugin
            plugin_instance = self._load_plugin(plugin_module, plugin_args)
            
            if not plugin_instance:
                return
            
            # Main execution loop
            while not self.shutdown_event.is_set():
                try:
                    # Check for commands
                    try:
                        command = self.command_queue.get(timeout=0.1)
                        result = self._execute_plugin_method(plugin_instance, command)
                        self.result_queue.put(result, timeout=1.0)
                        
                    except queue.Empty:
                        continue
                    except queue.Full:
                        self.logger.warning("Result queue full, dropping result")
                        continue
                
                except Exception as e:
                    self.logger.error(f"Plugin worker error: {e}")
                    self.result_queue.put({"error": str(e)})
        
        except Exception as e:
            self.logger.error(f"Plugin worker fatal error: {e}")
        
        finally:
            self.logger.info(f"Plugin worker {self.plugin_id} exiting")
    
    def _load_plugin(self, plugin_module: str, plugin_args: Dict[str, Any]) -> Any:
        """Load and initialize plugin module"""
        try:
            # Dynamic import
            module = __import__(plugin_module, fromlist=[''])
            
            # Look for plugin class or factory function
            if hasattr(module, 'Plugin'):
                return module.Plugin(**plugin_args)
            elif hasattr(module, 'create_plugin'):
                return module.create_plugin(**plugin_args)
            else:
                self.logger.error(f"No Plugin class or create_plugin function found in {plugin_module}")
                return None
        
        except Exception as e:
            self.logger.error(f"Failed to load plugin {plugin_module}: {e}")
            return None
    
    def _execute_plugin_method(self, plugin_instance: Any, command: Dict[str, Any]) -> Any:
        """Execute plugin method with timeout"""
        method_name = command["method"]
        args = command["args"]
        timeout = command["timeout"]
        
        try:
            if not hasattr(plugin_instance, method_name):
                return {"error": f"Method {method_name} not found"}
            
            method = getattr(plugin_instance, method_name)
            
            # Execute with timeout (simplified - real implementation would use signal)
            start_time = time.time()
            result = method(**args)
            execution_time = time.time() - start_time
            
            if execution_time > timeout:
                self.logger.warning(f"Method {method_name} exceeded timeout: {execution_time:.3f}s")
            
            return result
        
        except Exception as e:
            return {"error": f"Method execution failed: {str(e)}"}
    
    def _set_process_limits(self) -> None:
        """Set resource limits for the plugin process"""
        try:
            # Memory limit
            memory_limit_bytes = int(self.limits.max_memory_mb * 1024 * 1024)
            resource.setrlimit(resource.RLIMIT_AS, (memory_limit_bytes, memory_limit_bytes))
            
            # File handle limit
            resource.setrlimit(resource.RLIMIT_NOFILE, (self.limits.max_file_handles, self.limits.max_file_handles))
            
            # CPU time limit (soft limit for monitoring)
            resource.setrlimit(resource.RLIMIT_CPU, (3600, 3600))  # 1 hour max
            
        except Exception as e:
            self.logger.warning(f"Failed to set some resource limits: {e}")
    
    def _start_monitoring(self) -> None:
        """Start resource monitoring thread"""
        if self._monitoring:
            return
        
        self._monitoring = True
        self._monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._monitor_thread.start()
    
    def _stop_monitoring(self) -> None:
        """Stop resource monitoring"""
        self._monitoring = False
        if self._monitor_thread:
            self._monitor_thread.join(timeout=2.0)
    
    def _monitor_loop(self) -> None:
        """Resource monitoring loop"""
        while self._monitoring and self.process_id:
            try:
                # Get process info
                try:
                    process = psutil.Process(self.process_id)
                    
                    # CPU usage
                    cpu_percent = process.cpu_percent()
                    self.current_usage.cpu_percent = cpu_percent
                    
                    # Memory usage
                    memory_info = process.memory_info()
                    memory_mb = memory_info.rss / (1024 * 1024)
                    self.current_usage.memory_mb = memory_mb
                    
                    # Thread count
                    thread_count = process.num_threads()
                    self.current_usage.thread_count = thread_count
                    
                    # File handles
                    try:
                        file_handles = len(process.open_files())
                        self.current_usage.file_handle_count = file_handles
                    except (psutil.AccessDenied, psutil.NoSuchProcess):
                        pass
                    
                    # Check violations
                    self._check_resource_violations()
                    
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    # Process ended or access denied
                    break
                
                time.sleep(0.5)  # Monitor every 500ms
                
            except Exception as e:
                self.logger.error(f"Monitoring error: {e}")
                time.sleep(1.0)
    
    def _check_resource_violations(self) -> None:
        """Check for resource limit violations"""
        # CPU violation
        if self.current_usage.cpu_percent > self.limits.max_cpu_percent:
            self._handle_violation(
                ViolationType.CPU_USAGE,
                self.current_usage.cpu_percent,
                self.limits.max_cpu_percent
            )
        
        # Memory violation
        if self.current_usage.memory_mb > self.limits.max_memory_mb:
            self._handle_violation(
                ViolationType.MEMORY_USAGE,
                self.current_usage.memory_mb,
                self.limits.max_memory_mb
            )
        
        # Thread count violation
        if self.current_usage.thread_count > self.limits.max_threads:
            self._handle_violation(
                ViolationType.THREAD_COUNT,
                self.current_usage.thread_count,
                self.limits.max_threads
            )
        
        # File handle violation
        if self.current_usage.file_handle_count > self.limits.max_file_handles:
            self._handle_violation(
                ViolationType.FILE_HANDLES,
                self.current_usage.file_handle_count,
                self.limits.max_file_handles
            )
    
    def _handle_violation(self, violation_type: ViolationType, 
                         current_value: float, limit_value: float) -> None:
        """Handle resource violation"""
        with self._lock:
            self.violation_count += 1
            self.consecutive_violations += 1
            
            # Determine severity and action
            severity_ratio = current_value / limit_value
            
            if severity_ratio > 2.0:
                severity = "critical"
                action = "suspend"
            elif severity_ratio > 1.5:
                severity = "high"
                action = "throttle_heavy"
            elif severity_ratio > 1.2:
                severity = "medium"
                action = "throttle_light"
            else:
                severity = "low"
                action = "warning"
            
            # Create violation event
            violation = ViolationEvent(
                timestamp=time.time(),
                plugin_id=self.plugin_id,
                violation_type=violation_type,
                current_value=current_value,
                limit_value=limit_value,
                severity=severity,
                action_taken=action
            )
            
            self.violation_history.append(violation)
            
            # Take action
            self._take_enforcement_action(action, violation)
            
            # Trigger callbacks
            for callback in self.violation_callbacks:
                try:
                    callback(violation)
                except Exception as e:
                    self.logger.error(f"Violation callback failed: {e}")
    
    def _take_enforcement_action(self, action: str, violation: ViolationEvent) -> None:
        """Take enforcement action for violation"""
        if action == "warning":
            self.logger.warning(f"Resource violation: {violation.violation_type.value} "
                              f"{violation.current_value:.1f} > {violation.limit_value:.1f}")
        
        elif action == "throttle_light":
            self.throttle_level = min(3, self.throttle_level + 1)
            self.throttle_sleep_ms = self.throttle_level * 2.0
            self._set_state(PluginState.THROTTLED)
            self.logger.warning(f"Light throttling applied: {self.throttle_sleep_ms}ms delay")
        
        elif action == "throttle_heavy":
            self.throttle_level = min(5, self.throttle_level + 2)
            self.throttle_sleep_ms = self.throttle_level * 5.0
            self._set_state(PluginState.THROTTLED)
            self.logger.warning(f"Heavy throttling applied: {self.throttle_sleep_ms}ms delay")
        
        elif action == "suspend":
            self._set_state(PluginState.SUSPENDED)
            self.logger.error(f"Plugin suspended due to critical violation")
            # Suspend plugin execution (implementation specific)
    
    def _set_state(self, new_state: PluginState) -> None:
        """Set plugin state and trigger callbacks"""
        if new_state != self.state:
            old_state = self.state
            self.state = new_state
            
            self.logger.info(f"State change: {old_state.value} → {new_state.value}")
            
            # Reset consecutive violations on recovery
            if new_state == PluginState.RUNNING:
                self.consecutive_violations = 0
                self.throttle_level = 0
                self.throttle_sleep_ms = 0.0
            
            # Trigger callbacks
            for callback in self.state_callbacks:
                try:
                    callback(new_state)
                except Exception as e:
                    self.logger.error(f"State callback failed: {e}")
    
    def get_status(self) -> Dict[str, Any]:
        """Get current sandbox status"""
        return {
            "plugin_id": self.plugin_id,
            "state": self.state.value,
            "process_id": self.process_id,
            "current_usage": self.current_usage.__dict__,
            "limits": self.limits.__dict__,
            "violation_count": self.violation_count,
            "consecutive_violations": self.consecutive_violations,
            "throttle_level": self.throttle_level,
            "frame_overruns": self.frame_overruns
        }
    
    def add_violation_callback(self, callback: Callable[[ViolationEvent], None]) -> None:
        """Add violation event callback"""
        self.violation_callbacks.append(callback)
    
    def add_state_callback(self, callback: Callable[[PluginState], None]) -> None:
        """Add state change callback"""
        self.state_callbacks.append(callback)

# Example usage
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    def on_violation(violation: ViolationEvent):
        print(f"VIOLATION: {violation.plugin_id} - {violation.violation_type.value} "
              f"{violation.current_value:.1f} > {violation.limit_value:.1f} "
              f"({violation.severity}) -> {violation.action_taken}")
    
    def on_state_change(state: PluginState):
        print(f"State changed to: {state.value}")
    
    # Create sandbox with strict limits
    limits = ResourceLimits(
        max_frame_time_ms=5.0,
        max_cpu_percent=15.0,
        max_memory_mb=50.0
    )
    
    sandbox = PluginSandbox("test_plugin", limits)
    sandbox.add_violation_callback(on_violation)
    sandbox.add_state_callback(on_state_change)
    
    print("Plugin sandbox example - would need actual plugin module to test")
    print(f"Status: {json.dumps(sandbox.get_status(), indent=2)}")
