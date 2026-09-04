const fs = require('fs');
let code = fs.readFileSync('src/components/wfm/PunchStation.tsx', 'utf8');

code = code.replace(
  /const handlePunchClick = \(action: 'PUNCH_IN' \| 'PUNCH_OUT'\) => \{\n    if \(!activeSelfie\) \{/,
  `const handlePunchClick = (action: 'PUNCH_IN' | 'PUNCH_OUT') => {
    if (!selfie) {`
);

code = code.replace(
  /\{!activeSelfie \? \(/g,
  `{!selfie ? (`
);

fs.writeFileSync('src/components/wfm/PunchStation.tsx', code);
console.log('fixed activeSelfie bug');
