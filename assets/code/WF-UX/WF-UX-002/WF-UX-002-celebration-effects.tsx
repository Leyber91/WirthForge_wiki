import React, { useState, useEffect, useCallback, useRef } from 'react';
import { progressionEvents } from './WF-UX-002-progression-manager';

// Celebration effect types based on our rewards schema
interface CelebrationEffect {
  effectId: string;
  effectName: string;
  triggerEvent: 'achievement_unlock' | 'level_up' | 'milestone_reached' | 'perfect_performance' | 'streak_bonus';
  visualEffect: VisualEffect;
  audioEffect?: AudioEffect;
  accessibilityAlternatives: AccessibilityAlternatives;
}

interface VisualEffect {
  animationType: 'particles' | 'lightning' | 'glow' | 'confetti' | 'fireworks' | 'pulse';
  duration: number;
  colors: string[];
  intensity: 'subtle' | 'moderate' | 'dramatic' | 'epic';
}

interface AudioEffect {
  soundId: string;
  volume: number;
  optional: boolean;
}

interface AccessibilityAlternatives {
  screenReaderText: string;
  reducedMotionVersion: string;
  hapticFeedback?: boolean;
}

interface CelebrationTrigger {
  id: string;
  effectId: string;
  data: any;
  timestamp: number;
}

interface CelebrationEffectsProps {
  enableAudio?: boolean;
  enableHaptics?: boolean;
  respectReducedMotion?: boolean;
  maxConcurrentEffects?: number;
  className?: string;
}

