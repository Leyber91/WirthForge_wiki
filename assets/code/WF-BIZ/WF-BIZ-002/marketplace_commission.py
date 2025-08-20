#!/usr/bin/env python3
"""
WF-BIZ-002 Marketplace Commission System
Local-first marketplace commission tracking and revenue distribution
"""

import json
import sqlite3
import uuid
import time
from enum import Enum
from dataclasses import dataclass
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timezone, timedelta
import hashlib

class TransactionType(Enum):
    PLUGIN_SALE = "plugin_sale"
    MODEL_SALE = "model_sale"
    TEMPLATE_SALE = "template_sale"
    SUBSCRIPTION_REFERRAL = "subscription_referral"
    ENERGY_CREDIT_PURCHASE = "energy_credit_purchase"
    PREMIUM_FEATURE = "premium_feature"

class CommissionStatus(Enum):
    PENDING = "pending"
    CALCULATED = "calculated"
    PAID = "paid"
    DISPUTED = "disputed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"

class PayoutStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class MarketplaceTransaction:
    """Marketplace transaction record"""
    transaction_id: str
    buyer_id: str
    seller_id: str
    item_id: str
    item_type: TransactionType
    gross_amount: float
    currency: str
    platform_fee_rate: float
    seller_fee_rate: float
    payment_processor_fee: float
    net_seller_amount: float
    platform_commission: float
    timestamp: datetime
    metadata: Dict[str, Any]

@dataclass
class CommissionRule:
    """Commission calculation rule"""
    rule_id: str
    item_type: TransactionType
    tier_type: str
    platform_fee_percentage: float
    seller_fee_percentage: float
    minimum_payout: float
    maximum_commission_cap: Optional[float]
    volume_discounts: List[Dict[str, Any]]
    effective_date: datetime
    expires_date: Optional[datetime]

@dataclass
class SellerPayout:
    """Seller payout record"""
    payout_id: str
    seller_id: str
    period_start: datetime
    period_end: datetime
    gross_sales: float
    total_fees: float
    net_amount: float
    transaction_count: int
    status: PayoutStatus
    payment_method: str
    processed_at: Optional[datetime]
    metadata: Dict[str, Any]

