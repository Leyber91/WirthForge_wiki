-- WF-TECH-004 Migration Template
-- WIRTHFORGE State Management & Storage System
-- Template for database schema migrations between versions
-- 
-- This template provides a structured approach for migrating WIRTHFORGE
-- database schemas while preserving data integrity and user progress.
--
-- Version: 1.0.0
-- Usage: Copy this template and modify for specific migration needs

-- =============================================================================
-- MIGRATION METADATA
-- =============================================================================

-- Migration Information (customize for each migration)
-- FROM_VERSION: 1.0.0
-- TO_VERSION: 1.1.0
-- MIGRATION_ID: WF-TECH-004-MIGRATION-001
-- DESCRIPTION: Example migration adding new features
-- CREATED_BY: WIRTHFORGE Migration System
-- CREATED_DATE: 2025-08-17

-- =============================================================================
-- PRE-MIGRATION CHECKS
-- =============================================================================

-- Check current schema version
SELECT 'Current schema version: ' || value as info 
FROM schema_info WHERE key = 'version';

-- Verify database integrity before migration
PRAGMA integrity_check;

-- Check for active sessions (warn if any exist)
SELECT CASE 
    WHEN COUNT(*) > 0 THEN 'WARNING: ' || COUNT(*) || ' active sessions found. Consider completing them first.'
    ELSE 'OK: No active sessions found.'
END as active_sessions_check
FROM session WHERE end_time IS NULL;

-- Create backup timestamp for rollback reference
INSERT OR REPLACE INTO schema_info (key, value) 
VALUES ('migration_backup_timestamp', datetime('now', 'utc'));

-- =============================================================================
-- BACKUP CURRENT SCHEMA (Optional but Recommended)
-- =============================================================================

-- Create backup tables with current data
-- Uncomment and modify as needed for specific migrations

/*
-- Backup critical tables before migration
CREATE TABLE user_backup_v1_0_0 AS SELECT * FROM user;
CREATE TABLE session_backup_v1_0_0 AS SELECT * FROM session;
CREATE TABLE event_backup_v1_0_0 AS SELECT * FROM event;
CREATE TABLE snapshot_backup_v1_0_0 AS SELECT * FROM snapshot;

-- Log backup creation
INSERT INTO audit (operation, table_name, record_id, new_values)
VALUES ('MIGRATION_BACKUP', 'schema', '1.0.0', 
        json_object('backup_timestamp', datetime('now', 'utc')));
*/

-- =============================================================================
-- MIGRATION STEPS
-- =============================================================================

BEGIN TRANSACTION;

-- Step 1: Add new columns (example)
-- Add new columns with default values to avoid breaking existing data

/*
-- Example: Add new user preference fields
ALTER TABLE user ADD COLUMN theme_preference TEXT DEFAULT 'auto';
ALTER TABLE user ADD COLUMN notification_settings TEXT DEFAULT '{"enabled": true}';

-- Example: Add new session tracking fields  
ALTER TABLE session ADD COLUMN session_quality_score REAL DEFAULT 0.0;
ALTER TABLE session ADD COLUMN user_satisfaction INTEGER DEFAULT NULL;

-- Example: Add new event fields for enhanced tracking
ALTER TABLE event ADD COLUMN priority INTEGER DEFAULT 1;
ALTER TABLE event ADD COLUMN correlation_id TEXT DEFAULT NULL;
*/

-- Step 2: Create new tables (example)
-- Add new tables for expanded functionality

/*
-- Example: User achievements table
CREATE TABLE IF NOT EXISTS user_achievement (
    achievement_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    achievement_type TEXT NOT NULL,
    achievement_data TEXT NOT NULL, -- JSON
    earned_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    session_id TEXT NULL,
    
    FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES session(session_id) ON DELETE SET NULL,
    
    UNIQUE(user_id, achievement_type, earned_at)
);

-- Example: Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metric (
    metric_id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    metric_value REAL NOT NULL,
    timestamp TEXT NOT NULL,
    context TEXT DEFAULT '{}', -- JSON
    
    FOREIGN KEY (session_id) REFERENCES session(session_id) ON DELETE CASCADE
);
*/

-- Step 3: Create new indexes for performance
-- Add indexes for new columns and tables

/*
-- Indexes for new user fields
CREATE INDEX IF NOT EXISTS idx_user_theme ON user(theme_preference);

-- Indexes for new session fields
CREATE INDEX IF NOT EXISTS idx_session_quality ON session(session_quality_score);
CREATE INDEX IF NOT EXISTS idx_session_satisfaction ON session(user_satisfaction);

-- Indexes for new event fields
CREATE INDEX IF NOT EXISTS idx_event_priority ON event(priority);
CREATE INDEX IF NOT EXISTS idx_event_correlation ON event(correlation_id);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_achievement_user ON user_achievement(user_id);
CREATE INDEX IF NOT EXISTS idx_achievement_type ON user_achievement(achievement_type);
CREATE INDEX IF NOT EXISTS idx_achievement_earned ON user_achievement(earned_at);

CREATE INDEX IF NOT EXISTS idx_metric_session ON performance_metric(session_id);
CREATE INDEX IF NOT EXISTS idx_metric_type ON performance_metric(metric_type);
CREATE INDEX IF NOT EXISTS idx_metric_timestamp ON performance_metric(timestamp);
*/

