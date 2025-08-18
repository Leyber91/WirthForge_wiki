# WF-TECH-004 State Consistency Test Specification
**WIRTHFORGE State Management & Storage System**

## Document Information
- **Document ID**: WF-TECH-004-state-consistency.spec.md
- **Version**: 1.0.0
- **Created**: 2025-08-17
- **Category**: Test Specification
- **Dependencies**: WF-TECH-004-STATE-STORAGE.md

## Overview

This specification defines comprehensive test cases for validating the correctness, consistency, and performance of the WIRTHFORGE state management and storage subsystem. These tests ensure that the system meets its requirements for real-time performance, data integrity, crash recovery, and deterministic behavior.

## Test Categories

### 1. Deterministic Replay Tests

#### Test Case 1.1: Basic Event Replay
**Objective**: Verify that replaying a sequence of events produces identical final state

**Setup**:
- Initialize fresh database
- Create test session with known sequence of events
- Record final state values

**Test Steps**:
1. Run session with predefined event sequence
2. Capture final state (energy accumulator, frame count, model contributions)
3. Reset system state
4. Replay events from database log
5. Compare final state with original

**Expected Results**:
- Energy accumulator matches exactly (tolerance: ±0.01 EU)
- Frame count matches exactly
- Model contributions match exactly
- Token counts match exactly
- Pattern event counts match exactly

**Validation Criteria**:
```python
assert abs(original_state.energy_accumulator - replayed_state.energy_accumulator) < 0.01
assert original_state.frame_count == replayed_state.frame_count
assert original_state.token_count == replayed_state.token_count
assert original_state.interference_events == replayed_state.interference_events
assert original_state.resonance_events == replayed_state.resonance_events
```

#### Test Case 1.2: Complex Pattern Replay
**Objective**: Verify replay accuracy with interference and resonance patterns

**Setup**:
- Multi-model session with interference and resonance events
- Include energy peaks and pattern transitions

**Test Steps**:
1. Generate session with 3+ models
2. Trigger interference patterns (constructive and destructive)
3. Trigger resonance patterns with synchronization
4. Record energy amplification events
5. Replay and validate pattern detection timing

**Expected Results**:
- Pattern events occur at identical timestamps
- Energy amplification factors match
- Synchronization levels match
- Pattern duration calculations match

#### Test Case 1.3: Long Session Replay
**Objective**: Test replay performance and accuracy for extended sessions

**Setup**:
- Session with 10,000+ events
- Multiple snapshots during session
- Various event types distributed throughout

**Test Steps**:
1. Generate long-running session (30+ minutes simulated)
2. Create periodic snapshots every 1000 events
3. Replay from different snapshot points
4. Validate consistency across all replay points

**Expected Results**:
- Replay completes within 30 seconds
- All snapshot-based replays produce identical final state
- No memory leaks during replay
- Event processing rate > 500 events/second

### 2. Crash Recovery Tests

#### Test Case 2.1: Ungraceful Shutdown Recovery
**Objective**: Verify recovery from unexpected termination

**Setup**:
- Active session with ongoing AI generation
- Simulated crash during event processing

**Test Steps**:
1. Start session with continuous event generation
2. Terminate process abruptly after 500 events
3. Restart system and trigger recovery
4. Validate recovered state matches expected state

**Expected Results**:
- Recovery detects unclean shutdown
- Latest snapshot loaded successfully
- Events after snapshot replayed correctly
- No data corruption or loss
- Session can continue normally

#### Test Case 2.2: Database Corruption Recovery
**Objective**: Test recovery from partial database corruption

**Setup**:
- Database with intentionally corrupted event records
- Valid snapshots available

**Test Steps**:
1. Corrupt specific event records in database
2. Attempt recovery process
3. Validate system handles corruption gracefully
4. Verify recovery from last valid snapshot

**Expected Results**:
- Corruption detected during validation
- Recovery falls back to snapshot
- Corrupted events skipped or flagged
- System remains stable after recovery

#### Test Case 2.3: Snapshot Corruption Recovery
**Objective**: Test recovery when snapshots are corrupted

**Setup**:
- Multiple snapshots with one corrupted
- Full event log available

**Test Steps**:
1. Corrupt most recent snapshot
2. Attempt recovery process
3. Verify fallback to earlier snapshot
4. Validate replay from earlier point

**Expected Results**:
- Corrupted snapshot detected and skipped
- Earlier valid snapshot used
- Full event replay from snapshot point
- Complete state reconstruction

### 3. Data Integrity Tests

