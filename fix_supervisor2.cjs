const fs = require('fs');
let content = fs.readFileSync('src/components/wfm/SupervisorRollCall.tsx', 'utf8');
content = content.replace(/status: PRESENT as any/g, "'HALFDAY'");
fs.writeFileSync('src/components/wfm/SupervisorRollCall.tsx', content);
