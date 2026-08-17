const fs = require('fs');

function fix(file) {
  let code = fs.readFileSync(file, 'utf8');

  // Replace everything from OfflineSyncService.queueAction to }; return ( with just return (
  code = code.replace(/OfflineSyncService\.queueAction[\s\S]*?\}\s*;\s*return \(/, 'return (');
  
  fs.writeFileSync(file, code);
}

['src/components/screens/dashboards/SkilledStaffDashboard.tsx',
 'src/components/screens/dashboards/SemiSkilledDashboard.tsx',
 'src/components/screens/dashboards/SupportStaffDashboard.tsx'].forEach(fix);
