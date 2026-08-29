const fs = require('fs');
let text = fs.readFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', 'utf8');

const regex = /          \}\n        \}\);\n      setStats\(\{/g;
const replacement = `          }\n        }\n      });\n      setStats({`;

let changed = false;
if (regex.test(text)) {
  text = text.replace(regex, replacement);
  changed = true;
} else {
  console.log("No match found for regex in SuperAdminSubscriptionsScreen.tsx");
}

fs.writeFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', text);

const ptm = fs.readFileSync('src/components/operations/PatrolTourRunnerModal.tsx', 'utf8');
const ptmFixed = ptm.replace(/updatedAt: new Date\(\)\.toISOString\(\), e\);/g, `updatedAt: new Date().toISOString()\n      });\n      // e is undefined`);
if(ptm !== ptmFixed) {
    fs.writeFileSync('src/components/operations/PatrolTourRunnerModal.tsx', ptmFixed);
}
