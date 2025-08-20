#!/usr/bin/env python3
"""
WF-BIZ-002 Loyalty & Rewards Module
Local-first loyalty program with gamification and community recognition
"""

import json
import sqlite3
import uuid
import time
from enum import Enum
from dataclasses import dataclass
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta

class RewardType(Enum):
    ENERGY_BONUS = "energy_bonus"
    TIER_DISCOUNT = "tier_discount"
    EARLY_ACCESS = "early_access"
    MARKETPLACE_CREDIT = "marketplace_credit"
    COMMUNITY_BADGE = "community_badge"

class AchievementCategory(Enum):
    USAGE_MILESTONE = "usage_milestone"
    COMMUNITY_CONTRIBUTION = "community_contribution"
    REFERRAL_SUCCESS = "referral_success"
    ENERGY_EFFICIENCY = "energy_efficiency"

class BadgeLevel(Enum):
    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"

@dataclass
class Achievement:
    achievement_id: str
    name: str
    description: str
    category: AchievementCategory
    badge_level: BadgeLevel
    points_reward: int
    requirements: Dict[str, Any]

@dataclass
class Reward:
    reward_id: str
    name: str
    description: str
    reward_type: RewardType
    points_cost: int
    value: Dict[str, Any]
    usage_limit: Optional[int]

