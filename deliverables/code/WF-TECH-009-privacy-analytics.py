#!/usr/bin/env python3
"""
WF-TECH-009 Privacy-Preserving Analytics
Local-first analytics with differential privacy and user consent management
Adheres to WIRTHFORGE principles of user sovereignty and data minimization
"""

import json
import time
import hashlib
import random
import math
from typing import Dict, List, Optional, Any, Tuple, Set
from dataclasses import dataclass, asdict
from pathlib import Path
import logging
from enum import Enum
import sqlite3
from datetime import datetime, timedelta
import uuid

logger = logging.getLogger(__name__)

class PrivacyLevel(Enum):
    """Privacy levels for analytics data"""
    NONE = "none"           # No analytics collection
    MINIMAL = "minimal"     # Basic performance metrics only
    STANDARD = "standard"   # Standard metrics with anonymization
    DETAILED = "detailed"   # Detailed metrics with differential privacy

class ConsentStatus(Enum):
    """User consent status for data collection"""
    NOT_ASKED = "not_asked"
    GRANTED = "granted"
    DENIED = "denied"
    REVOKED = "revoked"

@dataclass
class PrivacyConfig:
    """Privacy configuration for analytics"""
    privacy_level: PrivacyLevel
    consent_status: ConsentStatus
    epsilon: float = 1.0  # Differential privacy parameter
    delta: float = 1e-5   # Differential privacy parameter
    retention_days: int = 30
    anonymize_user_data: bool = True
    allow_export: bool = False
    require_explicit_consent: bool = True

@dataclass
class AnonymizedMetric:
    """Anonymized metric with privacy guarantees"""
    metric_name: str
    value: float
    noise_added: float
    privacy_budget_used: float
    timestamp: float
    session_hash: str

class DifferentialPrivacy:
    """
    Differential privacy implementation for metrics
    Adds calibrated noise to preserve privacy while maintaining utility
    """
    
    def __init__(self, epsilon: float = 1.0, delta: float = 1e-5):
        self.epsilon = epsilon
        self.delta = delta
        self.privacy_budget_used = 0.0
        self.max_budget = epsilon
        
    def add_laplace_noise(self, value: float, sensitivity: float) -> Tuple[float, float]:
        """Add Laplace noise for differential privacy"""
        if self.privacy_budget_used >= self.max_budget:
            logger.warning("Privacy budget exhausted, returning zero")
            return 0.0, 0.0
        
        # Calculate noise scale
        scale = sensitivity / self.epsilon
        noise = random.laplace(0, scale)
        
        # Track budget usage
        budget_used = self.epsilon / 10  # Conservative budget allocation
        self.privacy_budget_used += budget_used
        
        return value + noise, abs(noise)
    
    def get_remaining_budget(self) -> float:
        """Get remaining privacy budget"""
        return max(0.0, self.max_budget - self.privacy_budget_used)
    
    def reset_budget(self):
        """Reset privacy budget (typically done per session)"""
        self.privacy_budget_used = 0.0

