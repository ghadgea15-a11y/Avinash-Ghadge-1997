import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, getDoc, query, where, updateDoc, writeBatch } from 'firebase/firestore';
import { UserSession } from '../types';
import { SrmVendorRecord } from '../types';
import { VendorContract, VendorComplianceDoc, ExternalPersonnel, VendorRiskStatus } from '../types/vendorRisk';
import { AuditTrailService } from './auditTrailService';

export class VendorRiskService {
  
  // Registration
  static async registerVendor(session: UserSession, vendorData: Partial<SrmVendorRecord>) {
    const vendorId = `VEND_${Date.now()}`;
    const ref = doc(db, 'companies', session.companyId, 'srm_vendors', vendorId);
    
    const newVendor = {
      ...vendorData,
      id: vendorId,
      companyId: session.companyId,
      riskStatus: 'REGISTERED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await setDoc(ref, newVendor);
    
    await AuditTrailService.logAction(session, 'VENDOR_RISK', 'REGISTER_VENDOR', 'srm_vendors', vendorId, true, 'MEDIUM', undefined, { vendorId });
    return vendorId;
  }

  static async submitContract(session: UserSession, vendorId: string, contract: Partial<VendorContract>) {
    const contractId = `CTR_${Date.now()}`;
    const ref = doc(db, 'companies', session.companyId, 'vendor_contracts', contractId);
    
    const newContract: VendorContract = {
      ...contract as VendorContract,
      id: contractId,
      vendorId,
      companyId: session.companyId,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };
    
    await setDoc(ref, newContract);
    
    // Update vendor status
    await updateDoc(doc(db, 'companies', session.companyId, 'srm_vendors', vendorId), {
      riskStatus: 'CONTRACT_ACTIVE',
      updatedAt: new Date().toISOString()
    });

    await AuditTrailService.logAction(session, 'VENDOR_RISK', 'SUBMIT_CONTRACT', 'vendor_contracts', contractId, true, 'MEDIUM', undefined, { vendorId, contractId });
    return contractId;
  }

  static async addComplianceDoc(session: UserSession, vendorId: string, docData: Partial<VendorComplianceDoc>) {
    const docId = `DOC_${Date.now()}`;
    const ref = doc(db, 'companies', session.companyId, 'vendor_compliance', docId);
    
    const newDoc: VendorComplianceDoc = {
      ...docData as VendorComplianceDoc,
      id: docId,
      vendorId,
      companyId: session.companyId,
      status: 'VALID'
    };
    
    await setDoc(ref, newDoc);
    await AuditTrailService.logAction(session, 'VENDOR_RISK', 'ADD_COMPLIANCE_DOC', 'vendor_compliance', docId, true, 'MEDIUM', undefined, { vendorId, docId });
    return docId;
  }

  static async addExternalPersonnel(session: UserSession, vendorId: string, personnel: Partial<ExternalPersonnel>) {
    // ENFORCE STRICT BOUNDARY
    if (personnel.internalPermissionsGranted) {
      throw new Error("SECURITY EXCEPTION: External personnel cannot receive internal employee permissions.");
    }
    
    const pId = `EXT_${Date.now()}`;
    const ref = doc(db, 'companies', session.companyId, 'external_personnel', pId);
    
    const newPersonnel: ExternalPersonnel = {
      ...personnel as ExternalPersonnel,
      id: pId,
      vendorId,
      companyId: session.companyId,
      status: 'ACTIVE',
      internalPermissionsGranted: false
    };
    
    await setDoc(ref, newPersonnel);
    await AuditTrailService.logAction(session, 'VENDOR_RISK', 'ADD_EXTERNAL_PERSONNEL', 'external_personnel', pId, true, 'MEDIUM', undefined, { vendorId, pId });
    return pId;
  }

  // Automatic Risk Evaluation
  static async evaluateVendorRisks(companyId: string) {
    const now = new Date().getTime();
    const batch = writeBatch(db);
    let violations = 0;
    
    // 1. Check Contracts
    const contractsSnap = await getDocs(query(collection(db, 'companies', companyId, 'vendor_contracts'), where('status', '==', 'ACTIVE')));
    for (const d of contractsSnap.docs) {
      const contract = d.data() as VendorContract;
      const endMs = new Date(contract.endDate).getTime();
      if (endMs < now) {
        batch.update(d.ref, { status: 'EXPIRED' });
        batch.update(doc(db, 'companies', companyId, 'srm_vendors', contract.vendorId), {
          riskStatus: 'EXPIRED',
          updatedAt: new Date().toISOString()
        });
        violations++;
      }
    }
    
    // 2. Check Compliance Docs
    const docsSnap = await getDocs(query(collection(db, 'companies', companyId, 'vendor_compliance'), where('status', '==', 'VALID')));
    for (const d of docsSnap.docs) {
      const docItem = d.data() as VendorComplianceDoc;
      const expiryMs = new Date(docItem.expiryDate).getTime();
      if (expiryMs < now) {
        batch.update(d.ref, { status: 'EXPIRED' });
        batch.update(doc(db, 'companies', companyId, 'srm_vendors', docItem.vendorId), {
          riskStatus: 'SUSPENDED',
          updatedAt: new Date().toISOString()
        });
        violations++;
      }
    }
    
    // 3. Check External Personnel Access
    const personnelSnap = await getDocs(query(collection(db, 'companies', companyId, 'external_personnel'), where('status', '==', 'ACTIVE')));
    for (const d of personnelSnap.docs) {
      const p = d.data() as ExternalPersonnel;
      const expiryMs = new Date(p.accessExpiryDate).getTime();
      if (expiryMs < now) {
        batch.update(d.ref, { status: 'EXPIRED' });
        violations++;
      }
      if (p.internalPermissionsGranted) {
        // Strict boundary violation found
        batch.update(d.ref, { status: 'REVOKED', internalPermissionsGranted: false });
        violations++;
      }
    }

    if (violations > 0) {
      await batch.commit();
    }
    return violations;
  }

  static async getVendorRiskDashboard(session: UserSession) {
    const vendors = (await getDocs(collection(db, 'companies', session.companyId, 'srm_vendors'))).docs.map(d => d.data());
    const contracts = (await getDocs(collection(db, 'companies', session.companyId, 'vendor_contracts'))).docs.map(d => d.data() as VendorContract);
    const compliance = (await getDocs(collection(db, 'companies', session.companyId, 'vendor_compliance'))).docs.map(d => d.data() as VendorComplianceDoc);
    const personnel = (await getDocs(collection(db, 'companies', session.companyId, 'external_personnel'))).docs.map(d => d.data() as ExternalPersonnel);
    
    return {
      vendors,
      contracts,
      compliance,
      personnel
    };
  }

  static async revokePersonnelAccess(session: UserSession, personnelId: string) {
    await updateDoc(doc(db, 'companies', session.companyId, 'external_personnel', personnelId), {
      status: 'REVOKED'
    });
    await AuditTrailService.logAction(session, 'VENDOR_RISK', 'REVOKE_ACCESS', 'external_personnel', personnelId, true, 'HIGH', undefined, { personnelId });
  }
}
