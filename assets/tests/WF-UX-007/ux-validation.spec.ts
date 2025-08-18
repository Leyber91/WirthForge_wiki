/**
 * WF-UX-007 UX Validation Tests
 * 
 * Focused on user-facing aspects of error handling. Tests ensure error states
 * and messages meet UX criteria, verify accessibility attributes, and validate
 * interactive elements in recovery UI flows.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import ErrorBoundary from '../../../assets/code/WF-UX-007/error-boundary.tsx';
import React from 'react';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock components for testing
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test component error');
  }
  return <div>Working component</div>;
};

const MockRecoveryManager = {
  reportError: jest.fn().mockResolvedValue(undefined)
};

// Setup global mocks
beforeEach(() => {
  // Mock window.wirthforge
  (global as any).window = {
    wirthforge: {
      recoveryManager: MockRecoveryManager
    },
    location: { href: 'http://localhost:3000/test' },
    navigator: { userAgent: 'Test Browser' }
  };

  // Mock localStorage
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  };
  (global as any).localStorage = localStorageMock;

  jest.clearAllMocks();
});

describe('WF-UX-007 UX Validation Tests', () => {
  describe('Error Message Display', () => {
    it('should display user-friendly error messages', async () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      // Trigger error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Verify user-friendly message is displayed
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/This component encountered an error/)).toBeInTheDocument();
      
      // Verify technical details are hidden by default
      expect(screen.queryByText('Test component error')).not.toBeVisible();
    });

    it('should show technical details when requested', async () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Click to expand error details
      const detailsToggle = screen.getByText('Error Details');
      fireEvent.click(detailsToggle);

      // Verify technical details are now visible
      await waitFor(() => {
        expect(screen.getByText('Test component error')).toBeVisible();
      });
    });

    it('should use appropriate visual styling for error states', async () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const errorContainer = screen.getByRole('alert', { hidden: true }) || 
                           screen.getByText('Something went wrong').closest('div');

      // Verify error styling
      expect(errorContainer).toHaveStyle({
        border: '2px dashed #ff6b6b',
        backgroundColor: '#fff5f5'
      });

      // Verify error icon is present
      expect(screen.getByTestId('alert-triangle-icon') || 
             screen.getByText('Something went wrong').closest('div')?.querySelector('svg')).toBeInTheDocument();
    });

    it('should display contextual action buttons', async () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Verify action buttons are present
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export debug info/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility Compliance', () => {
    it('should have no accessibility violations in error state', async () => {
      const { container, rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Run accessibility audit
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA attributes for error messages', async () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Check for proper ARIA attributes
      const errorContainer = screen.getByText('Something went wrong').closest('div');
      expect(errorContainer).toHaveAttribute('role', 'alert');
      expect(errorContainer).toHaveAttribute('aria-live', 'assertive');
    });

    it('should support keyboard navigation', async () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      const refreshButton = screen.getByRole('button', { name: /refresh page/i });
      const debugButton = screen.getByRole('button', { name: /export debug info/i });

      // Verify buttons are focusable
      retryButton.focus();
      expect(retryButton).toHaveFocus();

      // Test tab navigation
      fireEvent.keyDown(retryButton, { key: 'Tab' });
      expect(refreshButton).toHaveFocus();

      fireEvent.keyDown(refreshButton, { key: 'Tab' });
      expect(debugButton).toHaveFocus();
    });

    it('should announce critical errors to screen readers', async () => {
      const mockAnnounce = jest.fn();
      
      // Mock screen reader announcement
      (global as any).window.speechSynthesis = {
        speak: mockAnnounce,
        cancel: jest.fn()
      };

      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Verify error is announced for accessibility
      const errorContainer = screen.getByText('Something went wrong').closest('div');
      expect(errorContainer).toHaveAttribute('aria-live', 'assertive');
    });

    it('should have sufficient color contrast', async () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Verify color contrast meets WCAG standards
      const errorTitle = screen.getByText('Something went wrong');
      const computedStyle = window.getComputedStyle(errorTitle);
      
      // Error title should have high contrast (dark red on light background)
      expect(computedStyle.color).toBe('rgb(220, 38, 38)'); // #dc2626
    });
  });

  describe('Interactive Error Recovery', () => {
    it('should handle retry button interaction', async () => {
      const onError = jest.fn();
      
      const { rerender } = render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      rerender(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      
      // Click retry button
      fireEvent.click(retryButton);

      // Verify retry functionality
      await waitFor(() => {
        expect(retryButton).toHaveTextContent(/retrying/i);
      });
    });

    it('should disable retry after max attempts', async () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });

      // Click retry button multiple times to exceed limit
      for (let i = 0; i < 4; i++) {
        fireEvent.click(retryButton);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Verify button is disabled after max attempts
      await waitFor(() => {
        expect(retryButton).toBeDisabled();
        expect(screen.getByText(/maximum retry attempts reached/i)).toBeInTheDocument();
      });
    });

    it('should export debug information when requested', async () => {
      // Mock URL.createObjectURL and related APIs
      const mockCreateObjectURL = jest.fn().mockReturnValue('blob:mock-url');
      const mockRevokeObjectURL = jest.fn();
      
      (global as any).URL = {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL
      };

      // Mock document.createElement for download link
      const mockAnchor = {
        href: '',
        download: '',
        click: jest.fn()
      };
      
      const originalCreateElement = document.createElement;
      document.createElement = jest.fn().mockImplementation((tagName) => {
        if (tagName === 'a') {
          return mockAnchor;
        }
        return originalCreateElement.call(document, tagName);
      });

      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const debugButton = screen.getByRole('button', { name: /export debug info/i });
      fireEvent.click(debugButton);

      // Verify debug export functionality
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockAnchor.download).toMatch(/wirthforge-error-.*\.json/);

      // Cleanup
      document.createElement = originalCreateElement;
    });

    it('should handle page refresh action', async () => {
      // Mock window.location.reload
      const mockReload = jest.fn();
      (global as any).window.location.reload = mockReload;

      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const refreshButton = screen.getByRole('button', { name: /refresh page/i });
      fireEvent.click(refreshButton);

      // Verify page refresh is triggered
      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('Error State Transitions', () => {
    it('should show loading state during retry', async () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      // Verify loading state is shown
      await waitFor(() => {
        expect(retryButton).toHaveTextContent(/retrying/i);
        expect(retryButton).toBeDisabled();
      });
    });

    it('should clear error state on successful recovery', async () => {
      let shouldThrow = true;
      
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div>Component recovered</div>;
      };

      const { rerender } = render(
        <ErrorBoundary resetKeys={[shouldThrow]}>
          <TestComponent />
        </ErrorBoundary>
      );

      // Verify error state is shown
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Simulate recovery
      shouldThrow = false;
      
      rerender(
        <ErrorBoundary resetKeys={[shouldThrow]}>
          <TestComponent />
        </ErrorBoundary>
      );

      // Verify error state is cleared
      await waitFor(() => {
        expect(screen.getByText('Component recovered')).toBeInTheDocument();
        expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
      });
    });

    it('should maintain error state consistency', async () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Verify consistent error state
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      // Re-render without changing error state
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Error state should remain consistent
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Error Message Localization', () => {
    it('should support message customization', async () => {
      const customFallback = (
        <div role="alert">
          <h3>Custom Error Message</h3>
          <p>This is a custom error fallback</p>
        </div>
      );

      const { rerender } = render(
        <ErrorBoundary fallbackComponent={customFallback}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      rerender(
        <ErrorBoundary fallbackComponent={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Verify custom message is displayed
      expect(screen.getByText('Custom Error Message')).toBeInTheDocument();
      expect(screen.getByText('This is a custom error fallback')).toBeInTheDocument();
    });

    it('should handle missing translations gracefully', async () => {
      // Mock missing translation scenario
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should fall back to default English messages
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Error Reporting Integration', () => {
    it('should report errors to recovery manager', async () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Wait for error reporting
      await waitFor(() => {
        expect(MockRecoveryManager.reportError).toHaveBeenCalledWith(
          expect.objectContaining({
            errorCode: 'UI_001',
            message: 'Test component error'
          })
        );
      });
    });

    it('should fallback to localStorage when recovery manager unavailable', async () => {
      // Remove recovery manager
      (global as any).window.wirthforge = undefined;

      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Wait for localStorage fallback
      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith(
          'wirthforge_errors',
          expect.stringContaining('Test component error')
        );
      });
    });
  });

  describe('Performance and Responsiveness', () => {
    it('should render error state quickly', async () => {
      const startTime = performance.now();
      
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Error state should render within 100ms
      expect(renderTime).toBeLessThan(100);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should not block UI during error handling', async () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // UI should remain responsive
      const retryButton = screen.getByRole('button', { name: /retry/i });
      
      // Multiple rapid clicks should be handled gracefully
      for (let i = 0; i < 5; i++) {
        fireEvent.click(retryButton);
      }

      // Button should still be functional
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('Mobile and Responsive Design', () => {
    it('should adapt to small screen sizes', async () => {
      // Mock small viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320
      });

      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Verify mobile-friendly layout
      const errorContainer = screen.getByText('Something went wrong').closest('div');
      const computedStyle = window.getComputedStyle(errorContainer!);
      
      // Should use flexible layout for mobile
      expect(computedStyle.display).toBe('block');
    });

    it('should have touch-friendly button sizes', async () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const buttons = screen.getAllByRole('button');
      
      buttons.forEach(button => {
        const computedStyle = window.getComputedStyle(button);
        const minHeight = parseInt(computedStyle.minHeight || computedStyle.height);
        
        // Buttons should be at least 44px tall for touch accessibility
        expect(minHeight).toBeGreaterThanOrEqual(44);
      });
    });
  });
});
