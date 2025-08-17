#!/usr/bin/env python3
"""
WF-TECH-008 Plugin API Bridge Layer
===================================

API bridge layer that mediates between plugins and the core WIRTHFORGE system.
Provides controlled access to system capabilities with permission enforcement.

Key Features:
- Permission-based API access control
- Energy usage tracking and enforcement
- API call validation and sanitization
- Event system for plugin communication
- UI integration capabilities
- Audit logging for all plugin interactions
"""

import asyncio
import json
import logging
import time
from datetime import datetime
from typing import Dict, List, Any, Optional, Callable, Union
from dataclasses import dataclass, asdict
from enum import Enum
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class APICallResult(Enum):
    """API call result status."""
    SUCCESS = "success"
    PERMISSION_DENIED = "permission_denied"
    ENERGY_LIMIT_EXCEEDED = "energy_limit_exceeded"
    INVALID_PARAMETERS = "invalid_parameters"
    SYSTEM_ERROR = "system_error"
    RATE_LIMITED = "rate_limited"

@dataclass
class APICall:
    """Represents an API call from a plugin."""
    plugin_id: str
    method: str
    parameters: Dict[str, Any]
    timestamp: float
    call_id: str
    energy_cost: int = 1

    def __post_init__(self):
        if not self.call_id:
            self.call_id = str(uuid.uuid4())

@dataclass
class APIResponse:
    """Response to an API call."""
    call_id: str
    result: APICallResult
    data: Any = None
    error_message: Optional[str] = None
    energy_consumed: int = 0
    execution_time_ms: float = 0

class PermissionManager:
    """Manages plugin permissions and access control."""
    
    def __init__(self):
        self.plugin_permissions: Dict[str, List[str]] = {}
        self.permission_definitions = self._load_permission_definitions()
        
    def _load_permission_definitions(self) -> Dict[str, Dict[str, Any]]:
        """Load permission definitions with energy costs and descriptions."""
        return {
            # Consciousness API permissions
            "consciousness.read": {
                "description": "Read current consciousness state",
                "energy_cost": 1,
                "rate_limit": 100  # calls per minute
            },
            "consciousness.analyze": {
                "description": "Analyze consciousness data",
                "energy_cost": 5,
                "rate_limit": 20
            },
            "consciousness.contribute": {
                "description": "Contribute to consciousness emergence",
                "energy_cost": 10,
                "rate_limit": 10
            },
            
            # Energy API permissions
            "energy.read": {
                "description": "Read current energy levels",
                "energy_cost": 1,
                "rate_limit": 200
            },
            "energy.generate": {
                "description": "Generate energy pulses",
                "energy_cost": 15,
                "rate_limit": 5
            },
            "energy.transform": {
                "description": "Transform energy fields",
                "energy_cost": 20,
                "rate_limit": 3
            },
            
            # UI API permissions
            "ui.display_notification": {
                "description": "Display user notifications",
                "energy_cost": 2,
                "rate_limit": 30
            },
            "ui.register_component": {
                "description": "Register UI components",
                "energy_cost": 5,
                "rate_limit": 10
            },
            "ui.add_menu_item": {
                "description": "Add menu items",
                "energy_cost": 3,
                "rate_limit": 20
            },
            
            # Storage API permissions
            "storage.read": {
                "description": "Read plugin storage",
                "energy_cost": 1,
                "rate_limit": 100
            },
            "storage.write": {
                "description": "Write to plugin storage",
                "energy_cost": 2,
                "rate_limit": 50
            },
            
            # Events API permissions
            "events.subscribe": {
                "description": "Subscribe to system events",
                "energy_cost": 1,
                "rate_limit": 50
            },
            "events.publish": {
                "description": "Publish custom events",
                "energy_cost": 3,
                "rate_limit": 20
            }
        }
        
    def register_plugin_permissions(self, plugin_id: str, permissions: List[str]) -> bool:
        """Register permissions for a plugin."""
        # Validate all permissions exist
        invalid_permissions = [p for p in permissions if p not in self.permission_definitions]
        if invalid_permissions:
            logger.error(f"Invalid permissions for {plugin_id}: {invalid_permissions}")
            return False
            
        self.plugin_permissions[plugin_id] = permissions
        logger.info(f"Registered {len(permissions)} permissions for plugin {plugin_id}")
        return True
        
    def has_permission(self, plugin_id: str, permission: str) -> bool:
        """Check if plugin has specific permission."""
        plugin_perms = self.plugin_permissions.get(plugin_id, [])
        return permission in plugin_perms
        
    def get_permission_energy_cost(self, permission: str) -> int:
        """Get energy cost for a permission."""
        return self.permission_definitions.get(permission, {}).get("energy_cost", 1)
        
    def get_permission_rate_limit(self, permission: str) -> int:
        """Get rate limit for a permission."""
        return self.permission_definitions.get(permission, {}).get("rate_limit", 60)

