const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const diagramPath = path.join(__dirname, '../../assets/diagrams/WF-FND-003-layers.mmd');
const dataflowPath = path.join(__dirname, '../../assets/diagrams/WF-FND-003-dataflow.mmd');

const layersDiagram = fs.readFileSync(diagramPath, 'utf8');
['L1', 'L2', 'L3', 'L4', 'L5'].forEach(layer => {
  assert(layersDiagram.includes(layer), `Missing ${layer} in layers diagram`);
});

const dataflowDiagram = fs.readFileSync(dataflowPath, 'utf8');
['token', 'event', 'user'].forEach(keyword => {
  assert(dataflowDiagram.toLowerCase().includes(keyword), `Dataflow missing ${keyword}`);
});

console.log('WF-FND-003 layer contract tests: OK');
