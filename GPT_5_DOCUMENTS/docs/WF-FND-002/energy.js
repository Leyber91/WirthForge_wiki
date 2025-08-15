// Sample energy calculation
export function energy(cadence, certainty, stall, w1 = 0.4, w2 = 0.4, w3 = 0.2) {
  const e = w1*cadence + w2*certainty + w3*(1-stall);
  return Math.min(1, Math.max(0, e));
}
