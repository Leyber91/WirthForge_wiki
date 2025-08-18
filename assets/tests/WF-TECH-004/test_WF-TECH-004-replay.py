import json
from pathlib import Path

import pytest

# Load replay module by file path
import sys, importlib.util
CODE_DIR = Path(__file__).resolve().parents[2] / 'code' / 'WF-TECH' / 'WF-TECH-004'
MODULE_PATH = CODE_DIR / 'WF-TECH-004-replay.py'

spec = importlib.util.spec_from_file_location('wf_tech_004_replay', MODULE_PATH)
assert spec and spec.loader
wf_tech_004_replay = importlib.util.module_from_spec(spec)
sys.modules['wf_tech_004_replay'] = wf_tech_004_replay
spec.loader.exec_module(wf_tech_004_replay)  # type: ignore

EventReplayer = getattr(wf_tech_004_replay, 'EventReplayer')


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