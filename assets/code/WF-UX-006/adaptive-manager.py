"""
WF-UX-006 Adaptive Manager
Dynamic quality and performance adaptation system for WIRTHFORGE
"""

import time
import threading
from typing import Dict, Any, Optional, Callable, List
from dataclasses import dataclass
from enum import Enum
import json
import logging

class QualityLevel(Enum):
    """Visual quality levels"""
    EMERGENCY = 0  # Minimal rendering, static UI only
    LOW = 1        # Basic rendering, simple animations
    STANDARD = 2   # Full rendering, standard effects
    HIGH = 3       # Enhanced effects, high-res rendering

class AdaptationReason(Enum):
    """Reasons for quality adaptation"""
    FRAME_TIME = "frame_time"
    CPU_OVERLOAD = "cpu_overload"
    GPU_OVERLOAD = "gpu_overload"
    MEMORY_PRESSURE = "memory_pressure"
    BATTERY_LOW = "battery_low"
    THERMAL_THROTTLING = "thermal_throttling"
    PLUGIN_OVERLOAD = "plugin_overload"
    USER_REQUEST = "user_request"

@dataclass
class AdaptationEvent:
    """Record of a quality adaptation"""
    timestamp: float
    previous_level: QualityLevel
    new_level: QualityLevel
    reason: AdaptationReason
    trigger_value: float
    threshold: float
    automatic: bool
    description: str

@dataclass
class QualitySettings:
    """Quality level configuration"""
    level: QualityLevel
    particle_count: int
    shader_complexity: str
    texture_resolution: float
    shadow_quality: str
    antialiasing: bool
    post_processing: bool
    animation_quality: str
    target_fps: int
    max_frame_time_ms: float

