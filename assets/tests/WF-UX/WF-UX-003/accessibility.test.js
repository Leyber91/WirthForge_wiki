/**
 * WIRTHFORGE Energy Visualization - Accessibility Tests
 * WF-UX-003 Test Suite - WCAG 2.2 AA compliance and assistive technology support
 */

import { VisualizationManager } from '../code/WF-UX-003/visualization-manager.js';
import { expect } from 'chai';

describe('WF-UX-003 Accessibility Tests', () => {
    let container, manager;
    
    beforeEach(async () => {
        container = document.createElement('div');
        container.style.width = '800px';
        container.style.height = '600px';
        document.body.appendChild(container);
        
        manager = await VisualizationManager.create(container, {
            width: 800,
            height: 600,
            accessibilityMode: true
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
    
    describe('WCAG 2.2 AA Compliance', () => {
        it('should provide proper ARIA labels', () => {
            const canvas = container.querySelector('canvas');
            
            expect(canvas.getAttribute('role')).to.equal('img');
            expect(canvas.getAttribute('aria-label')).to.contain('WIRTHFORGE Energy Visualization');
        });
        
        it('should be keyboard accessible', () => {
            const canvas = container.querySelector('canvas');
            
            expect(canvas.getAttribute('tabindex')).to.equal('0');
            expect(canvas.tabIndex).to.equal(0);
        });
        
        it('should provide ARIA live regions for dynamic content', () => {
            manager.start();
            manager.updateEnergyLevel(0.5, { model1: { active: true, processing: true } });
            
            const liveRegion = document.querySelector('[aria-live]');
            
            expect(liveRegion).to.not.be.null;
            expect(liveRegion.getAttribute('aria-live')).to.equal('polite');
        });
        
        it('should announce energy level changes', async () => {
            manager.start();
            
            const liveRegion = document.querySelector('[aria-live]');
            const initialText = liveRegion.textContent;
            
            manager.updateEnergyLevel(0.8, { model1: { active: true, processing: true } });
            
            // Wait for throttled announcement
            await new Promise(resolve => setTimeout(resolve, 1100));
            
            const updatedText = liveRegion.textContent;
            expect(updatedText).to.not.equal(initialText);
            expect(updatedText).to.contain('energy level');
        });
        
        it('should maintain high contrast ratios', async () => {
            manager.start();
            manager.updateEnergyLevel(0.6, { model1: { active: true, processing: true } });
            
            await waitForFrames(10);
            
            const canvas = container.querySelector('canvas');
            const imageData = getCanvasImageData(canvas);
            const contrast = calculateContrast(imageData);
            
            expect(contrast).to.be.above(4.5); // WCAG AA requirement
        });
    });
    
    describe('Keyboard Navigation', () => {
        it('should respond to Ctrl+E for effect toggle', async () => {
            manager.start();
            manager.updateEnergyLevel(0.5, { model1: { active: true, processing: true } });
            
            const canvas = container.querySelector('canvas');
            canvas.focus();
            
            const beforeToggle = getCanvasImageData(canvas);
            
            // Simulate Ctrl+E
            const event = new KeyboardEvent('keydown', {
                code: 'KeyE',
                ctrlKey: true,
                bubbles: true
            });
            canvas.dispatchEvent(event);
            
            await waitForFrames(5);
            
            const afterToggle = getCanvasImageData(canvas);
            const difference = calculateImageDifference(beforeToggle, afterToggle);
            
            expect(difference).to.be.above(0.1); // Significant visual change
        });
        
        it('should respond to Ctrl+Plus/Minus for intensity adjustment', async () => {
            manager.start();
            manager.updateEnergyLevel(0.5, { model1: { active: true, processing: true } });
            
            const canvas = container.querySelector('canvas');
            canvas.focus();
            
            const initialState = manager.getEnergyState();
            
            // Simulate Ctrl+Plus
            const plusEvent = new KeyboardEvent('keydown', {
                code: 'Equal',
                ctrlKey: true,
                bubbles: true
            });
            canvas.dispatchEvent(plusEvent);
            
            const increasedState = manager.getEnergyState();
            expect(increasedState.level).to.be.above(initialState.level);
            
            // Simulate Ctrl+Minus
            const minusEvent = new KeyboardEvent('keydown', {
                code: 'Minus',
                ctrlKey: true,
                bubbles: true
            });
            canvas.dispatchEvent(minusEvent);
            
            const decreasedState = manager.getEnergyState();
            expect(decreasedState.level).to.be.below(increasedState.level);
        });
        
        it('should respond to Escape for emergency stop', async () => {
            manager.start();
            manager.updateEnergyLevel(0.8, { model1: { active: true, processing: true } });
            
            const canvas = container.querySelector('canvas');
            canvas.focus();
            
            let emergencyStopCalled = false;
            manager.on('emergencyStop', () => {
                emergencyStopCalled = true;
            });
            
            const escapeEvent = new KeyboardEvent('keydown', {
                code: 'Escape',
                bubbles: true
            });
            canvas.dispatchEvent(escapeEvent);
            
            expect(emergencyStopCalled).to.be.true;
            
            const finalState = manager.getEnergyState();
            expect(finalState.level).to.equal(0);
        });
    });
    
    describe('Screen Reader Support', () => {
        it('should provide meaningful system descriptions', () => {
            manager.start();
            manager.updateEnergyLevel(0.7, {
                model1: { active: true, processing: true },
                model2: { active: true, processing: true }
            });
            
            const description = manager.getSystemStatus();
            
            expect(description).to.be.a('string');
            expect(description.length).to.be.above(10);
            expect(description).to.match(/energy|model|level/i);
        });
        
        it('should describe different energy states appropriately', () => {
            manager.start();
            
            const states = [
                { level: 0.1, expected: /dormant|low|minimal/i },
                { level: 0.4, expected: /moderate|building/i },
                { level: 0.7, expected: /high|active/i },
                { level: 0.95, expected: /peak|resonance|maximum/i }
            ];
            
            states.forEach(({ level, expected }) => {
                manager.updateEnergyLevel(level, { model1: { active: true, processing: true } });
                const description = manager.getSystemStatus();
                expect(description).to.match(expected);
            });
        });
        
        it('should announce model collaboration states', async () => {
            manager.start();
            
            const liveRegion = document.querySelector('[aria-live]');
            
            // Single model
            manager.updateEnergyLevel(0.5, { model1: { active: true, processing: true } });
            await new Promise(resolve => setTimeout(resolve, 1100));
            
            let announcement = liveRegion.textContent;
            expect(announcement).to.not.contain('collaborating');
            
            // Multiple models
            manager.updateEnergyLevel(0.6, {
                model1: { active: true, processing: true },
                model2: { active: true, processing: true },
                model3: { active: true, processing: true }
            });
            await new Promise(resolve => setTimeout(resolve, 1100));
            
            announcement = liveRegion.textContent;
            expect(announcement).to.contain('collaborating');
        });
    });
    
    describe('Motion Sensitivity', () => {
        it('should respect prefers-reduced-motion', async () => {
            // Mock reduced motion preference
            Object.defineProperty(window, 'matchMedia', {
                writable: true,
                value: jest.fn().mockImplementation(query => ({
                    matches: query === '(prefers-reduced-motion: reduce)',
                    media: query,
                    onchange: null,
                    addListener: jest.fn(),
                    removeListener: jest.fn(),
                    addEventListener: jest.fn(),
                    removeEventListener: jest.fn(),
                    dispatchEvent: jest.fn(),
                })),
            });
            
            manager.start();
            manager.updateEnergyLevel(0.6, { model1: { active: true, processing: true } });
            
            const canvas = container.querySelector('canvas');
            const frame1 = getCanvasImageData(canvas);
            
            await waitForFrames(30); // Half second
            
            const frame2 = getCanvasImageData(canvas);
            const motion = calculateMotionBetweenFrames(frame1, frame2);
            
            expect(motion).to.be.below(0.1); // Significantly reduced motion
        });
        
        it('should provide static alternatives for high motion content', async () => {
            // Enable reduced motion
            Object.defineProperty(window, 'matchMedia', {
                writable: true,
                value: jest.fn().mockImplementation(query => ({
                    matches: query === '(prefers-reduced-motion: reduce)',
                    media: query,
                    onchange: null,
                    addListener: jest.fn(),
                    removeListener: jest.fn(),
                    addEventListener: jest.fn(),
                    removeEventListener: jest.fn(),
                    dispatchEvent: jest.fn(),
                })),
            });
            
            manager.start();
            manager.updateEnergyLevel(0.8, {
                model1: { active: true, processing: true },
                model2: { active: true, processing: true }
            });
            
            await waitForFrames(10);
            
            const canvas = container.querySelector('canvas');
            const imageData = getCanvasImageData(canvas);
            
            // Should still show energy visualization but with minimal animation
            const nonBackgroundPixels = countNonBackgroundPixels(imageData);
            expect(nonBackgroundPixels).to.be.above(100);
        });
    });
    
    describe('Color Accessibility', () => {
        it('should support high contrast mode', async () => {
            // Mock high contrast preference
            Object.defineProperty(window, 'matchMedia', {
                writable: true,
                value: jest.fn().mockImplementation(query => ({
                    matches: query === '(prefers-contrast: high)',
                    media: query,
                    onchange: null,
                    addListener: jest.fn(),
                    removeListener: jest.fn(),
                    addEventListener: jest.fn(),
                    removeEventListener: jest.fn(),
                    dispatchEvent: jest.fn(),
                })),
            });
            
            manager.start();
            manager.updateEnergyLevel(0.6, { model1: { active: true, processing: true } });
            
            await waitForFrames(10);
            
            const canvas = container.querySelector('canvas');
            const imageData = getCanvasImageData(canvas);
            const contrast = calculateContrast(imageData);
            
            expect(contrast).to.be.above(7.0); // Enhanced contrast for high contrast mode
        });
        
        it('should be accessible to color blind users', async () => {
            manager.start();
            manager.updateEnergyLevel(0.7, {
                model1: { active: true, processing: true },
                model2: { active: true, processing: true },
                model3: { active: true, processing: true }
            });
            
            await waitForFrames(15);
            
            const canvas = container.querySelector('canvas');
            const imageData = getCanvasImageData(canvas);
            
            // Test different color blindness simulations
            const protanopia = simulateColorBlindness(imageData, 'protanopia');
            const deuteranopia = simulateColorBlindness(imageData, 'deuteranopia');
            const tritanopia = simulateColorBlindness(imageData, 'tritanopia');
            
            // Should maintain distinguishable patterns even with color blindness
            const originalComplexity = calculatePatternComplexity(imageData);
            const protanopiaComplexity = calculatePatternComplexity(protanopia);
            const deuteranopiaComplexity = calculatePatternComplexity(deuteranopia);
            const tritanopiaComplexity = calculatePatternComplexity(tritanopia);
            
            expect(protanopiaComplexity / originalComplexity).to.be.above(0.7);
            expect(deuteranopiaComplexity / originalComplexity).to.be.above(0.7);
            expect(tritanopiaComplexity / originalComplexity).to.be.above(0.7);
        });
    });
    
    describe('Focus Management', () => {
        it('should properly manage focus states', () => {
            const canvas = container.querySelector('canvas');
            
            canvas.focus();
            expect(document.activeElement).to.equal(canvas);
            
            // Should have visible focus indicator
            const computedStyle = window.getComputedStyle(canvas, ':focus');
            expect(computedStyle.outline).to.not.equal('none');
        });
        
        it('should emit focus events', () => {
            let focusEventFired = false;
            let blurEventFired = false;
            
            manager.on('focus', () => {
                focusEventFired = true;
            });
            
            manager.on('blur', () => {
                blurEventFired = true;
            });
            
            const canvas = container.querySelector('canvas');
            
            canvas.focus();
            expect(focusEventFired).to.be.true;
            
            canvas.blur();
            expect(blurEventFired).to.be.true;
        });
    });
    
    describe('Cognitive Accessibility', () => {
        it('should provide clear and consistent labels', () => {
            const canvas = container.querySelector('canvas');
            const ariaLabel = canvas.getAttribute('aria-label');
            
            expect(ariaLabel).to.be.a('string');
            expect(ariaLabel).to.contain('WIRTHFORGE');
            expect(ariaLabel).to.contain('Energy');
            expect(ariaLabel).to.contain('Visualization');
        });
        
        it('should maintain consistent interaction patterns', async () => {
            manager.start();
            const canvas = container.querySelector('canvas');
            canvas.focus();
            
            // Test consistent keyboard shortcuts
            const shortcuts = [
                { key: 'KeyE', ctrl: true, description: 'toggle effects' },
                { key: 'Equal', ctrl: true, description: 'increase intensity' },
                { key: 'Minus', ctrl: true, description: 'decrease intensity' },
                { key: 'Escape', ctrl: false, description: 'emergency stop' }
            ];
            
            shortcuts.forEach(({ key, ctrl }) => {
                const event = new KeyboardEvent('keydown', {
                    code: key,
                    ctrlKey: ctrl,
                    bubbles: true
                });
                
                // Should not throw errors
                expect(() => canvas.dispatchEvent(event)).to.not.throw();
            });
        });
        
        it('should provide helpful error messages', async () => {
            // Test error handling
            const originalCreateRenderer = manager.createRenderer;
            manager.createRenderer = () => {
                throw new Error('WebGL not supported');
            };
            
            let errorEventFired = false;
            let errorMessage = '';
            
            manager.on('error', ({ error }) => {
                errorEventFired = true;
                errorMessage = error.message;
            });
            
            try {
                await manager.init();
            } catch (e) {
                // Expected to fail
            }
            
            expect(errorEventFired).to.be.true;
            expect(errorMessage).to.contain('WebGL');
        });
    });
    
    // Helper functions
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
    
    function calculateMotionBetweenFrames(frame1, frame2) {
        const data1 = frame1.data;
        const data2 = frame2.data;
        let totalDifference = 0;
        let pixelCount = 0;
        
        for (let i = 0; i < data1.length; i += 4) {
            const diff = Math.abs(data1[i] - data2[i]) + 
                        Math.abs(data1[i + 1] - data2[i + 1]) + 
                        Math.abs(data1[i + 2] - data2[i + 2]);
            totalDifference += diff;
            pixelCount++;
        }
        
        return totalDifference / (pixelCount * 255 * 3);
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
    
    function simulateColorBlindness(imageData, type) {
        const data = new Uint8ClampedArray(imageData.data);
        
        // Color blindness transformation matrices
        const matrices = {
            protanopia: [
                [0.567, 0.433, 0],
                [0.558, 0.442, 0],
                [0, 0.242, 0.758]
            ],
            deuteranopia: [
                [0.625, 0.375, 0],
                [0.7, 0.3, 0],
                [0, 0.3, 0.7]
            ],
            tritanopia: [
                [0.95, 0.05, 0],
                [0, 0.433, 0.567],
                [0, 0.475, 0.525]
            ]
        };
        
        const matrix = matrices[type];
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i] / 255;
            const g = data[i + 1] / 255;
            const b = data[i + 2] / 255;
            
            data[i] = Math.round((matrix[0][0] * r + matrix[0][1] * g + matrix[0][2] * b) * 255);
            data[i + 1] = Math.round((matrix[1][0] * r + matrix[1][1] * g + matrix[1][2] * b) * 255);
            data[i + 2] = Math.round((matrix[2][0] * r + matrix[2][1] * g + matrix[2][2] * b) * 255);
        }
        
        return new ImageData(data, imageData.width, imageData.height);
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
});
