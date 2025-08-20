#!/usr/bin/env python3
"""
WF-BIZ-001 Business Metrics
Key performance indicators and business analytics for WIRTHFORGE platform
"""

import json
import math
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum
import sqlite3
import threading

class MetricType(Enum):
    ACQUISITION = "acquisition"
    ENGAGEMENT = "engagement"
    RETENTION = "retention"
    REVENUE = "revenue"
    OPERATIONAL = "operational"
    ENERGY = "energy"

class MetricFrequency(Enum):
    REAL_TIME = "real_time"
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"

@dataclass
class MetricValue:
    """Single metric measurement"""
    metric_id: str
    timestamp: float
    value: float
    dimensions: Dict[str, str]
    metadata: Dict[str, Any]

@dataclass
class UserEvent:
    """User interaction event for analytics"""
    user_id: str
    event_type: str
    timestamp: float
    properties: Dict[str, Any]
    session_id: str
    tier: str

class BusinessMetrics:
    """
    Business metrics collection and analysis for WIRTHFORGE
    Privacy-preserving analytics with local-first data processing
    """
    
    def __init__(self, db_path: str = "business_metrics.db"):
        self.db_path = db_path
        self.lock = threading.Lock()
        self._initialize_database()
        
        # Metric definitions
        self.metrics_config = {
            # Acquisition Metrics
            "monthly_active_users": {
                "type": MetricType.ACQUISITION,
                "frequency": MetricFrequency.DAILY,
                "description": "Unique users active in the last 30 days",
                "target": 10000,
                "critical_threshold": 5000
            },
            "new_user_signups": {
                "type": MetricType.ACQUISITION,
                "frequency": MetricFrequency.DAILY,
                "description": "New user registrations per day",
                "target": 100,
                "critical_threshold": 20
            },
            "conversion_rate": {
                "type": MetricType.ACQUISITION,
                "frequency": MetricFrequency.WEEKLY,
                "description": "Free to paid conversion rate",
                "target": 0.05,  # 5%
                "critical_threshold": 0.02
            },
            "customer_acquisition_cost": {
                "type": MetricType.ACQUISITION,
                "frequency": MetricFrequency.MONTHLY,
                "description": "Cost to acquire a paying customer",
                "target": 50.0,
                "critical_threshold": 100.0
            },
            
            # Engagement Metrics
            "daily_active_users": {
                "type": MetricType.ENGAGEMENT,
                "frequency": MetricFrequency.DAILY,
                "description": "Unique users active in the last 24 hours",
                "target": 3000,
                "critical_threshold": 1000
            },
            "session_duration": {
                "type": MetricType.ENGAGEMENT,
                "frequency": MetricFrequency.DAILY,
                "description": "Average session duration in minutes",
                "target": 25.0,
                "critical_threshold": 10.0
            },
            "feature_adoption_rate": {
                "type": MetricType.ENGAGEMENT,
                "frequency": MetricFrequency.WEEKLY,
                "description": "Percentage of users using new features",
                "target": 0.30,  # 30%
                "critical_threshold": 0.10
            },
            "api_calls_per_user": {
                "type": MetricType.ENGAGEMENT,
                "frequency": MetricFrequency.DAILY,
                "description": "Average API calls per active user",
                "target": 50.0,
                "critical_threshold": 10.0
            },
            
            # Retention Metrics
            "monthly_churn_rate": {
                "type": MetricType.RETENTION,
                "frequency": MetricFrequency.MONTHLY,
                "description": "Percentage of users who cancel subscription",
                "target": 0.05,  # 5%
                "critical_threshold": 0.15
            },
            "customer_lifetime_value": {
                "type": MetricType.RETENTION,
                "frequency": MetricFrequency.MONTHLY,
                "description": "Average revenue per customer over lifetime",
                "target": 500.0,
                "critical_threshold": 200.0
            },
            "net_promoter_score": {
                "type": MetricType.RETENTION,
                "frequency": MetricFrequency.MONTHLY,
                "description": "Customer satisfaction and loyalty score",
                "target": 50.0,
                "critical_threshold": 20.0
            },
            
            # Revenue Metrics
            "monthly_recurring_revenue": {
                "type": MetricType.REVENUE,
                "frequency": MetricFrequency.DAILY,
                "description": "Monthly recurring revenue from subscriptions",
                "target": 100000.0,
                "critical_threshold": 25000.0
            },
            "average_revenue_per_user": {
                "type": MetricType.REVENUE,
                "frequency": MetricFrequency.MONTHLY,
                "description": "Average monthly revenue per user",
                "target": 25.0,
                "critical_threshold": 10.0
            },
            "energy_billing_revenue": {
                "type": MetricType.REVENUE,
                "frequency": MetricFrequency.DAILY,
                "description": "Revenue from energy-based billing",
                "target": 20000.0,
                "critical_threshold": 5000.0
            },
            "marketplace_commission": {
                "type": MetricType.REVENUE,
                "frequency": MetricFrequency.DAILY,
                "description": "Revenue from marketplace transactions",
                "target": 5000.0,
                "critical_threshold": 1000.0
            },
            
            # Operational Metrics
            "support_ticket_volume": {
                "type": MetricType.OPERATIONAL,
                "frequency": MetricFrequency.DAILY,
                "description": "Number of support tickets created",
                "target": 50.0,
                "critical_threshold": 200.0
            },
            "average_resolution_time": {
                "type": MetricType.OPERATIONAL,
                "frequency": MetricFrequency.DAILY,
                "description": "Average support ticket resolution time in hours",
                "target": 24.0,
                "critical_threshold": 72.0
            },
            "system_uptime": {
                "type": MetricType.OPERATIONAL,
                "frequency": MetricFrequency.HOURLY,
                "description": "System availability percentage",
                "target": 0.999,  # 99.9%
                "critical_threshold": 0.95
            },
            
            # Energy Metrics
            "average_energy_per_user": {
                "type": MetricType.ENERGY,
                "frequency": MetricFrequency.DAILY,
                "description": "Average energy consumption per user in kWh",
                "target": 2.0,
                "critical_threshold": 5.0
            },
            "energy_efficiency_ratio": {
                "type": MetricType.ENERGY,
                "frequency": MetricFrequency.DAILY,
                "description": "Useful work per kWh consumed",
                "target": 100.0,
                "critical_threshold": 50.0
            }
        }
    
    def _initialize_database(self):
        """Initialize SQLite database for metrics storage"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    metric_id TEXT NOT NULL,
                    timestamp REAL NOT NULL,
                    value REAL NOT NULL,
                    dimensions TEXT,
                    metadata TEXT,
                    created_at REAL DEFAULT (julianday('now'))
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS user_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    timestamp REAL NOT NULL,
                    properties TEXT,
                    session_id TEXT,
                    tier TEXT,
                    created_at REAL DEFAULT (julianday('now'))
                )
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_metrics_id_time 
                ON metrics(metric_id, timestamp)
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_events_user_time 
                ON user_events(user_id, timestamp)
            """)
    
    def record_metric(self, metric: MetricValue):
        """Record a single metric value"""
        with self.lock:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO metrics (metric_id, timestamp, value, dimensions, metadata)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    metric.metric_id,
                    metric.timestamp,
                    metric.value,
                    json.dumps(metric.dimensions),
                    json.dumps(metric.metadata)
                ))
    
    def record_user_event(self, event: UserEvent):
        """Record a user interaction event"""
        with self.lock:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO user_events (user_id, event_type, timestamp, properties, session_id, tier)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    event.user_id,
                    event.event_type,
                    event.timestamp,
                    json.dumps(event.properties),
                    event.session_id,
                    event.tier
                ))
    
    def calculate_monthly_active_users(self, end_time: Optional[float] = None) -> float:
        """Calculate monthly active users (MAU)"""
        if end_time is None:
            end_time = time.time()
        
        start_time = end_time - (30 * 24 * 3600)  # 30 days ago
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT COUNT(DISTINCT user_id) 
                FROM user_events 
                WHERE timestamp BETWEEN ? AND ?
            """, (start_time, end_time))
            
            result = cursor.fetchone()
            return float(result[0]) if result else 0.0
    
    def calculate_daily_active_users(self, end_time: Optional[float] = None) -> float:
        """Calculate daily active users (DAU)"""
        if end_time is None:
            end_time = time.time()
        
        start_time = end_time - (24 * 3600)  # 24 hours ago
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT COUNT(DISTINCT user_id) 
                FROM user_events 
                WHERE timestamp BETWEEN ? AND ?
            """, (start_time, end_time))
            
            result = cursor.fetchone()
            return float(result[0]) if result else 0.0
    
    def calculate_conversion_rate(self, days: int = 30) -> float:
        """Calculate free to paid conversion rate"""
        end_time = time.time()
        start_time = end_time - (days * 24 * 3600)
        
        with sqlite3.connect(self.db_path) as conn:
            # Count users who signed up
            cursor = conn.execute("""
                SELECT COUNT(DISTINCT user_id) 
                FROM user_events 
                WHERE event_type = 'signup' AND timestamp BETWEEN ? AND ?
            """, (start_time, end_time))
            signups = cursor.fetchone()[0]
            
            # Count users who converted to paid
            cursor = conn.execute("""
                SELECT COUNT(DISTINCT user_id) 
                FROM user_events 
                WHERE event_type = 'subscription_started' AND timestamp BETWEEN ? AND ?
            """, (start_time, end_time))
            conversions = cursor.fetchone()[0]
            
            return float(conversions) / float(signups) if signups > 0 else 0.0
    
    def calculate_churn_rate(self, days: int = 30) -> float:
        """Calculate monthly churn rate"""
        end_time = time.time()
        start_time = end_time - (days * 24 * 3600)
        
        with sqlite3.connect(self.db_path) as conn:
            # Count active subscribers at start of period
            cursor = conn.execute("""
                SELECT COUNT(DISTINCT user_id) 
                FROM user_events 
                WHERE tier != 'free' AND timestamp < ?
            """, (start_time,))
            start_subscribers = cursor.fetchone()[0]
            
            # Count cancellations during period
            cursor = conn.execute("""
                SELECT COUNT(DISTINCT user_id) 
                FROM user_events 
                WHERE event_type = 'subscription_cancelled' AND timestamp BETWEEN ? AND ?
            """, (start_time, end_time))
            cancellations = cursor.fetchone()[0]
            
            return float(cancellations) / float(start_subscribers) if start_subscribers > 0 else 0.0
    
    def calculate_average_session_duration(self, days: int = 7) -> float:
        """Calculate average session duration in minutes"""
        end_time = time.time()
        start_time = end_time - (days * 24 * 3600)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT session_id, MIN(timestamp) as start_time, MAX(timestamp) as end_time
                FROM user_events 
                WHERE timestamp BETWEEN ? AND ?
                GROUP BY session_id
                HAVING COUNT(*) > 1
            """, (start_time, end_time))
            
            sessions = cursor.fetchall()
            if not sessions:
                return 0.0
            
            total_duration = sum((end - start) for _, start, end in sessions)
            return (total_duration / len(sessions)) / 60.0  # Convert to minutes
    
    def calculate_ltv_cac_ratio(self) -> float:
        """Calculate Customer Lifetime Value to Customer Acquisition Cost ratio"""
        ltv = self.get_latest_metric_value("customer_lifetime_value")
        cac = self.get_latest_metric_value("customer_acquisition_cost")
        
        return ltv / cac if cac > 0 else 0.0
    
    def get_latest_metric_value(self, metric_id: str) -> float:
        """Get the latest value for a specific metric"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT value FROM metrics 
                WHERE metric_id = ? 
                ORDER BY timestamp DESC 
                LIMIT 1
            """, (metric_id,))
            
            result = cursor.fetchone()
            return float(result[0]) if result else 0.0
    
    def get_metric_trend(self, metric_id: str, days: int = 30) -> List[Tuple[float, float]]:
        """Get metric trend over time"""
        end_time = time.time()
        start_time = end_time - (days * 24 * 3600)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT timestamp, value FROM metrics 
                WHERE metric_id = ? AND timestamp BETWEEN ? AND ?
                ORDER BY timestamp
            """, (metric_id, start_time, end_time))
            
            return cursor.fetchall()
    
    def generate_dashboard_data(self) -> Dict[str, Any]:
        """Generate comprehensive dashboard data"""
        now = time.time()
        
        # Calculate key metrics
        mau = self.calculate_monthly_active_users(now)
        dau = self.calculate_daily_active_users(now)
        conversion_rate = self.calculate_conversion_rate(30)
        churn_rate = self.calculate_churn_rate(30)
        avg_session = self.calculate_average_session_duration(7)
        ltv_cac = self.calculate_ltv_cac_ratio()
        
        # Record calculated metrics
        metrics_to_record = [
            MetricValue("monthly_active_users", now, mau, {}, {}),
            MetricValue("daily_active_users", now, dau, {}, {}),
            MetricValue("conversion_rate", now, conversion_rate, {}, {}),
            MetricValue("monthly_churn_rate", now, churn_rate, {}, {}),
            MetricValue("session_duration", now, avg_session, {}, {}),
        ]
        
        for metric in metrics_to_record:
            self.record_metric(metric)
        
        # Get latest values for all metrics
        current_metrics = {}
        metric_health = {}
        
        for metric_id, config in self.metrics_config.items():
            value = self.get_latest_metric_value(metric_id)
            current_metrics[metric_id] = value
            
            # Determine health status
            target = config["target"]
            critical = config["critical_threshold"]
            
            if metric_id in ["monthly_churn_rate", "customer_acquisition_cost", "average_resolution_time"]:
                # Lower is better for these metrics
                if value <= target:
                    health = "excellent"
                elif value <= critical:
                    health = "good"
                else:
                    health = "critical"
            else:
                # Higher is better for most metrics
                if value >= target:
                    health = "excellent"
                elif value >= critical:
                    health = "good"
                else:
                    health = "critical"
            
            metric_health[metric_id] = health
        
        # Calculate growth rates
        growth_rates = {}
        for metric_id in ["monthly_active_users", "monthly_recurring_revenue", "daily_active_users"]:
            trend = self.get_metric_trend(metric_id, 30)
            if len(trend) >= 2:
                old_value = trend[0][1]
                new_value = trend[-1][1]
                growth_rate = ((new_value - old_value) / old_value) * 100 if old_value > 0 else 0
                growth_rates[metric_id] = growth_rate
        
        dashboard = {
            "generated_at": datetime.now().isoformat(),
            "summary": {
                "monthly_active_users": mau,
                "daily_active_users": dau,
                "dau_mau_ratio": dau / mau if mau > 0 else 0,
                "conversion_rate": conversion_rate * 100,  # As percentage
                "churn_rate": churn_rate * 100,  # As percentage
                "ltv_cac_ratio": ltv_cac,
                "average_session_minutes": avg_session
            },
            "current_metrics": current_metrics,
            "metric_health": metric_health,
            "growth_rates": growth_rates,
            "alerts": self._generate_alerts(current_metrics, metric_health),
            "recommendations": self._generate_recommendations(current_metrics, metric_health)
        }
        
        return dashboard
    
    def _generate_alerts(self, metrics: Dict[str, float], health: Dict[str, str]) -> List[Dict[str, str]]:
        """Generate alerts for critical metrics"""
        alerts = []
        
        for metric_id, health_status in health.items():
            if health_status == "critical":
                config = self.metrics_config[metric_id]
                alerts.append({
                    "metric": metric_id,
                    "severity": "critical",
                    "message": f"{config['description']} is below critical threshold",
                    "current_value": metrics.get(metric_id, 0),
                    "threshold": config["critical_threshold"],
                    "target": config["target"]
                })
        
        return alerts
    
    def _generate_recommendations(self, metrics: Dict[str, float], health: Dict[str, str]) -> List[str]:
        """Generate actionable recommendations based on metrics"""
        recommendations = []
        
        # Conversion rate recommendations
        if health.get("conversion_rate") == "critical":
            recommendations.append("Focus on onboarding improvements and value demonstration")
        
        # Churn rate recommendations
        if health.get("monthly_churn_rate") == "critical":
            recommendations.append("Implement customer success programs and usage analytics")
        
        # Engagement recommendations
        if health.get("session_duration") == "critical":
            recommendations.append("Improve user experience and feature discoverability")
        
        # Energy efficiency recommendations
        if health.get("energy_efficiency_ratio") == "critical":
            recommendations.append("Optimize AI models for better energy efficiency")
        
        # Growth recommendations
        mau = metrics.get("monthly_active_users", 0)
        if mau < 1000:
            recommendations.append("Increase marketing efforts and community building")
        
        return recommendations
    
    def export_metrics(self, start_date: str, end_date: str) -> Dict[str, Any]:
        """Export metrics for external analysis (privacy-preserving)"""
        start_time = datetime.fromisoformat(start_date).timestamp()
        end_time = datetime.fromisoformat(end_date).timestamp()
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT metric_id, timestamp, value, dimensions 
                FROM metrics 
                WHERE timestamp BETWEEN ? AND ?
                ORDER BY metric_id, timestamp
            """, (start_time, end_time))
            
            metrics_data = []
            for row in cursor.fetchall():
                metrics_data.append({
                    "metric_id": row[0],
                    "timestamp": row[1],
                    "value": row[2],
                    "dimensions": json.loads(row[3]) if row[3] else {}
                })
        
        return {
            "export_id": f"WF-METRICS-{int(time.time())}",
            "period": {"start": start_date, "end": end_date},
            "metrics": metrics_data,
            "privacy_note": "All data is aggregated and anonymized",
            "export_timestamp": datetime.now().isoformat()
        }

def main():
    """Example usage of business metrics"""
    metrics = BusinessMetrics()
    
    # Simulate some user events
    now = time.time()
    
    # User signup
    signup_event = UserEvent(
        user_id="user_001",
        event_type="signup",
        timestamp=now - 86400,  # 1 day ago
        properties={"source": "organic", "tier": "free"},
        session_id="session_001",
        tier="free"
    )
    metrics.record_user_event(signup_event)
    
    # User activity
    activity_event = UserEvent(
        user_id="user_001",
        event_type="api_call",
        timestamp=now,
        properties={"endpoint": "/generate", "energy_kwh": 0.1},
        session_id="session_002",
        tier="personal"
    )
    metrics.record_user_event(activity_event)
    
    # Generate dashboard
    dashboard = metrics.generate_dashboard_data()
    print("Business Metrics Dashboard:")
    print(json.dumps(dashboard, indent=2))
    
    # Export metrics
    export_data = metrics.export_metrics(
        (datetime.now() - timedelta(days=30)).isoformat(),
        datetime.now().isoformat()
    )
    print(f"\nMetrics Export: {len(export_data['metrics'])} data points")

if __name__ == "__main__":
    main()
