'use client';

import React, { useEffect, useRef } from 'react';

interface Leaf {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  swayAmp: number;
  swayFreq: number;
  swayPhase: number;
  rotation: number;
  rotSpeed: number;
  flipAngle: number;
  flipSpeed: number;
  type: number;
  opacity: number;
  maxOpacity: number;
  plateLandingY: number;
}

export default function FallingMicrogreens() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const isMobile = window.innerWidth < 768;
    const LEAF_COUNT = isMobile ? 16 : 26;

    const createLeaf = (initialSpread = false): Leaf => {
      // Concentrate leaves strictly above and falling toward the plate in the right area
      const minX = width * (isMobile ? 0.35 : 0.48);
      const maxX = width * (isMobile ? 0.95 : 0.92);
      const x = minX + Math.random() * (maxX - minX);

      // Distribute along the descent on first mount for instant immersion
      const y = initialSpread
        ? Math.random() * height * 0.80
        : -25 - Math.random() * 70;

      const size = 13 + Math.random() * 15; // 13px to 28px
      const speedY = 0.65 + Math.random() * 0.85; // graceful descent speed
      const speedX = (Math.random() - 0.5) * 0.2;
      const swayAmp = 10 + Math.random() * 18;
      const swayFreq = 0.014 + Math.random() * 0.02;
      const swayPhase = Math.random() * Math.PI * 2;
      const rotation = Math.random() * Math.PI * 2;
      const rotSpeed = (Math.random() - 0.5) * 0.024;
      const flipAngle = Math.random() * Math.PI * 2;
      const flipSpeed = 0.016 + Math.random() * 0.026;
      const type = Math.floor(Math.random() * 5);
      const maxOpacity = 0.82 + Math.random() * 0.18;
      // Landing altitude where leaf gently dissolves as it reaches the plate surface
      const plateLandingY = height * (0.60 + Math.random() * 0.22);

      return {
        x,
        y,
        size,
        speedY,
        speedX,
        swayAmp,
        swayFreq,
        swayPhase,
        rotation,
        rotSpeed,
        flipAngle,
        flipSpeed,
        type,
        opacity: initialSpread ? maxOpacity : 0,
        maxOpacity,
        plateLandingY,
      };
    };

    const leaves: Leaf[] = Array.from({ length: LEAF_COUNT }, () => createLeaf(true));

    // Custom Botanical Microgreen Drawings
    const drawMicrogreen = (
      context: CanvasRenderingContext2D,
      leaf: Leaf,
      renderX: number,
      renderY: number
    ) => {
      context.save();
      context.translate(renderX, renderY);
      context.rotate(leaf.rotation);

      // Realistic 3D tumble flip
      const flipScale = Math.cos(leaf.flipAngle);
      context.scale(flipScale, 1);
      context.globalAlpha = Math.max(0, Math.min(1, leaf.opacity));

      const s = leaf.size;

      switch (leaf.type) {
        case 0: {
          // Double-lobed microgreen (baby cress/radish with two rounded leaves & stem)
          context.beginPath();
          context.moveTo(0, s * 0.5);
          context.quadraticCurveTo(s * 0.1, s * 0.2, 0, 0);
          context.strokeStyle = '#86efac';
          context.lineWidth = 1.2;
          context.stroke();

          // Left rounded leaf
          context.beginPath();
          context.ellipse(-s * 0.35, -s * 0.2, s * 0.32, s * 0.42, -0.4, 0, Math.PI * 2);
          context.fillStyle = '#22c55e';
          context.fill();

          // Right rounded leaf
          context.beginPath();
          context.ellipse(s * 0.35, -s * 0.2, s * 0.32, s * 0.42, 0.4, 0, Math.PI * 2);
          context.fillStyle = '#16a34a';
          context.fill();

          // Subtle vein highlight
          context.beginPath();
          context.moveTo(0, 0);
          context.lineTo(-s * 0.25, -s * 0.18);
          context.moveTo(0, 0);
          context.lineTo(s * 0.25, -s * 0.18);
          context.strokeStyle = 'rgba(255,255,255,0.45)';
          context.lineWidth = 0.8;
          context.stroke();
          break;
        }

        case 1: {
          // Clover / Oxalis wood sorrel (3 delicate heart leaflets)
          context.beginPath();
          context.moveTo(0, s * 0.55);
          context.lineTo(0, 0);
          context.strokeStyle = '#4ade80';
          context.lineWidth = 1.1;
          context.stroke();

          const angles = [-Math.PI / 2, -Math.PI * 0.9, -Math.PI * 0.1];
          angles.forEach((ang, idx) => {
            context.save();
            context.rotate(ang);
            context.beginPath();
            context.ellipse(s * 0.35, 0, s * 0.32, s * 0.22, 0, 0, Math.PI * 2);
            context.fillStyle = idx === 0 ? '#4ade80' : idx === 1 ? '#22c55e' : '#15803d';
            context.fill();
            context.restore();
          });
          break;
        }

        case 2: {
          // Delicate feathery herb sprig (chervil / micro-dill frond)
          context.beginPath();
          context.moveTo(0, s * 0.6);
          context.lineTo(0, -s * 0.5);
          context.strokeStyle = '#86efac';
          context.lineWidth = 1;
          context.stroke();

          // Pinnules
          [-s * 0.2, 0, s * 0.2].forEach((offsetY, i) => {
            const leafLen = s * (0.35 - i * 0.06);
            context.beginPath();
            context.ellipse(-leafLen * 0.65, offsetY, leafLen * 0.7, leafLen * 0.35, -0.3, 0, Math.PI * 2);
            context.fillStyle = '#22c55e';
            context.fill();

            context.beginPath();
            context.ellipse(leafLen * 0.65, offsetY - 2, leafLen * 0.7, leafLen * 0.35, 0.3, 0, Math.PI * 2);
            context.fillStyle = '#16a34a';
            context.fill();
          });
          break;
        }

        case 3: {
          // Baby oval culinary leaf (basil / mint)
          context.beginPath();
          context.moveTo(0, s * 0.45);
          context.lineTo(0, s * 0.15);
          context.strokeStyle = '#6ee7b7';
          context.lineWidth = 1.2;
          context.stroke();

          context.beginPath();
          context.ellipse(0, -s * 0.15, s * 0.35, s * 0.55, 0, 0, Math.PI * 2);
          const grad = context.createLinearGradient(-s * 0.3, -s * 0.4, s * 0.3, s * 0.2);
          grad.addColorStop(0, '#86efac');
          grad.addColorStop(0.5, '#22c55e');
          grad.addColorStop(1, '#15803d');
          context.fillStyle = grad;
          context.fill();

          context.beginPath();
          context.moveTo(0, s * 0.15);
          context.lineTo(0, -s * 0.5);
          context.strokeStyle = 'rgba(255,255,255,0.45)';
          context.lineWidth = 0.75;
          context.stroke();
          break;
        }

        case 4: {
          // Purple-stem red amaranth microgreen (vibrant green blade with purple/magenta stem)
          context.beginPath();
          context.moveTo(0, s * 0.55);
          context.quadraticCurveTo(-s * 0.08, s * 0.25, 0, 0);
          context.strokeStyle = '#c026d3';
          context.lineWidth = 1.3;
          context.stroke();

          context.beginPath();
          context.ellipse(0, -s * 0.22, s * 0.24, s * 0.52, 0.08, 0, Math.PI * 2);
          const grad = context.createLinearGradient(0, s * 0.1, 0, -s * 0.7);
          grad.addColorStop(0, '#86efac');
          grad.addColorStop(0.7, '#15803d');
          grad.addColorStop(1, '#a21caf');
          context.fillStyle = grad;
          context.fill();
          break;
        }
      }

      context.restore();
    };

    let tick = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      tick += 1;

      for (let i = 0; i < leaves.length; i++) {
        const leaf = leaves[i];

        // Advance physics
        leaf.y += leaf.speedY;
        leaf.x += leaf.speedX;
        leaf.rotation += leaf.rotSpeed;
        leaf.flipAngle += leaf.flipSpeed;

        // Natural drifting sway
        const swayOffset = Math.sin(tick * leaf.swayFreq + leaf.swayPhase) * leaf.swayAmp;
        const currentX = leaf.x + swayOffset;
        const currentY = leaf.y;

        // Fade in smoothly at top
        const fadeInEnd = height * 0.12;
        if (leaf.y < fadeInEnd && leaf.y >= 0) {
          leaf.opacity = Math.max(0, Math.min(leaf.maxOpacity, (leaf.y / fadeInEnd) * leaf.maxOpacity));
        }

        // Dissolve smoothly as it reaches the plate surface
        if (leaf.y > leaf.plateLandingY) {
          const fadeDistance = height * 0.14;
          const remaining = (leaf.plateLandingY + fadeDistance - leaf.y) / fadeDistance;
          leaf.opacity = Math.max(0, leaf.maxOpacity * remaining);
        }

        // Continuous seamless loop: reset when faded out onto the plate or past bounds
        if (leaf.y > height * 0.96 || (leaf.y > leaf.plateLandingY && leaf.opacity <= 0.01)) {
          Object.assign(leaf, createLeaf(false));
        }

        // Draw leaf
        if (leaf.opacity > 0.01) {
          drawMicrogreen(ctx, leaf, currentX, currentY);
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none z-10 select-none"
    />
  );
}
