/**
 * WF-UX-009 Automation Scheduling Test Suite
 * 
 * Tests for advanced automation rules and scheduling system
 * Tests: Rule creation, trigger evaluation, scheduling, conflict resolution
 * 
 * Coverage: Cron scheduling, event triggers, resource management
 * Dependencies: Jest, Mock timers, Event simulation
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AutomationScheduler } from '../../../assets/code/WF-UX-009/automation-scheduler.js';
import { MockEnergySystem } from '../mocks/energy-system.mock.js';
import { MockWorkflowEngine } from '../mocks/workflow-engine.mock.js';
import { TestDataGenerator } from '../utils/test-data-generator.js';

describe('WF-UX-009 Automation Scheduling', () => {
    let scheduler;
    let mockEnergySystem;
    let mockWorkflowEngine;
    let testData;

    beforeEach(() => {
        // Setup mocks
        mockEnergySystem = new MockEnergySystem();
        mockWorkflowEngine = new MockWorkflowEngine();
        testData = new TestDataGenerator();
        
        // Mock timers
        jest.useFakeTimers();
        
        // Mock Date for consistent testing
        const mockDate = new Date('2024-01-15T10:00:00Z');
        jest.setSystemTime(mockDate);
        
        // Initialize scheduler
        scheduler = new AutomationScheduler({
            energySystem: mockEnergySystem,
            workflowEngine: mockWorkflowEngine,
            maxConcurrentRules: 50,
            evaluationInterval: 1000
        });
    });

    afterEach(() => {
        if (scheduler) {
            scheduler.destroy();
        }
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    describe('Rule Creation and Validation', () => {
        test('should create time-based automation rule', () => {
            const rule = {
                id: 'daily-backup',
                name: 'Daily Backup',
                trigger: {
                    type: 'schedule',
                    cron: '0 2 * * *' // Daily at 2 AM
                },
                conditions: [],
                actions: [{
                    type: 'workflow',
                    workflowId: 'backup-workflow'
                }],
                enabled: true
            };
            
            const result = scheduler.createRule(rule);
            
            expect(result.success).toBe(true);
            expect(scheduler.getRules()).toHaveLength(1);
            expect(scheduler.getRule('daily-backup')).toEqual(expect.objectContaining(rule));
        });

        test('should create event-based automation rule', () => {
            const rule = {
                id: 'energy-alert',
                name: 'Low Energy Alert',
                trigger: {
                    type: 'event',
                    event: 'energy.level.low',
                    threshold: 20
                },
                conditions: [{
                    type: 'energy',
                    operator: '<',
                    value: 25
                }],
                actions: [{
                    type: 'notification',
                    message: 'Energy level is critically low'
                }],
                enabled: true
            };
            
            const result = scheduler.createRule(rule);
            
            expect(result.success).toBe(true);
            expect(scheduler.getRule('energy-alert').trigger.type).toBe('event');
        });

        test('should validate rule structure', () => {
            const invalidRule = {
                id: 'invalid-rule',
                // Missing required fields
                trigger: {},
                actions: []
            };
            
            const result = scheduler.createRule(invalidRule);
            
            expect(result.success).toBe(false);
            expect(result.errors).toContain('Missing required field: name');
            expect(result.errors).toContain('Invalid trigger configuration');
        });

        test('should prevent duplicate rule IDs', () => {
            const rule1 = testData.generateAutomationRule('test-rule');
            const rule2 = testData.generateAutomationRule('test-rule');
            
            const result1 = scheduler.createRule(rule1);
            const result2 = scheduler.createRule(rule2);
            
            expect(result1.success).toBe(true);
            expect(result2.success).toBe(false);
            expect(result2.error).toBe('Rule with ID test-rule already exists');
        });

        test('should validate cron expressions', () => {
            const invalidCronRule = {
                id: 'invalid-cron',
                name: 'Invalid Cron',
                trigger: {
                    type: 'schedule',
                    cron: 'invalid cron expression'
                },
                actions: [{ type: 'log', message: 'test' }]
            };
            
            const result = scheduler.createRule(invalidCronRule);
            
            expect(result.success).toBe(false);
            expect(result.errors).toContain('Invalid cron expression');
        });
    });

    describe('Schedule Evaluation', () => {
        test('should evaluate cron-based schedules correctly', () => {
            const rule = {
                id: 'hourly-task',
                name: 'Hourly Task',
                trigger: {
                    type: 'schedule',
                    cron: '0 * * * *' // Every hour
                },
                actions: [{ type: 'log', message: 'Hourly execution' }]
            };
            
            scheduler.createRule(rule);
            
            // Advance time to next hour
            jest.setSystemTime(new Date('2024-01-15T11:00:00Z'));
            jest.advanceTimersByTime(1000);
            
            const executions = scheduler.getExecutionHistory();
            expect(executions).toHaveLength(1);
            expect(executions[0].ruleId).toBe('hourly-task');
        });

        test('should handle multiple scheduled rules', () => {
            const rules = [
                {
                    id: 'rule-1',
                    name: 'Rule 1',
                    trigger: { type: 'schedule', cron: '*/5 * * * *' }, // Every 5 minutes
                    actions: [{ type: 'log', message: 'Rule 1' }]
                },
                {
                    id: 'rule-2',
                    name: 'Rule 2',
                    trigger: { type: 'schedule', cron: '*/10 * * * *' }, // Every 10 minutes
                    actions: [{ type: 'log', message: 'Rule 2' }]
                }
            ];
            
            rules.forEach(rule => scheduler.createRule(rule));
            
            // Advance 10 minutes
            jest.advanceTimersByTime(10 * 60 * 1000);
            
            const executions = scheduler.getExecutionHistory();
            expect(executions.filter(e => e.ruleId === 'rule-1')).toHaveLength(2); // 5min, 10min
            expect(executions.filter(e => e.ruleId === 'rule-2')).toHaveLength(1); // 10min
        });

        test('should respect timezone settings', () => {
            const rule = {
                id: 'timezone-test',
                name: 'Timezone Test',
                trigger: {
                    type: 'schedule',
                    cron: '0 9 * * *', // 9 AM
                    timezone: 'America/New_York'
                },
                actions: [{ type: 'log', message: 'Morning task' }]
            };
            
            scheduler.createRule(rule);
            
            // Set time to 9 AM EST (14:00 UTC)
            jest.setSystemTime(new Date('2024-01-15T14:00:00Z'));
            jest.advanceTimersByTime(1000);
            
            const executions = scheduler.getExecutionHistory();
            expect(executions).toHaveLength(1);
        });

        test('should handle daylight saving time transitions', () => {
            const rule = {
                id: 'dst-test',
                name: 'DST Test',
                trigger: {
                    type: 'schedule',
                    cron: '0 2 * * *', // 2 AM daily
                    timezone: 'America/New_York'
                },
                actions: [{ type: 'log', message: 'DST task' }]
            };
            
            scheduler.createRule(rule);
            
            // Test during DST transition (spring forward)
            jest.setSystemTime(new Date('2024-03-10T07:00:00Z')); // 2 AM EST becomes 3 AM EDT
            jest.advanceTimersByTime(1000);
            
            const executions = scheduler.getExecutionHistory();
            expect(executions).toHaveLength(1);
        });
    });

    describe('Event-Based Triggers', () => {
        test('should trigger on energy level events', async () => {
            const rule = {
                id: 'energy-trigger',
                name: 'Energy Trigger',
                trigger: {
                    type: 'event',
                    event: 'energy.level.changed'
                },
                conditions: [{
                    type: 'energy',
                    operator: '<',
                    value: 30
                }],
                actions: [{ type: 'workflow', workflowId: 'energy-conservation' }]
            };
            
            scheduler.createRule(rule);
            
            // Simulate energy level drop
            mockEnergySystem.setLevel(25);
            mockEnergySystem.emit('energy.level.changed', { level: 25 });
            
            await jest.runAllTimersAsync();
            
            const executions = scheduler.getExecutionHistory();
            expect(executions).toHaveLength(1);
            expect(mockWorkflowEngine.execute).toHaveBeenCalledWith('energy-conservation');
        });

        test('should trigger on workflow completion events', async () => {
            const rule = {
                id: 'workflow-chain',
                name: 'Workflow Chain',
                trigger: {
                    type: 'event',
                    event: 'workflow.completed',
                    workflowId: 'data-processing'
                },
                actions: [{ type: 'workflow', workflowId: 'data-analysis' }]
            };
            
            scheduler.createRule(rule);
            
            // Simulate workflow completion
            mockWorkflowEngine.emit('workflow.completed', {
                workflowId: 'data-processing',
                status: 'success'
            });
            
            await jest.runAllTimersAsync();
            
            const executions = scheduler.getExecutionHistory();
            expect(executions).toHaveLength(1);
            expect(mockWorkflowEngine.execute).toHaveBeenCalledWith('data-analysis');
        });

        test('should handle system events', async () => {
            const rule = {
                id: 'system-startup',
                name: 'System Startup',
                trigger: {
                    type: 'event',
                    event: 'system.startup'
                },
                actions: [
                    { type: 'workflow', workflowId: 'initialization' },
                    { type: 'notification', message: 'System started' }
                ]
            };
            
            scheduler.createRule(rule);
            
            // Simulate system startup
            scheduler.handleSystemEvent('system.startup', {});
            
            await jest.runAllTimersAsync();
            
            const executions = scheduler.getExecutionHistory();
            expect(executions).toHaveLength(1);
            expect(executions[0].actions).toHaveLength(2);
        });

        test('should debounce rapid events', async () => {
            const rule = {
                id: 'debounced-rule',
                name: 'Debounced Rule',
                trigger: {
                    type: 'event',
                    event: 'rapid.event',
                    debounce: 5000 // 5 second debounce
                },
                actions: [{ type: 'log', message: 'Debounced execution' }]
            };
            
            scheduler.createRule(rule);
            
            // Fire multiple rapid events
            for (let i = 0; i < 10; i++) {
                scheduler.handleSystemEvent('rapid.event', {});
                jest.advanceTimersByTime(100);
            }
            
            // Should only execute once after debounce period
            jest.advanceTimersByTime(5000);
            await jest.runAllTimersAsync();
            
            const executions = scheduler.getExecutionHistory();
            expect(executions).toHaveLength(1);
        });
    });

    describe('Condition Evaluation', () => {
        test('should evaluate energy conditions', () => {
            mockEnergySystem.setLevel(45);
            
            const conditions = [
                { type: 'energy', operator: '>', value: 40 },
                { type: 'energy', operator: '<', value: 50 }
            ];
            
            const result = scheduler.evaluateConditions(conditions);
            expect(result).toBe(true);
        });

        test('should evaluate time conditions', () => {
            jest.setSystemTime(new Date('2024-01-15T14:30:00Z'));
            
            const conditions = [
                { type: 'time', operator: 'between', start: '14:00', end: '15:00' },
                { type: 'day', operator: 'in', values: ['monday'] }
            ];
            
            const result = scheduler.evaluateConditions(conditions);
            expect(result).toBe(true);
        });

        test('should evaluate system conditions', () => {
            const conditions = [
                { type: 'system', property: 'cpu', operator: '<', value: 80 },
                { type: 'system', property: 'memory', operator: '<', value: 90 }
            ];
            
            // Mock system metrics
            scheduler.setSystemMetrics({ cpu: 65, memory: 75 });
            
            const result = scheduler.evaluateConditions(conditions);
            expect(result).toBe(true);
        });

        test('should handle complex condition logic', () => {
            const conditions = [
                {
                    type: 'group',
                    operator: 'AND',
                    conditions: [
                        { type: 'energy', operator: '>', value: 50 },
                        { type: 'time', operator: 'between', start: '09:00', end: '17:00' }
                    ]
                },
                {
                    type: 'group',
                    operator: 'OR',
                    conditions: [
                        { type: 'day', operator: 'in', values: ['saturday', 'sunday'] },
                        { type: 'system', property: 'load', operator: '<', value: 30 }
                    ]
                }
            ];
            
            mockEnergySystem.setLevel(75);
            jest.setSystemTime(new Date('2024-01-15T12:00:00Z')); // Monday noon
            scheduler.setSystemMetrics({ load: 25 });
            
            const result = scheduler.evaluateConditions(conditions);
            expect(result).toBe(true);
        });
    });

    describe('Action Execution', () => {
        test('should execute workflow actions', async () => {
            const actions = [
                { type: 'workflow', workflowId: 'test-workflow', parameters: { param1: 'value1' } }
            ];
            
            await scheduler.executeActions(actions, 'test-rule');
            
            expect(mockWorkflowEngine.execute).toHaveBeenCalledWith('test-workflow', { param1: 'value1' });
        });

        test('should execute notification actions', async () => {
            const mockNotificationService = jest.fn();
            scheduler.setNotificationService(mockNotificationService);
            
            const actions = [
                { type: 'notification', message: 'Test notification', priority: 'high' }
            ];
            
            await scheduler.executeActions(actions, 'test-rule');
            
            expect(mockNotificationService).toHaveBeenCalledWith({
                message: 'Test notification',
                priority: 'high',
                source: 'automation:test-rule'
            });
        });

        test('should execute API call actions', async () => {
            const mockApiClient = {
                post: jest.fn().mockResolvedValue({ status: 200 })
            };
            scheduler.setApiClient(mockApiClient);
            
            const actions = [
                {
                    type: 'api',
                    method: 'POST',
                    url: '/api/webhook',
                    data: { event: 'automation-triggered' }
                }
            ];
            
            await scheduler.executeActions(actions, 'test-rule');
            
            expect(mockApiClient.post).toHaveBeenCalledWith('/api/webhook', {
                event: 'automation-triggered'
            });
        });

        test('should handle action execution errors', async () => {
            mockWorkflowEngine.execute.mockRejectedValue(new Error('Workflow failed'));
            
            const actions = [
                { type: 'workflow', workflowId: 'failing-workflow' }
            ];
            
            const result = await scheduler.executeActions(actions, 'test-rule');
            
            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toContain('Workflow failed');
        });

        test('should execute actions in parallel when possible', async () => {
            const actions = [
                { type: 'workflow', workflowId: 'workflow-1' },
                { type: 'workflow', workflowId: 'workflow-2' },
                { type: 'notification', message: 'Parallel execution' }
            ];
            
            const startTime = Date.now();
            await scheduler.executeActions(actions, 'test-rule');
            const executionTime = Date.now() - startTime;
            
            expect(mockWorkflowEngine.execute).toHaveBeenCalledTimes(2);
            expect(executionTime).toBeLessThan(1000); // Should be fast due to parallel execution
        });
    });

    describe('Resource Management', () => {
        test('should respect maximum concurrent executions', async () => {
            scheduler.config.maxConcurrentExecutions = 2;
            
            const rule = testData.generateLongRunningAutomationRule();
            scheduler.createRule(rule);
            
            // Trigger multiple executions
            for (let i = 0; i < 5; i++) {
                scheduler.triggerRule(rule.id);
            }
            
            await jest.runOnlyPendingTimersAsync();
            
            const activeExecutions = scheduler.getActiveExecutions();
            expect(activeExecutions).toHaveLength(2);
            
            const queuedExecutions = scheduler.getQueuedExecutions();
            expect(queuedExecutions).toHaveLength(3);
        });

        test('should manage energy budget for executions', async () => {
            const energyBudget = 100;
            scheduler.setEnergyBudget(energyBudget);
            
            const rule = {
                id: 'energy-intensive',
                name: 'Energy Intensive Rule',
                trigger: { type: 'manual' },
                actions: [
                    { type: 'workflow', workflowId: 'heavy-workflow', energyCost: 60 }
                ],
                energyCost: 60
            };
            
            scheduler.createRule(rule);
            
            // First execution should succeed
            const result1 = await scheduler.triggerRule('energy-intensive');
            expect(result1.success).toBe(true);
            
            // Second execution should be queued due to insufficient energy
            const result2 = await scheduler.triggerRule('energy-intensive');
            expect(result2.success).toBe(false);
            expect(result2.reason).toBe('insufficient-energy');
        });

        test('should prioritize rule executions', async () => {
            const rules = [
                { id: 'low-priority', priority: 1, actions: [{ type: 'log', message: 'Low' }] },
                { id: 'high-priority', priority: 10, actions: [{ type: 'log', message: 'High' }] },
                { id: 'medium-priority', priority: 5, actions: [{ type: 'log', message: 'Medium' }] }
            ];
            
            rules.forEach(rule => scheduler.createRule(rule));
            scheduler.config.maxConcurrentExecutions = 1;
            
            // Trigger all rules simultaneously
            rules.forEach(rule => scheduler.triggerRule(rule.id));
            
            await jest.runAllTimersAsync();
            
            const executions = scheduler.getExecutionHistory();
            expect(executions[0].ruleId).toBe('high-priority');
            expect(executions[1].ruleId).toBe('medium-priority');
            expect(executions[2].ruleId).toBe('low-priority');
        });
    });

    describe('Conflict Resolution', () => {
        test('should detect conflicting rules', () => {
            const rule1 = {
                id: 'rule-1',
                name: 'Rule 1',
                trigger: { type: 'schedule', cron: '0 * * * *' },
                actions: [{ type: 'system', action: 'enable-feature-x' }]
            };
            
            const rule2 = {
                id: 'rule-2',
                name: 'Rule 2',
                trigger: { type: 'schedule', cron: '0 * * * *' },
                actions: [{ type: 'system', action: 'disable-feature-x' }]
            };
            
            scheduler.createRule(rule1);
            const result = scheduler.createRule(rule2);
            
            expect(result.warnings).toContain('Potential conflict detected with rule-1');
        });

        test('should resolve conflicts based on priority', async () => {
            const rule1 = {
                id: 'low-priority-rule',
                priority: 1,
                trigger: { type: 'manual' },
                actions: [{ type: 'system', action: 'set-mode', value: 'mode-a' }]
            };
            
            const rule2 = {
                id: 'high-priority-rule',
                priority: 10,
                trigger: { type: 'manual' },
                actions: [{ type: 'system', action: 'set-mode', value: 'mode-b' }]
            };
            
            scheduler.createRule(rule1);
            scheduler.createRule(rule2);
            
            // Trigger both rules
            scheduler.triggerRule('low-priority-rule');
            scheduler.triggerRule('high-priority-rule');
            
            await jest.runAllTimersAsync();
            
            const systemState = scheduler.getSystemState();
            expect(systemState.mode).toBe('mode-b'); // High priority rule wins
        });

        test('should handle mutual exclusion rules', async () => {
            const rule1 = {
                id: 'exclusive-rule-1',
                mutuallyExclusive: ['exclusive-rule-2'],
                trigger: { type: 'manual' },
                actions: [{ type: 'log', message: 'Rule 1' }]
            };
            
            const rule2 = {
                id: 'exclusive-rule-2',
                mutuallyExclusive: ['exclusive-rule-1'],
                trigger: { type: 'manual' },
                actions: [{ type: 'log', message: 'Rule 2' }]
            };
            
            scheduler.createRule(rule1);
            scheduler.createRule(rule2);
            
            // Start rule 1
            scheduler.triggerRule('exclusive-rule-1');
            
            // Try to start rule 2 - should be blocked
            const result = scheduler.triggerRule('exclusive-rule-2');
            
            expect(result.success).toBe(false);
            expect(result.reason).toBe('mutually-exclusive-rule-active');
        });
    });

    describe('Performance and Monitoring', () => {
        test('should track execution metrics', async () => {
            const rule = testData.generateAutomationRule('metrics-test');
            scheduler.createRule(rule);
            
            await scheduler.triggerRule('metrics-test');
            
            const metrics = scheduler.getMetrics();
            expect(metrics.totalExecutions).toBe(1);
            expect(metrics.successfulExecutions).toBe(1);
            expect(metrics.averageExecutionTime).toBeGreaterThan(0);
        });

        test('should maintain performance under load', async () => {
            const rules = Array.from({ length: 100 }, (_, i) => 
                testData.generateAutomationRule(`load-test-${i}`)
            );
            
            rules.forEach(rule => scheduler.createRule(rule));
            
            const startTime = performance.now();
            
            // Trigger all rules
            await Promise.all(
                rules.map(rule => scheduler.triggerRule(rule.id))
            );
            
            const executionTime = performance.now() - startTime;
            
            expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
            expect(scheduler.getMetrics().totalExecutions).toBe(100);
        });

        test('should handle memory efficiently', async () => {
            const initialMemory = process.memoryUsage().heapUsed;
            
            // Create many rules and execute them
            for (let i = 0; i < 1000; i++) {
                const rule = testData.generateAutomationRule(`memory-test-${i}`);
                scheduler.createRule(rule);
                await scheduler.triggerRule(rule.id);
            }
            
            // Force cleanup
            scheduler.cleanup();
            
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
        });

        test('should provide real-time monitoring', async () => {
            const monitoringEvents = [];
            
            scheduler.on('execution-started', (event) => {
                monitoringEvents.push({ type: 'started', ...event });
            });
            
            scheduler.on('execution-completed', (event) => {
                monitoringEvents.push({ type: 'completed', ...event });
            });
            
            const rule = testData.generateAutomationRule('monitoring-test');
            scheduler.createRule(rule);
            
            await scheduler.triggerRule('monitoring-test');
            
            expect(monitoringEvents).toHaveLength(2);
            expect(monitoringEvents[0].type).toBe('started');
            expect(monitoringEvents[1].type).toBe('completed');
        });
    });
});

