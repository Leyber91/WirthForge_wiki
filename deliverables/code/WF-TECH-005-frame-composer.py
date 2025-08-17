"""
WF-TECH-005 Frame Composer & Event Emitter
WIRTHFORGE Real-Time Event Assembly System

This module handles the composition and emission of frame events from Decipher
to the WebSocket layer, ensuring proper JSON schema compliance and efficient
event serialization for 60Hz real-time performance.

Key Features:
- JSON schema-compliant event composition
- Efficient serialization for 60Hz performance
- Multi-channel event routing (energy.*, experience.*, etc.)
- Event validation and error handling
- Performance optimization with object pooling
"""

import json
import time
import uuid
from typing import Dict, List, Optional, Any, Callable, Union
from dataclasses import dataclass, asdict
from enum import Enum
import asyncio
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

class EventType(Enum):
    """Event types following WF-TECH-003 WebSocket protocol"""
    # Energy events
    ENERGY_UPDATE = "energy.update"
    ENERGY_FIELD = "energy.field"
    ENERGY_PATTERN = "energy.pattern"
    
    # Experience events
    EXPERIENCE_TOKEN = "experience.token"
    EXPERIENCE_COMPLETION = "experience.completion"
    EXPERIENCE_STATE = "experience.state"
    
    # Council events (multi-model)
    COUNCIL_INTERFERENCE = "council.interference"
    COUNCIL_RESONANCE = "council.resonance"
    COUNCIL_SYNC = "council.sync"
    
    # System events
    SYSTEM_STARTUP = "system.startup"
    SYSTEM_SHUTDOWN = "system.shutdown"
    SYSTEM_ERROR = "system.error"
    SYSTEM_HEARTBEAT = "system.heartbeat"
    
    # Session events
    SESSION_START = "session.start"
    SESSION_END = "session.end"
    SESSION_STATE = "session.state"

@dataclass
class ParticleEffect:
    """Visual particle effect data"""
    id: str
    type: str  # "spark", "bolt", "burst", "fade"
    energy: float
    intensity: float
    position: Optional[Dict[str, float]] = None
    velocity: Optional[Dict[str, float]] = None
    color: Optional[str] = None
    lifetime_ms: Optional[float] = None
    model_id: Optional[str] = None

@dataclass
class InterferenceData:
    """Interference pattern data"""
    type: str  # "constructive", "destructive"
    strength: float  # 0.0-1.0
    models_involved: List[str]
    frequency: float  # Hz
    duration_ms: float
    phase_offset: Optional[float] = None

@dataclass
class ResonanceData:
    """Resonance pattern data"""
    type: str  # "harmonic", "subharmonic", "chaotic"
    strength: float  # 0.0-1.0
    frequency: float  # Hz
    amplification: float  # Energy multiplier
    duration_ms: float
    coherence: Optional[float] = None

@dataclass
class PerformanceMetrics:
    """Performance monitoring data"""
    frame_time_ms: float
    queue_depth: int
    memory_usage_mb: Optional[float] = None
    cpu_usage_percent: Optional[float] = None
    frame_overruns: int = 0
    dropped_events: int = 0
    degraded_mode: bool = False

