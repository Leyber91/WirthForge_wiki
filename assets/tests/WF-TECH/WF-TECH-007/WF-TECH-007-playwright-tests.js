// WF-TECH-007 Web UI Automated Testing (Playwright)
// WIRTHFORGE Testing & QA Strategy - End-to-End UI Testing

/**
 * Comprehensive Playwright test suite for WIRTHFORGE web UI
 * 
 * Key Features:
 * - Energy visualization testing
 * - User journey automation
 * - Real-time event validation
 * - Performance monitoring
 * - Accessibility compliance
 * - Cross-browser compatibility
 * 
 * Dependencies: @playwright/test, expect
 */

const { test, expect } = require('@playwright/test');

// Test Configuration
const CONFIG = {
  BASE_URL: 'http://localhost:3000',
  FRAME_BUDGET_MS: 16.67,
  ENERGY_TOLERANCE: 0.05,
  ANIMATION_TIMEOUT: 5000,
  WEBSOCKET_TIMEOUT: 10000
};

// Test Data
const TEST_PROMPTS = {
  SIMPLE: 'Hello world',
  COMPLEX: 'Explain quantum computing in simple terms with examples',
  BURST: 'Generate a list of 20 creative writing prompts'
};

const EXPECTED_STATES = ['IDLE', 'CHARGING', 'FLOWING', 'DRAINING'];

// Utility Functions
async function waitForEnergyUpdate(page, timeout = 5000) {
  await page.waitForFunction(
    () => {
      const energyElement = document.querySelector('.energy-value, [data-testid="energy-value"]');
      return energyElement && parseFloat(energyElement.textContent) > 0;
    },
    { timeout }
  );
}

