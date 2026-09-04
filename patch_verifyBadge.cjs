const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

const oldVerifyBadge = `  static async verifyBadge(companyId: string, badgeQuery: string, queryType: 'QR' | 'NUMBER'): Promise<any> {
    const colRef = collection(db, 'companies', companyId, 'identity_badges');
    const fieldName = queryType === 'QR' ? 'qrCode' : 'badgeNumber';
    const q = query(colRef, where(fieldName, '==', badgeQuery));
    const snap = await getDocs(q);
    if (snap.empty) {
      return { status: 'NOT_FOUND', badge: null, valid: false };
    }
    const badge = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
    const isValid = badge.status === 'ACTIVE' || badge.status === 'ISSUED';
    return { status: isValid ? 'VALID' : badge.status, badge, valid: isValid };
  }`;

const newVerifyBadge = `  static async verifyBadge(companyId: string, badgeQuery: string, queryType: 'QR' | 'NUMBER'): Promise<any> {
    const colRef = collection(db, 'companies', companyId, 'badges');
    if (queryType === 'QR') {
      const actualId = badgeQuery.startsWith('IDB-') ? badgeQuery.replace('IDB-', '') : badgeQuery;
      const docRef = doc(db, 'companies', companyId, 'badges', actualId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        return { status: 'NOT_FOUND', badge: null, valid: false };
      }
      const badge = { id: snap.id, ...snap.data() } as any;
      const isValid = badge.status === 'ACTIVE' || badge.status === 'ISSUED';
      return { status: isValid ? 'VALID' : badge.status, badge, valid: isValid };
    } else {
      const q = query(colRef, where('badgeNumber', '==', badgeQuery));
      const snap = await getDocs(q);
      if (snap.empty) {
        return { status: 'NOT_FOUND', badge: null, valid: false };
      }
      const badge = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
      const isValid = badge.status === 'ACTIVE' || badge.status === 'ISSUED';
      return { status: isValid ? 'VALID' : badge.status, badge, valid: isValid };
    }
  }`;

code = code.replace(oldVerifyBadge, newVerifyBadge);
fs.writeFileSync('src/services/firestoreService.ts', code);
console.log('patched verifyBadge');
