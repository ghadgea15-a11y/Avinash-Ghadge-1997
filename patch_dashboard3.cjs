const fs = require('fs');

const file = 'src/components/screens/OrgSetupWizardScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const workforceCount = \{/g,
  'const dashboardCounts = {'
);

content = content.replace(
  /workforceCount\.A2/g,
  'dashboardCounts.A2'
);
content = content.replace(
  /workforceCount\.A3/g,
  'dashboardCounts.A3'
);
content = content.replace(
  /workforceCount\.A4/g,
  'dashboardCounts.A4'
);
content = content.replace(
  /workforceCount\.A5/g,
  'dashboardCounts.A5'
);
content = content.replace(
  /workforceCount\.A6/g,
  'dashboardCounts.A6'
);
content = content.replace(
  /workforceCount\.A7_A9/g,
  'dashboardCounts.A7_A9'
);

fs.writeFileSync(file, content);
console.log('Fixed variable names');