class RateLimiter:
    """Rate limiting for API calls."""
    
    def __init__(self):
        self.call_history: Dict[str, List[float]] = {}
        
    def is_rate_limited(self, plugin_id: str, permission: str, rate_limit: int) -> bool:
        """Check if plugin is rate limited for permission."""
        key = f"{plugin_id}:{permission}"
        current_time = time.time()
        
        # Get call history for this plugin/permission
        if key not in self.call_history:
            self.call_history[key] = []
            
        calls = self.call_history[key]
        
        # Remove calls older than 1 minute
        calls[:] = [call_time for call_time in calls if current_time - call_time < 60]
        
        # Check if rate limit exceeded
        if len(calls) >= rate_limit:
            return True
            
        # Record this call
        calls.append(current_time)
        return False

class EventBus:
    """Event system for plugin communication."""
    
    def __init__(self):
        self.subscribers: Dict[str, List[Callable]] = {}
        self.event_history: List[Dict[str, Any]] = []
        
    def subscribe(self, event_type: str, callback: Callable, plugin_id: str) -> str:
        """Subscribe to events."""
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
            
        subscription_id = f"{plugin_id}:{event_type}:{len(self.subscribers[event_type])}"
        self.subscribers[event_type].append({
            "callback": callback,
            "plugin_id": plugin_id,
            "subscription_id": subscription_id
        })
        
        return subscription_id
        
    def publish(self, event_type: str, data: Any, publisher_id: str):
        """Publish event to subscribers."""
        event = {
            "type": event_type,
            "data": data,
            "publisher": publisher_id,
            "timestamp": time.time()
        }
        
        self.event_history.append(event)
        
        # Notify subscribers
        if event_type in self.subscribers:
            for subscriber in self.subscribers[event_type]:
                try:
                    subscriber["callback"](event)
                except Exception as e:
                    logger.error(f"Event callback error: {e}")
                    
    def unsubscribe(self, subscription_id: str) -> bool:
        """Unsubscribe from events."""
        for event_type, subscribers in self.subscribers.items():
            self.subscribers[event_type] = [
                sub for sub in subscribers 
                if sub["subscription_id"] != subscription_id
            ]
        return True

