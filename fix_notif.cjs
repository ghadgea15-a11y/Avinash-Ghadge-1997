const fs = require('fs');

let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

code = code.replace(/static subscribeToNotifications\(/, 
`static async createNotification(notification: AppNotification): Promise<boolean> {
    try {
      const ref = doc(db, 'notifications', notification.id);
      await setDoc(ref, notification);
      return true;
    } catch (e) {
      console.warn('[Firestore] createNotification error:', e);
      return false;
    }
  }

  static subscribeToNotifications(`);

fs.writeFileSync('src/services/firestoreService.ts', code);