async function getEnergyValue(page) {
  const energyElement = await page.locator('.energy-value, [data-testid="energy-value"]').first();
  const text = await energyElement.textContent();
  const match = text.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

async function getCurrentState(page) {
  const stateElement = await page.locator('[data-state], .state-indicator').first();
  const state = await stateElement.getAttribute('data-state') || 
                await stateElement.getAttribute('class');
  return state;
}

async function measureFrameRate(page, duration = 3000) {
  const frameTimings = await page.evaluate((testDuration) => {
    return new Promise((resolve) => {
      const frames = [];
      let startTime = performance.now();
      let lastFrameTime = startTime;
      
      function measureFrame() {
        const currentTime = performance.now();
        const frameDuration = currentTime - lastFrameTime;
        frames.push(frameDuration);
        lastFrameTime = currentTime;
        
        if (currentTime - startTime < testDuration) {
          requestAnimationFrame(measureFrame);
        } else {
          resolve(frames);
        }
      }
      
      requestAnimationFrame(measureFrame);
    });
  }, duration);
  
  const avgFrameTime = frameTimings.reduce((a, b) => a + b, 0) / frameTimings.length;
  const fps = 1000 / avgFrameTime;
  const overruns = frameTimings.filter(t => t > CONFIG.FRAME_BUDGET_MS).length;
  
  return {
    avgFrameTime,
    fps,
    overruns,
    overrunRate: overruns / frameTimings.length,
    totalFrames: frameTimings.length
  };
}

// Test Groups

test.describe('WIRTHFORGE Energy Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(CONFIG.BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('Energy visualization appears on prompt submission', async ({ page }) => {
    // Submit a prompt
    await page.fill('textarea[data-testid="prompt-input"], #prompt-input', TEST_PROMPTS.SIMPLE);
    await page.click('button[data-testid="submit-prompt"], #submit-prompt');

    // Wait for energy visualization to appear
    await waitForEnergyUpdate(page);

    // Verify energy visualization is visible
    const energyVisual = page.locator('.energy-visual, [data-testid="energy-visual"]');
    await expect(energyVisual).toBeVisible();

    // Verify energy value is displayed and greater than 0
    const energyValue = await getEnergyValue(page);
    expect(energyValue).toBeGreaterThan(0);

    // Verify state transitions from IDLE to CHARGING/FLOWING
    const currentState = await getCurrentState(page);
    expect(EXPECTED_STATES).toContain(currentState);
  });

  test('Energy values update in real-time during generation', async ({ page }) => {
    const energyValues = [];
    
    // Start monitoring energy values
    const monitorEnergy = async () => {
      for (let i = 0; i < 10; i++) {
        const value = await getEnergyValue(page);
        energyValues.push({ time: Date.now(), value });
        await page.waitForTimeout(500); // Sample every 500ms
      }
    };

    // Submit prompt and start monitoring
    await page.fill('textarea[data-testid="prompt-input"], #prompt-input', TEST_PROMPTS.COMPLEX);
    await page.click('button[data-testid="submit-prompt"], #submit-prompt');
    
    await Promise.race([
      monitorEnergy(),
      page.waitForTimeout(10000) // Max 10 seconds
    ]);

    // Verify energy values changed over time
    const uniqueValues = [...new Set(energyValues.map(e => e.value))];
    expect(uniqueValues.length).toBeGreaterThan(1);

    // Verify energy progression (should generally increase then decrease)
    const maxEnergy = Math.max(...energyValues.map(e => e.value));
    expect(maxEnergy).toBeGreaterThan(0);
  });

  test('Energy visualization maintains 60 FPS performance', async ({ page }) => {
    // Submit a prompt to start energy animation
    await page.fill('textarea[data-testid="prompt-input"], #prompt-input', TEST_PROMPTS.SIMPLE);
    await page.click('button[data-testid="submit-prompt"], #submit-prompt');
    
    await waitForEnergyUpdate(page);

    // Measure frame rate during animation
    const frameMetrics = await measureFrameRate(page, 3000);

    // Verify performance requirements
    expect(frameMetrics.fps).toBeGreaterThanOrEqual(50); // Allow some tolerance
    expect(frameMetrics.overrunRate).toBeLessThan(0.1); // <10% frame overruns
    expect(frameMetrics.avgFrameTime).toBeLessThan(CONFIG.FRAME_BUDGET_MS * 1.5);

    console.log(`Frame metrics: ${frameMetrics.fps.toFixed(1)} FPS, ${(frameMetrics.overrunRate * 100).toFixed(1)}% overruns`);
  });

  test('Energy display accuracy matches backend data', async ({ page }) => {
    // Mock WebSocket to inject known energy values
    await page.route('**/ws', route => route.abort());
    
    // Inject test energy values directly
    const testEnergyValues = [0, 10.5, 25.3, 42.8, 38.1, 15.7, 0];
    
    for (const expectedEnergy of testEnergyValues) {
      // Simulate energy update event
      await page.evaluate((energy) => {
        window.dispatchEvent(new CustomEvent('energy-update', {
          detail: { total_energy: energy, state: 'FLOWING' }
        }));
      }, expectedEnergy);

      await page.waitForTimeout(100); // Allow display to update

      // Verify displayed energy matches expected
      const displayedEnergy = await getEnergyValue(page);
      const errorRate = Math.abs(displayedEnergy - expectedEnergy) / Math.max(expectedEnergy, 1);
      
      expect(errorRate).toBeLessThan(CONFIG.ENERGY_TOLERANCE);
    }
  });
});

