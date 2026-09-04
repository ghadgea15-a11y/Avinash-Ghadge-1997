const fs = require('fs');
let code = fs.readFileSync('src/components/wfm/PunchStation.tsx', 'utf8');

code = code.replace(
  "  const handlePunchClick = (action: 'PUNCH_IN' | 'PUNCH_OUT') => {\n    if (action === 'PUNCH_IN' && !selfie) {\n      setIsCameraActive(true);\n      setPendingAction(action);\n      return;\n    }",
  "  const handlePunchClick = (action: 'PUNCH_IN' | 'PUNCH_OUT') => {\n    if (!selfie) {\n      setIsCameraActive(true);\n      setPendingAction(action);\n      return;\n    }"
);

code = code.replace(
  "    if (action === 'PUNCH_IN' && !selfie) {\n      showError('Identity verification photo is required for Punch-In.');\n      setIsCameraActive(true);\n      return;\n    }",
  "    if (!selfie) {\n      showError('Identity verification photo is required for Attendance.');\n      setIsCameraActive(true);\n      return;\n    }"
);

fs.writeFileSync('src/components/wfm/PunchStation.tsx', code);
console.log('patched PunchStation');
