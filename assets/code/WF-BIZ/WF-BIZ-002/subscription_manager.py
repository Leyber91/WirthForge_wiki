#!/usr/bin/env python3
"""
WF-BIZ-002 Subscription Manager
Local-first subscription management with tier transitions and lifecycle automation
"""

import json
import sqlite3
import uuid
import time
from enum import Enum
from dataclasses import dataclass
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta

class SubscriptionStatus(Enum):
    ACTIVE = "active"
    PENDING = "pending"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    TRIAL = "trial"
    GRACE_PERIOD = "grace_period"

class TierType(Enum):
    FREE = "free"
    PERSONAL = "personal"
    PROFESSIONAL = "professional"
    TEAM = "team"
    ENTERPRISE = "enterprise"

class ChangeReason(Enum):
    USER_UPGRADE = "user_upgrade"
    USER_DOWNGRADE = "user_downgrade"
    AUTOMATIC_UPGRADE = "automatic_upgrade"
    PAYMENT_FAILURE = "payment_failure"
    TRIAL_EXPIRED = "trial_expired"
    ADMIN_ACTION = "admin_action"

@dataclass
class SubscriptionTier:
    tier_id: str
    name: str
    tier_type: TierType
    monthly_price: float
    quarterly_price: float
    annual_price: float
    energy_allocation_eu: float
    features: List[str]
    limits: Dict[str, Any]

@dataclass
class Subscription:
    subscription_id: str
    user_id: str
    tier: TierType
    status: SubscriptionStatus
    billing_cycle: str
    current_period_start: datetime
    current_period_end: datetime
    trial_end: Optional[datetime]
    cancelled_at: Optional[datetime]
    metadata: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

