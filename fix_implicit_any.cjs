const fs = require('fs');
function fixImplicit(filePath) {
  let text = fs.readFileSync(filePath, 'utf8');
  text = text.replace(/\(data\) => setDeployments/g, '(data: any) => setDeployments');
  text = text.replace(/\(data\) => setClients/g, '(data: any) => setClients');
  text = text.replace(/\(data\) => setEmployees/g, '(data: any) => setEmployees');
  text = text.replace(/\(data\) => setSites/g, '(data: any) => setSites');
  text = text.replace(/\(data\) => setShifts/g, '(data: any) => setShifts');
  fs.writeFileSync(filePath, text);
}
fixImplicit('src/components/screens/DeploymentManagementScreen.tsx');
fixImplicit('src/components/screens/ShiftRosterScreen.tsx');
