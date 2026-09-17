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

/**
 * Staff Dashboard Alert Chime (Customer -> Staff)
 * Crisp, vibrant dual-tone notification chime ("Ding-Dong!")
 * High alert resonance distinct from the mechanical order bell.
 */
export function playStaffMessageChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    const playStrike = (startTime: number, freq: number, duration: number, gainVal: number) => {
      // Fundamental
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(gainVal, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);

      // Overtone shimmer
      const overtone = ctx.createOscillator();
      const otGain = ctx.createGain();
      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(freq * 2, startTime);
      otGain.gain.setValueAtTime(gainVal * 0.35, startTime);
      otGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.7);
      overtone.connect(otGain);
      otGain.connect(ctx.destination);
      overtone.start(startTime);
      overtone.stop(startTime + duration * 0.7);
    };

    // G5 (784Hz) followed quickly by C6 (1046.5Hz)
    playStrike(now, 783.99, 0.45, 0.4);
    playStrike(now + 0.13, 1046.5, 0.6, 0.5);
  } catch (err) {
    console.warn('Staff message chime failed:', err);
  }
}

/**
 * Customer Device Hospitality Chime (Staff -> Customer)
 * Warm, gentle ascending 3-tone chime (D5 -> F#5 -> A5)
 * Soft, elegant hotel concierge notification.
 */
export function playCustomerMessageChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const notes = [
      { freq: 587.33, delay: 0, decay: 0.5, gain: 0.28 },   // D5
      { freq: 739.99, delay: 0.11, decay: 0.55, gain: 0.32 }, // F#5
      { freq: 880.0, delay: 0.22, decay: 0.75, gain: 0.38 },  // A5
    ];

    notes.forEach(({ freq, delay, decay, gain: gainVal }) => {
      const startTime = now + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(gainVal, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + decay);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + decay);
    });
  } catch (err) {
    console.warn('Customer message chime failed:', err);
  }
}

// Web Audio API chime player with zero external file dependencies
export function playChime(
  type: 'order' | 'staff_message' | 'customer_message' | 'message' | 'success' = 'order'
) {
  if (type === 'order') {
    playOrderBell();
    return;
  }
  if (type === 'staff_message') {
    playStaffMessageChime();
    return;
  }
  if (type === 'customer_message' || type === 'message') {
    playCustomerMessageChime();
    return;
  }

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (type === 'success') {
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


