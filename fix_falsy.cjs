const fs = require('fs');
function fixFalsy(filePath) {
  let text = fs.readFileSync(filePath, 'utf8');
  text = text.replace(/emp \? \(emp\.firstName \+ " " \+ emp\.lastName\) \: "" \|\| ''/g, 'emp ? (emp.firstName + " " + emp.lastName) : ""');
  fs.writeFileSync(filePath, text);
}
fixFalsy('src/components/screens/DeploymentManagementScreen.tsx');
fixFalsy('src/components/screens/ShiftRosterScreen.tsx');