// Particle system for visual effects
class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animationId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  addParticles(config: ParticleConfig) {
    const count = config.count || 50;
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(config));
    }
  }

  update() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.particles = this.particles.filter(particle => {
      particle.update();
      particle.draw(this.ctx);
      return particle.life > 0;
    });

    if (this.particles.length > 0) {
      this.animationId = requestAnimationFrame(() => this.update());
    } else {
      this.animationId = null;
    }
  }

  start() {
    if (!this.animationId) {
      this.update();
    }
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.particles = [];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

interface ParticleConfig {
  x: number;
  y: number;
  count?: number;
  colors: string[];
  type: 'spark' | 'confetti' | 'star' | 'lightning';
  intensity: 'subtle' | 'moderate' | 'dramatic' | 'epic';
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: string;
  rotation: number;
  rotationSpeed: number;

  constructor(config: ParticleConfig) {
    this.x = config.x;
    this.y = config.y;
    this.color = config.colors[Math.floor(Math.random() * config.colors.length)];
    this.type = config.type;
    
    // Intensity-based properties
    const intensityMultiplier = {
      subtle: 0.5,
      moderate: 1,
      dramatic: 1.5,
      epic: 2
    }[config.intensity];

    this.vx = (Math.random() - 0.5) * 10 * intensityMultiplier;
    this.vy = (Math.random() - 0.5) * 10 * intensityMultiplier;
    this.life = 1;
    this.maxLife = Math.random() * 60 + 30;
    this.size = Math.random() * 4 + 2;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.2; // Gravity
    this.vx *= 0.98; // Air resistance
    this.rotation += this.rotationSpeed;
    this.life -= 1 / this.maxLife;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    
    ctx.fillStyle = this.color;
    
    switch (this.type) {
      case 'spark':
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        break;
      case 'confetti':
        ctx.fillRect(-this.size, -this.size / 4, this.size * 2, this.size / 2);
        break;
      case 'star':
        this.drawStar(ctx, this.size);
        break;
      case 'lightning':
        this.drawLightning(ctx, this.size);
        break;
    }
    
    ctx.restore();
  }

  private drawStar(ctx: CanvasRenderingContext2D, size: number) {
    const spikes = 5;
    const outerRadius = size;
    const innerRadius = size * 0.5;
    
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / spikes;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
  }

  private drawLightning(ctx: CanvasRenderingContext2D, size: number) {
    ctx.beginPath();
    ctx.moveTo(-size, -size);
    ctx.lineTo(size * 0.3, 0);
    ctx.lineTo(-size * 0.3, 0);
    ctx.lineTo(size, size);
    ctx.lineTo(size * 0.5, size * 0.3);
    ctx.lineTo(size * 0.7, size * 0.7);
    ctx.closePath();
    ctx.fill();
  }
}

export const CelebrationEffects: React.FC<CelebrationEffectsProps> = ({
  enableAudio = true,
  enableHaptics = true,
  respectReducedMotion = true,
  maxConcurrentEffects = 3,
  className = ''
}) => {
  const [activeEffects, setActiveEffects] = useState<CelebrationTrigger[]>([]);
  const [celebrationEffects] = useState<CelebrationEffect[]>([
    {
      effectId: 'lightning_burst',
      effectName: 'Lightning Burst',
      triggerEvent: 'achievement_unlock',
      visualEffect: {
        animationType: 'lightning',
        duration: 2000,
        colors: ['#fbbf24', '#f59e0b', '#ffffff'],
        intensity: 'dramatic'
      },
      audioEffect: {
        soundId: 'thunder_crack',
        volume: 0.7,
        optional: true
      },
      accessibilityAlternatives: {
        screenReaderText: 'Achievement unlocked with lightning burst effect',
        reducedMotionVersion: 'static_glow',
        hapticFeedback: true
      }
    },
    {
      effectId: 'level_up_fireworks',
      effectName: 'Level Up Fireworks',
      triggerEvent: 'level_up',
      visualEffect: {
        animationType: 'fireworks',
        duration: 3000,
        colors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'],
        intensity: 'epic'
      },
      audioEffect: {
        soundId: 'celebration_fanfare',
        volume: 0.8,
        optional: true
      },
      accessibilityAlternatives: {
        screenReaderText: 'Level up! Celebration fireworks display',
        reducedMotionVersion: 'pulsing_glow',
        hapticFeedback: true
      }
    },
    {
      effectId: 'milestone_confetti',
      effectName: 'Milestone Confetti',
      triggerEvent: 'milestone_reached',
      visualEffect: {
        animationType: 'confetti',
        duration: 1500,
        colors: ['#fbbf24', '#ef4444', '#10b981', '#3b82f6'],
        intensity: 'moderate'
      },
      audioEffect: {
        soundId: 'success_chime',
        volume: 0.6,
        optional: true
      },
      accessibilityAlternatives: {
        screenReaderText: 'Milestone reached with confetti celebration',
        reducedMotionVersion: 'fade_highlight',
        hapticFeedback: false
      }
    },
    {
      effectId: 'perfect_performance_glow',
      effectName: 'Perfect Performance Glow',
      triggerEvent: 'perfect_performance',
      visualEffect: {
        animationType: 'glow',
        duration: 2500,
        colors: ['#06ffa5', '#00d4ff'],
        intensity: 'dramatic'
      },
      accessibilityAlternatives: {
        screenReaderText: 'Perfect performance achieved with glowing effect',
        reducedMotionVersion: 'color_shift'
      }
    },
    {
      effectId: 'streak_bonus_pulse',
      effectName: 'Streak Bonus Pulse',
      triggerEvent: 'streak_bonus',
      visualEffect: {
        animationType: 'pulse',
        duration: 1000,
        colors: ['#8b5cf6', '#a855f7'],
        intensity: 'subtle'
      },
      accessibilityAlternatives: {
        screenReaderText: 'Streak bonus earned with pulsing effect',
        reducedMotionVersion: 'brief_highlight'
      }
    }
  ]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const prefersReducedMotion = useRef(false);

  // Check for reduced motion preference
  useEffect(() => {
    if (respectReducedMotion) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      prefersReducedMotion.current = mediaQuery.matches;
      
      const handleChange = (e: MediaQueryListEvent) => {
        prefersReducedMotion.current = e.matches;
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [respectReducedMotion]);

  // Initialize particle system
  useEffect(() => {
    if (canvasRef.current) {
      particleSystemRef.current = new ParticleSystem(canvasRef.current);
      
      const handleResize = () => {
        particleSystemRef.current?.resize();
      };
      
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        particleSystemRef.current?.stop();
      };
    }
  }, []);

  // Initialize audio context
  useEffect(() => {
    if (enableAudio && typeof window !== 'undefined') {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.warn('Audio context not supported:', error);
      }
    }
  }, [enableAudio]);

  // Play audio effect
  const playAudioEffect = useCallback(async (audioEffect: AudioEffect) => {
    if (!enableAudio || !audioContextRef.current || prefersReducedMotion.current) return;
    
    try {
      // In a real implementation, this would load and play actual audio files
      // For now, we'll create a simple synthetic sound
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      // Different sounds for different effects
      const frequency = audioEffect.soundId === 'thunder_crack' ? 80 :
                       audioEffect.soundId === 'celebration_fanfare' ? 440 :
                       audioEffect.soundId === 'success_chime' ? 880 : 220;
      
      oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
      gainNode.gain.setValueAtTime(audioEffect.volume, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.5);
      
      oscillator.start();
      oscillator.stop(audioContextRef.current.currentTime + 0.5);
    } catch (error) {
      console.warn('Failed to play audio effect:', error);
    }
  }, [enableAudio]);

  // Trigger haptic feedback
  const triggerHapticFeedback = useCallback((pattern: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (!enableHaptics || prefersReducedMotion.current) return;
    
    if ('vibrate' in navigator) {
      const patterns = {
        light: [50],
        medium: [100],
        heavy: [200]
      };
      navigator.vibrate(patterns[pattern]);
    }
  }, [enableHaptics]);

  // Execute visual effect
  const executeVisualEffect = useCallback((effect: CelebrationEffect, data: any) => {
    if (!particleSystemRef.current) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    if (prefersReducedMotion.current) {
      // Use accessibility alternative for reduced motion
      const altElement = document.createElement('div');
      altElement.className = `celebration-alt ${effect.accessibilityAlternatives.reducedMotionVersion}`;
      altElement.style.position = 'absolute';
      altElement.style.top = '50%';
      altElement.style.left = '50%';
      altElement.style.transform = 'translate(-50%, -50%)';
      altElement.style.pointerEvents = 'none';
      altElement.style.zIndex = '1000';
      
      canvas.parentElement?.appendChild(altElement);
      
      setTimeout(() => {
        altElement.remove();
      }, 1000);
      
      return;
    }
    
    const particleConfig: ParticleConfig = {
      x: centerX,
      y: centerY,
      colors: effect.visualEffect.colors,
      type: effect.visualEffect.animationType === 'lightning' ? 'lightning' :
            effect.visualEffect.animationType === 'confetti' ? 'confetti' :
            effect.visualEffect.animationType === 'fireworks' ? 'star' : 'spark',
      intensity: effect.visualEffect.intensity,
      count: effect.visualEffect.intensity === 'epic' ? 100 :
             effect.visualEffect.intensity === 'dramatic' ? 75 :
             effect.visualEffect.intensity === 'moderate' ? 50 : 25
    };
    
    particleSystemRef.current.addParticles(particleConfig);
    particleSystemRef.current.start();
    
    // Special effects for different animation types
    switch (effect.visualEffect.animationType) {
      case 'glow':
        canvas.style.boxShadow = `0 0 50px ${effect.visualEffect.colors[0]}`;
        setTimeout(() => {
          canvas.style.boxShadow = '';
        }, effect.visualEffect.duration);
        break;
        
      case 'pulse':
        canvas.style.transform = 'scale(1.05)';
        canvas.style.transition = 'transform 0.2s ease-out';
        setTimeout(() => {
          canvas.style.transform = 'scale(1)';
          setTimeout(() => {
            canvas.style.transition = '';
          }, 200);
        }, 200);
        break;
    }
  }, []);

  // Main celebration trigger function
  const triggerCelebration = useCallback((
    triggerEvent: CelebrationEffect['triggerEvent'],
    data: any = {}
  ) => {
    const effect = celebrationEffects.find(e => e.triggerEvent === triggerEvent);
    if (!effect) return;
    
    // Limit concurrent effects
    if (activeEffects.length >= maxConcurrentEffects) {
      setActiveEffects(prev => prev.slice(1));
    }
    
    const trigger: CelebrationTrigger = {
      id: `${effect.effectId}_${Date.now()}`,
      effectId: effect.effectId,
      data,
      timestamp: Date.now()
    };
    
    setActiveEffects(prev => [...prev, trigger]);
    
    // Execute the celebration
    executeVisualEffect(effect, data);
    
    if (effect.audioEffect) {
      playAudioEffect(effect.audioEffect);
    }
    
    if (effect.accessibilityAlternatives.hapticFeedback) {
      triggerHapticFeedback('medium');
    }
    
    // Announce to screen readers
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = effect.accessibilityAlternatives.screenReaderText;
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      announcement.remove();
    }, 1000);
    
    // Remove effect after duration
    setTimeout(() => {
      setActiveEffects(prev => prev.filter(t => t.id !== trigger.id));
    }, effect.visualEffect.duration);
  }, [celebrationEffects, activeEffects.length, maxConcurrentEffects, executeVisualEffect, playAudioEffect, triggerHapticFeedback]);

  // Listen to progression events
  useEffect(() => {
    const handleAchievementUnlock = (data: any) => {
      triggerCelebration('achievement_unlock', data);
    };
    
    const handleLevelUp = (data: any) => {
      triggerCelebration('level_up', data);
    };
    
    const handleMilestone = (data: any) => {
      triggerCelebration('milestone_reached', data);
    };
    
    const handlePerfectPerformance = (data: any) => {
      triggerCelebration('perfect_performance', data);
    };
    
    const handleStreakBonus = (data: any) => {
      triggerCelebration('streak_bonus', data);
    };
    
    progressionEvents.on('achievementUnlocked', handleAchievementUnlock);
    progressionEvents.on('levelUp', handleLevelUp);
    progressionEvents.on('milestoneReached', handleMilestone);
    progressionEvents.on('perfectPerformance', handlePerfectPerformance);
    progressionEvents.on('streakBonus', handleStreakBonus);
    
    return () => {
      progressionEvents.off('achievementUnlocked', handleAchievementUnlock);
      progressionEvents.off('levelUp', handleLevelUp);
      progressionEvents.off('milestoneReached', handleMilestone);
      progressionEvents.off('perfectPerformance', handlePerfectPerformance);
      progressionEvents.off('streakBonus', handleStreakBonus);
    };
  }, [triggerCelebration]);

  // Expose trigger function for manual use
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).triggerCelebration = triggerCelebration;
    }
  }, [triggerCelebration]);

  return (
    <div className={`celebration-effects ${className}`} data-testid="celebration-effects">
      <canvas
        ref={canvasRef}
        className="celebration-canvas"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 999
        }}
      />
      
      {/* Screen reader only content */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {/* Screen reader announcements will be dynamically added here */}
      </div>
      
      {/* Debug info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="celebration-debug" style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 1001
        }}>
          <div>Active Effects: {activeEffects.length}</div>
          <div>Reduced Motion: {prefersReducedMotion.current ? 'Yes' : 'No'}</div>
          <div>Audio: {enableAudio ? 'Enabled' : 'Disabled'}</div>
          <div>Haptics: {enableHaptics ? 'Enabled' : 'Disabled'}</div>
        </div>
      )}
    </div>
  );
};

export default CelebrationEffects;

// Export types and trigger function for external use
export type { 
  CelebrationEffect, 
  CelebrationTrigger, 
  CelebrationEffectsProps 
};

// Export manual trigger function
export const triggerManualCelebration = (
  type: CelebrationEffect['triggerEvent'],
  data?: any
) => {
  if (typeof window !== 'undefined' && (window as any).triggerCelebration) {
    (window as any).triggerCelebration(type, data);
  }
};
