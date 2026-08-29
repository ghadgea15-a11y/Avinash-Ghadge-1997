import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, where, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { FirestoreService } from './firestoreService';
import { 
  ClientRecord, 
  ClientContactRecord, 
  ContractRecord, 
  ContractSiteMapping, 
  ContractScopeRecord, 
  ContractAmendmentRecord,
  AuditLogRecord
} from '../types';

export const crmService = {
  // CLIENTS
  async getClients(companyId: string): Promise<ClientRecord[]> {
    const q = query(collection(db, 'companies', companyId, 'clients'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as ClientRecord);
  },

  async getClient(companyId: string, clientId: string): Promise<ClientRecord | null> {
    const docRef = doc(db, 'companies', companyId, 'clients', clientId);
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as ClientRecord) : null;
  },

  async createClient(companyId: string, data: Omit<ClientRecord, 'createdAt' | 'updatedAt'>): Promise<void> {
    const docRef = doc(db, 'companies', companyId, 'clients', data.id);
    const ts = new Date().toISOString();
    const client = { ...data, createdAt: ts, updatedAt: ts };
    await setDoc(docRef, client);

    await FirestoreService.logAuditEvent(companyId, data.createdByUid, data.createdByName, 'CLIENT_CREATED', `Client ${data.name} created`, data.id);
  },

  async updateClient(companyId: string, clientId: string, data: Partial<ClientRecord>, userId?: string, userName?: string): Promise<void> {
    const docRef = doc(db, 'companies', companyId, 'clients', clientId);
    await updateDoc(docRef, { ...data, updatedAt: new Date().toISOString() });
    
    await FirestoreService.logAuditEvent(companyId, userId || 'SYSTEM', userName || 'System', 'CLIENT_UPDATED', `Client ${clientId} updated`, clientId);
  },

  // CLIENT CONTACTS
  async getClientContacts(companyId: string, clientId: string): Promise<ClientContactRecord[]> {
    const q = query(collection(db, 'companies', companyId, 'client_contacts'), where('clientId', '==', clientId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as ClientContactRecord);
  },

  async createClientContact(companyId: string, data: ClientContactRecord, userId?: string, userName?: string): Promise<void> {
    const docRef = doc(db, 'companies', companyId, 'client_contacts', data.id);
    await setDoc(docRef, data);
    await this.logAudit(companyId, 'client.contact_added', data.clientId, null, userId, userName);
  },
  
  async updateClientContact(companyId: string, contactId: string, data: Partial<ClientContactRecord>, userId?: string, userName?: string): Promise<void> {
    const docRef = doc(db, 'companies', companyId, 'client_contacts', contactId);
    await updateDoc(docRef, data);
  },

  // CONTRACTS
  async getContracts(companyId: string): Promise<ContractRecord[]> {
    const q = query(collection(db, 'companies', companyId, 'contracts'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as ContractRecord);
  },

  async getContractsForClient(companyId: string, clientId: string): Promise<ContractRecord[]> {
    const q = query(collection(db, 'companies', companyId, 'contracts'), where('clientId', '==', clientId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as ContractRecord);
  },

  async getContract(companyId: string, contractId: string): Promise<ContractRecord | null> {
    const docRef = doc(db, 'companies', companyId, 'contracts', contractId);
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as ContractRecord) : null;
  },

  async createContract(companyId: string, data: Omit<ContractRecord, 'createdAt' | 'updatedAt'>): Promise<void> {
    const docRef = doc(db, 'companies', companyId, 'contracts', data.id);
    const ts = new Date().toISOString();
    const contract = { ...data, createdAt: ts, updatedAt: ts };
    await setDoc(docRef, contract);

    await this.logAudit(companyId, 'contract.created', data.clientId, data.id, data.createdByUid, data.createdByName);
  },

  async updateContractStatus(companyId: string, contractId: string, clientId: string, status: ContractRecord['status'], userId?: string, userName?: string): Promise<void> {
    const docRef = doc(db, 'companies', companyId, 'contracts', contractId);
    await updateDoc(docRef, { status, updatedAt: new Date().toISOString() });
    
    await this.logAudit(companyId, `contract.${status.toLowerCase()}`, clientId, contractId, userId, userName);
  },
  
  async updateContract(companyId: string, contractId: string, clientId: string, data: Partial<ContractRecord>, userId?: string, userName?: string): Promise<void> {
    const docRef = doc(db, 'companies', companyId, 'contracts', contractId);
    await updateDoc(docRef, { ...data, updatedAt: new Date().toISOString() });
    
    await this.logAudit(companyId, 'contract.updated', clientId, contractId, userId, userName);
  },

  // CONTRACT SITES
  async getContractSites(companyId: string, contractId: string): Promise<ContractSiteMapping[]> {
    const q = query(collection(db, 'companies', companyId, 'contract_sites'), where('contractId', '==', contractId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as ContractSiteMapping);
  },

  async mapContractSite(companyId: string, data: ContractSiteMapping): Promise<void> {
    const docRef = doc(db, 'companies', companyId, 'contract_sites', data.id);
    await setDoc(docRef, data);
  },

  // CONTRACT SCOPES
  async getContractScopes(companyId: string, contractId: string): Promise<ContractScopeRecord[]> {
    const q = query(collection(db, 'companies', companyId, 'contract_scopes'), where('contractId', '==', contractId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as ContractScopeRecord);
  },

  async addContractScope(companyId: string, data: ContractScopeRecord): Promise<void> {
    const docRef = doc(db, 'companies', companyId, 'contract_scopes', data.id);
    await setDoc(docRef, data);
  },

  // AMENDMENTS
  async getContractAmendments(companyId: string, contractId: string): Promise<ContractAmendmentRecord[]> {
    const q = query(collection(db, 'companies', companyId, 'contract_amendments'), where('contractId', '==', contractId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as ContractAmendmentRecord);
  },

  async amendContract(companyId: string, contractId: string, amendment: ContractAmendmentRecord, changedContractFields: Partial<ContractRecord>, userId?: string, userName?: string): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const contractRef = doc(db, 'companies', companyId, 'contracts', contractId);
      const contractSnap = await transaction.get(contractRef);
      if (!contractSnap.exists()) throw new Error('Contract not found');

      const amendRef = doc(db, 'companies', companyId, 'contract_amendments', amendment.id);
      transaction.set(amendRef, amendment);

      transaction.update(contractRef, {
        ...changedContractFields,
        updatedAt: new Date().toISOString(),
        updatedByUid: userId,
        updatedByName: userName
      });
    });

    const cdata = await this.getContract(companyId, contractId);
    await this.logAudit(companyId, 'contract.amended', cdata?.clientId, contractId, userId, userName);
  },

  // AUDIT LOG HELPER
  async logAudit(companyId: string, action: string, clientId?: string | null, contractId?: string | null, userId?: string, userName?: string): Promise<void> {
    const auditId = 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const ref = doc(db, 'companies', companyId, 'audit_logs', auditId);
    const ts = new Date().toISOString();
    
    await setDoc(ref, {
      id: auditId,
      companyId,
      action,
      entityId: contractId || clientId || '',
      entityType: contractId ? 'CONTRACT' : 'CLIENT',
      details: JSON.stringify({ clientId, contractId }),
      actorId: userId || 'system',
      actorName: userName || 'System',
      actorRole: 'USER', // generic
      timestamp: ts,
      ipAddress: '0.0.0.0'
    } as AuditLogRecord);
  }
};