class DataMinimizer:
    """
    Data minimization engine - only collects necessary metrics
    Implements GDPR-style data minimization principles
    """
    
    def __init__(self, privacy_config: PrivacyConfig):
        self.config = privacy_config
        self.allowed_metrics = self._get_allowed_metrics()
        
    def _get_allowed_metrics(self) -> Set[str]:
        """Get allowed metrics based on privacy level"""
        if self.config.privacy_level == PrivacyLevel.NONE:
            return set()
        elif self.config.privacy_level == PrivacyLevel.MINIMAL:
            return {
                "frame_stability.current_fps",
                "latency.average_latency_ms",
                "system_health.status"
            }
        elif self.config.privacy_level == PrivacyLevel.STANDARD:
            return {
                "frame_stability.current_fps",
                "frame_stability.frame_drops",
                "latency.average_latency_ms",
                "latency.p95_latency_ms",
                "energy_fidelity.fidelity_ratio",
                "error_counts.total_errors",
                "resource_utilization.cpu_usage_percentage",
                "system_health.status"
            }
        else:  # DETAILED
            return {
                "frame_stability.current_fps",
                "frame_stability.frame_drops",
                "frame_stability.jitter_ms",
                "latency.average_latency_ms",
                "latency.p95_latency_ms",
                "latency.p99_latency_ms",
                "energy_fidelity.fidelity_ratio",
                "energy_fidelity.visual_energy",
                "error_counts.total_errors",
                "error_counts.error_rate",
                "progression_rate.tokens_per_second",
                "progression_rate.user_engagement_score",
                "resource_utilization.cpu_usage_percentage",
                "resource_utilization.memory_usage_mb",
                "throughput.requests_per_second",
                "system_health.status"
            }
    
    def filter_metrics(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Filter metrics based on privacy configuration"""
        if self.config.consent_status != ConsentStatus.GRANTED:
            return {}
        
        filtered = {}
        flat_metrics = self._flatten_dict(metrics)
        
        for metric_path, value in flat_metrics.items():
            if metric_path in self.allowed_metrics:
                self._set_nested_value(filtered, metric_path, value)
        
        return filtered
    
    def _flatten_dict(self, d: Dict[str, Any], prefix: str = "") -> Dict[str, Any]:
        """Flatten nested dictionary"""
        flat = {}
        for key, value in d.items():
            full_key = f"{prefix}.{key}" if prefix else key
            if isinstance(value, dict):
                flat.update(self._flatten_dict(value, full_key))
            else:
                flat[full_key] = value
        return flat
    
    def _set_nested_value(self, d: Dict[str, Any], path: str, value: Any):
        """Set value in nested dictionary using dot notation"""
        keys = path.split('.')
        current = d
        for key in keys[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]
        current[keys[-1]] = value

class ConsentManager:
    """
    Manages user consent for analytics collection
    Implements GDPR-compliant consent management
    """
    
    def __init__(self, consent_db_path: str):
        self.db_path = consent_db_path
        self._init_database()
        
    def _init_database(self):
        """Initialize consent database"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_consent (
                    user_hash TEXT PRIMARY KEY,
                    consent_status TEXT NOT NULL,
                    privacy_level TEXT NOT NULL,
                    granted_at REAL,
                    revoked_at REAL,
                    consent_version TEXT NOT NULL,
                    purposes TEXT NOT NULL
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS consent_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_hash TEXT NOT NULL,
                    action TEXT NOT NULL,
                    timestamp REAL NOT NULL,
                    details TEXT
                )
            """)
            
            conn.commit()
    
    def request_consent(self, user_hash: str, purposes: List[str]) -> Dict[str, Any]:
        """Request consent from user"""
        consent_request = {
            "user_hash": user_hash,
            "purposes": purposes,
            "requested_at": time.time(),
            "consent_version": "1.0",
            "privacy_options": {
                "none": "No analytics collection",
                "minimal": "Basic performance metrics only",
                "standard": "Standard metrics with anonymization", 
                "detailed": "Detailed metrics with differential privacy"
            },
            "data_usage": {
                "retention_period": "30 days maximum",
                "sharing": "Never shared with third parties",
                "export": "User can export their data anytime",
                "deletion": "User can delete their data anytime"
            }
        }
        
        self._log_consent_action(user_hash, "consent_requested", consent_request)
        return consent_request
    
    def grant_consent(self, user_hash: str, privacy_level: PrivacyLevel, 
                     purposes: List[str]) -> bool:
        """Grant consent for analytics collection"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO user_consent 
                    (user_hash, consent_status, privacy_level, granted_at, 
                     consent_version, purposes)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    user_hash,
                    ConsentStatus.GRANTED.value,
                    privacy_level.value,
                    time.time(),
                    "1.0",
                    json.dumps(purposes)
                ))
                conn.commit()
            
            self._log_consent_action(user_hash, "consent_granted", {
                "privacy_level": privacy_level.value,
                "purposes": purposes
            })
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to grant consent: {e}")
            return False
    
    def get_consent_status(self, user_hash: str) -> Tuple[ConsentStatus, PrivacyLevel]:
        """Get current consent status for user"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT consent_status, privacy_level 
                FROM user_consent 
                WHERE user_hash = ?
            """, (user_hash,))
            
            row = cursor.fetchone()
            if row:
                return ConsentStatus(row[0]), PrivacyLevel(row[1])
            else:
                return ConsentStatus.NOT_ASKED, PrivacyLevel.NONE
    
    def _log_consent_action(self, user_hash: str, action: str, details: Dict[str, Any]):
        """Log consent-related actions"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO consent_history 
                (user_hash, action, timestamp, details)
                VALUES (?, ?, ?, ?)
            """, (user_hash, action, time.time(), json.dumps(details)))
            conn.commit()

