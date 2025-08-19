/**
 * WF-UX-009 Workflow Orchestrator
 * 
 * Advanced workflow execution engine with visual canvas and real-time monitoring
 * Features: Drag-drop workflow builder, parallel execution, error recovery
 * 
 * Performance: 60Hz UI updates, async execution, resource management
 * Dependencies: WF-TECH-003 (Workflow Engine), WF-UX-002 (Progressive Levels)
 */

export class WorkflowOrchestrator {
    constructor(workflowEngine) {
        this.workflowEngine = workflowEngine;
        
        // Canvas and rendering
        this.canvas = null;
        this.ctx = null;
        this.canvasContainer = null;
        
        // Workflow state
        this.currentWorkflow = null;
        this.executionState = new Map();
        this.runningTasks = new Map();
        
        // Visual state
        this.nodes = new Map();
        this.connections = new Map();
        this.selectedItems = new Set();
        this.dragState = null;
        
        // Layout and interaction
        this.zoomLevel = 1.0;
        this.panOffset = { x: 0, y: 0 };
        this.gridSize = 20;
        this.snapToGrid = true;
        
        // Performance tracking
        this.lastUpdateTime = 0;
        this.updateBudget = 16.67; // 60Hz budget
        this.executionMetrics = {
            totalSteps: 0,
            completedSteps: 0,
            failedSteps: 0,
            averageStepTime: 0
        };
        
        // Node templates
        this.nodeTemplates = new Map();
        this.loadNodeTemplates();
        
        // Event listeners
        this.eventListeners = new Map();
        this.setupEventHandlers();
    }

    /**
     * Render the workflow canvas and controls
     */
    renderCanvas() {
        const container = document.createElement('div');
        container.className = 'workflow-orchestrator';
        
        // Create toolbar
        const toolbar = this.createToolbar();
        container.appendChild(toolbar);
        
        // Create main canvas area
        const canvasArea = document.createElement('div');
        canvasArea.className = 'canvas-area';
        
        // Canvas container for proper event handling
        this.canvasContainer = document.createElement('div');
        this.canvasContainer.className = 'canvas-container';
        this.canvasContainer.style.position = 'relative';
        
        // Main workflow canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = 1200;
        this.canvas.height = 800;
        this.canvas.className = 'workflow-canvas';
        
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvasEvents();
        
        this.canvasContainer.appendChild(this.canvas);
        canvasArea.appendChild(this.canvasContainer);
        
        // Node palette
        const palette = this.createNodePalette();
        canvasArea.appendChild(palette);
        
        container.appendChild(canvasArea);
        
        // Status panel
        const statusPanel = this.createStatusPanel();
        container.appendChild(statusPanel);
        
        // Start render loop
        this.startRenderLoop();
        
        return container;
    }

    /**
     * Create workflow toolbar
     */
    createToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'workflow-toolbar';
        
        toolbar.innerHTML = `
            <div class="toolbar-group">
                <button id="new-workflow" class="btn-primary">New Workflow</button>
                <button id="load-workflow" class="btn-secondary">Load</button>
                <button id="save-workflow" class="btn-secondary">Save</button>
            </div>
            <div class="toolbar-group">
                <button id="run-workflow" class="btn-success">▶ Run</button>
                <button id="pause-workflow" class="btn-warning">⏸ Pause</button>
                <button id="stop-workflow" class="btn-danger">⏹ Stop</button>
                <button id="step-workflow" class="btn-info">Step</button>
            </div>
            <div class="toolbar-group">
                <button id="validate-workflow" class="btn-tool">✓ Validate</button>
                <button id="debug-workflow" class="btn-tool">🐛 Debug</button>
                <button id="export-workflow" class="btn-tool">📤 Export</button>
            </div>
            <div class="toolbar-group">
                <label>Zoom: <span id="zoom-level">100%</span></label>
                <button id="zoom-fit" class="btn-tool">Fit</button>
                <label>Grid: 
                    <input type="checkbox" id="snap-to-grid" checked>
                </label>
            </div>
        `;
        
