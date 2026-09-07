'use client';

import React, { useEffect, useRef } from 'react';

interface LeafParticle {
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
  spriteIndex: number;
  opacity: number;
  maxOpacity: number;
  plateYFactor: number;
}

const LEAF_SRCS = [
  '/leaves/leaf1.png',
  '/leaves/leaf2.png',
  '/leaves/leaf3.png',
  '/leaves/leaf4.png',
  '/leaves/leaf5.png',
  '/leaves/leaf6.png',
];

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

    // Preload exact leaf sprite images
    const leafImages: HTMLImageElement[] = [];
    let imagesLoaded = 0;

    LEAF_SRCS.forEach((src) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        imagesLoaded++;
      };
      leafImages.push(img);
    });

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
    const LEAF_COUNT = isMobile ? 14 : 22;

    const createLeaf = (initialSpread = false): LeafParticle => {
      // Concentrate leaves strictly directly above the plate and scallop dish
      const minX = width * (isMobile ? 0.35 : 0.52);
      const maxX = width * (isMobile ? 0.95 : 0.90);
      const x = minX + Math.random() * (maxX - minX);

      // Distribute gracefully throughout the vertical descent on load
      const y = initialSpread
        ? Math.random() * height * 0.85
        : -25 - Math.random() * 80;

      const size = 16 + Math.random() * 18; // 16px to 34px realistic size
      const speedY = 0.55 + Math.random() * 0.85; // gentle, relaxing descent
      const speedX = (Math.random() - 0.5) * 0.2;
      const swayAmp = 10 + Math.random() * 18;
      const swayFreq = 0.014 + Math.random() * 0.018;
      const swayPhase = Math.random() * Math.PI * 2;
      const rotation = Math.random() * Math.PI * 2;
      const rotSpeed = (Math.random() - 0.5) * 0.02;
      const flipAngle = Math.random() * Math.PI * 2;
      const flipSpeed = 0.015 + Math.random() * 0.025;
      const spriteIndex = Math.floor(Math.random() * LEAF_SRCS.length);
      const maxOpacity = 0.82 + Math.random() * 0.18;
      const plateYFactor = 0.65 + Math.random() * 0.22; // fades smoothly near plate surface

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
        spriteIndex,
        opacity: initialSpread ? maxOpacity : 0,
        maxOpacity,
        plateYFactor,
      };
    };

    const leaves: LeafParticle[] = Array.from({ length: LEAF_COUNT }, () => createLeaf(true));

    let tick = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      tick += 1;

      for (let i = 0; i < leaves.length; i++) {
        const leaf = leaves[i];

        // Advance motion
        leaf.y += leaf.speedY;
        leaf.x += leaf.speedX;
        leaf.rotation += leaf.rotSpeed;
        leaf.flipAngle += leaf.flipSpeed;

        // Natural drifting sway
        const swayOffset = Math.sin(tick * leaf.swayFreq + leaf.swayPhase) * leaf.swayAmp;
        const currentX = leaf.x + swayOffset;
        const currentY = leaf.y;

        // Fade in smoothly at the top
        const fadeInEnd = height * 0.12;
        if (leaf.y < fadeInEnd && leaf.y >= 0) {
          leaf.opacity = Math.max(0, Math.min(leaf.maxOpacity, (leaf.y / fadeInEnd) * leaf.maxOpacity));
        }

        // Smooth fade out as approaching the plate
        const plateLandingY = height * leaf.plateYFactor;
        if (leaf.y > plateLandingY) {
          const fadeDistance = height * 0.18;
          const remaining = (plateLandingY + fadeDistance - leaf.y) / fadeDistance;
          leaf.opacity = Math.max(0, leaf.maxOpacity * remaining);
        }

        // Seamless reset when it has settled onto the plate or left bounds
        if (leaf.y > height * 0.96 || (leaf.y > plateLandingY && leaf.opacity <= 0.01)) {
          Object.assign(leaf, createLeaf(false));
        }

        // Draw the exact leaf sprite
        if (leaf.opacity > 0.01) {
          const img = leafImages[leaf.spriteIndex];
          if (img && img.complete && img.naturalWidth > 0) {
            ctx.save();
            ctx.translate(currentX, currentY);
            ctx.rotate(leaf.rotation);

            // 3D tumble flip
            const flipScale = Math.cos(leaf.flipAngle);
            ctx.scale(flipScale, 1);
            ctx.globalAlpha = Math.max(0, Math.min(1, leaf.opacity));

            // Keep aspect ratio
            const aspect = img.naturalHeight / img.naturalWidth;
            const drawW = leaf.size;
            const drawH = leaf.size * aspect;

            ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
            ctx.restore();
          }
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
