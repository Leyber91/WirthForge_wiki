import json
from pathlib import Path
import types

import pytest

# Prepare import path and stub jsonschema before importing the validator
import sys, os, importlib.util
sys.modules.setdefault('jsonschema', types.SimpleNamespace())

CODE_DIR = Path(__file__).resolve().parents[2] / 'code' / 'WF-TECH' / 'WF-TECH-004'
MODULE_PATH = CODE_DIR / 'WF-TECH-004-validate.py'

spec = importlib.util.spec_from_file_location('wf_tech_004_validate', MODULE_PATH)
assert spec and spec.loader
wf_tech_004_validate = importlib.util.module_from_spec(spec)
sys.modules['wf_tech_004_validate'] = wf_tech_004_validate
spec.loader.exec_module(wf_tech_004_validate)  # type: ignore

DataValidator = getattr(wf_tech_004_validate, 'DataValidator')


def test_validator_reports_missing_db(tmp_path: Path):
    db_path = tmp_path / "missing.db"
    v = DataValidator(str(db_path))
    ok = v.connect_database()
    assert not ok
    assert any(e.get("category") == "database" for e in v.validation_errors)


def test_validator_loads_schemas_when_present(tmp_path: Path):
    schema_dir = tmp_path / "schemas"
    schema_dir.mkdir(parents=True)
    (schema_dir / "WF-TECH-004-energy-state.json").write_text(json.dumps({"type": "object"}), encoding="utf-8")
    (schema_dir / "WF-TECH-004-events.json").write_text(json.dumps({"type": "array"}), encoding="utf-8")

    v = DataValidator(db_path=str(tmp_path / "dummy.db"), schema_path=str(schema_dir))
    assert v.load_schemas() is True
    assert "energy_state" in v.schemas and "events" in v.schemas 