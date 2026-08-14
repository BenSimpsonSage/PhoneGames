"use client";

/**
 * Tiny Web Audio synth. Every sound is generated, so the app ships no audio
 * files and still works with no connection.
 *
 * Browsers refuse to start an AudioContext until the user has interacted, so
 * the context is created lazily on the first play and resumed if suspended.
 */

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

type ToneOptions = {
  freq: number;
  /** Seconds. */
  duration?: number;
  type?: OscillatorType;
  volume?: number;
  /** Seconds to wait before this tone starts, for building little melodies. */
  delay?: number;
  /** Slide to this frequency over the tone's life. */
  slideTo?: number;
};

function tone({
  freq,
  duration = 0.12,
  type = "sine",
  volume = 0.18,
  delay = 0,
  slideTo,
}: ToneOptions) {
  if (!enabled) return;
  const audio = context();
  if (!audio) return;

  const start = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const gain = audio.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);

  // A quick fade in and out — a raw square wave gate clicks audibly.
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain).connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export const sfx = {
  /** Call once from a tap before any timed sound, to unlock audio on iOS. */
  unlock: () => void context(),

  tap: () => tone({ freq: 520, duration: 0.05, volume: 0.08, type: "triangle" }),

  correct: () => {
    tone({ freq: 660, duration: 0.09, type: "triangle", volume: 0.2 });
    tone({ freq: 990, duration: 0.14, type: "triangle", volume: 0.18, delay: 0.07 });
  },

  skip: () => {
    tone({ freq: 300, duration: 0.12, type: "sawtooth", volume: 0.12, slideTo: 180 });
  },

  reveal: () => {
    tone({ freq: 440, duration: 0.1, type: "sine", volume: 0.16 });
    tone({ freq: 587, duration: 0.1, type: "sine", volume: 0.16, delay: 0.09 });
    tone({ freq: 880, duration: 0.22, type: "sine", volume: 0.16, delay: 0.18 });
  },

  /** The last-few-seconds pip. */
  tick: () => tone({ freq: 880, duration: 0.06, type: "square", volume: 0.12 }),

  timeUp: () => {
    tone({ freq: 220, duration: 0.28, type: "sawtooth", volume: 0.22 });
    tone({ freq: 165, duration: 0.42, type: "sawtooth", volume: 0.22, delay: 0.24 });
  },

  fanfare: () => {
    [523, 659, 784, 1047].forEach((freq, i) =>
      tone({ freq, duration: 0.18, type: "triangle", volume: 0.17, delay: i * 0.1 }),
    );
  },
};
