/**
 * WIRTHFORGE Energy Visualization Controller
 * WF-UX-003 Energy Visualization - Main Animation Controller
 * Orchestrates all energy effects and manages performance
 */

import { WaveInterference } from './wave-interference.js';
import { ResonanceField } from './resonance-field.js';

export class EnergyController {
    constructor(scene, renderer, options = {}) {
        this.scene = scene;
        this.renderer = renderer;
        this.options = {
            targetFPS: options.targetFPS || 60,
            adaptiveQuality: options.adaptiveQuality !== false,
            accessibilityMode: options.accessibilityMode || false,
            debugMode: options.debugMode || false,
            ...options
        };
        
        // Performance monitoring
        this.frameTime = 16.67; // Target 60fps
        this.frameTimes = [];
        this.qualityLevel = 'high';
        this.performanceStats = {
            fps: 60,
            frameTime: 16.67,
            gpuMemory: 0,
            drawCalls: 0
        };
        
        // Energy state
        this.energyLevel = 0;
        this.modelStates = new Map();
        this.effectInstances = new Map();
        
        // Animation systems
        this.clock = new THREE.Clock();
        this.animationId = null;
        
        // Accessibility
        this.ariaLiveRegion = null;
        this.lastAnnouncement = '';
        this.announcementThrottle = 1000; // 1 second
        
        this.init();
    }
    
    init() {
        this.setupPerformanceMonitoring();
        this.setupAccessibility();
        this.createEffectSystems();
        this.startAnimationLoop();
    }
    
    setupPerformanceMonitoring() {
        // Create performance monitor
        this.performanceMonitor = {
            frameCount: 0,
            lastTime: performance.now(),
            
            update: () => {
                const now = performance.now();
                const deltaTime = now - this.performanceMonitor.lastTime;
                
                this.frameTimes.push(deltaTime);
                if (this.frameTimes.length > 60) {
                    this.frameTimes.shift();
                }
                
                // Calculate average FPS
                const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
                this.performanceStats.fps = 1000 / avgFrameTime;
                this.performanceStats.frameTime = avgFrameTime;
                
                this.performanceMonitor.lastTime = now;
                this.performanceMonitor.frameCount++;
                
                // Adaptive quality adjustment
                if (this.options.adaptiveQuality) {
                    this.adjustQuality();
                }
            }
        };
    }
    
    setupAccessibility() {
        if (this.options.accessibilityMode) {
            // Create ARIA live region for screen readers
            this.ariaLiveRegion = document.createElement('div');
            this.ariaLiveRegion.setAttribute('aria-live', 'polite');
            this.ariaLiveRegion.setAttribute('aria-label', 'Energy visualization status');
            this.ariaLiveRegion.style.position = 'absolute';
            this.ariaLiveRegion.style.left = '-10000px';
            this.ariaLiveRegion.style.width = '1px';
            this.ariaLiveRegion.style.height = '1px';
            this.ariaLiveRegion.style.overflow = 'hidden';
            document.body.appendChild(this.ariaLiveRegion);
        }
    }
    
    createEffectSystems() {
        // Lightning effect for single model processing
        this.lightningSystem = this.createLightningSystem();
        
        // Particle system for multi-model collaboration
        this.particleSystem = this.createParticleSystem();
        
        // Wave interference for model disagreement
        this.waveSystem = new WaveInterference(this.scene, {
            gridSize: this.getQualityBasedValue(128, 64, 32),
            waveCount: this.getQualityBasedValue(4, 3, 2)
        });
        
        // Resonance field for peak consensus
        this.resonanceSystem = new ResonanceField(this.scene, {
            harmonics: this.getQualityBasedValue(8, 6, 4),
            radius: 5.0
        });
        
        this.effectInstances.set('lightning', this.lightningSystem);
        this.effectInstances.set('particles', this.particleSystem);
        this.effectInstances.set('waves', this.waveSystem);
        this.effectInstances.set('resonance', this.resonanceSystem);
    }
    
    createLightningSystem() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(200 * 3); // 100 segments
        const intensities = new Float32Array(100);
        
