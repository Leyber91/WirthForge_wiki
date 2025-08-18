import os
import sqlite3
from pathlib import Path

import pytest


def _apply_schema(db_path: Path, schema_path: Path) -> None:
    with sqlite3.connect(str(db_path)) as conn:
        with open(schema_path, "r", encoding="utf-8") as f:
            sql = f.read()
        conn.executescript(sql)


def _tables(conn: sqlite3.Connection):
    cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
    return {row[0] for row in cur.fetchall()}


@pytest.fixture()
def tmp_db(tmp_path: Path) -> Path:
    return tmp_path / "wf_tech_004_test.db"


def test_schema_creates_core_objects(tmp_db: Path):
    schema_path = Path(__file__).resolve().parents[2] / "code" / "WF-TECH" / "WF-TECH-004" / "WF-TECH-004-DBSchema.sql"
    assert schema_path.exists(), f"Missing schema file: {schema_path}"

    _apply_schema(tmp_db, schema_path)

    with sqlite3.connect(str(tmp_db)) as conn:
        # PRAGMA foreign_keys should be enabled
        (fk_enabled,) = conn.execute("PRAGMA foreign_keys").fetchone()
        assert int(fk_enabled) == 1

        tables = _tables(conn)
        expected = {"user", "session", "event", "snapshot", "audit", "schema_info"}
        missing = expected - tables
        assert not missing, f"Missing tables: {missing}"

        # schema_info version must be present and semantic
        row = conn.execute("SELECT value FROM schema_info WHERE key='version'").fetchone()
        assert row is not None and isinstance(row[0], str)
        version = row[0]
        assert version.count(".") == 2, f"Invalid version format: {version}" 