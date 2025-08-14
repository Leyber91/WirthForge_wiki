const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '../../schemas/WF-TECH-004-snapshot.json'), 'utf8'));
const sample = {id: 's1', events: ['e1','e2'], total_energy: 2};
['id','events','total_energy'].forEach(k => {
  assert(schema.required.includes(k), `Schema missing ${k}`);
  assert(sample[k] !== undefined, `Sample missing ${k}`);
});
console.log('WF-TECH-004 snapshot schema: OK');
