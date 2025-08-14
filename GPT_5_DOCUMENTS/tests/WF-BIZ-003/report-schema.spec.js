const fs = require('fs');
const path = require('path');
function assert(cond, msg){ if(!cond) throw new Error(msg); }
const schemaPath = path.join(__dirname, '../../schemas/WF-BIZ-003-report.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
['reporter_id','content_id','reason','created_at'].forEach(k => assert(schema.properties[k], `Missing ${k}`));
console.log('WF-BIZ-003 report schema: OK');
