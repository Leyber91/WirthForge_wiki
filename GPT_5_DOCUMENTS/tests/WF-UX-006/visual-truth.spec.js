const map = require('../../ui/WF-UX-006-token-map.json');
if (!map.length || !map[0].token || !map[0].particle) throw new Error('Token map incomplete');
console.log('WF-UX-006 visual truth: OK');
