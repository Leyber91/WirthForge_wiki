const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const manifestPath = path.join(__dirname, '../../code/WF-TECH-001/runtime-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert(manifest.loop_hz === 60, 'Loop must run at 60Hz');
['orchestrator','decipher','transport','state'].forEach(proc => {
  assert(manifest.processes[proc], `Missing process ${proc}`);
});

console.log('WF-TECH-001 boot manifest: OK');
