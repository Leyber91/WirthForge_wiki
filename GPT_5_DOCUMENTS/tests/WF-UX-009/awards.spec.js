const schema = require('../../schemas/WF-UX-009-achievements.json');
['id','description','condition'].forEach(k=>{
  if(!schema.required.includes(k)) throw new Error('Schema missing '+k);
});
console.log('WF-UX-009 awards system: OK');
