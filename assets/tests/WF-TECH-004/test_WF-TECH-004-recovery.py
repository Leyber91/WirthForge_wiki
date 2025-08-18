import sqlite3
from pathlib import Path

import pytest

# Import StateManager
import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'code', 'WF-TECH', 'WF-TECH-004'))
from WF-TECH-004-snapshot-recovery import StateManager  # type: ignore


@pytest.mark.asyncio
async def test_state_manager_initialize_clean_start(tmp_path: Path):
    db_path = tmp_path / "wf_state.db"

    # Create a minimal DB with required tables for initialize() checks
    with sqlite3.connect(str(db_path)) as conn:
        conn.executescript(
            """
            PRAGMA foreign_keys = ON;
            CREATE TABLE IF NOT EXISTS session (
                session_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL DEFAULT 'default',
                start_time TEXT NOT NULL,
                end_time TEXT NULL,
                total_energy REAL NOT NULL DEFAULT 0.0,
                total_events INTEGER NOT NULL DEFAULT 0,
                clean_shutdown BOOLEAN NOT NULL DEFAULT TRUE
            );
            CREATE TABLE IF NOT EXISTS event (
                event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                type TEXT NOT NULL,
                data TEXT NOT NULL,
                FOREIGN KEY (session_id) REFERENCES session(session_id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS snapshot (
                snapshot_id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                state TEXT NOT NULL,
                last_event_id INTEGER NULL,
                FOREIGN KEY (session_id) REFERENCES session(session_id) ON DELETE CASCADE,
                FOREIGN KEY (last_event_id) REFERENCES event(event_id) ON DELETE SET NULL
            );
            """
        )

    m = StateManager(db_path=str(db_path))
    ok = await m.initialize()
    assert ok is True
    assert m.is_running is True

    # Cleanup background task
    if m.background_writer_task:
        m.background_writer_task.cancel()
        with pytest.raises(Exception):
            await m.background_writer_task 