// Helper class for automation scheduler (would be implemented separately)
class AutomationScheduler {
    constructor(config) {
        this.config = config;
        this.rules = new Map();
        this.executionHistory = [];
        this.activeExecutions = new Map();
        this.queuedExecutions = [];
        this.metrics = {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            averageExecutionTime: 0
        };
    }

    createRule(rule) {
        // Implementation would validate and store rule
        this.rules.set(rule.id, rule);
        return { success: true };
    }

    getRules() {
        return Array.from(this.rules.values());
    }

    getRule(id) {
        return this.rules.get(id);
    }

    async triggerRule(ruleId) {
        // Implementation would execute rule
        const execution = {
            ruleId,
            timestamp: Date.now(),
            status: 'completed'
        };
        this.executionHistory.push(execution);
        this.metrics.totalExecutions++;
        this.metrics.successfulExecutions++;
        return { success: true };
    }

    getExecutionHistory() {
        return this.executionHistory;
    }

    getActiveExecutions() {
        return Array.from(this.activeExecutions.values());
    }

    getQueuedExecutions() {
        return this.queuedExecutions;
    }

    getMetrics() {
        return this.metrics;
    }

    evaluateConditions(conditions) {
        // Simplified implementation
        return true;
    }

    async executeActions(actions, ruleId) {
        // Simplified implementation
        return { success: true, errors: [] };
    }

    setEnergyBudget(budget) {
        this.energyBudget = budget;
    }

    setNotificationService(service) {
        this.notificationService = service;
    }

    setApiClient(client) {
        this.apiClient = client;
    }

    setSystemMetrics(metrics) {
        this.systemMetrics = metrics;
    }

    getSystemState() {
        return this.systemState || {};
    }

    handleSystemEvent(event, data) {
        // Implementation would handle system events
    }

    cleanup() {
        // Implementation would cleanup resources
    }

    on(event, handler) {
        // Implementation would setup event listeners
    }

    destroy() {
        // Implementation would cleanup all resources
    }
}
