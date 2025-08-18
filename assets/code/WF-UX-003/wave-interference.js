/**
 * WIRTHFORGE Wave Interference Visualization
 * WF-UX-003 Energy Visualization - Wave Pattern Generator
 * Three.js component for model disagreement visualization
 */

import * as THREE from 'three';

export class WaveInterference {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = {
            gridSize: options.gridSize || 128,
            waveCount: options.waveCount || 4,
            amplitude: options.amplitude || 1.0,
            frequency: options.frequency || 2.0,
            speed: options.speed || 1.0,
            ...options
        };
        
        this.waves = [];
        this.geometry = null;
        this.material = null;
        this.mesh = null;
        this.time = 0;
        
        this.init();
    }
    
    init() {
        this.createGeometry();
        this.createMaterial();
        this.createMesh();
        this.generateWaves();
    }
    
    createGeometry() {
        const size = this.options.gridSize;
        this.geometry = new THREE.PlaneGeometry(10, 10, size - 1, size - 1);
        
        // Store original positions for wave calculation
        this.originalPositions = new Float32Array(this.geometry.attributes.position.array);
    }
    
    createMaterial() {
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                energyLevel: { value: 0 },
                constructiveColor: { value: new THREE.Color(0x00ff88) },
                destructiveColor: { value: new THREE.Color(0xff4444) },
                neutralColor: { value: new THREE.Color(0x4488ff) },
                opacity: { value: 0.8 },
                waveData: { value: new Float32Array(16) } // 4 waves * 4 params each
            },
            vertexShader: `
                uniform float time;
                uniform float energyLevel;
                uniform float waveData[16];
                
                varying vec3 vPosition;
                varying float vWaveHeight;
                varying vec2 vUv;
                
                float calculateWave(vec2 pos, int waveIndex) {
                    int baseIndex = waveIndex * 4;
                    float amplitude = waveData[baseIndex];
                    float frequency = waveData[baseIndex + 1];
                    vec2 center = vec2(waveData[baseIndex + 2], waveData[baseIndex + 3]);
                    
                    float distance = length(pos - center);
                    return amplitude * sin(frequency * distance - time * 3.0);
                }
                
                void main() {
                    vUv = uv;
                    vPosition = position;
                    
                    vec2 pos = position.xy;
                    float totalHeight = 0.0;
                    
                    // Calculate interference from all waves
                    for (int i = 0; i < 4; i++) {
                        totalHeight += calculateWave(pos, i);
                    }
                    
                    vWaveHeight = totalHeight * energyLevel;
                    
                    vec3 newPosition = position;
                    newPosition.z = vWaveHeight * 0.5;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 constructiveColor;
                uniform vec3 destructiveColor;
                uniform vec3 neutralColor;
                uniform float opacity;
                
                varying vec3 vPosition;
                varying float vWaveHeight;
                varying vec2 vUv;
                
                void main() {
                    float height = vWaveHeight;
                    vec3 color;
                    
                    if (height > 0.1) {
                        // Constructive interference - models agree
                        float intensity = clamp(height / 2.0, 0.0, 1.0);
                        color = mix(neutralColor, constructiveColor, intensity);
                    } else if (height < -0.1) {
                        // Destructive interference - models disagree
                        float intensity = clamp(abs(height) / 2.0, 0.0, 1.0);
                        color = mix(neutralColor, destructiveColor, intensity);
                    } else {
                        // Neutral zone
                        color = neutralColor;
                    }
                    
                    // Add grid lines for clarity
                    vec2 grid = abs(fract(vUv * 20.0) - 0.5);
                    float gridLine = 1.0 - min(grid.x, grid.y) * 20.0;
                    color = mix(color, vec3(1.0), gridLine * 0.1);
                    
                    gl_FragColor = vec4(color, opacity);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });
    }
    
    createMesh() {
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.rotation.x = -Math.PI / 2; // Lay flat
        this.scene.add(this.mesh);
    }
    
    generateWaves() {
        this.waves = [];
        const waveData = new Float32Array(16);
        
        for (let i = 0; i < this.options.waveCount; i++) {
            const wave = {
                amplitude: this.options.amplitude * (0.5 + Math.random() * 0.5),
                frequency: this.options.frequency * (0.8 + Math.random() * 0.4),
                center: {
                    x: (Math.random() - 0.5) * 8,
                    y: (Math.random() - 0.5) * 8
                },
                phase: Math.random() * Math.PI * 2
            };
            
            this.waves.push(wave);
            
            // Pack wave data for shader
            const baseIndex = i * 4;
            waveData[baseIndex] = wave.amplitude;
            waveData[baseIndex + 1] = wave.frequency;
            waveData[baseIndex + 2] = wave.center.x;
            waveData[baseIndex + 3] = wave.center.y;
        }
        
        this.material.uniforms.waveData.value = waveData;
    }
    
    updateEnergyLevel(energyLevel) {
        this.material.uniforms.energyLevel.value = energyLevel;
        
        // Adjust wave parameters based on energy
        if (energyLevel > 0.8) {
            // High energy - more chaotic waves (disagreement)
            this.adjustWaveFrequencies(1.5);
        } else if (energyLevel > 0.5) {
            // Medium energy - moderate interference
            this.adjustWaveFrequencies(1.2);
        } else {
            // Low energy - gentle waves
            this.adjustWaveFrequencies(1.0);
        }
    }
    
    adjustWaveFrequencies(multiplier) {
        const waveData = this.material.uniforms.waveData.value;
        
        for (let i = 0; i < this.options.waveCount; i++) {
            const baseIndex = i * 4;
            waveData[baseIndex + 1] = this.waves[i].frequency * multiplier;
        }
        
        this.material.uniforms.waveData.needsUpdate = true;
    }
    
    setColors(constructive, destructive, neutral) {
        this.material.uniforms.constructiveColor.value.setHex(constructive);
        this.material.uniforms.destructiveColor.value.setHex(destructive);
        this.material.uniforms.neutralColor.value.setHex(neutral);
    }
    
    setOpacity(opacity) {
        this.material.uniforms.opacity.value = opacity;
    }
    
    update(deltaTime) {
        this.time += deltaTime * this.options.speed;
        this.material.uniforms.time.value = this.time;
        
        // Animate wave centers for dynamic interference patterns
        const waveData = this.material.uniforms.waveData.value;
        
        for (let i = 0; i < this.options.waveCount; i++) {
            const baseIndex = i * 4;
            const wave = this.waves[i];
            
            // Slowly move wave centers
            wave.center.x += Math.sin(this.time * 0.1 + wave.phase) * 0.01;
            wave.center.y += Math.cos(this.time * 0.15 + wave.phase) * 0.01;
            
            // Keep waves within bounds
            wave.center.x = Math.max(-4, Math.min(4, wave.center.x));
            wave.center.y = Math.max(-4, Math.min(4, wave.center.y));
            
            waveData[baseIndex + 2] = wave.center.x;
            waveData[baseIndex + 3] = wave.center.y;
        }
        
        this.material.uniforms.waveData.needsUpdate = true;
    }
    
    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
        }
        if (this.geometry) {
            this.geometry.dispose();
        }
        if (this.material) {
            this.material.dispose();
        }
    }
    
    // Accessibility method - get current interference description
    getInterferenceDescription() {
        const energyLevel = this.material.uniforms.energyLevel.value;
        
        if (energyLevel > 0.8) {
            return "High interference detected - significant model disagreement";
        } else if (energyLevel > 0.5) {
            return "Moderate interference - models showing some disagreement";
        } else if (energyLevel > 0.2) {
            return "Low interference - models mostly in agreement";
        } else {
            return "Minimal interference - models in consensus";
        }
    }
}
