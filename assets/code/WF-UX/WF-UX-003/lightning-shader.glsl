// WIRTHFORGE Lightning Effect Shader
// WF-UX-003 Energy Visualization - Lightning Bolt Effect
// Vertex and Fragment shaders for single model energy visualization

// ===== VERTEX SHADER =====
#ifdef VERTEX_SHADER

attribute vec3 position;
attribute vec2 uv;
attribute float intensity;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float time;
uniform float energyLevel;
uniform float jitterAmount;

varying vec2 vUv;
varying float vIntensity;
varying float vEnergy;

// Pseudo-random function for jitter
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
    vUv = uv;
    vIntensity = intensity;
    vEnergy = energyLevel;
    
    vec3 pos = position;
    
    // Add electrical jitter based on energy level
    float jitter = random(position.xy + time) * jitterAmount * energyLevel;
    pos.x += sin(time * 10.0 + position.y * 5.0) * jitter;
    pos.y += cos(time * 8.0 + position.x * 3.0) * jitter * 0.5;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}

#endif

// ===== FRAGMENT SHADER =====
#ifdef FRAGMENT_SHADER

precision highp float;

uniform float time;
uniform float energyLevel;
uniform vec3 baseColor;
uniform vec3 intensityColor;
uniform vec3 fadeColor;
uniform float opacity;
uniform float pulseRate;

varying vec2 vUv;
varying float vIntensity;
varying float vEnergy;

// Noise function for electrical texture
float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    
    float a = fract(sin(dot(i, vec2(12.9898, 78.233))) * 43758.5453123);
    float b = fract(sin(dot(i + vec2(1.0, 0.0), vec2(12.9898, 78.233))) * 43758.5453123);
    float c = fract(sin(dot(i + vec2(0.0, 1.0), vec2(12.9898, 78.233))) * 43758.5453123);
    float d = fract(sin(dot(i + vec2(1.0, 1.0), vec2(12.9898, 78.233))) * 43758.5453123);
    
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Fractal Brownian Motion for complex electrical patterns
float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 0.0;
    
    for (int i = 0; i < 4; i++) {
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= 0.5;
    }
    
    return value;
}

void main() {
    vec2 st = vUv;
    
    // Create electrical core with falloff from center
    float core = 1.0 - abs(st.x - 0.5) * 2.0;
    core = pow(core, 2.0);
    
    // Add electrical noise texture
    float electricNoise = fbm(st * 8.0 + time * 2.0);
    electricNoise += fbm(st * 16.0 - time * 1.5) * 0.5;
    
    // Combine core with noise
    float lightning = core * (0.7 + electricNoise * 0.3);
    
    // Add pulsing based on energy level
    float pulse = sin(time * pulseRate) * 0.5 + 0.5;
    lightning *= (0.8 + pulse * 0.2 * vEnergy);
    
    // Color mixing based on intensity
    vec3 color = mix(fadeColor, baseColor, lightning);
    color = mix(color, intensityColor, lightning * vIntensity * vEnergy);
    
    // Add bright core
    if (lightning > 0.8) {
        color = mix(color, vec3(1.0), (lightning - 0.8) * 5.0);
    }
    
    // Final alpha with energy-based opacity
    float alpha = lightning * opacity * vEnergy;
    
    // Add glow effect
    float glow = exp(-abs(st.x - 0.5) * 8.0);
    alpha += glow * 0.3 * vEnergy;
    
    gl_FragColor = vec4(color, alpha);
}

#endif
