import { UserSession, PlatformPermission } from '../types';

export class PlatformAuthClient {
  /**
   * Client-side check for UI visibility only.
   * ALWAYS verify again on the server side for sensitive operations.
   */
  static hasPermission(session: UserSession | null, permission: PlatformPermission): boolean {
    if (!session || session.role !== 'SUPER_ADMIN') {
      return false;
    }

    // By default, if the session has role SUPER_ADMIN, we show the UI
    // The server will enforce more granular permissions if they are configured in the super_admins record
    return true;
  }

  static isSuperAdmin(session: UserSession | null): boolean {
    return session?.role === 'SUPER_ADMIN';
  }
}
