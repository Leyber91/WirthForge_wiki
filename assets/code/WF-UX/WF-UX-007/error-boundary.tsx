/**
 * WF-UX-007 Error Boundary Component
 * 
 * React component that wraps around critical UI sections to catch any rendering/runtime errors
 * on the front-end. Implements the standard Error Boundary pattern with fallback UI and
 * error reporting to the orchestrator for logging.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackComponent?: ReactNode;
  isolateComponent?: boolean;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
  isRetrying: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    this.setState({ errorInfo });
    
    // Report to orchestrator
    this.reportError(error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Isolate component if requested
    if (this.props.isolateComponent) {
      this.isolateFailedComponent();
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error state if resetKeys changed
    if (hasError && resetKeys && prevProps.resetKeys !== resetKeys) {
      if (resetKeys.some((key, idx) => prevProps.resetKeys?.[idx] !== key)) {
        this.resetErrorBoundary();
      }
    }

    // Reset on any prop change if enabled
    if (hasError && resetOnPropsChange && prevProps !== this.props) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      const errorReport = {
        errorCode: 'UI_001',
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        retryCount: this.state.retryCount
      };

      // Send to recovery manager via WebSocket or API
      if (window.wirthforge?.recoveryManager) {
        await window.wirthforge.recoveryManager.reportError(errorReport);
      } else {
        // Fallback to local storage if orchestrator unavailable
        const errors = JSON.parse(localStorage.getItem('wirthforge_errors') || '[]');
        errors.push(errorReport);
        localStorage.setItem('wirthforge_errors', JSON.stringify(errors.slice(-50))); // Keep last 50
      }
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  private isolateFailedComponent = () => {
    // Mark component as isolated in the DOM
    const errorElement = document.querySelector(`[data-error-id="${this.state.errorId}"]`);
    if (errorElement) {
      errorElement.setAttribute('data-component-isolated', 'true');
      errorElement.style.isolation = 'isolate';
    }
  };

  private resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      isRetrying: false
    });
  };

  private handleRetry = () => {
    const { retryCount } = this.state;
    
    if (retryCount >= 3) {
      // Max retries reached, don't retry automatically
      return;
    }

    this.setState({ 
      isRetrying: true,
      retryCount: retryCount + 1
    });

    // Reset after a short delay to allow for cleanup
    this.resetTimeoutId = window.setTimeout(() => {
      this.resetErrorBoundary();
    }, 1000);
  };

  private handleReportIssue = () => {
    const { error, errorInfo, errorId } = this.state;
    
    const debugInfo = {
      errorId,
      error: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount
    };

    // Create downloadable debug report
    const blob = new Blob([JSON.stringify(debugInfo, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wirthforge-error-${errorId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  private renderFallbackUI = () => {
    const { error, errorId, retryCount, isRetrying } = this.state;
    const { fallbackComponent } = this.props;

    // Use custom fallback if provided
    if (fallbackComponent) {
      return fallbackComponent;
    }

    // Default fallback UI
    return (
      <div 
        className="error-boundary-fallback"
        data-error-id={errorId}
        style={{
          padding: '2rem',
          margin: '1rem',
          border: '2px dashed #ff6b6b',
          borderRadius: '8px',
          backgroundColor: '#fff5f5',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif'
        }}
      >
        <div style={{ marginBottom: '1rem' }}>
          <AlertTriangle 
            size={48} 
            color="#ff6b6b" 
            style={{ marginBottom: '0.5rem' }}
          />
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#dc2626' }}>
            Something went wrong
          </h3>
          <p style={{ margin: '0', color: '#6b7280', fontSize: '0.9rem' }}>
            This component encountered an error and couldn't display properly.
          </p>
        </div>

        {error && (
          <details style={{ marginBottom: '1rem', textAlign: 'left' }}>
            <summary style={{ cursor: 'pointer', color: '#374151' }}>
              Error Details
            </summary>
            <pre style={{ 
              fontSize: '0.8rem', 
              color: '#6b7280', 
              overflow: 'auto',
              maxHeight: '200px',
              padding: '0.5rem',
              backgroundColor: '#f9fafb',
              borderRadius: '4px',
              margin: '0.5rem 0'
            }}>
              {error.message}
            </pre>
          </details>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={this.handleRetry}
            disabled={isRetrying || retryCount >= 3}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: isRetrying ? '#d1d5db' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRetrying || retryCount >= 3 ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem'
            }}
          >
            <RefreshCw size={16} />
            {isRetrying ? 'Retrying...' : `Retry${retryCount > 0 ? ` (${3 - retryCount} left)` : ''}`}
          </button>

          <button
            onClick={() => window.location.reload()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            <Home size={16} />
            Refresh Page
          </button>

          <button
            onClick={this.handleReportIssue}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            <Bug size={16} />
            Export Debug Info
          </button>
        </div>

        {retryCount >= 3 && (
          <p style={{ 
            marginTop: '1rem', 
            fontSize: '0.8rem', 
            color: '#dc2626',
            fontStyle: 'italic'
          }}>
            Maximum retry attempts reached. Please refresh the page or report this issue.
          </p>
        )}
      </div>
    );
  };

  render() {
    if (this.state.hasError) {
      return this.renderFallbackUI();
    }

    return this.props.children;
  }
}

// Higher-order component for easy wrapping
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = 
    `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundaryComponent;
}

// Hook for manual error reporting
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: any) => {
    // Create synthetic error boundary state for manual errors
    const errorBoundary = new ErrorBoundary({} as Props);
    errorBoundary.componentDidCatch(error, errorInfo || { componentStack: '' });
  }, []);
}

// Global error handler setup
export function setupGlobalErrorHandling() {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = new Error(`Unhandled Promise Rejection: ${event.reason}`);
    const errorBoundary = new ErrorBoundary({} as Props);
    errorBoundary.componentDidCatch(error, { componentStack: 'Global Promise Rejection' });
  });

  // Handle global JavaScript errors
  window.addEventListener('error', (event) => {
    const error = new Error(`Global Error: ${event.message}`);
    error.stack = `${event.filename}:${event.lineno}:${event.colno}`;
    const errorBoundary = new ErrorBoundary({} as Props);
    errorBoundary.componentDidCatch(error, { componentStack: 'Global Error Handler' });
  });
}

export default ErrorBoundary;

// Type declarations for global wirthforge object
declare global {
  interface Window {
    wirthforge?: {
      recoveryManager?: {
        reportError: (errorReport: any) => Promise<void>;
      };
    };
  }
}
