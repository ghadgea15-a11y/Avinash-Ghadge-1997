const fs = require('fs');

function replaceCompanyId(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  code = code.replace(/company\.id/g, 'company.companyId');
  fs.writeFileSync(filePath, code);
}

replaceCompanyId('src/components/scm/GatePassTab.tsx');
replaceCompanyId('src/components/scm/GateVerificationTab.tsx');
replaceCompanyId('src/components/scm/ItemMasterTab.tsx');
replaceCompanyId('src/components/scm/StockLedgerTab.tsx');
replaceCompanyId('src/components/scm/StockLocationTab.tsx');

let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(
  '<ScmModule session={userSession} company={activeCompany} />',
  '{activeCompany && <ScmModule session={userSession} company={activeCompany} />}'
);
fs.writeFileSync('src/App.tsx', appCode);

let scmCode = fs.readFileSync('src/services/scmService.ts', 'utf8');
scmCode = scmCode.replace(
  "from './firebase';",
  "from '../firebase';"
);
fs.writeFileSync('src/services/scmService.ts', scmCode);

