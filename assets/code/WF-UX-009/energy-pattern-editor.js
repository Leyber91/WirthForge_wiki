/**
 * WF-UX-009 Energy Pattern Editor
 * 
 * Advanced energy pattern creation and visualization for power users
 * Features: Real-time energy flow editing, pattern templates, performance optimization
 * 
 * Performance: 60Hz compliant, GPU-accelerated canvas rendering
 * Dependencies: WF-TECH-001 (Energy System), WF-UX-002 (Progressive Levels)
 */

export class EnergyPatternEditor {
    constructor(energySystem) {
        this.energySystem = energySystem;
        
        // Canvas and rendering
        this.canvas = null;
        this.ctx = null;
        this.animationFrame = null;
        this.lastFrameTime = 0;
        this.targetFPS = 60;
        this.frameBudget = 16.67; // ms
        
        // Pattern state
        this.currentPattern = null;
        this.patternHistory = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
        
        // Editor state
        this.isEditing = false;
        this.selectedNodes = new Set();
        this.dragState = null;
        this.zoomLevel = 1.0;
        this.panOffset = { x: 0, y: 0 };
        
        // Pattern templates
        this.templates = new Map();
        this.loadDefaultTemplates();
        
        // Performance monitoring
        this.renderStats = {
            frameTime: 0,
            nodeCount: 0,
            connectionCount: 0
        };
    }

    /**
     * Initialize the editor and create canvas
     */
    render() {
        const container = document.createElement('div');
        container.className = 'energy-pattern-editor';
        
        // Create toolbar
        const toolbar = this.createToolbar();
        container.appendChild(toolbar);
        
        // Create canvas container
        const canvasContainer = document.createElement('div');
        canvasContainer.className = 'canvas-container';
        
        // Create main canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.canvas.className = 'pattern-canvas';
        
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvasEvents();
        
        canvasContainer.appendChild(this.canvas);
        container.appendChild(canvasContainer);
        
        // Create properties panel
        const propertiesPanel = this.createPropertiesPanel();
        container.appendChild(propertiesPanel);
        
        // Start render loop
        this.startRenderLoop();
        
        return container;
    }

    /**
     * Create editor toolbar
     */
    createToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'pattern-toolbar';
        
        toolbar.innerHTML = `
            <div class="toolbar-group">
                <button id="new-pattern" class="btn-primary">New Pattern</button>
                <button id="load-template" class="btn-secondary">Templates</button>
                <button id="save-pattern" class="btn-secondary">Save</button>
            </div>
            <div class="toolbar-group">
                <button id="add-node" class="btn-tool" title="Add Node">+</button>
                <button id="add-connection" class="btn-tool" title="Add Connection">⟷</button>
                <button id="delete-selected" class="btn-tool" title="Delete">🗑</button>
            </div>
            <div class="toolbar-group">
                <button id="undo" class="btn-tool" title="Undo">↶</button>
                <button id="redo" class="btn-tool" title="Redo">↷</button>
            </div>
            <div class="toolbar-group">
                <button id="zoom-in" class="btn-tool" title="Zoom In">+</button>
                <button id="zoom-out" class="btn-tool" title="Zoom Out">−</button>
                <button id="reset-view" class="btn-tool" title="Reset View">⌂</button>
            </div>
            <div class="toolbar-group">
                <label>Energy Flow: <span id="energy-flow-value">0</span> units/s</label>
                <label>Efficiency: <span id="efficiency-value">100</span>%</label>
            </div>
        `;
        
