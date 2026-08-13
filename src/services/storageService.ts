import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

export class StorageService {
  /**
   * Uploads a file to Firebase Storage and returns the download URL.
   * @param path The full storage path (e.g., 'companies/C1/employees/E1/avatar.jpg')
   * @param file The file object to upload
   */
  static async uploadFile(path: string, file: File): Promise<string> {
    const storageRef = ref(storage, path);
    const uploadTask = await uploadBytesResumable(storageRef, file);
    const downloadURL = await getDownloadURL(uploadTask.ref);
    return downloadURL;
  }

  /**
   * Deletes a file from Firebase Storage.
   * @param path The full storage path (e.g., 'companies/C1/employees/E1/avatar.jpg')
   */
  static async deleteFile(pathOrUrl: string): Promise<boolean> {
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
