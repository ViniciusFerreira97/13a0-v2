export function sigma(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function clamp(x: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, x));
}