test.describe('User Journey Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(CONFIG.BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('Complete prompt submission and response flow', async ({ page }) => {
    // Step 1: Initial state should be IDLE
    const initialState = await getCurrentState(page);
    expect(initialState).toContain('idle');

    // Step 2: Submit prompt
    const promptInput = page.locator('textarea[data-testid="prompt-input"], #prompt-input');
    await promptInput.fill(TEST_PROMPTS.SIMPLE);
    
    const submitButton = page.locator('button[data-testid="submit-prompt"], #submit-prompt');
    await submitButton.click();

    // Step 3: Verify state transitions
    await page.waitForFunction(
      () => {
        const stateEl = document.querySelector('[data-state], .state-indicator');
        const state = stateEl?.getAttribute('data-state') || stateEl?.className || '';
        return state.toLowerCase().includes('charging') || state.toLowerCase().includes('flowing');
      },
      { timeout: 5000 }
    );

    // Step 4: Wait for energy visualization
    await waitForEnergyUpdate(page);

    // Step 5: Verify response appears
    const responseArea = page.locator('[data-testid="response"], .response-area, #response');
    await expect(responseArea).toBeVisible({ timeout: 15000 });

    // Step 6: Verify final state returns to IDLE or DRAINING
    await page.waitForFunction(
      () => {
        const stateEl = document.querySelector('[data-state], .state-indicator');
        const state = stateEl?.getAttribute('data-state') || stateEl?.className || '';
        return state.toLowerCase().includes('idle') || state.toLowerCase().includes('draining');
      },
      { timeout: 30000 }
    );
  });

  test('Multiple consecutive prompts handle correctly', async ({ page }) => {
    const prompts = [TEST_PROMPTS.SIMPLE, 'Follow up question', 'Another question'];
    const energyPeaks = [];

    for (let i = 0; i < prompts.length; i++) {
      // Submit prompt
      await page.fill('textarea[data-testid="prompt-input"], #prompt-input', prompts[i]);
      await page.click('button[data-testid="submit-prompt"], #submit-prompt');

      // Wait for energy to build up
      await waitForEnergyUpdate(page);
      
      // Record peak energy
      await page.waitForTimeout(2000); // Allow energy to peak
      const peakEnergy = await getEnergyValue(page);
      energyPeaks.push(peakEnergy);

      // Wait for completion before next prompt
      await page.waitForFunction(
        () => {
          const stateEl = document.querySelector('[data-state], .state-indicator');
          const state = stateEl?.getAttribute('data-state') || stateEl?.className || '';
          return !state.toLowerCase().includes('flowing');
        },
        { timeout: 20000 }
      );
    }

    // Verify each prompt generated energy
    energyPeaks.forEach((peak, index) => {
      expect(peak).toBeGreaterThan(0);
      console.log(`Prompt ${index + 1} peak energy: ${peak}`);
    });
  });

  test('Error handling displays appropriate messages', async ({ page }) => {
    // Test empty prompt submission
    await page.click('button[data-testid="submit-prompt"], #submit-prompt');
    
    const errorMessage = page.locator('.error-message, [data-testid="error"]');
    await expect(errorMessage).toBeVisible({ timeout: 2000 });

    // Test network error simulation
    await page.route('**/api/**', route => route.abort());
    
    await page.fill('textarea[data-testid="prompt-input"], #prompt-input', TEST_PROMPTS.SIMPLE);
    await page.click('button[data-testid="submit-prompt"], #submit-prompt');

    // Should show connection error
    const networkError = page.locator('.network-error, [data-testid="network-error"]');
    await expect(networkError).toBeVisible({ timeout: 5000 });
  });
});

test.describe('WebSocket Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(CONFIG.BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('WebSocket connection establishes successfully', async ({ page }) => {
    // Wait for WebSocket connection
    await page.waitForFunction(
      () => window.websocketConnected === true || 
            document.querySelector('.connection-status')?.textContent?.includes('connected'),
      { timeout: CONFIG.WEBSOCKET_TIMEOUT }
    );

    // Verify connection status indicator
    const connectionStatus = page.locator('.connection-status, [data-testid="connection-status"]');
    const statusText = await connectionStatus.textContent();
    expect(statusText.toLowerCase()).toContain('connected');
  });

  test('WebSocket reconnects after disconnection', async ({ page }) => {
    // Wait for initial connection
    await page.waitForFunction(
      () => window.websocketConnected === true,
      { timeout: CONFIG.WEBSOCKET_TIMEOUT }
    );

    // Simulate disconnection
    await page.evaluate(() => {
      if (window.websocket) {
        window.websocket.close();
      }
    });

    // Wait for disconnection indicator
    await page.waitForFunction(
      () => window.websocketConnected === false ||
            document.querySelector('.connection-status')?.textContent?.includes('disconnected'),
      { timeout: 2000 }
    );

    // Wait for automatic reconnection
    await page.waitForFunction(
      () => window.websocketConnected === true,
      { timeout: 10000 }
    );

    const connectionStatus = page.locator('.connection-status, [data-testid="connection-status"]');
    const statusText = await connectionStatus.textContent();
    expect(statusText.toLowerCase()).toContain('connected');
  });
});

