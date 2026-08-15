const fs = require('fs');
let code = fs.readFileSync('src/services/subscriptionService.ts', 'utf8');

const targetStr = `  static async checkModuleAccess(companyId: string, moduleId: string): Promise<boolean> {
    const docRef = doc(db, 'companies', companyId, ENTITLEMENTS_COLLECTION, moduleId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return false;
    const data = snap.data() as ModuleEntitlement;
    return data.enabled;
  }`;

// Find index of targetStr, then truncate the file up to that + length of targetStr, then add a closing brace.
const idx = code.indexOf(targetStr);
if (idx !== -1) {
  code = code.substring(0, idx + targetStr.length) + "\n}\n";
  fs.writeFileSync('src/services/subscriptionService.ts', code);
}
