'use client';

// Shared AudioContext to bypass mobile/browser autoplay suspension
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Ensures browser audio is unlocked on user interaction
 */
export function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

/**
 * Authentic Restaurant Counter Service Bell (Ding! Ding! Ding!)
 * Synthesizes crisp metallic brass hammer strikes and resonant bell decay
 */
export function playOrderBell() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const ringStrike = (startTime: number, pitchMultiplier = 1.0) => {
      // 1. Sharp mechanical hammer strike click
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(3200 * pitchMultiplier, startTime);
      clickGain.gain.setValueAtTime(0.45, startTime);
      clickGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.04);
      clickOsc.connect(clickGain);
      clickGain.connect(ctx.destination);
      clickOsc.start(startTime);
      clickOsc.stop(startTime + 0.05);

      // 2. Brass bell resonant harmonics
      const partials = [
        { freq: 1175 * pitchMultiplier, gain: 0.55, decay: 1.8 }, // Fundamental D6
        { freq: 1760 * pitchMultiplier, gain: 0.38, decay: 1.5 }, // Overtone A6
        { freq: 2350 * pitchMultiplier, gain: 0.28, decay: 1.2 }, // 2nd harmonic D7
        { freq: 3520 * pitchMultiplier, gain: 0.18, decay: 0.9 }, // Metallic shimmer
        { freq: 587 * pitchMultiplier, gain: 0.22, decay: 2.1 },  // Deep bell ring body
      ];

      partials.forEach(({ freq, gain, decay }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gainNode.gain.setValueAtTime(gain, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + decay);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + decay);
      });
    };

    const now = ctx.currentTime;
    // 3 rhythmic restaurant service bell strikes (Ding! Ding! Ding!)
    ringStrike(now, 1.0);
    ringStrike(now + 0.26, 1.04);
    ringStrike(now + 0.54, 1.0);
  } catch (err) {
    console.warn('Order bell audio failed:', err);
  }
}

// Web Audio API chime player with zero external file dependencies
export function playChime(type: 'order' | 'message' | 'success' = 'order') {
  if (type === 'order') {
    playOrderBell();
    return;
  }

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (type === 'message') {
      // Soft pop notification for chat messages
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'success') {
      // Success melody
      const now = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C E G C
      freqs.forEach((freq, idx) => {
        const startTime = now + idx * 0.09;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    }
  } catch (err) {
    console.warn('Audio play notice:', err);
  }
}

