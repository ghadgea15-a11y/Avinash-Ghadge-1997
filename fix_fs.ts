import * as fs from 'fs';

let content = fs.readFileSync('src/services/firestoreService.ts', 'utf-8');
content = content.replace(
  "static subscribeToInventoryVendors(\n    companyId: string,\n    onData: (vendors: InventoryVendorRecord[]) => void\n  )",
  "static subscribeToInventoryVendors(\n    userSession: UserSession,\n    companyId: string,\n    onData: (vendors: InventoryVendorRecord[]) => void\n  )"
);
fs.writeFileSync('src/services/firestoreService.ts', content);