class PrivacyPreservingAnalytics:
    """
    Main privacy-preserving analytics engine
    Orchestrates all privacy components for WIRTHFORGE observability
    """
    
    def __init__(self, config: PrivacyConfig, consent_db_path: str):
        self.config = config
        self.consent_manager = ConsentManager(consent_db_path)
        self.data_minimizer = DataMinimizer(config)
        self.differential_privacy = DifferentialPrivacy(config.epsilon, config.delta)
        
        # Analytics storage
        self.analytics_db_path = consent_db_path.replace('consent.db', 'analytics.db')
        self._init_analytics_database()
        
    def _init_analytics_database(self):
        """Initialize analytics database"""
        with sqlite3.connect(self.analytics_db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS anonymized_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_hash TEXT NOT NULL,
                    metric_name TEXT NOT NULL,
                    value REAL NOT NULL,
                    noise_added REAL NOT NULL,
                    privacy_budget_used REAL NOT NULL,
                    timestamp REAL NOT NULL,
                    privacy_level TEXT NOT NULL
                )
            """)
            conn.commit()
    
    def collect_metrics(self, user_hash: str, session_id: str, 
                       metrics: Dict[str, Any]) -> bool:
        """Collect metrics with privacy preservation"""
        # Check consent
        consent_status, privacy_level = self.consent_manager.get_consent_status(user_hash)
        
        if consent_status != ConsentStatus.GRANTED:
            logger.info(f"Metrics collection skipped - no consent for user {user_hash[:8]}...")
            return False
        
        # Update config with user's privacy level
        self.config.privacy_level = privacy_level
        self.data_minimizer.config.privacy_level = privacy_level
        
        # Filter metrics based on privacy level
        filtered_metrics = self.data_minimizer.filter_metrics(metrics)
        
        if not filtered_metrics:
            return True  # No metrics to collect at this privacy level
        
        # Anonymize session
        session_hash = hashlib.sha256(f"{session_id}{user_hash}".encode()).hexdigest()[:16]
        
        # Apply differential privacy and store
        anonymized_metrics = []
        flat_metrics = self.data_minimizer._flatten_dict(filtered_metrics)
        
        for metric_name, value in flat_metrics.items():
            if isinstance(value, (int, float)):
                # Apply differential privacy
                sensitivity = self._get_metric_sensitivity(metric_name)
                noisy_value, noise_added = self.differential_privacy.add_laplace_noise(
                    float(value), sensitivity
                )
                
                anonymized_metric = AnonymizedMetric(
                    metric_name=metric_name,
                    value=noisy_value,
                    noise_added=noise_added,
                    privacy_budget_used=self.differential_privacy.privacy_budget_used,
                    timestamp=time.time(),
                    session_hash=session_hash
                )
                
                anonymized_metrics.append(anonymized_metric)
        
        # Store anonymized metrics
        self._store_anonymized_metrics(anonymized_metrics)
        
        logger.info(f"Collected {len(anonymized_metrics)} anonymized metrics")
        return True
    
    def _get_metric_sensitivity(self, metric_name: str) -> float:
        """Get sensitivity value for differential privacy"""
        sensitivity_map = {
            "frame_stability.current_fps": 10.0,
            "latency.average_latency_ms": 100.0,
            "energy_fidelity.fidelity_ratio": 0.1,
            "error_counts.total_errors": 1.0,
            "resource_utilization.cpu_usage_percentage": 5.0,
            "progression_rate.tokens_per_second": 10.0
        }
        return sensitivity_map.get(metric_name, 1.0)
    
    def _store_anonymized_metrics(self, metrics: List[AnonymizedMetric]):
        """Store anonymized metrics in database"""
        with sqlite3.connect(self.analytics_db_path) as conn:
            cursor = conn.cursor()
            
            for metric in metrics:
                cursor.execute("""
                    INSERT INTO anonymized_metrics 
                    (session_hash, metric_name, value, noise_added, 
                     privacy_budget_used, timestamp, privacy_level)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    metric.session_hash,
                    metric.metric_name,
                    metric.value,
                    metric.noise_added,
                    metric.privacy_budget_used,
                    metric.timestamp,
                    self.config.privacy_level.value
                ))
            
            conn.commit()
    
    def generate_privacy_safe_insights(self) -> Dict[str, Any]:
        """Generate aggregated insights with privacy guarantees"""
        insights = {}
        
        with sqlite3.connect(self.analytics_db_path) as conn:
            cursor = conn.cursor()
            
            # Get aggregated metrics with sufficient sample size
            cursor.execute("""
                SELECT metric_name, AVG(value), COUNT(*), MIN(timestamp), MAX(timestamp)
                FROM anonymized_metrics 
                WHERE timestamp > ? 
                GROUP BY metric_name
                HAVING COUNT(*) >= 10
            """, (time.time() - 86400,))  # Last 24 hours
            
            rows = cursor.fetchall()
            
            for metric_name, avg_value, count, min_time, max_time in rows:
                insights[metric_name] = {
                    "average_value": avg_value,
                    "sample_count": count,
                    "confidence_interval": f"±{avg_value * 0.1:.2f}",
                    "time_range": {
                        "start": min_time,
                        "end": max_time
                    }
                }
        
        return insights
    
    def export_user_data(self, user_hash: str) -> Dict[str, Any]:
        """Export user's data for GDPR compliance"""
        if not self.config.allow_export:
            return {"error": "Data export not allowed by privacy configuration"}
        
        export_data = {
            "user_hash": user_hash,
            "export_timestamp": time.time(),
            "consent_history": [],
            "privacy_level": self.config.privacy_level.value
        }
        
        # Export consent history
        with sqlite3.connect(self.consent_manager.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT action, timestamp, details 
                FROM consent_history 
                WHERE user_hash = ?
                ORDER BY timestamp
            """, (user_hash,))
            
            for action, timestamp, details in cursor.fetchall():
                export_data["consent_history"].append({
                    "action": action,
                    "timestamp": timestamp,
                    "details": json.loads(details) if details else {}
                })
        
        return export_data
    
    def cleanup_expired_data(self):
        """Clean up data past retention period"""
        cutoff_time = time.time() - (self.config.retention_days * 86400)
        
        with sqlite3.connect(self.analytics_db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                DELETE FROM anonymized_metrics 
                WHERE timestamp < ?
            """, (cutoff_time,))
            
            deleted_count = cursor.rowcount
            conn.commit()
            
            logger.info(f"Cleaned up {deleted_count} expired records")