class PluginAPIBridge:
    """Main API bridge for plugin interactions."""
    
    def __init__(self, plugin_id: str, energy_tracker, audit_logger: Callable):
        self.plugin_id = plugin_id
        self.energy_tracker = energy_tracker
        self.audit_logger = audit_logger
        self.permission_manager = PermissionManager()
        self.rate_limiter = RateLimiter()
        self.event_bus = EventBus()
        self.plugin_storage: Dict[str, Any] = {}
        
        # API implementations
        self.consciousness_api = ConsciousnessAPI(self)
        self.energy_api = EnergyAPI(self)
        self.ui_api = UIAPI(self)
        self.storage_api = StorageAPI(self)
        self.events_api = EventsAPI(self)
        
    def register_permissions(self, permissions: List[str]) -> bool:
        """Register permissions for this plugin."""
        return self.permission_manager.register_plugin_permissions(self.plugin_id, permissions)
        
    async def call_api(self, method: str, parameters: Dict[str, Any] = None) -> APIResponse:
        """Make an API call with permission and energy checks."""
        if parameters is None:
            parameters = {}
            
        call = APICall(
            plugin_id=self.plugin_id,
            method=method,
            parameters=parameters,
            timestamp=time.time()
        )
        
        start_time = time.time()
        
        try:
            # Check permission
            if not self.permission_manager.has_permission(self.plugin_id, method):
                return APIResponse(
                    call_id=call.call_id,
                    result=APICallResult.PERMISSION_DENIED,
                    error_message=f"Permission denied for {method}"
                )
                
            # Check rate limiting
            rate_limit = self.permission_manager.get_permission_rate_limit(method)
            if self.rate_limiter.is_rate_limited(self.plugin_id, method, rate_limit):
                return APIResponse(
                    call_id=call.call_id,
                    result=APICallResult.RATE_LIMITED,
                    error_message=f"Rate limit exceeded for {method}"
                )
                
            # Check energy
            energy_cost = self.permission_manager.get_permission_energy_cost(method)
            if not self.energy_tracker.consume_energy(energy_cost, method):
                return APIResponse(
                    call_id=call.call_id,
                    result=APICallResult.ENERGY_LIMIT_EXCEEDED,
                    error_message="Energy limit exceeded"
                )
                
            # Execute API call
            result_data = await self._execute_api_call(method, parameters)
            
            execution_time = (time.time() - start_time) * 1000
            
            # Log successful call
            self.audit_logger("api_call", {
                "method": method,
                "parameters": parameters,
                "energy_cost": energy_cost,
                "execution_time_ms": execution_time
            })
            
            return APIResponse(
                call_id=call.call_id,
                result=APICallResult.SUCCESS,
                data=result_data,
                energy_consumed=energy_cost,
                execution_time_ms=execution_time
            )
            
        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            logger.error(f"API call error for {method}: {e}")
            
            return APIResponse(
                call_id=call.call_id,
                result=APICallResult.SYSTEM_ERROR,
                error_message=str(e),
                execution_time_ms=execution_time
            )
            
    async def _execute_api_call(self, method: str, parameters: Dict[str, Any]) -> Any:
        """Execute the actual API call."""
        # Route to appropriate API handler
        if method.startswith("consciousness."):
            return await self.consciousness_api.handle_call(method, parameters)
        elif method.startswith("energy."):
            return await self.energy_api.handle_call(method, parameters)
        elif method.startswith("ui."):
            return await self.ui_api.handle_call(method, parameters)
        elif method.startswith("storage."):
            return await self.storage_api.handle_call(method, parameters)
        elif method.startswith("events."):
            return await self.events_api.handle_call(method, parameters)
        else:
            raise ValueError(f"Unknown API method: {method}")

