const fs = require('fs');

const file = 'src/components/screens/OrgSetupWizardScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /icon={<Briefcase className="w-4 h-4"\/>\s*<\/div>\s*\);\s*case 5:/s,
  `icon={<Briefcase className="w-4 h-4" />} />
          </div>
        );
    case 5:`
);

content = content.replace(
  /activeCompany={activeCompany\s*case 6:/s,
  `activeCompany={activeCompany} />
    case 6:`
);

content = content.replace(
  /departments={departments\s*<\/div>\s*\);/s,
  `departments={departments} />
          </div>
        );`
);

content = content.replace(
  /requiresRegion regions={regions\s*<\/div>\s*\);/s,
  `requiresRegion regions={regions} />
        </div>
      );`
);

content = content.replace(
  /requiresSite sites={sites\s*<\/div>\s*\);/gs,
  `requiresSite sites={sites} />
        </div>
      );`
);

content = content.replace(
  /sites={sites} employees={employees\s*default:/s,
  `sites={sites} employees={employees} />
    default:`
);

fs.writeFileSync(file, content);
console.log('Fixed file');