class MarketplaceCommissionEngine:
    """Marketplace commission calculation and tracking system"""
    
    def __init__(self, db_path: str = "marketplace_commission.db", 
                 config_path: str = "marketplace_config.json"):
        self.db_path = db_path
        self.config_path = config_path
        self.config = self._load_marketplace_config()
        self.commission_rules = self._load_commission_rules()
        self._initialize_database()
    
    def _load_marketplace_config(self) -> Dict[str, Any]:
        """Load marketplace configuration"""
        default_config = {
            "currency": "EUR",
            "payout_schedule": "monthly",  # weekly, monthly, quarterly
            "minimum_payout_amount": 10.00,
            "payout_processing_days": 7,
            "dispute_resolution_days": 30,
            "refund_policy_days": 14,
            "supported_payment_methods": ["bank_transfer", "paypal", "stripe"],
            "tax_handling": {
                "collect_tax_info": True,
                "issue_1099": True,
                "withhold_taxes": False
            },
            "analytics": {
                "track_conversion_rates": True,
                "track_seller_performance": True,
                "generate_insights": True
            },
            "privacy": {
                "anonymize_buyer_data": True,
                "retention_days": 2555,  # 7 years
                "gdpr_compliant": True
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
    
    def _load_commission_rules(self) -> Dict[str, CommissionRule]:
        """Load commission calculation rules"""
        rules = {}
        
        # Plugin sales
        rules["plugin_free"] = CommissionRule(
            rule_id="plugin_free",
            item_type=TransactionType.PLUGIN_SALE,
            tier_type="free",
            platform_fee_percentage=30.0,  # Standard app store rate
            seller_fee_percentage=0.0,
            minimum_payout=10.00,
            maximum_commission_cap=None,
            volume_discounts=[
                {"threshold": 1000, "discount_percentage": 5.0},
                {"threshold": 10000, "discount_percentage": 10.0}
            ],
            effective_date=datetime.now(timezone.utc),
            expires_date=None
        )
        
        rules["plugin_verified"] = CommissionRule(
            rule_id="plugin_verified",
            item_type=TransactionType.PLUGIN_SALE,
            tier_type="verified",
            platform_fee_percentage=25.0,  # Reduced rate for verified sellers
            seller_fee_percentage=0.0,
            minimum_payout=10.00,
            maximum_commission_cap=None,
            volume_discounts=[
                {"threshold": 500, "discount_percentage": 5.0},
                {"threshold": 5000, "discount_percentage": 10.0}
            ],
            effective_date=datetime.now(timezone.utc),
            expires_date=None
        )
        
        # Model sales
        rules["model_standard"] = CommissionRule(
            rule_id="model_standard",
            item_type=TransactionType.MODEL_SALE,
            tier_type="standard",
            platform_fee_percentage=20.0,  # Lower rate for AI models
            seller_fee_percentage=0.0,
            minimum_payout=25.00,
            maximum_commission_cap=None,
            volume_discounts=[
                {"threshold": 2000, "discount_percentage": 5.0},
                {"threshold": 20000, "discount_percentage": 15.0}
            ],
            effective_date=datetime.now(timezone.utc),
            expires_date=None
        )
        
        # Energy credits
        rules["energy_credits"] = CommissionRule(
            rule_id="energy_credits",
            item_type=TransactionType.ENERGY_CREDIT_PURCHASE,
            tier_type="standard",
            platform_fee_percentage=5.0,  # Low margin on energy
            seller_fee_percentage=0.0,
            minimum_payout=5.00,
            maximum_commission_cap=None,
            volume_discounts=[],
            effective_date=datetime.now(timezone.utc),
            expires_date=None
        )
        
        return rules
    
    def _initialize_database(self):
        """Initialize marketplace database tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Marketplace transactions
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS marketplace_transactions (
                transaction_id TEXT PRIMARY KEY,
                buyer_id TEXT NOT NULL,
                seller_id TEXT NOT NULL,
                item_id TEXT NOT NULL,
                item_type TEXT NOT NULL,
                gross_amount REAL NOT NULL,
                currency TEXT NOT NULL,
                platform_fee_rate REAL NOT NULL,
                seller_fee_rate REAL NOT NULL,
                payment_processor_fee REAL NOT NULL,
                net_seller_amount REAL NOT NULL,
                platform_commission REAL NOT NULL,
                timestamp REAL NOT NULL,
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX(seller_id, timestamp),
                INDEX(buyer_id, timestamp),
                INDEX(item_type, timestamp)
            )
        ''')
        
        # Commission calculations
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS commission_calculations (
                calculation_id TEXT PRIMARY KEY,
                transaction_id TEXT NOT NULL,
                rule_id TEXT NOT NULL,
                base_amount REAL NOT NULL,
                platform_commission REAL NOT NULL,
                seller_net REAL NOT NULL,
                volume_discount REAL DEFAULT 0,
                status TEXT NOT NULL,
                calculated_at REAL NOT NULL,
                FOREIGN KEY(transaction_id) REFERENCES marketplace_transactions(transaction_id)
            )
        ''')
        
        # Seller payouts
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS seller_payouts (
                payout_id TEXT PRIMARY KEY,
                seller_id TEXT NOT NULL,
                period_start REAL NOT NULL,
                period_end REAL NOT NULL,
                gross_sales REAL NOT NULL,
                total_fees REAL NOT NULL,
                net_amount REAL NOT NULL,
                transaction_count INTEGER NOT NULL,
                status TEXT NOT NULL,
                payment_method TEXT,
                processed_at REAL,
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX(seller_id, period_start)
            )
        ''')
        
        # Revenue analytics
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS revenue_analytics (
                analytics_id TEXT PRIMARY KEY,
                period_start REAL NOT NULL,
                period_end REAL NOT NULL,
                total_gross_revenue REAL NOT NULL,
                total_platform_commission REAL NOT NULL,
                total_seller_payouts REAL NOT NULL,
                transaction_count INTEGER NOT NULL,
                unique_buyers INTEGER NOT NULL,
                unique_sellers INTEGER NOT NULL,
                top_categories TEXT,
                generated_at REAL NOT NULL
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def record_marketplace_transaction(self, buyer_id: str, seller_id: str, 
                                     item_id: str, item_type: TransactionType,
                                     gross_amount: float, currency: str = "EUR",
                                     seller_tier: str = "free",
                                     metadata: Optional[Dict[str, Any]] = None) -> str:
        """Record marketplace transaction and calculate commission"""
        transaction_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        # Get commission rule
        rule_key = f"{item_type.value.split('_')[0]}_{seller_tier}"
        if rule_key not in self.commission_rules:
            rule_key = f"{item_type.value}_{seller_tier}"
        
        if rule_key not in self.commission_rules:
            # Default rule
            rule = CommissionRule(
                rule_id="default",
                item_type=item_type,
                tier_type=seller_tier,
                platform_fee_percentage=30.0,
                seller_fee_percentage=0.0,
                minimum_payout=10.00,
                maximum_commission_cap=None,
                volume_discounts=[],
                effective_date=now,
                expires_date=None
            )
        else:
            rule = self.commission_rules[rule_key]
        
        # Calculate fees
        payment_processor_fee = gross_amount * 0.029 + 0.30  # Stripe-like fees
        platform_commission = gross_amount * (rule.platform_fee_percentage / 100)
        seller_fee = gross_amount * (rule.seller_fee_percentage / 100)
        net_seller_amount = gross_amount - platform_commission - seller_fee - payment_processor_fee
        
        # Apply volume discounts
        volume_discount = self._calculate_volume_discount(seller_id, rule)
        if volume_discount > 0:
            discount_amount = platform_commission * (volume_discount / 100)
            platform_commission -= discount_amount
            net_seller_amount += discount_amount
        
        # Create transaction record
        transaction = MarketplaceTransaction(
            transaction_id=transaction_id,
            buyer_id=buyer_id,
            seller_id=seller_id,
            item_id=item_id,
            item_type=item_type,
            gross_amount=gross_amount,
            currency=currency,
            platform_fee_rate=rule.platform_fee_percentage,
            seller_fee_rate=rule.seller_fee_percentage,
            payment_processor_fee=payment_processor_fee,
            net_seller_amount=net_seller_amount,
            platform_commission=platform_commission,
            timestamp=now,
            metadata=metadata or {}
        )
        
        # Store transaction
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO marketplace_transactions 
            (transaction_id, buyer_id, seller_id, item_id, item_type, gross_amount,
             currency, platform_fee_rate, seller_fee_rate, payment_processor_fee,
             net_seller_amount, platform_commission, timestamp, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            transaction_id, buyer_id, seller_id, item_id, item_type.value,
            gross_amount, currency, rule.platform_fee_percentage, rule.seller_fee_percentage,
            payment_processor_fee, net_seller_amount, platform_commission,
            now.timestamp(), json.dumps(metadata or {})
        ))
        
        # Store commission calculation
        calculation_id = str(uuid.uuid4())
        cursor.execute('''
            INSERT INTO commission_calculations 
            (calculation_id, transaction_id, rule_id, base_amount, platform_commission,
             seller_net, volume_discount, status, calculated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            calculation_id, transaction_id, rule.rule_id, gross_amount,
            platform_commission, net_seller_amount, volume_discount,
            CommissionStatus.CALCULATED.value, now.timestamp()
        ))
        
        conn.commit()
        conn.close()
        
        return transaction_id
    
    def calculate_seller_payout(self, seller_id: str, 
                               period_start: Optional[datetime] = None,
                               period_end: Optional[datetime] = None) -> Dict[str, Any]:
        """Calculate seller payout for period"""
        if not period_end:
            period_end = datetime.now(timezone.utc)
        
        if not period_start:
            if self.config["payout_schedule"] == "weekly":
                period_start = period_end - timedelta(days=7)
            elif self.config["payout_schedule"] == "monthly":
                period_start = period_end - timedelta(days=30)
            else:  # quarterly
                period_start = period_end - timedelta(days=90)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get transactions for period
        cursor.execute('''
            SELECT SUM(gross_amount), SUM(platform_commission + payment_processor_fee),
                   SUM(net_seller_amount), COUNT(*)
            FROM marketplace_transactions 
            WHERE seller_id = ? AND timestamp BETWEEN ? AND ?
        ''', (seller_id, period_start.timestamp(), period_end.timestamp()))
        
        result = cursor.fetchone()
        gross_sales = result[0] or 0.0
        total_fees = result[1] or 0.0
        net_amount = result[2] or 0.0
        transaction_count = result[3] or 0
        
        conn.close()
        
        # Check minimum payout threshold
        if net_amount < self.config["minimum_payout_amount"]:
            return {
                "seller_id": seller_id,
                "period_start": period_start.isoformat(),
                "period_end": period_end.isoformat(),
                "gross_sales": gross_sales,
                "net_amount": net_amount,
                "minimum_payout": self.config["minimum_payout_amount"],
                "payout_eligible": False,
                "message": f"Net amount ${net_amount:.2f} below minimum ${self.config['minimum_payout_amount']:.2f}"
            }
        
        return {
            "seller_id": seller_id,
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "gross_sales": gross_sales,
            "total_fees": total_fees,
            "net_amount": net_amount,
            "transaction_count": transaction_count,
            "payout_eligible": True,
            "estimated_processing_days": self.config["payout_processing_days"]
        }
    
    def process_seller_payout(self, seller_id: str, payment_method: str,
                             period_start: Optional[datetime] = None,
                             period_end: Optional[datetime] = None) -> str:
        """Process seller payout"""
        payout_calculation = self.calculate_seller_payout(seller_id, period_start, period_end)
        
        if not payout_calculation["payout_eligible"]:
            raise ValueError(payout_calculation["message"])
        
        payout_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        payout = SellerPayout(
            payout_id=payout_id,
            seller_id=seller_id,
            period_start=datetime.fromisoformat(payout_calculation["period_start"].replace('Z', '+00:00')),
            period_end=datetime.fromisoformat(payout_calculation["period_end"].replace('Z', '+00:00')),
            gross_sales=payout_calculation["gross_sales"],
            total_fees=payout_calculation["total_fees"],
            net_amount=payout_calculation["net_amount"],
            transaction_count=payout_calculation["transaction_count"],
            status=PayoutStatus.PENDING,
            payment_method=payment_method,
            processed_at=None,
            metadata={}
        )
        
        # Store payout
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO seller_payouts 
            (payout_id, seller_id, period_start, period_end, gross_sales,
             total_fees, net_amount, transaction_count, status, payment_method,
             processed_at, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            payout_id, seller_id, payout.period_start.timestamp(),
            payout.period_end.timestamp(), payout.gross_sales, payout.total_fees,
            payout.net_amount, payout.transaction_count, payout.status.value,
            payment_method, None, json.dumps({})
        ))
        
        conn.commit()
        conn.close()
        
        return payout_id
    
    def generate_revenue_analytics(self, period_start: datetime, 
                                  period_end: datetime) -> Dict[str, Any]:
        """Generate revenue analytics for period"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Overall metrics
        cursor.execute('''
            SELECT SUM(gross_amount), SUM(platform_commission), SUM(net_seller_amount),
                   COUNT(*), COUNT(DISTINCT buyer_id), COUNT(DISTINCT seller_id)
            FROM marketplace_transactions 
            WHERE timestamp BETWEEN ? AND ?
        ''', (period_start.timestamp(), period_end.timestamp()))
        
        overall = cursor.fetchone()
        total_gross = overall[0] or 0.0
        total_commission = overall[1] or 0.0
        total_seller_payouts = overall[2] or 0.0
        transaction_count = overall[3] or 0
        unique_buyers = overall[4] or 0
        unique_sellers = overall[5] or 0
        
        # Category breakdown
        cursor.execute('''
            SELECT item_type, SUM(gross_amount), COUNT(*)
            FROM marketplace_transactions 
            WHERE timestamp BETWEEN ? AND ?
            GROUP BY item_type
            ORDER BY SUM(gross_amount) DESC
        ''', (period_start.timestamp(), period_end.timestamp()))
        
        categories = []
        for row in cursor.fetchall():
            categories.append({
                "category": row[0],
                "revenue": row[1],
                "transactions": row[2]
            })
        
        # Top sellers
        cursor.execute('''
            SELECT seller_id, SUM(gross_amount), COUNT(*)
            FROM marketplace_transactions 
            WHERE timestamp BETWEEN ? AND ?
            GROUP BY seller_id
            ORDER BY SUM(gross_amount) DESC
            LIMIT 10
        ''', (period_start.timestamp(), period_end.timestamp()))
        
        top_sellers = []
        for row in cursor.fetchall():
            top_sellers.append({
                "seller_id": row[0],
                "revenue": row[1],
                "transactions": row[2]
            })
        
        conn.close()
        
        # Calculate key metrics
        avg_transaction_value = total_gross / transaction_count if transaction_count > 0 else 0
        platform_take_rate = (total_commission / total_gross * 100) if total_gross > 0 else 0
        
        analytics = {
            "period": {
                "start": period_start.isoformat(),
                "end": period_end.isoformat()
            },
            "overview": {
                "total_gross_revenue": total_gross,
                "total_platform_commission": total_commission,
                "total_seller_payouts": total_seller_payouts,
                "transaction_count": transaction_count,
                "unique_buyers": unique_buyers,
                "unique_sellers": unique_sellers,
                "average_transaction_value": avg_transaction_value,
                "platform_take_rate_percentage": platform_take_rate
            },
            "categories": categories,
            "top_sellers": top_sellers,
            "insights": self._generate_insights(categories, top_sellers, overall)
        }
        
        # Store analytics
        analytics_id = str(uuid.uuid4())
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO revenue_analytics 
            (analytics_id, period_start, period_end, total_gross_revenue,
             total_platform_commission, total_seller_payouts, transaction_count,
             unique_buyers, unique_sellers, top_categories, generated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            analytics_id, period_start.timestamp(), period_end.timestamp(),
            total_gross, total_commission, total_seller_payouts, transaction_count,
            unique_buyers, unique_sellers, json.dumps(categories), time.time()
        ))
        
        conn.commit()
        conn.close()
        
        return analytics
    
    def _calculate_volume_discount(self, seller_id: str, rule: CommissionRule) -> float:
        """Calculate volume discount for seller"""
        if not rule.volume_discounts:
            return 0.0
        
        # Get seller's total volume in last 30 days
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        
        cursor.execute('''
            SELECT SUM(gross_amount) FROM marketplace_transactions 
            WHERE seller_id = ? AND timestamp > ?
        ''', (seller_id, thirty_days_ago.timestamp()))
        
        total_volume = cursor.fetchone()[0] or 0.0
        conn.close()
        
        # Find applicable discount
        applicable_discount = 0.0
        for discount in rule.volume_discounts:
            if total_volume >= discount["threshold"]:
                applicable_discount = discount["discount_percentage"]
        
        return applicable_discount
    
    def _generate_insights(self, categories: List[Dict], top_sellers: List[Dict], 
                          overall: Tuple) -> List[str]:
        """Generate business insights from analytics"""
        insights = []
        
        if categories:
            top_category = categories[0]
            insights.append(f"Top category '{top_category['category']}' generated {top_category['revenue']:.2f} EUR")
        
        if top_sellers:
            top_seller = top_sellers[0]
            insights.append(f"Top seller generated {top_seller['revenue']:.2f} EUR from {top_seller['transactions']} transactions")
        
        total_gross = overall[0] or 0.0
        transaction_count = overall[3] or 0
        
        if transaction_count > 0:
            avg_value = total_gross / transaction_count
            if avg_value > 50:
                insights.append("High average transaction value indicates premium product mix")
            elif avg_value < 10:
                insights.append("Low average transaction value suggests volume-based strategy")
        
        return insights

# Example usage
if __name__ == "__main__":
    commission_engine = MarketplaceCommissionEngine()
    
    # Record transaction
    transaction_id = commission_engine.record_marketplace_transaction(
        buyer_id="buyer_123",
        seller_id="seller_456",
        item_id="plugin_789",
        item_type=TransactionType.PLUGIN_SALE,
        gross_amount=29.99,
        seller_tier="verified"
    )
    
    print(f"Recorded transaction: {transaction_id}")
    
    # Calculate payout
    payout_calc = commission_engine.calculate_seller_payout("seller_456")
    print(f"Payout calculation: {payout_calc}")
    
    # Generate analytics
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=30)
    analytics = commission_engine.generate_revenue_analytics(start_date, end_date)
    print(f"Revenue analytics: {analytics['overview']}")
