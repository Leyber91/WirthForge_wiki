#!/usr/bin/env python3
"""
WF-TECH-004 Replay/Debug Tool
WIRTHFORGE State Management & Storage System

This tool reads events from a session log and replays them through a simulated
pipeline to reproduce outputs and validate deterministic behavior.

Version: 1.0.0
Compatible with: Python 3.11+, SQLite 3.35+
"""

import sqlite3
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
import argparse
import sys
from dataclasses import dataclass, asdict
import time

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class ReplayState:
    """State tracking during replay"""
    frame_id: int = 0
    energy_accumulator: float = 0.0
    token_count: int = 0
    interference_events: int = 0
    resonance_events: int = 0
    model_contributions: Dict[str, Dict[str, Any]] = None
    energy_peaks: List[Dict[str, Any]] = None
    last_timestamp: str = ""
    
    def __post_init__(self):
        if self.model_contributions is None:
            self.model_contributions = {}
        if self.energy_peaks is None:
            self.energy_peaks = []

class EventReplayer:
    """
    Event replay system for debugging and validation
    """
    
    def __init__(self, db_path: str = None, json_file: str = None):
        self.db_path = Path(db_path) if db_path else None
        self.json_file = Path(json_file) if json_file else None
        self.db: Optional[sqlite3.Connection] = None
        self.replay_state = ReplayState()
        self.events: List[Dict[str, Any]] = []
        self.replay_log: List[Dict[str, Any]] = []
        self.validation_errors: List[str] = []
        
    def load_events_from_db(self, session_id: str) -> bool:
        """Load events from database for a specific session"""
        try:
            if not self.db_path or not self.db_path.exists():
                logger.error(f"Database file not found: {self.db_path}")
                return False
                
            self.db = sqlite3.connect(self.db_path, check_same_thread=False)
            self.db.row_factory = sqlite3.Row
            
            # Get session info
            session_info = self.db.execute("""
                SELECT session_id, user_id, start_time, end_time, total_energy, 
                       total_events, clean_shutdown
                FROM session WHERE session_id = ?
            """, (session_id,)).fetchone()
            
            if not session_info:
                logger.error(f"Session {session_id} not found")
                return False
            
            logger.info(f"Loading session: {session_info['session_id']}")
            logger.info(f"Duration: {session_info['start_time']} to {session_info['end_time']}")
            logger.info(f"Total energy: {session_info['total_energy']}, Events: {session_info['total_events']}")
            
            # Load events in chronological order
            events_cursor = self.db.execute("""
                SELECT event_id, timestamp, type, data, frame_id, energy_delta
                FROM event 
                WHERE session_id = ?
                ORDER BY timestamp ASC
            """, (session_id,))
            
            self.events = []
            for row in events_cursor:
                event = {
                    'event_id': row['event_id'],
                    'timestamp': row['timestamp'],
                    'type': row['type'],
                    'data': json.loads(row['data']),
                    'frame_id': row['frame_id'],
                    'energy_delta': row['energy_delta']
                }
                self.events.append(event)
            
            logger.info(f"Loaded {len(self.events)} events for replay")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load events from database: {e}")
            return False
    
    def load_events_from_json(self) -> bool:
        """Load events from JSON file"""
        try:
            if not self.json_file or not self.json_file.exists():
                logger.error(f"JSON file not found: {self.json_file}")
                return False
            
            with open(self.json_file, 'r') as f:
                data = json.load(f)
            
            # Handle different JSON formats
            if 'events' in data:
                # YAML audit format
                self.events = data['events']
            elif isinstance(data, list):
                # Direct event list
                self.events = data
            else:
                logger.error("Unrecognized JSON format")
                return False
            
            logger.info(f"Loaded {len(self.events)} events from JSON file")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load events from JSON: {e}")
            return False
    
    def replay_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Replay a single event and update state
        
        Args:
            event: Event to replay
            
        Returns:
            Dict containing replay result and state changes
        """
        event_type = event['type']
        event_data = event['data']
        timestamp = event['timestamp']
        
        result = {
            'event_id': event.get('event_id'),
            'timestamp': timestamp,
            'type': event_type,
            'state_before': asdict(self.replay_state),
            'state_changes': {},
            'validation_notes': []
        }
        
        try:
            # Process different event types
            if event_type == "system.start":
                self._replay_system_start(event_data, result)
                
            elif event_type == "system.end":
                self._replay_system_end(event_data, result)
                
            elif event_type == "energy.update":
                self._replay_energy_update(event, result)
                
            elif event_type == "energy.peak":
                self._replay_energy_peak(event_data, result)
                
            elif event_type == "user.prompt":
                self._replay_user_prompt(event_data, result)
                
            elif event_type == "ai.output":
                self._replay_ai_output(event_data, result)
                
            elif event_type == "ai.response_complete":
                self._replay_ai_response_complete(event_data, result)
                
            elif event_type == "pattern.interference":
                self._replay_pattern_interference(event_data, result)
                
            elif event_type == "pattern.resonance":
                self._replay_pattern_resonance(event_data, result)
                
            elif event_type == "health.heartbeat":
                self._replay_health_heartbeat(event_data, result)
                
            else:
                result['validation_notes'].append(f"Unknown event type: {event_type}")
            
            # Update last timestamp
            self.replay_state.last_timestamp = timestamp
            result['state_after'] = asdict(self.replay_state)
            
        except Exception as e:
            result['error'] = str(e)
            result['validation_notes'].append(f"Replay error: {e}")
        
        return result
    
    def _replay_system_start(self, data: Dict[str, Any], result: Dict[str, Any]):
        """Replay system start event"""
        # Reset state for new session
        self.replay_state = ReplayState()
        result['state_changes']['session_started'] = True
        result['validation_notes'].append(f"Session started with version {data.get('version')}")
    
    def _replay_system_end(self, data: Dict[str, Any], result: Dict[str, Any]):
        """Replay system end event"""
        expected_energy = data.get('total_energy', 0)
        actual_energy = self.replay_state.energy_accumulator
        
        if abs(expected_energy - actual_energy) > 0.01:
            self.validation_errors.append(
                f"Energy mismatch at session end: expected={expected_energy}, "
                f"actual={actual_energy}"
            )
        
        result['state_changes']['session_ended'] = True
        result['validation_notes'].append(
            f"Session ended: duration={data.get('duration_ms')}ms, "
            f"clean={data.get('clean_shutdown')}"
        )
    
    def _replay_energy_update(self, event: Dict[str, Any], result: Dict[str, Any]):
        """Replay energy update event"""
        data = event['data']
        frame_id = event.get('frame_id', 0)
        
        # Update energy accumulator
        energy = data.get('energy', 0)
        accumulator = data.get('accumulator', 0)
        
        # Validate accumulator consistency
        expected_accumulator = self.replay_state.energy_accumulator + energy
        if abs(accumulator - expected_accumulator) > 0.01:
            result['validation_notes'].append(
                f"Accumulator inconsistency: expected={expected_accumulator:.2f}, "
                f"actual={accumulator:.2f}"
            )
        
        self.replay_state.energy_accumulator = accumulator
        self.replay_state.frame_id = frame_id
        
        # Update model contributions
        model_id = data.get('model_id', 'unknown')
        if model_id not in self.replay_state.model_contributions:
            self.replay_state.model_contributions[model_id] = {
                'energy': 0.0,
                'tokens': 0,
                'frames': 0
            }
        
        self.replay_state.model_contributions[model_id]['energy'] += energy
        self.replay_state.model_contributions[model_id]['frames'] += 1
        
        result['state_changes'].update({
            'energy_added': energy,
            'new_accumulator': accumulator,
            'frame_id': frame_id,
            'fps': data.get('fps', 0)
        })
        
        # Validate frame rate
        fps = data.get('fps', 60)
        if fps < 30:
            result['validation_notes'].append(f"Low FPS detected: {fps}")
        
        # Validate frame budget
        frame_budget = data.get('frame_budget_used', 0)
        if frame_budget > 16.67:
            result['validation_notes'].append(f"Frame budget exceeded: {frame_budget}ms")
    
    def _replay_energy_peak(self, data: Dict[str, Any], result: Dict[str, Any]):
        """Replay energy peak event"""
        peak_data = {
            'timestamp': self.replay_state.last_timestamp,
            'energy': data.get('energy', 0),
            'threshold': data.get('threshold', 0),
            'model_id': data.get('model_id', 'unknown')
        }
        
        self.replay_state.energy_peaks.append(peak_data)
        result['state_changes']['energy_peak_recorded'] = peak_data
    
    def _replay_user_prompt(self, data: Dict[str, Any], result: Dict[str, Any]):
        """Replay user prompt event"""
        prompt_id = data.get('prompt_id', 'unknown')
        interface = data.get('interface', 'text')
        
        result['state_changes'].update({
            'prompt_received': prompt_id,
            'interface': interface,
            'length': data.get('length', 0)
        })
    
    def _replay_ai_output(self, data: Dict[str, Any], result: Dict[str, Any]):
        """Replay AI output event"""
        model_id = data.get('model_id', 'unknown')
        token_index = data.get('token_index', 0)
        
        # Update token count
        self.replay_state.token_count += 1
        
        # Update model contributions
        if model_id not in self.replay_state.model_contributions:
            self.replay_state.model_contributions[model_id] = {
                'energy': 0.0,
                'tokens': 0,
                'frames': 0
            }
        
        self.replay_state.model_contributions[model_id]['tokens'] += 1
        
        result['state_changes'].update({
            'token_generated': token_index,
            'model_id': model_id,
            'is_last': data.get('is_last', False),
            'total_tokens': self.replay_state.token_count
        })
    
    def _replay_ai_response_complete(self, data: Dict[str, Any], result: Dict[str, Any]):
        """Replay AI response complete event"""
        total_tokens = data.get('total_tokens', 0)
        generation_time = data.get('generation_time_ms', 0)
        
        result['state_changes'].update({
            'response_completed': True,
            'total_tokens': total_tokens,
            'generation_time_ms': generation_time,
            'tokens_per_second': data.get('tokens_per_second', 0)
        })
    
    def _replay_pattern_interference(self, data: Dict[str, Any], result: Dict[str, Any]):
        """Replay interference pattern event"""
        self.replay_state.interference_events += 1
        
        result['state_changes'].update({
            'interference_detected': True,
            'models_involved': data.get('models_involved', []),
            'interference_type': data.get('interference_type', 'unknown'),
            'strength': data.get('strength', 0),
            'total_interference_events': self.replay_state.interference_events
        })
    
    def _replay_pattern_resonance(self, data: Dict[str, Any], result: Dict[str, Any]):
        """Replay resonance pattern event"""
        self.replay_state.resonance_events += 1
        
        result['state_changes'].update({
            'resonance_detected': True,
            'models_involved': data.get('models_involved', []),
            'frequency': data.get('resonance_frequency', 0),
            'amplitude': data.get('amplitude', 0),
            'synchronization': data.get('synchronization_level', 0),
            'total_resonance_events': self.replay_state.resonance_events
        })
    
    def _replay_health_heartbeat(self, data: Dict[str, Any], result: Dict[str, Any]):
        """Replay health heartbeat event"""
        result['state_changes'].update({
            'health_check': True,
            'system_health': data.get('system_health', 'unknown'),
            'fps': data.get('fps', 0),
            'memory_usage_mb': data.get('memory_usage_mb', 0)
        })
    
    def run_replay(self, verbose: bool = False, validate: bool = True) -> Dict[str, Any]:
        """
        Run complete event replay
        
        Args:
            verbose: Whether to output detailed replay information
            validate: Whether to perform validation checks
            
        Returns:
            Dict containing replay results and statistics
        """
        if not self.events:
            logger.error("No events loaded for replay")
            return {"error": "No events to replay"}
        
        logger.info(f"Starting replay of {len(self.events)} events")
        start_time = time.time()
        
        # Process each event
        for i, event in enumerate(self.events):
            result = self.replay_event(event)
            self.replay_log.append(result)
            
            if verbose:
                self._print_event_result(result, i + 1)
            
            # Progress indicator for large replays
            if len(self.events) > 100 and (i + 1) % 100 == 0:
                logger.info(f"Processed {i + 1}/{len(self.events)} events")
        
        replay_time = time.time() - start_time
        
        # Generate summary
        summary = self._generate_replay_summary(replay_time)
        
        if validate:
            self._run_validation_checks(summary)
        
        logger.info(f"Replay completed in {replay_time:.2f} seconds")
        
        return summary
    
    def _print_event_result(self, result: Dict[str, Any], event_num: int):
        """Print detailed event replay result"""
        print(f"\n--- Event {event_num}: {result['type']} ---")
        print(f"Timestamp: {result['timestamp']}")
        
        if result.get('error'):
            print(f"❌ Error: {result['error']}")
        
        if result['state_changes']:
            print("State Changes:")
            for key, value in result['state_changes'].items():
                print(f"  {key}: {value}")
        
        if result['validation_notes']:
            print("Validation Notes:")
            for note in result['validation_notes']:
                print(f"  ⚠️  {note}")
    
    def _generate_replay_summary(self, replay_time: float) -> Dict[str, Any]:
        """Generate replay summary statistics"""
        event_types = {}
        errors = 0
        warnings = 0
        
        for result in self.replay_log:
            event_type = result['type']
            event_types[event_type] = event_types.get(event_type, 0) + 1
            
            if result.get('error'):
                errors += 1
            
            warnings += len(result.get('validation_notes', []))
        
        return {
            'replay_statistics': {
                'total_events': len(self.events),
                'replay_time_seconds': replay_time,
                'events_per_second': len(self.events) / replay_time if replay_time > 0 else 0,
                'errors': errors,
                'warnings': warnings
            },
            'event_type_distribution': event_types,
            'final_state': asdict(self.replay_state),
            'validation_errors': self.validation_errors,
            'replay_log': self.replay_log if len(self.replay_log) <= 50 else self.replay_log[:50]  # Limit output
        }
    
    def _run_validation_checks(self, summary: Dict[str, Any]):
        """Run additional validation checks on replay results"""
        final_state = self.replay_state
        
        # Check energy conservation
        total_model_energy = sum(
            contrib['energy'] for contrib in final_state.model_contributions.values()
        )
        
        if abs(total_model_energy - final_state.energy_accumulator) > 0.01:
            self.validation_errors.append(
                f"Energy conservation violation: model_total={total_model_energy:.2f}, "
                f"accumulator={final_state.energy_accumulator:.2f}"
            )
        
        # Check token consistency
        total_model_tokens = sum(
            contrib['tokens'] for contrib in final_state.model_contributions.values()
        )
        
        if total_model_tokens != final_state.token_count:
            self.validation_errors.append(
                f"Token count mismatch: model_total={total_model_tokens}, "
                f"state_total={final_state.token_count}"
            )
        
        # Update summary with validation results
        summary['validation_errors'].extend(self.validation_errors)
        summary['validation_passed'] = len(self.validation_errors) == 0

def main():
    """Command-line interface for the replay tool"""
    parser = argparse.ArgumentParser(description="WIRTHFORGE Event Replay Tool")
    parser.add_argument("--database", help="Path to SQLite database file")
    parser.add_argument("--session", help="Session ID to replay (required with --database)")
    parser.add_argument("--json", help="Path to JSON event file")
    parser.add_argument("--output", help="Output file for replay results (JSON)")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--no-validate", action="store_true", help="Skip validation checks")
    
    args = parser.parse_args()
    
    if not args.database and not args.json:
        parser.error("Either --database or --json must be specified")
    
    if args.database and not args.session:
        parser.error("--session is required when using --database")
    
    # Create replayer
    replayer = EventReplayer(args.database, args.json)
    
    # Load events
    if args.database:
        if not replayer.load_events_from_db(args.session):
            sys.exit(1)
    else:
        if not replayer.load_events_from_json():
            sys.exit(1)
    
    # Run replay
    results = replayer.run_replay(
        verbose=args.verbose,
        validate=not args.no_validate
    )
    
    # Output results
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        logger.info(f"Replay results saved to {args.output}")
    
    # Print summary
    stats = results['replay_statistics']
    print(f"\n🎬 Replay Summary:")
    print(f"Events processed: {stats['total_events']}")
    print(f"Replay time: {stats['replay_time_seconds']:.2f}s")
    print(f"Processing rate: {stats['events_per_second']:.1f} events/sec")
    print(f"Errors: {stats['errors']}")
    print(f"Warnings: {stats['warnings']}")
    
    if results.get('validation_errors'):
        print(f"\n❌ Validation Errors:")
        for error in results['validation_errors']:
            print(f"  {error}")
        sys.exit(1)
    else:
        print(f"\n✅ Replay completed successfully!")
        sys.exit(0)

if __name__ == "__main__":
    main()
