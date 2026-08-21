const fs = require('fs');
const file = 'src/components/screens/TalentAcquisitionScreen.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace("        fetchData(); // Refresh UI", "");

fs.writeFileSync(file, code);
