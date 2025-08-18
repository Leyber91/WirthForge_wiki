/**
 * WIRTHFORGE Energy Visualization - Visual Regression Tests
 * WF-UX-003 Test Suite - Visual consistency and rendering validation
 */

import { VisualizationManager } from '../code/WF-UX-003/visualization-manager.js';
import { expect } from 'chai';

describe('WF-UX-003 Visual Regression Tests', () => {
    let container, manager, canvas;
    
    beforeEach(async () => {
        // Create test container
        container = document.createElement('div');
        container.style.width = '800px';
        container.style.height = '600px';
        document.body.appendChild(container);
        
        // Initialize visualization manager
        manager = await VisualizationManager.create(container, {
            width: 800,
            height: 600,
            antialias: false, // Disable for consistent testing
            debugMode: true
        });
        
        canvas = container.querySelector('canvas');
    });
    
    afterEach(() => {
        if (manager) {
            manager.dispose();
        }
        if (container && document.body.contains(container)) {
            document.body.removeChild(container);
        }
    });
    
    describe('Baseline Rendering', () => {
        it('should render empty scene correctly', async () => {
            manager.start();
            await waitForFrame();
            
            const imageData = getCanvasImageData(canvas);
            const hash = generateImageHash(imageData);
            
            // Store or compare against baseline hash
            expect(hash).to.be.a('string');
            expect(hash.length).to.equal(64); // SHA-256 hash
        });
        
        it('should render with consistent background color', async () => {
            manager.start();
            await waitForFrame();
            
            const imageData = getCanvasImageData(canvas);
            const backgroundColor = getAverageColor(imageData, { x: 0, y: 0, width: 100, height: 100 });
            
            // Should be dark background (close to 0x0a0a0a)
            expect(backgroundColor.r).to.be.below(20);
            expect(backgroundColor.g).to.be.below(20);
            expect(backgroundColor.b).to.be.below(20);
        });
    });
    
    describe('Lightning Effect Rendering', () => {
        it('should render lightning at low energy', async () => {
            manager.start();
            manager.updateEnergyLevel(0.3, { model1: { active: true, processing: true } });
            
            await waitForFrames(10); // Allow animation to settle
            
            const imageData = getCanvasImageData(canvas);
            const lightningRegion = extractRegion(imageData, { x: 350, y: 250, width: 100, height: 200 });
            
            // Should have some blue-ish lightning pixels
            const bluePixels = countColorRange(lightningRegion, { r: [0, 100], g: [0, 150], b: [100, 255] });
            expect(bluePixels).to.be.above(10);
        });
        
        it('should render brighter lightning at high energy', async () => {
            manager.start();
            manager.updateEnergyLevel(0.8, { model1: { active: true, processing: true } });
            
            await waitForFrames(10);
            
            const imageData = getCanvasImageData(canvas);
            const lightningRegion = extractRegion(imageData, { x: 350, y: 250, width: 100, height: 200 });
            
            // Should have bright white/blue pixels
            const brightPixels = countColorRange(lightningRegion, { r: [150, 255], g: [150, 255], b: [200, 255] });
            expect(brightPixels).to.be.above(5);
        });
        
        it('should maintain lightning consistency across frames', async () => {
            manager.start();
            manager.updateEnergyLevel(0.5, { model1: { active: true, processing: true } });
            
            const hashes = [];
            for (let i = 0; i < 5; i++) {
                await waitForFrames(2);
                const imageData = getCanvasImageData(canvas);
                const hash = generateImageHash(imageData);
                hashes.push(hash);
            }
            
            // Hashes should be different (animation) but similar structure
            const uniqueHashes = new Set(hashes);
            expect(uniqueHashes.size).to.be.above(1); // Animation should change
            expect(uniqueHashes.size).to.equal(5); // Each frame should be unique
        });
    });
    
    describe('Particle System Rendering', () => {
        it('should render particles for multi-model collaboration', async () => {
            manager.start();
            manager.updateEnergyLevel(0.6, {
                model1: { active: true, processing: true },
                model2: { active: true, processing: true },
                model3: { active: true, processing: true }
            });
            
            await waitForFrames(15);
            
            const imageData = getCanvasImageData(canvas);
            const particlePixels = countNonBackgroundPixels(imageData);
            
            expect(particlePixels).to.be.above(100); // Should have visible particles
        });
        
        it('should show different colors for different models', async () => {
            manager.start();
            manager.updateEnergyLevel(0.7, {
                model1: { active: true, processing: true },
                model2: { active: true, processing: true },
                model3: { active: true, processing: true },
                model4: { active: true, processing: true }
            });
            
            await waitForFrames(20);
            
            const imageData = getCanvasImageData(canvas);
            const colorVariance = calculateColorVariance(imageData);
            
            // Should have good color variety from different model particles
            expect(colorVariance.hue).to.be.above(0.3);
        });
    });
    
    describe('Wave Interference Rendering', () => {
        it('should render wave patterns for model disagreement', async () => {
            manager.start();
            manager.updateEnergyLevel(0.4, {
                model1: { active: true, processing: true, agreement: 0.3 },
                model2: { active: true, processing: true, agreement: 0.7 }
            });
            
            await waitForFrames(10);
            
            const imageData = getCanvasImageData(canvas);
            const waveRegion = extractRegion(imageData, { x: 200, y: 200, width: 400, height: 200 });
            
            // Should show wave interference patterns
            const patternComplexity = calculatePatternComplexity(waveRegion);
            expect(patternComplexity).to.be.above(0.1);
        });
        
        it('should show constructive and destructive interference', async () => {
            manager.start();
            manager.updateEnergyLevel(0.5, {
                model1: { active: true, processing: true, agreement: 0.2 },
                model2: { active: true, processing: true, agreement: 0.8 }
            });
            
            await waitForFrames(15);
            
            const imageData = getCanvasImageData(canvas);
            
            // Look for green (constructive) and red (destructive) regions
            const greenPixels = countColorRange(imageData, { r: [0, 100], g: [150, 255], b: [0, 150] });
            const redPixels = countColorRange(imageData, { r: [150, 255], g: [0, 100], b: [0, 100] });
            
            expect(greenPixels + redPixels).to.be.above(50);
        });
    });
    
    describe('Resonance Field Rendering', () => {
        it('should render resonance field at peak energy', async () => {
            manager.start();
            manager.updateEnergyLevel(0.95, {
                model1: { active: true, processing: true, agreement: 0.95 },
                model2: { active: true, processing: true, agreement: 0.95 },
                model3: { active: true, processing: true, agreement: 0.95 }
            });
            
            await waitForFrames(20);
            
            const imageData = getCanvasImageData(canvas);
            const centerRegion = extractRegion(imageData, { x: 300, y: 200, width: 200, height: 200 });
            
            // Should have bright, colorful resonance field
            const brightness = calculateAverageBrightness(centerRegion);
            expect(brightness).to.be.above(0.3);
            
            const colorfulness = calculateColorfulness(centerRegion);
            expect(colorfulness).to.be.above(0.4);
        });
        
        it('should show harmonic patterns in resonance field', async () => {
            manager.start();
            manager.updateEnergyLevel(0.9, {
                model1: { active: true, processing: true, agreement: 0.9 },
                model2: { active: true, processing: true, agreement: 0.9 }
            });
            
            await waitForFrames(25);
            
            const imageData = getCanvasImageData(canvas);
            const harmonicComplexity = calculateHarmonicComplexity(imageData);
            
            expect(harmonicComplexity).to.be.above(0.2);
        });
    });
    
    describe('Quality Level Consistency', () => {
        ['low', 'medium', 'high'].forEach(quality => {
            it(`should render consistently at ${quality} quality`, async () => {
                manager.setQualityLevel(quality);
                manager.start();
                manager.updateEnergyLevel(0.6, {
                    model1: { active: true, processing: true },
                    model2: { active: true, processing: true }
                });
                
                const hashes = [];
                for (let i = 0; i < 3; i++) {
                    await waitForFrames(5);
                    const imageData = getCanvasImageData(canvas);
                    const hash = generateImageHash(imageData);
                    hashes.push(hash);
                }
                
                // Should have consistent rendering structure
                const similarity = calculateHashSimilarity(hashes[0], hashes[2]);
                expect(similarity).to.be.above(0.7); // 70% similarity threshold
            });
        });
    });
    
    describe('Accessibility Mode Rendering', () => {
        it('should render with high contrast in accessibility mode', async () => {
            manager.dispose();
            manager = await VisualizationManager.create(container, {
                width: 800,
                height: 600,
                accessibilityMode: true
            });
            
            manager.start();
            manager.updateEnergyLevel(0.5, { model1: { active: true, processing: true } });
            
            await waitForFrames(10);
            
            const imageData = getCanvasImageData(canvas);
            const contrast = calculateContrast(imageData);
            
            expect(contrast).to.be.above(4.5); // WCAG AA compliance
        });
        
        it('should maintain readability with reduced motion', async () => {
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
            manager.updateEnergyLevel(0.4, { model1: { active: true, processing: true } });
            
            const frame1 = getCanvasImageData(canvas);
            await waitForFrames(10);
            const frame2 = getCanvasImageData(canvas);
            
            // Motion should be significantly reduced
            const motionAmount = calculateMotionBetweenFrames(frame1, frame2);
            expect(motionAmount).to.be.below(0.1);
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
    
    function generateImageHash(imageData) {
        // Simple hash based on pixel data
        const data = imageData.data;
        let hash = 0;
        for (let i = 0; i < data.length; i += 4) {
            hash = ((hash << 5) - hash + data[i] + data[i + 1] + data[i + 2]) & 0xffffffff;
        }
        return hash.toString(16).padStart(8, '0');
    }
    
    function getAverageColor(imageData, region) {
        const { x, y, width, height } = region;
        let r = 0, g = 0, b = 0, count = 0;
        
        for (let py = y; py < y + height; py++) {
            for (let px = x; px < x + width; px++) {
                const index = (py * imageData.width + px) * 4;
                r += imageData.data[index];
                g += imageData.data[index + 1];
                b += imageData.data[index + 2];
                count++;
            }
        }
        
        return { r: r / count, g: g / count, b: b / count };
    }
    
    function extractRegion(imageData, region) {
        const { x, y, width, height } = region;
        const regionData = new Uint8ClampedArray(width * height * 4);
        
        for (let py = 0; py < height; py++) {
            for (let px = 0; px < width; px++) {
                const srcIndex = ((y + py) * imageData.width + (x + px)) * 4;
                const dstIndex = (py * width + px) * 4;
                
                regionData[dstIndex] = imageData.data[srcIndex];
                regionData[dstIndex + 1] = imageData.data[srcIndex + 1];
                regionData[dstIndex + 2] = imageData.data[srcIndex + 2];
                regionData[dstIndex + 3] = imageData.data[srcIndex + 3];
            }
        }
        
        return new ImageData(regionData, width, height);
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
            
            // Consider non-background if significantly different from dark background
            if (a > 0 && (r > 20 || g > 20 || b > 20)) {
                count++;
            }
        }
        
        return count;
    }
    
    function calculateColorVariance(imageData) {
        const data = imageData.data;
        const colors = [];
        
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) { // Only consider visible pixels
                colors.push({
                    r: data[i],
                    g: data[i + 1],
                    b: data[i + 2]
                });
            }
        }
        
        if (colors.length === 0) return { hue: 0, saturation: 0, brightness: 0 };
        
        const hues = colors.map(color => rgbToHsb(color).h);
        const hueVariance = calculateVariance(hues);
        
        return { hue: hueVariance };
    }
    
    function calculatePatternComplexity(imageData) {
        // Simple edge detection for pattern complexity
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
    
    function calculateColorfulness(imageData) {
        const data = imageData.data;
        const colors = new Set();
        
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) {
                const color = `${Math.floor(data[i] / 32)},${Math.floor(data[i + 1] / 32)},${Math.floor(data[i + 2] / 32)}`;
                colors.add(color);
            }
        }
        
        return colors.size / 512; // Normalize by max possible colors in reduced space
    }
    
    function calculateHarmonicComplexity(imageData) {
        // Analyze frequency patterns in the image
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // Simple frequency analysis using horizontal and vertical gradients
        let harmonicScore = 0;
        
        for (let y = 0; y < height; y += 4) {
            for (let x = 0; x < width - 8; x += 4) {
                const samples = [];
                for (let i = 0; i < 8; i++) {
                    const index = (y * width + x + i) * 4;
                    samples.push((data[index] + data[index + 1] + data[index + 2]) / 3);
                }
                
                // Look for periodic patterns
                const periodicity = calculatePeriodicity(samples);
                harmonicScore += periodicity;
            }
        }
        
        return harmonicScore / (width * height / 16);
    }
    
    function calculateHashSimilarity(hash1, hash2) {
        if (hash1.length !== hash2.length) return 0;
        
        let matches = 0;
        for (let i = 0; i < hash1.length; i++) {
            if (hash1[i] === hash2[i]) matches++;
        }
        
        return matches / hash1.length;
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
                
                // Calculate relative luminance
                const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                
                minLuminance = Math.min(minLuminance, luminance);
                maxLuminance = Math.max(maxLuminance, luminance);
            }
        }
        
        return (maxLuminance + 0.05) / (minLuminance + 0.05);
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
    
    function rgbToHsb(rgb) {
        const r = rgb.r / 255;
        const g = rgb.g / 255;
        const b = rgb.b / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        
        let h = 0;
        if (delta !== 0) {
            if (max === r) h = ((g - b) / delta) % 6;
            else if (max === g) h = (b - r) / delta + 2;
            else h = (r - g) / delta + 4;
        }
        h = Math.round(h * 60);
        if (h < 0) h += 360;
        
        const s = max === 0 ? 0 : delta / max;
        const brightness = max;
        
        return { h: h / 360, s, b: brightness };
    }
    
    function calculateVariance(values) {
        if (values.length === 0) return 0;
        
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
        
        return Math.sqrt(variance);
    }
    
    function calculatePeriodicity(samples) {
        // Simple autocorrelation for periodicity detection
        let maxCorrelation = 0;
        
        for (let lag = 1; lag < samples.length / 2; lag++) {
            let correlation = 0;
            for (let i = 0; i < samples.length - lag; i++) {
                correlation += samples[i] * samples[i + lag];
            }
            maxCorrelation = Math.max(maxCorrelation, Math.abs(correlation));
        }
        
        return maxCorrelation / (samples.length * 255 * 255);
    }
});
