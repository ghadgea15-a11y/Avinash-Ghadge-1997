const fs = require('fs');
let file = 'src/services/firestoreService.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /const q = query\([\s\S]*?limit\(50\)\n      \);[\s\S]*?const unsubscribe = onSnapshot\(q, \(snapshot\) => \{[\s\S]*?onData\(\[\]\);\n        \}\n      \}, \(err\) => \{/,
  `// For owners and official staff, we can query all and filter locally
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
        });
      } else {
        // Run multiple queries and merge for regular users to satisfy Firestore rules
        const qRecipient = query(collection(db, 'companies', companyId, 'notifications'), where('recipientUid', '==', uid), orderBy('timestamp', 'desc'), limit(20));
        // We might also need recipientId but usually it's recipientUid. We'll use recipientUid.
        const qRole = query(collection(db, 'companies', companyId, 'notifications'), where('roleScope', 'array-contains', role), orderBy('timestamp', 'desc'), limit(20));
        // Global broadcasts are harder to query without an explicit flag. We'll rely on the first two for employees.
        
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
      }`
);

fs.writeFileSync(file, code);
