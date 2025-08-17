"""
WF-TECH-006 Plugin Sandbox Manager
WIRTHFORGE Security & Privacy Implementation

This module provides secure sandboxing for plugins and extensions, implementing
the permission-based security model with process isolation and resource limits.

Key Features:
- Process-based plugin isolation
- Permission schema validation
- Resource usage monitoring and limits
- Secure IPC communication
- Plugin lifecycle management
- Security policy enforcement

Author: WIRTHFORGE Security Team
Version: 1.0.0
License: MIT
"""

import os
import sys
import json
import subprocess
import psutil
import tempfile
import shutil
import signal
import asyncio
import logging
from typing import Dict, List, Optional, Any, Set, Callable
from dataclasses import dataclass, asdict
from pathlib import Path
from datetime import datetime, timedelta
import multiprocessing as mp
from concurrent.futures import ProcessPoolExecutor
import jsonschema
from jsonschema import validate, ValidationError

logger = logging.getLogger(__name__)

@dataclass
class PluginPermissions:
    """Plugin permission configuration"""
    # Event permissions
    read_events: List[str] = None
    write_events: List[str] = None
    
    # System permissions
    allow_network: bool = False
    allow_filesystem: bool = False
    allow_ui_render: bool = False
    allow_system_calls: bool = False
    
    # Resource limits
    max_memory_mb: int = 128
    max_cpu_percent: int = 20
    max_execution_time_seconds: int = 300
    max_file_size_mb: int = 10
    
    # Sandbox settings
    temp_directory_only: bool = True
    isolated_process: bool = True
    restricted_imports: bool = True
    
    def __post_init__(self):
        if self.read_events is None:
            self.read_events = []
        if self.write_events is None:
            self.write_events = []

@dataclass
class PluginManifest:
    """Plugin manifest with metadata and permissions"""
    name: str
    version: str
    description: str
    author: str
    permissions: PluginPermissions
    entry_point: str
    dependencies: List[str] = None
    
    def __post_init__(self):
        if self.dependencies is None:
            self.dependencies = []

@dataclass
class SandboxStatus:
    """Current status of a sandboxed plugin"""
    plugin_name: str
    process_id: Optional[int]
    status: str  # "starting", "running", "stopped", "error"
    memory_usage_mb: float
    cpu_usage_percent: float
    uptime_seconds: float
    violations: List[str]
    last_activity: datetime

