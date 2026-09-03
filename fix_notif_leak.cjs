const fs = require('fs');
let file = 'src/services/firestoreService.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /static subscribeToNotifications\([\s\S]*?limit\(20\)\n      \);/,
  `static subscribeToNotifications(
    companyId: string,
    role: string,
    uid: string,
    onData: (notifications: AppNotification[]) => void
  ): () => void {
    try {
      const q = query(
        collection(db, 'companies', companyId, 'notifications'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );`
);

code = code.replace(
  /\} as AppNotification\)\)\.filter\(n => \{[\s\S]*?return n\.roleScope\.includes\(role as UserRole\);\n          \}\);/,
  `} as AppNotification)).filter(n => {
            const isRecipient = n.recipientUid === uid || n.recipientId === uid;
            const isInRoleScope = n.roleScope && n.roleScope.includes(role as UserRole);
            const isGlobalBroadcast = !n.recipientUid && !n.recipientId && (!n.roleScope || n.roleScope.length === 0);
            
            return isRecipient || isInRoleScope || isGlobalBroadcast;
          });`
);

fs.writeFileSync(file, code);

file = 'src/App.tsx';
code = fs.readFileSync(file, 'utf8');
code = code.replace(
  /FirestoreService\.subscribeToNotifications\(userSession\.companyId, userSession\.role,/,
  `FirestoreService.subscribeToNotifications(userSession.companyId, userSession.role, userSession.uid,`
);
fs.writeFileSync(file, code);

file = 'src/components/screens/NotificationsScreen.tsx';
code = fs.readFileSync(file, 'utf8');
code = code.replace(
  /FirestoreService\.subscribeToNotifications\(userSession\.companyId, userSession\.role,/,
  `FirestoreService.subscribeToNotifications(userSession.companyId, userSession.role, userSession.uid,`
);
fs.writeFileSync(file, code);
