#!/usr/bin/env python3
"""
WF-TECH-009 Performance Monitoring Dashboard
60Hz frame budget enforcement and real-time performance tracking
Integrates with WIRTHFORGE metrics collection system
"""

import time
import threading
import json
import statistics
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, asdict
from collections import deque
import logging

logger = logging.getLogger(__name__)

@dataclass
class FrameMetrics:
    """Single frame performance metrics"""
    frame_id: int
    start_time: float
    end_time: float
    duration_ms: float
    components: Dict[str, float]  # Component breakdown
    budget_exceeded: bool
    fps: float

@dataclass
class PerformanceAlert:
    """Performance alert information"""
    alert_type: str
    severity: str
    message: str
    metric_value: float
    threshold: float
    timestamp: float
    duration_ms: float = 0

class FrameBudgetMonitor:
    """
    60Hz frame budget monitor with real-time enforcement
    Target: 16.67ms per frame for 60 FPS
    """
    
    def __init__(self, target_fps: float = 60.0, alert_callback: Optional[Callable] = None):
        self.target_fps = target_fps
        self.frame_budget_ms = 1000.0 / target_fps  # 16.67ms for 60 FPS
        self.alert_callback = alert_callback
        
        # Performance tracking
        self.frame_history = deque(maxlen=3600)  # Last hour of frames
        self.current_frame_id = 0
        self.frame_start_time = None
        
        # Real-time metrics
        self.current_fps = 0.0
        self.average_fps = 0.0
        self.frame_drops = 0
        self.budget_violations = 0
        
        # Component timing
        self.component_timers = {}
        self.active_components = set()
        
        # Alert thresholds
        self.fps_warning_threshold = 55.0
        self.fps_critical_threshold = 45.0
        self.budget_violation_threshold = 5  # Max violations per minute
        
        logger.info(f"FrameBudgetMonitor initialized: {target_fps} FPS ({self.frame_budget_ms:.2f}ms budget)")

    def start_frame(self) -> int:
        """Start timing a new frame"""
        self.current_frame_id += 1
        self.frame_start_time = time.time()
        self.component_timers = {}
        self.active_components.clear()
        
        return self.current_frame_id

    def start_component(self, component_name: str):
        """Start timing a frame component"""
        if component_name not in self.active_components:
            self.component_timers[component_name] = time.time()
            self.active_components.add(component_name)

    def end_component(self, component_name: str):
        """End timing a frame component"""
        if component_name in self.active_components:
            start_time = self.component_timers.get(component_name, self.frame_start_time)
            duration = (time.time() - start_time) * 1000  # Convert to ms
            self.component_timers[component_name] = duration
            self.active_components.discard(component_name)

    def end_frame(self) -> FrameMetrics:
        """End frame timing and calculate metrics"""
        if self.frame_start_time is None:
            raise ValueError("Frame not started")
        
        end_time = time.time()
        duration_ms = (end_time - self.frame_start_time) * 1000
        budget_exceeded = duration_ms > self.frame_budget_ms
        
        # Calculate current FPS
        current_fps = 1000.0 / duration_ms if duration_ms > 0 else 0
        
        # Finalize any active components
        for component in list(self.active_components):
            self.end_component(component)
        
        # Create frame metrics
        frame_metrics = FrameMetrics(
            frame_id=self.current_frame_id,
            start_time=self.frame_start_time,
            end_time=end_time,
            duration_ms=duration_ms,
            components=dict(self.component_timers),
            budget_exceeded=budget_exceeded,
            fps=current_fps
        )
        
        # Update tracking
        self.frame_history.append(frame_metrics)
        self._update_performance_metrics()
        
        # Check for alerts
        self._check_performance_alerts(frame_metrics)
        
        # Reset for next frame
        self.frame_start_time = None
        
        return frame_metrics

    def _update_performance_metrics(self):
        """Update real-time performance metrics"""
        if not self.frame_history:
            return
        
        recent_frames = list(self.frame_history)[-60:]  # Last 60 frames
        
        # Calculate FPS metrics
        fps_values = [f.fps for f in recent_frames]
        self.current_fps = fps_values[-1] if fps_values else 0
        self.average_fps = statistics.mean(fps_values) if fps_values else 0
        
        # Count violations
        self.budget_violations = sum(1 for f in recent_frames if f.budget_exceeded)
        self.frame_drops = self.budget_violations

    def _check_performance_alerts(self, frame_metrics: FrameMetrics):
        """Check for performance alerts and trigger callbacks"""
        alerts = []
        
        # FPS alerts
        if self.current_fps < self.fps_critical_threshold:
            alerts.append(PerformanceAlert(
                alert_type="fps_critical",
                severity="critical",
                message=f"Critical FPS drop: {self.current_fps:.1f} FPS (target: {self.target_fps})",
                metric_value=self.current_fps,
                threshold=self.fps_critical_threshold,
                timestamp=time.time()
            ))
        elif self.current_fps < self.fps_warning_threshold:
            alerts.append(PerformanceAlert(
                alert_type="fps_warning",
                severity="warning",
                message=f"FPS below target: {self.current_fps:.1f} FPS (target: {self.target_fps})",
                metric_value=self.current_fps,
                threshold=self.fps_warning_threshold,
                timestamp=time.time()
            ))
        
        # Frame budget alerts
        if frame_metrics.budget_exceeded:
            alerts.append(PerformanceAlert(
                alert_type="budget_violation",
                severity="warning",
                message=f"Frame budget exceeded: {frame_metrics.duration_ms:.2f}ms (budget: {self.frame_budget_ms:.2f}ms)",
                metric_value=frame_metrics.duration_ms,
                threshold=self.frame_budget_ms,
                timestamp=time.time()
            ))
        
        # Budget violation rate alert
        recent_violations = sum(1 for f in list(self.frame_history)[-60:] if f.budget_exceeded)
        if recent_violations > self.budget_violation_threshold:
            alerts.append(PerformanceAlert(
                alert_type="high_violation_rate",
                severity="critical",
                message=f"High frame budget violation rate: {recent_violations} violations in last minute",
                metric_value=recent_violations,
                threshold=self.budget_violation_threshold,
                timestamp=time.time()
            ))
        
        # Trigger alert callbacks
        if alerts and self.alert_callback:
            for alert in alerts:
                self.alert_callback(alert)

    def get_performance_summary(self) -> Dict[str, Any]:
        """Get current performance summary"""
        if not self.frame_history:
            return {
                "current_fps": 0,
                "average_fps": 0,
                "frame_drops": 0,
                "budget_violations": 0,
                "stability_score": 100
            }
        
        recent_frames = list(self.frame_history)[-300:]  # Last 5 minutes
        
        # Calculate stability score
        fps_values = [f.fps for f in recent_frames]
        fps_variance = statistics.variance(fps_values) if len(fps_values) > 1 else 0
        stability_score = max(0, 100 - (fps_variance / 10))  # Normalize variance
        
        # Component breakdown
        component_stats = {}
        for frame in recent_frames:
            for component, duration in frame.components.items():
                if component not in component_stats:
                    component_stats[component] = []
                component_stats[component].append(duration)
        
        component_averages = {
            comp: statistics.mean(times) 
            for comp, times in component_stats.items()
        }
        
        return {
            "current_fps": self.current_fps,
            "average_fps": self.average_fps,
            "frame_drops": self.frame_drops,
            "budget_violations": self.budget_violations,
            "stability_score": stability_score,
            "frame_budget_ms": self.frame_budget_ms,
            "component_breakdown": component_averages,
            "total_frames": len(self.frame_history),
            "violation_rate": (self.budget_violations / len(recent_frames)) * 100 if recent_frames else 0
        }

    def get_frame_history(self, count: int = 60) -> List[Dict[str, Any]]:
        """Get recent frame history for charting"""
        recent_frames = list(self.frame_history)[-count:]
        return [
            {
                "frame_id": f.frame_id,
                "timestamp": f.start_time,
                "duration_ms": f.duration_ms,
                "fps": f.fps,
                "budget_exceeded": f.budget_exceeded,
                "components": f.components
            }
            for f in recent_frames
        ]