-- Step 4: Migrate existing data (example)
-- Transform or populate new fields based on existing data

/*
-- Example: Set default theme based on existing user data
UPDATE user 
SET theme_preference = CASE 
    WHEN json_extract(preferences, '$.dark_mode') = 'true' THEN 'dark'
    WHEN json_extract(preferences, '$.dark_mode') = 'false' THEN 'light'
    ELSE 'auto'
END
WHERE theme_preference = 'auto';

-- Example: Calculate session quality scores based on existing metrics
UPDATE session 
SET session_quality_score = (
    SELECT CASE 
        WHEN AVG(CAST(json_extract(e.data, '$.fps') AS REAL)) >= 55 THEN 1.0
        WHEN AVG(CAST(json_extract(e.data, '$.fps') AS REAL)) >= 45 THEN 0.8
        WHEN AVG(CAST(json_extract(e.data, '$.fps') AS REAL)) >= 30 THEN 0.6
        ELSE 0.4
    END
    FROM event e 
    WHERE e.session_id = session.session_id 
      AND e.type = 'energy.update'
      AND json_extract(e.data, '$.fps') IS NOT NULL
)
WHERE session_quality_score = 0.0 AND end_time IS NOT NULL;

-- Example: Create achievements for existing milestones
INSERT INTO user_achievement (user_id, achievement_type, achievement_data, earned_at, session_id)
SELECT DISTINCT 
    s.user_id,
    'first_session',
    json_object('total_energy', s.total_energy, 'duration_ms', 
                (julianday(s.end_time) - julianday(s.start_time)) * 24 * 60 * 60 * 1000),
    s.start_time,
    s.session_id
FROM session s
WHERE s.session_id = (
    SELECT session_id FROM session s2 
    WHERE s2.user_id = s.user_id 
    ORDER BY s2.start_time ASC 
    LIMIT 1
);
*/

-- Step 5: Update triggers for new functionality
-- Modify or add triggers to maintain data consistency

/*
-- Example: Trigger to update user achievement progress
CREATE TRIGGER IF NOT EXISTS trigger_session_achievements
    AFTER UPDATE OF end_time ON session
    FOR EACH ROW
    WHEN NEW.end_time IS NOT NULL AND OLD.end_time IS NULL
BEGIN
    -- Award energy milestone achievements
    INSERT OR IGNORE INTO user_achievement (user_id, achievement_type, achievement_data, session_id)
    SELECT NEW.user_id, 'energy_milestone_100', 
           json_object('energy', NEW.total_energy), NEW.session_id
    WHERE NEW.total_energy >= 100;
    
    INSERT OR IGNORE INTO user_achievement (user_id, achievement_type, achievement_data, session_id)
    SELECT NEW.user_id, 'energy_milestone_1000', 
           json_object('energy', NEW.total_energy), NEW.session_id
    WHERE NEW.total_energy >= 1000;
END;

-- Example: Trigger to track performance metrics
CREATE TRIGGER IF NOT EXISTS trigger_performance_tracking
    AFTER INSERT ON event
    FOR EACH ROW
    WHEN NEW.type = 'energy.update'
BEGIN
    INSERT INTO performance_metric (session_id, metric_type, metric_value, timestamp, context)
    VALUES (NEW.session_id, 'fps', 
            CAST(json_extract(NEW.data, '$.fps') AS REAL),
            NEW.timestamp,
            json_object('frame_id', NEW.frame_id));
END;
*/

-- Step 6: Add new views for convenience
-- Create views that simplify common queries with new schema

/*
-- Example: Enhanced session summary view
CREATE VIEW IF NOT EXISTS session_summary_v2 AS
SELECT 
    s.*,
    u.current_level,
    u.theme_preference,
    COUNT(ua.achievement_id) as achievements_earned,
    AVG(pm.metric_value) as avg_fps,
    (julianday(s.end_time) - julianday(s.start_time)) * 24 * 60 AS duration_minutes
FROM session s
JOIN user u ON s.user_id = u.user_id
LEFT JOIN user_achievement ua ON s.session_id = ua.session_id
LEFT JOIN performance_metric pm ON s.session_id = pm.session_id AND pm.metric_type = 'fps'
GROUP BY s.session_id, s.user_id, s.start_time, s.end_time, s.total_energy, s.total_events,
         u.current_level, u.theme_preference;

-- Example: User progress view
CREATE VIEW IF NOT EXISTS user_progress_v2 AS
SELECT 
    u.*,
    COUNT(DISTINCT s.session_id) as total_sessions,
    COUNT(DISTINCT ua.achievement_id) as total_achievements,
    MAX(s.session_quality_score) as best_session_quality,
    AVG(s.session_quality_score) as avg_session_quality
FROM user u
LEFT JOIN session s ON u.user_id = s.user_id
LEFT JOIN user_achievement ua ON u.user_id = ua.user_id
GROUP BY u.user_id;
*/

