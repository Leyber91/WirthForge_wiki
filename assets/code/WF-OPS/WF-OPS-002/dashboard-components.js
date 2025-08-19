/**
 * WIRTHFORGE Dashboard Components
 * 
 * React components for real-time monitoring dashboard with energy-truth visualization,
 * 60Hz updates, frame budget enforcement, and accessibility features.
 */

const React = require('react');
const { useState, useEffect, useRef, useCallback, useMemo } = React;

/**
 * Main Dashboard Container
 */
function WirthForgeDashboard({ 
    wsUrl = 'ws://127.0.0.1:8080',
    layout,
    theme = 'dark',
    frameBudget = 16.67,
    onLayoutChange,
    onThemeChange 
}) {
    const [isConnected, setIsConnected] = useState(false);
    const [metrics, setMetrics] = useState({});
    const [alerts, setAlerts] = useState([]);
    const [frameStats, setFrameStats] = useState({ time: 0, overruns: 0 });
    const [panelStates, setPanelStates] = useState(new Map());
    
    const wsRef = useRef(null);
    const frameStartRef = useRef(0);
    const animationFrameRef = useRef(null);
    
    // WebSocket connection management
    useEffect(() => {
        connectWebSocket();
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [wsUrl]);
    
    const connectWebSocket = useCallback(() => {
        try {
            wsRef.current = new WebSocket(wsUrl);
            
            wsRef.current.onopen = () => {
                setIsConnected(true);
                // Subscribe to all channels
                wsRef.current.send(JSON.stringify({
                    type: 'subscribe',
                    channel: 'metrics'
                }));
                wsRef.current.send(JSON.stringify({
                    type: 'subscribe',
                    channel: 'alerts'
                }));
            };
            
            wsRef.current.onmessage = (event) => {
                handleWebSocketMessage(JSON.parse(event.data));
            };
            
            wsRef.current.onclose = () => {
                setIsConnected(false);
                // Attempt reconnection after 3 seconds
                setTimeout(connectWebSocket, 3000);
            };
            
            wsRef.current.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
            
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
        }
    }, [wsUrl]);
    
    const handleWebSocketMessage = useCallback((message) => {
        frameStartRef.current = performance.now();
        
        try {
            switch (message.type) {
                case 'metrics':
                    setMetrics(prevMetrics => ({
                        ...prevMetrics,
                        [message.source]: message.data
                    }));
                    break;
                    
                case 'alert':
                    setAlerts(prevAlerts => [message, ...prevAlerts.slice(0, 99)]);
                    break;
                    
                case 'alert_resolved':
                    setAlerts(prevAlerts => 
                        prevAlerts.filter(alert => alert.id !== message.originalAlert?.id)
                    );
                    break;
                    
                default:
                    break;
            }
            
            // Update frame statistics
            const frameTime = performance.now() - frameStartRef.current;
            setFrameStats(prev => ({
                time: frameTime,
                overruns: frameTime > frameBudget ? prev.overruns + 1 : prev.overruns
            }));
            
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    }, [frameBudget]);
    
    const sendControlMessage = useCallback((action, target, parameters) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'control',
                action,
                target,
                parameters
            }));
        }
    }, []);
    
    return React.createElement('div', {
        className: `wirthforge-dashboard theme-${theme}`,
        'data-connected': isConnected
    }, [
        React.createElement(DashboardHeader, {
            key: 'header',
            isConnected,
            frameStats,
            alerts: alerts.filter(a => a.severity === 'critical').length,
            theme,
            onThemeChange
        }),
        
        React.createElement(DashboardGrid, {
            key: 'grid',
            layout,
            metrics,
            alerts,
            panelStates,
            onPanelStateChange: setPanelStates,
            onLayoutChange,
            onControlMessage: sendControlMessage
        }),
        
        React.createElement(AlertPanel, {
            key: 'alerts',
            alerts: alerts.slice(0, 10),
            onDismiss: (alertId) => {
                setAlerts(prev => prev.filter(a => a.id !== alertId));
            }
        })
    ]);
}

/**
 * Dashboard Header with Connection Status
 */