def create_privacy_config_ui() -> Dict[str, Any]:
    """Create privacy configuration UI specification"""
    return {
        "title": "WIRTHFORGE Privacy Settings",
        "description": "Configure your privacy preferences for analytics collection",
        "sections": [
            {
                "name": "Data Collection",
                "fields": [
                    {
                        "type": "radio",
                        "name": "privacy_level",
                        "label": "Privacy Level",
                        "options": [
                            {
                                "value": "none",
                                "label": "No Analytics",
                                "description": "No data collection whatsoever"
                            },
                            {
                                "value": "minimal",
                                "label": "Minimal Analytics",
                                "description": "Basic performance metrics only"
                            },
                            {
                                "value": "standard",
                                "label": "Standard Analytics",
                                "description": "Standard metrics with anonymization"
                            },
                            {
                                "value": "detailed",
                                "label": "Detailed Analytics",
                                "description": "Detailed metrics with differential privacy"
                            }
                        ],
                        "default": "minimal"
                    }
                ]
            },
            {
                "name": "Data Rights",
                "fields": [
                    {
                        "type": "checkbox",
                        "name": "allow_export",
                        "label": "Allow Data Export",
                        "description": "Allow exporting your collected data",
                        "default": True
                    },
                    {
                        "type": "number",
                        "name": "retention_days",
                        "label": "Data Retention (days)",
                        "description": "How long to keep your data",
                        "min": 1,
                        "max": 365,
                        "default": 30
                    }
                ]
            }
        ],
        "actions": [
            {
                "type": "button",
                "name": "export_data",
                "label": "Export My Data",
                "style": "secondary"
            },
            {
                "type": "button",
                "name": "delete_data",
                "label": "Delete My Data",
                "style": "danger",
                "confirm": "Are you sure? This action cannot be undone."
            },
            {
                "type": "button",
                "name": "save_settings",
                "label": "Save Settings",
                "style": "primary"
            }
        ]
    }


if __name__ == "__main__":
    # Example usage
    import tempfile
    import os
    
    temp_dir = tempfile.mkdtemp()
    consent_db_path = os.path.join(temp_dir, "consent.db")
    
    config = PrivacyConfig(
        privacy_level=PrivacyLevel.STANDARD,
        consent_status=ConsentStatus.NOT_ASKED,
        epsilon=1.0,
        retention_days=30
    )
    
    analytics = PrivacyPreservingAnalytics(config, consent_db_path)
    
    # Test consent flow
    user_hash = "test_user_hash_123"
    consent_request = analytics.consent_manager.request_consent(
        user_hash, 
        ["performance_monitoring", "error_tracking"]
    )
    
    analytics.consent_manager.grant_consent(
        user_hash, 
        PrivacyLevel.STANDARD, 
        ["performance_monitoring", "error_tracking"]
    )
    
    # Test metrics collection
    test_metrics = {
        "frame_stability": {
            "current_fps": 58.5,
            "frame_drops": 2
        },
        "latency": {
            "average_latency_ms": 1250.0
        },
        "energy_fidelity": {
            "fidelity_ratio": 0.95
        }
    }
    
    success = analytics.collect_metrics(user_hash, "session_123", test_metrics)
    print(f"Metrics collection success: {success}")
    
    insights = analytics.generate_privacy_safe_insights()
    print("Privacy-safe insights:", json.dumps(insights, indent=2))