class SubscriptionManager:
    """Main subscription management system"""
    
    def __init__(self, db_path: str = "subscription_manager.db", 
                 config_path: str = "subscription_config.json"):
        self.db_path = db_path
        self.config_path = config_path
        self.config = self._load_subscription_config()
        self.tiers = self._load_tier_definitions()
        self._initialize_database()
    
    def _load_subscription_config(self) -> Dict[str, Any]:
        """Load subscription configuration"""
        default_config = {
            "trial_period_days": 14,
            "grace_period_days": 7,
            "proration_enabled": True,
            "auto_upgrade_enabled": True,
            "usage_alert_thresholds": [50, 75, 90, 100],
            "billing_cycles": ["monthly", "quarterly", "annually"],
            "currency": "EUR",
            "cancellation_policy": {
                "immediate": False,
                "end_of_period": True,
                "refund_eligible_days": 30
            }
        }
        
        try:
            with open(self.config_path, 'r') as f:
                config = json.load(f)
                for key, value in default_config.items():
                    if key not in config:
                        config[key] = value
                return config
        except FileNotFoundError:
            with open(self.config_path, 'w') as f:
                json.dump(default_config, f, indent=2)
            return default_config
    
    def _load_tier_definitions(self) -> Dict[TierType, SubscriptionTier]:
        """Load subscription tier definitions"""
        tiers = {
            TierType.FREE: SubscriptionTier(
                tier_id="free", name="Free", tier_type=TierType.FREE,
                monthly_price=0.00, quarterly_price=0.00, annual_price=0.00,
                energy_allocation_eu=1000.0,
                features=["basic_ai", "local_processing", "community_support"],
                limits={"max_models": 3, "max_sessions_per_day": 10}
            ),
            TierType.PERSONAL: SubscriptionTier(
                tier_id="personal", name="Personal", tier_type=TierType.PERSONAL,
                monthly_price=9.42, quarterly_price=25.33, annual_price=84.78,
                energy_allocation_eu=10000.0,
                features=["advanced_ai", "priority_processing", "email_support"],
                limits={"max_models": 10, "max_sessions_per_day": 50}
            ),
            TierType.PROFESSIONAL: SubscriptionTier(
                tier_id="professional", name="Professional", tier_type=TierType.PROFESSIONAL,
                monthly_price=29.42, quarterly_price=79.33, annual_price=264.78,
                energy_allocation_eu=50000.0,
                features=["premium_ai", "batch_processing", "api_access"],
                limits={"max_models": 50, "max_sessions_per_day": 200}
            ),
            TierType.TEAM: SubscriptionTier(
                tier_id="team", name="Team", tier_type=TierType.TEAM,
                monthly_price=99.42, quarterly_price=268.33, annual_price=894.78,
                energy_allocation_eu=200000.0,
                features=["team_collaboration", "shared_models", "admin_dashboard"],
                limits={"max_models": 200, "max_sessions_per_day": 1000}
            ),
            TierType.ENTERPRISE: SubscriptionTier(
                tier_id="enterprise", name="Enterprise", tier_type=TierType.ENTERPRISE,
                monthly_price=299.42, quarterly_price=808.33, annual_price=2694.78,
                energy_allocation_eu=1000000.0,
                features=["unlimited_ai", "custom_models", "sla_guarantee"],
                limits={"max_models": -1, "max_sessions_per_day": -1}
            )
        }
        return tiers
    
    def _initialize_database(self):
        """Initialize subscription database tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS subscriptions (
                subscription_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL UNIQUE,
                tier TEXT NOT NULL,
                status TEXT NOT NULL,
                billing_cycle TEXT NOT NULL,
                current_period_start REAL NOT NULL,
                current_period_end REAL NOT NULL,
                trial_end REAL,
                cancelled_at REAL,
                metadata TEXT,
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS subscription_changes (
                change_id TEXT PRIMARY KEY,
                subscription_id TEXT NOT NULL,
                from_tier TEXT NOT NULL,
                to_tier TEXT NOT NULL,
                reason TEXT NOT NULL,
                effective_date REAL NOT NULL,
                proration_amount REAL DEFAULT 0,
                metadata TEXT,
                created_at REAL NOT NULL
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS usage_alerts (
                alert_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                alert_type TEXT NOT NULL,
                threshold_percentage REAL NOT NULL,
                current_usage REAL NOT NULL,
                allocation REAL NOT NULL,
                triggered_at REAL NOT NULL,
                acknowledged BOOLEAN DEFAULT FALSE
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def create_subscription(self, user_id: str, tier: TierType, 
                           billing_cycle: str = "monthly",
                           trial_enabled: bool = True) -> str:
        """Create new subscription"""
        subscription_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        # Calculate period dates
        if billing_cycle == "monthly":
            period_end = now + timedelta(days=30)
        elif billing_cycle == "quarterly":
            period_end = now + timedelta(days=90)
        else:  # annually
            period_end = now + timedelta(days=365)
        
        # Set trial end if enabled and not free tier
        trial_end = None
        status = SubscriptionStatus.ACTIVE
        if trial_enabled and tier != TierType.FREE:
            trial_end = now + timedelta(days=self.config["trial_period_days"])
            status = SubscriptionStatus.TRIAL
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO subscriptions 
            (subscription_id, user_id, tier, status, billing_cycle,
             current_period_start, current_period_end, trial_end,
             cancelled_at, metadata, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            subscription_id, user_id, tier.value, status.value, billing_cycle,
            now.timestamp(), period_end.timestamp(),
            trial_end.timestamp() if trial_end else None,
            None, json.dumps({}), now.timestamp(), now.timestamp()
        ))
        
        conn.commit()
        conn.close()
        
        return subscription_id
    
    def get_subscription(self, user_id: str) -> Optional[Subscription]:
        """Get user's current subscription"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM subscriptions WHERE user_id = ?', (user_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return Subscription(
                subscription_id=row[0], user_id=row[1], tier=TierType(row[2]),
                status=SubscriptionStatus(row[3]), billing_cycle=row[4],
                current_period_start=datetime.fromtimestamp(row[5], tz=timezone.utc),
                current_period_end=datetime.fromtimestamp(row[6], tz=timezone.utc),
                trial_end=datetime.fromtimestamp(row[7], tz=timezone.utc) if row[7] else None,
                cancelled_at=datetime.fromtimestamp(row[8], tz=timezone.utc) if row[8] else None,
                metadata=json.loads(row[9]) if row[9] else {},
                created_at=datetime.fromtimestamp(row[10], tz=timezone.utc),
                updated_at=datetime.fromtimestamp(row[11], tz=timezone.utc)
            )
        return None
    
    def change_tier(self, user_id: str, new_tier: TierType, 
                   reason: ChangeReason = ChangeReason.USER_UPGRADE,
                   effective_immediately: bool = True) -> Dict[str, Any]:
        """Change subscription tier"""
        subscription = self.get_subscription(user_id)
        if not subscription:
            raise ValueError("No subscription found for user")
        
        if subscription.tier == new_tier:
            return {"message": "Already on requested tier", "change_id": None}
        
        # Calculate proration if enabled
        proration_amount = 0.0
        if self.config["proration_enabled"] and effective_immediately:
            proration_amount = self._calculate_proration(subscription, new_tier)
        
        # Create change record
        change_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        effective_date = now if effective_immediately else subscription.current_period_end
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO subscription_changes 
            (change_id, subscription_id, from_tier, to_tier, reason,
             effective_date, proration_amount, metadata, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            change_id, subscription.subscription_id, subscription.tier.value,
            new_tier.value, reason.value, effective_date.timestamp(),
            proration_amount, json.dumps({}), now.timestamp()
        ))
        
        # Update subscription if effective immediately
        if effective_immediately:
            cursor.execute('''
                UPDATE subscriptions 
                SET tier = ?, updated_at = ?
                WHERE subscription_id = ?
            ''', (new_tier.value, now.timestamp(), subscription.subscription_id))
        
        conn.commit()
        conn.close()
        
        return {
            "change_id": change_id,
            "from_tier": subscription.tier.value,
            "to_tier": new_tier.value,
            "effective_date": effective_date.isoformat(),
            "proration_amount": proration_amount,
            "message": "Tier change processed successfully"
        }
    
    def cancel_subscription(self, user_id: str, immediate: bool = False) -> Dict[str, Any]:
        """Cancel subscription"""
        subscription = self.get_subscription(user_id)
        if not subscription:
            raise ValueError("No subscription found for user")
        
        if subscription.status == SubscriptionStatus.CANCELLED:
            return {"message": "Subscription already cancelled"}
        
        now = datetime.now(timezone.utc)
        cancellation_date = now if immediate else subscription.current_period_end
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if immediate:
            cursor.execute('''
                UPDATE subscriptions 
                SET status = ?, cancelled_at = ?, updated_at = ?
                WHERE subscription_id = ?
            ''', (
                SubscriptionStatus.CANCELLED.value, now.timestamp(),
                now.timestamp(), subscription.subscription_id
            ))
            message = "Subscription cancelled immediately"
        else:
            cursor.execute('''
                UPDATE subscriptions 
                SET cancelled_at = ?, updated_at = ?
                WHERE subscription_id = ?
            ''', (
                cancellation_date.timestamp(), now.timestamp(),
                subscription.subscription_id
            ))
            message = f"Subscription will cancel on {cancellation_date.strftime('%Y-%m-%d')}"
        
        conn.commit()
        conn.close()
        
        return {
            "cancelled_at": cancellation_date.isoformat(),
            "immediate": immediate,
            "message": message
        }
    
    def check_usage_alerts(self, user_id: str, current_usage_eu: float) -> List[Dict[str, Any]]:
        """Check and create usage alerts"""
        subscription = self.get_subscription(user_id)
        if not subscription:
            return []
        
        tier_config = self.tiers[subscription.tier]
        allocation = tier_config.energy_allocation_eu
        usage_percentage = (current_usage_eu / allocation) * 100
        
        alerts = []
        now = datetime.now(timezone.utc)
        
        # Check each threshold
        for threshold in self.config["usage_alert_thresholds"]:
            if usage_percentage >= threshold:
                if not self._alert_exists(user_id, threshold, now):
                    alert_id = str(uuid.uuid4())
                    
                    # Store alert
                    conn = sqlite3.connect(self.db_path)
                    cursor = conn.cursor()
                    
                    cursor.execute('''
                        INSERT INTO usage_alerts 
                        (alert_id, user_id, alert_type, threshold_percentage, 
                         current_usage, allocation, triggered_at, acknowledged)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        alert_id, user_id, f"usage_{threshold}", threshold,
                        current_usage_eu, allocation, now.timestamp(), False
                    ))
                    
                    conn.commit()
                    conn.close()
                    
                    alerts.append({
                        "alert_id": alert_id,
                        "alert_type": f"usage_{threshold}",
                        "threshold_percentage": threshold,
                        "current_usage": current_usage_eu,
                        "allocation": allocation,
                        "usage_percentage": usage_percentage
                    })
        
        return alerts
    
    def _calculate_proration(self, subscription: Subscription, new_tier: TierType) -> float:
        """Calculate proration amount for tier change"""
        old_tier_config = self.tiers[subscription.tier]
        new_tier_config = self.tiers[new_tier]
        
        # Get pricing based on billing cycle
        if subscription.billing_cycle == "monthly":
            old_price = old_tier_config.monthly_price
            new_price = new_tier_config.monthly_price
        elif subscription.billing_cycle == "quarterly":
            old_price = old_tier_config.quarterly_price
            new_price = new_tier_config.quarterly_price
        else:  # annually
            old_price = old_tier_config.annual_price
            new_price = new_tier_config.annual_price
        
        # Calculate remaining days in period
        now = datetime.now(timezone.utc)
        total_days = (subscription.current_period_end - subscription.current_period_start).days
        remaining_days = (subscription.current_period_end - now).days
        
        if remaining_days <= 0:
            return 0.0
        
        # Calculate proration
        daily_old_rate = old_price / total_days
        daily_new_rate = new_price / total_days
        
        unused_credit = daily_old_rate * remaining_days
        new_charge = daily_new_rate * remaining_days
        
        return new_charge - unused_credit
    
    def _alert_exists(self, user_id: str, threshold: float, check_time: datetime) -> bool:
        """Check if alert already exists for threshold in current period"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        yesterday = check_time - timedelta(days=1)
        
        cursor.execute('''
            SELECT COUNT(*) FROM usage_alerts 
            WHERE user_id = ? AND threshold_percentage = ? AND triggered_at > ?
        ''', (user_id, threshold, yesterday.timestamp()))
        
        count = cursor.fetchone()[0]
        conn.close()
        
        return count > 0
    
    def get_tier_recommendations(self, user_id: str, usage_history: List[float]) -> Dict[str, Any]:
        """Get tier recommendations based on usage history"""
        if not usage_history:
            return {"recommendation": "current", "reason": "No usage history available"}
        
        subscription = self.get_subscription(user_id)
        if not subscription:
            return {"recommendation": "personal", "reason": "No subscription found"}
        
        current_tier = subscription.tier
        current_allocation = self.tiers[current_tier].energy_allocation_eu
        
        avg_usage = sum(usage_history) / len(usage_history)
        max_usage = max(usage_history)
        avg_usage_pct = (avg_usage / current_allocation) * 100
        max_usage_pct = (max_usage / current_allocation) * 100
        
        if max_usage_pct > 90 or avg_usage_pct > 80:
            tier_order = [TierType.FREE, TierType.PERSONAL, TierType.PROFESSIONAL, 
                         TierType.TEAM, TierType.ENTERPRISE]
            try:
                current_index = tier_order.index(current_tier)
                if current_index < len(tier_order) - 1:
                    next_tier = tier_order[current_index + 1]
                    return {
                        "recommendation": "upgrade",
                        "suggested_tier": next_tier.value,
                        "reason": f"High usage detected (avg: {avg_usage_pct:.1f}%, max: {max_usage_pct:.1f}%)",
                        "usage_headroom": self.tiers[next_tier].energy_allocation_eu - avg_usage
                    }
            except ValueError:
                pass
        
        elif avg_usage_pct < 30 and max_usage_pct < 50 and current_tier != TierType.FREE:
            tier_order = [TierType.FREE, TierType.PERSONAL, TierType.PROFESSIONAL, 
                         TierType.TEAM, TierType.ENTERPRISE]
            current_index = tier_order.index(current_tier)
            
            if current_index > 0:
                lower_tier = tier_order[current_index - 1]
                lower_allocation = self.tiers[lower_tier].energy_allocation_eu
                
                if max_usage <= lower_allocation * 0.8:
                    monthly_savings = (self.tiers[current_tier].monthly_price - 
                                     self.tiers[lower_tier].monthly_price)
                    
                    return {
                        "recommendation": "downgrade",
                        "suggested_tier": lower_tier.value,
                        "reason": f"Low usage detected (avg: {avg_usage_pct:.1f}%)",
                        "savings_potential": monthly_savings
                    }
        
        return {
            "recommendation": "current",
            "reason": f"Current tier is optimal (avg usage: {avg_usage_pct:.1f}%)"
        }

# Example usage
if __name__ == "__main__":
    manager = SubscriptionManager()
    
    # Create subscription
    sub_id = manager.create_subscription(
        user_id="test_user",
        tier=TierType.PERSONAL,
        billing_cycle="monthly",
        trial_enabled=True
    )
    
    # Get subscription
    subscription = manager.get_subscription("test_user")
    print(f"Created subscription: {subscription.tier.value} - {subscription.status.value}")
    
    # Check usage alerts
    alerts = manager.check_usage_alerts("test_user", 8500.0)  # 85% of 10k allocation
    print(f"Usage alerts: {len(alerts)}")
    
    # Get tier recommendations
    recommendations = manager.get_tier_recommendations("test_user", [8000, 8500, 9200, 9800])
    print(f"Recommendation: {recommendations['recommendation']}")