function DashboardHeader({ 
    isConnected, 
    frameStats, 
    alerts, 
    theme, 
    onThemeChange 
}) {
    return React.createElement('header', {
        className: 'dashboard-header'
    }, [
        React.createElement('div', {
            key: 'title',
            className: 'dashboard-title'
        }, [
            React.createElement('h1', { key: 'h1' }, 'WIRTHFORGE Monitor'),
            React.createElement('div', {
                key: 'status',
                className: `connection-status ${isConnected ? 'connected' : 'disconnected'}`
            }, isConnected ? '● LIVE' : '○ OFFLINE')
        ]),
        
        React.createElement('div', {
            key: 'stats',
            className: 'dashboard-stats'
        }, [
            React.createElement(FrameBudgetIndicator, {
                key: 'frame',
                frameTime: frameStats.time,
                overruns: frameStats.overruns
            }),
            
            React.createElement('div', {
                key: 'alerts',
                className: `alert-count ${alerts > 0 ? 'has-alerts' : ''}`
            }, `${alerts} Critical`)
        ]),
        
        React.createElement('div', {
            key: 'controls',
            className: 'dashboard-controls'
        }, [
            React.createElement('button', {
                key: 'theme',
                onClick: () => onThemeChange(theme === 'dark' ? 'light' : 'dark'),
                className: 'theme-toggle'
            }, theme === 'dark' ? '☀️' : '🌙')
        ])
    ]);
}

/**
 * Frame Budget Indicator
 */
function FrameBudgetIndicator({ frameTime, overruns }) {
    const budgetUsed = (frameTime / 16.67) * 100;
    const status = budgetUsed > 80 ? 'critical' : budgetUsed > 60 ? 'warning' : 'good';
    
    return React.createElement('div', {
        className: `frame-budget ${status}`,
        title: `Frame: ${frameTime.toFixed(1)}ms, Overruns: ${overruns}`
    }, [
        React.createElement('div', {
            key: 'bar',
            className: 'budget-bar'
        }, [
            React.createElement('div', {
                key: 'fill',
                className: 'budget-fill',
                style: { width: `${Math.min(100, budgetUsed)}%` }
            })
        ]),
        React.createElement('span', {
            key: 'text',
            className: 'budget-text'
        }, `${frameTime.toFixed(1)}ms`)
    ]);
}

/**
 * Dashboard Grid Layout
 */
function DashboardGrid({ 
    layout, 
    metrics, 
    alerts, 
    panelStates, 
    onPanelStateChange, 
    onLayoutChange,
    onControlMessage 
}) {
    const gridStyle = {
        display: 'grid',
        gridTemplateColumns: `repeat(${layout.grid.columns}, 1fr)`,
        gridTemplateRows: `repeat(${layout.grid.rows}, 1fr)`,
        gap: '8px',
        height: 'calc(100vh - 120px)',
        padding: '16px'
    };
    
    return React.createElement('div', {
        className: 'dashboard-grid',
        style: gridStyle
    }, layout.panels.map(panel => 
        React.createElement(DashboardPanel, {
            key: panel.id,
            panel,
            metrics,
            alerts,
            state: panelStates.get(panel.id),
            onStateChange: (state) => {
                const newStates = new Map(panelStates);
                newStates.set(panel.id, state);
                onPanelStateChange(newStates);
            },
            onControlMessage
        })
    ));
}

/**
 * Individual Dashboard Panel
 */
function DashboardPanel({ 
    panel, 
    metrics, 
    alerts, 
    state = {}, 
    onStateChange, 
    onControlMessage 
}) {
    const panelStyle = {
        gridColumn: `${panel.position.x + 1} / span ${panel.size.width}`,
        gridRow: `${panel.position.y + 1} / span ${panel.size.height}`
    };
    
    const renderPanelContent = () => {
        switch (panel.type) {
            case 'metrics':
                return React.createElement(MetricsPanel, {
                    config: panel.config,
                    metrics,
                    state,
                    onStateChange
                });
                
            case 'energy_viz':
                return React.createElement(EnergyVisualization, {
                    config: panel.config,
                    metrics,
                    state,
                    onStateChange
                });
                
            case 'system_overview':
                return React.createElement(SystemOverview, {
                    config: panel.config,
                    metrics,
                    state,
                    onStateChange
                });
                
            case 'alert_list':
                return React.createElement(AlertList, {
                    config: panel.config,
                    alerts,
                    state,
                    onStateChange
                });
                
            case 'performance_chart':
                return React.createElement(PerformanceChart, {
                    config: panel.config,
                    metrics,
                    state,
                    onStateChange
                });
                
            case 'controls':
                return React.createElement(ControlPanel, {
                    config: panel.config,
                    onControlMessage,
                    state,
                    onStateChange
                });
                
            default:
                return React.createElement('div', {
                    className: 'panel-error'
                }, `Unknown panel type: ${panel.type}`);
        }
    };
    
    return React.createElement('div', {
        className: `dashboard-panel panel-${panel.type}`,
        style: panelStyle
    }, [
        React.createElement('div', {
            key: 'header',
            className: 'panel-header'
        }, [
            React.createElement('h3', { key: 'title' }, panel.title),
            React.createElement('div', {
                key: 'actions',
                className: 'panel-actions'
            }, [
                React.createElement('button', {
                    key: 'minimize',
                    className: 'panel-action',
                    onClick: () => onStateChange({ ...state, minimized: !state.minimized })
                }, state.minimized ? '□' : '−')
            ])
        ]),
        
        !state.minimized && React.createElement('div', {
            key: 'content',
            className: 'panel-content'
        }, renderPanelContent())
    ]);
}

