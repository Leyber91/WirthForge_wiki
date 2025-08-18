/**
 * WF-UX-001 Performance Test Suite
 * WIRTHFORGE UI Design System - Performance & Frame Budget Testing
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { LightningBoltVisual } from '../WF-UX-001-lightning-bolt-visual';
import { EnergyStreamVisual } from '../WF-UX-001-energy-stream-visual';
import { InterferenceOverlay } from '../WF-UX-001-interference-overlay';
import { MetricsPanel } from '../WF-UX-001-metrics-panel';

// Performance monitoring utilities
class PerformanceTracker {
  private frameTimings: number[] = [];
  private memoryUsage: number[] = [];
  private renderCount = 0;

  trackFrame(duration: number): void {
    this.frameTimings.push(duration);
    this.renderCount++;
  }

  trackMemory(): void {
    if (performance.memory) {
      this.memoryUsage.push(performance.memory.usedJSHeapSize);
    }
  }

  getAverageFrameTime(): number {
    return this.frameTimings.reduce((sum, time) => sum + time, 0) / this.frameTimings.length;
  }

  getFrameRate(): number {
    const avgFrameTime = this.getAverageFrameTime();
    return avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
  }

  getMemoryDelta(): number {
    if (this.memoryUsage.length < 2) return 0;
    return this.memoryUsage[this.memoryUsage.length - 1] - this.memoryUsage[0];
  }

  getRenderCount(): number {
    return this.renderCount;
  }

  reset(): void {
    this.frameTimings = [];
    this.memoryUsage = [];
    this.renderCount = 0;
  }
}

// Mock Three.js with performance tracking
const mockRenderer = {
  setSize: jest.fn(),
  setPixelRatio: jest.fn(),
  render: jest.fn(),
  dispose: jest.fn()
};

jest.mock('three', () => ({
  Scene: jest.fn(() => ({ add: jest.fn(), remove: jest.fn(), children: [] })),
  WebGLRenderer: jest.fn(() => mockRenderer),
  Vector3: jest.fn((x = 0, y = 0, z = 0) => ({ x, y, z, add: jest.fn(), clone: jest.fn(() => ({ multiplyScalar: jest.fn() })) })),
  BufferGeometry: jest.fn(() => ({ setAttribute: jest.fn() })),
  BufferAttribute: jest.fn(),
  PointsMaterial: jest.fn(),
  Points: jest.fn(),
  Color: jest.fn(() => ({ r: 1, g: 1, b: 1 })),
  OrthographicCamera: jest.fn(),
  AdditiveBlending: 'additive'
}));

// Mock performance monitoring
const performanceTracker = new PerformanceTracker();
const mockTrackFrameTime = jest.fn((duration: number) => performanceTracker.trackFrame(duration));
const mockReportPerformance = jest.fn();

jest.mock('../hooks/useDesignTokens', () => ({
  useDesignTokens: () => ({
    colorPalettes: {
      lightning: { primary: '#fbbf24', secondary: '#f59e0b' },
      energyStream: { primary: '#60a5fa', secondary: '#3b82f6' },
      interference: { constructive: '#a855f7', destructive: '#ef4444', neutral: '#6b7280', harmonic: '#10b981' },
      system: { background: '#0f172a', surface: '#1e293b', text: '#f8fafc', textSecondary: '#cbd5e1', border: '#334155' }
    },
    typography: {
      fontSize: { sm: '0.875rem', xl: '1.25rem' },
      fontWeight: { bold: 700 },
      fontFamily: { sans: 'ui-sans-serif', monospace: 'ui-monospace' }
    },
    spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem' }
  })
}));

jest.mock('../hooks/useAccessibility', () => ({
  useAccessibility: () => ({
    announceToScreenReader: jest.fn(),
    respectsReducedMotion: jest.fn(() => false)
  })
}));

jest.mock('../hooks/usePerformanceMonitor', () => ({
  usePerformanceMonitor: () => ({
    trackFrameTime: mockTrackFrameTime,
    reportPerformance: mockReportPerformance
  })
}));

// High-precision timing mock
let mockTime = 0;
const originalPerformanceNow = performance.now;
const mockPerformanceNow = jest.fn(() => {
  mockTime += 16.67; // Simulate 60fps
  return mockTime;
});

global.requestAnimationFrame = jest.fn((callback) => {
  setTimeout(() => callback(mockPerformanceNow()), 16);
  return 1;
});

global.cancelAnimationFrame = jest.fn();

describe('Performance Requirements', () => {
  const FRAME_BUDGET_MS = 16.67; // 60fps target
  const MAX_MEMORY_INCREASE_MB = 50;
  const MAX_RENDER_CALLS_PER_SECOND = 60;

  beforeEach(() => {
    jest.clearAllMocks();
    performanceTracker.reset();
    mockTime = 0;
    performance.now = mockPerformanceNow;
  });

  afterEach(() => {
    performance.now = originalPerformanceNow;
  });

  describe('Frame Rate Performance', () => {
    test('LightningBoltVisual maintains 60fps under normal load', async () => {
      const props = {
        tokenSpeed: 50,
        energyLevel: 75,
        boltColor: '#fbbf24',
        intensity: 80
      };

      render(<LightningBoltVisual {...props} />);

      // Simulate animation frames
      await act(async () => {
        for (let i = 0; i < 60; i++) {
          await new Promise(resolve => setTimeout(resolve, 16));
        }
      });

      const averageFrameTime = performanceTracker.getAverageFrameTime();
      expect(averageFrameTime).toBeLessThanOrEqual(FRAME_BUDGET_MS);
      expect(performanceTracker.getFrameRate()).toBeGreaterThanOrEqual(55); // Allow 5fps tolerance
    });

    test('EnergyStreamVisual respects particle count limits', async () => {
      const props = {
        flowRate: 100,
        particleCount: 1000, // High particle count
        streamColor: '#60a5fa',
        performance: { maxParticles: 200 } // Should be limited
      };

      render(<EnergyStreamVisual {...props} />);

      await act(async () => {
        for (let i = 0; i < 30; i++) {
          await new Promise(resolve => setTimeout(resolve, 16));
        }
      });

      // Should maintain performance despite high particle request
      const averageFrameTime = performanceTracker.getAverageFrameTime();
      expect(averageFrameTime).toBeLessThanOrEqual(FRAME_BUDGET_MS * 1.2); // 20% tolerance
    });

    test('InterferenceOverlay adapts resolution for performance', async () => {
      const props = {
        modelA: { position: { x: 200, y: 200 }, frequency: 2, amplitude: 50, phase: 0 },
        modelB: { position: { x: 600, y: 400 }, frequency: 2.5, amplitude: 60, phase: Math.PI / 2 },
        interferenceType: 'mixed' as const,
        resolution: 100, // High resolution
        performance: { maxNodes: 1000 } // Should be limited
      };

      render(<InterferenceOverlay {...props} />);

      await act(async () => {
        for (let i = 0; i < 30; i++) {
          await new Promise(resolve => setTimeout(resolve, 16));
        }
      });

      const averageFrameTime = performanceTracker.getAverageFrameTime();
      expect(averageFrameTime).toBeLessThanOrEqual(FRAME_BUDGET_MS * 1.5); // Allow higher tolerance for complex calculations
    });
  });

  describe('Memory Usage', () => {
    test('components do not cause memory leaks', async () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      
      const { unmount } = render(
        <div>
          <LightningBoltVisual tokenSpeed={50} energyLevel={75} boltColor="#fbbf24" intensity={80} />
          <EnergyStreamVisual flowRate={60} particleCount={100} streamColor="#60a5fa" />
        </div>
      );

      // Run for a while to detect leaks
      await act(async () => {
        for (let i = 0; i < 100; i++) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      });

      const peakMemory = performance.memory?.usedJSHeapSize || 0;
      
      unmount();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = (finalMemory - initialMemory) / (1024 * 1024); // Convert to MB
      
      expect(memoryIncrease).toBeLessThan(MAX_MEMORY_INCREASE_MB);
    });

    test('particle systems clean up properly', async () => {
      const { unmount } = render(
        <EnergyStreamVisual 
          flowRate={100} 
          particleCount={500} 
          streamColor="#60a5fa" 
        />
      );

      await act(async () => {
        for (let i = 0; i < 50; i++) {
          await new Promise(resolve => setTimeout(resolve, 16));
        }
      });

      unmount();

      // Verify cleanup was called
      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('Render Call Optimization', () => {
    test('components batch render calls efficiently', async () => {
      render(
        <div>
          <LightningBoltVisual tokenSpeed={50} energyLevel={75} boltColor="#fbbf24" intensity={80} />
          <EnergyStreamVisual flowRate={60} particleCount={100} streamColor="#60a5fa" />
          <InterferenceOverlay 
            modelA={{ position: { x: 200, y: 200 }, frequency: 1, amplitude: 50, phase: 0 }}
            modelB={{ position: { x: 600, y: 400 }, frequency: 1.2, amplitude: 60, phase: Math.PI / 2 }}
            interferenceType="constructive"
          />
        </div>
      );

      await act(async () => {
        for (let i = 0; i < 60; i++) { // 1 second at 60fps
          await new Promise(resolve => setTimeout(resolve, 16));
        }
      });

      const renderCount = performanceTracker.getRenderCount();
      const renderRate = renderCount / 1; // renders per second
      
      expect(renderRate).toBeLessThanOrEqual(MAX_RENDER_CALLS_PER_SECOND * 3); // 3 components
    });

    test('reduced motion mode decreases render frequency', async () => {
      const mockUseAccessibility = require('../hooks/useAccessibility').useAccessibility;
      mockUseAccessibility.mockReturnValue({
        announceToScreenReader: jest.fn(),
        respectsReducedMotion: jest.fn(() => true)
      });

      render(<LightningBoltVisual tokenSpeed={50} energyLevel={75} boltColor="#fbbf24" intensity={80} />);

      await act(async () => {
        for (let i = 0; i < 60; i++) {
          await new Promise(resolve => setTimeout(resolve, 16));
        }
      });

      const renderCount = performanceTracker.getRenderCount();
      expect(renderCount).toBeLessThan(10); // Should render much less in reduced motion
    });
  });

  describe('GPU Acceleration', () => {
    test('WebGL renderer is configured for performance', () => {
      render(<LightningBoltVisual tokenSpeed={50} energyLevel={75} boltColor="#fbbf24" intensity={80} />);
      
      // Verify WebGL renderer configuration
      expect(mockRenderer.setPixelRatio).toHaveBeenCalledWith(expect.any(Number));
      expect(mockRenderer.setSize).toHaveBeenCalledWith(800, 600);
    });

    test('components disable GPU features when performance is limited', () => {
      const performanceProps = {
        performance: { gpuAccelerated: false }
      };

      render(
        <EnergyStreamVisual 
          flowRate={60} 
          particleCount={100} 
          streamColor="#60a5fa"
          {...performanceProps}
        />
      );

      // Should still render but with reduced quality
      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Performance Monitoring Integration', () => {
    test('components report performance metrics', async () => {
      render(<LightningBoltVisual tokenSpeed={50} energyLevel={75} boltColor="#fbbf24" intensity={80} />);

      await act(async () => {
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 16));
        }
      });

      expect(mockReportPerformance).toHaveBeenCalledWith('lightning-bolt', expect.any(Number));
      expect(mockTrackFrameTime).toHaveBeenCalled();
    });

    test('performance degradation triggers warnings', async () => {
      // Simulate slow frames
      mockTrackFrameTime.mockImplementation((duration) => {
        performanceTracker.trackFrame(duration > 30 ? duration : 30); // Force slow frames
      });

      render(<EnergyStreamVisual flowRate={60} particleCount={100} streamColor="#60a5fa" />);

      await act(async () => {
        for (let i = 0; i < 20; i++) {
          await new Promise(resolve => setTimeout(resolve, 35)); // Slow frames
        }
      });

      const averageFrameTime = performanceTracker.getAverageFrameTime();
      expect(averageFrameTime).toBeGreaterThan(FRAME_BUDGET_MS);
      expect(mockReportPerformance).toHaveBeenCalled();
    });
  });

  describe('Stress Testing', () => {
    test('multiple components handle high load', async () => {
      const StressTestApp = () => (
        <div>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i}>
              <LightningBoltVisual tokenSpeed={100} energyLevel={90} boltColor="#fbbf24" intensity={100} />
              <EnergyStreamVisual flowRate={120} particleCount={200} streamColor="#60a5fa" />
            </div>
          ))}
        </div>
      );

      render(<StressTestApp />);

      await act(async () => {
        for (let i = 0; i < 30; i++) {
          await new Promise(resolve => setTimeout(resolve, 16));
        }
      });

      // Should maintain reasonable performance even under stress
      const averageFrameTime = performanceTracker.getAverageFrameTime();
      expect(averageFrameTime).toBeLessThan(50); // Allow degradation but not complete failure
    });

    test('rapid prop changes maintain stability', async () => {
      let tokenSpeed = 50;
      const { rerender } = render(
        <LightningBoltVisual tokenSpeed={tokenSpeed} energyLevel={75} boltColor="#fbbf24" intensity={80} />
      );

      // Rapidly change props
      for (let i = 0; i < 20; i++) {
        tokenSpeed = 50 + (i * 10);
        rerender(
          <LightningBoltVisual tokenSpeed={tokenSpeed} energyLevel={75} boltColor="#fbbf24" intensity={80} />
        );
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 16));
        });
      }

      const averageFrameTime = performanceTracker.getAverageFrameTime();
      expect(averageFrameTime).toBeLessThan(25); // Should handle rapid changes
    });
  });

  describe('Resource Cleanup', () => {
    test('Three.js resources are properly disposed', () => {
      const { unmount } = render(
        <LightningBoltVisual tokenSpeed={50} energyLevel={75} boltColor="#fbbf24" intensity={80} />
      );

      unmount();

      expect(mockRenderer.dispose).toHaveBeenCalled();
      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });

    test('event listeners are cleaned up', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = render(
        <EnergyStreamVisual flowRate={60} particleCount={100} streamColor="#60a5fa" />
      );

      unmount();

      // Should clean up any window event listeners
      if (addEventListenerSpy.mock.calls.length > 0) {
        expect(removeEventListenerSpy).toHaveBeenCalled();
      }

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });
});
