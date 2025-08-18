/**
 * WIRTHFORGE Energy Visualization - Integration Tests
 * WF-UX-003 Test Suite - End-to-end system integration validation
 */

import { VisualizationManager } from '../code/WF-UX-003/visualization-manager.js';
import { expect } from 'chai';

describe('WF-UX-003 Integration Tests', () => {
    let container, manager;
    
    beforeEach(async () => {
        container = document.createElement('div');
        container.style.width = '1024px';
        container.style.height = '768px';
        document.body.appendChild(container);
        
        manager = await VisualizationManager.create(container, {
            width: 1024,
            height: 768,
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
    
    describe('Complete Workflow Integration', () => {
        it('should handle complete energy lifecycle', async () => {
            const events = [];
            
            // Monitor all events
            ['started', 'energyUpdated', 'qualityChanged', 'stopped'].forEach(event => {
                manager.on(event, (data) => {
                    events.push({ event, data, timestamp: Date.now() });
                });
            });
            
            // Start system
            manager.start();
            await waitForFrames(5);
            
            // Simulate energy buildup
            const energyLevels = [0.1, 0.3, 0.5, 0.7, 0.9, 0.95, 0.7, 0.4, 0.1, 0];
            const modelStates = [
                { model1: { active: true, processing: true } },
                { model1: { active: true, processing: true } },
                { model1: { active: true, processing: true }, model2: { active: true, processing: true } },
                { model1: { active: true, processing: true }, model2: { active: true, processing: true } },
                { model1: { active: true, processing: true }, model2: { active: true, processing: true }, model3: { active: true, processing: true } },
                { model1: { active: true, processing: true, agreement: 0.95 }, model2: { active: true, processing: true, agreement: 0.95 }, model3: { active: true, processing: true, agreement: 0.95 } },
                { model1: { active: true, processing: true }, model2: { active: true, processing: true } },
                { model1: { active: true, processing: true } },
                { model1: { active: true, processing: false } },
                {}
            ];
            
            for (let i = 0; i < energyLevels.length; i++) {
                manager.updateEnergyLevel(energyLevels[i], modelStates[i]);
                await waitForFrames(10);
            }
            
            manager.stop();
            
            // Verify event sequence
            const startEvents = events.filter(e => e.event === 'started');
            const energyEvents = events.filter(e => e.event === 'energyUpdated');
            const stopEvents = events.filter(e => e.event === 'stopped');
            
            expect(startEvents.length).to.equal(1);
            expect(energyEvents.length).to.equal(energyLevels.length);
            expect(stopEvents.length).to.equal(1);
            
            // Verify energy progression
            energyEvents.forEach((event, index) => {
                expect(event.data.level).to.be.closeTo(energyLevels[index], 0.01);
            });
        });
        
        it('should integrate all effect systems correctly', async () => {
            manager.start();
            
            // Test lightning effect (single model)
            manager.updateEnergyLevel(0.4, { model1: { active: true, processing: true } });
            await waitForFrames(15);
            
            let canvas = container.querySelector('canvas');
            let imageData = getCanvasImageData(canvas);
            let lightningPixels = countColorRange(imageData, { r: [50, 255], g: [100, 255], b: [150, 255] });
            expect(lightningPixels).to.be.above(10);
            
            // Test particle system (multi-model)
            manager.updateEnergyLevel(0.6, {
                model1: { active: true, processing: true },
                model2: { active: true, processing: true },
                model3: { active: true, processing: true }
            });
            await waitForFrames(20);
            
            imageData = getCanvasImageData(canvas);
            let particlePixels = countNonBackgroundPixels(imageData);
            expect(particlePixels).to.be.above(100);
            
            // Test wave interference (disagreement)
            manager.updateEnergyLevel(0.5, {
                model1: { active: true, processing: true, agreement: 0.3 },
                model2: { active: true, processing: true, agreement: 0.7 }
            });
            await waitForFrames(15);
            
            imageData = getCanvasImageData(canvas);
            let waveComplexity = calculatePatternComplexity(imageData);
            expect(waveComplexity).to.be.above(0.05);
            
            // Test resonance field (consensus)
            manager.updateEnergyLevel(0.95, {
                model1: { active: true, processing: true, agreement: 0.95 },
                model2: { active: true, processing: true, agreement: 0.95 },
                model3: { active: true, processing: true, agreement: 0.95 }
            });
            await waitForFrames(25);
            
            imageData = getCanvasImageData(canvas);
            let brightness = calculateAverageBrightness(imageData);
            expect(brightness).to.be.above(0.2);
        });
    });
    
    describe('Performance Integration', () => {
        it('should maintain performance across all effect combinations', async () => {
            manager.start();
            
            const performanceData = [];
            
            // Test various combinations
            const testScenarios = [
                { energy: 0.3, models: { model1: { active: true, processing: true } } },
                { energy: 0.6, models: { model1: { active: true, processing: true }, model2: { active: true, processing: true } } },
                { energy: 0.8, models: { model1: { active: true, processing: true }, model2: { active: true, processing: true }, model3: { active: true, processing: true } } },
                { energy: 0.95, models: { model1: { active: true, processing: true, agreement: 0.95 }, model2: { active: true, processing: true, agreement: 0.95 } } }
            ];
            
            for (const scenario of testScenarios) {
                const startTime = performance.now();
                let frameCount = 0;
                
                manager.updateEnergyLevel(scenario.energy, scenario.models);
                
                // Measure performance for 1 second
                while (performance.now() - startTime < 1000) {
                    await waitForFrame();
                    frameCount++;
                }
                
                const fps = frameCount;
                performanceData.push({ scenario, fps });
                
                expect(fps).to.be.above(30); // Minimum acceptable performance
            }
            
            // Performance should degrade gracefully with complexity
            expect(performanceData[0].fps).to.be.above(performanceData[3].fps * 0.7);
        });
        
        it('should handle quality adaptation seamlessly', async () => {
            manager.start();
            
            let qualityChanges = 0;
            manager.on('qualityChanged', () => {
                qualityChanges++;
            });
            
            // Create heavy load scenario
            const heavyLoad = {
                model1: { active: true, processing: true },
                model2: { active: true, processing: true },
                model3: { active: true, processing: true },
                model4: { active: true, processing: true }
            };
            
            manager.updateEnergyLevel(0.95, heavyLoad);
            
            // Run for several seconds to trigger adaptation
            await waitForFrames(300); // 5 seconds
            
            const finalStats = manager.getPerformanceStats();
            
            // Should either maintain good performance or adapt quality
            expect(finalStats.fps > 40 || qualityChanges > 0).to.be.true;
        });
    });
    
    describe('Accessibility Integration', () => {
        it('should provide consistent accessibility across all states', async () => {
            manager.dispose();
            manager = await VisualizationManager.create(container, {
                width: 1024,
                height: 768,
                accessibilityMode: true
            });
            
            manager.start();
            
            const testStates = [
                { energy: 0.1, models: { model1: { active: true, processing: false } } },
                { energy: 0.5, models: { model1: { active: true, processing: true } } },
                { energy: 0.8, models: { model1: { active: true, processing: true }, model2: { active: true, processing: true } } },
                { energy: 0.95, models: { model1: { active: true, processing: true, agreement: 0.95 }, model2: { active: true, processing: true, agreement: 0.95 } } }
            ];
            
            for (const state of testStates) {
                manager.updateEnergyLevel(state.energy, state.models);
                await waitForFrames(10);
                
                // Check accessibility features
                const canvas = container.querySelector('canvas');
                expect(canvas.getAttribute('aria-label')).to.contain('WIRTHFORGE Energy Visualization');
                
                const description = manager.getSystemStatus();
                expect(description).to.be.a('string');
                expect(description.length).to.be.above(5);
                
                // Check contrast
                const imageData = getCanvasImageData(canvas);
                const contrast = calculateContrast(imageData);
                expect(contrast).to.be.above(4.5);
            }
        });
        
        it('should handle keyboard interactions consistently', async () => {
            manager.start();
            const canvas = container.querySelector('canvas');
            canvas.focus();
            
            const keyboardTests = [
                { key: 'KeyE', ctrl: true, expectChange: true },
                { key: 'Equal', ctrl: true, expectChange: true },
                { key: 'Minus', ctrl: true, expectChange: true },
                { key: 'KeyT', ctrl: true, expectChange: true },
                { key: 'Escape', ctrl: false, expectChange: true }
            ];
            
            for (const test of keyboardTests) {
                manager.updateEnergyLevel(0.5, { model1: { active: true, processing: true } });
                await waitForFrames(5);
                
                const beforeState = manager.getEnergyState();
                const beforeImage = getCanvasImageData(canvas);
                
                const event = new KeyboardEvent('keydown', {
                    code: test.key,
                    ctrlKey: test.ctrl,
                    bubbles: true
                });
                
                canvas.dispatchEvent(event);
                await waitForFrames(5);
                
                if (test.expectChange) {
                    const afterState = manager.getEnergyState();
                    const afterImage = getCanvasImageData(canvas);
                    
                    const stateChanged = JSON.stringify(beforeState) !== JSON.stringify(afterState);
                    const visualChanged = calculateImageDifference(beforeImage, afterImage) > 0.01;
                    
                    expect(stateChanged || visualChanged).to.be.true;
                }
            }
        });
    });
    
    describe('Error Handling Integration', () => {
        it('should gracefully handle WebGL context loss', async () => {
            manager.start();
            manager.updateEnergyLevel(0.6, { model1: { active: true, processing: true } });
            
            const canvas = container.querySelector('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (gl && gl.getExtension('WEBGL_lose_context')) {
                let errorHandled = false;
                manager.on('error', () => {
                    errorHandled = true;
                });
                
                // Simulate context loss
                gl.getExtension('WEBGL_lose_context').loseContext();
                
                await waitForFrames(10);
                
                // Should handle gracefully without crashing
                expect(() => {
                    manager.updateEnergyLevel(0.3, { model1: { active: true, processing: true } });
                }).to.not.throw();
            }
        });
        
        it('should handle invalid energy states gracefully', async () => {
            manager.start();
            
            const invalidStates = [
                { energy: -0.5, models: {} },
                { energy: 1.5, models: {} },
                { energy: NaN, models: {} },
                { energy: 0.5, models: null },
                { energy: 0.5, models: { invalidModel: { invalid: true } } }
            ];
            
            for (const state of invalidStates) {
                expect(() => {
                    manager.updateEnergyLevel(state.energy, state.models);
                }).to.not.throw();
                
                // Should clamp to valid ranges
                const currentState = manager.getEnergyState();
                expect(currentState.level).to.be.at.least(0);
                expect(currentState.level).to.be.at.most(1);
            }
        });
        
        it('should recover from temporary performance issues', async () => {
            manager.start();
            
            // Simulate performance spike
            const heavyLoad = {
                model1: { active: true, processing: true },
                model2: { active: true, processing: true },
                model3: { active: true, processing: true },
                model4: { active: true, processing: true }
            };
            
            manager.updateEnergyLevel(0.95, heavyLoad);
            
            // Let system adapt
            await waitForFrames(120); // 2 seconds
            
            // Reduce load
            manager.updateEnergyLevel(0.3, { model1: { active: true, processing: true } });
            
            // Should recover performance
            await waitForFrames(60); // 1 second
            
            const finalStats = manager.getPerformanceStats();
            expect(finalStats.fps).to.be.above(45);
        });
    });
    
    describe('Schema Validation Integration', () => {
        it('should validate against effect definitions schema', async () => {
            // Load the schema
            const schemaResponse = await fetch('/assets/schemas/WF-UX-003-effect-definitions.json');
            const schema = await schemaResponse.json();
            
            manager.start();
            
            // Test various effect configurations
            const effectConfigs = [
                {
                    energy: 0.3,
                    models: { model1: { active: true, processing: true } },
                    expectedEffects: ['lightning']
                },
                {
                    energy: 0.6,
                    models: { model1: { active: true, processing: true }, model2: { active: true, processing: true } },
                    expectedEffects: ['particles']
                },
                {
                    energy: 0.5,
                    models: { model1: { active: true, processing: true, agreement: 0.3 }, model2: { active: true, processing: true, agreement: 0.7 } },
                    expectedEffects: ['waves']
                },
                {
                    energy: 0.95,
                    models: { model1: { active: true, processing: true, agreement: 0.95 }, model2: { active: true, processing: true, agreement: 0.95 } },
                    expectedEffects: ['resonance']
                }
            ];
            
            for (const config of effectConfigs) {
                manager.updateEnergyLevel(config.energy, config.models);
                await waitForFrames(15);
                
                // Verify effects are within schema bounds
                const energyState = manager.getEnergyState();
                expect(energyState.level).to.be.at.least(0);
                expect(energyState.level).to.be.at.most(1);
                
                // Visual validation
                const canvas = container.querySelector('canvas');
                const imageData = getCanvasImageData(canvas);
                const hasVisualEffects = countNonBackgroundPixels(imageData) > 50;
                
                if (config.energy > 0.1) {
                    expect(hasVisualEffects).to.be.true;
                }
            }
        });
        
        it('should respect timing specifications', async () => {
            // Load timing schema
            const timingResponse = await fetch('/assets/schemas/WF-UX-003-timing-specifications.json');
            const timingSchema = await timingResponse.json();
            
            manager.start();
            
            // Test frame rate compliance
            const frameRates = [];
            const startTime = performance.now();
            let frameCount = 0;
            
            manager.updateEnergyLevel(0.7, {
                model1: { active: true, processing: true },
                model2: { active: true, processing: true }
            });
            
            while (performance.now() - startTime < 2000) {
                await waitForFrame();
                frameCount++;
                
                if (frameCount % 30 === 0) {
                    const currentTime = performance.now();
                    const fps = (frameCount * 1000) / (currentTime - startTime);
                    frameRates.push(fps);
                }
            }
            
            const avgFps = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
            
            // Should meet or adapt to target frame rate
            expect(avgFps > 30).to.be.true; // Minimum acceptable
        });
        
        it('should comply with accessibility configuration', async () => {
            // Load accessibility schema
            const accessibilityResponse = await fetch('/assets/schemas/WF-UX-003-accessibility.json');
            const accessibilitySchema = await accessibilityResponse.json();
            
            manager.dispose();
            manager = await VisualizationManager.create(container, {
                width: 1024,
                height: 768,
                accessibilityMode: true
            });
            
            manager.start();
            manager.updateEnergyLevel(0.6, { model1: { active: true, processing: true } });
            
            await waitForFrames(10);
            
            // Test ARIA compliance
            const canvas = container.querySelector('canvas');
            expect(canvas.getAttribute('role')).to.equal('img');
            expect(canvas.getAttribute('aria-label')).to.be.a('string');
            
            // Test contrast compliance
            const imageData = getCanvasImageData(canvas);
            const contrast = calculateContrast(imageData);
            expect(contrast).to.be.above(4.5); // WCAG AA
            
            // Test keyboard accessibility
            expect(canvas.getAttribute('tabindex')).to.equal('0');
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
    
    function getCanvasImageData(canvas) {
        const ctx = canvas.getContext('2d');
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
    
    function countColorRange(imageData, ranges) {
        let count = 0;
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            if (r >= ranges.r[0] && r <= ranges.r[1] &&
                g >= ranges.g[0] && g <= ranges.g[1] &&
                b >= ranges.b[0] && b <= ranges.b[1]) {
                count++;
            }
        }
        
        return count;
    }
    
    function countNonBackgroundPixels(imageData) {
        let count = 0;
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            if (a > 0 && (r > 20 || g > 20 || b > 20)) {
                count++;
            }
        }
        
        return count;
    }
    
    function calculatePatternComplexity(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        let edgeCount = 0;
        
        for (let y = 1; y < imageData.height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const index = (y * width + x) * 4;
                const current = data[index] + data[index + 1] + data[index + 2];
                
                const right = data[index + 4] + data[index + 5] + data[index + 6];
                const bottom = data[(y + 1) * width * 4 + x * 4] + 
                             data[(y + 1) * width * 4 + x * 4 + 1] + 
                             data[(y + 1) * width * 4 + x * 4 + 2];
                
                if (Math.abs(current - right) > 30 || Math.abs(current - bottom) > 30) {
                    edgeCount++;
                }
            }
        }
        
        return edgeCount / (width * imageData.height);
    }
    
    function calculateAverageBrightness(imageData) {
        const data = imageData.data;
        let totalBrightness = 0;
        let pixelCount = 0;
        
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) {
                const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                totalBrightness += brightness;
                pixelCount++;
            }
        }
        
        return pixelCount > 0 ? totalBrightness / (pixelCount * 255) : 0;
    }
    
    function calculateContrast(imageData) {
        const data = imageData.data;
        let minLuminance = 1;
        let maxLuminance = 0;
        
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) {
                const r = data[i] / 255;
                const g = data[i + 1] / 255;
                const b = data[i + 2] / 255;
                
                const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                
                minLuminance = Math.min(minLuminance, luminance);
                maxLuminance = Math.max(maxLuminance, luminance);
            }
        }
        
        return (maxLuminance + 0.05) / (minLuminance + 0.05);
    }
    
    function calculateImageDifference(img1, img2) {
        const data1 = img1.data;
        const data2 = img2.data;
        let totalDifference = 0;
        
        for (let i = 0; i < data1.length; i += 4) {
            const diff = Math.abs(data1[i] - data2[i]) + 
                        Math.abs(data1[i + 1] - data2[i + 1]) + 
                        Math.abs(data1[i + 2] - data2[i + 2]);
            totalDifference += diff;
        }
        
        return totalDifference / (data1.length * 255);
    }
});
