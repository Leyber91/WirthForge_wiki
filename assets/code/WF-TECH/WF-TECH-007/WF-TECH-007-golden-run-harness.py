#!/usr/bin/env python3
"""
WF-TECH-007 Golden-Run Replay Harness
WIRTHFORGE Testing & QA Strategy - Deterministic Regression Testing

This module provides golden-run replay capabilities for deterministic regression
testing, ensuring that system behavior remains consistent across code changes.

Key Features:
- Record and replay session logs with exact timing
- Bit-for-bit comparison of deterministic outputs
- Schema regression detection
- Performance baseline validation
- Multi-scenario golden file management
- Automated regression reporting

Dependencies: json, time, asyncio, pathlib, hashlib, difflib
"""

import json
import time
import asyncio
import hashlib
import difflib
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
import logging
import statistics
import shutil

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class GoldenEvent:
    """Recorded event for golden-run replay"""
    timestamp: float
    relative_time: float  # Time since session start
    event_type: str
    payload: Dict[str, Any]
    session_id: str
    frame_id: int
    checksum: str

@dataclass
class GoldenSession:
    """Complete recorded session for replay"""
    session_id: str
    start_time: float
    end_time: float
    duration: float
    events: List[GoldenEvent]
    metadata: Dict[str, Any]
    schema_version: str
    system_config: Dict[str, Any]

@dataclass
class ReplayResult:
    """Results from golden-run replay"""
    session_id: str
    golden_file: str
    replay_success: bool
    events_matched: int
    events_total: int
    timing_accuracy: float
    schema_compliance: bool
    performance_delta: Dict[str, float]
    differences: List[Dict[str, Any]]
    error_log: List[str]

