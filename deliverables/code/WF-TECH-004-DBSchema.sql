-- WF-TECH-004 Database Schema Definition
-- WIRTHFORGE State Management & Storage System
-- Local SQLite Database Schema for Energy State, Session History, and User Progress
-- Version: 1.0.0
-- Compatible with: SQLite 3.35+, MariaDB 10.5+ (local only)

-- Enable foreign key constraints (SQLite specific)
PRAGMA foreign_keys = ON;

-- Enable JSON1 extension (SQLite specific)
-- This is typically built-in with modern SQLite installations

-- =============================================================================
-- USER TABLE: Persistent user profile and progress tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS user (
    user_id TEXT PRIMARY KEY DEFAULT 'default',
    current_level INTEGER NOT NULL DEFAULT 1,
    total_sessions INTEGER NOT NULL DEFAULT 0,
    total_energy REAL NOT NULL DEFAULT 0.0,
    experience_points INTEGER NOT NULL DEFAULT 0,
    unlocked_paths TEXT DEFAULT '[]', -- JSON array of unlocked feature paths
    preferences TEXT DEFAULT '{}', -- JSON object for user settings
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    schema_version INTEGER NOT NULL DEFAULT 1
);

-- Create default user record if not exists
INSERT OR IGNORE INTO user (user_id) VALUES ('default');

-- =============================================================================
-- SESSION TABLE: Metadata for each WIRTHFORGE session
-- =============================================================================
CREATE TABLE IF NOT EXISTS session (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'default',
    start_time TEXT NOT NULL,
    end_time TEXT NULL,
    total_energy REAL NOT NULL DEFAULT 0.0,
    total_events INTEGER NOT NULL DEFAULT 0,
    model_id TEXT NULL,
    hardware_tier TEXT NULL CHECK (hardware_tier IN ('low', 'mid', 'high')),
    session_mode TEXT NOT NULL DEFAULT 'normal' CHECK (session_mode IN ('normal', 'private', 'debug')),
    clean_shutdown BOOLEAN NOT NULL DEFAULT FALSE,
    schema_version INTEGER NOT NULL DEFAULT 1,
    metadata TEXT DEFAULT '{}', -- JSON object for additional session data
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    
    FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE
);

-- =============================================================================
-- EVENT TABLE: Event sourcing log for all session events
-- =============================================================================
CREATE TABLE IF NOT EXISTS event (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    type TEXT NOT NULL,
    data TEXT NOT NULL, -- JSON blob containing full event details
    frame_id INTEGER NULL,
    energy_delta REAL NULL,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    schema_version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    
    FOREIGN KEY (session_id) REFERENCES session(session_id) ON DELETE CASCADE,
    
    -- Ensure timestamp ordering within sessions
    CHECK (timestamp IS NOT NULL AND timestamp != ''),
    -- Validate JSON structure (basic check)
    CHECK (json_valid(data))
);

-- =============================================================================
-- SNAPSHOT TABLE: State snapshots for crash recovery and performance
-- =============================================================================
CREATE TABLE IF NOT EXISTS snapshot (
    snapshot_id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    snapshot_type TEXT NOT NULL DEFAULT 'periodic' CHECK (snapshot_type IN ('periodic', 'session_end', 'migration', 'manual')),
    state TEXT NOT NULL, -- JSON blob of serialized state
    last_event_id INTEGER NULL,
    energy_accumulator REAL NOT NULL DEFAULT 0.0,
    frame_count INTEGER NOT NULL DEFAULT 0,
    schema_version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    
    FOREIGN KEY (session_id) REFERENCES session(session_id) ON DELETE CASCADE,
    FOREIGN KEY (last_event_id) REFERENCES event(event_id) ON DELETE SET NULL,
    
    -- Validate JSON structure
    CHECK (json_valid(state))
);

-- =============================================================================
-- AUDIT TABLE: Optional audit trail for sensitive operations
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit (
    audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    operation TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NULL,
    old_values TEXT NULL, -- JSON of old values
    new_values TEXT NULL, -- JSON of new values
    user_context TEXT NULL,
    schema_version INTEGER NOT NULL DEFAULT 1
);

-- =============================================================================
-- INDEXES for Performance Optimization
-- =============================================================================

-- Session indexes
CREATE INDEX IF NOT EXISTS idx_session_user_id ON session(user_id);
CREATE INDEX IF NOT EXISTS idx_session_start_time ON session(start_time);
CREATE INDEX IF NOT EXISTS idx_session_end_time ON session(end_time);
CREATE INDEX IF NOT EXISTS idx_session_clean_shutdown ON session(clean_shutdown);

