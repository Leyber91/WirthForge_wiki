#!/usr/bin/env python3
"""
WF-TECH-009 Alert System Implementation
Configurable alert thresholds and notification system for WIRTHFORGE observability
"""

import yaml
import json
import time
import threading
import uuid
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

@dataclass
class Alert:
    """Alert instance with full context"""
    id: str
    rule_name: str
    severity: str
    message: str
    metric_name: str
    metric_value: float
    threshold: float
    triggered_at: float
    duration_seconds: float = 0
    acknowledged: bool = False
    auto_resolved: bool = False
    resolved_at: Optional[float] = None
    context: Dict[str, Any] = None

    def __post_init__(self):
        if self.context is None:
            self.context = {}

@dataclass
class AlertRule:
    """Alert rule configuration"""
    name: str
    enabled: bool
    threshold: float
    operator: str
    duration_seconds: float
    severity: str
    message: str
    cooldown_seconds: float
    auto_resolve: bool
    actions: List[str]
    adaptation_response: List[str] = None
    burst_threshold: Optional[int] = None
    burst_window_seconds: Optional[float] = None

    def __post_init__(self):
        if self.adaptation_response is None:
            self.adaptation_response = []

class AlertEvaluator:
    """Evaluates metrics against alert rules"""
    
    def __init__(self, config_path: str = None):
        self.config_path = config_path or "WF-TECH-009-alert-thresholds.yaml"
        self.rules = {}
        self.global_settings = {}
        self.load_configuration()
        
        # Alert state tracking
        self.active_alerts = {}  # rule_name -> Alert
        self.alert_history = deque(maxlen=10000)
        self.cooldown_tracker = {}  # rule_name -> last_triggered_time
        self.burst_tracker = defaultdict(list)  # rule_name -> [timestamps]
        
        # Callbacks
        self.alert_callbacks = []
        self.adaptation_callbacks = []
        
        logger.info(f"AlertEvaluator initialized with {len(self.rules)} rules")

    def load_configuration(self):
        """Load alert configuration from YAML file"""
        try:
            config_path = Path(self.config_path)
            if not config_path.exists():
                logger.warning(f"Alert config not found: {config_path}, using defaults")
                self._load_default_config()
                return
            
            with open(config_path, 'r') as f:
                config = yaml.safe_load(f)
            
            self.global_settings = config.get('global_settings', {})
            
            # Parse all rule categories
            for category, rules in config.items():
                if category in ['global_settings', 'actions', 'user_preferences', 'privacy_settings']:
                    continue
                
                if isinstance(rules, dict):
                    for rule_name, rule_config in rules.items():
                        if isinstance(rule_config, dict) and 'threshold' in rule_config:
                            full_rule_name = f"{category}.{rule_name}"
                            self.rules[full_rule_name] = AlertRule(
                                name=full_rule_name,
                                enabled=rule_config.get('enabled', True),
                                threshold=rule_config['threshold'],
                                operator=rule_config.get('operator', 'greater_than'),
                                duration_seconds=rule_config.get('duration_seconds', 0),
                                severity=rule_config.get('severity', 'warning'),
                                message=rule_config.get('message', 'Alert triggered'),
                                cooldown_seconds=rule_config.get('cooldown_seconds', 300),
                                auto_resolve=rule_config.get('auto_resolve', True),
                                actions=rule_config.get('actions', ['log_alert']),
                                adaptation_response=rule_config.get('adaptation_response', []),
                                burst_threshold=rule_config.get('burst_threshold'),
                                burst_window_seconds=rule_config.get('burst_window_seconds')
                            )
            
            logger.info(f"Loaded {len(self.rules)} alert rules from {config_path}")
            
        except Exception as e:
            logger.error(f"Failed to load alert configuration: {e}")
            self._load_default_config()

    def _load_default_config(self):
        """Load minimal default configuration"""
        self.global_settings = {
            'enabled': True,
            'default_cooldown_seconds': 300,
            'max_alerts_per_minute': 10
        }
        
        # Essential default rules
        self.rules = {
            'frame_performance.fps_critical': AlertRule(
                name='frame_performance.fps_critical',
                enabled=True,
                threshold=45.0,
                operator='less_than',
                duration_seconds=3,
                severity='critical',
                message='Critical frame rate drop: {value} FPS',
                cooldown_seconds=60,
                auto_resolve=True,
                actions=['log_alert', 'ui_notification']
            ),
            'latency_performance.p95_latency_critical': AlertRule(
                name='latency_performance.p95_latency_critical',
                enabled=True,
                threshold=2000.0,
                operator='greater_than',
                duration_seconds=5,
                severity='critical',
                message='P95 latency exceeded: {value}ms',
                cooldown_seconds=180,
                auto_resolve=True,
                actions=['log_alert', 'ui_notification']
            )
        }

    def add_alert_callback(self, callback: Callable[[Alert], None]):
        """Add callback for alert notifications"""
        self.alert_callbacks.append(callback)

    def add_adaptation_callback(self, callback: Callable[[str, List[str]], None]):
        """Add callback for adaptation responses"""
        self.adaptation_callbacks.append(callback)

    def evaluate_metrics(self, metrics: Dict[str, Any]):
        """Evaluate all metrics against alert rules"""
        if not self.global_settings.get('enabled', True):
            return
        
        current_time = time.time()
        
        # Flatten metrics for evaluation
        flat_metrics = self._flatten_metrics(metrics)
        
        # Evaluate each rule
        for rule_name, rule in self.rules.items():
            if not rule.enabled:
                continue
            
            try:
                self._evaluate_rule(rule, flat_metrics, current_time)
            except Exception as e:
                logger.error(f"Error evaluating rule {rule_name}: {e}")
        
        # Clean up old burst tracking data
        self._cleanup_burst_tracking(current_time)

    def _flatten_metrics(self, metrics: Dict[str, Any], prefix: str = "") -> Dict[str, float]:
        """Flatten nested metrics dictionary"""
        flat = {}
        
        for key, value in metrics.items():
            full_key = f"{prefix}.{key}" if prefix else key
            
            if isinstance(value, dict):
                flat.update(self._flatten_metrics(value, full_key))
            elif isinstance(value, (int, float)):
                flat[full_key] = float(value)
        
        return flat

    def _evaluate_rule(self, rule: AlertRule, metrics: Dict[str, float], current_time: float):
        """Evaluate a single alert rule"""
        # Extract metric name from rule name (e.g., "frame_performance.fps_critical" -> look for fps metrics)
        metric_candidates = self._find_metric_candidates(rule.name, metrics)
        
        if not metric_candidates:
            return
        
        # Use the most relevant metric
        metric_name, metric_value = metric_candidates[0]
        
        # Check if condition is met
        condition_met = self._check_condition(metric_value, rule.threshold, rule.operator)
        
        if condition_met:
            # Check burst threshold if configured
            if rule.burst_threshold and rule.burst_window_seconds:
                if not self._check_burst_threshold(rule.name, current_time, rule.burst_threshold, rule.burst_window_seconds):
                    return
            
            # Check cooldown
            if self._is_in_cooldown(rule.name, current_time, rule.cooldown_seconds):
                return
            
            # Check if alert already exists
            if rule.name in self.active_alerts:
                # Update existing alert duration
                alert = self.active_alerts[rule.name]
                alert.duration_seconds = current_time - alert.triggered_at
                alert.metric_value = metric_value
            else:
                # Create new alert
                alert = Alert(
                    id=str(uuid.uuid4()),
                    rule_name=rule.name,
                    severity=rule.severity,
                    message=rule.message.format(value=metric_value),
                    metric_name=metric_name,
                    metric_value=metric_value,
                    threshold=rule.threshold,
                    triggered_at=current_time,
                    context={
                        'operator': rule.operator,
                        'duration_requirement': rule.duration_seconds
                    }
                )
                
                # Check duration requirement
                if rule.duration_seconds > 0:
                    # Need to track condition over time
                    if not self._check_duration_requirement(rule.name, current_time, rule.duration_seconds):
                        return
                
                self.active_alerts[rule.name] = alert
                self.alert_history.append(alert)
                self.cooldown_tracker[rule.name] = current_time
                
                # Trigger callbacks
                self._trigger_alert_callbacks(alert)
                self._trigger_adaptation_callbacks(rule.name, rule.adaptation_response)
                
                logger.warning(f"Alert triggered: {alert.message}")
        
        else:
            # Condition not met - check for auto-resolution
            if rule.name in self.active_alerts and rule.auto_resolve:
                alert = self.active_alerts.pop(rule.name)
                alert.auto_resolved = True
                alert.resolved_at = current_time
                logger.info(f"Alert auto-resolved: {alert.message}")

    def _find_metric_candidates(self, rule_name: str, metrics: Dict[str, float]) -> List[tuple]:
        """Find metrics that match the rule name pattern"""
        candidates = []
        
        # Extract key terms from rule name
        rule_parts = rule_name.lower().split('.')
        
        for metric_name, metric_value in metrics.items():
            metric_parts = metric_name.lower().split('.')
            
            # Score based on matching terms
            score = 0
            for rule_part in rule_parts:
                for metric_part in metric_parts:
                    if rule_part in metric_part or metric_part in rule_part:
                        score += 1
            
            if score > 0:
                candidates.append((metric_name, metric_value))
        
        # Sort by relevance score (descending)
        candidates.sort(key=lambda x: len([p for p in rule_parts if any(p in mp for mp in x[0].lower().split('.'))]), reverse=True)
        
        return candidates

    def _check_condition(self, value: float, threshold: float, operator: str) -> bool:
        """Check if metric value meets alert condition"""
        if operator == "greater_than":
            return value > threshold
        elif operator == "less_than":
            return value < threshold
        elif operator == "greater_than_or_equal":
            return value >= threshold
        elif operator == "less_than_or_equal":
            return value <= threshold
        elif operator == "equal":
            return abs(value - threshold) < 0.001  # Float comparison
        elif operator == "not_equal":
            return abs(value - threshold) >= 0.001
        else:
            logger.warning(f"Unknown operator: {operator}")
            return False

    def _check_burst_threshold(self, rule_name: str, current_time: float, burst_threshold: int, burst_window: float) -> bool:
        """Check if burst threshold is exceeded"""
        # Clean old entries
        cutoff_time = current_time - burst_window
        self.burst_tracker[rule_name] = [t for t in self.burst_tracker[rule_name] if t >= cutoff_time]
        
        # Add current trigger
        self.burst_tracker[rule_name].append(current_time)
        
        # Check if threshold exceeded
        return len(self.burst_tracker[rule_name]) >= burst_threshold

    def _is_in_cooldown(self, rule_name: str, current_time: float, cooldown_seconds: float) -> bool:
        """Check if rule is in cooldown period"""
        last_triggered = self.cooldown_tracker.get(rule_name, 0)
        return (current_time - last_triggered) < cooldown_seconds

    def _check_duration_requirement(self, rule_name: str, current_time: float, duration_seconds: float) -> bool:
        """Check if condition has persisted for required duration"""
        # This is a simplified implementation
        # In practice, you'd need to track condition state over time
        return True  # For now, assume duration requirement is met

    def _cleanup_burst_tracking(self, current_time: float):
        """Clean up old burst tracking data"""
        cutoff_time = current_time - 3600  # Keep 1 hour of data
        
        for rule_name in list(self.burst_tracker.keys()):
            self.burst_tracker[rule_name] = [
                t for t in self.burst_tracker[rule_name] if t >= cutoff_time
            ]
            
            if not self.burst_tracker[rule_name]:
                del self.burst_tracker[rule_name]

    def _trigger_alert_callbacks(self, alert: Alert):
        """Trigger all registered alert callbacks"""
        for callback in self.alert_callbacks:
            try:
                callback(alert)
            except Exception as e:
                logger.error(f"Alert callback error: {e}")

    def _trigger_adaptation_callbacks(self, rule_name: str, adaptations: List[str]):
        """Trigger adaptation callbacks"""
        if not adaptations:
            return
        
        for callback in self.adaptation_callbacks:
            try:
                callback(rule_name, adaptations)
            except Exception as e:
                logger.error(f"Adaptation callback error: {e}")

    def acknowledge_alert(self, alert_id: str, user_id: str = "system") -> bool:
        """Acknowledge an active alert"""
        for alert in self.active_alerts.values():
            if alert.id == alert_id:
                alert.acknowledged = True
                logger.info(f"Alert acknowledged: {alert.message} by {user_id}")
                return True
        return False

    def get_active_alerts(self) -> List[Alert]:
        """Get all currently active alerts"""
        return list(self.active_alerts.values())

    def get_alert_summary(self) -> Dict[str, Any]:
        """Get summary of alert system status"""
        active_alerts = list(self.active_alerts.values())
        
        severity_counts = defaultdict(int)
        for alert in active_alerts:
            severity_counts[alert.severity] += 1
        
        return {
            "total_active_alerts": len(active_alerts),
            "severity_breakdown": dict(severity_counts),
            "total_rules": len(self.rules),
            "enabled_rules": sum(1 for rule in self.rules.values() if rule.enabled),
            "alert_history_count": len(self.alert_history),
            "system_enabled": self.global_settings.get('enabled', True)
        }

    def export_alert_data(self, hours: int = 24) -> Dict[str, Any]:
        """Export alert data for analysis"""
        cutoff_time = time.time() - (hours * 3600)
        
        recent_alerts = [
            alert for alert in self.alert_history 
            if alert.triggered_at >= cutoff_time
        ]
        
        return {
            "export_timestamp": time.time(),
            "period_hours": hours,
            "alerts": [asdict(alert) for alert in recent_alerts],
            "active_alerts": [asdict(alert) for alert in self.active_alerts.values()],
            "rule_configuration": {
                name: asdict(rule) for name, rule in self.rules.items()
            },
            "global_settings": self.global_settings
        }