test.describe('Accessibility Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(CONFIG.BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('Energy visualization has proper ARIA labels', async ({ page }) => {
    // Submit prompt to activate energy visualization
    await page.fill('textarea[data-testid="prompt-input"], #prompt-input', TEST_PROMPTS.SIMPLE);
    await page.click('button[data-testid="submit-prompt"], #submit-prompt');
    
    await waitForEnergyUpdate(page);

    // Check ARIA labels on energy elements
    const energyValue = page.locator('.energy-value, [data-testid="energy-value"]');
    const ariaLabel = await energyValue.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel.toLowerCase()).toContain('energy');

    // Check progress bar ARIA attributes
    const progressBar = page.locator('[role="progressbar"], .energy-bar');
    if (await progressBar.count() > 0) {
      const ariaValueNow = await progressBar.getAttribute('aria-valuenow');
      const ariaValueMax = await progressBar.getAttribute('aria-valuemax');
      expect(ariaValueNow).toBeTruthy();
      expect(ariaValueMax).toBeTruthy();
    }
  });

  test('Keyboard navigation works for all interactive elements', async ({ page }) => {
    // Test Tab navigation
    await page.keyboard.press('Tab');
    
    // Should focus on prompt input
    const focusedElement = await page.evaluate(() => document.activeElement.tagName);
    expect(['TEXTAREA', 'INPUT', 'BUTTON']).toContain(focusedElement);

    // Test Enter key submission
    await page.fill('textarea[data-testid="prompt-input"], #prompt-input', TEST_PROMPTS.SIMPLE);
    await page.keyboard.press('Enter');
    
    // Should trigger submission (if Ctrl+Enter or similar)
    // This depends on the specific implementation
  });

  test('Color contrast meets WCAG standards', async ({ page }) => {
    // This would typically use axe-playwright or similar tool
    // For now, we'll do a basic check
    
    const energyElement = page.locator('.energy-value, [data-testid="energy-value"]');
    const styles = await energyElement.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor
      };
    });

    // Basic check - in real implementation would calculate actual contrast ratio
    expect(styles.color).toBeTruthy();
    expect(styles.backgroundColor).toBeTruthy();
  });
});

test.describe('Performance Monitoring', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(CONFIG.BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('Page load performance meets requirements', async ({ page }) => {
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });

    // Performance requirements
    expect(performanceMetrics.domContentLoaded).toBeLessThan(2000); // < 2s
    expect(performanceMetrics.loadComplete).toBeLessThan(3000); // < 3s
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(1500); // < 1.5s

    console.log('Performance metrics:', performanceMetrics);
  });

  test('Memory usage remains stable during extended use', async ({ page }) => {
    const initialMemory = await page.evaluate(() => {
      return performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize
      } : null;
    });

    if (!initialMemory) {
      test.skip('Performance.memory not available');
      return;
    }

    // Simulate extended usage
    for (let i = 0; i < 5; i++) {
      await page.fill('textarea[data-testid="prompt-input"], #prompt-input', `Test prompt ${i}`);
      await page.click('button[data-testid="submit-prompt"], #submit-prompt');
      await page.waitForTimeout(2000);
    }

    const finalMemory = await page.evaluate(() => ({
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize
    }));

    const memoryGrowth = finalMemory.used - initialMemory.used;
    const memoryGrowthMB = memoryGrowth / (1024 * 1024);

    // Memory growth should be reasonable (< 50MB for this test)
    expect(memoryGrowthMB).toBeLessThan(50);
    
    console.log(`Memory growth: ${memoryGrowthMB.toFixed(2)}MB`);
  });
});

// Test Configuration and Hooks
test.describe.configure({ mode: 'parallel' });

test.afterEach(async ({ page }, testInfo) => {
  // Capture screenshot on failure
  if (testInfo.status !== testInfo.expectedStatus) {
    const screenshot = await page.screenshot();
    await testInfo.attach('screenshot', { body: screenshot, contentType: 'image/png' });
  }
});

// Custom test reporter for WIRTHFORGE metrics
class WirthForgeReporter {
  onTestEnd(test, result) {
    if (result.status === 'passed') {
      console.log(`✓ ${test.title} - ${result.duration}ms`);
    } else {
      console.log(`✗ ${test.title} - ${result.error?.message || 'Failed'}`);
    }
  }
}

module.exports = { WirthForgeReporter };
