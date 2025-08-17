#!/usr/bin/env python3
"""
WF-TECH-004 Backup & Export CLI
WIRTHFORGE State Management & Storage System

Command-line utility for backing up, exporting, and managing WIRTHFORGE user data.
Ensures user data ownership and provides privacy-compliant data management.

Version: 1.0.0
Compatible with: Python 3.11+, SQLite 3.35+
"""

import sqlite3
import json
import yaml
import zipfile
import shutil
import hashlib
import logging
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from pathlib import Path
import argparse
import sys
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class WirthForgeBackupCLI:
    """
    Backup and export utility for WIRTHFORGE user data
    """
    
    def __init__(self, db_path: str):
        self.db_path = Path(db_path)
        self.db: Optional[sqlite3.Connection] = None
        
    def connect_database(self) -> bool:
        """Connect to the WIRTHFORGE database"""
        try:
            if not self.db_path.exists():
                logger.error(f"Database file not found: {self.db_path}")
                return False
                
            self.db = sqlite3.connect(self.db_path, check_same_thread=False)
            self.db.row_factory = sqlite3.Row
            logger.info(f"Connected to database: {self.db_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            return False
    
    def backup_database(self, output_path: str, format_type: str = "zip", 
                       include_media: bool = False) -> bool:
        """
        Create a complete backup of the database
        
        Args:
            output_path: Path for backup file
            format_type: Format (zip, sql, json)
            include_media: Whether to include media files (if any)
            
        Returns:
            bool: Success status
        """
        try:
            output_file = Path(output_path)
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            
            if format_type == "zip":
                return self._backup_as_zip(output_file, timestamp, include_media)
            elif format_type == "sql":
                return self._backup_as_sql(output_file, timestamp)
            elif format_type == "json":
                return self._backup_as_json(output_file, timestamp)
            else:
                logger.error(f"Unsupported backup format: {format_type}")
                return False
                
        except Exception as e:
            logger.error(f"Backup failed: {e}")
            return False
    
    def _backup_as_zip(self, output_file: Path, timestamp: str, include_media: bool) -> bool:
        """Create ZIP backup with database and metadata"""
        backup_name = f"wirthforge_backup_{timestamp}.zip"
        if output_file.is_dir():
            backup_path = output_file / backup_name
        else:
            backup_path = output_file.with_suffix('.zip')
        
        try:
            with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                # Add database file
                zf.write(self.db_path, "wirthforge_state.db")
                
                # Add metadata
                metadata = self._generate_backup_metadata()
                zf.writestr("backup_metadata.json", json.dumps(metadata, indent=2))
                
                # Add human-readable export
                export_data = self._export_all_data()
                zf.writestr("data_export.json", json.dumps(export_data, indent=2))
                zf.writestr("data_export.yaml", yaml.dump(export_data, default_flow_style=False))
                
                # Add schema files if they exist
                schema_dir = self.db_path.parent.parent / "assets" / "schemas"
                if schema_dir.exists():
                    for schema_file in schema_dir.glob("WF-TECH-004-*.json"):
                        zf.write(schema_file, f"schemas/{schema_file.name}")
                
                # TODO: Add media files if include_media is True
                if include_media:
                    logger.info("Media file inclusion not yet implemented")
            
            logger.info(f"ZIP backup created: {backup_path}")
            logger.info(f"Backup size: {backup_path.stat().st_size / (1024*1024):.2f} MB")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create ZIP backup: {e}")
            return False
    
    def _backup_as_sql(self, output_file: Path, timestamp: str) -> bool:
        """Create SQL dump backup"""
        backup_name = f"wirthforge_backup_{timestamp}.sql"
        if output_file.is_dir():
            backup_path = output_file / backup_name
        else:
            backup_path = output_file.with_suffix('.sql')
        
        try:
            with open(backup_path, 'w') as f:
                # Write header
                f.write(f"-- WIRTHFORGE Database Backup\n")
                f.write(f"-- Created: {datetime.now(timezone.utc).isoformat()}\n")
                f.write(f"-- Database: {self.db_path}\n\n")
                
                # Write schema and data
                for line in self.db.iterdump():
                    f.write(f"{line}\n")
            
            logger.info(f"SQL backup created: {backup_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create SQL backup: {e}")
            return False
    
    def _backup_as_json(self, output_file: Path, timestamp: str) -> bool:
        """Create JSON export backup"""
        backup_name = f"wirthforge_backup_{timestamp}.json"
        if output_file.is_dir():
            backup_path = output_file / backup_name
        else:
            backup_path = output_file.with_suffix('.json')
        
        try:
            export_data = self._export_all_data()
            export_data['backup_metadata'] = self._generate_backup_metadata()
            
            with open(backup_path, 'w') as f:
                json.dump(export_data, f, indent=2)
            
            logger.info(f"JSON backup created: {backup_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create JSON backup: {e}")
            return False
    
    def _generate_backup_metadata(self) -> Dict[str, Any]:
        """Generate backup metadata"""
        try:
            # Get database statistics
            stats = {}
            for table in ['user', 'session', 'event', 'snapshot', 'audit']:
                try:
                    count = self.db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
                    stats[f"{table}_count"] = count
                except:
                    stats[f"{table}_count"] = 0
            
            # Get schema version
            schema_version = "unknown"
            try:
                version_row = self.db.execute(
                    "SELECT value FROM schema_info WHERE key = 'version'"
                ).fetchone()
                if version_row:
                    schema_version = version_row[0]
            except:
                pass
            
            return {
                "backup_timestamp": datetime.now(timezone.utc).isoformat(),
                "database_path": str(self.db_path),
                "schema_version": schema_version,
                "statistics": stats,
                "backup_tool_version": "1.0.0",
                "format_version": "1.0.0"
            }
            
        except Exception as e:
            logger.warning(f"Failed to generate complete metadata: {e}")
            return {
                "backup_timestamp": datetime.now(timezone.utc).isoformat(),
                "error": str(e)
            }
    
    def _export_all_data(self) -> Dict[str, Any]:
        """Export all user data in structured format"""
        try:
            export_data = {
                "export_timestamp": datetime.now(timezone.utc).isoformat(),
                "users": [],
                "sessions": [],
                "events": [],
                "snapshots": [],
                "audit_log": []
            }
            
            # Export users
            users = self.db.execute("SELECT * FROM user").fetchall()
            for user in users:
                user_data = dict(user)
                # Parse JSON fields
                if user_data.get('preferences'):
                    try:
                        user_data['preferences'] = json.loads(user_data['preferences'])
                    except:
                        pass
                if user_data.get('unlocked_paths'):
                    try:
                        user_data['unlocked_paths'] = json.loads(user_data['unlocked_paths'])
                    except:
                        pass
                export_data["users"].append(user_data)
            
            # Export sessions
            sessions = self.db.execute("SELECT * FROM session ORDER BY start_time").fetchall()
            for session in sessions:
                session_data = dict(session)
                if session_data.get('metadata'):
                    try:
                        session_data['metadata'] = json.loads(session_data['metadata'])
                    except:
                        pass
                export_data["sessions"].append(session_data)
            
            # Export events (limit to recent or provide option to export all)
            events = self.db.execute("""
                SELECT * FROM event 
                ORDER BY timestamp DESC 
                LIMIT 10000
            """).fetchall()
            
            for event in events:
                event_data = dict(event)
                if event_data.get('data'):
                    try:
                        event_data['data'] = json.loads(event_data['data'])
                    except:
                        pass
                export_data["events"].append(event_data)
            
            # Export snapshots
            snapshots = self.db.execute("SELECT * FROM snapshot ORDER BY timestamp DESC").fetchall()
            for snapshot in snapshots:
                snapshot_data = dict(snapshot)
                if snapshot_data.get('state'):
                    try:
                        snapshot_data['state'] = json.loads(snapshot_data['state'])
                    except:
                        pass
                export_data["snapshots"].append(snapshot_data)
            
            # Export audit log
            try:
                audit_entries = self.db.execute("SELECT * FROM audit ORDER BY timestamp DESC LIMIT 1000").fetchall()
                for entry in audit_entries:
                    entry_data = dict(entry)
                    for field in ['old_values', 'new_values']:
                        if entry_data.get(field):
                            try:
                                entry_data[field] = json.loads(entry_data[field])
                            except:
                                pass
                    export_data["audit_log"].append(entry_data)
            except:
                logger.info("No audit table found or accessible")
            
            return export_data
            
        except Exception as e:
            logger.error(f"Failed to export data: {e}")
            return {"error": str(e)}
    
    def export_session(self, session_id: str, output_path: str, 
                      format_type: str = "yaml", include_content: bool = False) -> bool:
        """
        Export a specific session's data
        
        Args:
            session_id: Session ID to export
            output_path: Output file path
            format_type: Export format (yaml, json)
            include_content: Whether to include AI-generated content
            
        Returns:
            bool: Success status
        """
        try:
            # Get session info
            session = self.db.execute("""
                SELECT * FROM session WHERE session_id = ?
            """, (session_id,)).fetchone()
            
            if not session:
                logger.error(f"Session {session_id} not found")
                return False
            
            # Get events
            events = self.db.execute("""
                SELECT * FROM event 
                WHERE session_id = ? 
                ORDER BY timestamp ASC
            """, (session_id,)).fetchall()
            
            # Get snapshots
            snapshots = self.db.execute("""
                SELECT * FROM snapshot 
                WHERE session_id = ? 
                ORDER BY timestamp ASC
            """, (session_id,)).fetchall()
            
            # Build export data
            export_data = {
                "session_metadata": dict(session),
                "events": [],
                "snapshots": [],
                "export_timestamp": datetime.now(timezone.utc).isoformat(),
                "privacy_mode": not include_content
            }
            
            # Parse session metadata
            if export_data["session_metadata"].get('metadata'):
                try:
                    export_data["session_metadata"]['metadata'] = \
                        json.loads(export_data["session_metadata"]['metadata'])
                except:
                    pass
            
            # Process events
            for event in events:
                event_data = dict(event)
                try:
                    event_data['data'] = json.loads(event_data['data'])
                    
                    # Privacy filtering
                    if not include_content:
                        if event_data['type'] == 'ai.output' and 'token' in event_data['data']:
                            # Replace token with hash for privacy
                            token = event_data['data']['token']
                            event_data['data']['token_hash'] = hashlib.sha256(token.encode()).hexdigest()[:16]
                            del event_data['data']['token']
                        
                        if event_data['type'] == 'user.prompt' and 'prompt_text' in event_data['data']:
                            # Remove or hash prompt text
                            prompt = event_data['data']['prompt_text']
                            event_data['data']['prompt_hash'] = hashlib.sha256(prompt.encode()).hexdigest()[:16]
                            del event_data['data']['prompt_text']
                    
                except:
                    pass
                
                export_data["events"].append(event_data)
            
            # Process snapshots
            for snapshot in snapshots:
                snapshot_data = dict(snapshot)
                try:
                    snapshot_data['state'] = json.loads(snapshot_data['state'])
                except:
                    pass
                export_data["snapshots"].append(snapshot_data)
            
            # Write output file
            output_file = Path(output_path)
            if format_type == "yaml":
                with open(output_file.with_suffix('.yaml'), 'w') as f:
                    yaml.dump(export_data, f, default_flow_style=False, sort_keys=False)
            else:
                with open(output_file.with_suffix('.json'), 'w') as f:
                    json.dump(export_data, f, indent=2)
            
            logger.info(f"Session {session_id} exported to {output_file}")
            logger.info(f"Events: {len(events)}, Snapshots: {len(snapshots)}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to export session: {e}")
            return False
    
    def list_sessions(self, limit: int = 20) -> bool:
        """List recent sessions"""
        try:
            sessions = self.db.execute("""
                SELECT session_id, user_id, start_time, end_time, 
                       total_energy, total_events, clean_shutdown
                FROM session 
                ORDER BY start_time DESC 
                LIMIT ?
            """, (limit,)).fetchall()
            
            if not sessions:
                print("No sessions found.")
                return True
            
            print(f"\n📋 Recent Sessions (showing {len(sessions)} of max {limit}):")
            print("-" * 100)
            print(f"{'Session ID':<25} {'Start Time':<20} {'Duration':<12} {'Energy':<10} {'Events':<8} {'Status'}")
            print("-" * 100)
            
            for session in sessions:
                session_id = session['session_id']
                start_time = session['start_time'][:16] if session['start_time'] else 'N/A'
                
                # Calculate duration
                if session['end_time']:
                    try:
                        start = datetime.fromisoformat(session['start_time'].replace('Z', '+00:00'))
                        end = datetime.fromisoformat(session['end_time'].replace('Z', '+00:00'))
                        duration = str(end - start).split('.')[0]  # Remove microseconds
                    except:
                        duration = 'N/A'
                else:
                    duration = 'Active'
                
                energy = f"{session['total_energy']:.1f}" if session['total_energy'] else '0.0'
                events = str(session['total_events'] or 0)
                status = '✅ Clean' if session['clean_shutdown'] else '❌ Unclean'
                
                print(f"{session_id:<25} {start_time:<20} {duration:<12} {energy:<10} {events:<8} {status}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to list sessions: {e}")
            return False
    
    def purge_session(self, session_id: str, confirm: bool = False) -> bool:
        """
        Delete a specific session and all its data
        
        Args:
            session_id: Session ID to delete
            confirm: Whether deletion is confirmed
            
        Returns:
            bool: Success status
        """
        try:
            # Check if session exists
            session = self.db.execute("""
                SELECT session_id, start_time, total_events 
                FROM session WHERE session_id = ?
            """, (session_id,)).fetchone()
            
            if not session:
                logger.error(f"Session {session_id} not found")
                return False
            
            if not confirm:
                print(f"⚠️  This will permanently delete session {session_id}")
                print(f"   Start time: {session['start_time']}")
                print(f"   Total events: {session['total_events']}")
                response = input("Are you sure? Type 'DELETE' to confirm: ")
                if response != 'DELETE':
                    print("Deletion cancelled.")
                    return False
            
            # Delete in correct order due to foreign keys
            self.db.execute("BEGIN TRANSACTION")
            
            # Delete snapshots
            snapshot_count = self.db.execute("""
                DELETE FROM snapshot WHERE session_id = ?
            """, (session_id,)).rowcount
            
            # Delete events
            event_count = self.db.execute("""
                DELETE FROM event WHERE session_id = ?
            """, (session_id,)).rowcount
            
            # Delete session
            session_count = self.db.execute("""
                DELETE FROM session WHERE session_id = ?
            """, (session_id,)).rowcount
            
            self.db.execute("COMMIT")
            
            logger.info(f"Session {session_id} deleted successfully")
            logger.info(f"Removed: {session_count} session, {event_count} events, {snapshot_count} snapshots")
            return True
            
        except Exception as e:
            self.db.execute("ROLLBACK")
            logger.error(f"Failed to purge session: {e}")
            return False
    
    def purge_all(self, confirm: bool = False) -> bool:
        """
        Delete ALL user data (nuclear option)
        
        Args:
            confirm: Whether deletion is confirmed
            
        Returns:
            bool: Success status
        """
        try:
            if not confirm:
                print("⚠️  ⚠️  ⚠️  DANGER: This will delete ALL WIRTHFORGE data ⚠️  ⚠️  ⚠️")
                print("This includes:")
                print("- All user profiles and progress")
                print("- All session history")
                print("- All events and energy data")
                print("- All snapshots and backups")
                print("- All audit logs")
                print("\nThis action CANNOT be undone!")
                
                response = input("\nType 'DELETE ALL DATA' to confirm complete data wipe: ")
                if response != 'DELETE ALL DATA':
                    print("Data wipe cancelled.")
                    return False
            
            # Get counts before deletion
            counts = {}
            for table in ['user', 'session', 'event', 'snapshot', 'audit']:
                try:
                    count = self.db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
                    counts[table] = count
                except:
                    counts[table] = 0
            
            # Delete all data
            self.db.execute("BEGIN TRANSACTION")
            
            # Delete in correct order
            tables_to_clear = ['audit', 'snapshot', 'event', 'session', 'user']
            for table in tables_to_clear:
                try:
                    self.db.execute(f"DELETE FROM {table}")
                except Exception as e:
                    logger.warning(f"Could not clear table {table}: {e}")
            
            # Reset auto-increment counters
            self.db.execute("DELETE FROM sqlite_sequence")
            
            # Recreate default user
            self.db.execute("""
                INSERT INTO user (user_id) VALUES ('default')
            """)
            
            self.db.execute("COMMIT")
            
            # Vacuum to reclaim space
            self.db.execute("VACUUM")
            
            logger.info("🗑️  All user data has been permanently deleted")
            for table, count in counts.items():
                if count > 0:
                    logger.info(f"   Deleted {count} records from {table}")
            
            return True
            
        except Exception as e:
            self.db.execute("ROLLBACK")
            logger.error(f"Failed to purge all data: {e}")
            return False
    
    def restore_backup(self, backup_path: str) -> bool:
        """
        Restore from a backup file
        
        Args:
            backup_path: Path to backup file
            
        Returns:
            bool: Success status
        """
        try:
            backup_file = Path(backup_path)
            if not backup_file.exists():
                logger.error(f"Backup file not found: {backup_path}")
                return False
            
            if backup_file.suffix == '.zip':
                return self._restore_from_zip(backup_file)
            elif backup_file.suffix == '.sql':
                return self._restore_from_sql(backup_file)
            elif backup_file.suffix == '.json':
                return self._restore_from_json(backup_file)
            else:
                logger.error(f"Unsupported backup format: {backup_file.suffix}")
                return False
                
        except Exception as e:
            logger.error(f"Restore failed: {e}")
            return False
    
    def _restore_from_zip(self, backup_file: Path) -> bool:
        """Restore from ZIP backup"""
        try:
            with zipfile.ZipFile(backup_file, 'r') as zf:
                # Extract database file
                temp_db = self.db_path.with_suffix('.db.backup')
                zf.extract("wirthforge_state.db", temp_db.parent)
                
                # Replace current database
                if self.db:
                    self.db.close()
                
                shutil.move(temp_db.parent / "wirthforge_state.db", self.db_path)
                
                # Reconnect
                self.connect_database()
                
                logger.info(f"Database restored from ZIP backup: {backup_file}")
                return True
                
        except Exception as e:
            logger.error(f"Failed to restore from ZIP: {e}")
            return False
    
    def _restore_from_sql(self, backup_file: Path) -> bool:
        """Restore from SQL backup"""
        try:
            # Create new database
            if self.db:
                self.db.close()
            
            # Remove existing database
            if self.db_path.exists():
                self.db_path.unlink()
            
            # Create new database and execute SQL
            new_db = sqlite3.connect(self.db_path)
            
            with open(backup_file, 'r') as f:
                sql_script = f.read()
                new_db.executescript(sql_script)
            
            new_db.close()
            
            # Reconnect
            self.connect_database()
            
            logger.info(f"Database restored from SQL backup: {backup_file}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to restore from SQL: {e}")
            return False
    
    def _restore_from_json(self, backup_file: Path) -> bool:
        """Restore from JSON backup"""
        logger.warning("JSON restore not yet implemented - use SQL or ZIP backup instead")
        return False

def main():
    """Command-line interface"""
    parser = argparse.ArgumentParser(description="WIRTHFORGE Backup & Export CLI")
    parser.add_argument("database", help="Path to WIRTHFORGE database")
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Backup command
    backup_parser = subparsers.add_parser("backup", help="Create backup")
    backup_parser.add_argument("output", help="Output path for backup")
    backup_parser.add_argument("--format", choices=["zip", "sql", "json"], 
                              default="zip", help="Backup format")
    backup_parser.add_argument("--include-media", action="store_true", 
                              help="Include media files")
    
    # Export session command
    export_parser = subparsers.add_parser("export", help="Export session data")
    export_parser.add_argument("session_id", help="Session ID to export")
    export_parser.add_argument("output", help="Output file path")
    export_parser.add_argument("--format", choices=["yaml", "json"], 
                              default="yaml", help="Export format")
    export_parser.add_argument("--include-content", action="store_true",
                              help="Include AI-generated content (privacy risk)")
    
    # List sessions command
    list_parser = subparsers.add_parser("list", help="List sessions")
    list_parser.add_argument("--limit", type=int, default=20, 
                            help="Maximum sessions to show")
    
    # Purge commands
    purge_parser = subparsers.add_parser("purge", help="Delete data")
    purge_parser.add_argument("--session", help="Session ID to delete")
    purge_parser.add_argument("--all", action="store_true", 
                             help="Delete ALL data (dangerous)")
    purge_parser.add_argument("--confirm", action="store_true",
                             help="Skip confirmation prompt")
    
    # Restore command
    restore_parser = subparsers.add_parser("restore", help="Restore from backup")
    restore_parser.add_argument("backup_file", help="Path to backup file")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Initialize CLI
    cli = WirthForgeBackupCLI(args.database)
    
    if not cli.connect_database():
        sys.exit(1)
    
    # Execute command
    success = False
    
    try:
        if args.command == "backup":
            success = cli.backup_database(args.output, args.format, args.include_media)
            
        elif args.command == "export":
            success = cli.export_session(args.session_id, args.output, 
                                       args.format, args.include_content)
            
        elif args.command == "list":
            success = cli.list_sessions(args.limit)
            
        elif args.command == "purge":
            if args.all:
                success = cli.purge_all(args.confirm)
            elif args.session:
                success = cli.purge_session(args.session, args.confirm)
            else:
                logger.error("Must specify --session or --all for purge command")
                
        elif args.command == "restore":
            success = cli.restore_backup(args.backup_file)
            
    finally:
        if cli.db:
            cli.db.close()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
