/**
 * WF-UX-001 Animation Utilities
 * WIRTHFORGE UI Animation System - Utilities for energy visualization
 */

import { useCallback, useRef, useEffect } from 'react';

// Animation timing utilities
export const AnimationTiming = {
  FRAME_BUDGET_MS: 16.67, // 60fps budget
  ENERGY_PULSE_MS: 100,
  TOKEN_FLOW_MS: 200,
  
  // Easing functions
  easeOut: (t: number): number => 1 - Math.pow(1 - t, 3),
  easeIn: (t: number): number => t * t * t,
  easeInOut: (t: number): number => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  bounce: (t: number): number => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  energyFlow: (t: number): number => 1 - Math.cos((t * Math.PI) / 2)
};

// Performance-aware animation frame manager
export class AnimationFrameManager {
  private frameId: number | null = null;
  private lastFrameTime = 0;
  private frameTimeHistory: number[] = [];
  private maxHistoryLength = 60; // Track last 60 frames
  
  start(callback: (deltaTime: number) => void, respectsReducedMotion = false): void {
    if (respectsReducedMotion) {
      // Run once for static display
      callback(0);
      return;
    }
    
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - this.lastFrameTime;
      
      // Track frame performance
      this.frameTimeHistory.push(deltaTime);
      if (this.frameTimeHistory.length > this.maxHistoryLength) {
        this.frameTimeHistory.shift();
      }
      
      // Only proceed if within frame budget or first frame
      if (deltaTime >= AnimationTiming.FRAME_BUDGET_MS || this.lastFrameTime === 0) {
        this.lastFrameTime = currentTime;
        callback(deltaTime);
      }
      
      this.frameId = requestAnimationFrame(animate);
    };
    
    this.frameId = requestAnimationFrame(animate);
  }
  
  stop(): void {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }
  
  getAverageFrameTime(): number {
    if (this.frameTimeHistory.length === 0) return 0;
    return this.frameTimeHistory.reduce((sum, time) => sum + time, 0) / this.frameTimeHistory.length;
  }
  
  getCurrentFPS(): number {
    const avgFrameTime = this.getAverageFrameTime();
    return avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
  }
}

// Energy-based animation controller
export class EnergyAnimationController {
  private intensity = 0;
  private targetIntensity = 0;
  private smoothingFactor = 0.1;
  
  setTargetIntensity(value: number): void {
    this.targetIntensity = Math.max(0, Math.min(1, value));
  }
  
  update(deltaTime: number): number {
    // Smooth interpolation towards target
    const dt = deltaTime * 0.001; // Convert to seconds
    const diff = this.targetIntensity - this.intensity;
    this.intensity += diff * this.smoothingFactor * dt * 60; // Normalize for 60fps
    
    return this.intensity;
  }
  
  getCurrentIntensity(): number {
    return this.intensity;
  }
  
  // Generate pulsing effect based on token speed
  getPulseIntensity(tokenSpeed: number, time: number): number {
    const baseIntensity = Math.min(1, tokenSpeed / 100);
    const pulseFreq = Math.max(0.5, tokenSpeed / 50); // Faster pulse for higher speed
    const pulse = Math.sin(time * 0.001 * pulseFreq * Math.PI * 2) * 0.5 + 0.5;
    return baseIntensity * (0.7 + pulse * 0.3);
  }
}

// Lightning bolt path generator
export class LightningPathGenerator {
  generatePath(
    startX: number, 
    startY: number, 
    endX: number, 
    endY: number, 
    intensity: number,
    segments = 12
  ): Array<{x: number, y: number, intensity: number}> {
    const points = [];
    const totalDistance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    const jitterScale = totalDistance * 0.1 * (intensity / 100);
    
    for (let i = 0; i <= segments; i++) {
      const progress = i / segments;
      const baseX = startX + (endX - startX) * progress;
      const baseY = startY + (endY - startY) * progress;
      
      // Add jagged variations
      const jitterX = (Math.random() - 0.5) * jitterScale * (1 - progress * 0.3);
      const jitterY = (Math.random() - 0.5) * jitterScale * 0.5;
      
      points.push({
        x: baseX + jitterX,
        y: baseY + jitterY,
        intensity: intensity * (0.8 + Math.random() * 0.4)
      });
    }
    
    return points;
  }
  
