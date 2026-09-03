const fs = require('fs');

const file = 'src/components/screens/OrgSetupWizardScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

// Ensure REQUIRED_DEPTS is a global constant
if (!content.includes('const REQUIRED_DEPTS_GLOBAL')) {
  content = content.replace(
    /type EmployeeRecord = any;/g,
    `type EmployeeRecord = any;\nconst REQUIRED_DEPTS_GLOBAL = ['HR', 'FINANCE', 'ADMIN', 'PROCUREMENT', 'EHS', 'QUALITY'];`
  );
  content = content.replace(/REQUIRED_DEPTS/g, 'REQUIRED_DEPTS_GLOBAL');
}

// Ensure missingA3 is passed to WizardStepContent
content = content.replace(
  /missingA4={missingA4}/g,
  `missingA3={missingA3}\n              missingA4={missingA4}`
);

content = content.replace(
  /missingA4, missingA5, missingA6/g,
  `missingA3, missingA4, missingA5, missingA6`
);

fs.writeFileSync(file, content);
console.log('Fixed file');
