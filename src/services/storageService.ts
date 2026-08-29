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
 * Handles file uploads, downloads, and management for documents, 
 * identity badges, and evidence captures.
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
    const uploadTask = await uploadBytesResumable(storageRef, file, typeof metadata === 'object' && metadata?.cacheControl ? metadata : undefined);
    return getDownloadURL(uploadTask.ref);
  }

  /**
   * Deletes a file from Firebase Storage.
   */
  public static async deleteFile(path: string, _session?: any): Promise<void> {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
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
