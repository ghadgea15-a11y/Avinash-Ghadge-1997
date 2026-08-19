import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';
import { UserSession } from '../types';
import { DataProtectionService } from './dataProtectionService';
import { SecurityAuditService } from './securityAuditService';

export class StorageService {
  /**
   * Uploads a file to Firebase Storage and returns the download URL with session authorization check.
   * @param path The full storage path (e.g., 'companies/C1/employees/E1/avatar.jpg')
   * @param file The file object to upload
   * @param session Optional UserSession to enforce tenant & role authorization
   */
  static async uploadFile(path: string, file: File, session?: UserSession | null): Promise<string> {
    if (session) {
      const authCheck = DataProtectionService.validateStorageAccess(session, path, 'WRITE');
      if (!authCheck.allowed) {
        await SecurityAuditService.logEvent(
          session.companyId,
          session.userId,
          session.role,
          session.employeeId,
          'UNAUTHORIZED_STORAGE_ACCESS',
          'STORAGE',
          path,
          false,
          'HIGH',
          authCheck.reason || 'Unauthorized storage file upload attempt'
        ).catch(() => {});
        throw new Error(authCheck.reason || 'Unauthorized storage upload.');
      }
    }

    const storageRef = ref(storage, path);
    const uploadTask = await uploadBytesResumable(storageRef, file);
    const downloadURL = await getDownloadURL(uploadTask.ref);
    return downloadURL;
  }

  /**
   * Deletes a file from Firebase Storage with session authorization check.
   * @param pathOrUrl The full storage path (e.g., 'companies/C1/employees/E1/avatar.jpg')
   * @param session Optional UserSession to enforce tenant & role authorization
   */
  static async deleteFile(pathOrUrl: string, session?: UserSession | null): Promise<boolean> {
    if (session) {
      const authCheck = DataProtectionService.validateStorageAccess(session, pathOrUrl, 'DELETE');
      if (!authCheck.allowed) {
        await SecurityAuditService.logEvent(
          session.companyId,
          session.userId,
          session.role,
          session.employeeId,
          'UNAUTHORIZED_STORAGE_ACCESS',
          'STORAGE',
          pathOrUrl,
          false,
          'HIGH',
          authCheck.reason || 'Unauthorized storage file delete attempt'
        ).catch(() => {});
        console.error('[StorageService] Unauthorized file deletion blocked:', authCheck.reason);
        return false;
      }
    }

    try {
      const storageRef = ref(storage, pathOrUrl);
      await deleteObject(storageRef);
      return true;
    } catch (err: any) {
      // If it doesn't exist, we don't care, we just wanted it gone anyway
      if (err.code === 'storage/object-not-found') return true;
      console.error('[StorageService] Error deleting file:', err);
      return false;
    }
  }
}