class PluginSecurityValidator:
    """Validates plugin security policies and manifests"""
    
    def __init__(self):
        self.permission_schema = self._load_permission_schema()
        self.allowed_event_types = {
            "energy.update", "energy.field", "energy.pattern",
            "experience.token", "experience.completion", "experience.state",
            "council.interference", "council.resonance", "council.sync",
            "system.startup", "system.shutdown", "system.heartbeat",
            "session.start", "session.end", "session.state"
        }
        
    def _load_permission_schema(self) -> Dict[str, Any]:
        """Load JSON schema for plugin permissions"""
        return {
            "type": "object",
            "properties": {
                "name": {"type": "string", "minLength": 1, "maxLength": 64},
                "version": {"type": "string", "pattern": r"^\d+\.\d+\.\d+$"},
                "description": {"type": "string", "maxLength": 500},
                "author": {"type": "string", "maxLength": 100},
                "entry_point": {"type": "string", "pattern": r"^[a-zA-Z_][a-zA-Z0-9_]*\.py$"},
                "dependencies": {
                    "type": "array",
                    "items": {"type": "string"},
                    "maxItems": 20
                },
                "permissions": {
                    "type": "object",
                    "properties": {
                        "read_events": {
                            "type": "array",
                            "items": {"type": "string"},
                            "maxItems": 50
                        },
                        "write_events": {
                            "type": "array",
                            "items": {"type": "string"},
                            "maxItems": 10
                        },
                        "allow_network": {"type": "boolean"},
                        "allow_filesystem": {"type": "boolean"},
                        "allow_ui_render": {"type": "boolean"},
                        "allow_system_calls": {"type": "boolean"},
                        "max_memory_mb": {"type": "integer", "minimum": 1, "maximum": 1024},
                        "max_cpu_percent": {"type": "integer", "minimum": 1, "maximum": 100},
                        "max_execution_time_seconds": {"type": "integer", "minimum": 1, "maximum": 3600},
                        "max_file_size_mb": {"type": "integer", "minimum": 1, "maximum": 100},
                        "temp_directory_only": {"type": "boolean"},
                        "isolated_process": {"type": "boolean"},
                        "restricted_imports": {"type": "boolean"}
                    },
                    "additionalProperties": False
                }
            },
            "required": ["name", "version", "description", "author", "entry_point", "permissions"],
            "additionalProperties": False
        }
    
    def validate_manifest(self, manifest_data: Dict[str, Any]) -> List[str]:
        """Validate plugin manifest against schema"""
        errors = []
        
        try:
            validate(instance=manifest_data, schema=self.permission_schema)
        except ValidationError as e:
            errors.append(f"Schema validation failed: {e.message}")
            return errors
        
        # Additional semantic validation
        permissions = manifest_data.get("permissions", {})
        
        # Validate event types
        read_events = permissions.get("read_events", [])
        write_events = permissions.get("write_events", [])
        
        for event in read_events + write_events:
            if event not in self.allowed_event_types:
                errors.append(f"Unknown event type: {event}")
        
        # Check for dangerous combinations
        if permissions.get("allow_network") and permissions.get("allow_filesystem"):
            errors.append("Network and filesystem access together requires special approval")
        
        if permissions.get("allow_system_calls"):
            errors.append("System calls not allowed in sandbox mode")
        
        # Resource limit validation
        if permissions.get("max_memory_mb", 0) > 512:
            errors.append("Memory limit too high for sandbox")
        
        if permissions.get("max_cpu_percent", 0) > 50:
            errors.append("CPU limit too high for sandbox")
        
        return errors
    
    def create_manifest_from_dict(self, data: Dict[str, Any]) -> PluginManifest:
        """Create PluginManifest from dictionary"""
        permissions_data = data.get("permissions", {})
        permissions = PluginPermissions(**permissions_data)
        
        return PluginManifest(
            name=data["name"],
            version=data["version"],
            description=data["description"],
            author=data["author"],
            entry_point=data["entry_point"],
            permissions=permissions,
            dependencies=data.get("dependencies", [])
        )

class SandboxEnvironment:
    """Manages isolated sandbox environment for plugins"""
    
    def __init__(self, plugin_manifest: PluginManifest):
        self.manifest = plugin_manifest
        self.sandbox_dir = None
        self.process = None
        self.start_time = None
        self.violations = []
        
    def setup_sandbox(self) -> str:
        """Setup isolated sandbox directory"""
        # Create temporary directory
        self.sandbox_dir = tempfile.mkdtemp(prefix=f"wf_sandbox_{self.manifest.name}_")
        sandbox_path = Path(self.sandbox_dir)
        
        # Set restrictive permissions
        os.chmod(self.sandbox_dir, 0o700)
        
        # Create subdirectories
        (sandbox_path / "code").mkdir()
        (sandbox_path / "data").mkdir()
        (sandbox_path / "logs").mkdir()
        
        # Copy plugin code
        # Note: In real implementation, this would copy from plugin directory
        logger.info(f"Created sandbox directory: {self.sandbox_dir}")
        
        return self.sandbox_dir
    
    def create_restricted_environment(self) -> Dict[str, str]:
        """Create restricted environment variables"""
        env = {
            "PYTHONPATH": self.sandbox_dir,
            "TMPDIR": os.path.join(self.sandbox_dir, "data"),
            "HOME": self.sandbox_dir,
            "PATH": "/usr/bin:/bin",  # Minimal PATH
        }
        
        # Remove potentially dangerous variables
        dangerous_vars = [
            "LD_LIBRARY_PATH", "LD_PRELOAD", "PYTHONSTARTUP",
            "PYTHONHOME", "DJANGO_SETTINGS_MODULE"
        ]
        
        for var in dangerous_vars:
            env.pop(var, None)
        
        return env
    
    def cleanup_sandbox(self):
        """Clean up sandbox directory"""
        if self.sandbox_dir and os.path.exists(self.sandbox_dir):
            try:
                shutil.rmtree(self.sandbox_dir)
                logger.info(f"Cleaned up sandbox: {self.sandbox_dir}")
            except Exception as e:
                logger.error(f"Failed to cleanup sandbox {self.sandbox_dir}: {e}")