-- Event indexes (critical for performance)
CREATE INDEX IF NOT EXISTS idx_event_session_id ON event(session_id);
CREATE INDEX IF NOT EXISTS idx_event_timestamp ON event(timestamp);
CREATE INDEX IF NOT EXISTS idx_event_type ON event(type);
CREATE INDEX IF NOT EXISTS idx_event_session_timestamp ON event(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_event_frame_id ON event(frame_id);
CREATE INDEX IF NOT EXISTS idx_event_processed ON event(processed);

-- Snapshot indexes
CREATE INDEX IF NOT EXISTS idx_snapshot_session_id ON snapshot(session_id);
CREATE INDEX IF NOT EXISTS idx_snapshot_timestamp ON snapshot(timestamp);
CREATE INDEX IF NOT EXISTS idx_snapshot_type ON snapshot(snapshot_type);

-- Audit indexes
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_operation ON audit(operation);
CREATE INDEX IF NOT EXISTS idx_audit_table_name ON audit(table_name);

-- =============================================================================
-- TRIGGERS for Data Integrity and Automation
-- =============================================================================

-- Update user.updated_at on any change
CREATE TRIGGER IF NOT EXISTS trigger_user_updated_at
    AFTER UPDATE ON user
    FOR EACH ROW
BEGIN
    UPDATE user SET updated_at = datetime('now', 'utc') WHERE user_id = NEW.user_id;
END;

-- Update session.updated_at on any change
CREATE TRIGGER IF NOT EXISTS trigger_session_updated_at
    AFTER UPDATE ON session
    FOR EACH ROW
BEGIN
    UPDATE session SET updated_at = datetime('now', 'utc') WHERE session_id = NEW.session_id;
END;

-- Auto-increment session event count
CREATE TRIGGER IF NOT EXISTS trigger_session_event_count
    AFTER INSERT ON event
    FOR EACH ROW
BEGIN
    UPDATE session 
    SET total_events = total_events + 1,
        updated_at = datetime('now', 'utc')
    WHERE session_id = NEW.session_id;
END;

-- Auto-update session energy total on energy events
CREATE TRIGGER IF NOT EXISTS trigger_session_energy_total
    AFTER INSERT ON event
    FOR EACH ROW
    WHEN NEW.energy_delta IS NOT NULL
BEGIN
    UPDATE session 
    SET total_energy = total_energy + NEW.energy_delta,
        updated_at = datetime('now', 'utc')
    WHERE session_id = NEW.session_id;
END;

-- Auto-update user totals when session ends
CREATE TRIGGER IF NOT EXISTS trigger_user_session_totals
    AFTER UPDATE OF end_time ON session
    FOR EACH ROW
    WHEN NEW.end_time IS NOT NULL AND OLD.end_time IS NULL
BEGIN
    UPDATE user 
    SET total_sessions = total_sessions + 1,
        total_energy = total_energy + NEW.total_energy,
        updated_at = datetime('now', 'utc')
    WHERE user_id = NEW.user_id;
END;

-- Audit trigger for sensitive user changes
CREATE TRIGGER IF NOT EXISTS trigger_audit_user_changes
    AFTER UPDATE ON user
    FOR EACH ROW
    WHEN OLD.current_level != NEW.current_level 
      OR OLD.unlocked_paths != NEW.unlocked_paths
BEGIN
    INSERT INTO audit (operation, table_name, record_id, old_values, new_values)
    VALUES (
        'UPDATE',
        'user',
        NEW.user_id,
        json_object(
            'current_level', OLD.current_level,
            'unlocked_paths', OLD.unlocked_paths
        ),
        json_object(
            'current_level', NEW.current_level,
            'unlocked_paths', NEW.unlocked_paths
        )
    );
END;

-- =============================================================================
-- VIEWS for Common Queries
-- =============================================================================

-- Active sessions (not yet ended)
CREATE VIEW IF NOT EXISTS active_sessions AS
SELECT 
    s.*,
    u.current_level,
    (julianday('now') - julianday(s.start_time)) * 24 * 60 AS duration_minutes
FROM session s
JOIN user u ON s.user_id = u.user_id
WHERE s.end_time IS NULL;

-- Recent sessions (last 7 days)
CREATE VIEW IF NOT EXISTS recent_sessions AS
SELECT 
    s.*,
    u.current_level,
    (julianday(s.end_time) - julianday(s.start_time)) * 24 * 60 AS duration_minutes
FROM session s
JOIN user u ON s.user_id = u.user_id
WHERE s.start_time >= datetime('now', '-7 days')
ORDER BY s.start_time DESC;

-- Session energy summary
CREATE VIEW IF NOT EXISTS session_energy_summary AS
SELECT 
    s.session_id,
    s.start_time,
    s.end_time,
    s.total_energy,
    s.total_events,
    COUNT(CASE WHEN e.type = 'energy.update' THEN 1 END) AS energy_events,
    COUNT(CASE WHEN e.type LIKE 'user.%' THEN 1 END) AS user_events,
    COUNT(CASE WHEN e.type LIKE 'ai.%' THEN 1 END) AS ai_events,
    MIN(e.timestamp) AS first_event,
    MAX(e.timestamp) AS last_event
FROM session s
LEFT JOIN event e ON s.session_id = e.session_id
GROUP BY s.session_id, s.start_time, s.end_time, s.total_energy, s.total_events;

-- =============================================================================
-- SCHEMA VERSION TRACKING
-- =============================================================================

-- Schema metadata table
CREATE TABLE IF NOT EXISTS schema_info (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

-- Insert current schema version
INSERT OR REPLACE INTO schema_info (key, value) VALUES ('version', '1.0.0');
INSERT OR REPLACE INTO schema_info (key, value) VALUES ('created_at', datetime('now', 'utc'));
INSERT OR REPLACE INTO schema_info (key, value) VALUES ('description', 'WIRTHFORGE State Management & Storage Schema');

-- =============================================================================
-- VACUUM and OPTIMIZATION
-- =============================================================================

-- Enable Write-Ahead Logging for better concurrency (SQLite)
PRAGMA journal_mode = WAL;

-- Optimize for performance
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 10000;
PRAGMA temp_store = memory;

-- Auto-vacuum to manage database size
PRAGMA auto_vacuum = INCREMENTAL;

-- =============================================================================
-- VALIDATION FUNCTIONS (SQLite 3.38+)
-- =============================================================================

-- Note: These would be implemented as application-level validations
-- since SQLite doesn't support user-defined functions in all versions

-- Example validation queries that can be run periodically:

-- Check for orphaned events (should return 0 rows)
-- SELECT COUNT(*) FROM event e LEFT JOIN session s ON e.session_id = s.session_id WHERE s.session_id IS NULL;

-- Check for invalid timestamps (should return 0 rows)
-- SELECT COUNT(*) FROM event WHERE timestamp NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9]*';

-- Check for invalid JSON in data columns (should return 0 rows)
-- SELECT COUNT(*) FROM event WHERE NOT json_valid(data);

-- =============================================================================
-- SAMPLE DATA INSERTION (for testing)
-- =============================================================================

-- Uncomment the following for development/testing:

/*
-- Sample session
INSERT INTO session (session_id, user_id, start_time, model_id, hardware_tier)
VALUES ('20250817T194800Z_001', 'default', '2025-08-17T19:48:00.000Z', 'ollama/llama2:7b', 'mid');

-- Sample events
INSERT INTO event (session_id, timestamp, type, data, energy_delta) VALUES
('20250817T194800Z_001', '2025-08-17T19:48:05.123Z', 'system.start', 
 '{"version": "1.0.0", "user_id": "default", "model_id": "ollama/llama2:7b", "mode": "offline"}', NULL),
('20250817T194800Z_001', '2025-08-17T19:48:05.150Z', 'energy.update',
 '{"frame": 1, "energy": 4.2, "accumulator": 4.2, "model_id": "ollama/llama2:7b", "fps": 60}', 4.2),
('20250817T194800Z_001', '2025-08-17T19:48:05.167Z', 'user.prompt',
 '{"prompt_id": "abc123", "interface": "text", "truncated": false}', NULL);

-- Sample snapshot
INSERT INTO snapshot (session_id, timestamp, state, energy_accumulator, frame_count)
VALUES ('20250817T194800Z_001', '2025-08-17T19:48:10.000Z',
        '{"accumulator_total": 4.2, "frame_count": 1, "last_processed_event": 3}', 4.2, 1);
*/

-- =============================================================================
-- CLEANUP PROCEDURES
-- =============================================================================

-- Procedure to clean up old data (run periodically)
-- Note: SQLite doesn't have stored procedures, so these would be application-level

-- Clean up sessions older than 90 days (keeping user progress)
-- DELETE FROM session WHERE start_time < datetime('now', '-90 days') AND end_time IS NOT NULL;

-- Clean up audit logs older than 30 days
-- DELETE FROM audit WHERE timestamp < datetime('now', '-30 days');

-- Vacuum database to reclaim space
-- VACUUM;

-- =============================================================================
-- MIGRATION SUPPORT
-- =============================================================================

-- Future schema migrations would add entries here:
-- Example:
-- ALTER TABLE user ADD COLUMN new_field TEXT DEFAULT NULL;
-- UPDATE schema_info SET value = '1.1.0' WHERE key = 'version';

-- =============================================================================
-- END OF SCHEMA DEFINITION
-- =============================================================================

-- Verify schema creation
SELECT 'Schema creation completed successfully. Version: ' || value AS result 
FROM schema_info WHERE key = 'version';
