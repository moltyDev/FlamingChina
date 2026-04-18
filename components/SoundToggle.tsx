"use client";

import { useEffect, useState } from "react";

const SOUND_KEY = "fc_portal_sound";

function playTick() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return;
  }

  const context = new AudioCtx();
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.value = 320;
  gainNode.gain.value = 0.03;

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start();
  oscillator.stop(context.currentTime + 0.08);
}

export default function SoundToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(SOUND_KEY);
    setEnabled(stored === "on");
  }, []);

  const toggleSound = () => {
    const next = !enabled;
    setEnabled(next);
    window.localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    if (next) {
      playTick();
    }
  };

  return (
    <button
      type="button"
      onClick={toggleSound}
      className="fixed right-4 top-20 z-40 rounded border border-orange-500/40 bg-black/70 px-3 py-2 text-[11px] uppercase tracking-[0.15em] text-orange-100 transition hover:border-orange-300/70 hover:text-orange-50 sm:right-6"
    >
      Sound: {enabled ? "On" : "Off"}
    </button>
  );
}