class FrameComposer:
    """
    Composes and emits frame events with JSON schema compliance.
    
    Handles the assembly of complex event structures from Decipher's
    internal state into WebSocket-ready JSON events.
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = self._load_config(config or {})
        
        # Event emission callbacks
        self.event_callbacks = []
        
        # Performance tracking
        self.events_emitted = 0
        self.serialization_times = []
        self.emission_errors = 0
        
        # Object pooling for performance
        self.event_pool = []
        self.particle_pool = []
        
        # Schema validation (if enabled)
        self.schema_validator = None
        if self.config["enable_schema_validation"]:
            self._initialize_schema_validator()
            
    def _load_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Load configuration with defaults"""
        defaults = {
            # Performance settings
            "enable_object_pooling": True,
            "pool_size_limit": 100,
            "enable_schema_validation": False,  # Disable in production for performance
            "max_serialization_time_ms": 5.0,
            
            # Event formatting
            "timestamp_precision": "milliseconds",  # "seconds", "milliseconds", "microseconds"
            "include_debug_info": False,
            "compact_json": True,  # No indentation for smaller payloads
            
            # Field limits for performance
            "max_particles_per_frame": 50,
            "max_models_per_interference": 10,
            "max_history_items": 20,
            
            # Error handling
            "continue_on_serialization_error": True,
            "log_emission_errors": True,
            "fallback_to_minimal_event": True
        }
        
        merged = defaults.copy()
        merged.update(config)
        return merged
        
    def add_event_callback(self, callback: Callable[[Dict], Any]):
        """Add callback for event emission (typically WebSocket send)"""
        self.event_callbacks.append(callback)
        
    async def emit_energy_update(self, frame_id: int, timestamp: float,
                                new_tokens: int, energy_generated: float,
                                total_energy: float, energy_rate: float,
                                state: str, particles: List[ParticleEffect] = None,
                                interference: InterferenceData = None,
                                resonance: ResonanceData = None,
                                performance: PerformanceMetrics = None) -> bool:
        """Emit main energy update event"""
        
        event = self._create_base_event(EventType.ENERGY_UPDATE, timestamp)
        
        # Limit particles for performance
        if particles:
            particles = particles[:self.config["max_particles_per_frame"]]
            
        event["payload"] = {
            "frame_id": frame_id,
            "new_tokens": new_tokens,
            "energy_generated": round(energy_generated, 3),
            "total_energy": round(total_energy, 3),
            "energy_rate": round(energy_rate, 3),
            "state": state,
            "particles": [self._serialize_particle(p) for p in (particles or [])],
            "interference": self._serialize_interference(interference) if interference else None,
            "resonance": self._serialize_resonance(resonance) if resonance else None,
            "performance": self._serialize_performance(performance) if performance else None
        }
        
        return await self._emit_event(event)
        
    async def emit_token_event(self, token_content: str, model_id: str,
                              energy: float, confidence: Optional[float] = None,
                              position: int = 0, is_final: bool = False) -> bool:
        """Emit individual token event"""
        
        event = self._create_base_event(EventType.EXPERIENCE_TOKEN)
        
        event["payload"] = {
            "content": token_content if not self.config.get("privacy_mode") else "[REDACTED]",
            "model_id": model_id,
            "energy": round(energy, 3),
            "confidence": round(confidence, 3) if confidence is not None else None,
            "position": position,
            "is_final": is_final,
            "content_hash": self._hash_content(token_content) if self.config.get("privacy_mode") else None
        }
        
        return await self._emit_event(event)
        
    async def emit_interference_event(self, interference: InterferenceData) -> bool:
        """Emit interference pattern detection event"""
        
        event = self._create_base_event(EventType.COUNCIL_INTERFERENCE)
        event["payload"] = self._serialize_interference(interference)
        
        return await self._emit_event(event)
        
    async def emit_resonance_event(self, resonance: ResonanceData) -> bool:
        """Emit resonance pattern detection event"""
        
        event = self._create_base_event(EventType.COUNCIL_RESONANCE)
        event["payload"] = self._serialize_resonance(resonance)
        
        return await self._emit_event(event)
        
    async def emit_session_start(self, session_id: str, config: Dict[str, Any]) -> bool:
        """Emit session start event"""
        
        event = self._create_base_event(EventType.SESSION_START)
        event["payload"] = {
            "session_id": session_id,
            "config": config,
            "capabilities": {
                "max_fps": 60,
                "supports_multi_model": True,
                "supports_patterns": True,
                "supports_particles": True
            }
        }
        
        return await self._emit_event(event)
        
    async def emit_session_end(self, session_id: str, summary: Dict[str, Any]) -> bool:
        """Emit session end event"""
        
        event = self._create_base_event(EventType.SESSION_END)
        event["payload"] = {
            "session_id": session_id,
            "summary": summary
        }
        
        return await self._emit_event(event)
        
    async def emit_error_event(self, error_message: str, error_code: str = None,
                              component: str = "decipher", severity: str = "error") -> bool:
        """Emit error event"""
        
        event = self._create_base_event(EventType.SYSTEM_ERROR)
        event["payload"] = {
            "message": error_message,
            "code": error_code,
            "component": component,
            "severity": severity,
            "timestamp": self._get_timestamp()
        }
        
        return await self._emit_event(event)
        
    async def emit_heartbeat(self, status: Dict[str, Any] = None) -> bool:
        """Emit heartbeat event"""
        
        event = self._create_base_event(EventType.SYSTEM_HEARTBEAT)
        event["payload"] = {
            "status": "alive",
            "uptime_ms": int((time.time() - getattr(self, '_start_time', time.time())) * 1000),
            "stats": status or {}
        }
        
        return await self._emit_event(event)
        
    def _create_base_event(self, event_type: EventType, timestamp: float = None) -> Dict[str, Any]:
        """Create base event structure"""
        
        # Use object pool if enabled
        if self.config["enable_object_pooling"] and self.event_pool:
            event = self.event_pool.pop()
            event.clear()
        else:
            event = {}
            
        event.update({
            "id": str(uuid.uuid4()),
            "type": event_type.value,
            "timestamp": self._format_timestamp(timestamp or time.time()),
            "version": "1.0"
        })
        
        if self.config["include_debug_info"]:
            event["debug"] = {
                "composer_id": id(self),
                "events_emitted": self.events_emitted
            }
            
        return event
        
    def _serialize_particle(self, particle: ParticleEffect) -> Dict[str, Any]:
        """Serialize particle effect to JSON-compatible dict"""
        
        # Use object pool if enabled
        if self.config["enable_object_pooling"] and self.particle_pool:
            result = self.particle_pool.pop()
            result.clear()
        else:
            result = {}
            
        result.update({
            "id": particle.id,
            "type": particle.type,
            "energy": round(particle.energy, 3),
            "intensity": round(particle.intensity, 3)
        })
        
        # Optional fields
        if particle.position:
            result["position"] = particle.position
        if particle.velocity:
            result["velocity"] = particle.velocity
        if particle.color:
            result["color"] = particle.color
        if particle.lifetime_ms:
            result["lifetime_ms"] = particle.lifetime_ms
        if particle.model_id:
            result["model_id"] = particle.model_id
            
        return result
        
    def _serialize_interference(self, interference: InterferenceData) -> Dict[str, Any]:
        """Serialize interference data"""
        
        # Limit models for performance
        models = interference.models_involved[:self.config["max_models_per_interference"]]
        
        return {
            "type": interference.type,
            "strength": round(interference.strength, 3),
            "models_involved": models,
            "frequency": round(interference.frequency, 2),
            "duration_ms": round(interference.duration_ms, 1),
            "phase_offset": round(interference.phase_offset, 3) if interference.phase_offset else None
        }
        
    def _serialize_resonance(self, resonance: ResonanceData) -> Dict[str, Any]:
        """Serialize resonance data"""
        
        return {
            "type": resonance.type,
            "strength": round(resonance.strength, 3),
            "frequency": round(resonance.frequency, 2),
            "amplification": round(resonance.amplification, 2),
            "duration_ms": round(resonance.duration_ms, 1),
            "coherence": round(resonance.coherence, 3) if resonance.coherence else None
        }
        
    def _serialize_performance(self, performance: PerformanceMetrics) -> Dict[str, Any]:
        """Serialize performance metrics"""
        
        result = {
            "frame_time_ms": round(performance.frame_time_ms, 2),
            "queue_depth": performance.queue_depth,
            "frame_overruns": performance.frame_overruns,
            "dropped_events": performance.dropped_events,
            "degraded_mode": performance.degraded_mode
        }
        
        if performance.memory_usage_mb:
            result["memory_usage_mb"] = round(performance.memory_usage_mb, 1)
        if performance.cpu_usage_percent:
            result["cpu_usage_percent"] = round(performance.cpu_usage_percent, 1)
            
        return result
        
    def _format_timestamp(self, timestamp: float) -> Union[int, float]:
        """Format timestamp according to configuration"""
        
        if self.config["timestamp_precision"] == "seconds":
            return int(timestamp)
        elif self.config["timestamp_precision"] == "milliseconds":
            return int(timestamp * 1000)
        elif self.config["timestamp_precision"] == "microseconds":
            return int(timestamp * 1000000)
        else:
            return timestamp
            
    def _get_timestamp(self) -> Union[int, float]:
        """Get current timestamp in configured format"""
        return self._format_timestamp(time.time())
        
    def _hash_content(self, content: str) -> str:
        """Create privacy-safe hash of content"""
        import hashlib
        return hashlib.sha256(content.encode()).hexdigest()[:16]
        
    async def _emit_event(self, event: Dict[str, Any]) -> bool:
        """Emit event to all registered callbacks"""
        
        start_time = time.time()
        
        try:
            # Validate schema if enabled
            if self.config["enable_schema_validation"] and self.schema_validator:
                self._validate_event_schema(event)
                
            # Serialize to JSON
            if self.config["compact_json"]:
                json_data = json.dumps(event, separators=(',', ':'))
            else:
                json_data = json.dumps(event, indent=2)
                
            # Check serialization time
            serialization_time = (time.time() - start_time) * 1000
            self.serialization_times.append(serialization_time)
            
            if serialization_time > self.config["max_serialization_time_ms"]:
                logger.warning(f"Slow serialization: {serialization_time:.2f}ms for {event['type']}")
                
            # Emit to all callbacks
            success = True
            for callback in self.event_callbacks:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        await callback(json_data)
                    else:
                        callback(json_data)
                except Exception as e:
                    success = False
                    self.emission_errors += 1
                    if self.config["log_emission_errors"]:
                        logger.error(f"Event emission error: {e}")
                        
            self.events_emitted += 1
            
            # Return objects to pool
            if self.config["enable_object_pooling"]:
                self._return_to_pool(event)
                
            return success
            
        except Exception as e:
            self.emission_errors += 1
            if self.config["log_emission_errors"]:
                logger.error(f"Event composition error: {e}")
                
            # Try fallback minimal event
            if self.config["fallback_to_minimal_event"]:
                return await self._emit_minimal_event(event.get("type", "unknown"), str(e))
                
            return False
            
    async def _emit_minimal_event(self, event_type: str, error_info: str) -> bool:
        """Emit minimal event as fallback"""
        
        minimal_event = {
            "id": str(uuid.uuid4()),
            "type": "system.error",
            "timestamp": self._get_timestamp(),
            "payload": {
                "message": f"Failed to emit {event_type}: {error_info}",
                "fallback": True
            }
        }
        
        try:
            json_data = json.dumps(minimal_event)
            for callback in self.event_callbacks:
                if asyncio.iscoroutinefunction(callback):
                    await callback(json_data)
                else:
                    callback(json_data)
            return True
        except:
            return False
            
    def _return_to_pool(self, event: Dict[str, Any]):
        """Return event object to pool for reuse"""
        
        if len(self.event_pool) < self.config["pool_size_limit"]:
            # Clean sensitive data
            event.clear()
            self.event_pool.append(event)
            
        # Return particle objects to pool
        payload = event.get("payload", {})
        particles = payload.get("particles", [])
        for particle in particles:
            if isinstance(particle, dict) and len(self.particle_pool) < self.config["pool_size_limit"]:
                particle.clear()
                self.particle_pool.append(particle)
                
    def _initialize_schema_validator(self):
        """Initialize JSON schema validator"""
        try:
            import jsonschema
            # In a real implementation, load schemas from files
            self.schema_validator = jsonschema.Draft7Validator({})
        except ImportError:
            logger.warning("jsonschema not available, schema validation disabled")
            self.config["enable_schema_validation"] = False
            
    def _validate_event_schema(self, event: Dict[str, Any]):
        """Validate event against JSON schema"""
        if self.schema_validator:
            # In a real implementation, validate against specific schemas
            pass
            
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance statistics"""
        
        avg_serialization = (sum(self.serialization_times) / len(self.serialization_times) 
                           if self.serialization_times else 0)
        
        return {
            "events_emitted": self.events_emitted,
            "emission_errors": self.emission_errors,
            "avg_serialization_time_ms": round(avg_serialization, 2),
            "max_serialization_time_ms": round(max(self.serialization_times), 2) if self.serialization_times else 0,
            "event_pool_size": len(self.event_pool),
            "particle_pool_size": len(self.particle_pool),
            "callbacks_registered": len(self.event_callbacks)
        }
        
    def reset_stats(self):
        """Reset performance statistics"""
        self.events_emitted = 0
        self.emission_errors = 0
        self.serialization_times.clear()

# Utility functions for creating common event data

def create_particle_burst(energy: float, model_id: str, count: int = 3) -> List[ParticleEffect]:
    """Create a burst of particle effects"""
    particles = []
    
    for i in range(count):
        particle_energy = energy / count
        particle = ParticleEffect(
            id=f"burst_{int(time.time()*1000)}_{i}",
            type="spark" if particle_energy < 0.5 else "bolt",
            energy=particle_energy,
            intensity=min(particle_energy * 2, 1.0),
            model_id=model_id,
            lifetime_ms=200 + i * 50  # Staggered lifetimes
        )
        particles.append(particle)
        
    return particles

def create_interference_pattern(models: List[str], strength: float, 
                              pattern_type: str = "constructive") -> InterferenceData:
    """Create interference pattern data"""
    return InterferenceData(
        type=pattern_type,
        strength=strength,
        models_involved=models,
        frequency=42.5 + strength * 10,  # Vary frequency with strength
        duration_ms=100 + strength * 200,
        phase_offset=0.0 if pattern_type == "constructive" else 0.5
    )

def create_resonance_pattern(strength: float, amplification: float,
                           resonance_type: str = "harmonic") -> ResonanceData:
    """Create resonance pattern data"""
    return ResonanceData(
        type=resonance_type,
        strength=strength,
        frequency=60.0,  # Base frequency
        amplification=amplification,
        duration_ms=strength * 1000,  # Longer for stronger resonance
        coherence=strength * 0.8  # High coherence for strong resonance
    )

# Example usage
if __name__ == "__main__":
    async def example_usage():
        # Create frame composer
        composer = FrameComposer({
            "enable_object_pooling": True,
            "compact_json": True
        })
        
        # Add callback to print events
        async def print_event(json_data):
            event = json.loads(json_data)
            print(f"Event: {event['type']} at {event['timestamp']}")
            
        composer.add_event_callback(print_event)
        
        # Emit various events
        await composer.emit_session_start("test_session", {"fps": 60})
        
        particles = create_particle_burst(1.5, "test_model", 3)
        await composer.emit_energy_update(
            frame_id=1,
            timestamp=time.time(),
            new_tokens=2,
            energy_generated=1.5,
            total_energy=10.5,
            energy_rate=3.2,
            state="FLOWING",
            particles=particles
        )
        
        interference = create_interference_pattern(["model_a", "model_b"], 0.7)
        await composer.emit_interference_event(interference)
        
        await composer.emit_session_end("test_session", {"total_energy": 50.0})
        
        # Print stats
        stats = composer.get_performance_stats()
        print(f"Performance: {stats}")
        
    asyncio.run(example_usage())
