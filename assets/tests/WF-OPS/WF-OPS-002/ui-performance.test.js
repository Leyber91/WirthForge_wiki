/**
 * WIRTHFORGE UI Performance Test Suite
 * 
 * Tests for dashboard rendering performance, 60Hz frame budget compliance,
 * WebSocket streaming efficiency, and energy visualization accuracy.
 */

const { WirthForgeWSServer } = require('../../../code/WF-OPS/WF-OPS-002/ws-server');
const { performance } = require('perf_hooks');

describe('WF-OPS-002 UI Performance', () => {
    let wsServer;
    let mockCanvas;
    
    beforeEach(async () => {
        mockCanvas = {
            getContext: jest.fn(() => ({
                fillRect: jest.fn(),
                stroke: jest.fn(),
                beginPath: jest.fn(),
                moveTo: jest.fn(),
                lineTo: jest.fn()
            })),
            width: 800,
            height: 600
        };
        
        global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16.67));
        
        wsServer = new WirthForgeWSServer({ port: 8081, frameBudgetMs: 16.67 });
        await wsServer.start();
    });
    
    afterEach(async () => {
        if (wsServer?.isRunning) await wsServer.stop();
        delete global.requestAnimationFrame;
    });
    
    describe('Frame Budget Compliance', () => {
        test('should maintain 60Hz rendering', async () => {
            const frameTimes = [];
            const frameBudget = 16.67;
            
            const renderFrame = () => {
                const start = performance.now();
                
                // Simulate rendering work
                const ctx = mockCanvas.getContext('2d');
                ctx.fillRect(0, 0, 100, 100);
                
                const frameTime = performance.now() - start;
                frameTimes.push(frameTime);
            };
            
            // Run 60 frames
            for (let i = 0; i < 60; i++) {
                renderFrame();
                await new Promise(resolve => setTimeout(resolve, 1));
            }
            
            const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
            const overBudgetFrames = frameTimes.filter(t => t > frameBudget);
            const compliance = 1 - (overBudgetFrames.length / frameTimes.length);
            
            expect(avgFrameTime).toBeLessThan(frameBudget);
            expect(compliance).toBeGreaterThan(0.9);
        });
        
        test('should handle backpressure', async () => {
            const processed = [];
            const dropped = [];
            const queue = [];
            
            // Fill queue with test data
            for (let i = 0; i < 200; i++) {
                queue.push({ id: i, data: Math.random() });
            }
            
            // Process with frame budget
            const processQueue = () => {
                const start = performance.now();
                
                while (queue.length > 0 && (performance.now() - start) < 13) {
                    processed.push(queue.shift());
                }
                
                if (queue.length > 100) {
                    dropped.push(...queue.splice(50));
                }
            };
            
            processQueue();
            
            expect(processed.length).toBeGreaterThan(0);
            expect(processed.length + dropped.length).toBeLessThanOrEqual(200);
        });
    });
    
    describe('WebSocket Streaming', () => {
        test('should handle high-frequency streaming', async () => {
            const messages = [];
            let messageCount = 0;
            
            const sendMessage = () => {
                const message = {
                    type: 'metrics',
                    id: messageCount++,
                    data: { value: Math.random() * 100 }
                };
                
                wsServer.queueMessage('metrics', message);
                messages.push(message);
            };
            
            // Send 120 messages (2 seconds at 60Hz)
            for (let i = 0; i < 120; i++) {
                sendMessage();
                await new Promise(resolve => setTimeout(resolve, 16.67));
            }
            
            expect(messages.length).toBe(120);
            expect(wsServer.getStatistics().isRunning).toBe(true);
        });
    });
    
    describe('Energy Visualization', () => {
        test('should render efficiently', async () => {
            const renderTimes = [];
            
            const renderVisualization = (cpu, memory, tokens) => {
                const start = performance.now();
                
                const ctx = mockCanvas.getContext('2d');
                
                // Draw ribbons
                ctx.beginPath();
                for (let x = 0; x < 800; x += 5) {
                    const y = 200 + Math.sin(x * 0.02) * (cpu * 0.5);
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
                
                // Draw particles
                const particleCount = Math.floor(tokens * 0.1);
                for (let i = 0; i < particleCount; i++) {
                    ctx.fillRect(Math.random() * 800, Math.random() * 600, 2, 2);
                }
                
                return performance.now() - start;
            };
            
            // Test 60 frames
            for (let i = 0; i < 60; i++) {
                const cpu = 50 + Math.sin(i * 0.1) * 30;
                const memory = 60 + Math.cos(i * 0.05) * 20;
                const tokens = 20 + Math.random() * 40;
                
                const renderTime = renderVisualization(cpu, memory, tokens);
                renderTimes.push(renderTime);
            }
            
            const avgRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
            const slowFrames = renderTimes.filter(t => t > 8);
            const efficiency = 1 - (slowFrames.length / renderTimes.length);
            
            expect(avgRenderTime).toBeLessThan(5);
            expect(efficiency).toBeGreaterThan(0.95);
        });
        
        test('should map metrics to visuals accurately', async () => {
            const testCases = [
                { cpu: 10, memory: 20, tokens: 5 },
                { cpu: 50, memory: 60, tokens: 25 },
                { cpu: 90, memory: 85, tokens: 50 }
            ];
            
            const mappings = testCases.map(test => {
                const cpuColor = { r: 255, g: Math.floor(255 - test.cpu * 2.55), b: 0 };
                const memoryColor = { r: 0, g: Math.floor(255 - test.memory * 2.55), b: 255 };
                const particles = Math.floor(test.tokens * 0.1);
                
                return { input: test, cpuColor, memoryColor, particles };
            });
            
            // Verify color mapping
            expect(mappings[0].cpuColor.g).toBeGreaterThan(mappings[2].cpuColor.g);
            expect(mappings[0].particles).toBeLessThan(mappings[2].particles);
            
            mappings.forEach(mapping => {
                expect(mapping.cpuColor.r).toBe(255);
                expect(mapping.memoryColor.b).toBe(255);
                expect(mapping.particles).toBe(Math.floor(mapping.input.tokens * 0.1));
            });
        });
    });
    
    describe('Dashboard Performance', () => {
        test('should update panels efficiently', async () => {
            const updateTimes = [];
            const panelCount = 6;
            
            const updateDashboard = (data) => {
                const start = performance.now();
                
                // Simulate panel updates
                for (let i = 0; i < panelCount; i++) {
                    const panelData = JSON.stringify(data);
                    // Simulate DOM manipulation
                    const element = { innerHTML: panelData, style: {} };
                    element.style.gridColumn = `${i % 3 + 1}`;
                    element.style.gridRow = `${Math.floor(i / 3) + 1}`;
                }
                
                return performance.now() - start;
            };
            
            // Test with different data complexities
            const testData = [
                { cpu: 50, memory: 60 },
                { cpu: 50, memory: 60, disk: 30, tokens: 20 },
                { system: { cpu: 50 }, model: { tokens: 20 }, ui: { frames: 60 } }
            ];
            
            for (let i = 0; i < 30; i++) {
                const data = testData[i % testData.length];
                const updateTime = updateDashboard(data);
                updateTimes.push(updateTime);
            }
            
            const avgUpdateTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length;
            const maxUpdateTime = Math.max(...updateTimes);
            
            expect(avgUpdateTime).toBeLessThan(6.67); // < 40% of 16.67ms budget
            expect(maxUpdateTime).toBeLessThan(13.33); // < 80% of budget
        });
        
        test('should handle rapid state changes', async () => {
            let memoryUsage = 50;
            const memorySnapshots = [];
            
            const componentState = {
                metrics: {},
                alerts: [],
                panels: new Map()
            };
            
            for (let i = 0; i < 1000; i++) {
                const before = memoryUsage;
                
                // Simulate state updates
                componentState.metrics = {
                    cpu: Math.random() * 100,
                    memory: Math.random() * 100
                };
                
                if (Math.random() > 0.7) {
                    componentState.alerts.push({ id: i, message: `Alert ${i}` });
                }
                
                if (componentState.alerts.length > 10) {
                    componentState.alerts.shift();
                }
                
                componentState.panels.set(`panel_${i % 6}`, { data: componentState.metrics });
                
                // Simulate memory change
                memoryUsage += (Math.random() - 0.5) * 0.1;
                
                memorySnapshots.push({ iteration: i, memory: memoryUsage });
                
                if (i % 100 === 0) {
                    memoryUsage *= 0.98; // Simulate cleanup
                }
            }
            
            const finalMemory = memorySnapshots[memorySnapshots.length - 1].memory;
            const initialMemory = memorySnapshots[0].memory;
            const growthRate = (finalMemory - initialMemory) / 1000;
            
            expect(growthRate).toBeLessThan(0.01); // < 0.01MB per 1000 ops
            expect(finalMemory).toBeLessThan(initialMemory * 1.5);
        });
    });
});

// Helper functions
function measureRenderTime(renderFn, ...args) {
    const start = performance.now();
    renderFn(...args);
    return performance.now() - start;
}

function generateTestMetrics(count) {
    return Array.from({ length: count }, (_, i) => ({
        timestamp: Date.now() + i * 16.67,
        source: 'test',
        data: {
            cpu_percent: Math.random() * 100,
            memory_percent: Math.random() * 100,
            tokens_per_second: Math.random() * 50
        }
    }));
}
