/**
 * WF-UX-009 Integration API Test Suite
 * 
 * Tests for local API server and external tool integration
 * Tests: REST endpoints, WebSocket connections, authentication, rate limiting
 * 
 * Coverage: API functionality, security, performance, error handling
 * Dependencies: Jest, Supertest, WebSocket client, Mock servers
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import WebSocket from 'ws';
import { LocalAPIExtension } from '../../../assets/code/WF-UX-009/local-api-extension.js';
import { MockWorkflowEngine } from '../mocks/workflow-engine.mock.js';
import { MockEnergySystem } from '../mocks/energy-system.mock.js';
import { TestDataGenerator } from '../utils/test-data-generator.js';

describe('WF-UX-009 Integration API', () => {
    let apiServer;
    let mockWorkflowEngine;
    let mockEnergySystem;
    let testData;
    let serverUrl;

    beforeEach(async () => {
        // Setup mocks
        mockWorkflowEngine = new MockWorkflowEngine();
        mockEnergySystem = new MockEnergySystem();
        testData = new TestDataGenerator();
        
        // Initialize API server
        apiServer = new LocalAPIExtension({
            port: 0, // Use random available port
            host: 'localhost',
            enableCORS: true,
            maxConnections: 10
        });
        
        // Inject dependencies
        apiServer.workflowEngine = mockWorkflowEngine;
        apiServer.energySystem = mockEnergySystem;
        
        // Start server
        await apiServer.start();
        const address = apiServer.server.address();
        serverUrl = `http://localhost:${address.port}`;
    });

    afterEach(async () => {
        if (apiServer) {
            await apiServer.stop();
        }
        jest.clearAllMocks();
    });

    describe('Server Lifecycle', () => {
        test('should start server on specified port', async () => {
            const testServer = new LocalAPIExtension({ port: 8081 });
            await testServer.start();
            
            expect(testServer.isRunning).toBe(true);
            expect(testServer.config.port).toBe(8081);
            
            await testServer.stop();
        });

        test('should handle port conflicts gracefully', async () => {
            const testServer = new LocalAPIExtension({ port: apiServer.config.port });
            
            await expect(testServer.start()).rejects.toThrow('EADDRINUSE');
        });

        test('should cleanup resources on stop', async () => {
            const connectionCount = apiServer.connections.size;
            await apiServer.stop();
            
            expect(apiServer.isRunning).toBe(false);
            expect(apiServer.connections.size).toBe(0);
        });
    });

    describe('Authentication and Security', () => {
        test('should require API key for protected endpoints', async () => {
            const response = await request(serverUrl)
                .get('/api/workflows')
                .expect(401);
            
            expect(response.body.message).toBe('Invalid API key');
        });

        test('should accept valid API key', async () => {
            const response = await request(serverUrl)
                .get('/api/status')
                .set('X-API-Key', 'wirthforge-local-api-key')
                .expect(200);
            
            expect(response.body.status).toBe('running');
        });

        test('should enforce rate limiting', async () => {
            const requests = [];
            
            // Make many rapid requests
            for (let i = 0; i < 150; i++) {
                requests.push(
                    request(serverUrl)
                        .get('/api/status')
                        .set('X-API-Key', 'wirthforge-local-api-key')
                );
            }
            
            const responses = await Promise.all(requests);
            const rateLimitedResponses = responses.filter(r => r.status === 429);
            
            expect(rateLimitedResponses.length).toBeGreaterThan(0);
        });

        test('should validate request size limits', async () => {
            const largePayload = 'x'.repeat(15 * 1024 * 1024); // 15MB payload
            
            const response = await request(serverUrl)
                .post('/api/workflows')
                .set('X-API-Key', 'wirthforge-local-api-key')
                .send({ data: largePayload })
                .expect(413);
            
            expect(response.body.message).toBe('Request too large');
        });

        test('should handle CORS preflight requests', async () => {
            const response = await request(serverUrl)
                .options('/api/workflows')
                .set('Origin', 'http://localhost:3000')
                .expect(200);
            
            expect(response.headers['access-control-allow-origin']).toBe('*');
            expect(response.headers['access-control-allow-methods']).toContain('GET');
        });

        test('should timeout long requests', async () => {
            // Mock a slow endpoint
            apiServer.addRoute('GET', '/api/slow', async (req, res) => {
                await new Promise(resolve => setTimeout(resolve, 35000)); // 35 seconds
                res.json({ message: 'slow response' });
            });
            
            const response = await request(serverUrl)
                .get('/api/slow')
                .set('X-API-Key', 'wirthforge-local-api-key')
                .expect(408);
            
            expect(response.body.message).toBe('Request timeout');
        });
    });

    describe('Workflow API Endpoints', () => {
        test('should list workflows', async () => {
            const mockWorkflows = testData.generateWorkflowList(5);
            mockWorkflowEngine.setWorkflows(mockWorkflows);
            
            const response = await request(serverUrl)
                .get('/api/workflows')
                .set('X-API-Key', 'wirthforge-local-api-key')
                .expect(200);
            
            expect(response.body).toHaveLength(5);
            expect(response.body[0]).toHaveProperty('id');
            expect(response.body[0]).toHaveProperty('name');
        });

        test('should create new workflow', async () => {
            const workflowData = testData.generateWorkflowData();
            
            const response = await request(serverUrl)
                .post('/api/workflows')
                .set('X-API-Key', 'wirthforge-local-api-key')
                .send(workflowData)
                .expect(201);
            
            expect(response.body.id).toBeDefined();
            expect(response.body.name).toBe(workflowData.name);
            expect(mockWorkflowEngine.createWorkflow).toHaveBeenCalledWith(workflowData);
        });

        test('should get workflow by ID', async () => {
            const workflowId = 'test-workflow-123';
            const mockWorkflow = testData.generateWorkflow(workflowId);
            mockWorkflowEngine.setWorkflow(workflowId, mockWorkflow);
            
            const response = await request(serverUrl)
                .get(`/api/workflows/${workflowId}`)
                .set('X-API-Key', 'wirthforge-local-api-key')
                .expect(200);
            
            expect(response.body.id).toBe(workflowId);
            expect(response.body.name).toBe(mockWorkflow.name);
        });

        test('should update workflow', async () => {
            const workflowId = 'test-workflow-456';
            const updateData = { name: 'Updated Workflow', description: 'Updated description' };
            
            const response = await request(serverUrl)
                .put(`/api/workflows/${workflowId}`)
                .set('X-API-Key', 'wirthforge-local-api-key')
                .send(updateData)
                .expect(200);
            
            expect(response.body.name).toBe(updateData.name);
            expect(mockWorkflowEngine.updateWorkflow).toHaveBeenCalledWith(workflowId, updateData);
        });

        test('should delete workflow', async () => {
            const workflowId = 'test-workflow-789';
            
            const response = await request(serverUrl)
                .delete(`/api/workflows/${workflowId}`)
                .set('X-API-Key', 'wirthforge-local-api-key')
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(mockWorkflowEngine.deleteWorkflow).toHaveBeenCalledWith(workflowId);
        });

        test('should execute workflow', async () => {
            const workflowId = 'executable-workflow';
            const parameters = { param1: 'value1', param2: 42 };
            
            mockWorkflowEngine.setExecutionResult(workflowId, {
                status: 'completed',
                result: { output: 'success' }
            });
            
            const response = await request(serverUrl)
                .post(`/api/workflows/${workflowId}/execute`)
                .set('X-API-Key', 'wirthforge-local-api-key')
                .send(parameters)
                .expect(200);
            
            expect(response.body.status).toBe('completed');
            expect(response.body.result.output).toBe('success');
            expect(mockWorkflowEngine.executeWorkflow).toHaveBeenCalledWith(workflowId, parameters);
        });

        test('should handle workflow not found', async () => {
            const response = await request(serverUrl)
                .get('/api/workflows/nonexistent')
                .set('X-API-Key', 'wirthforge-local-api-key')
                .expect(404);
            
            expect(response.body.message).toContain('not found');
        });
    });

    describe('Energy Metrics API', () => {
        test('should get current energy metrics', async () => {
            const mockMetrics = {
                currentLevel: 75,
                efficiency: 92,
                consumption: 45,
                generation: 52
            };
            mockEnergySystem.setMetrics(mockMetrics);
            
            const response = await request(serverUrl)
                .get('/api/energy/metrics')
                .set('X-API-Key', 'wirthforge-local-api-key')
                .expect(200);
            
            expect(response.body.currentLevel).toBe(75);
            expect(response.body.efficiency).toBe(92);
        });

        test('should get energy patterns', async () => {
            const mockPatterns = testData.generateEnergyPatterns(3);
            mockEnergySystem.setPatterns(mockPatterns);
            
            const response = await request(serverUrl)
                .get('/api/energy/patterns')
                .set('X-API-Key', 'wirthforge-local-api-key')
                .expect(200);
            
            expect(response.body).toHaveLength(3);
            expect(response.body[0]).toHaveProperty('id');
            expect(response.body[0]).toHaveProperty('pattern');
        });

        test('should handle energy system errors', async () => {
            mockEnergySystem.setError(new Error('Energy system offline'));
            
            const response = await request(serverUrl)
                .get('/api/energy/metrics')
                .set('X-API-Key', 'wirthforge-local-api-key')
                .expect(503);
            
            expect(response.body.message).toContain('Energy system offline');
        });
    });

    describe('Plugin Management API', () => {
        test('should list installed plugins', async () => {
            const mockPlugins = testData.generatePluginList(4);
            apiServer.pluginManager = { getPlugins: () => mockPlugins };
            
            const response = await request(serverUrl)
                .get('/api/plugins')
                .set('X-API-Key', 'wirthforge-local-api-key')
                .expect(200);
            
            expect(response.body).toHaveLength(4);
            expect(response.body[0]).toHaveProperty('id');
            expect(response.body[0]).toHaveProperty('name');
            expect(response.body[0]).toHaveProperty('status');
        });

        test('should enable plugin', async () => {
            const pluginId = 'test-plugin';
            apiServer.pluginManager = {
                enablePlugin: jest.fn().mockResolvedValue(true)
            };
            
            const response = await request(serverUrl)
                .post(`/api/plugins/${pluginId}/enable`)
                .set('X-API-Key', 'wirthforge-local-api-key')
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(apiServer.pluginManager.enablePlugin).toHaveBeenCalledWith(pluginId);
        });

        test('should disable plugin', async () => {
            const pluginId = 'test-plugin';
            apiServer.pluginManager = {
                disablePlugin: jest.fn().mockResolvedValue(true)
            };
            
            const response = await request(serverUrl)
                .post(`/api/plugins/${pluginId}/disable`)
                .set('X-API-Key', 'wirthforge-local-api-key')
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(apiServer.pluginManager.disablePlugin).toHaveBeenCalledWith(pluginId);
        });
    });

    describe('WebSocket Communication', () => {
        test('should establish WebSocket connection', (done) => {
            const ws = new WebSocket(`ws://localhost:${apiServer.server.address().port}/ws`);
            
            ws.on('open', () => {
                expect(ws.readyState).toBe(WebSocket.OPEN);
                ws.close();
                done();
            });
            
            ws.on('error', done);
        });

        test('should receive welcome message on connection', (done) => {
            const ws = new WebSocket(`ws://localhost:${apiServer.server.address().port}/ws`);
            
            ws.on('message', (data) => {
                const message = JSON.parse(data.toString());
                expect(message.type).toBe('welcome');
                expect(message.clientId).toBeDefined();
                ws.close();
                done();
            });
            
            ws.on('error', done);
        });

        test('should handle WebSocket message routing', (done) => {
            const ws = new WebSocket(`ws://localhost:${apiServer.server.address().port}/ws`);
            
            // Setup message handler
            apiServer.wsHandlers.set('test-message', (ws, message) => {
                apiServer.sendWebSocketMessage(ws, {
                    type: 'test-response',
                    data: message.data.toUpperCase()
                });
            });
            
            ws.on('open', () => {
                ws.send(JSON.stringify({
                    type: 'test-message',
                    data: 'hello world'
                }));
            });
            
            ws.on('message', (data) => {
                const message = JSON.parse(data.toString());
                if (message.type === 'test-response') {
                    expect(message.data).toBe('HELLO WORLD');
                    ws.close();
                    done();
                }
            });
            
            ws.on('error', done);
        });

        test('should handle WebSocket ping/pong', (done) => {
            const ws = new WebSocket(`ws://localhost:${apiServer.server.address().port}/ws`);
            
            ws.on('open', () => {
                ws.ping();
            });
            
            ws.on('pong', () => {
                expect(true).toBe(true); // Pong received
                ws.close();
                done();
            });
            
            ws.on('error', done);
        });

        test('should broadcast to multiple clients', (done) => {
            const clients = [];
            let messagesReceived = 0;
            
            const createClient = () => {
                const ws = new WebSocket(`ws://localhost:${apiServer.server.address().port}/ws`);
                clients.push(ws);
                
                ws.on('message', (data) => {
                    const message = JSON.parse(data.toString());
                    if (message.type === 'broadcast') {
                        messagesReceived++;
                        if (messagesReceived === 3) {
                            clients.forEach(client => client.close());
                            done();
                        }
                    }
                });
                
                return ws;
            };
            
            // Create 3 clients
            Promise.all([
                new Promise(resolve => { const ws = createClient(); ws.on('open', resolve); }),
                new Promise(resolve => { const ws = createClient(); ws.on('open', resolve); }),
                new Promise(resolve => { const ws = createClient(); ws.on('open', resolve); })
            ]).then(() => {
                // Broadcast message to all clients
                apiServer.wsServer.clients.forEach(client => {
                    apiServer.sendWebSocketMessage(client, {
                        type: 'broadcast',
                        message: 'Hello all clients'
                    });
                });
            });
        });
    });

    describe('Error Handling', () => {
        test('should handle malformed JSON requests', async () => {
            const response = await request(serverUrl)
                .post('/api/workflows')
                .set('X-API-Key', 'wirthforge-local-api-key')
                .set('Content-Type', 'application/json')
                .send('{ invalid json }')
                .expect(400);
            
            expect(response.body.message).toContain('Invalid JSON');
        });

        test('should handle internal server errors', async () => {
            // Mock an endpoint that throws an error
            apiServer.addRoute('GET', '/api/error', async (req, res) => {
                throw new Error('Internal server error');
            });
            
            const response = await request(serverUrl)
                .get('/api/error')
                .set('X-API-Key', 'wirthforge-local-api-key')
                .expect(500);
            
            expect(response.body.message).toContain('Internal server error');
        });

        test('should handle missing route parameters', async () => {
            const response = await request(serverUrl)
                .get('/api/workflows/') // Missing ID parameter
                .set('X-API-Key', 'wirthforge-local-api-key')
                .expect(404);
            
            expect(response.body.message).toBe('Not found');
        });

        test('should handle WebSocket connection errors', (done) => {
            // Try to connect to wrong path
            const ws = new WebSocket(`ws://localhost:${apiServer.server.address().port}/invalid`);
            
            ws.on('error', (error) => {
                expect(error).toBeDefined();
                done();
            });
        });
    });

    describe('Performance Tests', () => {
        test('should handle concurrent requests efficiently', async () => {
            const concurrentRequests = 50;
            const requests = [];
            
            for (let i = 0; i < concurrentRequests; i++) {
                requests.push(
                    request(serverUrl)
                        .get('/api/status')
                        .set('X-API-Key', 'wirthforge-local-api-key')
                );
            }
            
            const startTime = Date.now();
            const responses = await Promise.all(requests);
            const endTime = Date.now();
            
            const allSuccessful = responses.every(r => r.status === 200);
            expect(allSuccessful).toBe(true);
            
            const totalTime = endTime - startTime;
            expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
        });

        test('should maintain low memory usage', async () => {
            const initialMemory = process.memoryUsage().heapUsed;
            
            // Make many requests
            for (let i = 0; i < 1000; i++) {
                await request(serverUrl)
                    .get('/api/status')
                    .set('X-API-Key', 'wirthforge-local-api-key');
            }
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            
            expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB increase
        });

        test('should handle large response payloads', async () => {
            // Mock endpoint with large response
            const largeData = Array.from({ length: 10000 }, (_, i) => ({
                id: i,
                data: 'x'.repeat(1000) // 1KB per item = ~10MB total
            }));
            
            apiServer.addRoute('GET', '/api/large-data', async (req, res) => {
                res.json(largeData);
            });
            
            const startTime = Date.now();
            const response = await request(serverUrl)
                .get('/api/large-data')
                .set('X-API-Key', 'wirthforge-local-api-key')
                .expect(200);
            const endTime = Date.now();
            
            expect(response.body).toHaveLength(10000);
            expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
        });

        test('should handle WebSocket message throughput', (done) => {
            const ws = new WebSocket(`ws://localhost:${apiServer.server.address().port}/ws`);
            const messageCount = 1000;
            let receivedCount = 0;
            
            ws.on('open', () => {
                const startTime = Date.now();
                
                // Send many messages rapidly
                for (let i = 0; i < messageCount; i++) {
                    ws.send(JSON.stringify({
                        type: 'echo',
                        id: i,
                        data: `Message ${i}`
                    }));
                }
                
                ws.on('message', (data) => {
                    const message = JSON.parse(data.toString());
                    if (message.type === 'echo-response') {
                        receivedCount++;
                        if (receivedCount === messageCount) {
                            const endTime = Date.now();
                            const totalTime = endTime - startTime;
                            const messagesPerSecond = messageCount / (totalTime / 1000);
                            
                            expect(messagesPerSecond).toBeGreaterThan(100); // At least 100 msg/sec
                            ws.close();
                            done();
                        }
                    }
                });
            });
            
            // Setup echo handler
            apiServer.wsHandlers.set('echo', (ws, message) => {
                apiServer.sendWebSocketMessage(ws, {
                    type: 'echo-response',
                    id: message.id,
                    data: message.data
                });
            });
        });
    });

    describe('Integration Scenarios', () => {
        test('should support external tool workflow', async () => {
            // Simulate external tool workflow:
            // 1. Get system status
            // 2. Create workflow
            // 3. Execute workflow
            // 4. Monitor via WebSocket
            
            // Step 1: Get status
            const statusResponse = await request(serverUrl)
                .get('/api/status')
                .set('X-API-Key', 'wirthforge-local-api-key')
                .expect(200);
            
            expect(statusResponse.body.status).toBe('running');
            
            // Step 2: Create workflow
            const workflowData = testData.generateWorkflowData();
            const createResponse = await request(serverUrl)
                .post('/api/workflows')
                .set('X-API-Key', 'wirthforge-local-api-key')
                .send(workflowData)
                .expect(201);
            
            const workflowId = createResponse.body.id;
            
            // Step 3: Execute workflow
            const executeResponse = await request(serverUrl)
                .post(`/api/workflows/${workflowId}/execute`)
                .set('X-API-Key', 'wirthforge-local-api-key')
                .send({})
                .expect(200);
            
            expect(executeResponse.body.status).toBeDefined();
            
            // Step 4: Monitor via WebSocket (simplified)
            const ws = new WebSocket(`ws://localhost:${apiServer.server.address().port}/ws`);
            
            return new Promise((resolve) => {
                ws.on('open', () => {
                    ws.send(JSON.stringify({
                        type: 'subscribe',
                        events: ['workflow.status']
                    }));
                    
                    setTimeout(() => {
                        ws.close();
                        resolve();
                    }, 1000);
                });
            });
        });

        test('should handle plugin integration workflow', async () => {
            // Simulate plugin integration:
            // 1. List plugins
            // 2. Enable plugin
            // 3. Execute plugin-based workflow
            
            apiServer.pluginManager = {
                getPlugins: () => testData.generatePluginList(2),
                enablePlugin: jest.fn().mockResolvedValue(true)
            };
            
            // Step 1: List plugins
            const pluginsResponse = await request(serverUrl)
                .get('/api/plugins')
                .set('X-API-Key', 'wirthforge-local-api-key')
                .expect(200);
            
            expect(pluginsResponse.body).toHaveLength(2);
            
            // Step 2: Enable plugin
            const pluginId = pluginsResponse.body[0].id;
            await request(serverUrl)
                .post(`/api/plugins/${pluginId}/enable`)
                .set('X-API-Key', 'wirthforge-local-api-key')
                .expect(200);
            
            // Step 3: Execute plugin workflow
            const pluginWorkflow = testData.generatePluginWorkflow(pluginId);
            const createResponse = await request(serverUrl)
                .post('/api/workflows')
                .set('X-API-Key', 'wirthforge-local-api-key')
                .send(pluginWorkflow)
                .expect(201);
            
            expect(createResponse.body.id).toBeDefined();
        });
    });
});