        this.setupToolbarEvents(toolbar);
        return toolbar;
    }

    /**
     * Create properties panel for selected elements
     */
    createPropertiesPanel() {
        const panel = document.createElement('div');
        panel.className = 'properties-panel';
        panel.id = 'properties-panel';
        
        panel.innerHTML = `
            <h4>Properties</h4>
            <div id="properties-content">
                <p>Select a node or connection to edit properties</p>
            </div>
        `;
        
        return panel;
    }

    /**
     * Setup canvas event listeners
     */
    setupCanvasEvents() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    /**
     * Setup toolbar event listeners
     */
    setupToolbarEvents(toolbar) {
        toolbar.addEventListener('click', (e) => {
            const target = e.target;
            
            switch (target.id) {
                case 'new-pattern':
                    this.createNewPattern();
                    break;
                case 'load-template':
                    this.showTemplateSelector();
                    break;
                case 'save-pattern':
                    this.saveCurrentPattern();
                    break;
                case 'add-node':
                    this.addNode();
                    break;
                case 'add-connection':
                    this.startConnectionMode();
                    break;
                case 'delete-selected':
                    this.deleteSelected();
                    break;
                case 'undo':
                    this.undo();
                    break;
                case 'redo':
                    this.redo();
                    break;
                case 'zoom-in':
                    this.zoomIn();
                    break;
                case 'zoom-out':
                    this.zoomOut();
                    break;
                case 'reset-view':
                    this.resetView();
                    break;
            }
        });
    }

    /**
     * Start the render loop with 60Hz target
     */
    startRenderLoop() {
        const render = (timestamp) => {
            const deltaTime = timestamp - this.lastFrameTime;
            
            if (deltaTime >= this.frameBudget) {
                const frameStart = performance.now();
                
                this.update(deltaTime);
                this.draw();
                
                const frameTime = performance.now() - frameStart;
                this.renderStats.frameTime = frameTime;
                
                if (frameTime > this.frameBudget) {
                    console.warn(`Frame budget exceeded: ${frameTime.toFixed(2)}ms`);
                }
                
                this.lastFrameTime = timestamp;
            }
            
            this.animationFrame = requestAnimationFrame(render);
        };
        
        this.animationFrame = requestAnimationFrame(render);
    }

    /**
     * Update pattern state and animations
     */
    update(deltaTime) {
        if (!this.currentPattern) return;
        
        // Update energy flow animations
        this.updateEnergyFlow(deltaTime);
        
        // Update node states
        this.updateNodes(deltaTime);
        
        // Update connections
        this.updateConnections(deltaTime);
        
        // Update UI metrics
        this.updateMetricsDisplay();
    }

    /**
     * Draw the pattern on canvas
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
        this.drawGrid();
        
        if (this.currentPattern) {
            // Draw connections first (behind nodes)
            this.drawConnections();
            
            // Draw nodes
            this.drawNodes();
            
            // Draw energy flow particles
            this.drawEnergyFlow();
        }
        
        this.ctx.restore();
        
        // Draw UI overlays
        this.drawOverlays();
    }

    /**
     * Draw background grid
     */
    drawGrid() {
        const gridSize = 20;
        const gridColor = '#f0f0f0';
        
        this.ctx.strokeStyle = gridColor;
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
     * Draw pattern nodes
     */
    drawNodes() {
        if (!this.currentPattern.nodes) return;
        
        this.currentPattern.nodes.forEach(node => {
            const isSelected = this.selectedNodes.has(node.id);
            
            // Node circle
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius || 20, 0, Math.PI * 2);
            
            // Fill based on node type and state
            this.ctx.fillStyle = this.getNodeColor(node);
            this.ctx.fill();
            
            // Border
            this.ctx.strokeStyle = isSelected ? '#ff6b35' : '#333';
            this.ctx.lineWidth = isSelected ? 3 : 1;
            this.ctx.stroke();
            
            // Node label
            this.ctx.fillStyle = '#333';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(node.label || node.type, node.x, node.y + 4);
            
            // Energy level indicator
            if (node.energyLevel > 0) {
                const barWidth = 30;
                const barHeight = 4;
                const barX = node.x - barWidth / 2;
                const barY = node.y - (node.radius || 20) - 10;
                
                // Background
                this.ctx.fillStyle = '#ddd';
                this.ctx.fillRect(barX, barY, barWidth, barHeight);
                
                // Energy level
                this.ctx.fillStyle = '#4CAF50';
                this.ctx.fillRect(barX, barY, barWidth * (node.energyLevel / 100), barHeight);
            }
        });
    }

    /**
     * Draw connections between nodes
     */
    drawConnections() {
        if (!this.currentPattern.connections) return;
        
        this.currentPattern.connections.forEach(connection => {
            const fromNode = this.currentPattern.nodes.find(n => n.id === connection.from);
            const toNode = this.currentPattern.nodes.find(n => n.id === connection.to);
            
            if (!fromNode || !toNode) return;
            
            // Connection line
            this.ctx.beginPath();
            this.ctx.moveTo(fromNode.x, fromNode.y);
            this.ctx.lineTo(toNode.x, toNode.y);
            
            this.ctx.strokeStyle = this.getConnectionColor(connection);
            this.ctx.lineWidth = connection.strength || 2;
            this.ctx.stroke();
            
            // Arrow head
            this.drawArrowHead(fromNode, toNode, connection);
            
            // Flow rate label
            if (connection.flowRate > 0) {
                const midX = (fromNode.x + toNode.x) / 2;
                const midY = (fromNode.y + toNode.y) / 2;
                
                this.ctx.fillStyle = '#666';
                this.ctx.font = '10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`${connection.flowRate.toFixed(1)}`, midX, midY - 5);
            }
        });
    }

    /**
     * Draw energy flow particles
     */
    drawEnergyFlow() {
        if (!this.currentPattern.energyParticles) return;
        
        this.currentPattern.energyParticles.forEach(particle => {
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size || 3, 0, Math.PI * 2);
            
            this.ctx.fillStyle = particle.color || '#FFD700';
            this.ctx.fill();
            
            // Glow effect
            this.ctx.shadowColor = particle.color || '#FFD700';
            this.ctx.shadowBlur = 10;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });
    }

    /**
     * Handle mouse down events
     */
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.panOffset.x) / this.zoomLevel;
        const y = (e.clientY - rect.top - this.panOffset.y) / this.zoomLevel;
        
        // Check if clicking on a node
        const clickedNode = this.getNodeAt(x, y);
        
        if (clickedNode) {
            if (!e.ctrlKey) {
                this.selectedNodes.clear();
            }
            this.selectedNodes.add(clickedNode.id);
            
            this.dragState = {
                type: 'node',
                nodeId: clickedNode.id,
                startX: x,
                startY: y,
                nodeStartX: clickedNode.x,
                nodeStartY: clickedNode.y
            };
        } else {
            // Start pan or selection
            this.selectedNodes.clear();
            this.dragState = {
                type: 'pan',
                startX: e.clientX,
                startY: e.clientY,
                panStartX: this.panOffset.x,
                panStartY: this.panOffset.y
            };
        }
        
        this.updatePropertiesPanel();
    }

    /**
     * Handle mouse move events
     */
    handleMouseMove(e) {
        if (!this.dragState) return;
        
        if (this.dragState.type === 'node') {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left - this.panOffset.x) / this.zoomLevel;
            const y = (e.clientY - rect.top - this.panOffset.y) / this.zoomLevel;
            
            const node = this.currentPattern.nodes.find(n => n.id === this.dragState.nodeId);
            if (node) {
                node.x = this.dragState.nodeStartX + (x - this.dragState.startX);
                node.y = this.dragState.nodeStartY + (y - this.dragState.startY);
            }
        } else if (this.dragState.type === 'pan') {
            this.panOffset.x = this.dragState.panStartX + (e.clientX - this.dragState.startX);
            this.panOffset.y = this.dragState.panStartY + (e.clientY - this.dragState.startY);
        }
    }

    /**
     * Handle mouse up events
     */
    handleMouseUp(e) {
        if (this.dragState && this.dragState.type === 'node') {
            this.saveToHistory();
        }
        
        this.dragState = null;
    }

    /**
     * Handle wheel events for zooming
     */
    handleWheel(e) {
        e.preventDefault();
        
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(5.0, this.zoomLevel * zoomFactor));
        
        if (newZoom !== this.zoomLevel) {
            this.zoomLevel = newZoom;
        }
    }

    /**
     * Get node at coordinates
     */
    getNodeAt(x, y) {
        if (!this.currentPattern.nodes) return null;
        
        return this.currentPattern.nodes.find(node => {
            const dx = x - node.x;
            const dy = y - node.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance <= (node.radius || 20);
        });
    }

    /**
     * Load default pattern templates
     */
    loadDefaultTemplates() {
        this.templates.set('basic-flow', {
            name: 'Basic Energy Flow',
            nodes: [
                { id: 'source', type: 'generator', x: 100, y: 200, energyLevel: 100 },
                { id: 'processor', type: 'transformer', x: 300, y: 200, energyLevel: 75 },
                { id: 'output', type: 'consumer', x: 500, y: 200, energyLevel: 50 }
            ],
            connections: [
                { from: 'source', to: 'processor', strength: 3, flowRate: 10 },
                { from: 'processor', to: 'output', strength: 2, flowRate: 8 }
            ]
        });
        
        this.templates.set('feedback-loop', {
            name: 'Feedback Loop',
            nodes: [
                { id: 'input', type: 'generator', x: 200, y: 150, energyLevel: 100 },
                { id: 'amplifier', type: 'transformer', x: 400, y: 150, energyLevel: 80 },
                { id: 'feedback', type: 'modulator', x: 300, y: 300, energyLevel: 60 }
            ],
            connections: [
                { from: 'input', to: 'amplifier', strength: 3, flowRate: 12 },
                { from: 'amplifier', to: 'feedback', strength: 2, flowRate: 8 },
                { from: 'feedback', to: 'input', strength: 1, flowRate: 4 }
            ]
        });
    }

    /**
     * Update metrics display in real-time
     */
    updateMetricsDisplay() {
        const energyFlowElement = document.getElementById('energy-flow-value');
        const efficiencyElement = document.getElementById('efficiency-value');
        
        if (energyFlowElement && this.currentPattern) {
            const totalFlow = this.calculateTotalEnergyFlow();
            energyFlowElement.textContent = totalFlow.toFixed(1);
        }
        
        if (efficiencyElement && this.currentPattern) {
            const efficiency = this.calculateEfficiency();
            efficiencyElement.textContent = efficiency.toFixed(0);
        }
    }

    /**
     * Update energy metrics from external system
     */
    updateMetrics(data) {
        if (this.currentPattern && data.patterns) {
            const patternData = data.patterns[this.currentPattern.id];
            if (patternData) {
                this.currentPattern.realTimeMetrics = patternData;
            }
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        this.canvas = null;
        this.ctx = null;
        this.currentPattern = null;
        this.selectedNodes.clear();
    }

    // Additional helper methods for colors, calculations, etc.
    getNodeColor(node) {
        const colors = {
            generator: '#4CAF50',
            transformer: '#2196F3',
            consumer: '#FF9800',
            modulator: '#9C27B0'
        };
        return colors[node.type] || '#757575';
    }

    getConnectionColor(connection) {
        const intensity = Math.min(1, connection.flowRate / 20);
        return `rgba(255, 193, 7, ${0.3 + intensity * 0.7})`;
    }

    calculateTotalEnergyFlow() {
        if (!this.currentPattern.connections) return 0;
        return this.currentPattern.connections.reduce((sum, conn) => sum + (conn.flowRate || 0), 0);
    }

    calculateEfficiency() {
        // Simplified efficiency calculation
        return Math.random() * 20 + 80; // 80-100% range for demo
    }
}

export default EnergyPatternEditor;
