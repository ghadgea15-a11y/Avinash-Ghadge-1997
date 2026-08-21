import * as fs from 'fs';

const file = 'src/components/screens/PurchaseOrderManagementScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "import { getCompanyDb } from '../../services/firebase';",
  "import { db, functions } from '../../firebase';"
);

content = content.replace(
  "import { getFunctions, httpsCallable } from 'firebase/functions';",
  "import { httpsCallable } from 'firebase/functions';"
);

// Remove getCompanyDb calls
content = content.replace(/const db = getCompanyDb\(\);/g, "");
content = content.replace(/const functions = getFunctions\(\);/g, "");

fs.writeFileSync(file, content);
console.log('Fixed imports in PurchaseOrderManagementScreen');
