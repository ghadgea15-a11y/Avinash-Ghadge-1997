import * as fs from 'fs';
const file = 'src/components/screens/MandatoryRefreshersScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/activeCompany\.id/g, 'activeCompany.companyId');

fs.writeFileSync(file, content);
