import { db } from '../firebase';
import { 
  collection, doc, getDocs, getDoc, setDoc, updateDoc, 
  query, where, orderBy, writeBatch
} from 'firebase/firestore';
import { SrmVendorRecord, SrmClientRecord } from '../types';
import { FirestoreService } from './firestoreService';

export class SrmService {
  static async getVendors(companyId: string): Promise<SrmVendorRecord[]> {
    const q = query(
      collection(db, `companies/${companyId}/vendors`),
      orderBy('name', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as SrmVendorRecord);
  }

  static async getClients(companyId: string): Promise<SrmClientRecord[]> {
    const q = query(
      collection(db, `companies/${companyId}/clients`),
      orderBy('name', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as SrmClientRecord);
  }

  static async saveVendor(companyId: string, vendor: SrmVendorRecord, actorId: string, actorName: string): Promise<void> {
    const ref = doc(db, `companies/${companyId}/vendors`, vendor.id);
    const isNew = !(await getDoc(ref)).exists();
    
    await setDoc(ref, {
      ...vendor,
      updatedAt: new Date().toISOString(),
      updatedBy: actorId
    }, { merge: true });

    await FirestoreService.logAuditEvent(
      companyId, actorId, actorName, 
      isNew ? 'VENDOR_CREATED' : 'VENDOR_UPDATED', 
      `Vendor ${vendor.name} (${vendor.id}) was ${isNew ? 'created' : 'updated'}`,
      vendor.id
    );
  }

  static async saveClient(companyId: string, client: SrmClientRecord, actorId: string, actorName: string): Promise<void> {
    const ref = doc(db, `companies/${companyId}/clients`, client.id);
    const isNew = !(await getDoc(ref)).exists();
    
    await setDoc(ref, {
      ...client,
      updatedAt: new Date().toISOString(),
      updatedBy: actorId
    }, { merge: true });

    await FirestoreService.logAuditEvent(
      companyId, actorId, actorName, 
      isNew ? 'CLIENT_CREATED' : 'CLIENT_UPDATED', 
      `Client ${client.name} (${client.id}) was ${isNew ? 'created' : 'updated'}`,
      client.id
    );
  }
}
