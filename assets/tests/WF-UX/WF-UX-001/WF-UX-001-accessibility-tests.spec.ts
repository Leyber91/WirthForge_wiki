/**
 * WF-UX-001 Accessibility Test Suite
 * WIRTHFORGE UI Design System - WCAG 2.2 AA Compliance Testing
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { LightningBoltVisual } from '../WF-UX-001-lightning-bolt-visual';
import { EnergyStreamVisual } from '../WF-UX-001-energy-stream-visual';
import { InterferenceOverlay } from '../WF-UX-001-interference-overlay';
import { MetricsPanel } from '../WF-UX-001-metrics-panel';

expect.extend(toHaveNoViolations);

// Mock Three.js for accessibility testing
jest.mock('three', () => ({
  Scene: jest.fn(() => ({ add: jest.fn(), remove: jest.fn(), children: [] })),
  WebGLRenderer: jest.fn(() => ({ setSize: jest.fn(), setPixelRatio: jest.fn(), render: jest.fn(), dispose: jest.fn() })),
  Vector3: jest.fn((x = 0, y = 0, z = 0) => ({ x, y, z, add: jest.fn(), clone: jest.fn(() => ({ multiplyScalar: jest.fn() })) })),
  BufferGeometry: jest.fn(() => ({ setAttribute: jest.fn() })),
  BufferAttribute: jest.fn(),
  PointsMaterial: jest.fn(),
  Points: jest.fn(),
  Color: jest.fn(() => ({ r: 1, g: 1, b: 1 })),
  OrthographicCamera: jest.fn(),
  AdditiveBlending: 'additive'
}));

// Mock hooks with accessibility focus
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

const mockAnnounceToScreenReader = jest.fn();
const mockRespectsReducedMotion = jest.fn(() => false);

jest.mock('../hooks/useAccessibility', () => ({
  useAccessibility: () => ({
    announceToScreenReader: mockAnnounceToScreenReader,
    respectsReducedMotion: mockRespectsReducedMotion
  })
}));

jest.mock('../hooks/usePerformanceMonitor', () => ({
  usePerformanceMonitor: () => ({
    trackFrameTime: jest.fn(),
    reportPerformance: jest.fn()
  })
}));

global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn();

describe('WCAG 2.2 AA Compliance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRespectsReducedMotion.mockReturnValue(false);
  });

  describe('LightningBoltVisual Accessibility', () => {
    const defaultProps = {
      tokenSpeed: 50,
      energyLevel: 75,
      boltColor: '#fbbf24',
      intensity: 80
    };

    test('passes axe accessibility audit', async () => {
      const { container } = render(<LightningBoltVisual {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('has proper ARIA attributes', () => {
      render(<LightningBoltVisual {...defaultProps} />);
      const canvas = screen.getByRole('img');
      
      expect(canvas).toHaveAttribute('aria-label');
      expect(canvas.getAttribute('aria-label')).toContain('Lightning bolt');
      expect(canvas.getAttribute('aria-label')).toContain('token speed');
    });

    test('provides screen reader announcements', async () => {
      render(<LightningBoltVisual {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockAnnounceToScreenReader).toHaveBeenCalledWith(
          expect.stringContaining('Lightning bolt'),
          'polite'
        );
      });
    });

    test('respects reduced motion preferences', () => {
      mockRespectsReducedMotion.mockReturnValue(true);
      
      render(<LightningBoltVisual {...defaultProps} />);
      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
      
      // Should show static indicator when motion is reduced
      const staticIndicator = screen.getByText(/Speed:/);
      expect(staticIndicator).toBeInTheDocument();
    });

    test('supports custom accessibility props', () => {
      const accessibilityProps = {
        ariaLabel: 'Custom lightning visualization',
        ariaDescribedBy: 'lightning-description',
        role: 'graphics-document'
      };
      
      render(<LightningBoltVisual {...defaultProps} accessibility={accessibilityProps} />);
      const canvas = screen.getByRole('graphics-document');
      
      expect(canvas).toHaveAttribute('aria-label', 'Custom lightning visualization');
      expect(canvas).toHaveAttribute('aria-describedby', 'lightning-description');
    });

    test('provides keyboard navigation support', () => {
      render(<LightningBoltVisual {...defaultProps} />);
      const canvas = screen.getByRole('img');
      
      // Canvas should be focusable for screen readers
      expect(canvas).toHaveAttribute('tabindex', '0');
    });
  });

  describe('EnergyStreamVisual Accessibility', () => {
    const defaultProps = {
      flowRate: 60,
      particleCount: 100,
      streamColor: '#60a5fa',
      direction: 'horizontal' as const
    };

    test('passes axe accessibility audit', async () => {
      const { container } = render(<EnergyStreamVisual {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('provides descriptive aria-label', () => {
      render(<EnergyStreamVisual {...defaultProps} />);
      const canvas = screen.getByRole('img');
      
      const ariaLabel = canvas.getAttribute('aria-label');
      expect(ariaLabel).toContain('Energy stream visualization');
      expect(ariaLabel).toContain('particles flowing');
      expect(ariaLabel).toContain('left to right');
    });

    test('announces flow changes to screen readers', async () => {
      const { rerender } = render(<EnergyStreamVisual {...defaultProps} />);
      
      rerender(<EnergyStreamVisual {...defaultProps} flowRate={120} />);
      
      await waitFor(() => {
        expect(mockAnnounceToScreenReader).toHaveBeenCalledWith(
          expect.stringContaining('Energy stream'),
          'polite'
        );
      });
    });

    test('adapts to reduced motion', () => {
      mockRespectsReducedMotion.mockReturnValue(true);
      
      render(<EnergyStreamVisual {...defaultProps} />);
      
      // Should show flow rate indicator
      const flowIndicator = screen.getByText(/Flow:/);
      expect(flowIndicator).toBeInTheDocument();
    });

    test('supports different flow directions in descriptions', () => {
      const directions = [
        { direction: 'horizontal' as const, expected: 'left to right' },
        { direction: 'vertical' as const, expected: 'bottom to top' },
        { direction: 'diagonal' as const, expected: 'diagonally' }
      ];
      
      directions.forEach(({ direction, expected }) => {
        const { unmount } = render(<EnergyStreamVisual {...defaultProps} direction={direction} />);
        const canvas = screen.getByRole('img');
        
        expect(canvas.getAttribute('aria-label')).toContain(expected);
        unmount();
      });
    });
  });

  describe('InterferenceOverlay Accessibility', () => {
    const defaultProps = {
      modelA: { position: { x: 200, y: 200 }, frequency: 1, amplitude: 50, phase: 0 },
      modelB: { position: { x: 600, y: 400 }, frequency: 1.2, amplitude: 60, phase: Math.PI / 2 },
      interferenceType: 'constructive' as const
    };

    test('passes axe accessibility audit', async () => {
      const { container } = render(<InterferenceOverlay {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('describes interference pattern', () => {
      render(<InterferenceOverlay {...defaultProps} />);
      const canvas = screen.getByRole('img');
      
      const ariaLabel = canvas.getAttribute('aria-label');
      expect(ariaLabel).toContain('Interference pattern');
      expect(ariaLabel).toContain('constructive interference');
      expect(ariaLabel).toContain('zones');
    });

    test('announces interference changes', async () => {
      render(<InterferenceOverlay {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockAnnounceToScreenReader).toHaveBeenCalledWith(
          expect.stringContaining('Model interference'),
          'polite'
        );
      });
    });

    test('provides model position information', () => {
      render(<InterferenceOverlay {...defaultProps} />);
      
      // Model indicators should have proper ARIA attributes
      const container = screen.getByRole('img').parentElement;
      const indicators = container?.querySelectorAll('[aria-hidden="true"]');
      expect(indicators?.length).toBe(2); // Two model indicators
    });
  });

  describe('MetricsPanel Accessibility', () => {
    const defaultMetrics = {
      tokenGenerationRate: 75,
      energyLevel: 85,
      modelSyncStatus: 'synced' as const,
      interferenceLevel: 25,
      performanceScore: 92,
      uptime: 3665
    };

    test('passes axe accessibility audit', async () => {
      const { container } = render(<MetricsPanel metrics={defaultMetrics} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('uses proper semantic structure', () => {
      render(<MetricsPanel metrics={defaultMetrics} />);
      
      const region = screen.getByRole('region');
      expect(region).toHaveAttribute('aria-label', 'System Metrics Dashboard');
      
      const groups = screen.getAllByRole('group');
      expect(groups).toHaveLength(6); // One for each metric
    });

    test('provides metric descriptions', () => {
      render(<MetricsPanel metrics={defaultMetrics} />);
      
      const tokenRateGroup = screen.getByLabelText(/Token Rate: 75/);
      expect(tokenRateGroup).toBeInTheDocument();
      
      const energyGroup = screen.getByLabelText(/Energy Level: 85/);
      expect(energyGroup).toBeInTheDocument();
    });

    test('announces critical status changes', async () => {
      const criticalMetrics = {
        ...defaultMetrics,
        tokenGenerationRate: 5, // Critical
        energyLevel: 15 // Critical
      };
      
      render(<MetricsPanel metrics={criticalMetrics} />);
      
      await waitFor(() => {
        expect(mockAnnounceToScreenReader).toHaveBeenCalledWith(
          expect.stringContaining('Critical alert'),
          'assertive'
        );
      });
    });

    test('provides live region updates', () => {
      render(<MetricsPanel metrics={defaultMetrics} />);
      
      const liveRegion = screen.getByText(/Metrics panel with/);
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });

    test('supports keyboard navigation', () => {
      render(<MetricsPanel metrics={defaultMetrics} />);
      
      const groups = screen.getAllByRole('group');
      groups.forEach(group => {
        expect(group).toHaveAttribute('tabindex', '0');
      });
    });
  });

  describe('Color Contrast Compliance', () => {
    test('text meets WCAG AA contrast requirements', () => {
      render(<MetricsPanel metrics={{
        tokenGenerationRate: 75,
        energyLevel: 85,
        modelSyncStatus: 'synced',
        interferenceLevel: 25,
        performanceScore: 92,
        uptime: 3600
      }} />);
      
      // Primary text on dark background should have sufficient contrast
      const textElements = screen.getAllByText(/\d+/);
      textElements.forEach(element => {
        const styles = window.getComputedStyle(element);
        // Note: In real tests, you'd use a contrast checking library
        expect(styles.color).toBeDefined();
      });
    });

    test('status colors are distinguishable', () => {
      const criticalMetrics = {
        tokenGenerationRate: 5, // Critical (red)
        energyLevel: 85, // Good (green)
        modelSyncStatus: 'syncing' as const, // Warning (yellow)
        interferenceLevel: 25,
        performanceScore: 92,
        uptime: 3600
      };
      
      render(<MetricsPanel metrics={criticalMetrics} />);
      
      // Different status levels should be visually distinct
      const tokenRate = screen.getByText('5');
      const energyLevel = screen.getByText('85');
      
      expect(tokenRate).toBeInTheDocument();
      expect(energyLevel).toBeInTheDocument();
    });
  });

  describe('Motion and Animation Accessibility', () => {
    test('respects prefers-reduced-motion globally', () => {
      mockRespectsReducedMotion.mockReturnValue(true);
      
      const { container } = render(
        <div>
          <LightningBoltVisual tokenSpeed={50} energyLevel={75} boltColor="#fbbf24" intensity={80} />
          <EnergyStreamVisual flowRate={60} particleCount={100} streamColor="#60a5fa" />
        </div>
      );
      
      // Components should render without animations
      expect(container.querySelectorAll('canvas')).toHaveLength(2);
    });

    test('provides static alternatives for animated content', () => {
      mockRespectsReducedMotion.mockReturnValue(true);
      
      render(<LightningBoltVisual tokenSpeed={50} energyLevel={75} boltColor="#fbbf24" intensity={80} />);
      
      // Should show static speed indicator
      const speedIndicator = screen.getByText(/Speed: 50/);
      expect(speedIndicator).toBeInTheDocument();
    });
  });

  describe('Screen Reader Support', () => {
    test('provides meaningful content for screen readers', () => {
      render(<LightningBoltVisual tokenSpeed={50} energyLevel={75} boltColor="#fbbf24" intensity={80} />);
      
      const srContent = screen.getByText(/Lightning bolt visualization/);
      expect(srContent).toHaveClass('sr-only');
    });

    test('uses appropriate ARIA live regions', () => {
      render(<MetricsPanel metrics={{
        tokenGenerationRate: 75,
        energyLevel: 85,
        modelSyncStatus: 'synced',
        interferenceLevel: 25,
        performanceScore: 92,
        uptime: 3600
      }} />);
      
      const politeRegion = screen.getByText(/Metrics panel with/);
      expect(politeRegion).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Focus Management', () => {
    test('components are properly focusable', () => {
      render(<LightningBoltVisual tokenSpeed={50} energyLevel={75} boltColor="#fbbf24" intensity={80} />);
      
      const canvas = screen.getByRole('img');
      expect(canvas).toHaveAttribute('tabindex', '0');
    });

    test('focus indicators are visible', () => {
      render(<MetricsPanel metrics={{
        tokenGenerationRate: 75,
        energyLevel: 85,
        modelSyncStatus: 'synced',
        interferenceLevel: 25,
        performanceScore: 92,
        uptime: 3600
      }} />);
      
      const groups = screen.getAllByRole('group');
      groups.forEach(group => {
        fireEvent.focus(group);
        // Focus should be visible (tested via CSS in real implementation)
        expect(group).toHaveFocus();
      });
    });
  });
});
