/**
 * WF-UX-009 Advanced Dashboard Component
 * 
 * Provides sophisticated workflow management interface for power users (Level 4+)
 * Features: Real-time energy visualization, workflow orchestration, custom layouts
 * 
 * Performance: 60Hz compliant, <16.67ms frame budget
 * Dependencies: WF-UX-001 (UI Architecture), WF-UX-002 (Progressive Levels)
 */

import { EnergyPatternEditor } from './energy-pattern-editor.js';
import { WorkflowOrchestrator } from './workflow-orchestrator.js';
import { HotkeyManager } from './hotkey-manager.js';

export class AdvancedDashboard {
    constructor(userLevel, energySystem, workflowEngine) {
        this.userLevel = userLevel;
        this.energySystem = energySystem;
        this.workflowEngine = workflowEngine;
        
        // Performance tracking
        this.frameTimer = performance.now();
        this.renderBudget = 16.67; // 60Hz budget in ms
        
        // Component instances
        this.energyEditor = null;
        this.orchestrator = null;
        this.hotkeyManager = null;
        
        // Dashboard state
        this.layout = 'default';
        this.activeWidgets = new Map();
        this.customPanels = [];
        
        // Real-time data streams
        this.energyStream = null;
        this.workflowStream = null;
        this.metricsStream = null;
        
        this.initializeComponents();
        this.setupEventListeners();
    }

    /**
     * Initialize dashboard components based on user level
     */
    initializeComponents() {
        if (this.userLevel < 4) {
            throw new Error('Advanced Dashboard requires User Level 4+');
        }

        // Initialize core components
        this.energyEditor = new EnergyPatternEditor(this.energySystem);
        this.orchestrator = new WorkflowOrchestrator(this.workflowEngine);
        this.hotkeyManager = new HotkeyManager();

        // Setup default layout
        this.setupDefaultLayout();
        
        // Initialize real-time streams
        this.initializeDataStreams();
    }

    /**
     * Setup default dashboard layout with progressive enhancement
     */
    setupDefaultLayout() {
        const layouts = {
            default: {
                panels: ['energy-overview', 'active-workflows', 'system-metrics'],
                grid: { columns: 3, rows: 2 }
            },
            power_user: {
                panels: ['energy-patterns', 'workflow-canvas', 'automation-rules', 'plugin-manager'],
                grid: { columns: 2, rows: 2 }
            },
            expert: {
                panels: ['custom-scripts', 'api-monitor', 'performance-profiler', 'debug-console'],
                grid: { columns: 4, rows: 1 }
            }
        };

        this.layout = this.userLevel >= 5 ? 'expert' : 'power_user';
        this.currentLayout = layouts[this.layout];
        
        this.renderLayout();
    }

    /**
     * Initialize real-time data streams with 60Hz compliance
     */
    initializeDataStreams() {
        // Energy metrics stream (30Hz to preserve bandwidth)
        this.energyStream = new EventSource('/api/energy/stream');
        this.energyStream.onmessage = (event) => {
            this.updateEnergyMetrics(JSON.parse(event.data));
        };

        // Workflow status stream (10Hz for workflow updates)
        this.workflowStream = new EventSource('/api/workflows/stream');
        this.workflowStream.onmessage = (event) => {
            this.updateWorkflowStatus(JSON.parse(event.data));
        };

        // System metrics stream (5Hz for system monitoring)
        this.metricsStream = new EventSource('/api/system/stream');
        this.metricsStream.onmessage = (event) => {
            this.updateSystemMetrics(JSON.parse(event.data));
        };
    }

    /**
     * Render dashboard layout with performance optimization
     */
    renderLayout() {
        const startTime = performance.now();
        
        const container = document.getElementById('advanced-dashboard');
        if (!container) {
            console.error('Dashboard container not found');
            return;
        }

        // Clear existing content
        container.innerHTML = '';
        
        // Create grid layout
        const grid = document.createElement('div');
        grid.className = 'dashboard-grid';
        grid.style.gridTemplateColumns = `repeat(${this.currentLayout.grid.columns}, 1fr)`;
        grid.style.gridTemplateRows = `repeat(${this.currentLayout.grid.rows}, 1fr)`;
        
        // Render panels with time-slicing for performance
        this.renderPanelsAsync(grid, this.currentLayout.panels);
        
        container.appendChild(grid);
        
        // Performance check
        const renderTime = performance.now() - startTime;
        if (renderTime > this.renderBudget) {
            console.warn(`Dashboard render exceeded budget: ${renderTime.toFixed(2)}ms`);
        }
    }

