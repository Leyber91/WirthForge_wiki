#!/usr/bin/env python3
"""
WF-TECH-008 Plugin Framework Core
=================================

Core plugin framework implementation for WIRTHFORGE Plugin/Module Architecture.
Provides plugin manifest handling, loader, and basic lifecycle management.

Key Features:
- Plugin manifest validation and schema enforcement
- Plugin discovery and loading system
- Basic lifecycle management (load, init, terminate)
- Plugin registry and metadata management
- Integration with security sandbox system
"""

import asyncio
import json
import logging
import os
import yaml
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Union, Set
from dataclasses import dataclass, asdict
from enum import Enum
import jsonschema
import hashlib

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PluginType(Enum):
    """Plugin type enumeration."""
    CONSCIOUSNESS_MODULE = "consciousness_module"
    ENERGY_TRANSFORMER = "energy_transformer"
    VISUALIZATION_ENGINE = "visualization_engine"
    INTEGRATION_BRIDGE = "integration_bridge"
    UI_EXTENSION = "ui_extension"

class PluginStatus(Enum):
    """Plugin status enumeration."""
    DISCOVERED = "discovered"
    VALIDATED = "validated"
    LOADED = "loaded"
    INITIALIZED = "initialized"
    RUNNING = "running"
    PAUSED = "paused"
    ERROR = "error"
    UNLOADED = "unloaded"

@dataclass
class PluginAuthor:
    """Plugin author information."""
    name: str
    email: str
    wirthforge_id: Optional[str] = None
    website: Optional[str] = None

@dataclass
class PluginResources:
    """Plugin resource limits."""
    memory_limit: str = "50MB"
    cpu_limit: str = "10%"
    energy_limit: str = "50 EU/minute"
    disk_limit: str = "10MB"
    network_allowed: bool = False

@dataclass
class PluginEntryPoints:
    """Plugin entry points."""
    main: str
    worker: Optional[str] = None
    ui: Optional[str] = None
    background: Optional[str] = None

@dataclass
class PluginCapabilities:
    """Plugin capabilities flags."""
    consciousness_analysis: bool = False
    energy_transformation: bool = False
    visualization: bool = False
    background_processing: bool = False
    ui_extension: bool = False
    data_processing: bool = False
    external_integration: bool = False

@dataclass
class PluginManifest:
    """Plugin manifest data structure."""
    id: str
    name: str
    version: str
    author: PluginAuthor
    description: str
    type: PluginType
    api_version: str
    permissions: List[str]
    resources: PluginResources
    entry_points: PluginEntryPoints
    dependencies: Dict[str, str]
    capabilities: PluginCapabilities
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    license: str = "MIT"
    homepage: Optional[str] = None
    repository: Optional[str] = None
    keywords: List[str] = None

    def __post_init__(self):
        if self.keywords is None:
            self.keywords = []
        if self.created_at is None:
            self.created_at = datetime.now().isoformat()

@dataclass
class PluginMetadata:
    """Plugin runtime metadata."""
    manifest: PluginManifest
    status: PluginStatus
    path: Path
    checksum: str
    loaded_at: Optional[datetime] = None
    error_message: Optional[str] = None
    performance_stats: Dict[str, Any] = None

    def __post_init__(self):
        if self.performance_stats is None:
            self.performance_stats = {}