class AdaptiveManager:
    """
    Manages dynamic quality adaptation based on performance metrics
    Implements graceful degradation and recovery strategies
    """
    
    def __init__(self, initial_quality: QualityLevel = QualityLevel.STANDARD):
        """
        Initialize adaptive manager
        
        Args:
            initial_quality: Starting quality level
        """
        self.current_quality = initial_quality
        self.target_quality = initial_quality
        self.previous_quality = initial_quality
        
        # Adaptation settings
        self.quality_settings = self._load_quality_settings()
        self.adaptation_thresholds = self._load_adaptation_thresholds()
        
        # State tracking
        self.adaptation_history: List[AdaptationEvent] = []
        self.power_save_mode = False
        self.battery_saver_active = False
        self.thermal_throttling_active = False
        
        # Timing controls
        self.last_adaptation_time = 0.0
        self.adaptation_cooldown = 2.0  # Minimum seconds between adaptations
        self.stability_period = 5.0     # Seconds of stability before recovery
        self.last_stable_time = time.time()
        
        # Callbacks
        self.adaptation_callbacks: List[Callable[[AdaptationEvent], None]] = []
        self.settings_callbacks: List[Callable[[QualitySettings], None]] = []
        
        # Thread safety
        self._lock = threading.Lock()
        
        # Logger
        self.logger = logging.getLogger(__name__)
        
        # Apply initial settings
        self._apply_quality_settings()
    
    def _load_quality_settings(self) -> Dict[QualityLevel, QualitySettings]:
        """Load quality level definitions"""
        return {
            QualityLevel.EMERGENCY: QualitySettings(
                level=QualityLevel.EMERGENCY,
                particle_count=0,
                shader_complexity="none",
                texture_resolution=0.25,
                shadow_quality="none",
                antialiasing=False,
                post_processing=False,
                animation_quality="static",
                target_fps=30,
                max_frame_time_ms=33.33
            ),
            QualityLevel.LOW: QualitySettings(
                level=QualityLevel.LOW,
                particle_count=50,
                shader_complexity="basic",
                texture_resolution=0.5,
                shadow_quality="low",
                antialiasing=False,
                post_processing=False,
                animation_quality="simple",
                target_fps=45,
                max_frame_time_ms=22.22
            ),
            QualityLevel.STANDARD: QualitySettings(
                level=QualityLevel.STANDARD,
                particle_count=200,
                shader_complexity="standard",
                texture_resolution=1.0,
                shadow_quality="medium",
                antialiasing=True,
                post_processing=True,
                animation_quality="standard",
                target_fps=60,
                max_frame_time_ms=16.67
            ),
            QualityLevel.HIGH: QualitySettings(
                level=QualityLevel.HIGH,
                particle_count=500,
                shader_complexity="complex",
                texture_resolution=1.5,
                shadow_quality="high",
                antialiasing=True,
                post_processing=True,
                animation_quality="complex",
                target_fps=60,
                max_frame_time_ms=16.67
            )
        }
    
    def _load_adaptation_thresholds(self) -> Dict[str, Dict[str, float]]:
        """Load adaptation thresholds"""
        return {
            "frame_time": {
                "warning_ms": 18.0,
                "critical_ms": 25.0,
                "emergency_ms": 40.0,
                "consecutive_frames": 3
            },
            "cpu": {
                "warning": 70.0,
                "critical": 85.0,
                "sustained_duration": 5.0
            },
            "gpu": {
                "warning": 80.0,
                "critical": 90.0
            },
            "memory": {
                "warning": 80.0,
                "critical": 90.0
            },
            "battery": {
                "conservative": 30.0,
                "emergency": 15.0,
                "critical": 5.0
            },
            "thermal": {
                "throttling_detected": True
            },
            "recovery": {
                "stability_period": 5.0,
                "improvement_threshold": 0.8  # Fraction of threshold for recovery
            }
        }
    
    def handle_frame_performance(self, frame_time_ms: float, consecutive_overruns: int) -> None:
        """Handle frame performance metrics"""
        current_time = time.time()
        
        # Check if adaptation is on cooldown
        if current_time - self.last_adaptation_time < self.adaptation_cooldown:
            return
        
        thresholds = self.adaptation_thresholds["frame_time"]
        
        # Determine required action
        if frame_time_ms > thresholds["emergency_ms"]:
            self._trigger_adaptation(
                AdaptationReason.FRAME_TIME,
                frame_time_ms,
                thresholds["emergency_ms"],
                "Emergency frame time exceeded",
                immediate=True
            )
        elif frame_time_ms > thresholds["critical_ms"]:
            self._trigger_adaptation(
                AdaptationReason.FRAME_TIME,
                frame_time_ms,
                thresholds["critical_ms"],
                "Critical frame time exceeded"
            )
        elif (frame_time_ms > thresholds["warning_ms"] and 
              consecutive_overruns >= thresholds["consecutive_frames"]):
            self._trigger_adaptation(
                AdaptationReason.FRAME_TIME,
                frame_time_ms,
                thresholds["warning_ms"],
                f"Sustained frame time issues ({consecutive_overruns} consecutive)"
            )
        else:
            # Check for recovery opportunity
            if frame_time_ms < thresholds["warning_ms"] * thresholds["recovery"]["improvement_threshold"]:
                self._check_recovery_opportunity(current_time)
    
    def handle_system_metrics(self, cpu_percent: float, gpu_percent: Optional[float], 
                            memory_percent: float, battery_percent: Optional[float],
                            thermal_throttling: bool) -> None:
        """Handle system performance metrics"""
        current_time = time.time()
        
        # CPU overload check
        if cpu_percent > self.adaptation_thresholds["cpu"]["critical"]:
            self._trigger_adaptation(
                AdaptationReason.CPU_OVERLOAD,
                cpu_percent,
                self.adaptation_thresholds["cpu"]["critical"],
                f"CPU overload: {cpu_percent:.1f}%"
            )
        
        # GPU overload check
        if gpu_percent and gpu_percent > self.adaptation_thresholds["gpu"]["critical"]:
            self._trigger_adaptation(
                AdaptationReason.GPU_OVERLOAD,
                gpu_percent,
                self.adaptation_thresholds["gpu"]["critical"],
                f"GPU overload: {gpu_percent:.1f}%"
            )
        
        # Memory pressure check
        if memory_percent > self.adaptation_thresholds["memory"]["critical"]:
            self._trigger_adaptation(
                AdaptationReason.MEMORY_PRESSURE,
                memory_percent,
                self.adaptation_thresholds["memory"]["critical"],
                f"Memory pressure: {memory_percent:.1f}%"
            )
        
        # Battery level check
        if battery_percent is not None:
            if battery_percent < self.adaptation_thresholds["battery"]["critical"]:
                self._enable_emergency_battery_mode()
            elif battery_percent < self.adaptation_thresholds["battery"]["emergency"]:
                self._enable_battery_saver_mode()
            elif battery_percent < self.adaptation_thresholds["battery"]["conservative"]:
                self._enable_power_save_mode()
            else:
                self._disable_power_modes()
        
        # Thermal throttling check
        if thermal_throttling and not self.thermal_throttling_active:
            self._trigger_adaptation(
                AdaptationReason.THERMAL_THROTTLING,
                1.0,
                0.5,
                "Thermal throttling detected"
            )
            self.thermal_throttling_active = True
        elif not thermal_throttling and self.thermal_throttling_active:
            self.thermal_throttling_active = False
    
    def _trigger_adaptation(self, reason: AdaptationReason, value: float, 
                          threshold: float, description: str, immediate: bool = False) -> None:
        """Trigger quality adaptation"""
        with self._lock:
            current_time = time.time()
            
            # Skip if on cooldown (unless immediate)
            if not immediate and current_time - self.last_adaptation_time < self.adaptation_cooldown:
                return
            
            # Determine new quality level
            new_quality = self._calculate_target_quality(reason, value, threshold)
            
            if new_quality != self.current_quality:
                self._perform_adaptation(new_quality, reason, value, threshold, description)
                self.last_adaptation_time = current_time
                self.last_stable_time = current_time  # Reset stability timer
    
    def _calculate_target_quality(self, reason: AdaptationReason, 
                                value: float, threshold: float) -> QualityLevel:
        """Calculate appropriate quality level for the situation"""
        current_level = self.current_quality.value
        
        # Emergency conditions - drop to minimum
        if (reason == AdaptationReason.FRAME_TIME and value > 40.0) or \
           (reason == AdaptationReason.MEMORY_PRESSURE and value > 95.0):
            return QualityLevel.EMERGENCY
        
        # Critical conditions - drop significantly
        if reason in [AdaptationReason.FRAME_TIME, AdaptationReason.CPU_OVERLOAD, 
                     AdaptationReason.GPU_OVERLOAD, AdaptationReason.THERMAL_THROTTLING]:
            return QualityLevel(max(0, current_level - 2))
        
        # Warning conditions - drop moderately
        if reason in [AdaptationReason.MEMORY_PRESSURE, AdaptationReason.BATTERY_LOW]:
            return QualityLevel(max(0, current_level - 1))
        
        return self.current_quality
    
    def _perform_adaptation(self, new_quality: QualityLevel, reason: AdaptationReason,
                          value: float, threshold: float, description: str) -> None:
        """Perform the actual quality adaptation"""
        previous_quality = self.current_quality
        self.previous_quality = previous_quality
        self.current_quality = new_quality
        
        # Create adaptation event
        event = AdaptationEvent(
            timestamp=time.time(),
            previous_level=previous_quality,
            new_level=new_quality,
            reason=reason,
            trigger_value=value,
            threshold=threshold,
            automatic=True,
            description=description
        )
        
        self.adaptation_history.append(event)
        
        # Apply new settings
        self._apply_quality_settings()
        
        # Log the adaptation
        direction = "↓" if new_quality.value < previous_quality.value else "↑"
        self.logger.info(f"Quality adaptation {direction}: {previous_quality.name} → {new_quality.name} "
                        f"({reason.value}: {description})")
        
        # Trigger callbacks
        for callback in self.adaptation_callbacks:
            try:
                callback(event)
            except Exception as e:
                self.logger.error(f"Adaptation callback failed: {e}")
    
    def _apply_quality_settings(self) -> None:
        """Apply current quality settings"""
        settings = self.quality_settings[self.current_quality]
        
        # Apply power mode modifications
        if self.battery_saver_active:
            settings = self._apply_battery_saver_modifications(settings)
        elif self.power_save_mode:
            settings = self._apply_power_save_modifications(settings)
        
        # Trigger settings callbacks
        for callback in self.settings_callbacks:
            try:
                callback(settings)
            except Exception as e:
                self.logger.error(f"Settings callback failed: {e}")
    
    def _apply_battery_saver_modifications(self, settings: QualitySettings) -> QualitySettings:
        """Apply battery saver modifications to quality settings"""
        # Create modified copy
        modified = QualitySettings(
            level=settings.level,
            particle_count=max(0, settings.particle_count // 4),
            shader_complexity="basic" if settings.shader_complexity != "none" else "none",
            texture_resolution=settings.texture_resolution * 0.5,
            shadow_quality="none",
            antialiasing=False,
            post_processing=False,
            animation_quality="simple" if settings.animation_quality != "static" else "static",
            target_fps=min(30, settings.target_fps),
            max_frame_time_ms=max(33.33, settings.max_frame_time_ms)
        )
        return modified
    
    def _apply_power_save_modifications(self, settings: QualitySettings) -> QualitySettings:
        """Apply power save modifications to quality settings"""
        # Create modified copy
        modified = QualitySettings(
            level=settings.level,
            particle_count=max(0, settings.particle_count // 2),
            shader_complexity=settings.shader_complexity,
            texture_resolution=settings.texture_resolution * 0.75,
            shadow_quality="low" if settings.shadow_quality in ["medium", "high"] else settings.shadow_quality,
            antialiasing=settings.antialiasing,
            post_processing=settings.post_processing,
            animation_quality=settings.animation_quality,
            target_fps=settings.target_fps,
            max_frame_time_ms=settings.max_frame_time_ms
        )
        return modified
    
    def _check_recovery_opportunity(self, current_time: float) -> None:
        """Check if quality can be recovered"""
        stability_period = self.adaptation_thresholds["recovery"]["stability_period"]
        
        if (current_time - self.last_stable_time >= stability_period and 
            self.current_quality.value < QualityLevel.HIGH.value):
            
            # Try to recover one quality level
            new_quality = QualityLevel(min(QualityLevel.HIGH.value, self.current_quality.value + 1))
            
            self._perform_adaptation(
                new_quality,
                AdaptationReason.USER_REQUEST,  # Recovery is system-initiated
                0.0,
                0.0,
                "Performance recovery - quality restored"
            )
    
    def _enable_power_save_mode(self) -> None:
        """Enable power save mode"""
        if not self.power_save_mode:
            self.power_save_mode = True
            self._apply_quality_settings()
            self.logger.info("Power save mode enabled")
    
    def _enable_battery_saver_mode(self) -> None:
        """Enable battery saver mode"""
        if not self.battery_saver_active:
            self.battery_saver_active = True
            self.power_save_mode = True
            self._apply_quality_settings()
            self.logger.info("Battery saver mode enabled")
    
    def _enable_emergency_battery_mode(self) -> None:
        """Enable emergency battery mode"""
        self._trigger_adaptation(
            AdaptationReason.BATTERY_LOW,
            0.0,
            5.0,
            "Emergency battery mode - critical battery level"
        )
        self.battery_saver_active = True
        self.power_save_mode = True
    
    def _disable_power_modes(self) -> None:
        """Disable power saving modes"""
        if self.power_save_mode or self.battery_saver_active:
            self.power_save_mode = False
            self.battery_saver_active = False
            self._apply_quality_settings()
            self.logger.info("Power saving modes disabled")
    
    def manual_quality_change(self, quality: QualityLevel) -> None:
        """Manually set quality level"""
        with self._lock:
            if quality != self.current_quality:
                self._perform_adaptation(
                    quality,
                    AdaptationReason.USER_REQUEST,
                    0.0,
                    0.0,
                    f"Manual quality change to {quality.name}"
                )
    
    def get_current_quality(self) -> QualityLevel:
        """Get current quality level"""
        return self.current_quality
    
    def get_current_settings(self) -> QualitySettings:
        """Get current quality settings"""
        settings = self.quality_settings[self.current_quality]
        
        if self.battery_saver_active:
            return self._apply_battery_saver_modifications(settings)
        elif self.power_save_mode:
            return self._apply_power_save_modifications(settings)
        
        return settings
    
    def get_adaptation_history(self) -> List[AdaptationEvent]:
        """Get adaptation history"""
        return self.adaptation_history.copy()
    
    def add_adaptation_callback(self, callback: Callable[[AdaptationEvent], None]) -> None:
        """Add callback for adaptation events"""
        self.adaptation_callbacks.append(callback)
    
    def add_settings_callback(self, callback: Callable[[QualitySettings], None]) -> None:
        """Add callback for settings changes"""
        self.settings_callbacks.append(callback)
    
    def get_status(self) -> Dict[str, Any]:
        """Get current adaptation manager status"""
        return {
            "current_quality": self.current_quality.name,
            "power_save_mode": self.power_save_mode,
            "battery_saver_active": self.battery_saver_active,
            "thermal_throttling_active": self.thermal_throttling_active,
            "last_adaptation_time": self.last_adaptation_time,
            "adaptation_count": len(self.adaptation_history),
            "current_settings": self.get_current_settings().__dict__
        }

# Example usage
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    def on_adaptation(event: AdaptationEvent):
        print(f"Adaptation: {event.previous_level.name} → {event.new_level.name} "
              f"({event.reason.value}: {event.description})")
    
    def on_settings_change(settings: QualitySettings):
        print(f"Settings: Quality={settings.level.name}, "
              f"Particles={settings.particle_count}, "
              f"FPS={settings.target_fps}")
    
    # Create adaptive manager
    manager = AdaptiveManager()
    manager.add_adaptation_callback(on_adaptation)
    manager.add_settings_callback(on_settings_change)
    
    # Simulate performance issues
    print("Simulating frame time issues...")
    manager.handle_frame_performance(25.0, 3)  # Critical frame time
    
    print("\nSimulating CPU overload...")
    manager.handle_system_metrics(90.0, None, 60.0, 80.0, False)
    
    print("\nSimulating low battery...")
    manager.handle_system_metrics(50.0, None, 60.0, 10.0, False)
    
    print("\nFinal status:")
    print(json.dumps(manager.get_status(), indent=2))