        // Create zigzag lightning path
        for (let i = 0; i < 100; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 0.5; // x
            positions[i3 + 1] = (i / 99) * 10 - 5; // y (vertical)
            positions[i3 + 2] = 0; // z
            
            intensities[i] = Math.random();
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('intensity', new THREE.BufferAttribute(intensities, 1));
        
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                energyLevel: { value: 0 },
                baseColor: { value: new THREE.Color(0x4A90E2) },
                intensityColor: { value: new THREE.Color(0xFFFFFF) },
                fadeColor: { value: new THREE.Color(0x1A4A7A) },
                opacity: { value: 0.8 },
                jitterAmount: { value: 0.1 },
                pulseRate: { value: 5.0 }
            },
            vertexShader: `
                attribute float intensity;
                uniform float time;
                uniform float energyLevel;
                uniform float jitterAmount;
                
                varying float vIntensity;
                varying float vEnergy;
                
                float random(vec2 st) {
                    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
                }
                
                void main() {
                    vIntensity = intensity;
                    vEnergy = energyLevel;
                    
                    vec3 pos = position;
                    
                    // Add electrical jitter
                    float jitter = random(position.xy + time) * jitterAmount * energyLevel;
                    pos.x += sin(time * 10.0 + position.y * 5.0) * jitter;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = 3.0 + energyLevel * 5.0;
                }
            `,
            fragmentShader: `
                uniform vec3 baseColor;
                uniform vec3 intensityColor;
                uniform float opacity;
                uniform float time;
                uniform float pulseRate;
                
                varying float vIntensity;
                varying float vEnergy;
                
                void main() {
                    vec3 color = mix(baseColor, intensityColor, vIntensity * vEnergy);
                    
                    // Add pulsing
                    float pulse = sin(time * pulseRate) * 0.5 + 0.5;
                    color *= (0.8 + pulse * 0.2);
                    
                    gl_FragColor = vec4(color, opacity * vEnergy);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending
        });
        
        return new THREE.Points(geometry, material);
    }
    
    createParticleSystem() {
        const particleCount = this.getQualityBasedValue(1000, 500, 250);
        const geometry = new THREE.BufferGeometry();
        
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const life = new Float32Array(particleCount);
        const modelIds = new Float32Array(particleCount);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Random starting positions
            positions[i3] = (Math.random() - 0.5) * 10;
            positions[i3 + 1] = (Math.random() - 0.5) * 10;
            positions[i3 + 2] = (Math.random() - 0.5) * 10;
            
            // Random velocities
            velocities[i3] = (Math.random() - 0.5) * 2;
            velocities[i3 + 1] = (Math.random() - 0.5) * 2;
            velocities[i3 + 2] = (Math.random() - 0.5) * 2;
            
            life[i] = Math.random();
            modelIds[i] = Math.floor(Math.random() * 4); // 4 models max
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        geometry.setAttribute('life', new THREE.BufferAttribute(life, 1));
        geometry.setAttribute('modelId', new THREE.BufferAttribute(modelIds, 1));
        
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                energyLevel: { value: 0 },
                startColor: { value: new THREE.Color(0x4A90E2) },
                endColor: { value: new THREE.Color(0x7ED321) },
                opacity: { value: 0.7 },
                modelCount: { value: 4 }
            },
            vertexShader: `
                attribute vec3 velocity;
                attribute float life;
                attribute float modelId;
                
                uniform float time;
                uniform float energyLevel;
                
                varying float vLife;
                varying float vModelId;
                varying float vEnergy;
                
                void main() {
                    vLife = life;
                    vModelId = modelId;
                    vEnergy = energyLevel;
                    
                    vec3 pos = position + velocity * time * energyLevel;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = 2.0 + energyLevel * 4.0;
                }
            `,
            fragmentShader: `
                uniform vec3 startColor;
                uniform vec3 endColor;
                uniform float opacity;
                uniform float modelCount;
                
                varying float vLife;
                varying float vModelId;
                varying float vEnergy;
                
                vec3 getModelColor(float modelId) {
                    float hue = (modelId / modelCount) * 6.28318;
                    return vec3(
                        sin(hue) * 0.5 + 0.5,
                        sin(hue + 2.094) * 0.5 + 0.5,
                        sin(hue + 4.188) * 0.5 + 0.5
                    );
                }
                