class ConsciousnessAPI:
    """Consciousness-related API methods."""
    
    def __init__(self, bridge: PluginAPIBridge):
        self.bridge = bridge
        
    async def handle_call(self, method: str, parameters: Dict[str, Any]) -> Any:
        """Handle consciousness API calls."""
        if method == "consciousness.read":
            return await self._read_consciousness_state()
        elif method == "consciousness.analyze":
            return await self._analyze_consciousness(parameters)
        elif method == "consciousness.contribute":
            return await self._contribute_emergence(parameters)
        else:
            raise ValueError(f"Unknown consciousness method: {method}")
            
    async def _read_consciousness_state(self) -> Dict[str, Any]:
        """Read current consciousness state."""
        # Simulate consciousness state
        return {
            "emergence_level": 0.75,
            "coherence": 0.82,
            "active_patterns": ["resonance", "flow", "harmony"],
            "timestamp": time.time()
        }
        
    async def _analyze_consciousness(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze consciousness data."""
        data = parameters.get("data", {})
        analysis_type = parameters.get("type", "basic")
        
        # Simulate analysis
        return {
            "analysis_type": analysis_type,
            "insights": ["Pattern detected", "Resonance increasing"],
            "confidence": 0.87,
            "recommendations": ["Continue current pattern"]
        }
        
    async def _contribute_emergence(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Contribute to consciousness emergence."""
        contribution = parameters.get("contribution", {})
        
        # Validate contribution
        if not contribution:
            raise ValueError("Contribution data required")
            
        return {
            "accepted": True,
            "influence_score": 0.15,
            "integration_status": "pending"
        }

class EnergyAPI:
    """Energy-related API methods."""
    
    def __init__(self, bridge: PluginAPIBridge):
        self.bridge = bridge
        
    async def handle_call(self, method: str, parameters: Dict[str, Any]) -> Any:
        """Handle energy API calls."""
        if method == "energy.read":
            return await self._read_energy_levels()
        elif method == "energy.generate":
            return await self._generate_energy(parameters)
        elif method == "energy.transform":
            return await self._transform_energy(parameters)
        else:
            raise ValueError(f"Unknown energy method: {method}")
            
    async def _read_energy_levels(self) -> Dict[str, Any]:
        """Read current energy levels."""
        return {
            "total_energy": 1000,
            "available_energy": 750,
            "energy_rate": 15.5,
            "field_strength": 0.68
        }
        
    async def _generate_energy(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Generate energy pulse."""
        amount = parameters.get("amount", 10)
        pattern = parameters.get("pattern", "pulse")
        
        return {
            "generated": amount,
            "pattern": pattern,
            "efficiency": 0.92
        }
        
    async def _transform_energy(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Transform energy field."""
        transformation = parameters.get("transformation", {})
        
        return {
            "transformation_applied": transformation,
            "energy_delta": -5,
            "field_change": 0.05
        }

class UIAPI:
    """UI-related API methods."""
    
    def __init__(self, bridge: PluginAPIBridge):
        self.bridge = bridge
        self.registered_components: Dict[str, Any] = {}
        
    async def handle_call(self, method: str, parameters: Dict[str, Any]) -> Any:
        """Handle UI API calls."""
        if method == "ui.display_notification":
            return await self._display_notification(parameters)
        elif method == "ui.register_component":
            return await self._register_component(parameters)
        elif method == "ui.add_menu_item":
            return await self._add_menu_item(parameters)
        else:
            raise ValueError(f"Unknown UI method: {method}")
            
    async def _display_notification(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Display user notification."""
        message = parameters.get("message", "")
        options = parameters.get("options", {})
        
        # Sanitize message
        if len(message) > 200:
            message = message[:200] + "..."
            
        notification_id = str(uuid.uuid4())
        
        # In real implementation, would send to UI
        logger.info(f"Notification from {self.bridge.plugin_id}: {message}")
        
        return {
            "notification_id": notification_id,
            "displayed": True
        }
        
    async def _register_component(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Register UI component."""
        component = parameters.get("component", {})
        component_id = component.get("id", str(uuid.uuid4()))
        
        self.registered_components[component_id] = {
            "plugin_id": self.bridge.plugin_id,
            "component": component,
            "registered_at": time.time()
        }
        
        return {
            "component_id": component_id,
            "registered": True
        }
        
    async def _add_menu_item(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Add menu item."""
        menu = parameters.get("menu", "")
        item = parameters.get("item", {})
        
        menu_item_id = str(uuid.uuid4())
        
        return {
            "menu_item_id": menu_item_id,
            "added": True,
            "menu": menu
        }

class StorageAPI:
    """Storage-related API methods."""
    
    def __init__(self, bridge: PluginAPIBridge):
        self.bridge = bridge
        
    async def handle_call(self, method: str, parameters: Dict[str, Any]) -> Any:
        """Handle storage API calls."""
        if method == "storage.read":
            return await self._read_storage(parameters)
        elif method == "storage.write":
            return await self._write_storage(parameters)
        else:
            raise ValueError(f"Unknown storage method: {method}")
            
    async def _read_storage(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Read from plugin storage."""
        key = parameters.get("key")
        
        if key:
            value = self.bridge.plugin_storage.get(key)
            return {"key": key, "value": value}
        else:
            return {"data": self.bridge.plugin_storage.copy()}
            
    async def _write_storage(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Write to plugin storage."""
        key = parameters.get("key")
        value = parameters.get("value")
        
        if not key:
            raise ValueError("Key required for storage write")
            
        self.bridge.plugin_storage[key] = value
        
        return {
            "key": key,
            "written": True,
            "storage_size": len(self.bridge.plugin_storage)
        }

class EventsAPI:
    """Events-related API methods."""
    
    def __init__(self, bridge: PluginAPIBridge):
        self.bridge = bridge
        
    async def handle_call(self, method: str, parameters: Dict[str, Any]) -> Any:
        """Handle events API calls."""
        if method == "events.subscribe":
            return await self._subscribe_events(parameters)
        elif method == "events.publish":
            return await self._publish_event(parameters)
        else:
            raise ValueError(f"Unknown events method: {method}")
            
    async def _subscribe_events(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Subscribe to events."""
        event_type = parameters.get("event_type")
        callback_id = parameters.get("callback_id")
        
        if not event_type:
            raise ValueError("Event type required")
            
        # Create callback wrapper
        def callback(event):
            # In real implementation, would notify plugin
            logger.info(f"Event {event_type} for plugin {self.bridge.plugin_id}")
            
        subscription_id = self.bridge.event_bus.subscribe(
            event_type, callback, self.bridge.plugin_id
        )
        
        return {
            "subscription_id": subscription_id,
            "event_type": event_type,
            "subscribed": True
        }
        
    async def _publish_event(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Publish custom event."""
        event_type = parameters.get("event_type")
        data = parameters.get("data", {})
        
        if not event_type:
            raise ValueError("Event type required")
            
        self.bridge.event_bus.publish(event_type, data, self.bridge.plugin_id)
        
        return {
            "event_type": event_type,
            "published": True,
            "timestamp": time.time()
        }

# Example usage
if __name__ == "__main__":
    async def main():
        """Example API bridge usage."""
        
        def audit_logger(action, details):
            print(f"Audit: {action} - {details}")
            
        class MockEnergyTracker:
            def consume_energy(self, amount, operation):
                return True  # Always allow for demo
                
        # Create API bridge
        bridge = PluginAPIBridge("test-plugin", MockEnergyTracker(), audit_logger)
        
        # Register permissions
        permissions = [
            "consciousness.read",
            "energy.read", 
            "ui.display_notification",
            "storage.write"
        ]
        bridge.register_permissions(permissions)
        
        # Test API calls
        print("Testing API calls...")
        
        # Consciousness API
        result = await bridge.call_api("consciousness.read")
        print(f"Consciousness read: {result.data}")
        
        # Energy API
        result = await bridge.call_api("energy.read")
        print(f"Energy read: {result.data}")
        
        # UI API
        result = await bridge.call_api("ui.display_notification", {
            "message": "Hello from plugin!",
            "options": {"type": "info"}
        })
        print(f"Notification: {result.data}")
        
        # Storage API
        result = await bridge.call_api("storage.write", {
            "key": "test_data",
            "value": {"count": 42}
        })
        print(f"Storage write: {result.data}")
        
        # Test permission denial
        result = await bridge.call_api("energy.generate")
        print(f"Permission denied: {result.result}")
        
    asyncio.run(main())