  // Generate branching lightning
  generateBranches(
    mainPath: Array<{x: number, y: number, intensity: number}>,
    branchProbability = 0.3,
    maxBranches = 3
  ): Array<Array<{x: number, y: number, intensity: number}>> {
    const branches = [];
    let branchCount = 0;
    
    for (let i = 1; i < mainPath.length - 1 && branchCount < maxBranches; i++) {
      if (Math.random() < branchProbability) {
        const branchStart = mainPath[i];
        const branchLength = 3 + Math.floor(Math.random() * 4);
        const branchAngle = (Math.random() - 0.5) * Math.PI * 0.5; // ±45 degrees
        
        const branch = [];
        for (let j = 0; j < branchLength; j++) {
          const progress = j / (branchLength - 1);
          const distance = 20 + progress * 40;
          
          branch.push({
            x: branchStart.x + Math.cos(branchAngle) * distance,
            y: branchStart.y + Math.sin(branchAngle) * distance,
            intensity: branchStart.intensity * (1 - progress * 0.5)
          });
        }
        
        branches.push(branch);
        branchCount++;
      }
    }
    
    return branches;
  }
}

// Particle system for energy streams
export class ParticleSystem {
  private particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    opacity: number;
  }> = [];
  
  constructor(private maxParticles: number = 500) {}
  
  emit(
    x: number, 
    y: number, 
    velocityX: number, 
    velocityY: number, 
    count = 1
  ): void {
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: velocityX + (Math.random() - 0.5) * velocityX * 0.2,
        vy: velocityY + (Math.random() - 0.5) * velocityY * 0.2,
        life: 0,
        maxLife: 1 + Math.random() * 2,
        size: 1 + Math.random() * 3,
        opacity: 0.5 + Math.random() * 0.5
      });
    }
  }
  
  update(deltaTime: number, bounds: {width: number, height: number}): void {
    const dt = deltaTime * 0.001;
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Update position
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      
      // Update life
      particle.life += dt;
      
      // Update opacity based on life
      const lifeRatio = particle.life / particle.maxLife;
      particle.opacity = (1 - lifeRatio) * 0.8;
      
      // Remove dead or out-of-bounds particles
      if (particle.life > particle.maxLife || 
          particle.x < -50 || particle.x > bounds.width + 50 ||
          particle.y < -50 || particle.y > bounds.height + 50) {
        this.particles.splice(i, 1);
      }
    }
  }
  
  getParticles(): Array<{x: number, y: number, size: number, opacity: number}> {
    return this.particles.map(p => ({
      x: p.x,
      y: p.y,
      size: p.size,
      opacity: p.opacity
    }));
  }
  
  clear(): void {
    this.particles.length = 0;
  }
  
  getCount(): number {
    return this.particles.length;
  }
}

// React hook for animation utilities
export function useAnimationUtils(respectsReducedMotion = false) {
  const frameManagerRef = useRef<AnimationFrameManager | null>(null);
  const energyControllerRef = useRef<EnergyAnimationController | null>(null);
  const lightningGeneratorRef = useRef<LightningPathGenerator | null>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  
  // Initialize utilities
  useEffect(() => {
    frameManagerRef.current = new AnimationFrameManager();
    energyControllerRef.current = new EnergyAnimationController();
    lightningGeneratorRef.current = new LightningPathGenerator();
    particleSystemRef.current = new ParticleSystem();
    
    return () => {
      frameManagerRef.current?.stop();
    };
  }, []);
  
  const startAnimation = useCallback((callback: (deltaTime: number) => void) => {
    frameManagerRef.current?.start(callback, respectsReducedMotion);
  }, [respectsReducedMotion]);
  
  const stopAnimation = useCallback(() => {
    frameManagerRef.current?.stop();
  }, []);
  
  const setEnergyIntensity = useCallback((intensity: number) => {
    energyControllerRef.current?.setTargetIntensity(intensity);
  }, []);
  
  const generateLightningPath = useCallback((
    startX: number, 
    startY: number, 
    endX: number, 
    endY: number, 
    intensity: number
  ) => {
    return lightningGeneratorRef.current?.generatePath(startX, startY, endX, endY, intensity) || [];
  }, []);
  
  const emitParticles = useCallback((
    x: number, 
    y: number, 
    velocityX: number, 
    velocityY: number, 
    count = 1
  ) => {
    particleSystemRef.current?.emit(x, y, velocityX, velocityY, count);
  }, []);
  
  return {
    startAnimation,
    stopAnimation,
    setEnergyIntensity,
    generateLightningPath,
    emitParticles,
    frameManager: frameManagerRef.current,
    energyController: energyControllerRef.current,
    particleSystem: particleSystemRef.current,
    AnimationTiming
  };
}
