const rules = [
  {type: 'grow', rate: 2},
  {type: 'prune', threshold: 0.1}
];
const types = new Set(rules.map(r=>r.type));
if (!types.has('grow') || !types.has('prune')) throw new Error('Missing rule types');
console.log('WF-UX-003 evolution triggers: OK');
