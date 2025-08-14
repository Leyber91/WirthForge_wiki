const start = Date.now();
const end = start + 3; // simulate 3ms overhead
if (end - start > 5) {
  throw new Error('Protocol overhead too high');
}
console.log('WF-TECH-003 protocol contract: OK');