class PluginManifestValidator:
    """Validates plugin manifests against schema."""
    
    def __init__(self):
        self.schema = self._load_manifest_schema()
        
    def _load_manifest_schema(self) -> Dict[str, Any]:
        """Load the plugin manifest JSON schema."""
        return {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "object",
            "required": ["id", "name", "version", "author", "description", "type", "api_version", "permissions", "entry_points"],
            "properties": {
                "id": {
                    "type": "string",
                    "pattern": "^[a-z0-9-]+$",
                    "minLength": 3,
                    "maxLength": 50
                },
                "name": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 100
                },
                "version": {
                    "type": "string",
                    "pattern": "^\\d+\\.\\d+\\.\\d+(-[a-zA-Z0-9-]+)?$"
                },
                "author": {
                    "type": "object",
                    "required": ["name", "email"],
                    "properties": {
                        "name": {"type": "string"},
                        "email": {"type": "string", "format": "email"},
                        "wirthforge_id": {"type": "string"},
                        "website": {"type": "string", "format": "uri"}
                    }
                },
                "description": {
                    "type": "string",
                    "minLength": 10,
                    "maxLength": 500
                },
                "type": {
                    "type": "string",
                    "enum": [t.value for t in PluginType]
                },
                "api_version": {
                    "type": "string",
                    "pattern": "^\\d+\\.\\d+$"
                },
                "permissions": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "pattern": "^[a-z_]+\\.[a-z_]+$"
                    }
                },
                "resources": {
                    "type": "object",
                    "properties": {
                        "memory_limit": {"type": "string"},
                        "cpu_limit": {"type": "string"},
                        "energy_limit": {"type": "string"},
                        "disk_limit": {"type": "string"},
                        "network_allowed": {"type": "boolean"}
                    }
                },
                "entry_points": {
                    "type": "object",
                    "required": ["main"],
                    "properties": {
                        "main": {"type": "string"},
                        "worker": {"type": "string"},
                        "ui": {"type": "string"},
                        "background": {"type": "string"}
                    }
                },
                "capabilities": {
                    "type": "object",
                    "properties": {
                        "consciousness_analysis": {"type": "boolean"},
                        "energy_transformation": {"type": "boolean"},
                        "visualization": {"type": "boolean"},
                        "background_processing": {"type": "boolean"},
                        "ui_extension": {"type": "boolean"},
                        "data_processing": {"type": "boolean"},
                        "external_integration": {"type": "boolean"}
                    },
                    "additionalProperties": False
                }
            }
        }
        
    def validate(self, manifest_data: Dict[str, Any]) -> List[str]:
        """Validate manifest data against schema."""
        errors = []
        
        try:
            jsonschema.validate(manifest_data, self.schema)
        except jsonschema.ValidationError as e:
            errors.append(f"Schema validation error: {e.message}")
        except jsonschema.SchemaError as e:
            errors.append(f"Schema error: {e.message}")
            
        # Additional custom validations
        if "resources" in manifest_data:
            resources = manifest_data["resources"]
            if "memory_limit" in resources:
                if not self._validate_memory_limit(resources["memory_limit"]):
                    errors.append("Invalid memory_limit format")
                    
        return errors
        
    def _validate_memory_limit(self, limit: str) -> bool:
        """Validate memory limit format (e.g., '100MB', '1GB')."""
        import re
        pattern = r'^\d+(?:\.\d+)?(MB|GB|KB)$'
        return bool(re.match(pattern, limit))

class PluginLoader:
    """Handles plugin discovery, validation, and loading."""
    
    def __init__(self, plugins_directory: str = "plugins"):
        self.plugins_directory = Path(plugins_directory)
        self.validator = PluginManifestValidator()
        self.registry: Dict[str, PluginMetadata] = {}
        
    async def discover_plugins(self) -> List[Path]:
        """Discover plugin directories."""
        plugins = []
        
        if not self.plugins_directory.exists():
            logger.warning(f"Plugins directory {self.plugins_directory} does not exist")
            return plugins
            
        for item in self.plugins_directory.iterdir():
            if item.is_dir():
                manifest_file = item / "plugin.yaml"
                if manifest_file.exists():
                    plugins.append(item)
                    logger.info(f"Discovered plugin at {item}")
                    
        return plugins
        
    async def load_manifest(self, plugin_path: Path) -> Optional[PluginManifest]:
        """Load and validate plugin manifest."""
        manifest_file = plugin_path / "plugin.yaml"
        
        try:
            with open(manifest_file, 'r', encoding='utf-8') as f:
                manifest_data = yaml.safe_load(f)
                
            # Validate manifest
            errors = self.validator.validate(manifest_data)
            if errors:
                logger.error(f"Manifest validation failed for {plugin_path}: {errors}")
                return None
                
            # Convert to PluginManifest object
            manifest = self._dict_to_manifest(manifest_data)
            return manifest
            
        except Exception as e:
            logger.error(f"Failed to load manifest from {manifest_file}: {e}")
            return None
            
    def _dict_to_manifest(self, data: Dict[str, Any]) -> PluginManifest:
        """Convert dictionary to PluginManifest object."""
        # Handle nested objects
        author_data = data.get("author", {})
        author = PluginAuthor(**author_data)
        
        resources_data = data.get("resources", {})
        resources = PluginResources(**resources_data)
        
        entry_points_data = data.get("entry_points", {})
        entry_points = PluginEntryPoints(**entry_points_data)
        
        capabilities_data = data.get("capabilities", {})
        capabilities = PluginCapabilities(**capabilities_data)
        
        return PluginManifest(
            id=data["id"],
            name=data["name"],
            version=data["version"],
            author=author,
            description=data["description"],
            type=PluginType(data["type"]),
            api_version=data["api_version"],
            permissions=data.get("permissions", []),
            resources=resources,
            entry_points=entry_points,
            dependencies=data.get("dependencies", {}),
            capabilities=capabilities,
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
            license=data.get("license", "MIT"),
            homepage=data.get("homepage"),
            repository=data.get("repository"),
            keywords=data.get("keywords", [])
        )
        
    def _calculate_checksum(self, plugin_path: Path) -> str:
        """Calculate checksum for plugin directory."""
        hasher = hashlib.sha256()
        
        for file_path in sorted(plugin_path.rglob("*")):
            if file_path.is_file():
                with open(file_path, 'rb') as f:
                    hasher.update(f.read())
                    
        return hasher.hexdigest()
        
    async def register_plugin(self, plugin_path: Path, manifest: PluginManifest) -> bool:
        """Register a plugin in the registry."""
        try:
            checksum = self._calculate_checksum(plugin_path)
            
            metadata = PluginMetadata(
                manifest=manifest,
                status=PluginStatus.VALIDATED,
                path=plugin_path,
                checksum=checksum
            )
            
            self.registry[manifest.id] = metadata
            logger.info(f"Registered plugin: {manifest.id} v{manifest.version}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to register plugin {manifest.id}: {e}")
            return False
            
    async def load_all_plugins(self) -> Dict[str, PluginMetadata]:
        """Discover and load all plugins."""
        plugin_paths = await self.discover_plugins()
        
        for plugin_path in plugin_paths:
            manifest = await self.load_manifest(plugin_path)
            if manifest:
                await self.register_plugin(plugin_path, manifest)
                
        logger.info(f"Loaded {len(self.registry)} plugins")
        return self.registry
        
    def get_plugin(self, plugin_id: str) -> Optional[PluginMetadata]:
        """Get plugin metadata by ID."""
        return self.registry.get(plugin_id)
        
    def list_plugins(self, plugin_type: Optional[PluginType] = None) -> List[PluginMetadata]:
        """List all plugins, optionally filtered by type."""
        plugins = list(self.registry.values())
        
        if plugin_type:
            plugins = [p for p in plugins if p.manifest.type == plugin_type]
            
        return plugins
        
    def get_plugins_by_capability(self, capability: str) -> List[PluginMetadata]:
        """Get plugins that have a specific capability."""
        plugins = []
        
        for plugin in self.registry.values():
            if hasattr(plugin.manifest.capabilities, capability):
                if getattr(plugin.manifest.capabilities, capability):
                    plugins.append(plugin)
                    
        return plugins