#### Test Case 3.1: Foreign Key Constraint Validation
**Objective**: Ensure referential integrity across all tables

**Test Steps**:
1. Create test data with valid relationships
2. Attempt to insert orphaned records
3. Attempt to delete referenced records
4. Validate constraint enforcement

**Expected Results**:
- Orphaned event insertion fails
- Orphaned snapshot insertion fails
- Session deletion cascades to events and snapshots
- User deletion cascades to sessions

#### Test Case 3.2: JSON Schema Validation
**Objective**: Verify all stored JSON conforms to schemas

**Test Steps**:
1. Insert events with valid JSON data
2. Attempt to insert events with invalid JSON
3. Validate existing data against schemas
4. Test schema evolution scenarios

**Expected Results**:
- Valid JSON data accepted
- Invalid JSON data rejected or flagged
- All existing data passes schema validation
- Schema migration preserves data integrity

#### Test Case 3.3: Energy Conservation Validation
**Objective**: Verify energy values remain consistent across operations

**Test Steps**:
1. Generate session with known energy inputs
2. Calculate expected total from individual events
3. Compare with session total and snapshot values
4. Validate across multiple models

**Expected Results**:
- Session total equals sum of event deltas (±0.01 EU)
- Snapshot accumulator matches session state
- Model contributions sum to total energy
- No energy "leaks" or phantom additions

### 4. Performance Tests

#### Test Case 4.1: Frame Budget Compliance
**Objective**: Verify state operations don't violate 60Hz timing

**Setup**:
- High-frequency event generation (60 events/second)
- Concurrent background writing
- Memory and CPU monitoring

**Test Steps**:
1. Generate events at 60Hz rate for 60 seconds
2. Monitor frame processing time
3. Track event queue depth
4. Measure write latency

**Expected Results**:
- 99% of frames complete within 16.67ms
- Average frame processing < 5ms
- Event queue never exceeds 120 events
- Write latency median < 5ms, 99th percentile < 20ms

#### Test Case 4.2: Memory Usage Stability
**Objective**: Verify no memory leaks during extended operation

**Setup**:
- Long-running session (4+ hours simulated)
- Continuous event generation
- Periodic snapshots

**Test Steps**:
1. Monitor memory usage over time
2. Generate 100,000+ events
3. Create 50+ snapshots
4. Measure memory growth rate

**Expected Results**:
- Memory usage stabilizes after initial ramp-up
- Growth rate < 1MB per 10,000 events
- Garbage collection effectively reclaims memory
- No unbounded memory growth

#### Test Case 4.3: Database Performance Scaling
**Objective**: Test performance with large datasets

**Setup**:
- Database with 100+ sessions
- 1M+ events across all sessions
- 1000+ snapshots

**Test Steps**:
1. Query recent sessions (should be fast)
2. Export large session data
3. Run validation on full database
4. Measure backup/restore performance

**Expected Results**:
- Recent session queries < 100ms
- Large session export < 30 seconds
- Full database validation < 5 minutes
- Backup creation < 2 minutes for 100MB database

### 5. Integration Tests

#### Test Case 5.1: WebSocket Event Broadcasting
**Objective**: Verify events are correctly broadcast to UI clients

**Setup**:
- Mock WebSocket connections
- Event generation pipeline
- Message capture system

**Test Steps**:
1. Connect multiple mock clients
2. Generate various event types
3. Capture broadcast messages
4. Validate message content and timing

**Expected Results**:
- All events broadcast to all connected clients
- Message format matches event schema
- Broadcast latency < 10ms
- No message loss or duplication

#### Test Case 5.2: Orchestrator Integration
**Objective**: Test integration with system orchestrator

**Setup**:
- Mock orchestrator component
- State manager initialization
- Shutdown coordination

**Test Steps**:
1. Initialize state manager via orchestrator
2. Handle orchestrator shutdown signals
3. Test error propagation
4. Validate clean resource cleanup

**Expected Results**:
- Initialization completes successfully
- Graceful shutdown on orchestrator signal
- Errors properly propagated to orchestrator
- All resources cleaned up on shutdown

#### Test Case 5.3: Decipher Engine Integration
**Objective**: Test integration with AI processing engine

**Setup**:
- Mock Decipher engine
- Energy calculation pipeline
- Event generation hooks

**Test Steps**:
1. Register state manager with Decipher
2. Generate AI processing events
3. Validate energy calculations
4. Test pattern detection integration

**Expected Results**:
- Events generated for all AI activities
- Energy calculations match Decipher output
- Pattern events triggered correctly
- No performance impact on AI processing

### 6. Security and Privacy Tests

