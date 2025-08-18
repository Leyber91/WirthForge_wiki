import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { useDesignTokens } from '../hooks/useDesignTokens';
import { useAccessibility } from '../hooks/useAccessibility';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';

interface LightningBoltVisualProps {
  tokenSpeed: number;
  energyLevel: number;
  thickness?: number;
  color?: string;
  animated?: boolean;
  reducedMotion?: boolean;
  width: number;
  height: number;
  accessibility?: {
    ariaLabel?: string;
    ariaDescribedBy?: string;
    role?: string;
  };
}

interface LightningPoint {
  x: number;
  y: number;
  intensity: number;
}

export const LightningBoltVisual: React.FC<LightningBoltVisualProps> = ({
  tokenSpeed,
  energyLevel,
  thickness = 2,
  color,
  animated = true,
  reducedMotion = false,
  width,
  height,
  accessibility = {}
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  
  const tokens = useDesignTokens();
  const { announceToScreenReader, respectsReducedMotion } = useAccessibility();
  const { trackFrameTime, reportPerformance } = usePerformanceMonitor();

  // Determine effective color from props or design tokens
  const effectiveColor = useMemo(() => {
    if (color) return color;
    
    // Map energy level to lightning palette
    if (energyLevel > 80) return tokens.colorPalettes.lightning.primary;
    if (energyLevel > 60) return tokens.colorPalettes.lightning.secondary;
    if (energyLevel > 40) return tokens.colorPalettes.lightning.tertiary;
    return tokens.colorPalettes.lightning.glow;
  }, [color, energyLevel, tokens]);

  // Check if motion should be reduced
  const shouldReduceMotion = useMemo(() => {
    return reducedMotion || respectsReducedMotion();
  }, [reducedMotion, respectsReducedMotion]);

  // Generate lightning bolt path points
  const generateLightningPath = useCallback((intensity: number): LightningPoint[] => {
    const points: LightningPoint[] = [];
    const segments = Math.max(8, Math.floor(intensity / 10));
    const startX = width * 0.2;
    const endX = width * 0.8;
    const startY = height * 0.8;
    const endY = height * 0.2;
    
    // Main bolt path
    for (let i = 0; i <= segments; i++) {
      const progress = i / segments;
      const baseX = startX + (endX - startX) * progress;
      const baseY = startY + (endY - startY) * progress;
      
      // Add jagged variations
      const jitterX = (Math.random() - 0.5) * (width * 0.1) * (1 - progress * 0.5);
      const jitterY = (Math.random() - 0.5) * (height * 0.05);
      
      points.push({
        x: baseX + jitterX,
        y: baseY + jitterY,
        intensity: intensity * (0.8 + Math.random() * 0.4)
      });
    }
    
    return points;
  }, [width, height]);

  // Initialize Three.js scene
  const initializeScene = useCallback(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, width, 0, height, -1000, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      alpha: true,
      antialias: !shouldReduceMotion // Reduce quality for performance when motion is reduced
    });
    
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
    
    sceneRef.current = scene;
    rendererRef.current = renderer;
    
    return { scene, camera, renderer };
  }, [width, height, shouldReduceMotion]);

  // Create lightning bolt geometry
  const createLightningBolt = useCallback((points: LightningPoint[]) => {
    if (!sceneRef.current) return;

    // Clear previous lightning
    while (sceneRef.current.children.length > 0) {
      sceneRef.current.remove(sceneRef.current.children[0]);
    }

    // Create main bolt
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(points.length * 3);
    const colors = new Float32Array(points.length * 3);
    
    const color = new THREE.Color(effectiveColor);
    
    points.forEach((point, index) => {
      positions[index * 3] = point.x;
      positions[index * 3 + 1] = point.y;
      positions[index * 3 + 2] = 0;
      
      // Vary color intensity based on point intensity
      const intensityFactor = point.intensity / 100;
      colors[index * 3] = color.r * intensityFactor;
      colors[index * 3 + 1] = color.g * intensityFactor;
      colors[index * 3 + 2] = color.b * intensityFactor;
    });
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.LineBasicMaterial({ 
      vertexColors: true,
      linewidth: thickness,
      transparent: true,
      opacity: shouldReduceMotion ? 0.8 : 1.0
    });
    
    const line = new THREE.Line(geometry, material);
    sceneRef.current.add(line);

    // Add glow effect if not reducing motion
    if (!shouldReduceMotion && energyLevel > 50) {
      const glowMaterial = new THREE.LineBasicMaterial({
        color: effectiveColor,
        transparent: true,
        opacity: 0.3,
        linewidth: thickness * 3
      });
      
      const glowLine = new THREE.Line(geometry.clone(), glowMaterial);
      sceneRef.current.add(glowLine);
    }
  }, [effectiveColor, thickness, shouldReduceMotion, energyLevel]);

  // Animation loop
  const animate = useCallback(() => {
    const currentTime = performance.now();
    const deltaTime = currentTime - lastFrameTimeRef.current;
    
    // Respect 60fps budget (16.67ms per frame)
    if (deltaTime < 16.67 && !shouldReduceMotion) {
      animationFrameRef.current = requestAnimationFrame(animate);
      return;
    }
    
    trackFrameTime(deltaTime);
    lastFrameTimeRef.current = currentTime;
    
    if (!rendererRef.current || !sceneRef.current) return;
    
    // Generate new lightning path based on token speed and energy
    const intensity = Math.min(100, energyLevel + (tokenSpeed * 2));
    const lightningPoints = generateLightningPath(intensity);
    
    // Only update if animated and not reducing motion
    if (animated && !shouldReduceMotion) {
      // Update every few frames to create flickering effect
      if (Math.random() < 0.3 || tokenSpeed > 50) {
        createLightningBolt(lightningPoints);
      }
    } else {
      // Static lightning for reduced motion
      createLightningBolt(lightningPoints);
    }
    
    // Render scene
    const camera = new THREE.OrthographicCamera(0, width, 0, height, -1000, 1000);
    rendererRef.current.render(sceneRef.current, camera);
    
    // Continue animation loop if animated
    if (animated && !shouldReduceMotion) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
    
    // Report performance metrics
    reportPerformance('lightning-bolt', deltaTime);
  }, [
    tokenSpeed, 
    energyLevel, 
    animated, 
    shouldReduceMotion, 
    generateLightningPath, 
    createLightningBolt,
    trackFrameTime,
    reportPerformance,
    width,
    height
  ]);

  // Initialize and start animation
  useEffect(() => {
    const sceneData = initializeScene();
    if (!sceneData) return;
    
    // Create initial lightning bolt
    const intensity = Math.min(100, energyLevel + (tokenSpeed * 2));
    const lightningPoints = generateLightningPath(intensity);
    createLightningBolt(lightningPoints);
    
    // Start animation if enabled
    if (animated) {
      animate();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [initializeScene, generateLightningPath, createLightningBolt, animate, animated, tokenSpeed, energyLevel]);

  // Announce significant changes to screen readers
  useEffect(() => {
    if (tokenSpeed > 0) {
      const message = `Energy visualization: ${tokenSpeed.toFixed(1)} tokens per second, ${energyLevel.toFixed(0)}% energy level`;
      announceToScreenReader(message, 'polite');
    }
  }, [tokenSpeed, energyLevel, announceToScreenReader]);

  // Generate accessibility description
  const accessibilityDescription = useMemo(() => {
    if (tokenSpeed === 0) return "Lightning bolt visualization: No active token generation";
    
    const speedDescription = tokenSpeed > 50 ? "high speed" : tokenSpeed > 20 ? "moderate speed" : "low speed";
    const energyDescription = energyLevel > 80 ? "high energy" : energyLevel > 40 ? "moderate energy" : "low energy";
    
    return `Lightning bolt visualization: ${speedDescription} token generation at ${energyLevel.toFixed(0)}% ${energyDescription}`;
  }, [tokenSpeed, energyLevel]);

  return (
    <div 
      className="lightning-bolt-container"
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        role={accessibility.role || "img"}
        aria-label={accessibility.ariaLabel || accessibilityDescription}
        aria-describedby={accessibility.ariaDescribedBy}
        style={{
          display: 'block',
          width: '100%',
          height: '100%'
        }}
      />
      
      {/* Hidden text for screen readers */}
      <div 
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {accessibilityDescription}
      </div>
      
      {/* Reduced motion alternative */}
      {shouldReduceMotion && (
        <div 
          className="reduced-motion-indicator"
          style={{
            position: 'absolute',
            bottom: '4px',
            right: '4px',
            fontSize: '12px',
            color: tokens.colorPalettes.system.textSecondary,
            backgroundColor: tokens.colorPalettes.system.surface,
            padding: '2px 6px',
            borderRadius: '4px',
            opacity: 0.8
          }}
        >
          {tokenSpeed.toFixed(1)} TPS
        </div>
      )}
    </div>
  );
};
