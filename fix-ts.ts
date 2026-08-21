import * as fs from 'fs';
const file = 'src/components/screens/MandatoryRefreshersScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "import { Company, UserSession",
  "import { CompanyTenant, UserSession"
);

content = content.replace(
  "activeCompany: Company;",
  "activeCompany: CompanyTenant;"
);

fs.writeFileSync(file, content);