                void main() {
                    vec2 coord = gl_PointCoord - vec2(0.5);
                    float dist = length(coord);
                    
                    if (dist > 0.5) discard;
                    
                    vec3 modelColor = getModelColor(vModelId);
                    vec3 color = mix(startColor, endColor, vLife);
                    color = mix(color, modelColor, 0.5);
                    
                    float alpha = (1.0 - dist * 2.0) * opacity * vLife * vEnergy;
                    
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending
        });
        
        return new THREE.Points(geometry, material);
    }
    
    getQualityBasedValue(high, medium, low) {
        switch (this.qualityLevel) {
            case 'high': return high;
            case 'medium': return medium;
            case 'low': return low;
            default: return medium;
        }
    }
    
    adjustQuality() {
        const targetFrameTime = 1000 / this.options.targetFPS;
        const currentFrameTime = this.performanceStats.frameTime;
        
        if (currentFrameTime > targetFrameTime * 1.2 && this.qualityLevel !== 'low') {
            // Performance is poor, reduce quality
            if (this.qualityLevel === 'high') {
                this.qualityLevel = 'medium';
            } else {
                this.qualityLevel = 'low';
            }
            this.applyQualitySettings();
        } else if (currentFrameTime < targetFrameTime * 0.8 && this.qualityLevel !== 'high') {
            // Performance is good, increase quality
            if (this.qualityLevel === 'low') {
                this.qualityLevel = 'medium';
            } else {
                this.qualityLevel = 'high';
            }
            this.applyQualitySettings();
        }
    }
    
    applyQualitySettings() {
        // Adjust particle counts and shader complexity based on quality level
        const particleMultiplier = this.getQualityBasedValue(1.0, 0.7, 0.4);
        
        // Update existing systems with new quality settings
        if (this.waveSystem) {
            this.waveSystem.options.gridSize = this.getQualityBasedValue(128, 64, 32);
        }
        
        if (this.resonanceSystem) {
            this.resonanceSystem.options.harmonics = this.getQualityBasedValue(8, 6, 4);
        }
    }
    
    updateEnergyLevel(energyLevel, modelStates = {}) {
        this.energyLevel = energyLevel;
        this.modelStates = new Map(Object.entries(modelStates));
        
        // Update all effect systems
        this.effectInstances.forEach((effect, name) => {
            if (effect.updateEnergyLevel) {
                effect.updateEnergyLevel(energyLevel);
            } else if (effect.material && effect.material.uniforms.energyLevel) {
                effect.material.uniforms.energyLevel.value = energyLevel;
            }
        });
        
        // Update accessibility announcements
        this.updateAccessibilityAnnouncements(energyLevel, modelStates);
    }
    
    updateAccessibilityAnnouncements(energyLevel, modelStates) {
        if (!this.ariaLiveRegion) return;
        
        const now = Date.now();
        if (now - this.lastAnnouncementTime < this.announcementThrottle) return;
        
        let announcement = '';
        
        if (energyLevel > 0.9) {
            announcement = 'Peak energy achieved - models in perfect resonance';
        } else if (energyLevel > 0.7) {
            announcement = `High energy level at ${Math.round(energyLevel * 100)}%`;
        } else if (energyLevel > 0.3) {
            announcement = `Moderate energy level at ${Math.round(energyLevel * 100)}%`;
        } else {
            announcement = `Low energy level at ${Math.round(energyLevel * 100)}%`;
        }
        
        // Add model state information
        const activeModels = Object.values(modelStates).filter(state => state.active).length;
        if (activeModels > 1) {
            announcement += ` - ${activeModels} models collaborating`;
        }
        
        if (announcement !== this.lastAnnouncement) {
            this.ariaLiveRegion.textContent = announcement;
            this.lastAnnouncement = announcement;
            this.lastAnnouncementTime = now;
        }
    }
    
    startAnimationLoop() {
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);
            
            const deltaTime = this.clock.getDelta();
            const time = this.clock.getElapsedTime();
            
            // Update performance monitoring
            this.performanceMonitor.update();
            
            // Update all effect systems
            this.effectInstances.forEach((effect) => {
                if (effect.update) {
                    effect.update(deltaTime);
                } else if (effect.material && effect.material.uniforms.time) {
                    effect.material.uniforms.time.value = time;
                }
            });
            
            // Render scene
            this.renderer.render(this.scene, this.camera);
        };
        
        animate();
    }
    
    setCamera(camera) {
        this.camera = camera;
    }
    
    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        this.effectInstances.forEach((effect) => {
            if (effect.dispose) {
                effect.dispose();
            }
        });
        
        if (this.ariaLiveRegion) {
            document.body.removeChild(this.ariaLiveRegion);
        }
    }
    
    // Debug and monitoring methods
    getPerformanceStats() {
        return { ...this.performanceStats };
    }
    
    getEnergyState() {
        return {
            level: this.energyLevel,
            models: Object.fromEntries(this.modelStates),
            qualityLevel: this.qualityLevel
        };
    }
    
    // Accessibility methods
    getSystemDescription() {
        const descriptions = [];
        
        this.effectInstances.forEach((effect, name) => {
            if (effect.getInterferenceDescription) {
                descriptions.push(effect.getInterferenceDescription());
            } else if (effect.getResonanceDescription) {
                descriptions.push(effect.getResonanceDescription());
            }
        });
        
        return descriptions.join('. ');
    }
}