class PerformanceDashboard:
    """
    Real-time performance dashboard with adaptive quality control
    """
    
    def __init__(self, frame_monitor: FrameBudgetMonitor):
        self.frame_monitor = frame_monitor
        self.running = False
        self.dashboard_thread = None
        
        # Performance adaptation settings
        self.adaptive_quality = True
        self.quality_level = 100  # 0-100%
        self.min_quality_level = 25
        
        # Dashboard update frequency
        self.update_interval = 1.0  # 1 second
        
        # Performance history for trending
        self.performance_history = deque(maxlen=3600)  # 1 hour
        
        logger.info("PerformanceDashboard initialized")

    def start(self):
        """Start the performance dashboard"""
        if self.running:
            return
        
        self.running = True
        self.dashboard_thread = threading.Thread(target=self._dashboard_loop, daemon=True)
        self.dashboard_thread.start()
        logger.info("Performance dashboard started")

    def stop(self):
        """Stop the performance dashboard"""
        self.running = False
        if self.dashboard_thread:
            self.dashboard_thread.join(timeout=5.0)
        logger.info("Performance dashboard stopped")

    def _dashboard_loop(self):
        """Main dashboard update loop"""
        while self.running:
            try:
                # Get current performance metrics
                summary = self.frame_monitor.get_performance_summary()
                
                # Store in history
                self.performance_history.append({
                    "timestamp": time.time(),
                    "metrics": summary
                })
                
                # Adaptive quality control
                if self.adaptive_quality:
                    self._adjust_quality(summary)
                
                # Sleep until next update
                time.sleep(self.update_interval)
                
            except Exception as e:
                logger.error(f"Dashboard loop error: {e}")
                time.sleep(self.update_interval)

    def _adjust_quality(self, performance_summary: Dict[str, Any]):
        """Automatically adjust quality based on performance"""
        current_fps = performance_summary.get("current_fps", 60)
        violation_rate = performance_summary.get("violation_rate", 0)
        
        # Quality adjustment logic
        if current_fps < 45 or violation_rate > 20:
            # Severe performance issues - reduce quality significantly
            target_quality = max(self.min_quality_level, self.quality_level - 25)
        elif current_fps < 55 or violation_rate > 10:
            # Moderate performance issues - reduce quality moderately
            target_quality = max(self.min_quality_level, self.quality_level - 10)
        elif current_fps > 58 and violation_rate < 5:
            # Good performance - can increase quality
            target_quality = min(100, self.quality_level + 5)
        else:
            # Stable performance - no change
            target_quality = self.quality_level
        
        if target_quality != self.quality_level:
            old_quality = self.quality_level
            self.quality_level = target_quality
            logger.info(f"Quality adjusted: {old_quality}% -> {self.quality_level}% (FPS: {current_fps:.1f})")

    def get_dashboard_data(self) -> Dict[str, Any]:
        """Get complete dashboard data for web UI"""
        performance_summary = self.frame_monitor.get_performance_summary()
        frame_history = self.frame_monitor.get_frame_history(60)
        
        # Calculate trends
        recent_history = list(self.performance_history)[-60:]  # Last minute
        fps_trend = self._calculate_trend([h["metrics"]["current_fps"] for h in recent_history])
        
        return {
            "timestamp": time.time(),
            "performance": performance_summary,
            "frame_history": frame_history,
            "quality_level": self.quality_level,
            "adaptive_quality_enabled": self.adaptive_quality,
            "trends": {
                "fps_trend": fps_trend,
                "stability_trend": self._calculate_trend([
                    h["metrics"]["stability_score"] for h in recent_history
                ])
            },
            "alerts": self._get_active_alerts(),
            "recommendations": self._generate_recommendations(performance_summary)
        }

    def _calculate_trend(self, values: List[float]) -> str:
        """Calculate trend direction from values"""
        if len(values) < 10:
            return "insufficient_data"
        
        # Simple linear regression slope
        n = len(values)
        x_mean = (n - 1) / 2
        y_mean = statistics.mean(values)
        
        numerator = sum((i - x_mean) * (values[i] - y_mean) for i in range(n))
        denominator = sum((i - x_mean) ** 2 for i in range(n))
        
        if denominator == 0:
            return "stable"
        
        slope = numerator / denominator
        
        if slope > 0.1:
            return "improving"
        elif slope < -0.1:
            return "degrading"
        else:
            return "stable"

    def _get_active_alerts(self) -> List[Dict[str, Any]]:
        """Get currently active performance alerts"""
        # This would integrate with the alert system
        # For now, return based on current performance
        alerts = []
        summary = self.frame_monitor.get_performance_summary()
        
        if summary["current_fps"] < 45:
            alerts.append({
                "type": "critical",
                "message": f"Critical FPS: {summary['current_fps']:.1f}",
                "metric": "fps",
                "value": summary["current_fps"]
            })
        elif summary["current_fps"] < 55:
            alerts.append({
                "type": "warning", 
                "message": f"Low FPS: {summary['current_fps']:.1f}",
                "metric": "fps",
                "value": summary["current_fps"]
            })
        
        if summary["violation_rate"] > 20:
            alerts.append({
                "type": "warning",
                "message": f"High frame budget violations: {summary['violation_rate']:.1f}%",
                "metric": "budget_violations",
                "value": summary["violation_rate"]
            })
        
        return alerts

    def _generate_recommendations(self, performance_summary: Dict[str, Any]) -> List[str]:
        """Generate performance optimization recommendations"""
        recommendations = []
        
        fps = performance_summary.get("current_fps", 60)
        violation_rate = performance_summary.get("violation_rate", 0)
        component_breakdown = performance_summary.get("component_breakdown", {})
        
        if fps < 50:
            recommendations.append("Consider reducing visual quality settings")
            recommendations.append("Close other applications to free up system resources")
        
        if violation_rate > 15:
            recommendations.append("Frame budget frequently exceeded - reduce processing complexity")
        
        # Component-specific recommendations
        if "decipher" in component_breakdown and component_breakdown["decipher"] > 10:
            recommendations.append("DECIPHER processing is slow - consider optimizing prompts")
        
        if "energy_render" in component_breakdown and component_breakdown["energy_render"] > 8:
            recommendations.append("Energy rendering is consuming significant time - reduce particle count")
        
        if "ui_update" in component_breakdown and component_breakdown["ui_update"] > 5:
            recommendations.append("UI updates are slow - check for DOM performance issues")
        
        if not recommendations:
            recommendations.append("Performance is optimal - no recommendations")
        
        return recommendations

    def export_performance_report(self, duration_hours: int = 1) -> Dict[str, Any]:
        """Export detailed performance report"""
        cutoff_time = time.time() - (duration_hours * 3600)
        relevant_history = [
            h for h in self.performance_history 
            if h["timestamp"] >= cutoff_time
        ]
        
        if not relevant_history:
            return {"error": "No data available for specified duration"}
        
        # Calculate statistics
        fps_values = [h["metrics"]["current_fps"] for h in relevant_history]
        stability_scores = [h["metrics"]["stability_score"] for h in relevant_history]
        violation_rates = [h["metrics"]["violation_rate"] for h in relevant_history]
        
        return {
            "report_period": {
                "start": relevant_history[0]["timestamp"],
                "end": relevant_history[-1]["timestamp"],
                "duration_hours": duration_hours
            },
            "fps_statistics": {
                "min": min(fps_values),
                "max": max(fps_values),
                "mean": statistics.mean(fps_values),
                "median": statistics.median(fps_values),
                "p95": statistics.quantiles(fps_values, n=20)[18] if len(fps_values) > 20 else max(fps_values)
            },
            "stability_statistics": {
                "min": min(stability_scores),
                "max": max(stability_scores),
                "mean": statistics.mean(stability_scores)
            },
            "violation_statistics": {
                "min": min(violation_rates),
                "max": max(violation_rates),
                "mean": statistics.mean(violation_rates)
            },
            "quality_adjustments": self._count_quality_adjustments(relevant_history),
            "total_frames": sum(h["metrics"]["total_frames"] for h in relevant_history),
            "recommendations": self._generate_recommendations(relevant_history[-1]["metrics"])
        }

    def _count_quality_adjustments(self, history: List[Dict[str, Any]]) -> int:
        """Count quality level adjustments in history"""
        # This would track actual quality changes
        # For now, estimate based on performance variations
        fps_values = [h["metrics"]["current_fps"] for h in history]
        significant_changes = 0
        
        for i in range(1, len(fps_values)):
            if abs(fps_values[i] - fps_values[i-1]) > 5:
                significant_changes += 1
        
        return significant_changes // 5  # Estimate quality adjustments


