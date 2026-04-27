export type SoundType = "none" | "bell" | "chime" | "ding" | "ping";

export const SOUND_LABELS: Record<SoundType, string> = {
  none: "없음",
  bell: "벨",
  chime: "차임",
  ding: "딩",
  ping: "핑",
};

function ramp(gain: GainNode, ctx: AudioContext, from: number, to: number, t: number) {
  gain.gain.setValueAtTime(from, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(Math.max(to, 0.0001), ctx.currentTime + t);
}

export function playSound(type: SoundType, volume = 0.6) {
  if (type === "none" || typeof window === "undefined") return;
  try {
    const ctx = new AudioContext();
    const g = ctx.createGain(); g.connect(ctx.destination);

    if (type === "bell") {
      // 두 번 울리는 벨
      [0, 0.4].forEach((delay) => {
        const osc = ctx.createOscillator(); osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime + delay);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + delay + 0.6);
        osc.connect(g);
        ramp(g, ctx, volume, 0.001, delay + 0.6);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.8);
      });
    } else if (type === "chime") {
      // 3음 차임
      [523, 659, 784].forEach((freq, i) => {
        const osc = ctx.createOscillator(); osc.type = "triangle";
        osc.frequency.value = freq;
        const lg = ctx.createGain(); lg.connect(ctx.destination);
        lg.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
        lg.gain.linearRampToValueAtTime(volume, ctx.currentTime + i * 0.15 + 0.05);
        lg.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.15 + 0.5);
        osc.connect(lg);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.6);
      });
    } else if (type === "ding") {
      const osc = ctx.createOscillator(); osc.type = "sine";
      osc.frequency.value = 1047; // C6
      osc.connect(g);
      ramp(g, ctx, volume, 0.001, 1.0);
      osc.start(); osc.stop(ctx.currentTime + 1.2);
    } else if (type === "ping") {
      const osc = ctx.createOscillator(); osc.type = "square";
      osc.frequency.value = 1200;
      osc.connect(g);
      ramp(g, ctx, volume * 0.3, 0.001, 0.2);
      osc.start(); osc.stop(ctx.currentTime + 0.25);
    }
  } catch { /* AudioContext 차단 시 무시 */ }
}
