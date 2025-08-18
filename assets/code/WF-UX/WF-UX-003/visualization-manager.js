/**
 * WIRTHFORGE Visualization Manager
 * WF-UX-003 Energy Visualization - Main Integration Component
 * Manages all visualization systems and provides unified API
 */

import * as THREE from 'three';
import { EnergyController } from './energy-controller.js';

export class VisualizationManager {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            width: options.width || container.clientWidth,
            height: options.height || container.clientHeight,
            antialias: options.antialias !== false,
            alpha: options.alpha !== false,
            powerPreference: options.powerPreference || 'high-performance',
            accessibilityMode: options.accessibilityMode || false,
            debugMode: options.debugMode || false,
            ...options
        };
        
        // Core Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // Energy visualization system
        this.energyController = null;
        
        // State management
        this.isInitialized = false;
        this.isRunning = false;
        this.currentEnergyLevel = 0;
        this.modelStates = new Map();
        
        // Event system
        this.eventListeners = new Map();
        
        // Performance monitoring
        this.stats = {
            renderTime: 0,
            triangles: 0,
            geometries: 0,
            textures: 0,
            programs: 0
        };
        
        this.init();
    }
    
    async init() {
        try {
            this.createScene();
            this.createCamera();
            this.createRenderer();
            this.createControls();
            this.createEnergyController();
            this.setupEventListeners();
            this.setupResizeHandler();
            
            this.isInitialized = true;
            this.emit('initialized', { manager: this });
            
        } catch (error) {
            console.error('Failed to initialize VisualizationManager:', error);
            this.emit('error', { error, phase: 'initialization' });
        }
    }
    
    createScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);
        
        // Add ambient lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.2);
        this.scene.add(ambientLight);
        
        // Add directional light for depth
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(10, 10, 5);
        this.scene.add(directionalLight);
    }
    
    createCamera() {
        const aspect = this.options.width / this.options.height;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.camera.position.set(0, 0, 15);
        this.camera.lookAt(0, 0, 0);
    }
    
    createRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: this.options.antialias,
            alpha: this.options.alpha,
            powerPreference: this.options.powerPreference
        });
        
        this.renderer.setSize(this.options.width, this.options.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Enable necessary extensions
        this.renderer.capabilities.logarithmicDepthBuffer = true;
        
        // Append to container
        this.container.appendChild(this.renderer.domElement);
        
        // Add accessibility attributes
        this.renderer.domElement.setAttribute('role', 'img');
        this.renderer.domElement.setAttribute('aria-label', 'WIRTHFORGE Energy Visualization');
        
        if (this.options.accessibilityMode) {
            this.renderer.domElement.setAttribute('tabindex', '0');
        }
    }
    
    createControls() {
        // Simple orbit-like controls for accessibility
        this.controls = {
            enabled: true,
            autoRotate: false,
            autoRotateSpeed: 0.5,
            
            update: () => {
                if (this.controls.autoRotate && this.isRunning) {
                    this.camera.position.x = Math.cos(Date.now() * 0.001 * this.controls.autoRotateSpeed) * 15;
                    this.camera.position.z = Math.sin(Date.now() * 0.001 * this.controls.autoRotateSpeed) * 15;
                    this.camera.lookAt(0, 0, 0);
                }
            }
        };
    }
    
    createEnergyController() {
        this.energyController = new EnergyController(this.scene, this.renderer, {
            targetFPS: 60,
            adaptiveQuality: true,
            accessibilityMode: this.options.accessibilityMode,
            debugMode: this.options.debugMode
        });
        
        this.energyController.setCamera(this.camera);
    }
    
    setupEventListeners() {
        // Keyboard controls for accessibility
        if (this.options.accessibilityMode) {
            this.renderer.domElement.addEventListener('keydown', (event) => {
                this.handleKeyboardInput(event);
            });
        }
        
        // Mouse/touch interactions
        this.renderer.domElement.addEventListener('click', (event) => {
            this.handleClick(event);
        });
        
        // Focus management
        this.renderer.domElement.addEventListener('focus', () => {
            this.emit('focus', { manager: this });
        });
        
        this.renderer.domElement.addEventListener('blur', () => {
            this.emit('blur', { manager: this });
        });
    }
    
    setupResizeHandler() {
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                this.resize(width, height);
            }
        });
        
        resizeObserver.observe(this.container);
        this.resizeObserver = resizeObserver;
    }
    
    handleKeyboardInput(event) {
        switch (event.code) {
            case 'KeyE':
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.toggleEffects();
                }
                break;
                
            case 'KeyT':
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.cycleTheme();
                }
                break;
                
            case 'Equal':
            case 'NumpadAdd':
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.adjustIntensity(0.1);
                }
                break;
                
            case 'Minus':
            case 'NumpadSubtract':
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.adjustIntensity(-0.1);
                }
                break;
                
            case 'Escape':
                event.preventDefault();
                this.emergencyStop();
                break;
        }
    }
    
    handleClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.emit('click', { x, y, event });
    }
    
    // Public API Methods
    
    start() {
        if (!this.isInitialized) {
            console.warn('VisualizationManager not initialized');
            return;
        }
        
        this.isRunning = true;
        this.emit('started', { manager: this });
    }
    
    stop() {
        this.isRunning = false;
        this.emit('stopped', { manager: this });
    }
    
    pause() {
        this.isRunning = false;
        this.emit('paused', { manager: this });
    }
    
    resume() {
        this.isRunning = true;
        this.emit('resumed', { manager: this });
    }
    
    updateEnergyLevel(energyLevel, modelStates = {}) {
        if (!this.isInitialized || !this.energyController) return;
        
        this.currentEnergyLevel = Math.max(0, Math.min(1, energyLevel));
        this.modelStates = new Map(Object.entries(modelStates));
        
        this.energyController.updateEnergyLevel(this.currentEnergyLevel, modelStates);
        
        this.emit('energyUpdated', {
            level: this.currentEnergyLevel,
            modelStates: Object.fromEntries(this.modelStates)
        });
    }
    
    setQualityLevel(level) {
        if (!this.energyController) return;
        
        const validLevels = ['low', 'medium', 'high'];
        if (validLevels.includes(level)) {
            this.energyController.qualityLevel = level;
            this.energyController.applyQualitySettings();
            
            this.emit('qualityChanged', { level });
        }
    }
    
    toggleEffects() {
        // Toggle all effects on/off
        this.scene.traverse((object) => {
            if (object.material && object.material.uniforms) {
                const currentOpacity = object.material.uniforms.opacity?.value || 1;
                if (object.material.uniforms.opacity) {
                    object.material.uniforms.opacity.value = currentOpacity > 0 ? 0 : 0.8;
                }
            }
        });
        
        this.emit('effectsToggled');
    }
    
    cycleTheme() {
        // Cycle through different color themes
        const themes = [
            { name: 'default', bg: 0x0a0a0a },
            { name: 'dark', bg: 0x000000 },
            { name: 'blue', bg: 0x001122 },
            { name: 'purple', bg: 0x110022 }
        ];
        
        const currentBg = this.scene.background.getHex();
        const currentIndex = themes.findIndex(t => t.bg === currentBg);
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];
        
        this.scene.background.setHex(nextTheme.bg);
        
        this.emit('themeChanged', { theme: nextTheme.name });
    }
    
    adjustIntensity(delta) {
        const newLevel = Math.max(0, Math.min(1, this.currentEnergyLevel + delta));
        this.updateEnergyLevel(newLevel, Object.fromEntries(this.modelStates));
    }
    
    emergencyStop() {
        this.stop();
        this.updateEnergyLevel(0, {});
        
        this.emit('emergencyStop');
    }
    
    resize(width, height) {
        if (!this.camera || !this.renderer) return;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
        
        this.emit('resized', { width, height });
    }
    
    // Accessibility Methods
    
    getSystemStatus() {
        if (!this.energyController) return 'System not initialized';
        
        return this.energyController.getSystemDescription();
    }
    
    getPerformanceStats() {
        if (!this.energyController) return null;
        
        return this.energyController.getPerformanceStats();
    }
    
    getEnergyState() {
        if (!this.energyController) return null;
        
        return this.energyController.getEnergyState();
    }
    
    // Event System
    
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    emit(event, data = {}) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }
    
    // Cleanup
    
    dispose() {
        this.stop();
        
        if (this.energyController) {
            this.energyController.dispose();
        }
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        if (this.renderer) {
            this.renderer.dispose();
            if (this.container.contains(this.renderer.domElement)) {
                this.container.removeChild(this.renderer.domElement);
            }
        }
        
        this.eventListeners.clear();
        
        this.emit('disposed', { manager: this });
    }
    
    // Static factory method
    static async create(container, options = {}) {
        const manager = new VisualizationManager(container, options);
        
        // Wait for initialization to complete
        return new Promise((resolve, reject) => {
            manager.on('initialized', () => resolve(manager));
            manager.on('error', ({ error }) => reject(error));
        });
    }
}
