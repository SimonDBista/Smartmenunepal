'use client';

import React, { useEffect, useRef } from 'react';

interface SteamParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  maxSize: number;
  growthRate: number;
  alpha: number;
  maxAlpha: number;
  life: number;
  maxLife: number;
  rotation: number;
  vRot: number;
  seed: number;
  scaleX: number;
  scaleY: number;
}

export default function CulinarySteam() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;

    // Pre-render soft volumetric steam puff sprite for 60fps performance
    const spriteSize = 128;
    const offscreen = document.createElement('canvas');
    offscreen.width = spriteSize;
    offscreen.height = spriteSize;
    const offCtx = offscreen.getContext('2d');

    if (offCtx) {
      const half = spriteSize / 2;
      const grad = offCtx.createRadialGradient(half, half, 0, half, half, half);
      // Delicate warm culinary vapor color tones matching restaurant ambiance
      grad.addColorStop(0, 'rgba(245, 240, 232, 0.45)');
      grad.addColorStop(0.25, 'rgba(240, 235, 226, 0.32)');
      grad.addColorStop(0.55, 'rgba(235, 228, 220, 0.15)');
      grad.addColorStop(0.8, 'rgba(225, 220, 212, 0.05)');
      grad.addColorStop(1, 'rgba(215, 210, 204, 0)');

      offCtx.fillStyle = grad;
      offCtx.beginPath();
      offCtx.arc(half, half, half, 0, Math.PI * 2);
      offCtx.fill();
    }

    const particles: SteamParticle[] = [];
    const MAX_PARTICLES = 50;

    const updateDimensions = () => {
      if (!canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    // Locate the hot food surface on the plate
    const getEmitterOrigin = () => {
      const img = document.getElementById('hero-dish-img') as HTMLImageElement | null;
      if (!img || !canvas) {
        return {
          x: width * 0.75,
          y: height * 0.60,
          dishWidth: 160,
        };
      }

      const canvasRect = canvas.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();

      // Scallop center in hero-plate.webp: X=70.3%, Top crust Y=44%
      const scallopX = (imgRect.left - canvasRect.left) + imgRect.width * 0.703;
      const scallopY = (imgRect.top - canvasRect.top) + imgRect.height * 0.44;

      return {
        x: scallopX,
        y: scallopY,
        dishWidth: imgRect.width * 0.11, // Seared crust width
      };
    };

    const createParticle = (origin: { x: number; y: number; dishWidth: number }): SteamParticle => {
      // Natural emission across the hot seared scallop crust and herb garnish
      const plumeChoice = Math.random();
      let offsetX = 0;
      let offsetY = 0;

      if (plumeChoice < 0.6) {
        // Main plume: caramelized crust center
        offsetX = (Math.random() - 0.5) * origin.dishWidth;
        offsetY = (Math.random() - 0.5) * (origin.dishWidth * 0.25);
      } else if (plumeChoice < 0.85) {
        // Left plume: buttery puree pool with herbs
        offsetX = -origin.dishWidth * (0.35 + Math.random() * 0.4);
        offsetY = origin.dishWidth * (0.15 + Math.random() * 0.2);
      } else {
        // Right plume: herb butter near spoon rim
        offsetX = origin.dishWidth * (0.3 + Math.random() * 0.35);
        offsetY = origin.dishWidth * (0.1 + Math.random() * 0.15);
      }

      const maxLife = 160 + Math.random() * 90;
      return {
        x: origin.x + offsetX,
        y: origin.y + offsetY,
        vx: (Math.random() - 0.5) * 0.3 - 0.08, // subtle natural culinary room draft
        vy: -0.9 - Math.random() * 0.75,        // realistic upward thermal buoyancy
        size: 16 + Math.random() * 12,          // initial compact steam puff
        maxSize: 85 + Math.random() * 55,       // thermal expansion as vapor cools
        growthRate: 0.35 + Math.random() * 0.22,
        alpha: 0,
        maxAlpha: 0.14 + Math.random() * 0.10,  // soft, semi-transparent organic steam
        life: 0,
        maxLife,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.015,
        seed: Math.random() * 1000,
        scaleX: 0.85 + Math.random() * 0.3,
        scaleY: 1.1 + Math.random() * 0.35,     // vertically elongated convection puff
      };
    };

    let time = 0;
    let spawnTimer = 0;

    const render = () => {
      animId = requestAnimationFrame(render);

      if (document.hidden) return;

      time += 1;
      ctx.clearRect(0, 0, width, height);

      const emitter = getEmitterOrigin();

      // Smooth, continuous emission of steam puffs
      spawnTimer += 1;
      if (spawnTimer >= 2 && particles.length < MAX_PARTICLES) {
        particles.push(createParticle(emitter));
        spawnTimer = 0;
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += 1;

        const progress = p.life / p.maxLife;

        // Smooth fade-in near food surface, graceful wafting dissipation into the air
        if (progress < 0.18) {
          p.alpha = (progress / 0.18) * p.maxAlpha;
        } else if (progress > 0.50) {
          const fadeProgress = (progress - 0.50) / 0.50;
          // Smooth cosine dissipation into ambient air
          p.alpha = p.maxAlpha * 0.5 * (1 + Math.cos(fadeProgress * Math.PI));
        } else {
          p.alpha = p.maxAlpha;
        }

        // Convection physics: gentle thermal deceleration and harmonic fluid waft
        const waft1 = Math.sin(time * 0.022 + p.seed) * 0.35;
        const waft2 = Math.cos(time * 0.016 + p.y * 0.018) * 0.25;
        p.x += p.vx + waft1 + waft2;
        p.y += p.vy;

        // Upward deceleration as heat radiates
        p.vy *= 0.997;

        // Thermal expansion
        if (p.size < p.maxSize) {
          p.size += p.growthRate;
        }

        p.rotation += p.vRot;

        // Draw soft steam particle using pre-rendered sprite
        if (p.alpha > 0.005) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.scale(p.scaleX, p.scaleY);
          ctx.globalAlpha = p.alpha;

          const s = p.size;
          ctx.drawImage(offscreen, -s, -s, s * 2, s * 2);
          ctx.restore();
        }

        // Remove dead particles
        if (p.life >= p.maxLife || p.alpha <= 0.002) {
          particles.splice(i, 1);
        }
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10 w-full h-full"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
