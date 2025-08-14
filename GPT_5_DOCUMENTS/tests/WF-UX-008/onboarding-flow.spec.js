const schema = require('../../schemas/WF-UX-008-events.json');
if (!schema.properties.door.enum.includes('forge')) throw new Error('Schema missing door options');
console.log('WF-UX-008 onboarding flow: OK');
