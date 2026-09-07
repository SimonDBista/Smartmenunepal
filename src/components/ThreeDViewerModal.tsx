'use client';

import React from 'react';
import { X, Box, Sparkles, RefreshCw } from 'lucide-react';

interface ThreeDViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  modelUrl?: string | null;
  imageUrl?: string | null;
}

export default function ThreeDViewerModal({
  isOpen,
  onClose,
  itemName,
  modelUrl,
  imageUrl,
}: ThreeDViewerModalProps) {
  if (!isOpen) return null;

  // Fallback demo GLB model if none provided
  const glbSource =
    modelUrl ||
    'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Burger/glTF-Binary/Burger.glb';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#121316] border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-stone-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#16171B]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-bronze-400/15 text-bronze-400 flex items-center justify-center border border-bronze-400/30">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-stone-100 text-base leading-tight">
                3D Food Experience
              </h3>
              <p className="text-xs text-bronze-400">{itemName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3D Model Viewer Canvas */}
        <div className="relative w-full h-80 bg-[#0E0F12] flex items-center justify-center">
          {/* @ts-ignore */}
          <model-viewer
            src={glbSource}
            alt={`3D Model of ${itemName}`}
            poster={imageUrl || undefined}
            auto-rotate
            camera-controls
            rotation-per-second="30deg"
            shadow-intensity="1.5"
            exposure="1.1"
            style={{ width: '100%', height: '100%' }}
          >
            {/* Loading placeholder inside model-viewer */}
            <div slot="poster" className="w-full h-full flex flex-col items-center justify-center text-stone-400">
              <RefreshCw className="w-8 h-8 animate-spin text-bronze-400 mb-2" />
              <span className="text-xs tracking-wider">Loading 3D Model...</span>
            </div>
          {/* @ts-ignore */}
          </model-viewer>

          {/* AR / Interactive instruction pill */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3.5 py-1 bg-black/80 backdrop-blur border border-white/10 rounded-full flex items-center space-x-2 text-[11px] text-stone-300">
            <Sparkles className="w-3.5 h-3.5 text-bronze-400" />
            <span>Drag to rotate • Pinch to zoom</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#16171B] flex items-center justify-between border-t border-white/[0.08] text-xs text-stone-400">
          <span className="text-[11px] uppercase tracking-wider text-stone-400">
            Interactive Digital Showcase
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bronze-btn text-xs font-semibold uppercase tracking-wider text-white"
          >
            Close View
          </button>
        </div>
      </div>
    </div>
  );
}
