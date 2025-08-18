#!/usr/bin/env python3
"""
WF-TECH-004 Snapshot & Recovery Implementation
WIRTHFORGE State Management & Storage System

This module provides reference implementation for snapshot creation and recovery
processes, enabling crash recovery and deterministic state restoration.

Version: 1.0.0
Compatible with: Python 3.11+, SQLite 3.35+, asyncio
"""

import asyncio
import json
import sqlite3
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
import hashlib
import gzip
import pickle

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class FrameState:
    """Current frame-level energy state (ephemeral, 60Hz updates)"""
    frame_id: int
    timestamp: str
    energy_current: float
    energy_delta: float = 0.0
    fps: float = 60.0
    frame_budget_used: float = 0.0
    model_active: str = ""
    pattern_state: Dict[str, Any] = None
    diversity_index: Dict[str, float] = None

    def __post_init__(self):
        if self.pattern_state is None:
            self.pattern_state = {
                "interference_detected": False,
                "resonance_detected": False,
                "synchronization_level": 0.0,
                "harmony_frequency": 0.0
            }
        if self.diversity_index is None:
            self.diversity_index = {
                "current": 0.0,
                "smoothed": 0.0,
                "peak": 0.0,
                "variance": 0.0
            }

@dataclass
class EnergyAccumulator:
    """Running totals and accumulated energy metrics"""
    total_energy: float
    session_start: str
    frame_count: int
    token_count: int = 0
    energy_peaks: List[Dict[str, Any]] = None
    model_contributions: Dict[str, Dict[str, Any]] = None
    interference_events: int = 0
    resonance_events: int = 0

    def __post_init__(self):
        if self.energy_peaks is None:
            self.energy_peaks = []
        if self.model_contributions is None:
            self.model_contributions = {}

@dataclass
class SessionContext:
    """Session-level context and metadata"""
    session_id: str
    user_id: str
    hardware_tier: str
    models_available: List[str] = None
    session_mode: str = "normal"
    features_enabled: List[str] = None

    def __post_init__(self):
        if self.models_available is None:
            self.models_available = []
        if self.features_enabled is None:
            self.features_enabled = []

@dataclass
class StateSnapshot:
    """Complete state snapshot for recovery"""
    frame_state: FrameState
    energy_accumulator: EnergyAccumulator
    session_context: SessionContext
    performance_metrics: Dict[str, Any] = None
    recovery_context: Dict[str, Any] = None
    schema_version: str = "1.0.0"
    created_at: str = ""
    updated_at: str = ""

    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now(timezone.utc).isoformat()
        if not self.updated_at:
            self.updated_at = self.created_at
        if self.performance_metrics is None:
            self.performance_metrics = {}
        if self.recovery_context is None:
            self.recovery_context = {
                "last_snapshot_id": None,
                "last_event_id": None,
                "incomplete_operations": [],
                "clean_shutdown": True
            }

