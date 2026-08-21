const fs = require('fs');
const file = 'src/components/screens/TalentAcquisitionScreen.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "const result = await TalentAcquisitionService.processAadhaarVerification(userSession, selectedCandidate.id);",
  "const result = await TalentAcquisitionService.processAadhaarVerification(userSession!, selectedCandidate.id);"
);

code = code.replace(
  "loadData(); // Refresh UI",
  "fetchData(); // Refresh UI"
);

fs.writeFileSync(file, code);
