const fs = require('fs');
const path = require('path');
function assert(cond, msg){ if(!cond) throw new Error(msg); }
const schemaPath = path.join(__dirname, '../../schemas/WF-BIZ-002-data-map.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
['data_types','retention_days','shared_with'].forEach(k => assert(schema.properties[k], `Missing ${k}`));
console.log('WF-BIZ-002 data map schema: OK');