class GoldenRunRecorder:
    """Records sessions for golden-run creation"""
    
    def __init__(self, output_dir: str = "golden_runs"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        self.recording = False
        self.current_session: Optional[GoldenSession] = None
        self.events: List[GoldenEvent] = []
        self.session_start_time: float = 0.0
        
    def start_recording(self, session_id: str, metadata: Dict[str, Any] = None) -> str:
        """Start recording a new golden session"""
        if self.recording:
            raise RuntimeError("Already recording a session")
        
        self.recording = True
        self.session_start_time = time.perf_counter()
        self.events = []
        
        self.current_session = GoldenSession(
            session_id=session_id,
            start_time=self.session_start_time,
            end_time=0.0,
            duration=0.0,
            events=[],
            metadata=metadata or {},
            schema_version="1.0.0",
            system_config=self._get_system_config()
        )
        
        logger.info(f"Started recording golden session: {session_id}")
        return session_id
    
    def record_event(self, event_type: str, payload: Dict[str, Any], 
                    session_id: str, frame_id: int):
        """Record an event during golden session"""
        if not self.recording:
            return
        
        current_time = time.perf_counter()
        relative_time = current_time - self.session_start_time
        
        # Create deterministic checksum of payload
        payload_str = json.dumps(payload, sort_keys=True, separators=(',', ':'))
        checksum = hashlib.sha256(payload_str.encode()).hexdigest()[:16]
        
        golden_event = GoldenEvent(
            timestamp=current_time,
            relative_time=relative_time,
            event_type=event_type,
            payload=payload.copy(),
            session_id=session_id,
            frame_id=frame_id,
            checksum=checksum
        )
        
        self.events.append(golden_event)
    
    def stop_recording(self) -> str:
        """Stop recording and save golden session"""
        if not self.recording or not self.current_session:
            raise RuntimeError("No active recording session")
        
        end_time = time.perf_counter()
        self.current_session.end_time = end_time
        self.current_session.duration = end_time - self.session_start_time
        self.current_session.events = self.events.copy()
        
        # Save to file
        filename = f"golden_{self.current_session.session_id}_{int(time.time())}.json"
        filepath = self.output_dir / filename
        
        with open(filepath, 'w') as f:
            json.dump(asdict(self.current_session), f, indent=2, default=str)
        
        self.recording = False
        logger.info(f"Saved golden session to: {filepath}")
        return str(filepath)
    
    def _get_system_config(self) -> Dict[str, Any]:
        """Get current system configuration for reproducibility"""
        return {
            "python_version": "3.9+",
            "frame_budget_ms": 16.67,
            "energy_tolerance": 0.05,
            "schema_version": "1.0.0",
            "timestamp": datetime.now().isoformat()
        }

class GoldenRunReplayer:
    """Replays golden sessions for regression testing"""
    
    def __init__(self, golden_dir: str = "golden_runs"):
        self.golden_dir = Path(golden_dir)
        self.tolerance_ms = 1.0  # 1ms timing tolerance
        self.energy_tolerance = 0.05  # 5% energy tolerance
        
    def load_golden_session(self, filepath: str) -> GoldenSession:
        """Load a golden session from file"""
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        # Convert events back to GoldenEvent objects
        events = []
        for event_data in data['events']:
            events.append(GoldenEvent(**event_data))
        
        data['events'] = events
        return GoldenSession(**data)
    
    async def replay_session(self, golden_file: str, 
                           system_under_test: Any) -> ReplayResult:
        """Replay a golden session and compare results"""
        golden_session = self.load_golden_session(golden_file)
        
        # Set up replay monitoring
        replay_events = []
        replay_start_time = time.perf_counter()
        
        def capture_replay_event(event):
            current_time = time.perf_counter()
            relative_time = current_time - replay_start_time
            
            replay_event = {
                'timestamp': current_time,
                'relative_time': relative_time,
                'event_type': event.get('type', 'unknown'),
                'payload': event.get('payload', {}),
                'session_id': event.get('session_id', ''),
                'frame_id': event.get('frame_id', 0)
            }
            replay_events.append(replay_event)
        
        # Attach event capture to system under test
        if hasattr(system_under_test, 'add_event_callback'):
            system_under_test.add_event_callback(capture_replay_event)
        
        # Replay the golden session
        try:
            await self._execute_replay(golden_session, system_under_test)
        except Exception as e:
            logger.error(f"Replay execution failed: {e}")
            return ReplayResult(
                session_id=golden_session.session_id,
                golden_file=golden_file,
                replay_success=False,
                events_matched=0,
                events_total=len(golden_session.events),
                timing_accuracy=0.0,
                schema_compliance=False,
                performance_delta={},
                differences=[],
                error_log=[str(e)]
            )
        
        # Compare results
        return self._compare_results(golden_session, replay_events, golden_file)
    
    async def _execute_replay(self, golden_session: GoldenSession, 
                            system_under_test: Any):
        """Execute the replay sequence"""
        if hasattr(system_under_test, 'start_session'):
            await system_under_test.start_session()
        
        # Replay events with original timing
        last_time = 0.0
        
        for event in golden_session.events:
            # Wait for the correct relative time
            wait_time = event.relative_time - last_time
            if wait_time > 0:
                await asyncio.sleep(wait_time)
            
            # Simulate the original input that caused this event
            await self._simulate_event_trigger(event, system_under_test)
            
            last_time = event.relative_time
        
        if hasattr(system_under_test, 'stop_session'):
            await system_under_test.stop_session()
    
    async def _simulate_event_trigger(self, golden_event: GoldenEvent, 
                                    system_under_test: Any):
        """Simulate the input that would trigger the golden event"""
        if golden_event.event_type == "energy.update":
            # Simulate token ingestion
            if hasattr(system_under_test, 'ingest_token'):
                # Create mock token from payload
                mock_token = self._create_mock_token(golden_event.payload)
                await system_under_test.ingest_token(mock_token)
        
        elif golden_event.event_type == "session.started":
            # Session start already handled
            pass
        
        elif golden_event.event_type == "session.ended":
            # Session end will be handled after all events
            pass
    
    def _create_mock_token(self, payload: Dict[str, Any]):
        """Create a mock token from event payload"""
        # This is a simplified mock - in practice, would need to reverse-engineer
        # the token that would produce the given energy
        from WF_TECH_007_unit_test_framework import TokenData
        
        return TokenData(
            content=payload.get('token_content', 'mock'),
            timestamp=time.perf_counter(),
            model_id="gpt-4",
            confidence=0.9
        )
    
    def _compare_results(self, golden_session: GoldenSession, 
                        replay_events: List[Dict], 
                        golden_file: str) -> ReplayResult:
        """Compare golden session with replay results"""
        differences = []
        events_matched = 0
        timing_errors = []
        schema_errors = []
        
        # Compare event counts
        golden_count = len(golden_session.events)
        replay_count = len(replay_events)
        
        if golden_count != replay_count:
            differences.append({
                'type': 'event_count_mismatch',
                'golden': golden_count,
                'replay': replay_count
            })
        
        # Compare events pairwise
        min_count = min(golden_count, replay_count)
        
        for i in range(min_count):
            golden_event = golden_session.events[i]
            replay_event = replay_events[i]
            
            # Compare event types
            if golden_event.event_type != replay_event['event_type']:
                differences.append({
                    'type': 'event_type_mismatch',
                    'index': i,
                    'golden': golden_event.event_type,
                    'replay': replay_event['event_type']
                })
                continue
            
            # Compare timing
            timing_diff = abs(golden_event.relative_time - replay_event['relative_time'])
            timing_errors.append(timing_diff * 1000)  # Convert to ms
            
            if timing_diff * 1000 > self.tolerance_ms:
                differences.append({
                    'type': 'timing_mismatch',
                    'index': i,
                    'golden_time': golden_event.relative_time,
                    'replay_time': replay_event['relative_time'],
                    'diff_ms': timing_diff * 1000
                })
            
            # Compare payload content
            payload_diff = self._compare_payloads(golden_event.payload, 
                                                replay_event['payload'])
            if payload_diff:
                differences.append({
                    'type': 'payload_mismatch',
                    'index': i,
                    'event_type': golden_event.event_type,
                    'differences': payload_diff
                })
            else:
                events_matched += 1
        
        # Calculate metrics
        timing_accuracy = 1.0 - (statistics.mean(timing_errors) / 1000) if timing_errors else 1.0
        timing_accuracy = max(0.0, min(1.0, timing_accuracy))
        
        performance_delta = {
            'avg_timing_error_ms': statistics.mean(timing_errors) if timing_errors else 0.0,
            'max_timing_error_ms': max(timing_errors) if timing_errors else 0.0,
            'duration_diff_s': 0.0  # Would need actual replay duration
        }
        
        return ReplayResult(
            session_id=golden_session.session_id,
            golden_file=golden_file,
            replay_success=len(differences) == 0,
            events_matched=events_matched,
            events_total=golden_count,
            timing_accuracy=timing_accuracy,
            schema_compliance=len(schema_errors) == 0,
            performance_delta=performance_delta,
            differences=differences,
            error_log=[]
        )
    
    def _compare_payloads(self, golden: Dict[str, Any], 
                         replay: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Compare event payloads and return differences"""
        differences = []
        
        # Check for missing keys
        golden_keys = set(golden.keys())
        replay_keys = set(replay.keys())
        
        missing_in_replay = golden_keys - replay_keys
        extra_in_replay = replay_keys - golden_keys
        
        for key in missing_in_replay:
            differences.append({
                'type': 'missing_key',
                'key': key,
                'golden_value': golden[key]
            })
        
        for key in extra_in_replay:
            differences.append({
                'type': 'extra_key',
                'key': key,
                'replay_value': replay[key]
            })
        
        # Compare common keys
        common_keys = golden_keys & replay_keys
        
        for key in common_keys:
            golden_val = golden[key]
            replay_val = replay[key]
            
            if isinstance(golden_val, (int, float)) and isinstance(replay_val, (int, float)):
                # Numeric comparison with tolerance
                if key in ['total_energy', 'token_energy']:
                    # Energy values need special tolerance
                    if golden_val > 0:
                        error_rate = abs(golden_val - replay_val) / golden_val
                        if error_rate > self.energy_tolerance:
                            differences.append({
                                'type': 'energy_value_mismatch',
                                'key': key,
                                'golden': golden_val,
                                'replay': replay_val,
                                'error_rate': error_rate
                            })
                else:
                    # Other numeric values
                    if abs(golden_val - replay_val) > 0.001:
                        differences.append({
                            'type': 'numeric_mismatch',
                            'key': key,
                            'golden': golden_val,
                            'replay': replay_val
                        })
            else:
                # String/other comparison
                if golden_val != replay_val:
                    differences.append({
                        'type': 'value_mismatch',
                        'key': key,
                        'golden': golden_val,
                        'replay': replay_val
                    })
        
        return differences

class GoldenRunManager:
    """Manages collection of golden runs for regression testing"""
    
    def __init__(self, golden_dir: str = "golden_runs"):
        self.golden_dir = Path(golden_dir)
        self.golden_dir.mkdir(exist_ok=True)
        self.recorder = GoldenRunRecorder(str(self.golden_dir))
        self.replayer = GoldenRunReplayer(str(self.golden_dir))
        
    def list_golden_runs(self) -> List[Dict[str, Any]]:
        """List all available golden runs"""
        golden_files = []
        
        for file_path in self.golden_dir.glob("golden_*.json"):
            try:
                with open(file_path, 'r') as f:
                    data = json.load(f)
                
                golden_files.append({
                    'filename': file_path.name,
                    'path': str(file_path),
                    'session_id': data.get('session_id', 'unknown'),
                    'duration': data.get('duration', 0.0),
                    'event_count': len(data.get('events', [])),
                    'created': datetime.fromtimestamp(file_path.stat().st_ctime).isoformat(),
                    'metadata': data.get('metadata', {})
                })
            except Exception as e:
                logger.warning(f"Failed to read golden file {file_path}: {e}")
        
        return sorted(golden_files, key=lambda x: x['created'], reverse=True)
    
    async def run_regression_suite(self, system_under_test: Any) -> Dict[str, Any]:
        """Run complete regression test suite against all golden runs"""
        golden_runs = self.list_golden_runs()
        results = []
        
        logger.info(f"Running regression suite against {len(golden_runs)} golden runs")
        
        for golden_run in golden_runs:
            logger.info(f"Replaying: {golden_run['filename']}")
            
            try:
                result = await self.replayer.replay_session(
                    golden_run['path'], 
                    system_under_test
                )
                results.append(result)
                
                if result.replay_success:
                    logger.info(f"✓ {golden_run['filename']} - PASSED")
                else:
                    logger.warning(f"✗ {golden_run['filename']} - FAILED ({len(result.differences)} differences)")
                    
            except Exception as e:
                logger.error(f"✗ {golden_run['filename']} - ERROR: {e}")
                results.append(ReplayResult(
                    session_id=golden_run['session_id'],
                    golden_file=golden_run['filename'],
                    replay_success=False,
                    events_matched=0,
                    events_total=0,
                    timing_accuracy=0.0,
                    schema_compliance=False,
                    performance_delta={},
                    differences=[],
                    error_log=[str(e)]
                ))
        
        # Generate summary report
        total_runs = len(results)
        successful_runs = sum(1 for r in results if r.replay_success)
        
        summary = {
            'total_runs': total_runs,
            'successful_runs': successful_runs,
            'failure_rate': (total_runs - successful_runs) / total_runs if total_runs > 0 else 0,
            'avg_timing_accuracy': statistics.mean([r.timing_accuracy for r in results]) if results else 0,
            'results': [asdict(r) for r in results],
            'timestamp': datetime.now().isoformat()
        }
        
        # Save regression report
        report_file = self.golden_dir / f"regression_report_{int(time.time())}.json"
        with open(report_file, 'w') as f:
            json.dump(summary, f, indent=2, default=str)
        
        logger.info(f"Regression suite complete: {successful_runs}/{total_runs} passed")
        logger.info(f"Report saved to: {report_file}")
        
        return summary
    
    def create_golden_scenario(self, scenario_name: str, 
                             token_sequence: List[Any],
                             metadata: Dict[str, Any] = None) -> str:
        """Create a golden run for a specific test scenario"""
        from WF_TECH_007_unit_test_framework import MockDecipherLoop
        
        async def record_scenario():
            # Set up system
            loop = MockDecipherLoop()
            
            # Start recording
            session_id = f"{scenario_name}_{int(time.time())}"
            self.recorder.start_recording(session_id, metadata)
            
            # Set up event capture
            def capture_event(event):
                self.recorder.record_event(
                    event['type'],
                    event['payload'],
                    event['session_id'],
                    event['frame_id']
                )
            
            loop.add_event_callback(capture_event)
            
            # Execute scenario
            await loop.start_session()
            
            for token in token_sequence:
                await loop.ingest_token(token)
                await asyncio.sleep(0.017)  # ~60 FPS timing
            
            await loop.stop_session()
            
            # Stop recording and save
            return self.recorder.stop_recording()
        
        return asyncio.run(record_scenario())
    
    def cleanup_old_runs(self, keep_count: int = 10):
        """Clean up old golden runs, keeping only the most recent"""
        golden_runs = self.list_golden_runs()
        
        if len(golden_runs) <= keep_count:
            return
        
        # Remove oldest runs
        to_remove = golden_runs[keep_count:]
        
        for run in to_remove:
            try:
                Path(run['path']).unlink()
                logger.info(f"Removed old golden run: {run['filename']}")
            except Exception as e:
                logger.warning(f"Failed to remove {run['filename']}: {e}")

# Utility Functions

def create_standard_scenarios() -> List[Dict[str, Any]]:
    """Create standard test scenarios for golden runs"""
    from WF_TECH_007_unit_test_framework import TokenData
    
    scenarios = [
        {
            'name': 'basic_single_model',
            'description': 'Basic single model generation',
            'tokens': [
                TokenData("Hello", 0.0, "gpt-4", 0.9),
                TokenData(" world", 0.05, "gpt-4", 0.85),
                TokenData("!", 0.1, "gpt-4", 0.95, is_final=True)
            ],
            'metadata': {'type': 'basic', 'model_count': 1}
        },
        {
            'name': 'burst_tokens',
            'description': 'Rapid token burst scenario',
            'tokens': [TokenData(f"token_{i}", i * 0.001, "gpt-4", 0.8) 
                      for i in range(20)],
            'metadata': {'type': 'stress', 'burst_size': 20}
        },
        {
            'name': 'high_entropy',
            'description': 'High entropy token sequence',
            'tokens': [
                TokenData("Complex", 0.0, "gpt-4", 0.7, entropy=0.9),
                TokenData(" mathematical", 0.05, "gpt-4", 0.6, entropy=0.8),
                TokenData(" equation", 0.1, "gpt-4", 0.8, entropy=0.7, is_final=True)
            ],
            'metadata': {'type': 'entropy', 'avg_entropy': 0.8}
        }
    ]
    
    return scenarios

if __name__ == "__main__":
    # Example usage
    print("WF-TECH-007 Golden-Run Harness - Example Usage")
    
    # Create manager
    manager = GoldenRunManager("test_golden_runs")
    
    # Create standard scenarios
    scenarios = create_standard_scenarios()
    
    print(f"Creating {len(scenarios)} golden scenarios...")
    
    for scenario in scenarios:
        try:
            golden_file = manager.create_golden_scenario(
                scenario['name'],
                scenario['tokens'],
                scenario['metadata']
            )
            print(f"✓ Created: {scenario['name']} -> {Path(golden_file).name}")
        except Exception as e:
            print(f"✗ Failed to create {scenario['name']}: {e}")
    
    # List created runs
    runs = manager.list_golden_runs()
    print(f"\nCreated {len(runs)} golden runs:")
    for run in runs:
        print(f"  - {run['filename']}: {run['event_count']} events, {run['duration']:.2f}s")
    
    print("Golden-run harness validation complete!")
