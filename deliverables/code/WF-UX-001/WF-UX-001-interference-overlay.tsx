import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { useDesignTokens } from '../hooks/useDesignTokens';
import { useAccessibility } from '../hooks/useAccessibility';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';

interface InterferenceOverlayProps {
  modelA: {
    position: { x: number; y: number };
    frequency: number;
    amplitude: number;
    phase: number;
  };
  modelB: {
    position: { x: number; y: number };
    frequency: number;
    amplitude: number;
    phase: number;
  };
  interferenceType: 'constructive' | 'destructive' | 'mixed';
  opacity?: number;
  resolution?: number;
  performance?: {
    gpuAccelerated?: boolean;
    maxNodes?: number;
  };
  accessibility?: {
    ariaLabel?: string;
    ariaDescribedBy?: string;
    role?: string;
  };
}

interface InterferenceNode {
  x: number;
  y: number;
  intensity: number;
  phase: number;
  type: 'constructive' | 'destructive' | 'neutral';
}

export const InterferenceOverlay: React.FC<InterferenceOverlayProps> = ({
  modelA,
  modelB,
  interferenceType,
  opacity = 0.7,
  resolution = 50,
  performance = { gpuAccelerated: true, maxNodes: 2500 },
  accessibility = {}
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const nodesRef = useRef<InterferenceNode[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  
  const tokens = useDesignTokens();
  const { announceToScreenReader, respectsReducedMotion } = useAccessibility();
  const { trackFrameTime, reportPerformance } = usePerformanceMonitor();

  const shouldReduceMotion = respectsReducedMotion();
  const effectiveResolution = Math.min(
    resolution,
    Math.sqrt(performance.maxNodes || 2500),
    shouldReduceMotion ? 25 : resolution
  );

  // Calculate interference pattern
  const calculateInterference = useCallback((x: number, y: number, time: number): InterferenceNode => {
    const distA = Math.sqrt(Math.pow(x - modelA.position.x, 2) + Math.pow(y - modelA.position.y, 2));
    const distB = Math.sqrt(Math.pow(x - modelB.position.x, 2) + Math.pow(y - modelB.position.y, 2));
    
    // Wave calculations
    const waveA = modelA.amplitude * Math.sin(modelA.frequency * time + modelA.phase - distA * 0.01);
    const waveB = modelB.amplitude * Math.sin(modelB.frequency * time + modelB.phase - distB * 0.01);
    
    const combinedWave = waveA + waveB;
    const intensity = Math.abs(combinedWave);
    const phase = Math.atan2(Math.sin(modelA.phase + modelB.phase), Math.cos(modelA.phase + modelB.phase));
    
    // Determine interference type
    let type: 'constructive' | 'destructive' | 'neutral';
    const phaseDiff = Math.abs(modelA.phase - modelB.phase) % (2 * Math.PI);
    
    if (intensity > (modelA.amplitude + modelB.amplitude) * 0.7) {
      type = 'constructive';
    } else if (intensity < Math.abs(modelA.amplitude - modelB.amplitude) * 1.3) {
      type = 'destructive';
    } else {
      type = 'neutral';
    }
    
    return { x, y, intensity, phase, type };
  }, [modelA, modelB]);

  // Generate interference grid
  const generateInterferenceGrid = useCallback((time: number) => {
    const nodes: InterferenceNode[] = [];
    const step = 800 / effectiveResolution;
    
    for (let i = 0; i < effectiveResolution; i++) {
      for (let j = 0; j < effectiveResolution; j++) {
        const x = i * step;
        const y = j * step;
        const node = calculateInterference(x, y, time);
        nodes.push(node);
      }
    }
    
    nodesRef.current = nodes;
  }, [effectiveResolution, calculateInterference]);

  // Render interference pattern using Three.js
  const renderInterference = useCallback(() => {
    if (!sceneRef.current || !rendererRef.current) return;
    
    // Clear previous geometry
    while (sceneRef.current.children.length > 0) {
      sceneRef.current.remove(sceneRef.current.children[0]);
    }
    
    const nodes = nodesRef.current;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(nodes.length * 3);
    const colors = new Float32Array(nodes.length * 3);
    const sizes = new Float32Array(nodes.length);
    
    nodes.forEach((node, index) => {
      positions[index * 3] = node.x;
      positions[index * 3 + 1] = node.y;
      positions[index * 3 + 2] = 0;
      
      // Color based on interference type
      let color: THREE.Color;
      switch (node.type) {
        case 'constructive':
          color = new THREE.Color(tokens.colorPalettes.interference.constructive);
          break;
        case 'destructive':
          color = new THREE.Color(tokens.colorPalettes.interference.destructive);
          break;
        default:
          color = new THREE.Color(tokens.colorPalettes.interference.neutral);
      }
      
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
      
      sizes[index] = Math.max(0.5, node.intensity * 3);
    });
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: opacity,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    });
    
    const points = new THREE.Points(geometry, material);
    sceneRef.current.add(points);
    
    // Render scene
    const camera = new THREE.OrthographicCamera(0, 800, 0, 600, -1000, 1000);
    rendererRef.current.render(sceneRef.current, camera);
  }, [opacity, tokens.colorPalettes.interference]);

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
      generateInterferenceGrid(currentTime * 0.001);
    }
    
    renderInterference();
    
    if (!shouldReduceMotion) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
    
    reportPerformance('interference-overlay', deltaTime);
  }, [generateInterferenceGrid, renderInterference, shouldReduceMotion, trackFrameTime, reportPerformance]);

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
    
    generateInterferenceGrid(0);
    animate();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (renderer) {
        renderer.dispose();
      }
    };
  }, [generateInterferenceGrid, animate, performance.gpuAccelerated, shouldReduceMotion]);

  // Calculate interference statistics
  const interferenceStats = useMemo(() => {
    const nodes = nodesRef.current;
    if (nodes.length === 0) return { constructive: 0, destructive: 0, neutral: 0, avgIntensity: 0 };
    
    const stats = nodes.reduce((acc, node) => {
      acc[node.type]++;
      acc.totalIntensity += node.intensity;
      return acc;
    }, { constructive: 0, destructive: 0, neutral: 0, totalIntensity: 0 });
    
    return {
      constructive: stats.constructive,
      destructive: stats.destructive,
      neutral: stats.neutral,
      avgIntensity: stats.totalIntensity / nodes.length
    };
  }, [nodesRef.current]);

  // Announce changes to screen readers
  useEffect(() => {
    const message = `Model interference: ${interferenceStats.constructive} constructive zones, ${interferenceStats.destructive} destructive zones, average intensity ${interferenceStats.avgIntensity.toFixed(2)}`;
    announceToScreenReader(message, 'polite');
  }, [interferenceStats, announceToScreenReader]);

  const accessibilityDescription = useMemo(() => {
    return `Interference pattern overlay showing ${interferenceType} interference between two models with ${interferenceStats.constructive} constructive and ${interferenceStats.destructive} destructive zones`;
  }, [interferenceType, interferenceStats]);

  return (
    <div className="interference-overlay-container" style={{ width: '800px', height: '600px', position: 'relative' }}>
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
          {interferenceType}: {interferenceStats.avgIntensity.toFixed(2)}
        </div>
      )}
      
      {/* Model position indicators */}
      <div 
        style={{
          position: 'absolute',
          left: `${modelA.position.x}px`,
          top: `${modelA.position.y}px`,
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: tokens.colorPalettes.lightning.primary,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none'
        }}
        aria-hidden="true"
      />
      <div 
        style={{
          position: 'absolute',
          left: `${modelB.position.x}px`,
          top: `${modelB.position.y}px`,
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: tokens.colorPalettes.energyStream.primary,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none'
        }}
        aria-hidden="true"
      />
    </div>
  );
};
