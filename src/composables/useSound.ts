// Efeitos sonoros sintetizados via Web Audio API — sem arquivos de áudio externos (evita
// questões de licenciamento e mantém o bundle leve, §8.1 "low-data mode"). Apito, gol e
// cartão são só osciladores com envelope de ganho, não amostras gravadas.

import { ref } from 'vue';

const STORAGE_KEY = 'glorias-sound-enabled';

export const soundEnabled = ref(localStorage.getItem(STORAGE_KEY) !== 'off');

export function toggleSound() {
  soundEnabled.value = !soundEnabled.value;
  localStorage.setItem(STORAGE_KEY, soundEnabled.value ? 'on' : 'off');
}

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, startOffset: number, duration: number, type: OscillatorType = 'sine', peak = 0.12) {
  if (!soundEnabled.value) return;
  const c = getCtx();
  if (!c) return;
  const start = c.currentTime + startOffset;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.03);
}

/** Apito curto de falta/impedimento. */
export function playFoulWhistle() {
  tone(2600, 0, 0.11, 'square', 0.05);
}

/** Apito duplo de início de jogo / cartão. */
export function playKickoffWhistle() {
  tone(2900, 0, 0.14, 'square', 0.07);
  tone(2900, 0.2, 0.14, 'square', 0.07);
}

/** Apito longo de fim de jogo. */
export function playFullTimeWhistle() {
  tone(2900, 0, 0.45, 'square', 0.07);
}

/** Buzina/fanfarra curta de gol — arpejo ascendente (só pro time do jogador). */
export function playGoalHorn() {
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((f, i) => tone(f, i * 0.09, 0.28, 'triangle', 0.1));
}

/** Vaia grave e descendente — gol do adversário. */
export function playBoo() {
  if (!soundEnabled.value) return;
  const c = getCtx();
  if (!c) return;
  const start = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, start);
  osc.frequency.exponentialRampToValueAtTime(85, start + 0.6);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.08, start + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.62);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + 0.65);
}

/** Zumbido curto e grave para cartão. */
export function playCardBuzz(severity: 'yellow' | 'red') {
  tone(severity === 'red' ? 110 : 180, 0, 0.28, 'sawtooth', 0.05);
}

/** Som neutro e discreto pra eventos "menores" (desarme, defesa, chute pra fora). */
export function playTick() {
  tone(700, 0, 0.06, 'sine', 0.03);
}
