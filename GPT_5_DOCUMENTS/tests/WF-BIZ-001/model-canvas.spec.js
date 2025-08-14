const fs = require('fs');
const path = require('path');
function assert(cond, msg){ if(!cond) throw new Error(msg); }
const svgPath = path.join(__dirname, '../../assets/figures/WF-BIZ-001-model-canvas.svg');
const content = fs.readFileSync(svgPath, 'utf8');
assert(content.includes('<svg'), 'Canvas SVG missing <svg> tag');
console.log('WF-BIZ-001 model canvas figure: OK');
