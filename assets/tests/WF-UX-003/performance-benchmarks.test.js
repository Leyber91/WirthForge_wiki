/**
 * WIRTHFORGE Energy Visualization - Performance Benchmark Tests
 * WF-UX-003 Test Suite - Performance validation and optimization testing
 */

import { VisualizationManager } from '../code/WF-UX-003/visualization-manager.js';
import { expect } from 'chai';

describe('WF-UX-003 Performance Benchmark Tests', () => {
    let container, manager;
    
    beforeEach(async () => {
        container = document.createElement('div');
        container.style.width = '1920px';
        container.style.height = '1080px';
        document.body.appendChild(container);
        
        manager = await VisualizationManager.create(container, {
            width: 1920,
            height: 1080,
            debugMode: true
        });
    });
    
    afterEach(() => {
        if (manager) {
            manager.dispose();
        }
        if (container && document.body.contains(container)) {
            document.body.removeChild(container);
        }
    });
    
    describe('Frame Rate Performance', () => {
        it('should maintain 60fps at high quality with single model', async () => {
            manager.setQualityLevel('high');
            manager.start();
            
            const frameRates = [];
            const startTime = performance.now();
            let frameCount = 0;
            
            // Monitor for 2 seconds
            while (performance.now() - startTime < 2000) {
                manager.updateEnergyLevel(0.7, { model1: { active: true, processing: true } });
                await waitForFrame();
                frameCount++;
                
                if (frameCount % 10 === 0) {
                    const currentTime = performance.now();
                    const fps = (frameCount * 1000) / (currentTime - startTime);
                    frameRates.push(fps);
                }
            }
            
            const avgFps = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
            expect(avgFps).to.be.above(55); // Allow 5fps tolerance
        });
        
        it('should maintain performance with multiple models', async () => {
            manager.setQualityLevel('high');
            manager.start();
            
            const multiModelState = {
                model1: { active: true, processing: true },
                model2: { active: true, processing: true },
                model3: { active: true, processing: true },
                model4: { active: true, processing: true }
            };
            
            const frameRates = [];
            const startTime = performance.now();
            let frameCount = 0;
            
            while (performance.now() - startTime < 3000) {
                manager.updateEnergyLevel(0.8, multiModelState);
                await waitForFrame();
                frameCount++;
                
                if (frameCount % 15 === 0) {
                    const currentTime = performance.now();
                    const fps = (frameCount * 1000) / (currentTime - startTime);
                    frameRates.push(fps);
                }
            }
            
            const avgFps = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
            expect(avgFps).to.be.above(45); // Lower threshold for complex scenarios
        });
        
        it('should adapt quality when performance drops', async () => {
            manager.start();
            
            // Simulate heavy load
            const heavyState = {
                model1: { active: true, processing: true },
                model2: { active: true, processing: true },
                model3: { active: true, processing: true },
                model4: { active: true, processing: true }
            };
            
            manager.updateEnergyLevel(0.95, heavyState);
            
            // Run for a few seconds to trigger adaptation
            await waitForFrames(180); // 3 seconds at 60fps
            
            const stats = manager.getPerformanceStats();
            const energyState = manager.getEnergyState();
            
            // Should have adapted quality if needed
            if (stats.fps < 50) {
                expect(energyState.qualityLevel).to.not.equal('high');
            }
        });
    });
    
    describe('Memory Usage', () => {
        it('should not leak memory during normal operation', async () => {
            manager.start();
            
            const initialMemory = getMemoryUsage();
            
            // Run intensive operations
            for (let i = 0; i < 100; i++) {
                const energyLevel = Math.random();
                const modelCount = Math.floor(Math.random() * 4) + 1;
                const modelStates = {};
                
                for (let j = 0; j < modelCount; j++) {
                    modelStates[`model${j + 1}`] = {
                        active: true,
                        processing: Math.random() > 0.5
                    };
                }
                
                manager.updateEnergyLevel(energyLevel, modelStates);
                await waitForFrames(2);
            }
            
            // Force garbage collection if available
            if (window.gc) {
                window.gc();
            }
            
            const finalMemory = getMemoryUsage();
            const memoryIncrease = finalMemory - initialMemory;
            
            // Memory increase should be reasonable (less than 50MB)
            expect(memoryIncrease).to.be.below(50 * 1024 * 1024);
        });
        
        it('should properly dispose of resources', async () => {
            const initialMemory = getMemoryUsage();
            
            // Create and dispose multiple managers
            for (let i = 0; i < 5; i++) {
                const testContainer = document.createElement('div');
                testContainer.style.width = '800px';
                testContainer.style.height = '600px';
                document.body.appendChild(testContainer);
                
                const testManager = await VisualizationManager.create(testContainer);
                testManager.start();
                testManager.updateEnergyLevel(0.5, { model1: { active: true } });
                
                await waitForFrames(10);
                
                testManager.dispose();
                document.body.removeChild(testContainer);
            }
            
            if (window.gc) {
                window.gc();
            }
            
            const finalMemory = getMemoryUsage();
            const memoryIncrease = finalMemory - initialMemory;
            
            // Should not accumulate significant memory
            expect(memoryIncrease).to.be.below(20 * 1024 * 1024);
        });
    });
    
    describe('GPU Performance', () => {
        it('should efficiently use GPU resources', async () => {
            manager.start();
            manager.updateEnergyLevel(0.8, {
                model1: { active: true, processing: true },
                model2: { active: true, processing: true }
            });
            
            await waitForFrames(60); // 1 second
            
            const stats = manager.getPerformanceStats();
            
            // Draw calls should be reasonable
            expect(stats.drawCalls).to.be.below(50);
            
            // Should not exceed reasonable triangle count
            expect(stats.triangles).to.be.below(100000);
        });
        
        it('should handle shader compilation efficiently', async () => {
            const startTime = performance.now();
            
            manager.start();
            manager.updateEnergyLevel(0.9, {
                model1: { active: true, processing: true },
                model2: { active: true, processing: true },
                model3: { active: true, processing: true }
            });
            
            // Wait for all effects to initialize
            await waitForFrames(30);
            
            const initTime = performance.now() - startTime;
            
            // Initialization should be reasonably fast
            expect(initTime).to.be.below(2000); // 2 seconds max
        });
    });
    
    describe('Quality Level Performance', () => {
        ['low', 'medium', 'high'].forEach(quality => {
            it(`should meet performance targets at ${quality} quality`, async () => {
                manager.setQualityLevel(quality);
                manager.start();
                
                const expectedFps = {
                    low: 60,
                    medium: 55,
                    high: 45
                };
                
                const frameRates = [];
                const startTime = performance.now();
                let frameCount = 0;
                
                // Test with complex scenario
                const complexState = {
                    model1: { active: true, processing: true },
                    model2: { active: true, processing: true },
                    model3: { active: true, processing: true }
                };
                
                while (performance.now() - startTime < 2000) {
                    manager.updateEnergyLevel(0.85, complexState);
                    await waitForFrame();
                    frameCount++;
                    
                    if (frameCount % 10 === 0) {
                        const currentTime = performance.now();
                        const fps = (frameCount * 1000) / (currentTime - startTime);
                        frameRates.push(fps);
                    }
                }
                
                const avgFps = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
                expect(avgFps).to.be.above(expectedFps[quality] - 5);
            });
        });
    });
    
    describe('Energy Level Performance Impact', () => {
        it('should scale performance with energy level', async () => {
            manager.start();
            
            const energyLevels = [0.1, 0.3, 0.5, 0.7, 0.9];
            const performanceResults = [];
            
            for (const energyLevel of energyLevels) {
                const frameRates = [];
                const startTime = performance.now();
                let frameCount = 0;
                
                while (performance.now() - startTime < 1000) {
                    manager.updateEnergyLevel(energyLevel, {
                        model1: { active: true, processing: true }
                    });
                    await waitForFrame();
                    frameCount++;
                }
                
                const avgFps = (frameCount * 1000) / 1000;
                performanceResults.push({ energyLevel, fps: avgFps });
            }
            
            // Performance should degrade gracefully with higher energy
            for (let i = 1; i < performanceResults.length; i++) {
                const current = performanceResults[i];
                const previous = performanceResults[i - 1];
                
                // Allow some variance but should generally trend downward
                expect(current.fps).to.be.above(previous.fps * 0.8);
            }
        });
    });
    
    describe('Stress Testing', () => {
        it('should handle rapid energy level changes', async () => {
            manager.start();
            
            const startTime = performance.now();
            let frameCount = 0;
            const frameRates = [];
            
            // Rapidly change energy levels
            for (let i = 0; i < 200; i++) {
                const energyLevel = Math.sin(i * 0.1) * 0.5 + 0.5;
                const modelStates = {
                    model1: { active: true, processing: true },
                    model2: { active: Math.random() > 0.5, processing: true }
                };
                
                manager.updateEnergyLevel(energyLevel, modelStates);
                await waitForFrame();
                frameCount++;
                
                if (i % 20 === 0) {
                    const currentTime = performance.now();
                    const fps = (frameCount * 1000) / (currentTime - startTime);
                    frameRates.push(fps);
                }
            }
            
            const avgFps = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
            expect(avgFps).to.be.above(30); // Should maintain reasonable performance
        });
        
        it('should handle maximum complexity scenario', async () => {
            manager.setQualityLevel('high');
            manager.start();
            
            // Maximum complexity: all models, high energy, resonance
            const maxComplexityState = {
                model1: { active: true, processing: true, agreement: 0.95 },
                model2: { active: true, processing: true, agreement: 0.95 },
                model3: { active: true, processing: true, agreement: 0.95 },
                model4: { active: true, processing: true, agreement: 0.95 }
            };
            
            const frameRates = [];
            const startTime = performance.now();
            let frameCount = 0;
            
            while (performance.now() - startTime < 3000) {
                manager.updateEnergyLevel(0.95, maxComplexityState);
                await waitForFrame();
                frameCount++;
                
                if (frameCount % 30 === 0) {
                    const currentTime = performance.now();
                    const fps = (frameCount * 1000) / (currentTime - startTime);
                    frameRates.push(fps);
                }
            }
            
            const avgFps = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
            
            // Should either maintain 30fps or adapt quality
            const finalStats = manager.getPerformanceStats();
            expect(avgFps > 25 || finalStats.qualityLevel !== 'high').to.be.true;
        });
    });
    
    describe('Battery Impact', () => {
        it('should reduce performance impact in low power mode', async () => {
            // Mock battery API
            Object.defineProperty(navigator, 'getBattery', {
                value: () => Promise.resolve({
                    level: 0.2, // Low battery
                    charging: false
                })
            });
            
            manager.start();
            manager.updateEnergyLevel(0.7, {
                model1: { active: true, processing: true },
                model2: { active: true, processing: true }
            });
            
            await waitForFrames(60);
            
            const stats = manager.getPerformanceStats();
            
            // Should adapt for battery conservation
            expect(stats.frameTime).to.be.below(20); // 50fps or better for efficiency
        });
    });
    
    // Helper functions
    function waitForFrame() {
        return new Promise(resolve => requestAnimationFrame(resolve));
    }
    
    function waitForFrames(count) {
        return new Promise(resolve => {
            let remaining = count;
            function frame() {
                remaining--;
                if (remaining <= 0) {
                    resolve();
                } else {
                    requestAnimationFrame(frame);
                }
            }
            requestAnimationFrame(frame);
        });
    }
    
    function getMemoryUsage() {
        if (performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0; // Fallback if memory API not available
    }
});
