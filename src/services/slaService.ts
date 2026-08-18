import { collection, doc, getDocs, getDoc, setDoc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  SlaDefinitionRecord, 
  SlaBreachRecord, 
  SlaScorecardRecord,
  SlaMeasurementType,
  ServiceTicketRecord,
  WorkOrderRecord,
  AttendanceRecord
} from '../types';

export const slaService = {

  // SLA Definitions
  async getSlaDefinitions(companyId: string, contractId?: string): Promise<SlaDefinitionRecord[]> {
    let q = query(collection(db, 'companies', companyId, 'sla_definitions'));
    if (contractId) {
      q = query(q, where('contractId', '==', contractId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as SlaDefinitionRecord);
  },

  async saveSlaDefinition(companyId: string, sla: SlaDefinitionRecord): Promise<void> {
    const docRef = doc(db, 'companies', companyId, 'sla_definitions', sla.id);
    await setDoc(docRef, {
      ...sla,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  },

  // SLA Breaches
  async getSlaBreaches(companyId: string, contractId?: string): Promise<SlaBreachRecord[]> {
    let q = query(collection(db, 'companies', companyId, 'sla_breaches'));
    if (contractId) {
      q = query(q, where('contractId', '==', contractId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as SlaBreachRecord);
  },

  async saveSlaBreach(companyId: string, breach: SlaBreachRecord): Promise<void> {
    const docRef = doc(db, 'companies', companyId, 'sla_breaches', breach.id);
    await setDoc(docRef, {
      ...breach,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  },

  // Scorecards
  async getScorecards(companyId: string, contractId?: string): Promise<SlaScorecardRecord[]> {
    let q = query(collection(db, 'companies', companyId, 'sla_scorecards'));
    if (contractId) {
      q = query(q, where('contractId', '==', contractId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as SlaScorecardRecord);
  },

  async saveScorecard(companyId: string, scorecard: SlaScorecardRecord): Promise<void> {
    const docRef = doc(db, 'companies', companyId, 'sla_scorecards', scorecard.id);
    await setDoc(docRef, {
      ...scorecard,
      generatedAt: new Date().toISOString()
    }, { merge: true });
  }

};