class PluginSandboxManager:
    """Main manager for plugin sandboxing"""
    
    def __init__(self):
        self.validator = PluginSecurityValidator()
        self.active_sandboxes: Dict[str, SandboxEnvironment] = {}
        self.sandbox_statuses: Dict[str, SandboxStatus] = {}
        self.event_callbacks: Dict[str, List[Callable]] = {}
        self.monitoring_task = None
        
    async def load_plugin(self, plugin_path: str) -> bool:
        """Load and validate plugin"""
        try:
            # Load manifest
            manifest_path = Path(plugin_path) / "manifest.json"
            if not manifest_path.exists():
                logger.error(f"Plugin manifest not found: {manifest_path}")
                return False
            
            with open(manifest_path, 'r') as f:
                manifest_data = json.load(f)
            
            # Validate manifest
            errors = self.validator.validate_manifest(manifest_data)
            if errors:
                logger.error(f"Plugin validation failed: {errors}")
                return False
            
            # Create manifest object
            manifest = self.validator.create_manifest_from_dict(manifest_data)
            
            # Setup sandbox
            sandbox = SandboxEnvironment(manifest)
            sandbox_dir = sandbox.setup_sandbox()
            
            # Copy plugin files to sandbox
            plugin_files = Path(plugin_path)
            for file_path in plugin_files.glob("*.py"):
                shutil.copy2(file_path, Path(sandbox_dir) / "code" / file_path.name)
            
            self.active_sandboxes[manifest.name] = sandbox
            
            logger.info(f"Loaded plugin: {manifest.name} v{manifest.version}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load plugin from {plugin_path}: {e}")
            return False
    
    async def start_plugin(self, plugin_name: str) -> bool:
        """Start plugin in sandbox"""
        if plugin_name not in self.active_sandboxes:
            logger.error(f"Plugin not loaded: {plugin_name}")
            return False
        
        sandbox = self.active_sandboxes[plugin_name]
        manifest = sandbox.manifest
        
        try:
            # Create restricted environment
            env = sandbox.create_restricted_environment()
            
            # Create startup script
            startup_script = self._create_startup_script(sandbox, manifest)
            
            # Start process with resource limits
            if manifest.permissions.isolated_process:
                process = await self._start_isolated_process(startup_script, env, manifest)
            else:
                process = await self._start_restricted_process(startup_script, env, manifest)
            
            sandbox.process = process
            sandbox.start_time = datetime.utcnow()
            
            # Create status tracking
            self.sandbox_statuses[plugin_name] = SandboxStatus(
                plugin_name=plugin_name,
                process_id=process.pid,
                status="starting",
                memory_usage_mb=0.0,
                cpu_usage_percent=0.0,
                uptime_seconds=0.0,
                violations=[],
                last_activity=datetime.utcnow()
            )
            
            # Start monitoring
            if not self.monitoring_task:
                self.monitoring_task = asyncio.create_task(self._monitor_sandboxes())
            
            logger.info(f"Started plugin {plugin_name} in sandbox (PID: {process.pid})")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start plugin {plugin_name}: {e}")
            return False
    
    def _create_startup_script(self, sandbox: SandboxEnvironment, manifest: PluginManifest) -> str:
        """Create Python startup script for sandbox"""
        script_content = f'''
import sys
import os
import json
import traceback
from pathlib import Path

# Restrict imports if configured
if {manifest.permissions.restricted_imports}:
    # Override __import__ to restrict dangerous modules
    original_import = __builtins__.__import__
    
    FORBIDDEN_MODULES = {{
        'subprocess', 'os.system', 'eval', 'exec', 'compile',
        'socket', 'urllib', 'requests', 'http', 'ftplib',
        'smtplib', 'telnetlib', 'xmlrpc', 'pickle', 'shelve'
    }}
    
    def restricted_import(name, *args, **kwargs):
        if name in FORBIDDEN_MODULES or any(name.startswith(mod + '.') for mod in FORBIDDEN_MODULES):
            raise ImportError(f"Module '{{name}}' is not allowed in sandbox")
        return original_import(name, *args, **kwargs)
    
    __builtins__.__import__ = restricted_import

# Setup plugin environment
sys.path.insert(0, "{sandbox.sandbox_dir}/code")

# Plugin communication interface
class PluginInterface:
    def __init__(self):
        self.allowed_read_events = {manifest.permissions.read_events}
        self.allowed_write_events = {manifest.permissions.write_events}
        
    def subscribe_event(self, event_type, callback):
        if event_type not in self.allowed_read_events:
            raise PermissionError(f"Not allowed to read event: {{event_type}}")
        # Implementation would register callback
        
    def emit_event(self, event_type, data):
        if event_type not in self.allowed_write_events:
            raise PermissionError(f"Not allowed to write event: {{event_type}}")
        # Implementation would emit event
        
    def log(self, level, message):
        # Safe logging interface
        print(f"[{{level}}] {{message}}")

# Create plugin interface
plugin_interface = PluginInterface()

try:
    # Import and run plugin
    from {manifest.entry_point[:-3]} import main
    main(plugin_interface)
except Exception as e:
    print(f"Plugin error: {{e}}")
    traceback.print_exc()
'''
        
        script_path = Path(sandbox.sandbox_dir) / "startup.py"
        with open(script_path, 'w') as f:
            f.write(script_content)
        
        return str(script_path)
    
    async def _start_isolated_process(self, script_path: str, env: Dict[str, str], 
                                    manifest: PluginManifest) -> subprocess.Popen:
        """Start plugin in isolated process"""
        cmd = [sys.executable, script_path]
        
        # Create process with resource limits
        process = subprocess.Popen(
            cmd,
            env=env,
            cwd=os.path.dirname(script_path),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            preexec_fn=self._set_resource_limits(manifest.permissions)
        )
        
        return process
    
    async def _start_restricted_process(self, script_path: str, env: Dict[str, str],
                                      manifest: PluginManifest) -> subprocess.Popen:
        """Start plugin in restricted process (fallback)"""
        # Similar to isolated but with fewer restrictions
        return await self._start_isolated_process(script_path, env, manifest)
    
    def _set_resource_limits(self, permissions: PluginPermissions):
        """Set resource limits for plugin process"""
        def limit_resources():
            import resource
            
            # Memory limit
            memory_limit = permissions.max_memory_mb * 1024 * 1024
            resource.setrlimit(resource.RLIMIT_AS, (memory_limit, memory_limit))
            
            # CPU time limit
            cpu_limit = permissions.max_execution_time_seconds
            resource.setrlimit(resource.RLIMIT_CPU, (cpu_limit, cpu_limit))
            
            # File size limit
            file_limit = permissions.max_file_size_mb * 1024 * 1024
            resource.setrlimit(resource.RLIMIT_FSIZE, (file_limit, file_limit))
            
            # Process limit
            resource.setrlimit(resource.RLIMIT_NPROC, (1, 1))
            
        return limit_resources
    
    async def _monitor_sandboxes(self):
        """Monitor running sandboxes for resource usage and violations"""
        while True:
            try:
                await asyncio.sleep(5)  # Monitor every 5 seconds
                
                for plugin_name, sandbox in self.active_sandboxes.items():
                    if sandbox.process and plugin_name in self.sandbox_statuses:
                        await self._update_sandbox_status(plugin_name, sandbox)
                        
            except Exception as e:
                logger.error(f"Error in sandbox monitoring: {e}")
    
    async def _update_sandbox_status(self, plugin_name: str, sandbox: SandboxEnvironment):
        """Update status for a specific sandbox"""
        status = self.sandbox_statuses[plugin_name]
        
        try:
            # Get process info
            process = psutil.Process(sandbox.process.pid)
            
            # Update metrics
            status.memory_usage_mb = process.memory_info().rss / (1024 * 1024)
            status.cpu_usage_percent = process.cpu_percent()
            status.uptime_seconds = (datetime.utcnow() - sandbox.start_time).total_seconds()
            status.last_activity = datetime.utcnow()
            
            # Check resource violations
            permissions = sandbox.manifest.permissions
            
            if status.memory_usage_mb > permissions.max_memory_mb:
                violation = f"Memory limit exceeded: {status.memory_usage_mb:.1f}MB > {permissions.max_memory_mb}MB"
                if violation not in status.violations:
                    status.violations.append(violation)
                    logger.warning(f"Plugin {plugin_name}: {violation}")
            
            if status.cpu_usage_percent > permissions.max_cpu_percent:
                violation = f"CPU limit exceeded: {status.cpu_usage_percent:.1f}% > {permissions.max_cpu_percent}%"
                if violation not in status.violations:
                    status.violations.append(violation)
                    logger.warning(f"Plugin {plugin_name}: {violation}")
            
            # Check if process is still running
            if process.is_running():
                status.status = "running"
            else:
                status.status = "stopped"
                
        except psutil.NoSuchProcess:
            status.status = "stopped"
            status.process_id = None
        except Exception as e:
            logger.error(f"Error updating status for {plugin_name}: {e}")
            status.status = "error"
    
    async def stop_plugin(self, plugin_name: str) -> bool:
        """Stop plugin and cleanup sandbox"""
        if plugin_name not in self.active_sandboxes:
            return False
        
        sandbox = self.active_sandboxes[plugin_name]
        
        try:
            # Terminate process
            if sandbox.process:
                sandbox.process.terminate()
                
                # Wait for graceful shutdown
                try:
                    sandbox.process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    # Force kill if needed
                    sandbox.process.kill()
                    sandbox.process.wait()
            
            # Cleanup sandbox
            sandbox.cleanup_sandbox()
            
            # Remove from tracking
            del self.active_sandboxes[plugin_name]
            if plugin_name in self.sandbox_statuses:
                del self.sandbox_statuses[plugin_name]
            
            logger.info(f"Stopped plugin: {plugin_name}")
            return True
            
        except Exception as e:
            logger.error(f"Error stopping plugin {plugin_name}: {e}")
            return False
    
    def get_sandbox_status(self, plugin_name: str) -> Optional[SandboxStatus]:
        """Get current status of sandbox"""
        return self.sandbox_statuses.get(plugin_name)
    
    def list_active_plugins(self) -> List[str]:
        """List all active plugins"""
        return list(self.active_sandboxes.keys())
    
    def get_security_report(self) -> Dict[str, Any]:
        """Generate security report for all sandboxes"""
        report = {
            "timestamp": datetime.utcnow().isoformat(),
            "active_plugins": len(self.active_sandboxes),
            "total_violations": 0,
            "plugins": {}
        }
        
        for plugin_name, status in self.sandbox_statuses.items():
            report["plugins"][plugin_name] = {
                "status": status.status,
                "memory_usage_mb": status.memory_usage_mb,
                "cpu_usage_percent": status.cpu_usage_percent,
                "uptime_seconds": status.uptime_seconds,
                "violations": status.violations,
                "violation_count": len(status.violations)
            }
            report["total_violations"] += len(status.violations)
        
        return report
    
    async def shutdown_all(self):
        """Shutdown all plugins and cleanup"""
        plugin_names = list(self.active_sandboxes.keys())
        
        for plugin_name in plugin_names:
            await self.stop_plugin(plugin_name)
        
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
        
        logger.info("All plugins shut down")

# Example usage and testing
if __name__ == "__main__":
    async def demo():
        manager = PluginSandboxManager()
        
        # Create example plugin manifest
        example_manifest = {
            "name": "test_plugin",
            "version": "1.0.0",
            "description": "Test plugin for demonstration",
            "author": "WIRTHFORGE Team",
            "entry_point": "main.py",
            "permissions": {
                "read_events": ["energy.update"],
                "write_events": [],
                "allow_network": False,
                "allow_filesystem": False,
                "max_memory_mb": 64,
                "max_cpu_percent": 10
            }
        }
        
        # Validate manifest
        errors = manager.validator.validate_manifest(example_manifest)
        print(f"Validation errors: {errors}")
        
        if not errors:
            print("Manifest validation passed!")
            
            # In real usage, would load from directory
            # await manager.load_plugin("/path/to/plugin")
            # await manager.start_plugin("test_plugin")
    
    asyncio.run(demo())