class LoyaltyEngine:
    """Main loyalty and rewards system"""
    
    def __init__(self, db_path: str = "loyalty_system.db"):
        self.db_path = db_path
        self.config = self._load_config()
        self.achievements = self._load_achievements()
        self.rewards = self._load_rewards()
        self._initialize_database()
    
    def _load_config(self) -> Dict[str, Any]:
        return {
            "points_per_euro_spent": 10,
            "points_per_referral": 500,
            "tier_thresholds": {
                "bronze": 0, "silver": 1000, "gold": 5000, "platinum": 15000
            },
            "tier_benefits": {
                "bronze": {"energy_bonus_percentage": 0},
                "silver": {"energy_bonus_percentage": 5},
                "gold": {"energy_bonus_percentage": 10},
                "platinum": {"energy_bonus_percentage": 15}
            }
        }
    
    def _load_achievements(self) -> Dict[str, Achievement]:
        return {
            "first_session": Achievement(
                achievement_id="first_session",
                name="First Steps",
                description="Complete your first AI session",
                category=AchievementCategory.USAGE_MILESTONE,
                badge_level=BadgeLevel.BRONZE,
                points_reward=100,
                requirements={"sessions_completed": 1}
            ),
            "energy_saver": Achievement(
                achievement_id="energy_saver",
                name="Energy Saver",
                description="Use 20% less energy than allocation",
                category=AchievementCategory.ENERGY_EFFICIENCY,
                badge_level=BadgeLevel.SILVER,
                points_reward=300,
                requirements={"efficiency_threshold": 0.8}
            ),
            "referral_champion": Achievement(
                achievement_id="referral_champion",
                name="Referral Champion",
                description="Successfully refer 5 users",
                category=AchievementCategory.REFERRAL_SUCCESS,
                badge_level=BadgeLevel.GOLD,
                points_reward=1000,
                requirements={"successful_referrals": 5}
            )
        }
    
    def _load_rewards(self) -> Dict[str, Reward]:
        return {
            "energy_boost": Reward(
                reward_id="energy_boost",
                name="Energy Boost",
                description="Get 1000 bonus energy units",
                reward_type=RewardType.ENERGY_BONUS,
                points_cost=200,
                value={"energy_units": 1000},
                usage_limit=5
            ),
            "tier_discount": Reward(
                reward_id="tier_discount",
                name="10% Tier Discount",
                description="Get 10% off next tier upgrade",
                reward_type=RewardType.TIER_DISCOUNT,
                points_cost=500,
                value={"discount_percentage": 10, "valid_days": 30},
                usage_limit=1
            ),
            "marketplace_credit": Reward(
                reward_id="marketplace_credit",
                name="Marketplace Credit",
                description="Get €5 credit for marketplace",
                reward_type=RewardType.MARKETPLACE_CREDIT,
                points_cost=750,
                value={"credit_amount": 5.00, "currency": "EUR"},
                usage_limit=3
            )
        }
    
    def _initialize_database(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS loyalty_points (
                user_id TEXT PRIMARY KEY,
                total_points INTEGER DEFAULT 0,
                available_points INTEGER DEFAULT 0,
                current_tier TEXT DEFAULT 'bronze',
                tier_progress REAL DEFAULT 0.0,
                last_activity REAL NOT NULL
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS points_transactions (
                transaction_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                points_change INTEGER NOT NULL,
                transaction_type TEXT NOT NULL,
                description TEXT,
                timestamp REAL NOT NULL
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_achievements (
                user_achievement_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                achievement_id TEXT NOT NULL,
                earned_at REAL NOT NULL,
                points_awarded INTEGER NOT NULL
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS reward_redemptions (
                redemption_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                reward_id TEXT NOT NULL,
                points_spent INTEGER NOT NULL,
                redeemed_at REAL NOT NULL,
                status TEXT DEFAULT 'active'
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def initialize_user_loyalty(self, user_id: str) -> str:
        """Initialize loyalty tracking for new user"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT user_id FROM loyalty_points WHERE user_id = ?', (user_id,))
        if cursor.fetchone():
            conn.close()
            return "User already initialized"
        
        now = time.time()
        welcome_points = 100
        
        cursor.execute('''
            INSERT INTO loyalty_points 
            (user_id, total_points, available_points, last_activity)
            VALUES (?, ?, ?, ?)
        ''', (user_id, welcome_points, welcome_points, now))
        
        cursor.execute('''
            INSERT INTO points_transactions 
            (transaction_id, user_id, points_change, transaction_type, description, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (str(uuid.uuid4()), user_id, welcome_points, "welcome_bonus", "Welcome to WIRTHFORGE!", now))
        
        conn.commit()
        conn.close()
        return "User loyalty initialized"
    
    def award_points(self, user_id: str, points: int, transaction_type: str, description: str) -> Dict[str, Any]:
        """Award points to user"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT total_points, available_points, current_tier
            FROM loyalty_points WHERE user_id = ?
        ''', (user_id,))
        
        result = cursor.fetchone()
        if not result:
            conn.close()
            raise ValueError("User not found")
        
        current_total, current_available, current_tier = result
        new_total = current_total + points
        new_available = current_available + points
        
        # Calculate tier
        new_tier = self._calculate_tier(new_total)
        tier_changed = new_tier != current_tier
        
        cursor.execute('''
            UPDATE loyalty_points 
            SET total_points = ?, available_points = ?, current_tier = ?, last_activity = ?
            WHERE user_id = ?
        ''', (new_total, new_available, new_tier, time.time(), user_id))
        
        cursor.execute('''
            INSERT INTO points_transactions 
            (transaction_id, user_id, points_change, transaction_type, description, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (str(uuid.uuid4()), user_id, points, transaction_type, description, time.time()))
        
        conn.commit()
        conn.close()
        
        return {
            "points_awarded": points,
            "new_total": new_total,
            "tier_changed": tier_changed,
            "new_tier": new_tier
        }
    
    def redeem_reward(self, user_id: str, reward_id: str) -> Dict[str, Any]:
        """Redeem reward with points"""
        if reward_id not in self.rewards:
            raise ValueError("Reward not found")
        
        reward = self.rewards[reward_id]
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT available_points FROM loyalty_points WHERE user_id = ?', (user_id,))
        result = cursor.fetchone()
        
        if not result or result[0] < reward.points_cost:
            conn.close()
            raise ValueError("Insufficient points")
        
        new_available = result[0] - reward.points_cost
        redemption_id = str(uuid.uuid4())
        now = time.time()
        
        cursor.execute('UPDATE loyalty_points SET available_points = ? WHERE user_id = ?', 
                      (new_available, user_id))
        
        cursor.execute('''
            INSERT INTO reward_redemptions 
            (redemption_id, user_id, reward_id, points_spent, redeemed_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (redemption_id, user_id, reward_id, reward.points_cost, now))
        
        cursor.execute('''
            INSERT INTO points_transactions 
            (transaction_id, user_id, points_change, transaction_type, description, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (str(uuid.uuid4()), user_id, -reward.points_cost, "reward_redemption", 
              f"Redeemed: {reward.name}", now))
        
        conn.commit()
        conn.close()
        
        return {
            "redemption_id": redemption_id,
            "reward_name": reward.name,
            "points_spent": reward.points_cost,
            "remaining_points": new_available,
            "reward_value": reward.value
        }
    
    def get_user_status(self, user_id: str) -> Dict[str, Any]:
        """Get user loyalty status"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM loyalty_points WHERE user_id = ?', (user_id,))
        loyalty_data = cursor.fetchone()
        
        if not loyalty_data:
            conn.close()
            return {"error": "User not found"}
        
        cursor.execute('''
            SELECT achievement_id, earned_at, points_awarded
            FROM user_achievements WHERE user_id = ?
            ORDER BY earned_at DESC LIMIT 5
        ''', (user_id,))
        
        achievements = []
        for row in cursor.fetchall():
            achievement = self.achievements.get(row[0])
            if achievement:
                achievements.append({
                    "name": achievement.name,
                    "description": achievement.description,
                    "badge_level": achievement.badge_level.value,
                    "points_awarded": row[2]
                })
        
        conn.close()
        
        user_id, total_points, available_points, current_tier, tier_progress, last_activity = loyalty_data
        
        return {
            "user_id": user_id,
            "total_points": total_points,
            "available_points": available_points,
            "current_tier": current_tier,
            "tier_benefits": self.config["tier_benefits"][current_tier],
            "recent_achievements": achievements,
            "available_rewards": [
                {"id": rid, "name": r.name, "cost": r.points_cost, "available": available_points >= r.points_cost}
                for rid, r in self.rewards.items()
            ]
        }
    
    def _calculate_tier(self, total_points: int) -> str:
        """Calculate user tier based on points"""
        for tier in ["platinum", "gold", "silver", "bronze"]:
            if total_points >= self.config["tier_thresholds"][tier]:
                return tier
        return "bronze"

# Example usage
if __name__ == "__main__":
    loyalty = LoyaltyEngine()
    
    # Initialize user
    loyalty.initialize_user_loyalty("test_user")
    
    # Award points
    result = loyalty.award_points("test_user", 250, "purchase", "Monthly subscription")
    print(f"Points awarded: {result}")
    
    # Get status
    status = loyalty.get_user_status("test_user")
    print(f"User status: {status}")
    
    # Redeem reward
    redemption = loyalty.redeem_reward("test_user", "energy_boost")
    print(f"Reward redeemed: {redemption}")
