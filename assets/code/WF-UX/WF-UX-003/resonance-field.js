/**
 * WIRTHFORGE Resonance Field Visualization
 * WF-UX-003 Energy Visualization - Harmonic Resonance Effect
 * Three.js component for peak consensus visualization
 */

import * as THREE from 'three';

export class ResonanceField {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = {
            radius: options.radius || 5.0,
            harmonics: options.harmonics || 8,
            resonanceFreq: options.resonanceFreq || 2.0,
            fieldStrength: options.fieldStrength || 1.0,
            colorSpectrum: options.colorSpectrum || [
                0x4A90E2, 0x7ED321, 0xF5A623, 0xD0021B,
                0x9013FE, 0x50E3C2, 0xB8E986, 0xF8E71C
            ],
            ...options
        };
        
        this.fieldMesh = null;
        this.particleSystem = null;
        this.time = 0;
        this.energyLevel = 0;
        this.isResonating = false;
        
        this.init();
    }
    
    init() {
        this.createFieldGeometry();
        this.createParticleSystem();
        this.createAudioContext();
    }
    
    createFieldGeometry() {
        // Create spherical field geometry
        const geometry = new THREE.SphereGeometry(this.options.radius, 64, 32);
        
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                energyLevel: { value: 0 },
                harmonics: { value: this.options.harmonics },
                resonanceFreq: { value: this.options.resonanceFreq },
                fieldStrength: { value: this.options.fieldStrength },
                colorSpectrum: { value: this.options.colorSpectrum.map(c => new THREE.Color(c)) },
                opacity: { value: 0.6 }
            },
            vertexShader: `
                uniform float time;
                uniform float energyLevel;
                uniform float harmonics;
                uniform float resonanceFreq;
                uniform float fieldStrength;
                
                varying vec3 vPosition;
                varying vec3 vNormal;
                varying float vResonance;
                varying vec2 vUv;
                
                // Spherical harmonics approximation
                float sphericalHarmonic(vec3 pos, float l, float m) {
                    float theta = acos(pos.z);
                    float phi = atan(pos.y, pos.x);
                    
                    return sin(l * theta + m * phi + time * resonanceFreq);
                }
                
                void main() {
                    vUv = uv;
                    vPosition = position;
                    vNormal = normal;
                    
                    vec3 pos = normalize(position);
                    float resonance = 0.0;
                    
                    // Calculate harmonic resonance
                    for (float l = 1.0; l <= harmonics; l += 1.0) {
                        for (float m = -l; m <= l; m += 1.0) {
                            resonance += sphericalHarmonic(pos, l, m) / (l * l);
                        }
                    }
                    
                    vResonance = resonance * energyLevel * fieldStrength;
                    
                    // Displace vertices based on resonance
                    vec3 displaced = position + normal * vResonance * 0.2;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 colorSpectrum[8];
                uniform float opacity;
                
                varying vec3 vPosition;
                varying vec3 vNormal;
                varying float vResonance;
                varying vec2 vUv;
                
                vec3 getResonanceColor(float resonance) {
                    float normalizedResonance = (resonance + 1.0) * 0.5; // Map [-1,1] to [0,1]
                    float colorIndex = normalizedResonance * 7.0; // 8 colors, index 0-7
                    
                    int index1 = int(floor(colorIndex));
                    int index2 = int(ceil(colorIndex));
                    float blend = fract(colorIndex);
                    
                    index1 = clamp(index1, 0, 7);
                    index2 = clamp(index2, 0, 7);
                    
                    return mix(colorSpectrum[index1], colorSpectrum[index2], blend);
                }
                
                void main() {
                    vec3 color = getResonanceColor(vResonance);
                    
                    // Add fresnel effect for field boundary
                    vec3 viewDirection = normalize(cameraPosition - vPosition);
                    float fresnel = 1.0 - abs(dot(viewDirection, vNormal));
                    fresnel = pow(fresnel, 2.0);
                    
                    // Enhance color with fresnel
                    color = mix(color, vec3(1.0), fresnel * 0.3);
                    
                    // Add pulsing effect
                    float pulse = sin(time * 4.0) * 0.5 + 0.5;
                    color *= (0.8 + pulse * 0.2);
                    
                    // Alpha based on resonance strength and fresnel
                    float alpha = (abs(vResonance) * 0.5 + fresnel * 0.3) * opacity;
                    
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        
        this.fieldMesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.fieldMesh);
    }
    
    createParticleSystem() {
        const particleCount = 1000;
        const geometry = new THREE.BufferGeometry();
        
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const phases = new Float32Array(particleCount);
        
        // Initialize particles in spherical distribution
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Random position within field radius
            const radius = Math.random() * this.options.radius;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = radius * Math.cos(phi);
            
            // Initial velocities
            velocities[i3] = (Math.random() - 0.5) * 0.1;
            velocities[i3 + 1] = (Math.random() - 0.5) * 0.1;
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.1;
            
            phases[i] = Math.random() * Math.PI * 2;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
        
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                energyLevel: { value: 0 },
                resonanceFreq: { value: this.options.resonanceFreq },
                fieldRadius: { value: this.options.radius },
                colorSpectrum: { value: this.options.colorSpectrum.map(c => new THREE.Color(c)) }
            },
            vertexShader: `
                uniform float time;
                uniform float energyLevel;
                uniform float resonanceFreq;
                uniform float fieldRadius;
                
                attribute vec3 velocity;
                attribute float phase;
                
                varying float vEnergy;
                varying float vPhase;
                varying vec3 vPosition;
                
                void main() {
                    vEnergy = energyLevel;
                    vPhase = phase;
                    vPosition = position;
                    
                    // Orbital motion around field center
                    float orbitalSpeed = resonanceFreq * energyLevel;
                    vec3 pos = position;
                    
                    // Add harmonic motion
                    float harmonic = sin(time * orbitalSpeed + phase) * energyLevel * 0.5;
                    pos += normalize(position) * harmonic;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = 3.0 + energyLevel * 5.0;
                }
            `,
            fragmentShader: `
                uniform vec3 colorSpectrum[8];
                
                varying float vEnergy;
                varying float vPhase;
                varying vec3 vPosition;
                
                void main() {
                    // Circular particle shape
                    vec2 coord = gl_PointCoord - vec2(0.5);
                    float dist = length(coord);
                    
                    if (dist > 0.5) discard;
                    
                    // Color based on position and phase
                    float colorIndex = (vPhase / 6.28318) * 7.0;
                    int index = int(floor(colorIndex));
                    vec3 color = colorSpectrum[clamp(index, 0, 7)];
                    
                    // Energy-based brightness
                    color *= (0.5 + vEnergy * 0.5);
                    
                    // Soft edges
                    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
                    alpha *= vEnergy;
                    
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending
        });
        
        this.particleSystem = new THREE.Points(geometry, material);
        this.scene.add(this.particleSystem);
    }
    
    createAudioContext() {
        // Optional: Create audio context for harmonic tones
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.oscillators = [];
        } catch (e) {
            console.warn('Audio context not available for resonance field');
        }
    }
    
    updateEnergyLevel(energyLevel) {
        this.energyLevel = energyLevel;
        
        // Update field material
        if (this.fieldMesh) {
            this.fieldMesh.material.uniforms.energyLevel.value = energyLevel;
        }
        
        // Update particle system
        if (this.particleSystem) {
            this.particleSystem.material.uniforms.energyLevel.value = energyLevel;
        }
        
        // Trigger resonance state
        if (energyLevel > 0.9 && !this.isResonating) {
            this.triggerResonance();
        } else if (energyLevel < 0.8 && this.isResonating) {
            this.stopResonance();
        }
    }
    
    triggerResonance() {
        this.isResonating = true;
        
        // Enhance visual effects
        if (this.fieldMesh) {
            this.fieldMesh.material.uniforms.fieldStrength.value = this.options.fieldStrength * 1.5;
        }
        
        // Play harmonic tones if audio is available
        this.playHarmonicTones();
    }
    
    stopResonance() {
        this.isResonating = false;
        
        // Reset visual effects
        if (this.fieldMesh) {
            this.fieldMesh.material.uniforms.fieldStrength.value = this.options.fieldStrength;
        }
        
        // Stop audio
        this.stopHarmonicTones();
    }
    
    playHarmonicTones() {
        if (!this.audioContext) return;
        
        const baseFreq = 220; // A3
        const harmonicRatios = [1, 2, 3, 4, 5, 6, 7, 8];
        
        this.oscillators = harmonicRatios.map((ratio, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.frequency.setValueAtTime(baseFreq * ratio, this.audioContext.currentTime);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1 / (ratio * ratio), this.audioContext.currentTime);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            return { oscillator, gainNode };
        });
    }
    
    stopHarmonicTones() {
        this.oscillators.forEach(({ oscillator }) => {
            oscillator.stop();
        });
        this.oscillators = [];
    }
    
    update(deltaTime) {
        this.time += deltaTime;
        
        // Update field shader time
        if (this.fieldMesh) {
            this.fieldMesh.material.uniforms.time.value = this.time;
        }
        
        // Update particle system time
        if (this.particleSystem) {
            this.particleSystem.material.uniforms.time.value = this.time;
        }
        
        // Rotate field for dynamic effect
        if (this.fieldMesh) {
            this.fieldMesh.rotation.y += deltaTime * 0.1 * this.energyLevel;
        }
    }
    
    dispose() {
        this.stopHarmonicTones();
        
        if (this.fieldMesh) {
            this.scene.remove(this.fieldMesh);
            this.fieldMesh.geometry.dispose();
            this.fieldMesh.material.dispose();
        }
        
        if (this.particleSystem) {
            this.scene.remove(this.particleSystem);
            this.particleSystem.geometry.dispose();
            this.particleSystem.material.dispose();
        }
        
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
    
    // Accessibility method
    getResonanceDescription() {
        if (this.isResonating) {
            return `Harmonic resonance active - ${this.options.harmonics} harmonic frequencies in perfect alignment`;
        } else if (this.energyLevel > 0.7) {
            return `Approaching resonance - energy level at ${Math.round(this.energyLevel * 100)}%`;
        } else {
            return `Resonance field dormant - energy level at ${Math.round(this.energyLevel * 100)}%`;
        }
    }
}
