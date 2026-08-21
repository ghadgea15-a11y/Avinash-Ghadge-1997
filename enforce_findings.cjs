const fs = require('fs');
const file = 'src/components/screens/TalentAcquisitionScreen.tsx';
let code = fs.readFileSync(file, 'utf8');

const updatedLogic = `  const handleSubmitVerificationProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userSession || !selectedVerification) return;

    if (bgvProcessFormData.result === 'FAILED' && !bgvProcessFormData.findings.trim()) {
      alert('Findings or Rejection Reason is required when a verification fails.');
      return;
    }

    setIsUpdatingVerification(true);`;

const regex = /  const handleSubmitVerificationProcess = async \(e: React\.FormEvent\) => \{\n    e\.preventDefault\(\);\n    if \(!userSession \|\| !selectedVerification\) return;\n\n    setIsUpdatingVerification\(true\);/m;
code = code.replace(regex, updatedLogic);

fs.writeFileSync(file, code);
