/**
 * WF-UX-009 Workflow Execution Test Suite
 * 
 * Comprehensive tests for advanced workflow execution engine
 * Tests: Workflow creation, execution, error handling, performance
 * 
 * Coverage: Unit tests, integration tests, performance benchmarks
 * Dependencies: Jest, Testing utilities, Mock data
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WorkflowOrchestrator } from '../../../assets/code/WF-UX-009/workflow-orchestrator.js';
import { MockWorkflowEngine } from '../mocks/workflow-engine.mock.js';
import { MockCanvas } from '../mocks/canvas.mock.js';
import { TestDataGenerator } from '../utils/test-data-generator.js';

describe('WF-UX-009 Workflow Execution', () => {
    let orchestrator;
    let mockEngine;
    let testData;
    let performanceMetrics;

    beforeEach(() => {
        // Setup mocks
        mockEngine = new MockWorkflowEngine();
        testData = new TestDataGenerator();
        
        // Mock DOM elements
        global.document = {
            createElement: jest.fn(() => new MockCanvas()),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            getElementById: jest.fn(() => ({ textContent: '', className: '' }))
        };
        
        global.window = {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        };
        
        global.performance = {
            now: jest.fn(() => Date.now())
        };
        
        // Initialize orchestrator
        orchestrator = new WorkflowOrchestrator(mockEngine);
        performanceMetrics = {
            executionTimes: [],
            memoryUsage: [],
            frameRates: []
        };
    });

    afterEach(() => {
        if (orchestrator) {
            orchestrator.destroy();
        }
        jest.clearAllMocks();
    });

    describe('Workflow Creation', () => {
        test('should create new workflow with default settings', () => {
            const workflow = orchestrator.createNewWorkflow();
            
            expect(workflow).toBeDefined();
            expect(workflow.id).toMatch(/^workflow_/);
            expect(workflow.nodes).toEqual(new Map());
            expect(workflow.connections).toEqual(new Map());
            expect(workflow.metadata).toBeDefined();
        });

        test('should create workflow from template', async () => {
            const template = testData.generateWorkflowTemplate('basic-sequence');
            const workflow = await orchestrator.createFromTemplate(template);
            
            expect(workflow.nodes.size).toBeGreaterThan(0);
            expect(workflow.connections.size).toBeGreaterThan(0);
            expect(workflow.metadata.template).toBe('basic-sequence');
        });

        test('should validate workflow structure', () => {
            const invalidWorkflow = testData.generateInvalidWorkflow();
            const validation = orchestrator.validateWorkflow(invalidWorkflow);
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toHaveLength(3);
            expect(validation.errors).toContain('Missing start node');
        });

        test('should detect circular dependencies', () => {
            const circularWorkflow = testData.generateCircularWorkflow();
            const validation = orchestrator.validateWorkflow(circularWorkflow);
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('Circular dependency detected');
        });
    });

    describe('Node Management', () => {
        test('should add node to workflow canvas', () => {
            const nodeType = 'action';
            const position = { x: 100, y: 200 };
            
            const node = orchestrator.createNode(nodeType, position.x, position.y);
            
            expect(node).toBeDefined();
            expect(node.type).toBe(nodeType);
            expect(node.x).toBe(position.x);
            expect(node.y).toBe(position.y);
            expect(orchestrator.nodes.has(node.id)).toBe(true);
        });

        test('should connect nodes with validation', () => {
            const sourceNode = orchestrator.createNode('start', 50, 100);
            const targetNode = orchestrator.createNode('action', 200, 100);
            
            const connection = orchestrator.connectNodes(sourceNode.id, targetNode.id);
            
            expect(connection).toBeDefined();
            expect(connection.from).toBe(sourceNode.id);
            expect(connection.to).toBe(targetNode.id);
            expect(orchestrator.connections.has(connection.id)).toBe(true);
        });

        test('should prevent invalid connections', () => {
            const endNode1 = orchestrator.createNode('end', 50, 100);
            const endNode2 = orchestrator.createNode('end', 200, 100);
            
            expect(() => {
                orchestrator.connectNodes(endNode1.id, endNode2.id);
            }).toThrow('Cannot connect two end nodes');
        });

        test('should delete nodes and cleanup connections', () => {
            const node1 = orchestrator.createNode('start', 50, 100);
            const node2 = orchestrator.createNode('action', 200, 100);
            const connection = orchestrator.connectNodes(node1.id, node2.id);
            
            orchestrator.deleteNode(node1.id);
            
            expect(orchestrator.nodes.has(node1.id)).toBe(false);
            expect(orchestrator.connections.has(connection.id)).toBe(false);
        });
    });

    describe('Workflow Execution', () => {
        test('should execute simple linear workflow', async () => {
            const workflow = testData.generateLinearWorkflow();
            orchestrator.currentWorkflow = workflow;
            
            const result = await orchestrator.runWorkflow();
            
            expect(result.status).toBe('completed');
            expect(result.executedSteps).toBe(3);
            expect(mockEngine.executeWorkflow).toHaveBeenCalledWith(workflow);
        });

        test('should execute parallel workflow branches', async () => {
            const workflow = testData.generateParallelWorkflow();
            orchestrator.currentWorkflow = workflow;
            
            const startTime = Date.now();
            const result = await orchestrator.runWorkflow();
            const executionTime = Date.now() - startTime;
            
            expect(result.status).toBe('completed');
            expect(result.parallelBranches).toBe(3);
            expect(executionTime).toBeLessThan(2000); // Should complete in parallel
        });

        test('should handle conditional workflow paths', async () => {
            const workflow = testData.generateConditionalWorkflow();
            orchestrator.currentWorkflow = workflow;
            
            // Test true condition path
            mockEngine.setConditionResult('condition1', true);
            const result1 = await orchestrator.runWorkflow();
            expect(result1.executedPath).toBe('true-branch');
            
            // Test false condition path
            mockEngine.setConditionResult('condition1', false);
            const result2 = await orchestrator.runWorkflow();
            expect(result2.executedPath).toBe('false-branch');
        });

        test('should execute workflow with loops', async () => {
            const workflow = testData.generateLoopWorkflow();
            orchestrator.currentWorkflow = workflow;
            
            const result = await orchestrator.runWorkflow();
            
            expect(result.status).toBe('completed');
            expect(result.loopIterations).toBe(5);
            expect(result.executedSteps).toBeGreaterThan(10);
        });

        test('should respect execution timeouts', async () => {
            const workflow = testData.generateLongRunningWorkflow();
            orchestrator.currentWorkflow = workflow;
            orchestrator.config.executionTimeout = 1000; // 1 second
            
            const startTime = Date.now();
            const result = await orchestrator.runWorkflow();
            const executionTime = Date.now() - startTime;
            
            expect(result.status).toBe('timeout');
            expect(executionTime).toBeLessThan(1500);
        });
    });

    describe('Error Handling', () => {
        test('should handle node execution errors gracefully', async () => {
            const workflow = testData.generateWorkflowWithFailingNode();
            orchestrator.currentWorkflow = workflow;
            
            const result = await orchestrator.runWorkflow();
            
            expect(result.status).toBe('failed');
            expect(result.error).toBeDefined();
            expect(result.failedNode).toBe('failing-action');
            expect(result.executedSteps).toBe(2); // Should stop at failing node
        });

        test('should retry failed nodes when configured', async () => {
            const workflow = testData.generateWorkflowWithRetryableNode();
            orchestrator.currentWorkflow = workflow;
            
            mockEngine.setNodeFailureCount('retryable-action', 2); // Fail twice, then succeed
            
            const result = await orchestrator.runWorkflow();
            
            expect(result.status).toBe('completed');
            expect(result.retryAttempts).toBe(2);
            expect(mockEngine.getExecutionCount('retryable-action')).toBe(3);
        });

        test('should handle workflow validation errors', async () => {
            const invalidWorkflow = testData.generateInvalidWorkflow();
            orchestrator.currentWorkflow = invalidWorkflow;
            
            const result = await orchestrator.runWorkflow();
            
            expect(result.status).toBe('validation-failed');
            expect(result.validationErrors).toHaveLength(3);
        });

        test('should recover from partial execution failures', async () => {
            const workflow = testData.generateRecoverableWorkflow();
            orchestrator.currentWorkflow = workflow;
            
            // First execution fails midway
            mockEngine.setFailurePoint('step-3');
            const result1 = await orchestrator.runWorkflow();
            expect(result1.status).toBe('failed');
            expect(result1.completedSteps).toBe(2);
            
            // Resume from failure point
            mockEngine.clearFailurePoint();
            const result2 = await orchestrator.resumeWorkflow(result1.executionId);
            expect(result2.status).toBe('completed');
            expect(result2.totalSteps).toBe(5);
        });
    });

    describe('Performance Tests', () => {
        test('should maintain 60Hz UI updates during execution', async () => {
            const workflow = testData.generateComplexWorkflow();
            orchestrator.currentWorkflow = workflow;
            
            const frameRates = [];
            const frameRateMonitor = setInterval(() => {
                frameRates.push(orchestrator.getCurrentFrameRate());
            }, 100);
            
            await orchestrator.runWorkflow();
            clearInterval(frameRateMonitor);
            
            const averageFrameRate = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
            expect(averageFrameRate).toBeGreaterThanOrEqual(55); // Allow 5fps tolerance
        });

        test('should handle large workflows efficiently', async () => {
            const largeWorkflow = testData.generateLargeWorkflow(1000); // 1000 nodes
            orchestrator.currentWorkflow = largeWorkflow;
            
            const startTime = performance.now();
            const result = await orchestrator.runWorkflow();
            const executionTime = performance.now() - startTime;
            
            expect(result.status).toBe('completed');
            expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
            expect(result.executedSteps).toBe(1000);
        });

        test('should manage memory usage during execution', async () => {
            const workflow = testData.generateMemoryIntensiveWorkflow();
            orchestrator.currentWorkflow = workflow;
            
            const initialMemory = process.memoryUsage().heapUsed;
            await orchestrator.runWorkflow();
            const finalMemory = process.memoryUsage().heapUsed;
            
            const memoryIncrease = finalMemory - initialMemory;
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
        });

        test('should optimize execution for different workflow patterns', async () => {
            const patterns = [
                'linear',
                'parallel',
                'conditional',
                'loop',
                'nested'
            ];
            
            const results = {};
            
            for (const pattern of patterns) {
                const workflow = testData.generateWorkflowPattern(pattern);
                orchestrator.currentWorkflow = workflow;
                
                const startTime = performance.now();
                const result = await orchestrator.runWorkflow();
                const executionTime = performance.now() - startTime;
                
                results[pattern] = {
                    executionTime,
                    status: result.status,
                    steps: result.executedSteps
                };
            }
            
            // Parallel should be fastest for equivalent work
            expect(results.parallel.executionTime).toBeLessThan(results.linear.executionTime);
            
            // All patterns should complete successfully
            Object.values(results).forEach(result => {
                expect(result.status).toBe('completed');
            });
        });
    });

    describe('Real-time Updates', () => {
        test('should provide real-time execution status', async () => {
            const workflow = testData.generateMultiStepWorkflow();
            orchestrator.currentWorkflow = workflow;
            
            const statusUpdates = [];
            orchestrator.on('execution-status', (status) => {
                statusUpdates.push(status);
            });
            
            await orchestrator.runWorkflow();
            
            expect(statusUpdates.length).toBeGreaterThan(5);
            expect(statusUpdates[0].status).toBe('started');
            expect(statusUpdates[statusUpdates.length - 1].status).toBe('completed');
        });

        test('should update node states during execution', async () => {
            const workflow = testData.generateVisualWorkflow();
            orchestrator.currentWorkflow = workflow;
            
            const nodeStateChanges = [];
            orchestrator.on('node-state-change', (nodeId, state) => {
                nodeStateChanges.push({ nodeId, state, timestamp: Date.now() });
            });
            
            await orchestrator.runWorkflow();
            
            expect(nodeStateChanges.length).toBeGreaterThan(0);
            
            // Check state progression
            const node1Changes = nodeStateChanges.filter(change => change.nodeId === 'node-1');
            expect(node1Changes).toContainEqual(
                expect.objectContaining({ state: 'running' })
            );
            expect(node1Changes).toContainEqual(
                expect.objectContaining({ state: 'completed' })
            );
        });

        test('should stream execution metrics', async () => {
            const workflow = testData.generateMetricsWorkflow();
            orchestrator.currentWorkflow = workflow;
            
            const metrics = [];
            orchestrator.on('execution-metrics', (metric) => {
                metrics.push(metric);
            });
            
            await orchestrator.runWorkflow();
            
            expect(metrics.length).toBeGreaterThan(10);
            
            const lastMetric = metrics[metrics.length - 1];
            expect(lastMetric).toHaveProperty('executionTime');
            expect(lastMetric).toHaveProperty('memoryUsage');
            expect(lastMetric).toHaveProperty('cpuUsage');
        });
    });

    describe('Integration Tests', () => {
        test('should integrate with energy system', async () => {
            const workflow = testData.generateEnergyAwareWorkflow();
            orchestrator.currentWorkflow = workflow;
            
            const energyBudget = 1000; // 1000 energy units
            orchestrator.setEnergyBudget(energyBudget);
            
            const result = await orchestrator.runWorkflow();
            
            expect(result.status).toBe('completed');
            expect(result.energyConsumed).toBeLessThanOrEqual(energyBudget);
            expect(result.energyEfficiency).toBeGreaterThan(0.8); // 80% efficiency
        });

        test('should integrate with plugin system', async () => {
            const workflow = testData.generatePluginWorkflow();
            orchestrator.currentWorkflow = workflow;
            
            // Mock plugin registration
            const mockPlugin = testData.generateMockPlugin();
            orchestrator.registerPlugin(mockPlugin);
            
            const result = await orchestrator.runWorkflow();
            
            expect(result.status).toBe('completed');
            expect(result.pluginExecutions).toBe(2);
            expect(mockPlugin.execute).toHaveBeenCalledTimes(2);
        });

        test('should integrate with local API', async () => {
            const workflow = testData.generateAPIWorkflow();
            orchestrator.currentWorkflow = workflow;
            
            // Mock API responses
            const mockAPI = testData.generateMockAPI();
            orchestrator.setAPIClient(mockAPI);
            
            const result = await orchestrator.runWorkflow();
            
            expect(result.status).toBe('completed');
            expect(result.apiCalls).toBe(3);
            expect(mockAPI.get).toHaveBeenCalledWith('/api/data');
        });
    });

    describe('Stress Tests', () => {
        test('should handle concurrent workflow executions', async () => {
            const workflows = Array.from({ length: 10 }, (_, i) => 
                testData.generateConcurrentWorkflow(i)
            );
            
            const promises = workflows.map(workflow => {
                const newOrchestrator = new WorkflowOrchestrator(mockEngine);
                newOrchestrator.currentWorkflow = workflow;
                return newOrchestrator.runWorkflow();
            });
            
            const results = await Promise.all(promises);
            
            results.forEach(result => {
                expect(result.status).toBe('completed');
            });
            
            // Cleanup
            promises.forEach((_, i) => workflows[i] && workflows[i].destroy?.());
        });

        test('should maintain performance under load', async () => {
            const heavyWorkflow = testData.generateHeavyWorkflow();
            orchestrator.currentWorkflow = heavyWorkflow;
            
            const executionTimes = [];
            
            // Run multiple times to test consistency
            for (let i = 0; i < 5; i++) {
                const startTime = performance.now();
                const result = await orchestrator.runWorkflow();
                const executionTime = performance.now() - startTime;
                
                executionTimes.push(executionTime);
                expect(result.status).toBe('completed');
            }
            
            // Check execution time consistency (coefficient of variation < 0.2)
            const mean = executionTimes.reduce((a, b) => a + b) / executionTimes.length;
            const variance = executionTimes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / executionTimes.length;
            const stdDev = Math.sqrt(variance);
            const coefficientOfVariation = stdDev / mean;
            
            expect(coefficientOfVariation).toBeLessThan(0.2);
        });
    });
});

// Helper function to measure performance
function measurePerformance(fn) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    return {
        result,
        executionTime: end - start,
        memoryUsage: process.memoryUsage()
    };
}

// Helper function to generate test workflows
function generateTestWorkflow(type, complexity = 'medium') {
    const generator = new TestDataGenerator();
    
    switch (type) {
        case 'linear':
            return generator.generateLinearWorkflow(complexity);
        case 'parallel':
            return generator.generateParallelWorkflow(complexity);
        case 'conditional':
            return generator.generateConditionalWorkflow(complexity);
        default:
            return generator.generateBasicWorkflow();
    }
}
