const fs = require('fs');
const file = 'src/components/screens/TalentAcquisitionScreen.tsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /const handleUpdateVerification = async \([\s\S]*?catch \(err\) \{[\s\S]*?\}\n  \};/m;
code = code.replace(regex, "");

fs.writeFileSync(file, code);