#### Test Case 6.1: Data Privacy Compliance
**Objective**: Verify sensitive data handling follows privacy requirements

**Setup**:
- Session with user prompts and AI responses
- Privacy mode enabled
- Export functionality testing

**Test Steps**:
1. Generate session with sensitive content
2. Export data in privacy mode
3. Validate content filtering
4. Test data purge functionality

**Expected Results**:
- Raw text content not stored by default
- Export excludes sensitive content unless opted-in
- Hash values used for audit trails
- Purge completely removes user data

#### Test Case 6.2: Local-Only Operation
**Objective**: Verify no external network connections

**Setup**:
- Network monitoring tools
- Complete system operation
- All features exercised

**Test Steps**:
1. Monitor network traffic during operation
2. Test all major features
3. Validate localhost-only binding
4. Test offline operation

**Expected Results**:
- No external network connections detected
- All services bind to localhost only
- Full functionality available offline
- No cloud service dependencies

### 7. Error Handling Tests

#### Test Case 7.1: Disk Space Exhaustion
**Objective**: Test behavior when disk space runs out

**Setup**:
- Limited disk space environment
- Active event generation
- Error monitoring

**Test Steps**:
1. Fill disk to near capacity
2. Continue event generation
3. Monitor error handling
4. Test recovery after space freed

**Expected Results**:
- Graceful degradation when disk full
- Events buffered in memory temporarily
- Error events logged appropriately
- Recovery when space becomes available

#### Test Case 7.2: Database Lock Contention
**Objective**: Test handling of database lock conflicts

**Setup**:
- Multiple concurrent database operations
- High-frequency writes
- Lock timeout scenarios

**Test Steps**:
1. Generate concurrent write operations
2. Simulate lock timeouts
3. Monitor retry behavior
4. Validate data consistency

**Expected Results**:
- Lock conflicts handled gracefully
- Automatic retry with exponential backoff
- No data corruption from race conditions
- Performance degrades gracefully under contention

## Test Automation

### Continuous Integration Tests
- All test cases should be automated where possible
- Critical path tests run on every commit
- Performance regression detection
- Automated test report generation

### Test Data Management
- Reproducible test datasets
- Automated test data cleanup
- Performance baseline maintenance
- Test environment isolation

### Monitoring and Alerting
- Test execution time tracking
- Failure rate monitoring
- Performance trend analysis
- Automated failure notifications

## Acceptance Criteria

For WF-TECH-004 to be considered successfully implemented, the following criteria must be met:

### Functional Requirements
- ✅ All deterministic replay tests pass
- ✅ All crash recovery tests pass
- ✅ All data integrity tests pass
- ✅ All integration tests pass

### Performance Requirements
- ✅ 99% of operations complete within frame budget
- ✅ Memory usage remains stable over extended operation
- ✅ Database operations scale appropriately with data size
- ✅ No performance regressions from baseline

### Security Requirements
- ✅ All privacy tests pass
- ✅ No external network connections detected
- ✅ Data export/purge functionality works correctly
- ✅ Audit trails maintain integrity

### Reliability Requirements
- ✅ System recovers from all tested failure scenarios
- ✅ Error handling prevents data corruption
- ✅ Graceful degradation under resource constraints
- ✅ No critical bugs in error paths

## Test Environment Setup

### Dependencies
```bash
# Python dependencies
pip install pytest pytest-asyncio sqlite3 jsonschema pyyaml

# System dependencies
sudo apt-get install sqlite3 sqlite3-dev

# Development tools
pip install pytest-cov pytest-benchmark memory-profiler
```

### Database Setup
```sql
-- Create test database
.read WF-TECH-004-DBSchema.sql

-- Insert test data
.read test-data-setup.sql
```

### Configuration
```python
# Test configuration
TEST_CONFIG = {
    "database_path": "test_wirthforge.db",
    "schema_path": "assets/schemas/",
    "performance_thresholds": {
        "frame_budget_ms": 16.67,
        "write_latency_ms": 20,
        "memory_growth_mb_per_10k_events": 1
    }
}
```

## Reporting

### Test Results Format
- JUnit XML for CI integration
- HTML reports for human review
- Performance metrics in JSON format
- Coverage reports with line-by-line analysis

### Success Metrics
- Test pass rate: 100% for critical tests, >95% overall
- Performance within thresholds: >99% compliance
- Code coverage: >90% for core state management code
- Documentation coverage: 100% for public APIs

This test specification ensures that the WIRTHFORGE state management system meets all requirements for correctness, performance, security, and reliability before deployment.
