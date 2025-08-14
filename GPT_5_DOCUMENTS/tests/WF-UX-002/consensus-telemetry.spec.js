const streams = [
  {id: 'A', tokens: ['hello','world']},
  {id: 'B', tokens: ['hello','earth']}
];
const consensus = streams[0].tokens.filter((t,i) => streams[1].tokens[i] === t).length / streams[0].tokens.length;
if (consensus < 0.5) throw new Error('Consensus ratio too low');
console.log('WF-UX-002 consensus telemetry: OK');
