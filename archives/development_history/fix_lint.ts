import * as fs from 'fs';

['SupervisorDashboard.tsx', 'DirectorDashboard.tsx', 'SiteInChargeDashboard.tsx', 'GeneralManagerDashboard.tsx'].forEach(filename => {
  let content = fs.readFileSync('src/components/screens/dashboards/' + filename, 'utf-8');

  content = content.replace(
    /t\.status !== 'CLOSED'/g,
    "t.status !== 'CANCELLED'"
  );
  content = content.replace(
    /!\[\'COMPLETED\', \'RESOLVED\', \'CLOSED\'\]\.includes\(t\.status\)/g,
    "!['COMPLETED', 'RESOLVED', 'CANCELLED'].includes(t.status)"
  );
  
  fs.writeFileSync('src/components/screens/dashboards/' + filename, content);
});
