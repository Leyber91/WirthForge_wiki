#!/usr/bin/env python3
"""
WF-TECH-004 Data Validator Script
WIRTHFORGE State Management & Storage System

This script validates the integrity of stored data in the WIRTHFORGE database,
checking for consistency, schema compliance, and data integrity issues.

Version: 1.0.0
Compatible with: Python 3.11+, SQLite 3.35+, jsonschema
"""

import sqlite3
import json
import jsonschema
import logging
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
import hashlib
import sys
import argparse

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DataValidator:
    """
    Comprehensive data validator for WIRTHFORGE state database
    """
    
    def __init__(self, db_path: str, schema_path: str = None):
        self.db_path = Path(db_path)
        self.schema_path = Path(schema_path) if schema_path else None
        self.db: Optional[sqlite3.Connection] = None
        self.schemas: Dict[str, Dict] = {}
        self.validation_errors: List[Dict[str, Any]] = []
        self.validation_warnings: List[Dict[str, Any]] = []
        
    def load_schemas(self) -> bool:
        """Load JSON schemas for validation"""
        try:
            if not self.schema_path or not self.schema_path.exists():
                logger.warning("Schema path not provided or doesn't exist, skipping schema validation")
                return True
                
            # Load energy state schema
            energy_schema_path = self.schema_path / "WF-TECH-004-energy-state.json"
            if energy_schema_path.exists():
                with open(energy_schema_path, 'r') as f:
                    self.schemas['energy_state'] = json.load(f)
                logger.info("Loaded energy state schema")
            
            # Load events schema
            events_schema_path = self.schema_path / "WF-TECH-004-events.json"
            if events_schema_path.exists():
                with open(events_schema_path, 'r') as f:
                    self.schemas['events'] = json.load(f)
                logger.info("Loaded events schema")
                
            return True
            
        except Exception as e:
            logger.error(f"Failed to load schemas: {e}")
            return False
    
    def connect_database(self) -> bool:
        """Connect to the SQLite database"""
        try:
            if not self.db_path.exists():
                self.add_error("database", "Database file does not exist", 
                             {"path": str(self.db_path)})
                return False
                
            self.db = sqlite3.connect(self.db_path, check_same_thread=False)
            self.db.row_factory = sqlite3.Row  # Enable column access by name
            logger.info(f"Connected to database: {self.db_path}")
            return True
            
        except Exception as e:
            self.add_error("database", f"Failed to connect to database: {e}")
            return False
    
    def add_error(self, category: str, message: str, context: Dict[str, Any] = None):
        """Add a validation error"""
        error = {
            "category": category,
            "message": message,
            "context": context or {},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self.validation_errors.append(error)
        logger.error(f"[{category}] {message}")
    
    def add_warning(self, category: str, message: str, context: Dict[str, Any] = None):
        """Add a validation warning"""
        warning = {
            "category": category,
            "message": message,
            "context": context or {},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self.validation_warnings.append(warning)
        logger.warning(f"[{category}] {message}")
    
    def validate_schema_info(self) -> bool:
        """Validate schema information table"""
        try:
            # Check if schema_info table exists
            cursor = self.db.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='schema_info'
            """)
            
            if not cursor.fetchone():
                self.add_error("schema", "schema_info table missing")
                return False
            
            # Check version information
            version_row = self.db.execute("""
                SELECT value FROM schema_info WHERE key = 'version'
            """).fetchone()
            
            if not version_row:
                self.add_error("schema", "Schema version not found in schema_info")
                return False
            
            version = version_row[0]
            if not version or not version.count('.') == 2:
                self.add_error("schema", f"Invalid schema version format: {version}")
                return False
            
            logger.info(f"Schema version: {version}")
            return True
            
        except Exception as e:
            self.add_error("schema", f"Failed to validate schema info: {e}")
            return False
    
    def validate_foreign_keys(self) -> bool:
        """Validate foreign key constraints"""
        try:
            # Check for orphaned events (events without corresponding session)
            orphaned_events = self.db.execute("""
                SELECT COUNT(*) as count
                FROM event e 
                LEFT JOIN session s ON e.session_id = s.session_id 
                WHERE s.session_id IS NULL
            """).fetchone()[0]
            
            if orphaned_events > 0:
                self.add_error("foreign_keys", f"Found {orphaned_events} orphaned events")
            
            # Check for orphaned snapshots
            orphaned_snapshots = self.db.execute("""
                SELECT COUNT(*) as count
                FROM snapshot snap 
                LEFT JOIN session s ON snap.session_id = s.session_id 
                WHERE s.session_id IS NULL
            """).fetchone()[0]
            
            if orphaned_snapshots > 0:
                self.add_error("foreign_keys", f"Found {orphaned_snapshots} orphaned snapshots")
            
            # Check for invalid snapshot event references
            invalid_snapshot_refs = self.db.execute("""
                SELECT COUNT(*) as count
                FROM snapshot snap 
                LEFT JOIN event e ON snap.last_event_id = e.event_id 
                WHERE snap.last_event_id IS NOT NULL AND e.event_id IS NULL
            """).fetchone()[0]
            
            if invalid_snapshot_refs > 0:
                self.add_error("foreign_keys", f"Found {invalid_snapshot_refs} invalid snapshot event references")
            
            # Check for sessions without corresponding user
            orphaned_sessions = self.db.execute("""
                SELECT COUNT(*) as count
                FROM session s 
                LEFT JOIN user u ON s.user_id = u.user_id 
                WHERE u.user_id IS NULL
            """).fetchone()[0]
            
            if orphaned_sessions > 0:
                self.add_error("foreign_keys", f"Found {orphaned_sessions} orphaned sessions")
            
            if (orphaned_events + orphaned_snapshots + invalid_snapshot_refs + orphaned_sessions) == 0:
                logger.info("All foreign key constraints validated successfully")
            
            return True
            
        except Exception as e:
            self.add_error("foreign_keys", f"Failed to validate foreign keys: {e}")
            return False
    
    def validate_timestamps(self) -> bool:
        """Validate timestamp consistency and format"""
        try:
            # Check for invalid timestamp formats in events
            invalid_timestamps = self.db.execute("""
                SELECT COUNT(*) as count
                FROM event 
                WHERE timestamp NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9]*'
            """).fetchone()[0]
            
            if invalid_timestamps > 0:
                self.add_error("timestamps", f"Found {invalid_timestamps} events with invalid timestamp format")
            
            # Check for non-monotonic timestamps within sessions
            non_monotonic_sessions = self.db.execute("""
                SELECT session_id, COUNT(*) as violations
                FROM (
                    SELECT session_id, timestamp,
                           LAG(timestamp) OVER (PARTITION BY session_id ORDER BY timestamp) as prev_timestamp
                    FROM event
                ) 
                WHERE timestamp < prev_timestamp
                GROUP BY session_id
            """).fetchall()
            
            for session_id, violations in non_monotonic_sessions:
                self.add_error("timestamps", 
                             f"Session {session_id} has {violations} non-monotonic timestamp violations")
            
            # Check for events with timestamps outside session bounds
            events_outside_session = self.db.execute("""
                SELECT COUNT(*) as count
                FROM event e
                JOIN session s ON e.session_id = s.session_id
                WHERE e.timestamp < s.start_time 
                   OR (s.end_time IS NOT NULL AND e.timestamp > s.end_time)
            """).fetchone()[0]
            
            if events_outside_session > 0:
                self.add_error("timestamps", 
                             f"Found {events_outside_session} events with timestamps outside session bounds")
            
            if invalid_timestamps + len(non_monotonic_sessions) + events_outside_session == 0:
                logger.info("All timestamp validations passed")
            
            return True
            
        except Exception as e:
            self.add_error("timestamps", f"Failed to validate timestamps: {e}")
            return False
    
    def validate_json_data(self) -> bool:
        """Validate JSON data in events and snapshots"""
        try:
            # Check for invalid JSON in events
            invalid_json_events = []
            events = self.db.execute("SELECT event_id, data FROM event").fetchall()
            
            for event_id, data in events:
                try:
                    json.loads(data)
                except json.JSONDecodeError as e:
                    invalid_json_events.append((event_id, str(e)))
            
            if invalid_json_events:
                for event_id, error in invalid_json_events:
                    self.add_error("json", f"Event {event_id} has invalid JSON: {error}")
            
            # Check for invalid JSON in snapshots
            invalid_json_snapshots = []
            snapshots = self.db.execute("SELECT snapshot_id, state FROM snapshot").fetchall()
            
            for snapshot_id, state in snapshots:
                try:
                    json.loads(state)
                except json.JSONDecodeError as e:
                    invalid_json_snapshots.append((snapshot_id, str(e)))
            
            if invalid_json_snapshots:
                for snapshot_id, error in invalid_json_snapshots:
                    self.add_error("json", f"Snapshot {snapshot_id} has invalid JSON: {error}")
            
            # Check for invalid JSON in user preferences
            invalid_json_users = []
            users = self.db.execute("SELECT user_id, preferences, unlocked_paths FROM user").fetchall()
            
            for user_id, preferences, unlocked_paths in users:
                try:
                    if preferences:
                        json.loads(preferences)
                    if unlocked_paths:
                        json.loads(unlocked_paths)
                except json.JSONDecodeError as e:
                    invalid_json_users.append((user_id, str(e)))
            
            if invalid_json_users:
                for user_id, error in invalid_json_users:
                    self.add_error("json", f"User {user_id} has invalid JSON: {error}")
            
            total_invalid = len(invalid_json_events) + len(invalid_json_snapshots) + len(invalid_json_users)
            if total_invalid == 0:
                logger.info("All JSON data validated successfully")
            
            return True
            
        except Exception as e:
            self.add_error("json", f"Failed to validate JSON data: {e}")
            return False
    
    def validate_energy_consistency(self) -> bool:
        """Validate energy accumulator consistency"""
        try:
            # Check energy consistency for each session
            sessions = self.db.execute("""
                SELECT session_id, total_energy 
                FROM session 
                WHERE end_time IS NOT NULL
            """).fetchall()
            
            for session_id, session_total_energy in sessions:
                # Calculate energy from events
                event_energy_sum = self.db.execute("""
                    SELECT COALESCE(SUM(energy_delta), 0) as total
                    FROM event 
                    WHERE session_id = ? AND energy_delta IS NOT NULL
                """, (session_id,)).fetchone()[0]
                
                # Allow small floating point differences
                energy_diff = abs(session_total_energy - event_energy_sum)
                tolerance = 0.01  # 0.01 EU tolerance
                
                if energy_diff > tolerance:
                    self.add_error("energy_consistency", 
                                 f"Session {session_id} energy mismatch: "
                                 f"session={session_total_energy}, events={event_energy_sum}, "
                                 f"diff={energy_diff}")
                
                # Check latest snapshot consistency
                latest_snapshot = self.db.execute("""
                    SELECT energy_accumulator 
                    FROM snapshot 
                    WHERE session_id = ? 
                    ORDER BY timestamp DESC 
                    LIMIT 1
                """, (session_id,)).fetchone()
                
                if latest_snapshot:
                    snapshot_energy = latest_snapshot[0]
                    if abs(snapshot_energy - session_total_energy) > tolerance:
                        self.add_warning("energy_consistency",
                                       f"Session {session_id} snapshot energy mismatch: "
                                       f"session={session_total_energy}, snapshot={snapshot_energy}")
            
            logger.info("Energy consistency validation completed")
            return True
            
        except Exception as e:
            self.add_error("energy_consistency", f"Failed to validate energy consistency: {e}")
            return False
    
    def validate_schema_compliance(self) -> bool:
        """Validate data against JSON schemas"""
        if not self.schemas:
            logger.info("No schemas loaded, skipping schema compliance validation")
            return True
        
        try:
            # Validate event data against events schema
            if 'events' in self.schemas:
                events = self.db.execute("""
                    SELECT event_id, session_id, timestamp, type, data, frame_id
                    FROM event 
                    LIMIT 100  -- Validate sample for performance
                """).fetchall()
                
                for event_id, session_id, timestamp, event_type, data, frame_id in events:
                    try:
                        event_obj = {
                            "session_id": session_id,
                            "timestamp": timestamp,
                            "type": event_type,
                            "data": json.loads(data)
                        }
                        if frame_id is not None:
                            event_obj["frame_id"] = frame_id
                        
                        jsonschema.validate(event_obj, self.schemas['events'])
                        
                    except jsonschema.ValidationError as e:
                        self.add_error("schema_compliance", 
                                     f"Event {event_id} schema validation failed: {e.message}",
                                     {"event_type": event_type, "path": list(e.absolute_path)})
                    except Exception as e:
                        self.add_warning("schema_compliance", 
                                       f"Event {event_id} validation error: {e}")
            
            # Validate snapshot state data against energy state schema
            if 'energy_state' in self.schemas:
                snapshots = self.db.execute("""
                    SELECT snapshot_id, state 
                    FROM snapshot 
                    LIMIT 10  -- Validate sample for performance
                """).fetchall()
                
                for snapshot_id, state in snapshots:
                    try:
                        state_obj = json.loads(state)
                        jsonschema.validate(state_obj, self.schemas['energy_state'])
                        
                    except jsonschema.ValidationError as e:
                        self.add_error("schema_compliance", 
                                     f"Snapshot {snapshot_id} schema validation failed: {e.message}",
                                     {"path": list(e.absolute_path)})
                    except Exception as e:
                        self.add_warning("schema_compliance", 
                                       f"Snapshot {snapshot_id} validation error: {e}")
            
            logger.info("Schema compliance validation completed")
            return True
            
        except Exception as e:
            self.add_error("schema_compliance", f"Failed to validate schema compliance: {e}")
            return False
    
    def validate_performance_metrics(self) -> bool:
        """Validate performance-related data"""
        try:
            # Check for sessions with suspicious frame rates
            suspicious_fps = self.db.execute("""
                SELECT session_id, COUNT(*) as count
                FROM event 
                WHERE type = 'energy.update' 
                  AND JSON_EXTRACT(data, '$.fps') < 30
                GROUP BY session_id
                HAVING count > 10
            """).fetchall()
            
            for session_id, count in suspicious_fps:
                self.add_warning("performance", 
                               f"Session {session_id} has {count} events with FPS < 30")
            
            # Check for excessive frame budget usage
            high_frame_budget = self.db.execute("""
                SELECT session_id, COUNT(*) as count
                FROM event 
                WHERE type = 'energy.update' 
                  AND JSON_EXTRACT(data, '$.frame_budget_used') > 16.67
                GROUP BY session_id
                HAVING count > 5
            """).fetchall()
            
            for session_id, count in high_frame_budget:
                self.add_warning("performance", 
                               f"Session {session_id} has {count} events exceeding frame budget")
            
            # Check for sessions with no energy events
            sessions_no_energy = self.db.execute("""
                SELECT s.session_id
                FROM session s
                LEFT JOIN event e ON s.session_id = e.session_id AND e.type = 'energy.update'
                WHERE s.end_time IS NOT NULL AND e.event_id IS NULL
            """).fetchall()
            
            for (session_id,) in sessions_no_energy:
                self.add_warning("performance", 
                               f"Session {session_id} has no energy update events")
            
            logger.info("Performance metrics validation completed")
            return True
            
        except Exception as e:
            self.add_error("performance", f"Failed to validate performance metrics: {e}")
            return False
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive validation report"""
        try:
            # Gather database statistics
            stats = {}
            
            # Table counts
            for table in ['user', 'session', 'event', 'snapshot', 'audit']:
                count = self.db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
                stats[f"{table}_count"] = count
            
            # Session statistics
            session_stats = self.db.execute("""
                SELECT 
                    COUNT(*) as total_sessions,
                    COUNT(CASE WHEN end_time IS NOT NULL THEN 1 END) as completed_sessions,
                    COUNT(CASE WHEN clean_shutdown = 1 THEN 1 END) as clean_shutdowns,
                    AVG(total_energy) as avg_energy,
                    MAX(total_energy) as max_energy,
                    AVG(total_events) as avg_events
                FROM session
            """).fetchone()
            
            stats.update({
                "total_sessions": session_stats[0],
                "completed_sessions": session_stats[1], 
                "clean_shutdowns": session_stats[2],
                "avg_energy_per_session": round(session_stats[3] or 0, 2),
                "max_energy_per_session": session_stats[4] or 0,
                "avg_events_per_session": round(session_stats[5] or 0, 2)
            })
            
            # Event type distribution
            event_types = self.db.execute("""
                SELECT type, COUNT(*) as count
                FROM event
                GROUP BY type
                ORDER BY count DESC
            """).fetchall()
            
            stats["event_type_distribution"] = {event_type: count for event_type, count in event_types}
            
            # Generate report
            report = {
                "validation_timestamp": datetime.now(timezone.utc).isoformat(),
                "database_path": str(self.db_path),
                "schema_path": str(self.schema_path) if self.schema_path else None,
                "statistics": stats,
                "validation_results": {
                    "total_errors": len(self.validation_errors),
                    "total_warnings": len(self.validation_warnings),
                    "errors_by_category": {},
                    "warnings_by_category": {}
                },
                "errors": self.validation_errors,
                "warnings": self.validation_warnings
            }
            
            # Group errors and warnings by category
            for error in self.validation_errors:
                category = error["category"]
                if category not in report["validation_results"]["errors_by_category"]:
                    report["validation_results"]["errors_by_category"][category] = 0
                report["validation_results"]["errors_by_category"][category] += 1
            
            for warning in self.validation_warnings:
                category = warning["category"]
                if category not in report["validation_results"]["warnings_by_category"]:
                    report["validation_results"]["warnings_by_category"][category] = 0
                report["validation_results"]["warnings_by_category"][category] += 1
            
            return report
            
        except Exception as e:
            logger.error(f"Failed to generate report: {e}")
            return {"error": str(e)}
    
    def run_validation(self) -> bool:
        """Run complete validation suite"""
        logger.info("Starting WIRTHFORGE database validation")
        
        # Load schemas
        if not self.load_schemas():
            return False
        
        # Connect to database
        if not self.connect_database():
            return False
        
        try:
            # Run all validation checks
            validation_steps = [
                ("Schema Info", self.validate_schema_info),
                ("Foreign Keys", self.validate_foreign_keys),
                ("Timestamps", self.validate_timestamps),
                ("JSON Data", self.validate_json_data),
                ("Energy Consistency", self.validate_energy_consistency),
                ("Schema Compliance", self.validate_schema_compliance),
                ("Performance Metrics", self.validate_performance_metrics)
            ]
            
            for step_name, validation_func in validation_steps:
                logger.info(f"Running {step_name} validation...")
                validation_func()
            
            # Generate and return report
            report = self.generate_report()
            
            # Summary
            total_errors = len(self.validation_errors)
            total_warnings = len(self.validation_warnings)
            
            if total_errors == 0 and total_warnings == 0:
                logger.info("✅ All validations passed successfully!")
                return True
            elif total_errors == 0:
                logger.info(f"✅ Validation completed with {total_warnings} warnings")
                return True
            else:
                logger.error(f"❌ Validation failed with {total_errors} errors and {total_warnings} warnings")
                return False
                
        finally:
            if self.db:
                self.db.close()

def main():
    """Command-line interface for the validator"""
    parser = argparse.ArgumentParser(description="WIRTHFORGE Database Validator")
    parser.add_argument("database", help="Path to SQLite database file")
    parser.add_argument("--schema-path", help="Path to JSON schema directory")
    parser.add_argument("--output", help="Output file for validation report (JSON)")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose logging")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Run validation
    validator = DataValidator(args.database, args.schema_path)
    success = validator.run_validation()
    
    # Save report if requested
    if args.output:
        report = validator.generate_report()
        with open(args.output, 'w') as f:
            json.dump(report, f, indent=2)
        logger.info(f"Validation report saved to {args.output}")
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
