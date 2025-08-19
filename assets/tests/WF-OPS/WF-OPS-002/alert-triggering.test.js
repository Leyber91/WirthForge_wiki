/**
 * WIRTHFORGE Alert Triggering Test Suite
 * 
 * Tests for alert rule evaluation, condition logic, debouncing, escalation,
 * notification delivery, and alert state management.
 */

const { AlertEngine, AlertRule, RuleEvaluator } = require('../../../code/WF-OPS/WF-OPS-002/alert-engine');

describe('WF-OPS-002 Alert Triggering', () => {
    let alertEngine;
    let mockMetrics;
    
    beforeEach(() => {
        alertEngine = new AlertEngine({
            maxRules: 100,
            evaluationBudgetMs: 5.0,
            maxAlertsPerSecond: 50,
            defaultCooldownMs: 10000
        });
        
        mockMetrics = [
            {
                timestamp: Date.now(),
                source: 'system',
                type: 'system',
                data: {
                    cpu_percent: 75,
                    memory_percent: 60,
                    disk_io_percent: 30
                }
            },
            {
                timestamp: Date.now(),
                source: 'model',
                type: 'model',
                data: {
                    tokens_per_second: 25,
                    ttft_ms: 150,
                    energy_joules: 0.5
                }
            }
        ];
    });
    
    afterEach(async () => {
        if (alertEngine.isRunning) {
            alertEngine.stop();
        }
    });
    
    describe('Rule Loading and Validation', () => {
        test('should load valid alert rules successfully', async () => {
            const validRules = [
                {
                    id: 'cpu_high',
                    name: 'High CPU Usage',
                    enabled: true,
                    severity: 'warning',
                    category: 'performance',
                    conditions: {
                        when_all: [
                            {
                                metric: 'system.data.cpu_percent',
                                operator: '>',
                                value: 80,
                                window: '5m',
                                aggregation: 'avg'
                            }
                        ]
                    },
                    actions: [
                        {
                            type: 'notify.toast',
                            level: 'warning',
                            message: 'CPU usage is high'
                        }
                    ]
                },
                {
                    id: 'memory_critical',
                    name: 'Critical Memory Usage',
                    enabled: true,
                    severity: 'critical',
                    category: 'performance',
                    conditions: {
                        when_all: [
                            {
                                metric: 'system.data.memory_percent',
                                operator: '>=',
                                value: 90,
                                window: '1m',
                                aggregation: 'max'
                            }
                        ]
                    },
                    actions: [
                        {
                            type: 'notify.toast',
                            level: 'critical',
                            message: 'Memory usage is critical'
                        }
                    ]
                }
            ];
            
            await alertEngine.start();
            const loadedRules = await alertEngine.loadRules(validRules);
            
            expect(loadedRules).toHaveLength(2);
            expect(loadedRules).toContain('cpu_high');
            expect(loadedRules).toContain('memory_critical');
            
            const stats = alertEngine.getStatistics();
            expect(stats.totalRules).toBe(2);
            expect(stats.activeRules).toBe(2);
        });
        
        test('should reject invalid alert rules', async () => {
            const invalidRules = [
                {
                    // Missing required fields
                    id: 'invalid_rule',
                    name: 'Invalid Rule'
                    // Missing: enabled, severity, conditions, actions
                },
                {
                    id: 'empty_conditions',
                    name: 'Empty Conditions',
                    enabled: true,
                    severity: 'warning',
                    conditions: {}, // Empty conditions
                    actions: [{ type: 'notify.toast', message: 'Test' }]
                }
            ];
            
            await alertEngine.start();
            
            // Should handle invalid rules gracefully
            const loadedRules = await alertEngine.loadRules(invalidRules);
            expect(loadedRules).toHaveLength(0);
            
            const stats = alertEngine.getStatistics();
            expect(stats.totalRules).toBe(0);
        });
        
        test('should prevent duplicate rule IDs', async () => {
            const duplicateRules = [
                {
                    id: 'duplicate_id',
                    name: 'First Rule',
                    enabled: true,
                    severity: 'warning',
                    conditions: {
                        when_all: [{ metric: 'system.data.cpu_percent', operator: '>', value: 50 }]
                    },
                    actions: [{ type: 'notify.toast', message: 'First' }]
                },
                {
                    id: 'duplicate_id', // Same ID
                    name: 'Second Rule',
                    enabled: true,
                    severity: 'critical',
                    conditions: {
                        when_all: [{ metric: 'system.data.memory_percent', operator: '>', value: 80 }]
                    },
                    actions: [{ type: 'notify.toast', message: 'Second' }]
                }
            ];
            
            await alertEngine.start();
            const loadedRules = await alertEngine.loadRules(duplicateRules);
            
            // Only first rule should be loaded
            expect(loadedRules).toHaveLength(1);
            expect(loadedRules[0]).toBe('duplicate_id');
        });
    });
    
    describe('Condition Evaluation', () => {
        test('should trigger alert when conditions are met', async () => {
            const triggeredAlerts = [];
            
            const rule = {
                id: 'cpu_test',
                name: 'CPU Test',
                enabled: true,
                severity: 'warning',
                conditions: {
                    when_all: [
                        {
                            metric: 'system.data.cpu_percent',
                            operator: '>',
                            value: 70 // Should trigger with mock data (75%)
                        }
                    ]
                },
                actions: [{ type: 'notify.toast', message: 'CPU high' }]
            };
            
            alertEngine.on('alertsTriggered', (alerts) => {
                triggeredAlerts.push(...alerts);
            });
            
            await alertEngine.start();
            await alertEngine.loadRules([rule]);
            
            // Evaluate with mock metrics
            await alertEngine.evaluateMetrics(mockMetrics);
            
            expect(triggeredAlerts).toHaveLength(1);
            expect(triggeredAlerts[0].ruleId).toBe('cpu_test');
            expect(triggeredAlerts[0].severity).toBe('warning');
        });
        
        test('should not trigger alert when conditions are not met', async () => {
            const triggeredAlerts = [];
            
            const rule = {
                id: 'cpu_test',
                name: 'CPU Test',
                enabled: true,
                severity: 'warning',
                conditions: {
                    when_all: [
                        {
                            metric: 'system.data.cpu_percent',
                            operator: '>',
                            value: 90 // Should NOT trigger with mock data (75%)
                        }
                    ]
                },
                actions: [{ type: 'notify.toast', message: 'CPU high' }]
            };
            
            alertEngine.on('alertsTriggered', (alerts) => {
                triggeredAlerts.push(...alerts);
            });
            
            await alertEngine.start();
            await alertEngine.loadRules([rule]);
            
            await alertEngine.evaluateMetrics(mockMetrics);
            
            expect(triggeredAlerts).toHaveLength(0);
        });
        
        test('should handle complex logical conditions', async () => {
            const triggeredAlerts = [];
            
            // Test AND logic (when_all)
            const andRule = {
                id: 'and_test',
                name: 'AND Test',
                enabled: true,
                severity: 'warning',
                conditions: {
                    when_all: [
                        { metric: 'system.data.cpu_percent', operator: '>', value: 70 }, // True (75 > 70)
                        { metric: 'system.data.memory_percent', operator: '>', value: 50 } // True (60 > 50)
                    ]
                },
                actions: [{ type: 'notify.toast', message: 'AND triggered' }]
            };
            
            // Test OR logic (when_any)
            const orRule = {
                id: 'or_test',
                name: 'OR Test',
                enabled: true,
                severity: 'info',
                conditions: {
                    when_any: [
                        { metric: 'system.data.cpu_percent', operator: '>', value: 90 }, // False (75 <= 90)
                        { metric: 'system.data.memory_percent', operator: '>', value: 50 } // True (60 > 50)
                    ]
                },
                actions: [{ type: 'notify.toast', message: 'OR triggered' }]
            };
            
            alertEngine.on('alertsTriggered', (alerts) => {
                triggeredAlerts.push(...alerts);
            });
            
            await alertEngine.start();
            await alertEngine.loadRules([andRule, orRule]);
            
            await alertEngine.evaluateMetrics(mockMetrics);
            
            expect(triggeredAlerts).toHaveLength(2);
            expect(triggeredAlerts.find(a => a.ruleId === 'and_test')).toBeDefined();
            expect(triggeredAlerts.find(a => a.ruleId === 'or_test')).toBeDefined();
        });
        
        test('should support different comparison operators', async () => {
            const operators = [
                { op: '>', value: 70, expected: true },  // 75 > 70
                { op: '>=', value: 75, expected: true }, // 75 >= 75
                { op: '<', value: 80, expected: true },  // 75 < 80
                { op: '<=', value: 75, expected: true }, // 75 <= 75
                { op: '==', value: 75, expected: true }, // 75 == 75
                { op: '!=', value: 80, expected: true }  // 75 != 80
            ];
            
            const triggeredAlerts = [];
            
            alertEngine.on('alertsTriggered', (alerts) => {
                triggeredAlerts.push(...alerts);
            });
            
            await alertEngine.start();
            
            for (let i = 0; i < operators.length; i++) {
                const { op, value, expected } = operators[i];
                
                const rule = {
                    id: `op_test_${i}`,
                    name: `Operator ${op} Test`,
                    enabled: true,
                    severity: 'info',
                    conditions: {
                        when_all: [
                            {
                                metric: 'system.data.cpu_percent',
                                operator: op,
                                value: value
                            }
                        ]
                    },
                    actions: [{ type: 'notify.toast', message: `${op} triggered` }]
                };
                
                await alertEngine.loadRules([rule]);
            }
            
            await alertEngine.evaluateMetrics(mockMetrics);
            
            // All operators should trigger based on our test values
            expect(triggeredAlerts).toHaveLength(operators.length);
        });
    });
    
    describe('Alert State Management', () => {
        test('should track active alert states', async () => {
            const rule = {
                id: 'state_test',
                name: 'State Test',
                enabled: true,
                severity: 'warning',
                conditions: {
                    when_all: [{ metric: 'system.data.cpu_percent', operator: '>', value: 70 }]
                },
                actions: [{ type: 'notify.toast', message: 'State test' }]
            };
            
            await alertEngine.start();
            await alertEngine.loadRules([rule]);
            
            // Initially no active alerts
            let activeAlerts = alertEngine.getActiveAlerts();
            expect(activeAlerts).toHaveLength(0);
            
            // Trigger alert
            await alertEngine.evaluateMetrics(mockMetrics);
            
            // Should have one active alert
            activeAlerts = alertEngine.getActiveAlerts();
            expect(activeAlerts).toHaveLength(1);
            expect(activeAlerts[0].ruleId).toBe('state_test');
        });
        
        test('should resolve alerts when conditions clear', async () => {
            const resolvedAlerts = [];
            
            const rule = {
                id: 'resolve_test',
                name: 'Resolve Test',
                enabled: true,
                severity: 'warning',
                conditions: {
                    when_all: [{ metric: 'system.data.cpu_percent', operator: '>', value: 70 }]
                },
                actions: [{ type: 'notify.toast', message: 'Resolve test' }]
            };
            
            alertEngine.on('alertResolved', (alert) => {
                resolvedAlerts.push(alert);
            });
            
            await alertEngine.start();
            await alertEngine.loadRules([rule]);
            
            // Trigger alert
            await alertEngine.evaluateMetrics(mockMetrics);
            expect(alertEngine.getActiveAlerts()).toHaveLength(1);
            
            // Clear condition (CPU below threshold)
            const clearMetrics = [{
                ...mockMetrics[0],
                data: { ...mockMetrics[0].data, cpu_percent: 50 }
            }];
            
            await alertEngine.evaluateMetrics(clearMetrics);
            
            // Alert should be resolved
            expect(resolvedAlerts).toHaveLength(1);
            expect(alertEngine.getActiveAlerts()).toHaveLength(0);
        });
        
        test('should not trigger duplicate alerts for same condition', async () => {
            const triggeredAlerts = [];
            
            const rule = {
                id: 'duplicate_test',
                name: 'Duplicate Test',
                enabled: true,
                severity: 'warning',
                conditions: {
                    when_all: [{ metric: 'system.data.cpu_percent', operator: '>', value: 70 }]
                },
                actions: [{ type: 'notify.toast', message: 'Duplicate test' }]
            };
            
            alertEngine.on('alertsTriggered', (alerts) => {
                triggeredAlerts.push(...alerts);
            });
            
            await alertEngine.start();
            await alertEngine.loadRules([rule]);
            
            // Trigger same condition multiple times
            await alertEngine.evaluateMetrics(mockMetrics);
            await alertEngine.evaluateMetrics(mockMetrics);
            await alertEngine.evaluateMetrics(mockMetrics);
            
            // Should only trigger once
            expect(triggeredAlerts).toHaveLength(1);
            expect(alertEngine.getActiveAlerts()).toHaveLength(1);
        });
    });
    
    describe('Debouncing and Rate Limiting', () => {
        test('should respect debouncing cooldown periods', async () => {
            const triggeredAlerts = [];
            
            const rule = {
                id: 'debounce_test',
                name: 'Debounce Test',
                enabled: true,
                severity: 'warning',
                conditions: {
                    when_all: [{ metric: 'system.data.cpu_percent', operator: '>', value: 70 }]
                },
                actions: [{ type: 'notify.toast', message: 'Debounce test' }],
                debounce: {
                    cooldown_ms: 1000 // 1 second cooldown
                }
            };
            
            alertEngine.on('alertsTriggered', (alerts) => {
                triggeredAlerts.push(...alerts);
            });
            
            await alertEngine.start();
            await alertEngine.loadRules([rule]);
            
            // Trigger alert
            await alertEngine.evaluateMetrics(mockMetrics);
            expect(triggeredAlerts).toHaveLength(1);
            
            // Clear and immediately re-trigger (should be debounced)
            const clearMetrics = [{
                ...mockMetrics[0],
                data: { ...mockMetrics[0].data, cpu_percent: 50 }
            }];
            
            await alertEngine.evaluateMetrics(clearMetrics);
            await alertEngine.evaluateMetrics(mockMetrics); // Re-trigger immediately
            
            // Should still only have one alert due to debouncing
            expect(triggeredAlerts).toHaveLength(1);
            
            // Wait for cooldown and try again
            await new Promise(resolve => setTimeout(resolve, 1100));
            await alertEngine.evaluateMetrics(mockMetrics);
            
            // Now should have second alert
            expect(triggeredAlerts).toHaveLength(2);
        });
        
        test('should enforce rate limiting', async () => {
            const triggeredAlerts = [];
            const maxAlertsPerSecond = 5;
            
            const rateLimitedEngine = new AlertEngine({
                maxAlertsPerSecond
            });
            
            rateLimitedEngine.on('alertsTriggered', (alerts) => {
                triggeredAlerts.push(...alerts);
            });
            
            // Create multiple rules that will all trigger
            const rules = [];
            for (let i = 0; i < 10; i++) {
                rules.push({
                    id: `rate_test_${i}`,
                    name: `Rate Test ${i}`,
                    enabled: true,
                    severity: 'info',
                    conditions: {
                        when_all: [{ metric: 'system.data.cpu_percent', operator: '>', value: 70 }]
                    },
                    actions: [{ type: 'notify.toast', message: `Rate test ${i}` }]
                });
            }
            
            await rateLimitedEngine.start();
            await rateLimitedEngine.loadRules(rules);
            
            // Trigger all rules at once
            await rateLimitedEngine.evaluateMetrics(mockMetrics);
            
            // Should be limited to maxAlertsPerSecond
            expect(triggeredAlerts.length).toBeLessThanOrEqual(maxAlertsPerSecond);
            
            rateLimitedEngine.stop();
        });
    });
    
    describe('Alert Actions', () => {
        test('should execute notification actions', async () => {
            const notifications = [];
            
            const rule = {
                id: 'notification_test',
                name: 'Notification Test',
                enabled: true,
                severity: 'warning',
                conditions: {
                    when_all: [{ metric: 'system.data.cpu_percent', operator: '>', value: 70 }]
                },
                actions: [
                    {
                        type: 'notify.toast',
                        level: 'warning',
                        message: 'CPU is high',
                        duration_ms: 5000
                    },
                    {
                        type: 'notify.sound',
                        sound: 'alert.wav',
                        volume: 0.7
                    }
                ]
            };
            
            alertEngine.on('notification', (notification) => {
                notifications.push(notification);
            });
            
            await alertEngine.start();
            await alertEngine.loadRules([rule]);
            
            await alertEngine.evaluateMetrics(mockMetrics);
            
            expect(notifications).toHaveLength(2);
            
            const toastNotification = notifications.find(n => n.type === 'toast');
            expect(toastNotification).toBeDefined();
            expect(toastNotification.level).toBe('warning');
            expect(toastNotification.message).toBe('CPU is high');
            
            const soundNotification = notifications.find(n => n.type === 'sound');
            expect(soundNotification).toBeDefined();
            expect(soundNotification.sound).toBe('alert.wav');
        });
        
        test('should execute logging actions', async () => {
            const logEntries = [];
            
            const rule = {
                id: 'logging_test',
                name: 'Logging Test',
                enabled: true,
                severity: 'critical',
                conditions: {
                    when_all: [{ metric: 'system.data.memory_percent', operator: '>', value: 50 }]
                },
                actions: [
                    {
                        type: 'log.audit',
                        category: 'performance',
                        message: 'Memory usage exceeded threshold'
                    },
                    {
                        type: 'log.debug',
                        category: 'monitoring',
                        details: { threshold: 50, actual: '{{memory_percent}}' }
                    }
                ]
            };
            
            alertEngine.on('log', (logEntry) => {
                logEntries.push(logEntry);
            });
            
            await alertEngine.start();
            await alertEngine.loadRules([rule]);
            
            await alertEngine.evaluateMetrics(mockMetrics);
            
            expect(logEntries).toHaveLength(2);
            
            const auditLog = logEntries.find(l => l.level === 'audit');
            expect(auditLog).toBeDefined();
            expect(auditLog.category).toBe('performance');
            
            const debugLog = logEntries.find(l => l.level === 'debug');
            expect(debugLog).toBeDefined();
            expect(debugLog.category).toBe('monitoring');
        });
        
        test('should execute suggestion actions', async () => {
            const suggestions = [];
            
            const rule = {
                id: 'suggestion_test',
                name: 'Suggestion Test',
                enabled: true,
                severity: 'warning',
                conditions: {
                    when_all: [{ metric: 'model.data.ttft_ms', operator: '>', value: 100 }]
                },
                actions: [
                    {
                        type: 'suggest.mitigation',
                        target: 'model_optimization',
                        message: 'Consider reducing model size or increasing GPU memory',
                        actions: ['reduce_batch_size', 'enable_quantization']
                    }
                ]
            };
            
            alertEngine.on('suggestion', (suggestion) => {
                suggestions.push(suggestion);
            });
            
            await alertEngine.start();
            await alertEngine.loadRules([rule]);
            
            await alertEngine.evaluateMetrics(mockMetrics);
            
            expect(suggestions).toHaveLength(1);
            expect(suggestions[0].type).toBe('mitigation');
            expect(suggestions[0].target).toBe('model_optimization');
            expect(suggestions[0].actions).toContain('reduce_batch_size');
        });
    });
    
    describe('Performance and Reliability', () => {
        test('should complete evaluation within frame budget', async () => {
            const frameBudget = 5.0; // 5ms budget
            const evaluationTimes = [];
            
            // Create many rules to stress test
            const rules = [];
            for (let i = 0; i < 50; i++) {
                rules.push({
                    id: `perf_test_${i}`,
                    name: `Performance Test ${i}`,
                    enabled: true,
                    severity: 'info',
                    conditions: {
                        when_all: [
                            { metric: 'system.data.cpu_percent', operator: '>', value: Math.random() * 100 },
                            { metric: 'system.data.memory_percent', operator: '<', value: Math.random() * 100 }
                        ]
                    },
                    actions: [{ type: 'notify.toast', message: `Test ${i}` }]
                });
            }
            
            await alertEngine.start();
            await alertEngine.loadRules(rules);
            
            // Measure evaluation times
            for (let i = 0; i < 10; i++) {
                const startTime = performance.now();
                await alertEngine.evaluateMetrics(mockMetrics);
                const evaluationTime = performance.now() - startTime;
                evaluationTimes.push(evaluationTime);
            }
            
            // Most evaluations should be within budget
            const withinBudget = evaluationTimes.filter(time => time <= frameBudget);
            const budgetCompliance = withinBudget.length / evaluationTimes.length;
            
            expect(budgetCompliance).toBeGreaterThan(0.8); // 80% compliance
        });
        
        test('should handle malformed metrics gracefully', async () => {
            const errors = [];
            
            const rule = {
                id: 'error_test',
                name: 'Error Test',
                enabled: true,
                severity: 'warning',
                conditions: {
                    when_all: [{ metric: 'system.data.cpu_percent', operator: '>', value: 50 }]
                },
                actions: [{ type: 'notify.toast', message: 'Error test' }]
            };
            
            alertEngine.on('error', (error) => {
                errors.push(error);
            });
            
            alertEngine.on('ruleEvaluationError', (errorInfo) => {
                errors.push(errorInfo);
            });
            
            await alertEngine.start();
            await alertEngine.loadRules([rule]);
            
            // Send malformed metrics
            const malformedMetrics = [
                null,
                undefined,
                { /* missing required fields */ },
                { timestamp: 'invalid', source: 'test' },
                { timestamp: Date.now(), source: 'test', data: null }
            ];
            
            for (const badMetric of malformedMetrics) {
                await alertEngine.evaluateMetrics([badMetric]);
            }
            
            // Engine should continue running despite errors
            expect(alertEngine.isRunning).toBe(true);
            
            // Should still work with valid metrics
            await alertEngine.evaluateMetrics(mockMetrics);
            const stats = alertEngine.getStatistics();
            expect(stats.rulesEvaluated).toBeGreaterThan(0);
        });
        
        test('should maintain statistics accurately', async () => {
            const rule = {
                id: 'stats_test',
                name: 'Stats Test',
                enabled: true,
                severity: 'info',
                conditions: {
                    when_all: [{ metric: 'system.data.cpu_percent', operator: '>', value: 70 }]
                },
                actions: [{ type: 'notify.toast', message: 'Stats test' }]
            };
            
            await alertEngine.start();
            await alertEngine.loadRules([rule]);
            
            const initialStats = alertEngine.getStatistics();
            expect(initialStats.rulesEvaluated).toBe(0);
            expect(initialStats.alertsTriggered).toBe(0);
            
            // Trigger multiple evaluations
            for (let i = 0; i < 5; i++) {
                await alertEngine.evaluateMetrics(mockMetrics);
            }
            
            const finalStats = alertEngine.getStatistics();
            expect(finalStats.rulesEvaluated).toBeGreaterThan(initialStats.rulesEvaluated);
            expect(finalStats.alertsTriggered).toBeGreaterThan(initialStats.alertsTriggered);
            expect(finalStats.avgEvaluationTime).toBeGreaterThan(0);
        });
    });
});

// Helper functions for testing
function createTestRule(id, conditions, actions = null) {
    return {
        id,
        name: `Test Rule ${id}`,
        enabled: true,
        severity: 'warning',
        category: 'test',
        conditions,
        actions: actions || [{ type: 'notify.toast', message: `Alert from ${id}` }]
    };
}

function createTestMetric(source, data, timestamp = Date.now()) {
    return {
        timestamp,
        source,
        type: source,
        data
    };
}

async function waitForAlerts(alertEngine, expectedCount, timeoutMs = 1000) {
    return new Promise((resolve, reject) => {
        const alerts = [];
        const timeout = setTimeout(() => {
            reject(new Error(`Timeout waiting for ${expectedCount} alerts, got ${alerts.length}`));
        }, timeoutMs);
        
        alertEngine.on('alertsTriggered', (triggeredAlerts) => {
            alerts.push(...triggeredAlerts);
            if (alerts.length >= expectedCount) {
                clearTimeout(timeout);
                resolve(alerts);
            }
        });
    });
}