        this.setupToolbarEvents(toolbar);
        return toolbar;
    }

    /**
     * Create node palette for drag-and-drop
     */
    createNodePalette() {
        const palette = document.createElement('div');
        palette.className = 'node-palette';
        
        const paletteHeader = document.createElement('h4');
        paletteHeader.textContent = 'Workflow Nodes';
        palette.appendChild(paletteHeader);
        
        // Create draggable node templates
        this.nodeTemplates.forEach((template, type) => {
            const nodeElement = document.createElement('div');
            nodeElement.className = 'palette-node';
            nodeElement.draggable = true;
            nodeElement.dataset.nodeType = type;
            
            nodeElement.innerHTML = `
                <div class="node-icon">${template.icon}</div>
                <div class="node-label">${template.label}</div>
            `;
            
            nodeElement.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'node-template',
                    nodeType: type
                }));
            });
            
            palette.appendChild(nodeElement);
        });
        
        return palette;
    }

    /**
     * Create status panel for execution monitoring
     */
    createStatusPanel() {
        const panel = document.createElement('div');
        panel.className = 'workflow-status-panel';
        
        panel.innerHTML = `
            <div class="status-header">
                <h4>Execution Status</h4>
                <div class="status-indicators">
                    <span class="status-indicator" id="workflow-status">Idle</span>
                    <span class="performance-indicator" id="performance-status">60 FPS</span>
                </div>
            </div>
            <div class="status-content">
                <div class="metrics-grid">
                    <div class="metric">
                        <label>Total Steps:</label>
                        <span id="total-steps">0</span>
                    </div>
                    <div class="metric">
                        <label>Completed:</label>
                        <span id="completed-steps">0</span>
                    </div>
                    <div class="metric">
                        <label>Failed:</label>
                        <span id="failed-steps">0</span>
                    </div>
                    <div class="metric">
                        <label>Avg Time:</label>
                        <span id="avg-step-time">0ms</span>
                    </div>
                </div>
                <div class="execution-log" id="execution-log">
                    <div class="log-entry">Workflow orchestrator initialized</div>
                </div>
            </div>
        `;
        
        return panel;
    }

    /**
     * Setup canvas event handlers
     */
    setupCanvasEvents() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Drag and drop
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });
        
        this.canvas.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    /**
     * Setup toolbar event handlers
     */
    setupToolbarEvents(toolbar) {
        toolbar.addEventListener('click', (e) => {
            const target = e.target;
            
            switch (target.id) {
                case 'new-workflow':
                    this.createNewWorkflow();
                    break;
                case 'load-workflow':
                    this.loadWorkflow();
                    break;
                case 'save-workflow':
                    this.saveWorkflow();
                    break;
                case 'run-workflow':
                    this.runWorkflow();
                    break;
                case 'pause-workflow':
                    this.pauseWorkflow();
                    break;
                case 'stop-workflow':
                    this.stopWorkflow();
                    break;
                case 'step-workflow':
                    this.stepWorkflow();
                    break;
                case 'validate-workflow':
                    this.validateWorkflow();
                    break;
                case 'debug-workflow':
                    this.debugWorkflow();
                    break;
                case 'export-workflow':
                    this.exportWorkflow();
                    break;
                case 'zoom-fit':
                    this.fitToCanvas();
                    break;
            }
        });
        
        // Snap to grid toggle
        const snapCheckbox = toolbar.querySelector('#snap-to-grid');
        snapCheckbox.addEventListener('change', (e) => {
            this.snapToGrid = e.target.checked;
        });
    }

    /**
     * Start the render loop
     */
    startRenderLoop() {
        const render = (timestamp) => {
            const deltaTime = timestamp - this.lastUpdateTime;
            
            if (deltaTime >= this.updateBudget) {
                const frameStart = performance.now();
                
                this.update(deltaTime);
                this.draw();
                
                const frameTime = performance.now() - frameStart;
                this.updatePerformanceDisplay(frameTime);
                
                this.lastUpdateTime = timestamp;
            }
            
            requestAnimationFrame(render);
        };
        
        requestAnimationFrame(render);
    }

    /**
     * Update workflow state and animations
     */
    update(deltaTime) {
        // Update running tasks
        this.updateRunningTasks(deltaTime);
        
        // Update node animations
        this.updateNodeAnimations(deltaTime);
        
        // Update connection flows
        this.updateConnectionFlows(deltaTime);
        
        // Update execution metrics
        this.updateExecutionMetrics();
    }

    /**
     * Draw the workflow canvas
     */
    draw() {
        if (!this.ctx) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply transformations
        this.ctx.save();
        this.ctx.translate(this.panOffset.x, this.panOffset.y);
        this.ctx.scale(this.zoomLevel, this.zoomLevel);
        
        // Draw grid
        if (this.snapToGrid) {
            this.drawGrid();
        }
        
        // Draw connections first (behind nodes)
        this.drawConnections();
        
        // Draw nodes
        this.drawNodes();
        
        // Draw selection rectangle
        this.drawSelectionRect();
        
        this.ctx.restore();
        
        // Draw UI overlays
        this.drawOverlays();
    }

    /**
     * Draw background grid
     */
    drawGrid() {
        const gridSize = this.gridSize * this.zoomLevel;
        
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    /**
     * Draw workflow nodes
     */
    drawNodes() {
        this.nodes.forEach((node, nodeId) => {
            const isSelected = this.selectedItems.has(nodeId);
            const isRunning = this.runningTasks.has(nodeId);
            const executionState = this.executionState.get(nodeId);
            
            // Node background
            this.ctx.beginPath();
            this.ctx.roundRect(node.x, node.y, node.width, node.height, 8);
            
            // Fill based on state
            if (isRunning) {
                this.ctx.fillStyle = '#FFF3E0'; // Orange tint for running
            } else if (executionState === 'completed') {
                this.ctx.fillStyle = '#E8F5E8'; // Green tint for completed
            } else if (executionState === 'failed') {
                this.ctx.fillStyle = '#FFEBEE'; // Red tint for failed
            } else {
                this.ctx.fillStyle = '#f5f5f5';
            }
            this.ctx.fill();
            
            // Border
            this.ctx.strokeStyle = isSelected ? '#ff6b35' : '#ccc';
            this.ctx.lineWidth = isSelected ? 3 : 1;
            this.ctx.stroke();
            
            // Node icon and label
            this.ctx.fillStyle = '#333';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            
            const centerX = node.x + node.width / 2;
            const centerY = node.y + node.height / 2;
            
            // Icon
            this.ctx.font = '20px Arial';
            this.ctx.fillText(node.icon || '⚙', centerX, centerY - 5);
            
            // Label
            this.ctx.font = '12px Arial';
            this.ctx.fillText(node.label, centerX, centerY + 15);
            
            // Progress indicator for running tasks
            if (isRunning && node.progress !== undefined) {
                const progressWidth = node.width - 10;
                const progressHeight = 4;
                const progressX = node.x + 5;
                const progressY = node.y + node.height - 8;
                
                // Background
                this.ctx.fillStyle = '#ddd';
                this.ctx.fillRect(progressX, progressY, progressWidth, progressHeight);
                
                // Progress
                this.ctx.fillStyle = '#4CAF50';
                this.ctx.fillRect(progressX, progressY, progressWidth * node.progress, progressHeight);
            }
            
            // Connection points
            this.drawConnectionPoints(node);
        });
    }

    /**
     * Draw connections between nodes
     */
    drawConnections() {
        this.connections.forEach((connection, connectionId) => {
            const fromNode = this.nodes.get(connection.from);
            const toNode = this.nodes.get(connection.to);
            
            if (!fromNode || !toNode) return;
            
            const fromPoint = this.getConnectionPoint(fromNode, 'output');
            const toPoint = this.getConnectionPoint(toNode, 'input');
            
            // Connection path (bezier curve)
            this.ctx.beginPath();
            this.ctx.moveTo(fromPoint.x, fromPoint.y);
            
            const controlOffset = 50;
            this.ctx.bezierCurveTo(
                fromPoint.x + controlOffset, fromPoint.y,
                toPoint.x - controlOffset, toPoint.y,
                toPoint.x, toPoint.y
            );
            
            // Style based on connection state
            const isActive = this.isConnectionActive(connectionId);
            this.ctx.strokeStyle = isActive ? '#4CAF50' : '#999';
            this.ctx.lineWidth = isActive ? 3 : 2;
            this.ctx.stroke();
            
            // Arrow head
            this.drawArrowHead(fromPoint, toPoint);
            
            // Data flow animation
            if (isActive) {
                this.drawDataFlow(fromPoint, toPoint, connectionId);
            }
        });
    }

    /**
     * Handle mouse down events
     */
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.panOffset.x) / this.zoomLevel;
        const y = (e.clientY - rect.top - this.panOffset.y) / this.zoomLevel;
        
        // Check for node selection
        const clickedNode = this.getNodeAt(x, y);
        
        if (clickedNode) {
            if (!e.ctrlKey) {
                this.selectedItems.clear();
            }
            this.selectedItems.add(clickedNode.id);
            
            this.dragState = {
                type: 'node',
                nodeId: clickedNode.id,
                startX: x,
                startY: y,
                nodeStartX: clickedNode.x,
                nodeStartY: clickedNode.y
            };
        } else {
            // Start selection or pan
            this.selectedItems.clear();
            this.dragState = {
                type: 'selection',
                startX: x,
                startY: y
            };
        }
    }

    /**
     * Handle drop events for node creation
     */
    handleDrop(e) {
        e.preventDefault();
        
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        
        if (data.type === 'node-template') {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left - this.panOffset.x) / this.zoomLevel;
            const y = (e.clientY - rect.top - this.panOffset.y) / this.zoomLevel;
            
            this.createNode(data.nodeType, x, y);
        }
    }

    /**
     * Create a new workflow node
     */
    createNode(nodeType, x, y) {
        const template = this.nodeTemplates.get(nodeType);
        if (!template) return;
        
        const nodeId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const node = {
            id: nodeId,
            type: nodeType,
            x: this.snapToGrid ? Math.round(x / this.gridSize) * this.gridSize : x,
            y: this.snapToGrid ? Math.round(y / this.gridSize) * this.gridSize : y,
            width: template.width || 120,
            height: template.height || 60,
            label: template.label,
            icon: template.icon,
            inputs: template.inputs || [],
            outputs: template.outputs || [],
            parameters: { ...template.defaultParameters }
        };
        
        this.nodes.set(nodeId, node);
        this.logExecution(`Created ${nodeType} node: ${nodeId}`);
    }

    /**
     * Load default node templates
     */
    loadNodeTemplates() {
        this.nodeTemplates.set('start', {
            label: 'Start',
            icon: '▶',
            width: 100,
            height: 50,
            outputs: ['trigger'],
            defaultParameters: {}
        });
        
        this.nodeTemplates.set('action', {
            label: 'Action',
            icon: '⚙',
            width: 120,
            height: 60,
            inputs: ['trigger'],
            outputs: ['success', 'error'],
            defaultParameters: { timeout: 30000 }
        });
        
        this.nodeTemplates.set('condition', {
            label: 'Condition',
            icon: '◆',
            width: 100,
            height: 60,
            inputs: ['trigger'],
            outputs: ['true', 'false'],
            defaultParameters: { expression: 'true' }
        });
        
        this.nodeTemplates.set('delay', {
            label: 'Delay',
            icon: '⏱',
            width: 100,
            height: 50,
            inputs: ['trigger'],
            outputs: ['trigger'],
            defaultParameters: { duration: 1000 }
        });
        
        this.nodeTemplates.set('parallel', {
            label: 'Parallel',
            icon: '⫸',
            width: 120,
            height: 60,
            inputs: ['trigger'],
            outputs: ['branch1', 'branch2', 'branch3'],
            defaultParameters: { maxConcurrency: 3 }
        });
        
        this.nodeTemplates.set('merge', {
            label: 'Merge',
            icon: '⫷',
            width: 120,
            height: 60,
            inputs: ['input1', 'input2', 'input3'],
            outputs: ['trigger'],
            defaultParameters: { waitForAll: true }
        });
    }

    /**
     * Run the current workflow
     */
    async runWorkflow() {
        if (!this.currentWorkflow) {
            this.logExecution('No workflow to run');
            return;
        }
        
        this.updateStatus('Running');
        this.logExecution('Starting workflow execution');
        
        try {
            await this.workflowEngine.execute(this.currentWorkflow);
            this.updateStatus('Completed');
            this.logExecution('Workflow completed successfully');
        } catch (error) {
            this.updateStatus('Failed');
            this.logExecution(`Workflow failed: ${error.message}`);
        }
    }

    /**
     * Update workflow status display
     */
    updateStatus(status) {
        const statusElement = document.getElementById('workflow-status');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = `status-indicator status-${status.toLowerCase()}`;
        }
    }

    /**
     * Log execution events
     */
    logExecution(message) {
        const logElement = document.getElementById('execution-log');
        if (logElement) {
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.innerHTML = `<span class="timestamp">${new Date().toLocaleTimeString()}</span> ${message}`;
            logElement.appendChild(entry);
            logElement.scrollTop = logElement.scrollHeight;
        }
    }

    /**
     * Update performance display
     */
    updatePerformanceDisplay(frameTime) {
        const fps = Math.round(1000 / Math.max(frameTime, 16.67));
        const perfElement = document.getElementById('performance-status');
        if (perfElement) {
            perfElement.textContent = `${fps} FPS`;
            perfElement.className = fps >= 55 ? 'performance-good' : fps >= 30 ? 'performance-ok' : 'performance-poor';
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Stop any running workflows
        this.stopWorkflow();
        
        // Clear state
        this.nodes.clear();
        this.connections.clear();
        this.selectedItems.clear();
        this.runningTasks.clear();
        this.executionState.clear();
        
        // Remove event listeners
        this.eventListeners.clear();
        
        this.canvas = null;
        this.ctx = null;
    }
}

export default WorkflowOrchestrator;
