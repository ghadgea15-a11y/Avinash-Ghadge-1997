import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

export class PushNotificationService {
  /**
   * Registers a new FCM token to the employee's profile
   */
  static async registerToken(companyId: string, employeeId: string, fcmToken: string): Promise<boolean> {
    try {
      if (!companyId || !employeeId || !fcmToken) return false;
      const empRef = doc(db, 'companies', companyId, 'employees', employeeId);
      await updateDoc(empRef, {
        fcmTokens: arrayUnion(fcmToken)
      });
      return true;
    } catch (err) {
      console.error('[PushNotificationService] Failed to register token:', err);
      return false;
    }
  }

  /**
   * Unregisters an FCM token (e.g., on manual logout)
   */
  static async unregisterToken(companyId: string, employeeId: string, fcmToken: string): Promise<boolean> {
    try {
      if (!companyId || !employeeId || !fcmToken) return false;
      const empRef = doc(db, 'companies', companyId, 'employees', employeeId);
      await updateDoc(empRef, {
        fcmTokens: arrayRemove(fcmToken)
      });
      return true;
    } catch (err) {
      console.error('[PushNotificationService] Failed to unregister token:', err);
      return false;
    }
  }
}
