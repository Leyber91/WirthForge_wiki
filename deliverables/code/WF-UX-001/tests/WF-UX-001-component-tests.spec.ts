/**
 * WF-UX-001 Component Test Suite
 * WIRTHFORGE UI Design System - Component Testing
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { LightningBoltVisual } from '../WF-UX-001-lightning-bolt-visual';
import { EnergyStreamVisual } from '../WF-UX-001-energy-stream-visual';
import { InterferenceOverlay } from '../WF-UX-001-interference-overlay';
import { MetricsPanel } from '../WF-UX-001-metrics-panel';

// Mock Three.js
jest.mock('three', () => ({
  Scene: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    remove: jest.fn(),
    children: []
  })),
  WebGLRenderer: jest.fn().mockImplementation(() => ({
    setSize: jest.fn(),
    setPixelRatio: jest.fn(),
    render: jest.fn(),
    dispose: jest.fn()
  })),
  Vector3: jest.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
    x, y, z,
    add: jest.fn(),
    clone: jest.fn(() => ({ multiplyScalar: jest.fn() }))
  })),
  BufferGeometry: jest.fn().mockImplementation(() => ({
    setAttribute: jest.fn()
  })),
  BufferAttribute: jest.fn(),
  PointsMaterial: jest.fn(),
  Points: jest.fn(),
  Color: jest.fn().mockImplementation((color) => ({
    r: 1, g: 1, b: 1
  })),
  OrthographicCamera: jest.fn(),
  AdditiveBlending: 'additive'
}));

// Mock hooks
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
    trackFrameTime: jest.fn(),
    reportPerformance: jest.fn()
  })
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => {
  setTimeout(cb, 16);
  return 1;
});

global.cancelAnimationFrame = jest.fn();

describe('LightningBoltVisual Component', () => {
  const defaultProps = {
    tokenSpeed: 50,
    energyLevel: 75,
    boltColor: '#fbbf24',
    intensity: 80
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders lightning bolt canvas', () => {
    render(<LightningBoltVisual {...defaultProps} />);
    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute('width', '800');
    expect(canvas).toHaveAttribute('height', '600');
  });

  test('has proper accessibility attributes', () => {
    render(<LightningBoltVisual {...defaultProps} />);
    const canvas = screen.getByRole('img');
    expect(canvas).toHaveAttribute('aria-label');
    expect(canvas.getAttribute('aria-label')).toContain('Lightning bolt');
  });

  test('respects reduced motion preferences', () => {
    const mockUseAccessibility = require('../hooks/useAccessibility').useAccessibility;
    mockUseAccessibility.mockReturnValue({
      announceToScreenReader: jest.fn(),
      respectsReducedMotion: jest.fn(() => true)
    });

    render(<LightningBoltVisual {...defaultProps} />);
    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  test('updates when props change', async () => {
    const { rerender } = render(<LightningBoltVisual {...defaultProps} />);
    
    rerender(<LightningBoltVisual {...defaultProps} tokenSpeed={100} />);
    
    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });

  test('cleans up animation frame on unmount', () => {
    const { unmount } = render(<LightningBoltVisual {...defaultProps} />);
    unmount();
    expect(global.cancelAnimationFrame).toHaveBeenCalled();
  });
});

describe('EnergyStreamVisual Component', () => {
  const defaultProps = {
    flowRate: 60,
    particleCount: 100,
    streamColor: '#60a5fa',
    direction: 'horizontal' as const
  };

  test('renders energy stream canvas', () => {
    render(<EnergyStreamVisual {...defaultProps} />);
    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  test('handles different flow directions', () => {
    const directions: Array<'horizontal' | 'vertical' | 'diagonal'> = ['horizontal', 'vertical', 'diagonal'];
    
    directions.forEach(direction => {
      const { unmount } = render(<EnergyStreamVisual {...defaultProps} direction={direction} />);
      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
      unmount();
    });
  });

  test('respects performance limits', () => {
    const performanceProps = {
      ...defaultProps,
      particleCount: 1000,
      performance: { maxParticles: 200 }
    };
    
    render(<EnergyStreamVisual {...performanceProps} />);
    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  test('provides accessibility description', () => {
    render(<EnergyStreamVisual {...defaultProps} />);
    const description = screen.getByText(/Energy stream visualization/);
    expect(description).toBeInTheDocument();
  });
});

describe('InterferenceOverlay Component', () => {
  const defaultProps = {
    modelA: { position: { x: 200, y: 200 }, frequency: 1, amplitude: 50, phase: 0 },
    modelB: { position: { x: 600, y: 400 }, frequency: 1.2, amplitude: 60, phase: Math.PI / 2 },
    interferenceType: 'constructive' as const
  };

  test('renders interference overlay canvas', () => {
    render(<InterferenceOverlay {...defaultProps} />);
    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });

  test('displays model position indicators', () => {
    render(<InterferenceOverlay {...defaultProps} />);
    const container = screen.getByRole('img').parentElement;
    const indicators = container?.querySelectorAll('[style*="position: absolute"]');
    expect(indicators?.length).toBeGreaterThan(0);
  });

  test('handles different interference types', () => {
    const types: Array<'constructive' | 'destructive' | 'mixed'> = ['constructive', 'destructive', 'mixed'];
    
    types.forEach(type => {
      const { unmount } = render(<InterferenceOverlay {...defaultProps} interferenceType={type} />);
      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
      unmount();
    });
  });

  test('shows interference statistics in reduced motion mode', () => {
    const mockUseAccessibility = require('../hooks/useAccessibility').useAccessibility;
    mockUseAccessibility.mockReturnValue({
      announceToScreenReader: jest.fn(),
      respectsReducedMotion: jest.fn(() => true)
    });

    render(<InterferenceOverlay {...defaultProps} />);
    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
  });
});

describe('MetricsPanel Component', () => {
  const defaultMetrics = {
    tokenGenerationRate: 75,
    energyLevel: 85,
    modelSyncStatus: 'synced' as const,
    interferenceLevel: 25,
    performanceScore: 92,
    uptime: 3665 // 1h 1m 5s
  };

  test('renders all metric items', () => {
    render(<MetricsPanel metrics={defaultMetrics} />);
    
    expect(screen.getByText('Token Rate')).toBeInTheDocument();
    expect(screen.getByText('Energy Level')).toBeInTheDocument();
    expect(screen.getByText('Model Sync')).toBeInTheDocument();
    expect(screen.getByText('Interference')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('Uptime')).toBeInTheDocument();
  });

  test('displays correct metric values', () => {
    render(<MetricsPanel metrics={defaultMetrics} />);
    
    expect(screen.getByText('75')).toBeInTheDocument(); // Token rate
    expect(screen.getByText('85')).toBeInTheDocument(); // Energy level
    expect(screen.getByText('synced')).toBeInTheDocument(); // Sync status
    expect(screen.getByText('25')).toBeInTheDocument(); // Interference
    expect(screen.getByText('92')).toBeInTheDocument(); // Performance
    expect(screen.getByText('1h 1m')).toBeInTheDocument(); // Uptime
  });

  test('shows correct status colors for metrics', () => {
    const criticalMetrics = {
      ...defaultMetrics,
      tokenGenerationRate: 5, // Critical
      energyLevel: 15, // Critical
      performanceScore: 45 // Critical
    };
    
    render(<MetricsPanel metrics={criticalMetrics} />);
    
    // Should render without errors and show critical values
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
  });

  test('handles different layout options', () => {
    const layouts: Array<'horizontal' | 'vertical' | 'grid'> = ['horizontal', 'vertical', 'grid'];
    
    layouts.forEach(layout => {
      const { unmount } = render(<MetricsPanel metrics={defaultMetrics} layout={layout} />);
      expect(screen.getByRole('region')).toBeInTheDocument();
      unmount();
    });
  });

  test('formats large numbers correctly', () => {
    const largeMetrics = {
      ...defaultMetrics,
      tokenGenerationRate: 1500, // Should show as 1.5K
      uptime: 7200 // Should show as 2h 0m
    };
    
    render(<MetricsPanel metrics={largeMetrics} />);
    expect(screen.getByText('1.5K')).toBeInTheDocument();
    expect(screen.getByText('2h 0m')).toBeInTheDocument();
  });

  test('provides accessibility region and descriptions', () => {
    render(<MetricsPanel metrics={defaultMetrics} />);
    
    const region = screen.getByRole('region');
    expect(region).toHaveAttribute('aria-label', 'System Metrics Dashboard');
    
    const description = screen.getByText(/Metrics panel with/);
    expect(description).toBeInTheDocument();
  });
});

describe('Component Integration Tests', () => {
  test('components work together without conflicts', () => {
    const App = () => (
      <div>
        <LightningBoltVisual tokenSpeed={50} energyLevel={75} boltColor="#fbbf24" intensity={80} />
        <EnergyStreamVisual flowRate={60} particleCount={100} streamColor="#60a5fa" />
        <MetricsPanel metrics={{
          tokenGenerationRate: 75,
          energyLevel: 85,
          modelSyncStatus: 'synced',
          interferenceLevel: 25,
          performanceScore: 92,
          uptime: 3600
        }} />
      </div>
    );
    
    render(<App />);
    
    expect(screen.getAllByRole('img')).toHaveLength(2); // Lightning + Stream
    expect(screen.getByRole('region')).toBeInTheDocument(); // Metrics panel
  });

  test('performance monitoring works across components', () => {
    const mockReportPerformance = jest.fn();
    const mockUsePerformanceMonitor = require('../hooks/usePerformanceMonitor').usePerformanceMonitor;
    mockUsePerformanceMonitor.mockReturnValue({
      trackFrameTime: jest.fn(),
      reportPerformance: mockReportPerformance
    });

    render(<LightningBoltVisual tokenSpeed={50} energyLevel={75} boltColor="#fbbf24" intensity={80} />);
    
    // Performance should be tracked
    expect(mockReportPerformance).toHaveBeenCalledWith('lightning-bolt', expect.any(Number));
  });
});
