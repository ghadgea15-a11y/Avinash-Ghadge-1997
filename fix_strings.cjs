const fs = require('fs');

const files = [
  'src/components/screens/ComplianceDashboardScreen.tsx',
  'src/components/screens/CustomReportsView.tsx',
  'src/components/screens/ScheduledReportsView.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\\\$/g, '$');
  content = content.replace(/\\`/g, '`');
  fs.writeFileSync(file, content);
}
