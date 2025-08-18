// WIRTHFORGE Particle System Shader
// WF-UX-003 Energy Visualization - Multi-Model Particle Stream
// Vertex and Fragment shaders for collaborative energy visualization

// ===== VERTEX SHADER =====
#ifdef VERTEX_SHADER

attribute vec3 position;
attribute vec2 uv;
attribute float life;
attribute float size;
attribute vec3 velocity;
attribute float modelId;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float time;
uniform float energyLevel;
uniform float particleScale;
uniform vec3 gravity;

varying vec2 vUv;
varying float vLife;
varying float vSize;
varying float vModelId;
varying float vEnergy;

void main() {
    vUv = uv;
    vLife = life;
    vSize = size * particleScale;
    vModelId = modelId;
    vEnergy = energyLevel;
    
    vec3 pos = position;
    
    // Apply physics simulation
    pos += velocity * time;
    pos += gravity * time * time * 0.5;
    
    // Add energy-based turbulence
    float turbulence = sin(time * 3.0 + modelId * 10.0) * energyLevel * 0.1;
    pos.x += turbulence;
    pos.y += cos(time * 2.5 + modelId * 8.0) * energyLevel * 0.05;
    
    // Size attenuation based on life and energy
    float sizeMultiplier = mix(0.1, 1.0, life) * (0.5 + energyLevel * 0.5);
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = vSize * sizeMultiplier;
}

#endif

// ===== FRAGMENT SHADER =====
#ifdef FRAGMENT_SHADER

precision highp float;

uniform float time;
uniform float energyLevel;
uniform vec3 startColor;
uniform vec3 endColor;
uniform sampler2D particleTexture;
uniform float opacity;
uniform float modelCount;

varying vec2 vUv;
varying float vLife;
varying float vSize;
varying float vModelId;
varying float vEnergy;

// Color palette for different models
vec3 getModelColor(float modelId) {
    float normalizedId = modelId / modelCount;
    
    // HSV to RGB conversion for model-specific colors
    float hue = normalizedId * 6.28318; // Full color wheel
    float saturation = 0.8;
    float value = 0.9;
    
    vec3 c = vec3(hue, saturation, value);
    vec4 k = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + k.xyz) * 6.0 - k.www);
    return c.z * mix(k.xxx, clamp(p - k.xxx, 0.0, 1.0), c.y);
}

// Particle shape function
float particleShape(vec2 coord) {
    vec2 center = coord - 0.5;
    float dist = length(center);
    
    // Soft circular particle with energy-based core
    float core = 1.0 - smoothstep(0.0, 0.3, dist);
    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    
    return core + glow * 0.3 * vEnergy;
}

void main() {
    vec2 coord = gl_PointCoord;
    
    // Get particle shape
    float shape = particleShape(coord);
    
    if (shape < 0.01) {
        discard;
    }
    
    // Model-specific color
    vec3 modelColor = getModelColor(vModelId);
    
    // Life-based color transition
    vec3 color = mix(startColor, endColor, vLife);
    color = mix(color, modelColor, 0.6);
    
    // Energy-based intensity
    color *= (0.7 + vEnergy * 0.3);
    
    // Add sparkle effect for high energy
    if (vEnergy > 0.8) {
        float sparkle = sin(time * 10.0 + vModelId * 20.0) * 0.5 + 0.5;
        color += vec3(sparkle * 0.3);
    }
    
    // Collaboration indicator - particles from different models interact
    float collaboration = sin(time * 2.0 + vModelId * 5.0) * 0.5 + 0.5;
    color = mix(color, vec3(1.0, 1.0, 0.8), collaboration * 0.2 * vEnergy);
    
    // Final alpha with life and shape
    float alpha = shape * opacity * vLife * (0.5 + vEnergy * 0.5);
    
    gl_FragColor = vec4(color, alpha);
}

#endif
