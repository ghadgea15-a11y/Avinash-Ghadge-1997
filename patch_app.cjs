const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
if (!code.includes('import { SuperAdminSubscriptionsScreen }')) {
  code = code.replace(
    /import \{ SuperAdminCompaniesScreen \} from '\.\/components\/screens\/SuperAdminCompaniesScreen';/,
    `import { SuperAdminCompaniesScreen } from './components/screens/SuperAdminCompaniesScreen';\nimport { SuperAdminSubscriptionsScreen } from './components/screens/SuperAdminSubscriptionsScreen';`
  );
  fs.writeFileSync('src/App.tsx', code);
}
