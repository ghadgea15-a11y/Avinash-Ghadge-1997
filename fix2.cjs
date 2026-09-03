const fs = require('fs');

const file = 'src/components/screens/OrgSetupWizardScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /icon={<Map className="w-4 h-4"\/>\s*case 3:/s,
  `icon={<Map className="w-4 h-4" />} />
    case 3:`
);

content = content.replace(
  /icon={<MapPin className="w-4 h-4"\/>\s*case 4:/s,
  `icon={<MapPin className="w-4 h-4" />} />
    case 4:`
);

fs.writeFileSync(file, content);
console.log('Fixed file');