class AlertNotificationSystem:
    """Handles alert notifications and UI integration"""
    
    def __init__(self, evaluator: AlertEvaluator):
        self.evaluator = evaluator
        self.notification_queue = deque()
        self.ui_callbacks = []
        
        # Register with evaluator
        evaluator.add_alert_callback(self.handle_alert)
        evaluator.add_adaptation_callback(self.handle_adaptation)
        
        logger.info("AlertNotificationSystem initialized")

    def add_ui_callback(self, callback: Callable[[Dict[str, Any]], None]):
        """Add UI notification callback"""
        self.ui_callbacks.append(callback)

    def handle_alert(self, alert: Alert):
        """Handle new alert notification"""
        notification = {
            "type": "alert",
            "alert_id": alert.id,
            "severity": alert.severity,
            "message": alert.message,
            "timestamp": alert.triggered_at,
            "metric": alert.metric_name,
            "value": alert.metric_value,
            "actions": ["acknowledge", "snooze", "investigate"]
        }
        
        self.notification_queue.append(notification)
        self._send_ui_notifications(notification)

    def handle_adaptation(self, rule_name: str, adaptations: List[str]):
        """Handle adaptation response"""
        if not adaptations:
            return
        
        notification = {
            "type": "adaptation",
            "rule_name": rule_name,
            "adaptations": adaptations,
            "timestamp": time.time(),
            "message": f"System adapted: {', '.join(adaptations)}"
        }
        
        self.notification_queue.append(notification)
        self._send_ui_notifications(notification)

    def _send_ui_notifications(self, notification: Dict[str, Any]):
        """Send notification to UI callbacks"""
        for callback in self.ui_callbacks:
            try:
                callback(notification)
            except Exception as e:
                logger.error(f"UI notification callback error: {e}")

    def get_pending_notifications(self) -> List[Dict[str, Any]]:
        """Get all pending notifications"""
        return list(self.notification_queue)

    def clear_notifications(self):
        """Clear all pending notifications"""
        self.notification_queue.clear()


