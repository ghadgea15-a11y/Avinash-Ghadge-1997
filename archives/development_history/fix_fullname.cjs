const fs = require('fs');

function fixName(filePath) {
  let text = fs.readFileSync(filePath, 'utf8');
  text = text.replace(/emp\.fullName/g, 'emp.firstName + " " + emp.lastName');
  text = text.replace(/e\.fullName/g, 'e.firstName + " " + e.lastName');
  text = text.replace(/userSession\.uid/g, 'userSession.userId'); // also fix userSession.uid -> userId
  fs.writeFileSync(filePath, text);
}

fixName('src/components/screens/DeploymentManagementScreen.tsx');
fixName('src/components/screens/ShiftRosterScreen.tsx');
