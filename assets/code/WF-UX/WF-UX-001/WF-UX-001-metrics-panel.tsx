import React, { useMemo, useCallback } from 'react';
import { useDesignTokens } from '../hooks/useDesignTokens';
import { useAccessibility } from '../hooks/useAccessibility';

interface MetricsPanelProps {
  metrics: {
    tokenGenerationRate: number;
    energyLevel: number;
    modelSyncStatus: 'synced' | 'syncing' | 'desync';
    interferenceLevel: number;
    performanceScore: number;
    uptime: number;
  };
  layout?: 'horizontal' | 'vertical' | 'grid';
  showTrends?: boolean;
  accessibility?: {
    ariaLabel?: string;
    ariaDescribedBy?: string;
    role?: string;
  };
}

interface MetricItemProps {
  label: string;
  value: number | string;
  unit?: string;
  status?: 'good' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
  description?: string;
}

const MetricItem: React.FC<MetricItemProps> = ({ 
  label, 
  value, 
  unit = '', 
  status = 'good', 
  trend, 
  description 
}) => {
  const tokens = useDesignTokens();
  
  const statusColor = useMemo(() => {
    switch (status) {
      case 'critical': return tokens.colorPalettes.interference.destructive;
      case 'warning': return tokens.colorPalettes.lightning.secondary;
      case 'good': return tokens.colorPalettes.interference.harmonic;
      default: return tokens.colorPalettes.system.text;
    }
  }, [status, tokens]);

  const trendIcon = useMemo(() => {
    switch (trend) {
      case 'up': return '↗';
      case 'down': return '↘';
      case 'stable': return '→';
      default: return '';
    }
  }, [trend]);

  const formattedValue = useMemo(() => {
    if (typeof value === 'number') {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
      if (value % 1 !== 0) return value.toFixed(2);
      return value.toString();
    }
    return value;
  }, [value]);

  return (
    <div 
      className="metric-item"
      style={{
        padding: tokens.spacing.md,
        backgroundColor: tokens.colorPalettes.system.surface,
        borderRadius: '8px',
        border: `1px solid ${tokens.colorPalettes.system.border}`,
        minWidth: '120px'
      }}
      role="group"
      aria-label={`${label}: ${formattedValue}${unit}`}
      title={description}
    >
      <div style={{
        fontSize: tokens.typography.fontSize.sm,
        color: tokens.colorPalettes.system.textSecondary,
        marginBottom: tokens.spacing.xs,
        fontFamily: tokens.typography.fontFamily.sans
      }}>
        {label}
      </div>
      
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: tokens.spacing.xs
      }}>
        <span style={{
          fontSize: tokens.typography.fontSize.xl,
          fontWeight: tokens.typography.fontWeight.bold,
          color: statusColor,
          fontFamily: tokens.typography.fontFamily.monospace
        }}>
          {formattedValue}
        </span>
        
        {unit && (
          <span style={{
            fontSize: tokens.typography.fontSize.sm,
            color: tokens.colorPalettes.system.textSecondary
          }}>
            {unit}
          </span>
        )}
        
        {trend && (
          <span 
            style={{
              fontSize: tokens.typography.fontSize.sm,
              color: statusColor
            }}
            aria-label={`Trend: ${trend}`}
          >
            {trendIcon}
          </span>
        )}
      </div>
    </div>
  );
};