# Example usage and testing
def example_usage():
    """Example of how to use the alert system"""
    
    # Initialize alert system
    evaluator = AlertEvaluator("WF-TECH-009-alert-thresholds.yaml")
    notification_system = AlertNotificationSystem(evaluator)
    
    # Add callbacks
    def alert_callback(alert):
        print(f"🚨 ALERT [{alert.severity}]: {alert.message}")
    
    def adaptation_callback(rule_name, adaptations):
        print(f"🔧 ADAPTATION for {rule_name}: {adaptations}")
    
    def ui_callback(notification):
        print(f"📱 UI NOTIFICATION: {notification}")
    
    evaluator.add_alert_callback(alert_callback)
    evaluator.add_adaptation_callback(adaptation_callback)
    notification_system.add_ui_callback(ui_callback)
    
    # Simulate metrics that trigger alerts
    test_metrics = {
        "frame_stability": {
            "current_fps": 42.0,  # Below 45 threshold
            "average_fps": 43.5,
            "frame_drops_count": 15
        },
        "latency": {
            "p95_latency_ms": 2500.0,  # Above 2000ms threshold
            "average_latency_ms": 1800.0
        },
        "energy_fidelity": {
            "fidelity_percentage": 65.0,  # Below 80% threshold
            "coherence_score": 75.0
        },
        "resource_utilization": {
            "cpu_usage_percentage": 92.0,  # Above 85% threshold
            "memory_usage_percentage": 88.0
        }
    }
    
    # Evaluate metrics
    print("Evaluating test metrics...")
    evaluator.evaluate_metrics(test_metrics)
    
    # Get alert summary
    summary = evaluator.get_alert_summary()
    print(f"\nAlert Summary: {json.dumps(summary, indent=2)}")
    
    # Get active alerts
    active_alerts = evaluator.get_active_alerts()
    print(f"\nActive Alerts: {len(active_alerts)}")
    for alert in active_alerts:
        print(f"  - {alert.severity}: {alert.message}")
    
    # Export alert data
    export_data = evaluator.export_alert_data(hours=1)
    print(f"\nExported {len(export_data['alerts'])} alerts")


if __name__ == "__main__":
    example_usage()
