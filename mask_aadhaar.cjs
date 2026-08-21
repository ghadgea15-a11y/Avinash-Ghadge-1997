const fs = require('fs');
const file = 'src/components/screens/TalentAcquisitionScreen.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "<div className=\"text-[11px] text-slate-500\">{selectedCandidate.aadhaarNumber || 'Not submitted'}</div>",
  "<div className=\"text-[11px] text-slate-500\">{selectedCandidate.aadhaarNumber ? 'XXXXXXXX' + selectedCandidate.aadhaarNumber.slice(-4) : 'Not submitted'}</div>"
);

fs.writeFileSync(file, code);
