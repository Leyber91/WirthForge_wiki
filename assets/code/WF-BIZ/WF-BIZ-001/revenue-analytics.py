#!/usr/bin/env python3
"""
WF-BIZ-001 Revenue Analytics
Advanced revenue analysis and forecasting for WIRTHFORGE platform
"""

import json
import math
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum
import sqlite3
import threading
from collections import defaultdict

class RevenueStream(Enum):
    SUBSCRIPTION = "subscription"
    ENERGY_BILLING = "energy_billing"
    MARKETPLACE = "marketplace"
    PROFESSIONAL_SERVICES = "professional_services"

class AnalyticsPeriod(Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUAL = "annual"

class CohortType(Enum):
    SIGNUP_MONTH = "signup_month"
    TIER_TYPE = "tier_type"
    ACQUISITION_CHANNEL = "acquisition_channel"
    GEOGRAPHIC_REGION = "geographic_region"

@dataclass
class RevenueEvent:
    """Single revenue event for analytics"""
    event_id: str
    user_id: str
    timestamp: float
    stream: RevenueStream
    amount: float
    tier: str
    metadata: Dict[str, Any]

@dataclass
class CohortAnalysis:
    """Cohort analysis results"""
    cohort_id: str
    cohort_type: CohortType
    period_start: str
    initial_size: int
    revenue_by_period: List[float]
    retention_by_period: List[float]
    ltv_projection: float

class RevenueAnalytics:
    """
    Comprehensive revenue analytics for WIRTHFORGE business intelligence
    Privacy-preserving analytics with local-first data processing
    """
    
    def __init__(self, db_path: str = "revenue_analytics.db"):
        self.db_path = db_path
        self.lock = threading.Lock()
        self._initialize_database()
        
        # Analytics configuration
        self.cohort_periods = 24  # Track cohorts for 24 months
        self.forecasting_horizon = 12  # 12-month forecasting
        
        # Revenue stream weights for analysis
        self.stream_weights = {
            RevenueStream.SUBSCRIPTION: 0.70,  # Primary revenue
            RevenueStream.ENERGY_BILLING: 0.20,  # Secondary revenue
            RevenueStream.MARKETPLACE: 0.08,  # Growth revenue
            RevenueStream.PROFESSIONAL_SERVICES: 0.02  # Premium revenue
        }
    
    def _initialize_database(self):
        """Initialize database for revenue analytics"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS revenue_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_id TEXT UNIQUE NOT NULL,
                    user_id TEXT NOT NULL,
                    timestamp REAL NOT NULL,
                    stream TEXT NOT NULL,
                    amount REAL NOT NULL,
                    tier TEXT NOT NULL,
                    metadata TEXT,
                    created_at REAL DEFAULT (julianday('now'))
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS user_cohorts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    cohort_type TEXT NOT NULL,
                    cohort_id TEXT NOT NULL,
                    signup_date REAL NOT NULL,
                    initial_tier TEXT NOT NULL,
                    acquisition_channel TEXT,
                    geographic_region TEXT,
                    created_at REAL DEFAULT (julianday('now'))
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS revenue_forecasts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    forecast_id TEXT UNIQUE NOT NULL,
                    period_start REAL NOT NULL,
                    period_end REAL NOT NULL,
                    stream TEXT NOT NULL,
                    predicted_amount REAL NOT NULL,
                    confidence_interval TEXT NOT NULL,
                    model_type TEXT NOT NULL,
                    created_at REAL DEFAULT (julianday('now'))
                )
            """)
            
            # Indexes for performance
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_revenue_user_time 
                ON revenue_events(user_id, timestamp)
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_revenue_stream_time 
                ON revenue_events(stream, timestamp)
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_cohorts_type_id 
                ON user_cohorts(cohort_type, cohort_id)
            """)
    
    def record_revenue_event(self, event: RevenueEvent):
        """Record a revenue event for analytics"""
        with self.lock:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO revenue_events (
                        event_id, user_id, timestamp, stream, amount, tier, metadata
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    event.event_id,
                    event.user_id,
                    event.timestamp,
                    event.stream.value,
                    event.amount,
                    event.tier,
                    json.dumps(event.metadata)
                ))
    
    def assign_user_to_cohort(
        self, 
        user_id: str, 
        signup_date: float,
        initial_tier: str,
        acquisition_channel: str = "unknown",
        geographic_region: str = "unknown"
    ):
        """Assign user to cohorts for analysis"""
        signup_dt = datetime.fromtimestamp(signup_date)
        
        cohorts = [
            {
                "cohort_type": CohortType.SIGNUP_MONTH.value,
                "cohort_id": signup_dt.strftime("%Y-%m"),
            },
            {
                "cohort_type": CohortType.TIER_TYPE.value,
                "cohort_id": initial_tier,
            },
            {
                "cohort_type": CohortType.ACQUISITION_CHANNEL.value,
                "cohort_id": acquisition_channel,
            },
            {
                "cohort_type": CohortType.GEOGRAPHIC_REGION.value,
                "cohort_id": geographic_region,
            }
        ]
        
        with sqlite3.connect(self.db_path) as conn:
            for cohort in cohorts:
                conn.execute("""
                    INSERT OR REPLACE INTO user_cohorts (
                        user_id, cohort_type, cohort_id, signup_date,
                        initial_tier, acquisition_channel, geographic_region
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    user_id,
                    cohort["cohort_type"],
                    cohort["cohort_id"],
                    signup_date,
                    initial_tier,
                    acquisition_channel,
                    geographic_region
                ))
    
    def calculate_mrr(self, end_date: Optional[float] = None) -> Dict[str, float]:
        """Calculate Monthly Recurring Revenue (MRR)"""
        if end_date is None:
            end_date = datetime.now().timestamp()
        
        # Get last 30 days of subscription revenue
        start_date = end_date - (30 * 24 * 3600)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT SUM(amount) as total_revenue
                FROM revenue_events
                WHERE stream = ? AND timestamp BETWEEN ? AND ?
            """, (RevenueStream.SUBSCRIPTION.value, start_date, end_date))
            
            monthly_subscription = cursor.fetchone()[0] or 0
            
            # Get MRR by tier
            cursor = conn.execute("""
                SELECT tier, SUM(amount) as tier_revenue
                FROM revenue_events
                WHERE stream = ? AND timestamp BETWEEN ? AND ?
                GROUP BY tier
            """, (RevenueStream.SUBSCRIPTION.value, start_date, end_date))
            
            mrr_by_tier = {row[0]: row[1] for row in cursor.fetchall()}
        
        return {
            "total_mrr": monthly_subscription,
            "mrr_by_tier": mrr_by_tier,
            "calculation_period": {"start": start_date, "end": end_date}
        }
    
    def calculate_arr(self, end_date: Optional[float] = None) -> Dict[str, float]:
        """Calculate Annual Recurring Revenue (ARR)"""
        mrr_data = self.calculate_mrr(end_date)
        
        return {
            "total_arr": mrr_data["total_mrr"] * 12,
            "arr_by_tier": {tier: revenue * 12 for tier, revenue in mrr_data["mrr_by_tier"].items()},
            "based_on_mrr": mrr_data["total_mrr"]
        }
    
    def analyze_revenue_growth(self, months: int = 12) -> Dict[str, Any]:
        """Analyze revenue growth trends"""
        end_time = datetime.now().timestamp()
        
        monthly_data = []
        
        for i in range(months):
            month_end = end_time - (i * 30 * 24 * 3600)
            month_start = month_end - (30 * 24 * 3600)
            
            with sqlite3.connect(self.db_path) as conn:
                # Total revenue for the month
                cursor = conn.execute("""
                    SELECT stream, SUM(amount) as stream_revenue
                    FROM revenue_events
                    WHERE timestamp BETWEEN ? AND ?
                    GROUP BY stream
                """, (month_start, month_end))
                
                stream_revenues = {row[0]: row[1] for row in cursor.fetchall()}
                total_revenue = sum(stream_revenues.values())
                
                # New vs existing customer revenue
                cursor = conn.execute("""
                    SELECT 
                        CASE 
                            WHEN MIN(timestamp) BETWEEN ? AND ? THEN 'new'
                            ELSE 'existing'
                        END as customer_type,
                        SUM(amount) as revenue
                    FROM revenue_events
                    WHERE timestamp BETWEEN ? AND ?
                    GROUP BY user_id, customer_type
                """, (month_start, month_end, month_start, month_end))
                
                customer_revenue = defaultdict(float)
                for row in cursor.fetchall():
                    customer_revenue[row[0]] += row[1]
            
            monthly_data.append({
                "month": datetime.fromtimestamp(month_end).strftime("%Y-%m"),
                "total_revenue": total_revenue,
                "stream_breakdown": stream_revenues,
                "new_customer_revenue": customer_revenue.get("new", 0),
                "existing_customer_revenue": customer_revenue.get("existing", 0)
            })
        
        # Calculate growth rates
        monthly_data.reverse()  # Chronological order
        
        for i in range(1, len(monthly_data)):
            current = monthly_data[i]["total_revenue"]
            previous = monthly_data[i-1]["total_revenue"]
            
            if previous > 0:
                growth_rate = ((current - previous) / previous) * 100
                monthly_data[i]["month_over_month_growth"] = growth_rate
            else:
                monthly_data[i]["month_over_month_growth"] = 0
        
        # Calculate compound monthly growth rate
        if len(monthly_data) >= 2:
            first_month = monthly_data[0]["total_revenue"]
            last_month = monthly_data[-1]["total_revenue"]
            
            if first_month > 0:
                cmgr = (pow(last_month / first_month, 1 / (len(monthly_data) - 1)) - 1) * 100
            else:
                cmgr = 0
        else:
            cmgr = 0
        
        return {
            "monthly_data": monthly_data,
            "compound_monthly_growth_rate": cmgr,
            "total_growth_period": f"{months} months",
            "revenue_streams": list(RevenueStream),
            "analysis_date": datetime.now().isoformat()
        }
    
    def perform_cohort_analysis(self, cohort_type: CohortType, months: int = 12) -> List[CohortAnalysis]:
        """Perform cohort analysis for revenue and retention"""
        with sqlite3.connect(self.db_path) as conn:
            # Get all cohorts of the specified type
            cursor = conn.execute("""
                SELECT DISTINCT cohort_id, MIN(signup_date) as cohort_start
                FROM user_cohorts
                WHERE cohort_type = ?
                GROUP BY cohort_id
                ORDER BY cohort_start
            """, (cohort_type.value,))
            
            cohorts = cursor.fetchall()
        
        cohort_analyses = []
        
        for cohort_id, cohort_start in cohorts:
            # Get cohort users
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute("""
                    SELECT user_id FROM user_cohorts
                    WHERE cohort_type = ? AND cohort_id = ?
                """, (cohort_type.value, cohort_id))
                
                cohort_users = [row[0] for row in cursor.fetchall()]
            
            initial_size = len(cohort_users)
            if initial_size == 0:
                continue
            
            revenue_by_period = []
            retention_by_period = []
            
            for month in range(months):
                period_start = cohort_start + (month * 30 * 24 * 3600)
                period_end = period_start + (30 * 24 * 3600)
                
                # Calculate revenue for this period
                with sqlite3.connect(self.db_path) as conn:
                    placeholders = ','.join(['?'] * len(cohort_users))
                    cursor = conn.execute(f"""
                        SELECT SUM(amount) as period_revenue
                        FROM revenue_events
                        WHERE user_id IN ({placeholders})
                        AND timestamp BETWEEN ? AND ?
                    """, cohort_users + [period_start, period_end])
                    
                    period_revenue = cursor.fetchone()[0] or 0
                    revenue_by_period.append(period_revenue)
                    
                    # Calculate retention (users with revenue in this period)
                    cursor = conn.execute(f"""
                        SELECT COUNT(DISTINCT user_id) as active_users
                        FROM revenue_events
                        WHERE user_id IN ({placeholders})
                        AND timestamp BETWEEN ? AND ?
                    """, cohort_users + [period_start, period_end])
                    
                    active_users = cursor.fetchone()[0] or 0
                    retention_rate = active_users / initial_size if initial_size > 0 else 0
                    retention_by_period.append(retention_rate)
            
            # Calculate LTV projection
            total_revenue = sum(revenue_by_period)
            avg_monthly_revenue = total_revenue / months if months > 0 else 0
            
            # Simple LTV projection (could be enhanced with churn modeling)
            if retention_by_period:
                avg_retention = sum(retention_by_period) / len(retention_by_period)
                ltv_projection = avg_monthly_revenue / (1 - avg_retention) if avg_retention < 1 else avg_monthly_revenue * 24
            else:
                ltv_projection = 0
            
            cohort_analysis = CohortAnalysis(
                cohort_id=cohort_id,
                cohort_type=cohort_type,
                period_start=datetime.fromtimestamp(cohort_start).strftime("%Y-%m"),
                initial_size=initial_size,
                revenue_by_period=revenue_by_period,
                retention_by_period=retention_by_period,
                ltv_projection=ltv_projection
            )
            
            cohort_analyses.append(cohort_analysis)
        
        return cohort_analyses
    
    def calculate_customer_ltv(self, user_id: str) -> Dict[str, float]:
        """Calculate Customer Lifetime Value for a specific user"""
        with sqlite3.connect(self.db_path) as conn:
            # Get user's revenue history
            cursor = conn.execute("""
                SELECT timestamp, amount, stream
                FROM revenue_events
                WHERE user_id = ?
                ORDER BY timestamp
            """, (user_id,))
            
            revenue_history = cursor.fetchall()
            
            # Get user's cohort information
            cursor = conn.execute("""
                SELECT signup_date, initial_tier
                FROM user_cohorts
                WHERE user_id = ? AND cohort_type = ?
                LIMIT 1
            """, (user_id, CohortType.SIGNUP_MONTH.value))
            
            user_info = cursor.fetchone()
        
        if not revenue_history or not user_info:
            return {"ltv": 0, "total_revenue": 0, "months_active": 0}
        
        signup_date, initial_tier = user_info
        total_revenue = sum(amount for _, amount, _ in revenue_history)
        
        # Calculate months active
        first_transaction = revenue_history[0][0]
        last_transaction = revenue_history[-1][0]
        months_active = (last_transaction - first_transaction) / (30 * 24 * 3600)
        
        # Calculate average monthly revenue
        avg_monthly_revenue = total_revenue / max(months_active, 1)
        
        # Estimate remaining lifetime (simplified model)
        # Based on tier and historical patterns
        tier_multipliers = {"free": 6, "personal": 18, "professional": 36, "enterprise": 60}
        estimated_remaining_months = tier_multipliers.get(initial_tier, 12)
        
        # LTV calculation
        ltv = total_revenue + (avg_monthly_revenue * estimated_remaining_months)
        
        return {
            "ltv": ltv,
            "total_revenue": total_revenue,
            "months_active": months_active,
            "avg_monthly_revenue": avg_monthly_revenue,
            "estimated_remaining_months": estimated_remaining_months,
            "revenue_by_stream": {
                stream: sum(amount for _, amount, s in revenue_history if s == stream)
                for stream in set(s for _, _, s in revenue_history)
            }
        }
    
    def forecast_revenue(self, months: int = 12) -> Dict[str, Any]:
        """Forecast revenue using trend analysis"""
        # Get historical data for forecasting
        growth_analysis = self.analyze_revenue_growth(months * 2)  # Use 2x period for better trend
        monthly_data = growth_analysis["monthly_data"]
        
        if len(monthly_data) < 3:
            return {"error": "Insufficient historical data for forecasting"}
        
        # Simple linear trend forecasting for each stream
        forecasts = {}
        
        for stream in RevenueStream:
            stream_values = []
            for month_data in monthly_data[-months:]:  # Use last N months
                stream_revenue = month_data["stream_breakdown"].get(stream.value, 0)
                stream_values.append(stream_revenue)
            
            if len(stream_values) >= 2:
                # Linear regression for trend
                x = np.arange(len(stream_values))
                y = np.array(stream_values)
                
                if np.sum(y) > 0:  # Only forecast if there's revenue
                    slope, intercept = np.polyfit(x, y, 1)
                    
                    # Forecast next months
                    future_months = []
                    for i in range(1, months + 1):
                        future_x = len(stream_values) + i
                        predicted_value = max(0, slope * future_x + intercept)  # No negative revenue
                        future_months.append(predicted_value)
                    
                    forecasts[stream.value] = {
                        "historical_trend": slope,
                        "forecast_values": future_months,
                        "confidence": "medium" if slope > 0 else "low"
                    }
        
        # Aggregate forecasts
        total_forecast = []
        for i in range(months):
            month_total = sum(
                forecasts.get(stream.value, {}).get("forecast_values", [0] * months)[i]
                for stream in RevenueStream
            )
            total_forecast.append(month_total)
        
        # Calculate forecast metrics
        current_mrr = self.calculate_mrr()["total_mrr"]
        forecasted_arr = sum(total_forecast)
        
        return {
            "forecast_period_months": months,
            "current_mrr": current_mrr,
            "forecasted_arr": forecasted_arr,
            "monthly_forecast": total_forecast,
            "stream_forecasts": forecasts,
            "growth_assumptions": {
                "based_on_historical_trend": True,
                "confidence_level": "medium",
                "factors_considered": ["historical_growth", "stream_performance", "trend_analysis"]
            },
            "forecast_generated": datetime.now().isoformat()
        }
    
    def generate_revenue_dashboard(self) -> Dict[str, Any]:
        """Generate comprehensive revenue analytics dashboard"""
        # Current metrics
        mrr = self.calculate_mrr()
        arr = self.calculate_arr()
        growth = self.analyze_revenue_growth(6)
        
        # Cohort analysis
        signup_cohorts = self.perform_cohort_analysis(CohortType.SIGNUP_MONTH, 12)
        tier_cohorts = self.perform_cohort_analysis(CohortType.TIER_TYPE, 12)
        
        # Revenue forecast
        forecast = self.forecast_revenue(12)
        
        # Key insights
        insights = []
        
        if growth["compound_monthly_growth_rate"] > 10:
            insights.append("Strong revenue growth momentum")
        elif growth["compound_monthly_growth_rate"] < 0:
            insights.append("Revenue declining - investigate churn and acquisition")
        
        if len(signup_cohorts) > 0:
            latest_cohort = signup_cohorts[-1]
            if latest_cohort.ltv_projection > 100:
                insights.append("Healthy customer lifetime value")
            else:
                insights.append("Low LTV - focus on retention and upselling")
        
        dashboard = {
            "generated_at": datetime.now().isoformat(),
            "key_metrics": {
                "mrr": mrr["total_mrr"],
                "arr": arr["total_arr"],
                "growth_rate": growth["compound_monthly_growth_rate"],
                "revenue_streams": len([s for s in RevenueStream])
            },
            "revenue_breakdown": mrr["mrr_by_tier"],
            "growth_analysis": {
                "monthly_growth": growth["compound_monthly_growth_rate"],
                "recent_months": growth["monthly_data"][-3:],  # Last 3 months
                "trend": "growing" if growth["compound_monthly_growth_rate"] > 0 else "declining"
            },
            "cohort_insights": {
                "total_cohorts": len(signup_cohorts),
                "avg_ltv": np.mean([c.ltv_projection for c in signup_cohorts]) if signup_cohorts else 0,
                "best_performing_cohort": max(signup_cohorts, key=lambda c: c.ltv_projection).cohort_id if signup_cohorts else None
            },
            "forecast": {
                "next_12_months_arr": forecast.get("forecasted_arr", 0),
                "confidence": forecast.get("growth_assumptions", {}).get("confidence_level", "unknown")
            },
            "insights": insights,
            "recommendations": self._generate_revenue_recommendations(mrr, growth, signup_cohorts)
        }
        
        return dashboard
    
    def _generate_revenue_recommendations(self, mrr: Dict, growth: Dict, cohorts: List[CohortAnalysis]) -> List[str]:
        """Generate actionable revenue recommendations"""
        recommendations = []
        
        # Growth recommendations
        if growth["compound_monthly_growth_rate"] < 5:
            recommendations.append("Increase marketing spend and improve conversion funnel")
        
        # MRR recommendations
        if mrr["total_mrr"] < 10000:
            recommendations.append("Focus on acquiring higher-tier customers")
        
        # Cohort recommendations
        if cohorts:
            avg_ltv = np.mean([c.ltv_projection for c in cohorts])
            if avg_ltv < 200:
                recommendations.append("Implement retention programs and reduce churn")
        
        # Stream diversification
        tier_distribution = mrr["mrr_by_tier"]
        if len(tier_distribution) < 3:
            recommendations.append("Develop pricing tiers to capture more market segments")
        
        return recommendations

def main():
    """Example usage of revenue analytics"""
    analytics = RevenueAnalytics()
    
    # Simulate some revenue events
    now = time.time()
    
    # Subscription revenue
    subscription_event = RevenueEvent(
        event_id="rev_001",
        user_id="user_001",
        timestamp=now,
        stream=RevenueStream.SUBSCRIPTION,
        amount=29.99,
        tier="professional",
        metadata={"billing_cycle": "monthly"}
    )
    analytics.record_revenue_event(subscription_event)
    
    # Energy billing revenue
    energy_event = RevenueEvent(
        event_id="rev_002",
        user_id="user_001",
        timestamp=now,
        stream=RevenueStream.ENERGY_BILLING,
        amount=5.50,
        tier="professional",
        metadata={"kwh_consumed": 3.2, "rate": 0.18}
    )
    analytics.record_revenue_event(energy_event)
    
    # Assign user to cohorts
    analytics.assign_user_to_cohort(
        "user_001",
        now - (30 * 24 * 3600),  # Signed up 30 days ago
        "professional",
        "organic_search",
        "north_america"
    )
    
    # Generate dashboard
    dashboard = analytics.generate_revenue_dashboard()
    print("Revenue Analytics Dashboard:")
    print(json.dumps(dashboard, indent=2))
    
    # Calculate MRR
    mrr = analytics.calculate_mrr()
    print(f"\nCurrent MRR: ${mrr['total_mrr']:.2f}")

if __name__ == "__main__":
    import time
    main()