/**
 * Metrics Display Panel
 */
function MetricsPanel({ config, metrics, state, onStateChange }) {
    const relevantMetrics = useMemo(() => {
        const result = {};
        for (const source of config.sources) {
            if (metrics[source]) {
                result[source] = metrics[source];
            }
        }
        return result;
    }, [metrics, config.sources]);
    
    return React.createElement('div', {
        className: 'metrics-panel'
    }, Object.entries(relevantMetrics).map(([source, data]) =>
        React.createElement('div', {
            key: source,
            className: 'metric-group'
        }, [
            React.createElement('h4', { key: 'title' }, source),
            React.createElement('div', {
                key: 'values',
                className: 'metric-values'
            }, Object.entries(data).map(([key, value]) =>
                React.createElement('div', {
                    key,
                    className: 'metric-item'
                }, [
                    React.createElement('span', {
                        key: 'label',
                        className: 'metric-label'
                    }, key),
                    React.createElement('span', {
                        key: 'value',
                        className: 'metric-value'
                    }, formatMetricValue(value))
                ])
            ))
        ])
    ));
}

/**
 * Energy-Truth Visualization Component
 */
function EnergyVisualization({ config, metrics, state, onStateChange }) {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const particlesRef = useRef([]);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const animate = () => {
            updateVisualization(ctx, metrics, particlesRef.current);
            animationRef.current = requestAnimationFrame(animate);
        };
        
        animate();
        
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [metrics]);
    
    return React.createElement('div', {
        className: 'energy-visualization'
    }, [
        React.createElement('canvas', {
            key: 'canvas',
            ref: canvasRef,
            width: 400,
            height: 300,
            className: 'energy-canvas'
        }),
        React.createElement('div', {
            key: 'legend',
            className: 'energy-legend'
        }, [
            React.createElement('div', {
                key: 'ribbons',
                className: 'legend-item'
            }, '🌊 Energy Ribbons'),
            React.createElement('div', {
                key: 'particles',
                className: 'legend-item'
            }, '✨ Token Particles')
        ])
    ]);
}

/**
 * System Overview Panel
 */
function SystemOverview({ config, metrics, state, onStateChange }) {
    const systemMetrics = metrics.system || {};
    const modelMetrics = metrics.model || {};
    
    const cpuUsage = systemMetrics.cpu_percent || 0;
    const memoryUsage = systemMetrics.memory_percent || 0;
    const tokensPerSec = modelMetrics.tokens_per_second || 0;
    
    return React.createElement('div', {
        className: 'system-overview'
    }, [
        React.createElement(CircularProgress, {
            key: 'cpu',
            label: 'CPU',
            value: cpuUsage,
            max: 100,
            unit: '%',
            color: cpuUsage > 80 ? '#ff4444' : '#44ff44'
        }),
        
        React.createElement(CircularProgress, {
            key: 'memory',
            label: 'Memory',
            value: memoryUsage,
            max: 100,
            unit: '%',
            color: memoryUsage > 80 ? '#ff4444' : '#44ff44'
        }),
        
        React.createElement('div', {
            key: 'tokens',
            className: 'metric-display'
        }, [
            React.createElement('div', {
                key: 'value',
                className: 'metric-value-large'
            }, tokensPerSec.toFixed(1)),
            React.createElement('div', {
                key: 'label',
                className: 'metric-label'
            }, 'Tokens/sec')
        ])
    ]);
}

/**
 * Circular Progress Component
 */