-- Step 7: Update schema version and metadata
UPDATE schema_info SET value = '1.1.0' WHERE key = 'version';
UPDATE schema_info SET value = datetime('now', 'utc') WHERE key = 'updated_at';

-- Record migration completion
INSERT OR REPLACE INTO schema_info (key, value) 
VALUES ('last_migration', 'WF-TECH-004-MIGRATION-001');

INSERT OR REPLACE INTO schema_info (key, value) 
VALUES ('migration_completed_at', datetime('now', 'utc'));

-- Log migration in audit table
INSERT INTO audit (operation, table_name, record_id, new_values)
VALUES ('SCHEMA_MIGRATION', 'schema_info', 'version', 
        json_object(
            'from_version', '1.0.0',
            'to_version', '1.1.0',
            'migration_id', 'WF-TECH-004-MIGRATION-001',
            'completed_at', datetime('now', 'utc')
        ));

COMMIT;

-- =============================================================================
-- POST-MIGRATION VERIFICATION
-- =============================================================================

-- Verify schema version was updated
SELECT 'New schema version: ' || value as result 
FROM schema_info WHERE key = 'version';

-- Check database integrity after migration
PRAGMA integrity_check;

-- Verify foreign key constraints
PRAGMA foreign_key_check;

-- Count records in key tables to ensure no data loss
SELECT 'user' as table_name, COUNT(*) as record_count FROM user
UNION ALL
SELECT 'session', COUNT(*) FROM session
UNION ALL
SELECT 'event', COUNT(*) FROM event
UNION ALL
SELECT 'snapshot', COUNT(*) FROM snapshot;

-- Test new functionality (customize based on migration)
/*
-- Example: Test new achievement system
SELECT 'Achievements created: ' || COUNT(*) as result FROM user_achievement;

-- Example: Test new performance metrics
SELECT 'Performance metrics: ' || COUNT(*) as result FROM performance_metric;

-- Example: Test new views
SELECT 'Sessions with quality scores: ' || COUNT(*) as result 
FROM session_summary_v2 WHERE avg_fps IS NOT NULL;
*/

-- =============================================================================
-- ROLLBACK PROCEDURE (for reference)
-- =============================================================================

-- If migration fails or needs to be rolled back, use these steps:
-- 1. BEGIN TRANSACTION;
-- 2. Restore from backup tables (if created)
-- 3. DROP new tables/columns/indexes/triggers/views
-- 4. UPDATE schema_info SET value = '1.0.0' WHERE key = 'version';
-- 5. COMMIT;

/*
-- Example rollback script:
BEGIN TRANSACTION;

-- Drop new tables
DROP TABLE IF EXISTS user_achievement;
DROP TABLE IF EXISTS performance_metric;

-- Drop new views
DROP VIEW IF EXISTS session_summary_v2;
DROP VIEW IF EXISTS user_progress_v2;

-- Drop new triggers
DROP TRIGGER IF EXISTS trigger_session_achievements;
DROP TRIGGER IF EXISTS trigger_performance_tracking;

-- Remove new columns (SQLite doesn't support DROP COLUMN directly)
-- Would need to recreate tables without new columns and copy data

-- Restore schema version
UPDATE schema_info SET value = '1.0.0' WHERE key = 'version';

-- Log rollback
INSERT INTO audit (operation, table_name, record_id, new_values)
VALUES ('SCHEMA_ROLLBACK', 'schema_info', 'version', 
        json_object('rolled_back_at', datetime('now', 'utc')));

COMMIT;
*/

-- =============================================================================
-- CLEANUP (Optional)
-- =============================================================================

-- Remove backup tables after successful migration (uncomment if needed)
-- DROP TABLE IF EXISTS user_backup_v1_0_0;
-- DROP TABLE IF EXISTS session_backup_v1_0_0;
-- DROP TABLE IF EXISTS event_backup_v1_0_0;
-- DROP TABLE IF EXISTS snapshot_backup_v1_0_0;

-- Vacuum database to reclaim space and optimize
VACUUM;

-- Analyze tables for query optimization
ANALYZE;

-- =============================================================================
-- MIGRATION COMPLETION MESSAGE
-- =============================================================================

SELECT 
    '✅ Migration completed successfully!' as status,
    'From version 1.0.0 to 1.1.0' as migration,
    datetime('now', 'utc') as completed_at;

-- =============================================================================
-- NOTES FOR FUTURE MIGRATIONS
-- =============================================================================

-- 1. Always backup critical data before migration
-- 2. Test migrations on a copy of production data first
-- 3. Use transactions to ensure atomicity
-- 4. Verify data integrity before and after migration
-- 5. Document all changes for rollback procedures
-- 6. Update application code to handle new schema features
-- 7. Consider performance impact of new indexes and triggers
-- 8. Plan for gradual rollout if migration affects running systems
-- 9. Keep migration scripts versioned and documented
-- 10. Test rollback procedures before applying to production

-- =============================================================================
-- END OF MIGRATION TEMPLATE
-- =============================================================================