# Example usage and integration
def example_usage():
    """Example of how to use the performance monitoring system"""
    
    def alert_handler(alert: PerformanceAlert):
        print(f"ALERT [{alert.severity}]: {alert.message}")
    
    # Initialize monitoring
    frame_monitor = FrameBudgetMonitor(target_fps=60.0, alert_callback=alert_handler)
    dashboard = PerformanceDashboard(frame_monitor)
    
    # Start dashboard
    dashboard.start()
    
    try:
        # Simulate frame processing
        for i in range(100):
            frame_id = frame_monitor.start_frame()
            
            # Simulate DECIPHER processing
            frame_monitor.start_component("decipher")
            time.sleep(0.008)  # 8ms
            frame_monitor.end_component("decipher")
            
            # Simulate energy rendering
            frame_monitor.start_component("energy_render")
            time.sleep(0.005)  # 5ms
            frame_monitor.end_component("energy_render")
            
            # Simulate UI update
            frame_monitor.start_component("ui_update")
            time.sleep(0.003)  # 3ms
            frame_monitor.end_component("ui_update")
            
            # End frame
            metrics = frame_monitor.end_frame()
            
            # Occasionally simulate performance issues
            if i % 20 == 0:
                time.sleep(0.010)  # Extra delay
            
            time.sleep(0.001)  # Small gap between frames
        
        # Get dashboard data
        dashboard_data = dashboard.get_dashboard_data()
        print("Dashboard Data:", json.dumps(dashboard_data, indent=2))
        
        # Export performance report
        report = dashboard.export_performance_report(duration_hours=1)
        print("Performance Report:", json.dumps(report, indent=2))
        
    finally:
        dashboard.stop()


if __name__ == "__main__":
    example_usage()