function CircularProgress({ label, value, max, unit, color }) {
    const percentage = (value / max) * 100;
    const strokeDasharray = `${percentage * 2.51} 251`;
    
    return React.createElement('div', {
        className: 'circular-progress'
    }, [
        React.createElement('svg', {
            key: 'svg',
            width: 80,
            height: 80,
            viewBox: '0 0 80 80'
        }, [
            React.createElement('circle', {
                key: 'bg',
                cx: 40,
                cy: 40,
                r: 35,
                fill: 'none',
                stroke: '#333',
                strokeWidth: 6
            }),
            React.createElement('circle', {
                key: 'progress',
                cx: 40,
                cy: 40,
                r: 35,
                fill: 'none',
                stroke: color,
                strokeWidth: 6,
                strokeDasharray,
                strokeLinecap: 'round',
                transform: 'rotate(-90 40 40)'
            })
        ]),
        React.createElement('div', {
            key: 'text',
            className: 'progress-text'
        }, [
            React.createElement('div', {
                key: 'value',
                className: 'progress-value'
            }, `${value.toFixed(1)}${unit}`),
            React.createElement('div', {
                key: 'label',
                className: 'progress-label'
            }, label)
        ])
    ]);
}

/**
 * Alert List Panel
 */
function AlertList({ config, alerts, state, onStateChange }) {
    const filteredAlerts = alerts.filter(alert => 
        !config.severityFilter || config.severityFilter.includes(alert.severity)
    );
    
    return React.createElement('div', {
        className: 'alert-list'
    }, filteredAlerts.map(alert =>
        React.createElement('div', {
            key: alert.id,
            className: `alert-item severity-${alert.severity}`
        }, [
            React.createElement('div', {
                key: 'header',
                className: 'alert-header'
            }, [
                React.createElement('span', {
                    key: 'severity',
                    className: 'alert-severity'
                }, alert.severity.toUpperCase()),
                React.createElement('span', {
                    key: 'time',
                    className: 'alert-time'
                }, formatTimestamp(alert.timestamp))
            ]),
            React.createElement('div', {
                key: 'message',
                className: 'alert-message'
            }, alert.message)
        ])
    ));
}

/**
 * Performance Chart Panel
 */
function PerformanceChart({ config, metrics, state, onStateChange }) {
    const canvasRef = useRef(null);
    const dataHistoryRef = useRef([]);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Add current metrics to history
        const timestamp = Date.now();
        const dataPoint = {
            timestamp,
            ...extractChartData(metrics, config.metrics)
        };
        
        dataHistoryRef.current.push(dataPoint);
        
        // Keep only last 100 points
        if (dataHistoryRef.current.length > 100) {
            dataHistoryRef.current.shift();
        }
        
        // Draw chart
        drawChart(canvas, dataHistoryRef.current, config);
        
    }, [metrics, config]);
    
    return React.createElement('canvas', {
        ref: canvasRef,
        width: 400,
        height: 200,
        className: 'performance-chart'
    });
}

/**
 * Control Panel
 */
function ControlPanel({ config, onControlMessage, state, onStateChange }) {
    return React.createElement('div', {
        className: 'control-panel'
    }, config.controls.map(control =>
        React.createElement('button', {
            key: control.id,
            className: `control-button ${control.type}`,
            onClick: () => onControlMessage(control.action, control.target, control.parameters)
        }, control.label)
    ));
}

/**
 * Alert Panel Overlay
 */
function AlertPanel({ alerts, onDismiss }) {
    if (alerts.length === 0) return null;
    
    return React.createElement('div', {
        className: 'alert-panel-overlay'
    }, React.createElement('div', {
        className: 'alert-panel'
    }, [
        React.createElement('div', {
            key: 'header',
            className: 'alert-panel-header'
        }, [
            React.createElement('h3', { key: 'title' }, 'Active Alerts'),
            React.createElement('button', {
                key: 'close',
                onClick: () => alerts.forEach(a => onDismiss(a.id))
            }, '×')
        ]),
        React.createElement('div', {
            key: 'content',
            className: 'alert-panel-content'
        }, alerts.map(alert =>
            React.createElement('div', {
                key: alert.id,
                className: `alert-panel-item severity-${alert.severity}`
            }, [
                React.createElement('div', {
                    key: 'message',
                    className: 'alert-panel-message'
                }, alert.message),
                React.createElement('button', {
                    key: 'dismiss',
                    className: 'alert-dismiss',
                    onClick: () => onDismiss(alert.id)
                }, 'Dismiss')
            ])
        ))
    ]));
}

