const fs = require('fs');
let file = 'src/services/firestoreService.ts';
let code = fs.readFileSync(file, 'utf8');

// The method might be broken, let's find markNotificationRead and recreate subscribeToNotifications before it
const regex = /static subscribeToNotifications[\s\S]*?console\.error\('\[Firestore\] subscribe error:', err\);\n      \}\);\n\n      return unsubscribe;\n    \} catch \(e\) \{\n      console\.error\('\[Firestore\] subscribe fail:', e\);\n      return \(\) => \{\};\n    \}\n  \}/;
const replacement = `static subscribeToNotifications(
    companyId: string,
    role: string,
    uid: string,
    onData: (notifications: AppNotification[]) => void
  ): () => void {
    try {
      const isPrivileged = ['Platform Admin', 'Super Admin', 'Company Admin', 'A1_DIRECTOR_CEO', 'A2_VP_GM', 'A3_HR_HEAD', 'A3_FINANCE_HEAD', 'A3_OPERATIONS_HEAD', 'A3_IT_HEAD'].includes(role);
      
      if (isPrivileged) {
        const q = query(collection(db, 'companies', companyId, 'notifications'), orderBy('timestamp', 'desc'), limit(50));
        return onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification)).filter(n => {
              const isRecipient = n.recipientUid === uid || n.recipientId === uid;
              const isInRoleScope = n.roleScope && n.roleScope.includes(role as UserRole);
              const isGlobalBroadcast = !n.recipientUid && !n.recipientId && (!n.roleScope || n.roleScope.length === 0);
              return isRecipient || isInRoleScope || isGlobalBroadcast;
            });
            onData(notifs);
          } else {
            onData([]);
          }
        }, (err) => {
           console.error('[Firestore] subscribe error:', err);
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
        }, (err) => console.error('[Firestore] subscribe error:', err));

        const unsubRole = onSnapshot(qRole, (snapshot) => {
          roleNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
          notifyCombined();
        }, (err) => console.error('[Firestore] subscribe error:', err));

        return () => {
          unsubRecipient();
          unsubRole();
        };
      }
    } catch (e) {
      console.error('[Firestore] subscribe fail:', e);
      return () => {};
    }
  }`;

if (code.match(regex)) {
  code = code.replace(regex, replacement);
} else {
  console.log("Could not find method to replace, let's search manually.");
}
fs.writeFileSync(file, code);