class StateManager:
    """
    State Manager for WIRTHFORGE with snapshot and recovery capabilities
    """
    
    def __init__(self, db_path: str = "wirthforge_state.db"):
        self.db_path = Path(db_path)
        self.current_state: Optional[StateSnapshot] = None
        self.event_queue: asyncio.Queue = asyncio.Queue()
        self.background_writer_task: Optional[asyncio.Task] = None
        self.is_running = False
        
    async def initialize(self) -> bool:
        """Initialize state manager and check for recovery needs"""
        try:
            # Initialize database connection
            self.db = sqlite3.connect(self.db_path, check_same_thread=False)
            self.db.execute("PRAGMA foreign_keys = ON")
            
            # Check for unclean shutdown
            unclean_sessions = self.db.execute("""
                SELECT session_id, start_time, total_energy, total_events 
                FROM session 
                WHERE end_time IS NULL OR clean_shutdown = FALSE
                ORDER BY start_time DESC
                LIMIT 1
            """).fetchone()
            
            if unclean_sessions:
                logger.info(f"Unclean shutdown detected for session: {unclean_sessions[0]}")
                success = await self.recover_from_crash(unclean_sessions[0])
                if not success:
                    logger.error("Failed to recover from crash")
                    return False
            else:
                logger.info("Clean startup - no recovery needed")
                
            # Start background writer
            self.background_writer_task = asyncio.create_task(self._background_writer())
            self.is_running = True
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize state manager: {e}")
            return False
    
    async def recover_from_crash(self, session_id: str) -> bool:
        """
        Recover state from the most recent snapshot and replay events
        
        Args:
            session_id: Session ID to recover
            
        Returns:
            bool: True if recovery successful, False otherwise
        """
        try:
            logger.info(f"Starting crash recovery for session: {session_id}")
            
            # Step 1: Find the latest snapshot for this session
            snapshot_row = self.db.execute("""
                SELECT snapshot_id, timestamp, state, last_event_id, 
                       energy_accumulator, frame_count, schema_version
                FROM snapshot 
                WHERE session_id = ? 
                ORDER BY timestamp DESC 
                LIMIT 1
            """, (session_id,)).fetchone()
            
            if snapshot_row:
                snapshot_id, snapshot_timestamp, state_json, last_event_id, \
                energy_acc, frame_count, schema_version = snapshot_row
                
                logger.info(f"Found snapshot {snapshot_id} from {snapshot_timestamp}")
                
                # Step 2: Deserialize snapshot state
                state_data = json.loads(state_json)
                
                # Handle schema version compatibility
                if schema_version != "1.0.0":
                    state_data = await self._migrate_snapshot_schema(state_data, schema_version)
                
                # Reconstruct state objects
                self.current_state = self._deserialize_state(state_data)
                
                # Step 3: Get events after snapshot
                events_to_replay = self.db.execute("""
                    SELECT event_id, timestamp, type, data, frame_id, energy_delta
                    FROM event 
                    WHERE session_id = ? AND timestamp > ?
                    ORDER BY timestamp ASC
                """, (session_id, snapshot_timestamp)).fetchall()
                
                logger.info(f"Found {len(events_to_replay)} events to replay")
                
                # Step 4: Replay events in order
                for event_row in events_to_replay:
                    event_id, timestamp, event_type, data_json, frame_id, energy_delta = event_row
                    event_data = json.loads(data_json)
                    
                    await self._replay_event({
                        'event_id': event_id,
                        'timestamp': timestamp,
                        'type': event_type,
                        'data': event_data,
                        'frame_id': frame_id,
                        'energy_delta': energy_delta
                    })
                
                # Step 5: Update recovery context
                self.current_state.recovery_context.update({
                    "last_snapshot_id": snapshot_id,
                    "last_event_id": events_to_replay[-1][0] if events_to_replay else last_event_id,
                    "clean_shutdown": False
                })
                
                logger.info("Crash recovery completed successfully")
                return True
                
            else:
                logger.warning(f"No snapshot found for session {session_id}, starting fresh")
                return await self._initialize_fresh_session(session_id)
                
        except Exception as e:
            logger.error(f"Crash recovery failed: {e}")
            return False
    
    async def _replay_event(self, event: Dict[str, Any]) -> None:
        """
        Replay a single event to update state
        
        Args:
            event: Event dictionary to replay
        """
        event_type = event['type']
        event_data = event['data']
        
        try:
            if event_type == "energy.update":
                # Update energy accumulator
                self.current_state.energy_accumulator.total_energy = event_data['accumulator']
                self.current_state.energy_accumulator.frame_count = event['frame_id']
                if 'token_count' in event_data:
                    self.current_state.energy_accumulator.token_count = event_data['token_count']
                
                # Update frame state
                self.current_state.frame_state.frame_id = event['frame_id']
                self.current_state.frame_state.energy_current = event_data['energy']
                self.current_state.frame_state.timestamp = event['timestamp']
                if 'fps' in event_data:
                    self.current_state.frame_state.fps = event_data['fps']
                
            elif event_type == "pattern.interference":
                self.current_state.energy_accumulator.interference_events += 1
                self.current_state.frame_state.pattern_state["interference_detected"] = True
                
            elif event_type == "pattern.resonance":
                self.current_state.energy_accumulator.resonance_events += 1
                self.current_state.frame_state.pattern_state["resonance_detected"] = True
                if 'synchronization_level' in event_data:
                    self.current_state.frame_state.pattern_state["synchronization_level"] = \
                        event_data['synchronization_level']
                
            elif event_type == "energy.peak":
                peak_data = {
                    "timestamp": event['timestamp'],
                    "energy": event_data['energy'],
                    "frame_id": event.get('frame_id')
                }
                self.current_state.energy_accumulator.energy_peaks.append(peak_data)
                
            elif event_type.startswith("ai."):
                # Update model contributions
                model_id = event_data.get('model_id', 'unknown')
                if model_id not in self.current_state.energy_accumulator.model_contributions:
                    self.current_state.energy_accumulator.model_contributions[model_id] = {
                        "energy": 0.0,
                        "tokens": 0,
                        "frames": 0
                    }
                
                if event['energy_delta']:
                    self.current_state.energy_accumulator.model_contributions[model_id]["energy"] += \
                        event['energy_delta']
                
                if event_type == "ai.output":
                    self.current_state.energy_accumulator.model_contributions[model_id]["tokens"] += 1
                    
            # Update timestamp
            self.current_state.updated_at = event['timestamp']
            
        except Exception as e:
            logger.warning(f"Failed to replay event {event['event_id']}: {e}")
    
    async def create_snapshot(self, session_id: str, snapshot_type: str = "periodic") -> Optional[int]:
        """
        Create a state snapshot for crash recovery
        
        Args:
            session_id: Session ID to snapshot
            snapshot_type: Type of snapshot (periodic, session_end, migration, manual)
            
        Returns:
            int: Snapshot ID if successful, None otherwise
        """
        if not self.current_state:
            logger.warning("No current state to snapshot")
            return None
            
        try:
            # Serialize current state
            state_data = {
                "frame_state": asdict(self.current_state.frame_state),
                "energy_accumulator": asdict(self.current_state.energy_accumulator),
                "session_context": asdict(self.current_state.session_context),
                "performance_metrics": self.current_state.performance_metrics,
                "recovery_context": self.current_state.recovery_context,
                "schema_version": self.current_state.schema_version
            }
            
            state_json = json.dumps(state_data, separators=(',', ':'))
            
            # Compress if large
            compressed = False
            if len(state_json) > 1024:  # Compress if > 1KB
                state_json = gzip.compress(state_json.encode()).decode('latin1')
                compressed = True
            
            timestamp = datetime.now(timezone.utc).isoformat()
            
            # Insert snapshot record
            cursor = self.db.execute("""
                INSERT INTO snapshot (
                    session_id, timestamp, snapshot_type, state, 
                    energy_accumulator, frame_count, schema_version
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                session_id,
                timestamp,
                snapshot_type,
                state_json,
                self.current_state.energy_accumulator.total_energy,
                self.current_state.energy_accumulator.frame_count,
                self.current_state.schema_version
            ))
            
            snapshot_id = cursor.lastrowid
            self.db.commit()
            
            logger.info(f"Created snapshot {snapshot_id} (type: {snapshot_type}, "
                       f"compressed: {compressed}, size: {len(state_json)} bytes)")
            
            return snapshot_id
            
        except Exception as e:
            logger.error(f"Failed to create snapshot: {e}")
            return None
    
    def _deserialize_state(self, state_data: Dict[str, Any]) -> StateSnapshot:
        """
        Deserialize state data into StateSnapshot object
        
        Args:
            state_data: Serialized state dictionary
            
        Returns:
            StateSnapshot: Reconstructed state object
        """
        frame_state = FrameState(**state_data["frame_state"])
        energy_accumulator = EnergyAccumulator(**state_data["energy_accumulator"])
        session_context = SessionContext(**state_data["session_context"])
        
        return StateSnapshot(
            frame_state=frame_state,
            energy_accumulator=energy_accumulator,
            session_context=session_context,
            performance_metrics=state_data.get("performance_metrics", {}),
            recovery_context=state_data.get("recovery_context", {}),
            schema_version=state_data.get("schema_version", "1.0.0"),
            created_at=state_data.get("created_at", ""),
            updated_at=state_data.get("updated_at", "")
        )
    
    async def _migrate_snapshot_schema(self, state_data: Dict[str, Any], 
                                     from_version: str) -> Dict[str, Any]:
        """
        Migrate snapshot schema from older version to current
        
        Args:
            state_data: State data in old schema
            from_version: Source schema version
            
        Returns:
            Dict: Migrated state data
        """
        logger.info(f"Migrating snapshot schema from {from_version} to 1.0.0")
        
        # Example migration logic (would be expanded for real migrations)
        if from_version == "0.9.0":
            # Add new fields with defaults
            if "diversity_index" not in state_data.get("frame_state", {}):
                state_data["frame_state"]["diversity_index"] = {
                    "current": 0.0,
                    "smoothed": 0.0,
                    "peak": 0.0,
                    "variance": 0.0
                }
            
            # Rename fields if needed
            if "old_field_name" in state_data:
                state_data["new_field_name"] = state_data.pop("old_field_name")
        
        state_data["schema_version"] = "1.0.0"
        return state_data
    
    async def _initialize_fresh_session(self, session_id: str) -> bool:
        """
        Initialize a fresh session state when no snapshot exists
        
        Args:
            session_id: Session ID to initialize
            
        Returns:
            bool: True if successful
        """
        try:
            # Get session info from database
            session_row = self.db.execute("""
                SELECT user_id, start_time, hardware_tier, session_mode
                FROM session WHERE session_id = ?
            """, (session_id,)).fetchone()
            
            if not session_row:
                logger.error(f"Session {session_id} not found in database")
                return False
            
            user_id, start_time, hardware_tier, session_mode = session_row
            
            # Create initial state
            self.current_state = StateSnapshot(
                frame_state=FrameState(
                    frame_id=0,
                    timestamp=start_time,
                    energy_current=0.0
                ),
                energy_accumulator=EnergyAccumulator(
                    total_energy=0.0,
                    session_start=start_time,
                    frame_count=0
                ),
                session_context=SessionContext(
                    session_id=session_id,
                    user_id=user_id,
                    hardware_tier=hardware_tier or "mid",
                    session_mode=session_mode or "normal"
                )
            )
            
            logger.info(f"Initialized fresh session state for {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize fresh session: {e}")
            return False
    
    async def _background_writer(self):
        """Background task for writing events to database"""
        batch_events = []
        batch_timeout = 0.2  # 200ms batch window
        
        while self.is_running:
            try:
                # Wait for events with timeout
                try:
                    event = await asyncio.wait_for(self.event_queue.get(), timeout=batch_timeout)
                    batch_events.append(event)
                except asyncio.TimeoutError:
                    pass
                
                # Process batch if we have events or timeout occurred
                if batch_events:
                    await self._write_event_batch(batch_events)
                    batch_events.clear()
                    
            except Exception as e:
                logger.error(f"Background writer error: {e}")
                await asyncio.sleep(1)  # Brief pause before retry
    
    async def _write_event_batch(self, events: List[Dict[str, Any]]):
        """Write a batch of events to database"""
        try:
            self.db.execute("BEGIN TRANSACTION")
            
            for event in events:
                self.db.execute("""
                    INSERT INTO event (
                        session_id, timestamp, type, data, frame_id, energy_delta
                    ) VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    event['session_id'],
                    event['timestamp'],
                    event['type'],
                    json.dumps(event['data']),
                    event.get('frame_id'),
                    event.get('energy_delta')
                ))
            
            self.db.execute("COMMIT")
            logger.debug(f"Wrote batch of {len(events)} events")
            
        except Exception as e:
            self.db.execute("ROLLBACK")
            logger.error(f"Failed to write event batch: {e}")
    
    async def shutdown(self):
        """Graceful shutdown of state manager"""
        logger.info("Shutting down state manager")
        self.is_running = False
        
        if self.background_writer_task:
            self.background_writer_task.cancel()
            try:
                await self.background_writer_task
            except asyncio.CancelledError:
                pass
        
        # Flush any remaining events
        remaining_events = []
        while not self.event_queue.empty():
            remaining_events.append(await self.event_queue.get())
        
        if remaining_events:
            await self._write_event_batch(remaining_events)
            logger.info(f"Flushed {len(remaining_events)} remaining events")
        
        if self.db:
            self.db.close()

# Example usage and testing
async def main():
    """Example usage of snapshot and recovery system"""
    state_manager = StateManager("test_recovery.db")
    
    # Initialize and check for recovery
    if await state_manager.initialize():
        logger.info("State manager initialized successfully")
        
        # Simulate some state changes
        if state_manager.current_state:
            state_manager.current_state.energy_accumulator.total_energy = 123.45
            state_manager.current_state.frame_state.frame_id = 1000
            
            # Create a snapshot
            snapshot_id = await state_manager.create_snapshot("test_session", "manual")
            if snapshot_id:
                logger.info(f"Created test snapshot: {snapshot_id}")
        
        # Shutdown
        await state_manager.shutdown()
    else:
        logger.error("Failed to initialize state manager")

if __name__ == "__main__":
    asyncio.run(main())