// Utility Functions

function formatMetricValue(value) {
    if (typeof value === 'number') {
        if (value > 1000000) {
            return `${(value / 1000000).toFixed(1)}M`;
        } else if (value > 1000) {
            return `${(value / 1000).toFixed(1)}K`;
        } else {
            return value.toFixed(2);
        }
    }
    return String(value);
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
}

function updateVisualization(ctx, metrics, particles) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    
    // Clear canvas
    ctx.fillStyle = '#000011';
    ctx.fillRect(0, 0, width, height);
    
    // Draw energy ribbons based on system metrics
    const systemMetrics = metrics.system || {};
    const cpuUsage = systemMetrics.cpu_percent || 0;
    const memoryUsage = systemMetrics.memory_percent || 0;
    
    drawEnergyRibbons(ctx, width, height, cpuUsage, memoryUsage);
    
    // Update and draw token particles
    const modelMetrics = metrics.model || {};
    const tokensPerSec = modelMetrics.tokens_per_second || 0;
    
    updateTokenParticles(particles, tokensPerSec, width, height);
    drawTokenParticles(ctx, particles);
}

function drawEnergyRibbons(ctx, width, height, cpuUsage, memoryUsage) {
    const time = Date.now() * 0.001;
    
    // CPU ribbon
    ctx.strokeStyle = `rgba(255, ${Math.floor(255 - cpuUsage * 2.55)}, 0, 0.7)`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    for (let x = 0; x < width; x += 5) {
        const y = height * 0.3 + Math.sin(x * 0.02 + time * 2) * (cpuUsage * 0.5);
        if (x === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    
    // Memory ribbon
    ctx.strokeStyle = `rgba(0, ${Math.floor(255 - memoryUsage * 2.55)}, 255, 0.7)`;
    ctx.beginPath();
    
    for (let x = 0; x < width; x += 5) {
        const y = height * 0.7 + Math.sin(x * 0.03 + time * 1.5) * (memoryUsage * 0.5);
        if (x === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
}

function updateTokenParticles(particles, tokensPerSec, width, height) {
    // Add new particles based on token rate
    const particlesToAdd = Math.floor(tokensPerSec * 0.1);
    
    for (let i = 0; i < particlesToAdd; i++) {
        particles.push({
            x: 0,
            y: Math.random() * height,
            vx: 2 + Math.random() * 3,
            vy: (Math.random() - 0.5) * 2,
            life: 1.0,
            size: 2 + Math.random() * 3
        });
    }
    
    // Update existing particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.01;
        
        // Remove dead or off-screen particles
        if (particle.life <= 0 || particle.x > width) {
            particles.splice(i, 1);
        }
    }
}

function drawTokenParticles(ctx, particles) {
    for (const particle of particles) {
        ctx.fillStyle = `rgba(255, 255, 255, ${particle.life})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function extractChartData(metrics, metricConfigs) {
    const data = {};
    
    for (const config of metricConfigs) {
        const source = metrics[config.source];
        if (source && source[config.metric]) {
            data[config.name] = source[config.metric];
        }
    }
    
    return data;
}

function drawChart(canvas, dataHistory, config) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);
    
    if (dataHistory.length < 2) return;
    
    // Find data ranges
    const ranges = {};
    for (const metricConfig of config.metrics) {
        const values = dataHistory.map(d => d[metricConfig.name] || 0);
        ranges[metricConfig.name] = {
            min: Math.min(...values),
            max: Math.max(...values)
        };
    }
    
    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 10; i++) {
        const y = (height / 10) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Draw metrics
    const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44'];
    
    config.metrics.forEach((metricConfig, index) => {
        const color = colors[index % colors.length];
        const range = ranges[metricConfig.name];
        
        if (range.max === range.min) return;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        dataHistory.forEach((dataPoint, i) => {
            const x = (width / (dataHistory.length - 1)) * i;
            const value = dataPoint[metricConfig.name] || 0;
            const y = height - ((value - range.min) / (range.max - range.min)) * height;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
    });
}

module.exports = {
    WirthForgeDashboard,
    DashboardHeader,
    DashboardGrid,
    DashboardPanel,
    MetricsPanel,
    EnergyVisualization,
    SystemOverview,
    AlertList,
    PerformanceChart,
    ControlPanel,
    AlertPanel,
    CircularProgress
};
