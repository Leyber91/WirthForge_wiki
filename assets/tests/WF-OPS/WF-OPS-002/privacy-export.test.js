/**
 * WIRTHFORGE Privacy Export Test Suite
 * 
 * Tests for privacy-preserving analytics, user consent management,
 * data export controls, and compliance with privacy requirements.
 */

const { WirthForgeAnalytics, ConsentManager, PrivacyFilter, ExportManager } = require('../../../code/WF-OPS/WF-OPS-002/analytics');

describe('WF-OPS-002 Privacy Export', () => {
    let analytics;
    let consentManager;
    let privacyFilter;
    let exportManager;
    
    beforeEach(async () => {
        analytics = new WirthForgeAnalytics({
            privacyLevel: 'strict',
            consentRequired: true,
            retentionDays: 7
        });
        
        consentManager = new ConsentManager({
            consentRequired: true
        });
        
        privacyFilter = new PrivacyFilter({
            privacyLevel: 'strict'
        });
        
        exportManager = new ExportManager({
            exportFormats: ['json', 'csv']
        });
        
        await analytics.start();
        await consentManager.initialize();
    });
    
    afterEach(async () => {
        if (analytics.isRunning) {
            await analytics.stop();
        }
    });
    
    describe('Privacy Filtering', () => {
        test('should filter sensitive data based on privacy level', async () => {
            const testMetrics = [
                {
                    timestamp: Date.now(),
                    source: 'system',
                    privacy_level: 'public',
                    data: { cpu_percent: 75 }
                },
                {
                    timestamp: Date.now(),
                    source: 'model',
                    privacy_level: 'local_only',
                    data: { tokens_per_second: 25 }
                },
                {
                    timestamp: Date.now(),
                    source: 'user',
                    privacy_level: 'restricted',
                    data: { session_id: 'abc123', user_id: 'user456' }
                }
            ];
            
            const filteredMetrics = [];
            
            for (const metric of testMetrics) {
                const filtered = await privacyFilter.filter(metric);
                if (filtered) {
                    filteredMetrics.push(filtered);
                }
            }
            
            // In strict mode, public data should be blocked
            expect(filteredMetrics.length).toBeLessThan(testMetrics.length);
            
            // Should not contain public privacy level data
            const publicData = filteredMetrics.filter(m => m.privacy_level === 'public');
            expect(publicData).toHaveLength(0);
            
            // Local-only and restricted data should pass through
            const localData = filteredMetrics.filter(m => m.privacy_level === 'local_only');
            expect(localData.length).toBeGreaterThan(0);
        });
        
        test('should anonymize data for export', async () => {
            const testData = [
                {
                    timestamp: 1640995200000, // Specific timestamp
                    user_id: 'user123',
                    session_id: 'session456',
                    data: { cpu_percent: 75 }
                },
                {
                    timestamp: 1640995260000, // 1 minute later
                    user_id: 'user789',
                    session_id: 'session101',
                    data: { memory_percent: 60 }
                }
            ];
            
            const privacyConfig = {
                anonymize_timestamps: true,
                remove_identifiers: true
            };
            
            const processedData = await privacyFilter.processForExport(testData, privacyConfig);
            
            // Verify anonymization
            processedData.forEach(item => {
                // Timestamps should be rounded to hour boundaries
                expect(item.timestamp % 3600000).toBe(0);
                
                // User identifiers should be removed
                expect(item.user_id).toBeUndefined();
                expect(item.session_id).toBeUndefined();
                
                // Data should be preserved
                expect(item.data).toBeDefined();
            });
        });
        
        test('should apply data minimization principles', async () => {
            const verboseMetric = {
                timestamp: Date.now(),
                source: 'system',
                user_id: 'user123',
                session_id: 'session456',
                device_id: 'device789',
                ip_address: '192.168.1.1',
                user_agent: 'Mozilla/5.0...',
                privacy_level: 'local_only',
                data: {
                    cpu_percent: 75,
                    memory_percent: 60,
                    internal_debug_info: 'sensitive debug data'
                }
            };
            
            // Process through analytics pipeline
            await analytics.processMetrics([verboseMetric]);
            
            // Get processed data
            const stats = analytics.getStatistics();
            expect(stats.dataPointsProcessed).toBe(1);
            expect(stats.privacyViolationsPrevented).toBe(0);
        });
    });
    
    describe('Consent Management', () => {
        test('should require consent for data export', async () => {
            const userId = 'test_user_123';
            const exportConfig = {
                user_id: userId,
                data_scope: [
                    {
                        type: 'raw_metrics',
                        source: 'system',
                        time_range: { start: Date.now() - 3600000, end: Date.now() }
                    }
                ],
                output: { format: 'json' },
                privacy: { anonymize_timestamps: false }
            };
            
            // Try to export without consent
            await expect(analytics.createExport(exportConfig))
                .rejects.toThrow('User consent required for data export');
            
            // Record consent
            await analytics.recordConsent(userId, {
                scopes: ['raw_metrics', 'aggregated_metrics'],
                granted_at: Date.now(),
                expires_at: Date.now() + 86400000 // 24 hours
            });
            
            // Now export should succeed
            const exportResult = await analytics.createExport(exportConfig);
            expect(exportResult.jobId).toBeDefined();
            expect(exportResult.status).toBe('created');
        });
        
        test('should respect consent scope limitations', async () => {
            const userId = 'test_user_456';
            
            // Grant limited consent (only aggregated data)
            await analytics.recordConsent(userId, {
                scopes: ['aggregated_metrics'],
                granted_at: Date.now(),
                expires_at: Date.now() + 86400000
            });
            
            // Try to export raw data (should fail)
            const rawExportConfig = {
                user_id: userId,
                data_scope: [{ type: 'raw_metrics', source: 'system' }],
                output: { format: 'json' },
                privacy: { anonymize_timestamps: true }
            };
            
            await expect(analytics.createExport(rawExportConfig))
                .rejects.toThrow('User consent required for data export');
            
            // Try to export aggregated data (should succeed)
            const aggExportConfig = {
                user_id: userId,
                data_scope: [{ type: 'aggregated_metrics', source: 'system' }],
                output: { format: 'json' },
                privacy: { anonymize_timestamps: true }
            };
            
            const exportResult = await analytics.createExport(aggExportConfig);
            expect(exportResult.status).toBe('created');
        });
        
        test('should handle consent revocation', async () => {
            const userId = 'test_user_789';
            
            // Grant consent
            await analytics.recordConsent(userId, {
                scopes: ['*'], // All scopes
                granted_at: Date.now(),
                expires_at: Date.now() + 86400000
            });
            
            // Verify consent exists
            const hasConsent = await consentManager.checkConsent(userId, ['raw_metrics']);
            expect(hasConsent).toBe(true);
            
            // Revoke consent
            await analytics.revokeConsent(userId, 'raw_metrics');
            
            // Verify consent is revoked
            const hasConsentAfter = await consentManager.checkConsent(userId, ['raw_metrics']);
            expect(hasConsentAfter).toBe(false);
        });
    });
    
    describe('Data Export Functionality', () => {
        test('should export data in JSON format', async () => {
            const userId = 'export_test_user';
            
            // Add test data
            const testMetrics = [
                {
                    timestamp: Date.now() - 2000,
                    source: 'system',
                    privacy_level: 'local_only',
                    data: { cpu_percent: 75, memory_percent: 60 }
                },
                {
                    timestamp: Date.now() - 1000,
                    source: 'system',
                    privacy_level: 'local_only',
                    data: { cpu_percent: 80, memory_percent: 65 }
                }
            ];
            
            await analytics.processMetrics(testMetrics);
            
            // Grant consent
            await analytics.recordConsent(userId, {
                scopes: ['*'],
                granted_at: Date.now(),
                expires_at: Date.now() + 86400000
            });
            
            // Create export
            const exportConfig = {
                user_id: userId,
                data_scope: [
                    {
                        type: 'raw_metrics',
                        source: 'system',
                        time_range: { start: Date.now() - 5000, end: Date.now() }
                    }
                ],
                output: { format: 'json' },
                privacy: { anonymize_timestamps: false, remove_identifiers: true }
            };
            
            const exportResult = await analytics.createExport(exportConfig);
            
            // Wait for export completion
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const exportStatus = analytics.getExportStatus(exportResult.jobId);
            expect(exportStatus.status).toBe('completed');
            
            const exportOutput = analytics.getExportOutput(exportResult.jobId);
            expect(exportOutput).toBeDefined();
            
            // Verify JSON format
            const parsedOutput = JSON.parse(exportOutput);
            expect(Array.isArray(parsedOutput)).toBe(true);
            expect(parsedOutput.length).toBeGreaterThan(0);
        });
        
        test('should export data in CSV format', async () => {
            const userId = 'csv_export_user';
            
            // Add test data
            const testMetrics = [
                {
                    timestamp: Date.now(),
                    source: 'model',
                    privacy_level: 'local_only',
                    data: { tokens_per_second: 25, ttft_ms: 150 }
                }
            ];
            
            await analytics.processMetrics(testMetrics);
            
            // Grant consent
            await analytics.recordConsent(userId, {
                scopes: ['*'],
                granted_at: Date.now(),
                expires_at: Date.now() + 86400000
            });
            
            // Create CSV export
            const exportConfig = {
                user_id: userId,
                data_scope: [
                    {
                        type: 'raw_metrics',
                        source: 'model',
                        time_range: { start: Date.now() - 1000, end: Date.now() + 1000 }
                    }
                ],
                output: { format: 'csv' },
                privacy: { anonymize_timestamps: true, remove_identifiers: true }
            };
            
            const exportResult = await analytics.createExport(exportConfig);
            
            // Wait for completion
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const exportOutput = analytics.getExportOutput(exportResult.jobId);
            expect(exportOutput).toBeDefined();
            
            // Verify CSV format
            const lines = exportOutput.split('\n');
            expect(lines.length).toBeGreaterThan(1); // Header + data
            expect(lines[0]).toContain(','); // CSV header with commas
        });
        
        test('should export aggregated statistics', async () => {
            const userId = 'stats_export_user';
            
            // Add test data for aggregation
            const testMetrics = [];
            for (let i = 0; i < 10; i++) {
                testMetrics.push({
                    timestamp: Date.now() - (i * 1000),
                    source: 'system',
                    privacy_level: 'local_only',
                    data: { cpu_percent: 50 + i * 5 }
                });
            }
            
            await analytics.processMetrics(testMetrics);
            
            // Wait for aggregation
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Grant consent
            await analytics.recordConsent(userId, {
                scopes: ['*'],
                granted_at: Date.now(),
                expires_at: Date.now() + 86400000
            });
            
            // Export statistical summary
            const exportConfig = {
                user_id: userId,
                data_scope: [
                    {
                        type: 'statistical_summary',
                        source: 'system',
                        time_range: { start: Date.now() - 15000, end: Date.now() }
                    }
                ],
                output: { format: 'json' },
                privacy: { anonymize_timestamps: true, remove_identifiers: true }
            };
            
            const exportResult = await analytics.createExport(exportConfig);
            
            // Wait for completion
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const exportStatus = analytics.getExportStatus(exportResult.jobId);
            expect(exportStatus.status).toBe('completed');
            
            const exportOutput = analytics.getExportOutput(exportResult.jobId);
            const parsedOutput = JSON.parse(exportOutput);
            
            expect(parsedOutput).toHaveLength(1);
            expect(parsedOutput[0].summary).toBeDefined();
            expect(parsedOutput[0].summary.count).toBeGreaterThan(0);
            expect(parsedOutput[0].summary.mean).toBeDefined();
            expect(parsedOutput[0].summary.min).toBeDefined();
            expect(parsedOutput[0].summary.max).toBeDefined();
        });
    });
    
    describe('Privacy Compliance', () => {
        test('should enforce data retention policies', async () => {
            const oldTimestamp = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days ago
            const recentTimestamp = Date.now() - (1 * 60 * 60 * 1000); // 1 hour ago
            
            const testMetrics = [
                {
                    timestamp: oldTimestamp,
                    source: 'system',
                    privacy_level: 'local_only',
                    data: { cpu_percent: 50 }
                },
                {
                    timestamp: recentTimestamp,
                    source: 'system',
                    privacy_level: 'local_only',
                    data: { cpu_percent: 75 }
                }
            ];
            
            await analytics.processMetrics(testMetrics);
            
            // Trigger cleanup
            await analytics.cleanupExpiredData();
            
            const stats = analytics.getStatistics();
            expect(stats.dataPointsProcessed).toBe(2);
            
            // Old data should be cleaned up based on retention policy
            // Recent data should remain
        });
        
        test('should validate export configurations', async () => {
            const invalidConfigs = [
                {}, // Empty config
                { user_id: 'test' }, // Missing required fields
                { 
                    user_id: 'test',
                    data_scope: [], // Empty scope
                    output: { format: 'json' },
                    privacy: {}
                },
                {
                    user_id: 'test',
                    data_scope: [{ type: 'raw_metrics' }],
                    // Missing output and privacy
                }
            ];
            
            for (const config of invalidConfigs) {
                await expect(analytics.createExport(config))
                    .rejects.toThrow();
            }
        });
        
        test('should prevent unauthorized data access', async () => {
            const unauthorizedUserId = 'unauthorized_user';
            
            // Add sensitive data
            const sensitiveMetrics = [
                {
                    timestamp: Date.now(),
                    source: 'user_behavior',
                    privacy_level: 'restricted',
                    data: { 
                        clicks: 50,
                        keystrokes: 200,
                        session_duration: 3600
                    }
                }
            ];
            
            await analytics.processMetrics(sensitiveMetrics);
            
            // Try to export without proper consent
            const exportConfig = {
                user_id: unauthorizedUserId,
                data_scope: [
                    {
                        type: 'raw_metrics',
                        source: 'user_behavior',
                        privacy_level: 'restricted'
                    }
                ],
                output: { format: 'json' },
                privacy: { anonymize_timestamps: true, remove_identifiers: true }
            };
            
            await expect(analytics.createExport(exportConfig))
                .rejects.toThrow('User consent required for data export');
        });
    });
    
    describe('Analytics Processing', () => {
        test('should generate privacy-preserving trend analysis', async () => {
            const testData = [];
            
            // Generate trending data
            for (let i = 0; i < 50; i++) {
                testData.push({
                    timestamp: Date.now() - (i * 60000), // 1 minute intervals
                    source: 'system',
                    privacy_level: 'local_only',
                    data: { cpu_percent: 30 + i * 0.5 + Math.random() * 10 } // Upward trend with noise
                });
            }
            
            await analytics.processMetrics(testData);
            
            const trendAnalysis = await analytics.generateTrendAnalysis(
                'system',
                { start: Date.now() - 3600000, end: Date.now() },
                { detect_anomalies: true }
            );
            
            expect(trendAnalysis.trends).toBeDefined();
            expect(trendAnalysis.insights).toBeDefined();
            expect(trendAnalysis.confidence).toBeGreaterThan(0);
            
            // In strict privacy mode, detailed anomaly data should be filtered
            const anomalyInsights = trendAnalysis.insights.filter(i => i.type === 'anomalies');
            if (anomalyInsights.length > 0) {
                expect(anomalyInsights[0].anomalies).toEqual([]);
            }
        });
        
        test('should handle concurrent export requests', async () => {
            const userId = 'concurrent_user';
            
            // Grant consent
            await analytics.recordConsent(userId, {
                scopes: ['*'],
                granted_at: Date.now(),
                expires_at: Date.now() + 86400000
            });
            
            // Add test data
            const testMetrics = Array.from({ length: 20 }, (_, i) => ({
                timestamp: Date.now() - i * 1000,
                source: 'system',
                privacy_level: 'local_only',
                data: { cpu_percent: Math.random() * 100 }
            }));
            
            await analytics.processMetrics(testMetrics);
            
            // Create multiple concurrent exports
            const exportPromises = [];
            for (let i = 0; i < 5; i++) {
                const config = {
                    user_id: userId,
                    data_scope: [
                        {
                            type: 'raw_metrics',
                            source: 'system',
                            time_range: { start: Date.now() - 25000, end: Date.now() }
                        }
                    ],
                    output: { format: 'json' },
                    privacy: { anonymize_timestamps: true, remove_identifiers: true }
                };
                
                exportPromises.push(analytics.createExport(config));
            }
            
            const exportResults = await Promise.all(exportPromises);
            
            // All exports should be created successfully
            expect(exportResults).toHaveLength(5);
            exportResults.forEach(result => {
                expect(result.jobId).toBeDefined();
                expect(result.status).toBe('created');
            });
            
            // Wait for completion
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Check that all exports completed
            const completedExports = exportResults.map(result => 
                analytics.getExportStatus(result.jobId)
            ).filter(status => status.status === 'completed');
            
            expect(completedExports.length).toBeGreaterThan(0);
        });
    });
});

// Helper functions for privacy testing
function createTestMetric(source, privacyLevel, data, timestamp = Date.now()) {
    return {
        timestamp,
        source,
        type: source,
        privacy_level: privacyLevel,
        data
    };
}

function createConsentRecord(userId, scopes, duration = 86400000) {
    return {
        user_id: userId,
        scopes: Array.isArray(scopes) ? scopes : [scopes],
        granted_at: Date.now(),
        expires_at: Date.now() + duration,
        consent_version: '1.0'
    };
}

function validatePrivacyCompliance(data, privacyConfig) {
    const violations = [];
    
    data.forEach((item, index) => {
        // Check for user identifiers
        if (privacyConfig.remove_identifiers) {
            if (item.user_id) violations.push(`Item ${index}: user_id present`);
            if (item.session_id) violations.push(`Item ${index}: session_id present`);
        }
        
        // Check timestamp precision
        if (privacyConfig.anonymize_timestamps) {
            if (item.timestamp % 3600000 !== 0) {
                violations.push(`Item ${index}: timestamp not anonymized`);
            }
        }
    });
    
    return violations;
}
