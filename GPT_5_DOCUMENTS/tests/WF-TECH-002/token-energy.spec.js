function tokensToEnergy(tokens) {
  // simple 1 ms per token -> 0.1 energy units
  return tokens.map(ms => ms * 0.1);
}

const sample = tokensToEnergy([10,20,30]);
if (sample[0] !== 1 || sample[2] !== 3) {
  throw new Error('Token timing conversion failed');
}
console.log('WF-TECH-002 token timing: OK');
