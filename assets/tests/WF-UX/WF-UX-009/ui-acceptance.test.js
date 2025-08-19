/**
 * WF-UX-009 UI Acceptance Test Suite
 * 
 * End-to-end tests for advanced user interface components
 * Tests: User interactions, accessibility, performance, visual regression
 * 
 * Coverage: Dashboard, workflow canvas, energy editor, hotkey system
 * Dependencies: Jest, Puppeteer, Accessibility testing, Visual testing
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import puppeteer from 'puppeteer';
import { AxePuppeteer } from '@axe-core/puppeteer';
import { TestDataGenerator } from '../utils/test-data-generator.js';
import { VisualRegressionTester } from '../utils/visual-regression.js';

describe('WF-UX-009 UI Acceptance Tests', () => {
    let browser;
    let page;
    let testData;
    let visualTester;
    let testServer;

    beforeEach(async () => {
        // Setup test data
        testData = new TestDataGenerator();
        visualTester = new VisualRegressionTester();
        
        // Launch browser
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: { width: 1920, height: 1080 }
        });
        
        page = await browser.newPage();
        
        // Setup test server with mock data
        testServer = await setupTestServer();
        
        // Navigate to test application
        await page.goto(`http://localhost:${testServer.port}/test-app`);
        
        // Wait for application to load
        await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 10000 });
    });

    afterEach(async () => {
        if (page) await page.close();
        if (browser) await browser.close();
        if (testServer) await testServer.close();
    });

    describe('Advanced Dashboard', () => {
        test('should render dashboard with all panels', async () => {
            await page.goto(`http://localhost:${testServer.port}/dashboard`);
            await page.waitForSelector('[data-testid="advanced-dashboard"]');
            
            // Check for required panels
            const panels = await page.$$eval('.dashboard-panel', panels => 
                panels.map(panel => panel.dataset.panelType)
            );
            
            expect(panels).toContain('energy-patterns');
            expect(panels).toContain('workflow-canvas');
            expect(panels).toContain('automation-rules');
            expect(panels).toContain('plugin-manager');
        });

        test('should support panel drag and drop reordering', async () => {
            await page.goto(`http://localhost:${testServer.port}/dashboard`);
            await page.waitForSelector('.dashboard-panel');
            
            const panel1 = await page.$('[data-panel-type="energy-patterns"]');
            const panel2 = await page.$('[data-panel-type="workflow-canvas"]');
            
            const panel1Box = await panel1.boundingBox();
            const panel2Box = await panel2.boundingBox();
            
            // Drag panel1 to panel2's position
            await page.mouse.move(panel1Box.x + panel1Box.width / 2, panel1Box.y + panel1Box.height / 2);
            await page.mouse.down();
            await page.mouse.move(panel2Box.x + panel2Box.width / 2, panel2Box.y + panel2Box.height / 2);
            await page.mouse.up();
            
            // Wait for reorder animation
            await page.waitForTimeout(500);
            
            // Verify panels have been reordered
            const newOrder = await page.$$eval('.dashboard-panel', panels => 
                panels.map(panel => panel.dataset.panelType)
            );
            
            const panel1Index = newOrder.indexOf('energy-patterns');
            const panel2Index = newOrder.indexOf('workflow-canvas');
            expect(panel1Index).toBeGreaterThan(panel2Index);
        });

        test('should maintain 60Hz performance during real-time updates', async () => {
            await page.goto(`http://localhost:${testServer.port}/dashboard`);
            await page.waitForSelector('[data-testid="advanced-dashboard"]');
            
            // Start performance monitoring
            await page.evaluate(() => {
                window.performanceMetrics = {
                    frameRates: [],
                    startTime: performance.now()
                };
                
                function measureFrameRate() {
                    const now = performance.now();
                    const fps = 1000 / (now - window.performanceMetrics.lastFrame || now);
                    window.performanceMetrics.frameRates.push(fps);
                    window.performanceMetrics.lastFrame = now;
                    
                    if (now - window.performanceMetrics.startTime < 5000) {
                        requestAnimationFrame(measureFrameRate);
                    }
                }
                
                requestAnimationFrame(measureFrameRate);
            });
            
            // Simulate heavy real-time updates
            await page.evaluate(() => {
                const dashboard = document.querySelector('[data-testid="advanced-dashboard"]');
                const event = new CustomEvent('heavy-update-simulation');
                dashboard.dispatchEvent(event);
            });
            
            // Wait for measurement period
            await page.waitForTimeout(5000);
            
            // Check frame rate metrics
            const metrics = await page.evaluate(() => window.performanceMetrics);
            const averageFPS = metrics.frameRates.reduce((a, b) => a + b, 0) / metrics.frameRates.length;
            
            expect(averageFPS).toBeGreaterThanOrEqual(55); // Allow 5fps tolerance from 60fps
        });

        test('should handle panel minimization and restoration', async () => {
            await page.goto(`http://localhost:${testServer.port}/dashboard`);
            await page.waitForSelector('.dashboard-panel');
            
            const panel = await page.$('[data-panel-type="energy-patterns"]');
            const minimizeButton = await panel.$('.panel-minimize');
            
            // Minimize panel
            await minimizeButton.click();
            await page.waitForTimeout(300); // Animation time
            
            const isMinimized = await panel.evaluate(el => el.classList.contains('minimized'));
            expect(isMinimized).toBe(true);
            
            // Restore panel
            await minimizeButton.click();
            await page.waitForTimeout(300);
            
            const isRestored = await panel.evaluate(el => !el.classList.contains('minimized'));
            expect(isRestored).toBe(true);
        });

        test('should support custom panel layouts', async () => {
            await page.goto(`http://localhost:${testServer.port}/dashboard`);
            await page.waitForSelector('[data-testid="advanced-dashboard"]');
            
            // Open layout selector
            await page.click('[data-testid="layout-selector"]');
            await page.waitForSelector('.layout-options');
            
            // Select custom layout
            await page.click('[data-layout="custom"]');
            await page.waitForTimeout(500);
            
            // Verify layout change
            const gridColumns = await page.evaluate(() => {
                const grid = document.querySelector('.dashboard-grid');
                return window.getComputedStyle(grid).gridTemplateColumns;
            });
            
            expect(gridColumns).toContain('fr'); // Should have fractional units
        });
    });

    describe('Workflow Canvas', () => {
        test('should create workflow nodes via drag and drop', async () => {
            await page.goto(`http://localhost:${testServer.port}/workflow-editor`);
            await page.waitForSelector('.workflow-canvas');
            
            const nodeTemplate = await page.$('[data-node-type="action"]');
            const canvas = await page.$('.workflow-canvas');
            
            const templateBox = await nodeTemplate.boundingBox();
            const canvasBox = await canvas.boundingBox();
            
            // Drag node template to canvas
            await page.mouse.move(templateBox.x + templateBox.width / 2, templateBox.y + templateBox.height / 2);
            await page.mouse.down();
            await page.mouse.move(canvasBox.x + 200, canvasBox.y + 200);
            await page.mouse.up();
            
            // Wait for node creation
            await page.waitForSelector('.workflow-node', { timeout: 2000 });
            
            const nodeCount = await page.$$eval('.workflow-node', nodes => nodes.length);
            expect(nodeCount).toBe(1);
        });

        test('should connect nodes with visual connections', async () => {
            await page.goto(`http://localhost:${testServer.port}/workflow-editor`);
            await page.waitForSelector('.workflow-canvas');
            
            // Create two nodes
            await createWorkflowNode(page, 'start', 100, 100);
            await createWorkflowNode(page, 'action', 300, 100);
            
            const startNode = await page.$('[data-node-type="start"]');
            const actionNode = await page.$('[data-node-type="action"]');
            
            // Connect nodes by dragging from output to input
            const startOutput = await startNode.$('.node-output');
            const actionInput = await actionNode.$('.node-input');
            
            const outputBox = await startOutput.boundingBox();
            const inputBox = await actionInput.boundingBox();
            
            await page.mouse.move(outputBox.x + outputBox.width / 2, outputBox.y + outputBox.height / 2);
            await page.mouse.down();
            await page.mouse.move(inputBox.x + inputBox.width / 2, inputBox.y + inputBox.height / 2);
            await page.mouse.up();
            
            // Verify connection was created
            await page.waitForSelector('.workflow-connection', { timeout: 2000 });
            const connectionCount = await page.$$eval('.workflow-connection', connections => connections.length);
            expect(connectionCount).toBe(1);
        });

        test('should validate workflow structure', async () => {
            await page.goto(`http://localhost:${testServer.port}/workflow-editor`);
            await page.waitForSelector('.workflow-canvas');
            
            // Create invalid workflow (action without start node)
            await createWorkflowNode(page, 'action', 200, 200);
            
            // Attempt to validate
            await page.click('[data-testid="validate-workflow"]');
            await page.waitForSelector('.validation-errors');
            
            const errors = await page.$$eval('.validation-error', errors => 
                errors.map(error => error.textContent)
            );
            
            expect(errors).toContain('Missing start node');
        });

        test('should execute workflow with visual feedback', async () => {
            await page.goto(`http://localhost:${testServer.port}/workflow-editor`);
            await page.waitForSelector('.workflow-canvas');
            
            // Create simple workflow
            await createWorkflowNode(page, 'start', 100, 200);
            await createWorkflowNode(page, 'action', 300, 200);
            await createWorkflowNode(page, 'end', 500, 200);
            
            // Connect nodes
            await connectNodes(page, 'start', 'action');
            await connectNodes(page, 'action', 'end');
            
            // Execute workflow
            await page.click('[data-testid="run-workflow"]');
            
            // Wait for execution to start
            await page.waitForSelector('.node-running', { timeout: 2000 });
            
            // Verify visual feedback during execution
            const runningNodes = await page.$$eval('.node-running', nodes => nodes.length);
            expect(runningNodes).toBeGreaterThan(0);
            
            // Wait for completion
            await page.waitForSelector('.node-completed', { timeout: 5000 });
            const completedNodes = await page.$$eval('.node-completed', nodes => nodes.length);
            expect(completedNodes).toBe(3);
        });

        test('should support workflow zoom and pan', async () => {
            await page.goto(`http://localhost:${testServer.port}/workflow-editor`);
            await page.waitForSelector('.workflow-canvas');
            
            const canvas = await page.$('.workflow-canvas');
            const canvasBox = await canvas.boundingBox();
            
            // Test zoom in
            await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
            await page.mouse.wheel({ deltaY: -100 }); // Zoom in
            
            const zoomLevel1 = await page.evaluate(() => {
                const canvas = document.querySelector('.workflow-canvas');
                return canvas.style.transform;
            });
            
            expect(zoomLevel1).toContain('scale');
            
            // Test pan
            await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100);
            await page.mouse.down();
            await page.mouse.move(canvasBox.x + 200, canvasBox.y + 200);
            await page.mouse.up();
            
            const transform = await page.evaluate(() => {
                const canvas = document.querySelector('.workflow-canvas');
                return canvas.style.transform;
            });
            
            expect(transform).toContain('translate');
        });
    });

    describe('Energy Pattern Editor', () => {
        test('should render energy visualization canvas', async () => {
            await page.goto(`http://localhost:${testServer.port}/energy-editor`);
            await page.waitForSelector('.energy-pattern-editor');
            
            const canvas = await page.$('.pattern-canvas');
            expect(canvas).toBeTruthy();
            
            const canvasSize = await canvas.evaluate(el => ({
                width: el.width,
                height: el.height
            }));
            
            expect(canvasSize.width).toBeGreaterThan(0);
            expect(canvasSize.height).toBeGreaterThan(0);
        });

        test('should create energy nodes with visual feedback', async () => {
            await page.goto(`http://localhost:${testServer.port}/energy-editor`);
            await page.waitForSelector('.pattern-canvas');
            
            // Click add node button
            await page.click('[data-testid="add-energy-node"]');
            
            // Click on canvas to place node
            const canvas = await page.$('.pattern-canvas');
            const canvasBox = await canvas.boundingBox();
            await page.mouse.click(canvasBox.x + 200, canvasBox.y + 200);
            
            // Verify node was created
            const nodeCount = await page.evaluate(() => {
                const canvas = document.querySelector('.pattern-canvas');
                const ctx = canvas.getContext('2d');
                return window.energyEditor ? window.energyEditor.nodeCount : 0;
            });
            
            expect(nodeCount).toBeGreaterThan(0);
        });

        test('should display real-time energy flow animations', async () => {
            await page.goto(`http://localhost:${testServer.port}/energy-editor`);
            await page.waitForSelector('.pattern-canvas');
            
            // Create energy pattern with flow
            await page.evaluate(() => {
                if (window.energyEditor) {
                    window.energyEditor.createTestPattern();
                    window.energyEditor.startEnergyFlow();
                }
            });
            
            // Wait for animations to start
            await page.waitForTimeout(1000);
            
            // Check if particles are being animated
            const hasAnimations = await page.evaluate(() => {
                return window.energyEditor ? window.energyEditor.hasActiveAnimations() : false;
            });
            
            expect(hasAnimations).toBe(true);
        });

        test('should update energy metrics in real-time', async () => {
            await page.goto(`http://localhost:${testServer.port}/energy-editor`);
            await page.waitForSelector('.energy-metrics');
            
            // Get initial metrics
            const initialFlow = await page.$eval('#energy-flow-value', el => el.textContent);
            const initialEfficiency = await page.$eval('#efficiency-value', el => el.textContent);
            
            // Simulate energy changes
            await page.evaluate(() => {
                if (window.energyEditor) {
                    window.energyEditor.simulateEnergyChange();
                }
            });
            
            // Wait for updates
            await page.waitForTimeout(500);
            
            const updatedFlow = await page.$eval('#energy-flow-value', el => el.textContent);
            const updatedEfficiency = await page.$eval('#efficiency-value', el => el.textContent);
            
            // Metrics should have changed
            expect(updatedFlow).not.toBe(initialFlow);
            expect(updatedEfficiency).not.toBe(initialEfficiency);
        });
    });

    describe('Hotkey System', () => {
        test('should respond to global hotkeys', async () => {
            await page.goto(`http://localhost:${testServer.port}/dashboard`);
            await page.waitForSelector('[data-testid="advanced-dashboard"]');
            
            // Test Ctrl+Shift+D (debug console)
            await page.keyboard.down('Control');
            await page.keyboard.down('Shift');
            await page.keyboard.press('KeyD');
            await page.keyboard.up('Shift');
            await page.keyboard.up('Control');
            
            // Wait for debug console to appear
            await page.waitForSelector('.debug-console', { timeout: 2000 });
            
            const debugConsole = await page.$('.debug-console');
            expect(debugConsole).toBeTruthy();
        });

        test('should handle context-sensitive hotkeys', async () => {
            await page.goto(`http://localhost:${testServer.port}/workflow-editor`);
            await page.waitForSelector('.workflow-canvas');
            
            // Focus on workflow canvas
            await page.click('.workflow-canvas');
            
            // Test workflow-specific hotkey (Ctrl+R for run)
            await page.keyboard.down('Control');
            await page.keyboard.press('KeyR');
            await page.keyboard.up('Control');
            
            // Check if workflow execution started
            const executionStarted = await page.evaluate(() => {
                return document.querySelector('.workflow-status').textContent.includes('Running');
            });
            
            expect(executionStarted).toBe(true);
        });

        test('should support key sequences for power users', async () => {
            await page.goto(`http://localhost:${testServer.port}/dashboard`);
            await page.waitForSelector('[data-testid="advanced-dashboard"]');
            
            // Test sequence: g, w (go to workflows)
            await page.keyboard.press('KeyG');
            await page.waitForTimeout(100);
            await page.keyboard.press('KeyW');
            
            // Wait for navigation
            await page.waitForTimeout(500);
            
            // Check if navigated to workflows
            const currentUrl = page.url();
            expect(currentUrl).toContain('workflows');
        });

        test('should prevent conflicts with browser shortcuts', async () => {
            await page.goto(`http://localhost:${testServer.port}/dashboard`);
            await page.waitForSelector('[data-testid="advanced-dashboard"]');
            
            // Test Ctrl+T (should not open new tab)
            const initialPageCount = (await browser.pages()).length;
            
            await page.keyboard.down('Control');
            await page.keyboard.press('KeyT');
            await page.keyboard.up('Control');
            
            await page.waitForTimeout(500);
            
            const finalPageCount = (await browser.pages()).length;
            expect(finalPageCount).toBe(initialPageCount);
        });
    });

    describe('Accessibility', () => {
        test('should meet WCAG 2.1 AA standards', async () => {
            await page.goto(`http://localhost:${testServer.port}/dashboard`);
            await page.waitForSelector('[data-testid="advanced-dashboard"]');
            
            const results = await new AxePuppeteer(page).analyze();
            
            expect(results.violations).toHaveLength(0);
        });

        test('should support keyboard navigation', async () => {
            await page.goto(`http://localhost:${testServer.port}/dashboard`);
            await page.waitForSelector('[data-testid="advanced-dashboard"]');
            
            // Tab through focusable elements
            await page.keyboard.press('Tab');
            let focusedElement = await page.evaluate(() => document.activeElement.tagName);
            expect(['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A']).toContain(focusedElement);
            
            // Continue tabbing
            for (let i = 0; i < 5; i++) {
                await page.keyboard.press('Tab');
                focusedElement = await page.evaluate(() => document.activeElement.tagName);
                expect(focusedElement).toBeDefined();
            }
        });

        test('should provide proper ARIA labels', async () => {
            await page.goto(`http://localhost:${testServer.port}/dashboard`);
            await page.waitForSelector('[data-testid="advanced-dashboard"]');
            
            const ariaLabels = await page.$$eval('[aria-label]', elements => 
                elements.map(el => el.getAttribute('aria-label'))
            );
            
            expect(ariaLabels.length).toBeGreaterThan(0);
            ariaLabels.forEach(label => {
                expect(label).toBeTruthy();
                expect(label.length).toBeGreaterThan(0);
            });
        });

        test('should support screen reader announcements', async () => {
            await page.goto(`http://localhost:${testServer.port}/workflow-editor`);
            await page.waitForSelector('.workflow-canvas');
            
            // Create a node (should announce creation)
            await createWorkflowNode(page, 'action', 200, 200);
            
            // Check for aria-live region updates
            const announcements = await page.$$eval('[aria-live]', regions => 
                regions.map(region => region.textContent).filter(text => text.trim())
            );
            
            expect(announcements.length).toBeGreaterThan(0);
        });

        test('should maintain focus management', async () => {
            await page.goto(`http://localhost:${testServer.port}/dashboard`);
            await page.waitForSelector('[data-testid="advanced-dashboard"]');
            
            // Open a modal/dialog
            await page.click('[data-testid="open-settings"]');
            await page.waitForSelector('.modal-dialog');
            
            // Focus should be trapped in modal
            const focusedElement = await page.evaluate(() => document.activeElement);
            const modalElement = await page.$('.modal-dialog');
            
            const isInsideModal = await page.evaluate((modal, focused) => {
                return modal.contains(focused);
            }, modalElement, focusedElement);
            
            expect(isInsideModal).toBe(true);
        });
    });

    describe('Visual Regression', () => {
        test('should match dashboard layout baseline', async () => {
            await page.goto(`http://localhost:${testServer.port}/dashboard`);
            await page.waitForSelector('[data-testid="advanced-dashboard"]');
            
            const screenshot = await page.screenshot({ fullPage: true });
            const comparison = await visualTester.compare('dashboard-layout', screenshot);
            
            expect(comparison.mismatchPercentage).toBeLessThan(0.1); // Less than 0.1% difference
        });

        test('should match workflow canvas appearance', async () => {
            await page.goto(`http://localhost:${testServer.port}/workflow-editor`);
            await page.waitForSelector('.workflow-canvas');
            
            // Create consistent test workflow
            await createTestWorkflow(page);
            
            const screenshot = await page.screenshot({ 
                clip: { x: 0, y: 0, width: 800, height: 600 }
            });
            
            const comparison = await visualTester.compare('workflow-canvas', screenshot);
            expect(comparison.mismatchPercentage).toBeLessThan(0.1);
        });

        test('should match energy pattern visualization', async () => {
            await page.goto(`http://localhost:${testServer.port}/energy-editor`);
            await page.waitForSelector('.pattern-canvas');
            
            // Create consistent energy pattern
            await page.evaluate(() => {
                if (window.energyEditor) {
                    window.energyEditor.loadTestPattern('baseline-pattern');
                }
            });
            
            await page.waitForTimeout(1000); // Wait for animations to stabilize
            
            const screenshot = await page.screenshot({
                clip: { x: 0, y: 0, width: 800, height: 600 }
            });
            
            const comparison = await visualTester.compare('energy-pattern', screenshot);
            expect(comparison.mismatchPercentage).toBeLessThan(0.2); // Allow slight animation variance
        });
    });

    describe('Performance', () => {
        test('should load dashboard within performance budget', async () => {
            const startTime = Date.now();
            
            await page.goto(`http://localhost:${testServer.port}/dashboard`);
            await page.waitForSelector('[data-testid="advanced-dashboard"]');
            
            const loadTime = Date.now() - startTime;
            expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
        });

        test('should maintain smooth animations', async () => {
            await page.goto(`http://localhost:${testServer.port}/energy-editor`);
            await page.waitForSelector('.pattern-canvas');
            
            // Start performance monitoring
            await page.evaluate(() => {
                window.animationFrameTimes = [];
                let lastTime = performance.now();
                
                function measureFrame() {
                    const now = performance.now();
                    window.animationFrameTimes.push(now - lastTime);
                    lastTime = now;
                    
                    if (window.animationFrameTimes.length < 300) { // 5 seconds at 60fps
                        requestAnimationFrame(measureFrame);
                    }
                }
                
                requestAnimationFrame(measureFrame);
            });
            
            // Start energy animations
            await page.evaluate(() => {
                if (window.energyEditor) {
                    window.energyEditor.startIntensiveAnimations();
                }
            });
            
            // Wait for measurement completion
            await page.waitForTimeout(5000);
            
            const frameTimes = await page.evaluate(() => window.animationFrameTimes);
            const averageFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
            
            expect(averageFrameTime).toBeLessThan(20); // Should average less than 20ms (50fps+)
        });

        test('should handle large datasets efficiently', async () => {
            await page.goto(`http://localhost:${testServer.port}/workflow-editor`);
            await page.waitForSelector('.workflow-canvas');
            
            const startTime = Date.now();
            
            // Create large workflow
            await page.evaluate(() => {
                if (window.workflowEditor) {
                    window.workflowEditor.createLargeWorkflow(100); // 100 nodes
                }
            });
            
            const creationTime = Date.now() - startTime;
            expect(creationTime).toBeLessThan(5000); // Should create within 5 seconds
            
            // Test interaction responsiveness
            const interactionStart = Date.now();
            await page.click('.workflow-canvas');
            const interactionTime = Date.now() - interactionStart;
            
            expect(interactionTime).toBeLessThan(100); // Should respond within 100ms
        });
    });
});

// Helper functions
async function setupTestServer() {
    // Mock implementation - would setup actual test server
    return {
        port: 3001,
        close: async () => {}
    };
}

async function createWorkflowNode(page, type, x, y) {
    const nodeTemplate = await page.$(`[data-node-type="${type}"]`);
    const canvas = await page.$('.workflow-canvas');
    
    const templateBox = await nodeTemplate.boundingBox();
    const canvasBox = await canvas.boundingBox();
    
    await page.mouse.move(templateBox.x + templateBox.width / 2, templateBox.y + templateBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + x, canvasBox.y + y);
    await page.mouse.up();
    
    await page.waitForTimeout(300); // Wait for node creation
}

async function connectNodes(page, fromType, toType) {
    const fromNode = await page.$(`[data-node-type="${fromType}"]`);
    const toNode = await page.$(`[data-node-type="${toType}"]`);
    
    const fromOutput = await fromNode.$('.node-output');
    const toInput = await toNode.$('.node-input');
    
    const outputBox = await fromOutput.boundingBox();
    const inputBox = await toInput.boundingBox();
    
    await page.mouse.move(outputBox.x + outputBox.width / 2, outputBox.y + outputBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(inputBox.x + inputBox.width / 2, inputBox.y + inputBox.height / 2);
    await page.mouse.up();
    
    await page.waitForTimeout(300);
}

async function createTestWorkflow(page) {
    await createWorkflowNode(page, 'start', 100, 200);
    await createWorkflowNode(page, 'action', 300, 200);
    await createWorkflowNode(page, 'condition', 500, 200);
    await createWorkflowNode(page, 'end', 700, 200);
    
    await connectNodes(page, 'start', 'action');
    await connectNodes(page, 'action', 'condition');
    await connectNodes(page, 'condition', 'end');
}
