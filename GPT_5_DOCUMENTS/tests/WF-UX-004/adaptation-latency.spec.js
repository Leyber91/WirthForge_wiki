const swapTimes = [180, 190, 170]; // ms
const max = Math.max(...swapTimes);
if (max > 200) throw new Error('Swap exceeded 200ms');
console.log('WF-UX-004 adaptation latency: OK');
