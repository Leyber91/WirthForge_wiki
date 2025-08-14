const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const schema = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../schemas/WF-FND-004-emission.json'), 'utf8')
);

const sample = { frame: 0, energy: 1.2, payload: { tokens: 5 } };

// Basic schema checks
['frame', 'energy', 'payload'].forEach(key => {
  assert(Object.prototype.hasOwnProperty.call(sample, key), `missing ${key}`);
});
assert(typeof sample.frame === 'number' && sample.frame >= 0, 'frame must be non-negative number');
assert(typeof sample.energy === 'number' && sample.energy >= 0, 'energy must be non-negative number');
assert(typeof sample.payload === 'object', 'payload must be object');

// Ensure schema lists required fields
schema.required.forEach(key => {
  assert(sample[key] !== undefined, `sample missing required ${key}`);
});

console.log('WF-FND-004 emission contract tests: OK');