export const MetricsPanel: React.FC<MetricsPanelProps> = ({
  metrics,
  layout = 'grid',
  showTrends = true,
  accessibility = {}
}) => {
  const tokens = useDesignTokens();
  const { announceToScreenReader } = useAccessibility();

  const getMetricStatus = useCallback((key: string, value: number | string): 'good' | 'warning' | 'critical' => {
    switch (key) {
      case 'tokenGenerationRate':
        if (typeof value === 'number') {
          if (value < 10) return 'critical';
          if (value < 50) return 'warning';
          return 'good';
        }
        break;
      case 'energyLevel':
        if (typeof value === 'number') {
          if (value < 20) return 'critical';
          if (value < 50) return 'warning';
          return 'good';
        }
        break;
      case 'performanceScore':
        if (typeof value === 'number') {
          if (value < 60) return 'critical';
          if (value < 80) return 'warning';
          return 'good';
        }
        break;
      case 'interferenceLevel':
        if (typeof value === 'number') {
          if (value > 80) return 'critical';
          if (value > 50) return 'warning';
          return 'good';
        }
        break;
    }
    return 'good';
  }, []);

  const formatUptime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  }, []);

  const metricItems = useMemo(() => [
    {
      label: 'Token Rate',
      value: metrics.tokenGenerationRate,
      unit: '/sec',
      status: getMetricStatus('tokenGenerationRate', metrics.tokenGenerationRate),
      description: 'Rate of token generation per second'
    },
    {
      label: 'Energy Level',
      value: metrics.energyLevel,
      unit: '%',
      status: getMetricStatus('energyLevel', metrics.energyLevel),
      description: 'Current energy level percentage'
    },
    {
      label: 'Model Sync',
      value: metrics.modelSyncStatus,
      status: metrics.modelSyncStatus === 'synced' ? 'good' : 
              metrics.modelSyncStatus === 'syncing' ? 'warning' : 'critical',
      description: 'Model synchronization status'
    },
    {
      label: 'Interference',
      value: metrics.interferenceLevel,
      unit: '%',
      status: getMetricStatus('interferenceLevel', metrics.interferenceLevel),
      description: 'Level of model interference'
    },
    {
      label: 'Performance',
      value: metrics.performanceScore,
      unit: '%',
      status: getMetricStatus('performanceScore', metrics.performanceScore),
      description: 'Overall system performance score'
    },
    {
      label: 'Uptime',
      value: formatUptime(metrics.uptime),
      status: 'good',
      description: 'System uptime duration'
    }
  ], [metrics, getMetricStatus, formatUptime]);

  const layoutStyles = useMemo(() => {
    const baseStyles = {
      display: 'flex',
      gap: tokens.spacing.md,
      padding: tokens.spacing.lg,
      backgroundColor: tokens.colorPalettes.system.background,
      borderRadius: '12px',
      border: `1px solid ${tokens.colorPalettes.system.border}`
    };

    switch (layout) {
      case 'horizontal':
        return { ...baseStyles, flexDirection: 'row' as const, flexWrap: 'wrap' as const };
      case 'vertical':
        return { ...baseStyles, flexDirection: 'column' as const };
      case 'grid':
        return {
          ...baseStyles,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: tokens.spacing.md
        };
      default:
        return baseStyles;
    }
  }, [layout, tokens]);

  // Announce critical status changes
  React.useEffect(() => {
    const criticalMetrics = metricItems.filter(item => item.status === 'critical');
    if (criticalMetrics.length > 0) {
      const message = `Critical alert: ${criticalMetrics.map(m => m.label).join(', ')} require attention`;
      announceToScreenReader(message, 'assertive');
    }
  }, [metricItems, announceToScreenReader]);

  const accessibilityDescription = useMemo(() => {
    const statusCounts = metricItems.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return `Metrics panel with ${metricItems.length} metrics: ${statusCounts.good || 0} good, ${statusCounts.warning || 0} warning, ${statusCounts.critical || 0} critical`;
  }, [metricItems]);

  return (
    <div 
      className="metrics-panel"
      style={layoutStyles}
      role={accessibility.role || "region"}
      aria-label={accessibility.ariaLabel || "System Metrics Dashboard"}
      aria-describedby={accessibility.ariaDescribedBy}
    >
      <div className="sr-only" aria-live="polite">
        {accessibilityDescription}
      </div>
      
      {metricItems.map((item, index) => (
        <MetricItem
          key={`${item.label}-${index}`}
          label={item.label}
          value={item.value}
          unit={item.unit}
          status={item.status}
          trend={showTrends ? 'stable' : undefined}
          description={item.description}
        />
      ))}
    </div>
  );
};
