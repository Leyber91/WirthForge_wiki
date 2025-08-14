const tokens = require('../../ui/WF-UX-007-design-tokens.json');
function Button(label){
  return `<button style="background:${tokens.primary}" aria-label="${label}">${label}</button>`;
}
module.exports = {Button};
