const fs = require('fs');
let file = 'src/services/firestoreService.ts';
let code = fs.readFileSync(file, 'utf8');

const brokenRegex = /\/\/ For owners and official staff, we can query all and filter locally[\s\S]*?return \(\) => \{\};\n    \}\n  \}/;
const replacement = `      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VendorRecord));
    } catch (e) {
      console.error('[FirestoreService] getVendors error:', e);
      return [];
    }
  }

  static async createNotification(companyId: string, data: any): Promise<boolean> {
    try {
      const notifRef = doc(collection(db, 'companies', companyId, 'notifications'));
      await setDoc(notifRef, {
        ...data,
        id: notifRef.id,
        createdAt: new Date().toISOString(),
        timestamp: new Date().toISOString()
      });
      return true;
    } catch (e) {
      console.warn('[Firestore] createNotification error:', e);
      return false;
    }
  }

  static subscribeToNotifications(
    session: any,
    companyId: string,
    onData: (data: AppNotification[]) => void
  ): () => void {
    if (!companyId) {
      onData([]);
      return () => {};
    }
    
    const uid = session?.uid || session?.userId;
    const role = session?.role;

    try {
      const isPrivileged = ['Platform Admin', 'Super Admin', 'Company Admin', 'A1_DIRECTOR_CEO', 'A2_VP_GM', 'A3_HR_HEAD', 'A3_FINANCE_HEAD', 'A3_OPERATIONS_HEAD', 'A3_IT_HEAD'].includes(role);
      
      if (isPrivileged) {
        const q = query(collection(db, 'companies', companyId, 'notifications'), orderBy('timestamp', 'desc'), limit(50));
        return onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification)).filter(n => {
              const isRecipient = n.recipientUid === uid || n.recipientId === uid;
              const isInRoleScope = n.roleScope && n.roleScope.includes(role);
              const isGlobalBroadcast = !n.recipientUid && !n.recipientId && (!n.roleScope || n.roleScope.length === 0);
              return isRecipient || isInRoleScope || isGlobalBroadcast;
            });
            onData(notifs);
          } else {
            onData([]);
          }
        });
      } else {
        const qRecipient = query(collection(db, 'companies', companyId, 'notifications'), where('recipientUid', '==', uid), orderBy('timestamp', 'desc'), limit(20));
        const qRole = query(collection(db, 'companies', companyId, 'notifications'), where('roleScope', 'array-contains', role), orderBy('timestamp', 'desc'), limit(20));
        
        let recipientNotifs: AppNotification[] = [];
        let roleNotifs: AppNotification[] = [];
        
        const notifyCombined = () => {
          const map = new Map();
          recipientNotifs.forEach(n => map.set(n.id, n));
          roleNotifs.forEach(n => map.set(n.id, n));
          const combined = Array.from(map.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          onData(combined.slice(0, 50));
        };
        const unsubRecipient = onSnapshot(qRecipient, (snapshot) => {
          recipientNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
          notifyCombined();
        });
        const unsubRole = onSnapshot(qRole, (snapshot) => {
          roleNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
          notifyCombined();
        });
        return () => {
          unsubRecipient();
          unsubRole();
        };
      }
    } catch (e) {
      console.warn('[Firestore] Notifications realtime failed:', e);
      onData([]);
      return () => {};
    }
  }`;

if (code.match(brokenRegex)) {
  code = code.replace(brokenRegex, replacement);
  fs.writeFileSync(file, code);
  console.log("REPLACED SUCCESSFULLY!");
} else {
  console.log("REGEX DID NOT MATCH!");
}
