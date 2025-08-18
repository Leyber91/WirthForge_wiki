import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { useDesignTokens } from '../hooks/useDesignTokens';
import { useAccessibility } from '../hooks/useAccessibility';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';

interface EnergyStreamVisualProps {
  flowRate: number;
  particleCount: number;
  streamColor: string;
  direction?: 'horizontal' | 'vertical' | 'diagonal';
  turbulence?: number;
  opacity?: number;
  performance?: {
    gpuAccelerated?: boolean;
    maxParticles?: number;
  };
  accessibility?: {
    ariaLabel?: string;
    ariaDescribedBy?: string;
    role?: string;
  };
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  opacity: number;
}

export const EnergyStreamVisual: React.FC<EnergyStreamVisualProps> = ({
  flowRate,
  particleCount,
  streamColor,
  direction = 'horizontal',
  turbulence = 0.1,
  opacity = 1.0,
  performance = { gpuAccelerated: true, maxParticles: 500 },
  accessibility = {}
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  
  const tokens = useDesignTokens();
  const { announceToScreenReader, respectsReducedMotion } = useAccessibility();
  const { trackFrameTime, reportPerformance } = usePerformanceMonitor();

  const shouldReduceMotion = respectsReducedMotion();
  const effectiveParticleCount = Math.min(
    particleCount, 
    performance.maxParticles || 500,
    shouldReduceMotion ? 50 : particleCount
  );

  // Initialize particle system
  const initializeParticles = useCallback(() => {
    const particles: Particle[] = [];
    
    for (let i = 0; i < effectiveParticleCount; i++) {
      const particle: Particle = {
        position: new THREE.Vector3(
          Math.random() * 800,
          Math.random() * 600,
          0
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * flowRate * 0.1,
          (Math.random() - 0.5) * flowRate * 0.1,
          0
        ),
        life: Math.random(),
        maxLife: 1.0 + Math.random() * 2.0,
        size: 1 + Math.random() * 3,
        opacity: 0.5 + Math.random() * 0.5
      };
      
      // Set direction-based velocity
      switch (direction) {
        case 'horizontal':
          particle.velocity.x = flowRate * 0.5;
          particle.velocity.y *= 0.2;
          break;
        case 'vertical':
          particle.velocity.y = flowRate * 0.5;
          particle.velocity.x *= 0.2;
          break;
        case 'diagonal':
          particle.velocity.x = flowRate * 0.35;
          particle.velocity.y = flowRate * 0.35;
          break;
      }
      
      particles.push(particle);
    }
    
    particlesRef.current = particles;
  }, [effectiveParticleCount, flowRate, direction]);

  // Update particle positions and lifecycle
  const updateParticles = useCallback((deltaTime: number) => {
    const particles = particlesRef.current;
    const dt = deltaTime * 0.001; // Convert to seconds
    
    particles.forEach(particle => {
      // Update position
      particle.position.add(particle.velocity.clone().multiplyScalar(dt));
      
      // Add turbulence
      if (turbulence > 0) {
        particle.position.x += (Math.random() - 0.5) * turbulence * 10;
        particle.position.y += (Math.random() - 0.5) * turbulence * 10;
      }
      
      // Update life
      particle.life += dt;
      
      // Reset particle if it's out of bounds or dead
      if (particle.life > particle.maxLife || 
          particle.position.x > 900 || particle.position.x < -100 ||
          particle.position.y > 700 || particle.position.y < -100) {
        
        // Reset position based on direction
        switch (direction) {
          case 'horizontal':
            particle.position.set(-50, Math.random() * 600, 0);
            break;
          case 'vertical':
            particle.position.set(Math.random() * 800, -50, 0);
            break;
          case 'diagonal':
            particle.position.set(-50, -50, 0);
            break;
        }
        
        particle.life = 0;
        particle.maxLife = 1.0 + Math.random() * 2.0;
      }
      
      // Update opacity based on life
      const lifeRatio = particle.life / particle.maxLife;
      particle.opacity = (1 - lifeRatio) * opacity;
    });
  }, [direction, turbulence, opacity]);

  // Render particles using Three.js
  const renderParticles = useCallback(() => {
    if (!sceneRef.current || !rendererRef.current) return;
    
    // Clear previous particles
    while (sceneRef.current.children.length > 0) {
      sceneRef.current.remove(sceneRef.current.children[0]);
    }
    
    const particles = particlesRef.current;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particles.length * 3);
    const colors = new Float32Array(particles.length * 3);
    const sizes = new Float32Array(particles.length);
    
    const color = new THREE.Color(streamColor);
    
    particles.forEach((particle, index) => {
      positions[index * 3] = particle.position.x;
      positions[index * 3 + 1] = particle.position.y;
      positions[index * 3 + 2] = particle.position.z;
      
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
      
      sizes[index] = particle.size;
    });
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: opacity,
      sizeAttenuation: true
    });
    
    const points = new THREE.Points(geometry, material);
    sceneRef.current.add(points);
    
    // Render scene
    const camera = new THREE.OrthographicCamera(0, 800, 0, 600, -1000, 1000);
    rendererRef.current.render(sceneRef.current, camera);
  }, [streamColor, opacity]);

  // Animation loop
  const animate = useCallback(() => {
    const currentTime = performance.now();
    const deltaTime = currentTime - lastFrameTimeRef.current;
    
    // Respect frame budget
    if (deltaTime < 16.67 && !shouldReduceMotion) {
      animationFrameRef.current = requestAnimationFrame(animate);
      return;
    }
    
    trackFrameTime(deltaTime);
    lastFrameTimeRef.current = currentTime;
    
    if (!shouldReduceMotion) {
      updateParticles(deltaTime);
    }
    
    renderParticles();
    
    if (!shouldReduceMotion) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
    
    reportPerformance('energy-stream', deltaTime);
  }, [updateParticles, renderParticles, shouldReduceMotion, trackFrameTime, reportPerformance]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      alpha: true,
      antialias: performance.gpuAccelerated && !shouldReduceMotion
    });
    
    renderer.setSize(800, 600);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    sceneRef.current = scene;
    rendererRef.current = renderer;
    
    initializeParticles();
    animate();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (renderer) {
        renderer.dispose();
      }
    };
  }, [initializeParticles, animate, performance.gpuAccelerated, shouldReduceMotion]);

  // Announce changes to screen readers
  useEffect(() => {
    if (flowRate > 0) {
      const message = `Energy stream: ${effectiveParticleCount} particles flowing at rate ${flowRate.toFixed(1)}`;
      announceToScreenReader(message, 'polite');
    }
  }, [flowRate, effectiveParticleCount, announceToScreenReader]);

  const accessibilityDescription = useMemo(() => {
    const directionText = direction === 'horizontal' ? 'left to right' : 
                         direction === 'vertical' ? 'bottom to top' : 'diagonally';
    return `Energy stream visualization: ${effectiveParticleCount} particles flowing ${directionText} at ${flowRate.toFixed(1)} rate`;
  }, [direction, effectiveParticleCount, flowRate]);

  return (
    <div className="energy-stream-container" style={{ width: '800px', height: '600px', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        role={accessibility.role || "img"}
        aria-label={accessibility.ariaLabel || accessibilityDescription}
        aria-describedby={accessibility.ariaDescribedBy}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      
      <div className="sr-only" aria-live="polite">
        {accessibilityDescription}
      </div>
      
      {shouldReduceMotion && (
        <div style={{
          position: 'absolute',
          bottom: '4px',
          right: '4px',
          fontSize: '12px',
          color: tokens.colorPalettes.system.textSecondary,
          backgroundColor: tokens.colorPalettes.system.surface,
          padding: '2px 6px',
          borderRadius: '4px'
        }}>
          Flow: {flowRate.toFixed(1)}
        </div>
      )}
    </div>
  );
};