    /**
     * Render panels asynchronously to maintain 60Hz
     */
    async renderPanelsAsync(container, panels) {
        for (let i = 0; i < panels.length; i++) {
            const panel = await this.createPanel(panels[i]);
            container.appendChild(panel);
            
            // Yield control every 2 panels to maintain responsiveness
            if (i % 2 === 1) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
    }

    /**
     * Create individual dashboard panel
     */
    async createPanel(panelType) {
        const panel = document.createElement('div');
        panel.className = `dashboard-panel panel-${panelType}`;
        panel.dataset.panelType = panelType;
        
        const header = document.createElement('div');
        header.className = 'panel-header';
        header.innerHTML = `
            <h3>${this.getPanelTitle(panelType)}</h3>
            <div class="panel-controls">
                <button class="panel-minimize">−</button>
                <button class="panel-close">×</button>
            </div>
        `;
        
        const content = document.createElement('div');
        content.className = 'panel-content';
        
        // Load panel content based on type
        await this.loadPanelContent(content, panelType);
        
        panel.appendChild(header);
        panel.appendChild(content);
        
        // Register panel for updates
        this.activeWidgets.set(panelType, panel);
        
        return panel;
    }

    /**
     * Load content for specific panel type
     */
    async loadPanelContent(container, panelType) {
        switch (panelType) {
            case 'energy-patterns':
                container.appendChild(this.energyEditor.render());
                break;
                
            case 'workflow-canvas':
                container.appendChild(this.orchestrator.renderCanvas());
                break;
                
            case 'automation-rules':
                container.innerHTML = await this.renderAutomationRules();
                break;
                
            case 'plugin-manager':
                container.innerHTML = await this.renderPluginManager();
                break;
                
            case 'custom-scripts':
                container.innerHTML = await this.renderScriptEditor();
                break;
                
            case 'api-monitor':
                container.innerHTML = await this.renderAPIMonitor();
                break;
                
            case 'performance-profiler':
                container.innerHTML = await this.renderPerformanceProfiler();
                break;
                
            case 'debug-console':
                container.innerHTML = await this.renderDebugConsole();
                break;
                
            default:
                container.innerHTML = `<p>Panel type "${panelType}" not implemented</p>`;
        }
    }

    /**
     * Update energy metrics with throttling
     */
    updateEnergyMetrics(data) {
        const now = performance.now();
        if (now - this.lastEnergyUpdate < 33.33) return; // 30Hz throttle
        
        this.lastEnergyUpdate = now;
        
        const energyPanel = this.activeWidgets.get('energy-patterns');
        if (energyPanel && this.energyEditor) {
            this.energyEditor.updateMetrics(data);
        }
    }

    /**
     * Update workflow status
     */
    updateWorkflowStatus(data) {
        const workflowPanel = this.activeWidgets.get('workflow-canvas');
        if (workflowPanel && this.orchestrator) {
            this.orchestrator.updateStatus(data);
        }
    }

    /**
     * Update system metrics
     */
    updateSystemMetrics(data) {
        const metricsPanel = this.activeWidgets.get('performance-profiler');
        if (metricsPanel) {
            this.updatePerformanceDisplay(data);
        }
    }

    /**
     * Setup event listeners for dashboard interactions
     */
    setupEventListeners() {
        // Panel controls
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('panel-minimize')) {
                this.togglePanel(event.target.closest('.dashboard-panel'));
            } else if (event.target.classList.contains('panel-close')) {
                this.closePanel(event.target.closest('.dashboard-panel'));
            }
        });

        // Keyboard shortcuts
        this.hotkeyManager.register('Ctrl+Shift+D', () => this.toggleDashboard());
        this.hotkeyManager.register('Ctrl+Shift+L', () => this.cycleLayout());
        this.hotkeyManager.register('Ctrl+Shift+R', () => this.resetLayout());
    }

    /**
     * Toggle panel minimized state
     */
    togglePanel(panel) {
        panel.classList.toggle('minimized');
        const content = panel.querySelector('.panel-content');
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
    }

    /**
     * Close panel and remove from active widgets
     */
    closePanel(panel) {
        const panelType = panel.dataset.panelType;
        this.activeWidgets.delete(panelType);
        panel.remove();
    }

    /**
     * Cycle through available layouts
     */
    cycleLayout() {
        const layouts = ['default', 'power_user', 'expert'];
        const currentIndex = layouts.indexOf(this.layout);
        const nextIndex = (currentIndex + 1) % layouts.length;
        
        this.layout = layouts[nextIndex];
        this.setupDefaultLayout();
    }

    /**
     * Get panel title for display
     */
    getPanelTitle(panelType) {
        const titles = {
            'energy-patterns': 'Energy Patterns',
            'workflow-canvas': 'Workflow Canvas',
            'automation-rules': 'Automation Rules',
            'plugin-manager': 'Plugin Manager',
            'custom-scripts': 'Script Editor',
            'api-monitor': 'API Monitor',
            'performance-profiler': 'Performance',
            'debug-console': 'Debug Console'
        };
        
        return titles[panelType] || panelType;
    }

    /**
     * Render automation rules panel
     */
    async renderAutomationRules() {
        return `
            <div class="automation-rules">
                <div class="rules-toolbar">
                    <button class="btn-primary" onclick="createAutomationRule()">New Rule</button>
                    <button class="btn-secondary" onclick="importRules()">Import</button>
                </div>
                <div class="rules-list" id="automation-rules-list">
                    <!-- Rules will be loaded dynamically -->
                </div>
            </div>
        `;
    }

    /**
     * Render plugin manager panel
     */
    async renderPluginManager() {
        return `
            <div class="plugin-manager">
                <div class="plugin-toolbar">
                    <button class="btn-primary" onclick="installPlugin()">Install Plugin</button>
                    <button class="btn-secondary" onclick="refreshPlugins()">Refresh</button>
                </div>
                <div class="plugin-list" id="plugin-list">
                    <!-- Plugins will be loaded dynamically -->
                </div>
            </div>
        `;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Close data streams
        if (this.energyStream) this.energyStream.close();
        if (this.workflowStream) this.workflowStream.close();
        if (this.metricsStream) this.metricsStream.close();
        
        // Cleanup components
        if (this.energyEditor) this.energyEditor.destroy();
        if (this.orchestrator) this.orchestrator.destroy();
        if (this.hotkeyManager) this.hotkeyManager.destroy();
        
        // Clear widgets
        this.activeWidgets.clear();
    }
}

// Export for module usage
export default AdvancedDashboard;