class PluginRegistry:
    """Central registry for managing plugin metadata and state."""
    
    def __init__(self):
        self.plugins: Dict[str, PluginMetadata] = {}
        self.active_plugins: Set[str] = set()
        
    def register(self, plugin: PluginMetadata) -> bool:
        """Register a plugin."""
        self.plugins[plugin.manifest.id] = plugin
        return True
        
    def unregister(self, plugin_id: str) -> bool:
        """Unregister a plugin."""
        if plugin_id in self.plugins:
            del self.plugins[plugin_id]
            self.active_plugins.discard(plugin_id)
            return True
        return False
        
    def activate(self, plugin_id: str) -> bool:
        """Mark plugin as active."""
        if plugin_id in self.plugins:
            self.active_plugins.add(plugin_id)
            return True
        return False
        
    def deactivate(self, plugin_id: str) -> bool:
        """Mark plugin as inactive."""
        self.active_plugins.discard(plugin_id)
        return True
        
    def is_active(self, plugin_id: str) -> bool:
        """Check if plugin is active."""
        return plugin_id in self.active_plugins
        
    def get_active_plugins(self) -> List[PluginMetadata]:
        """Get all active plugins."""
        return [self.plugins[pid] for pid in self.active_plugins if pid in self.plugins]
        
    def update_status(self, plugin_id: str, status: PluginStatus, error_message: Optional[str] = None):
        """Update plugin status."""
        if plugin_id in self.plugins:
            self.plugins[plugin_id].status = status
            self.plugins[plugin_id].error_message = error_message
            
    def get_stats(self) -> Dict[str, Any]:
        """Get registry statistics."""
        total = len(self.plugins)
        active = len(self.active_plugins)
        by_type = {}
        by_status = {}
        
        for plugin in self.plugins.values():
            plugin_type = plugin.manifest.type.value
            by_type[plugin_type] = by_type.get(plugin_type, 0) + 1
            
            status = plugin.status.value
            by_status[status] = by_status.get(status, 0) + 1
            
        return {
            "total_plugins": total,
            "active_plugins": active,
            "by_type": by_type,
            "by_status": by_status
        }

# Example usage and testing
if __name__ == "__main__":
    async def main():
        """Example usage of the plugin framework."""
        loader = PluginLoader("./plugins")
        registry = PluginRegistry()
        
        # Load all plugins
        plugins = await loader.load_all_plugins()
        
        # Register plugins in registry
        for plugin in plugins.values():
            registry.register(plugin)
            
        # Print statistics
        stats = registry.get_stats()
        print(f"Plugin Registry Stats: {json.dumps(stats, indent=2)}")
        
        # List consciousness modules
        consciousness_plugins = loader.list_plugins(PluginType.CONSCIOUSNESS_MODULE)
        print(f"Found {len(consciousness_plugins)} consciousness modules")
        
    # Run example
    asyncio.run(main())
