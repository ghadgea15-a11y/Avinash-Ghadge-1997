import { storage } from '../firebase';
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject, 
  listAll,
  UploadMetadata
} from 'firebase/storage';

/**
 * Enterprise Storage Service
 * 
 * Handles file uploads, downloads, and lifecycle management for documents, 
 * identity badges, candidate records, and profile photos.
 */
export class StorageService {
  /**
   * Uploads a file to a specific path in Firebase Storage.
   */
  public static async uploadFile(
    path: string, 
    file: Blob | File, 
    metadata?: any
  ): Promise<string> {
    const storageRef = ref(storage, path);
    const uploadTask = await uploadBytesResumable(
      storageRef, 
      file, 
      typeof metadata === 'object' && metadata?.cacheControl ? metadata : undefined
    );
    return getDownloadURL(uploadTask.ref);
  }

  /**
   * Deletes a file from Firebase Storage safely by path or download URL.
   */
  public static async deleteFile(pathOrUrl: string, _session?: any): Promise<void> {
    if (!pathOrUrl || typeof pathOrUrl !== 'string') return;
    try {
      let storageRef;
      if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('gs://')) {
        // Firebase Storage SDK supports ref from full download URL or gs:// URI
        storageRef = ref(storage, pathOrUrl);
      } else {
        storageRef = ref(storage, pathOrUrl);
      }
      await deleteObject(storageRef);
    } catch (err: any) {
      // If object already does not exist (storage/object-not-found), ignore safely
      if (err?.code === 'storage/object-not-found') {
        return;
      }
      console.warn(`[StorageService] Warning deleting file: ${pathOrUrl}`, err?.message || err);
    }
  }

  /**
   * Safely cleans up a previously stored file when a new version is uploaded.
   */
  public static async cleanupOldFile(oldUrlOrPath?: string): Promise<void> {
    if (!oldUrlOrPath || typeof oldUrlOrPath !== 'string' || oldUrlOrPath.startsWith('data:')) {
      return;
    }
    await this.deleteFile(oldUrlOrPath);
  }

  /**
   * Generates a structured path for company-specific documents.
   */
  public static getCompanyPath(companyId: string, module: string, filename: string): string {
    return `companies/${companyId}/${module}/${Date.now()}_${filename}`;
  }

  /**
   * Generates a path for employee documents.
   */
  public static getEmployeePath(companyId: string, employeeId: string, type: string, filename: string): string {
    return `companies/${companyId}/employees/${employeeId}/${type}/${Date.now()}_${filename}`;
  }
}

