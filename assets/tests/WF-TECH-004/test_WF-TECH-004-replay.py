import json
from pathlib import Path

import pytest

# Import replayer
import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'code', 'WF-TECH', 'WF-TECH-004'))
from WF-TECH-004-replay import EventReplayer  # type: ignore


def test_replayer_loads_events_from_json(tmp_path: Path):
    events = [
        {"event_id": 1, "timestamp": "2025-01-01T00:00:00Z", "type": "system.start", "data": {}},
        {"event_id": 2, "timestamp": "2025-01-01T00:00:01Z", "type": "unknown.event", "data": {}},
    ]
    json_file = tmp_path / "events.json"
    json_file.write_text(json.dumps({"events": events}), encoding="utf-8")

    r = EventReplayer(json_file=str(json_file))
    assert r.load_events_from_json() is True
    assert len(r.events) == 2


def test_replayer_handles_unknown_event(tmp_path: Path):
    r = EventReplayer()
    result = r.replay_event({"timestamp": "2025-01-01T00:00:00Z", "type": "unknown.event", "data": {}})
    assert "validation_notes" in result
    assert any("Unknown event type" in note for note in result["validation_notes"])  # smoke assertion 