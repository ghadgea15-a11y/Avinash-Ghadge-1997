import { collection, doc, getDocs, getDoc, setDoc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  BillingRateMatrixRecord, 
  BillingPreviewRecord,
  AttendanceRecord,
  WorkOrderRecord,
  ContractRecord
} from '../types';

export const billingRateService = {
  
  async getRates(companyId: string, contractId?: string): Promise<BillingRateMatrixRecord[]> {
    let q = query(collection(db, 'companies', companyId, 'billing_rate_matrices'));
    if (contractId) {
      q = query(q, where('contractId', '==', contractId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as BillingRateMatrixRecord);
  },

  async saveRate(companyId: string, rate: BillingRateMatrixRecord): Promise<void> {
    const docRef = doc(db, 'companies', companyId, 'billing_rate_matrices', rate.id);
    await setDoc(docRef, {
      ...rate,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  },

  async calculateBillingPreview(
    companyId: string,
    contract: ContractRecord,
    periodStart: Date,
    periodEnd: Date
  ): Promise<BillingPreviewRecord[]> {
    const rates = await this.getRates(companyId, contract.id);
    const activeRates = rates.filter(r => r.status === 'ACTIVE');
    
    // Sort by priority (specificity)
    activeRates.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      if (a.siteId) scoreA += 10;
      if (a.serviceId) scoreA += 5;
      if (a.designationId) scoreA += 2;
      
      if (b.siteId) scoreB += 10;
      if (b.serviceId) scoreB += 5;
      if (b.designationId) scoreB += 2;
      
      return scoreB - scoreA;
    });

    const isoStart = periodStart.toISOString();
    const isoEnd = periodEnd.toISOString();

    const startYMD = isoStart.split('T')[0];
    const endYMD = isoEnd.split('T')[0];

    const previews: BillingPreviewRecord[] = [];

    // Fetch Attendance for PER_SHIFT / PER_HOUR / PER_DAY / PER_EMPLOYEE
    const qAtt = query(
      collection(db, 'companies', companyId, 'attendance'),
      where('attendanceDate', '>=', startYMD),
      where('attendanceDate', '<=', endYMD)
    );
    const snapAtt = await getDocs(qAtt);
    let attendances = snapAtt.docs.map(d => d.data() as AttendanceRecord);
    
    // Fetch Work Orders for PER_SERVICE / VARIABLE_QUANTITY
    const qWo = query(
      collection(db, 'companies', companyId, 'work_orders'),
      where('createdAt', '>=', isoStart),
      where('createdAt', '<=', isoEnd)
    );
    const snapWo = await getDocs(qWo);
    let wos = snapWo.docs.map(d => d.data() as WorkOrderRecord);

    for (const rate of activeRates) {
      let qty = 0;
      let sourceRef = '';

      if (rate.rateType === 'PER_SHIFT' || rate.rateType === 'PER_DAY') {
        const matchingAtt = attendances.filter(a => {
           if (rate.siteId && a.siteId !== rate.siteId) return false;
           // Assuming a valid check-in/out indicates a completed shift/day
           return a.status === 'PRESENT';
        });
        qty = matchingAtt.length;
        sourceRef = `attendance_records:${matchingAtt.length}`;
        
        // Consume records so lower priority rates don't double count
        const consumedIds = new Set(matchingAtt.map(a => a.id));
        attendances = attendances.filter(a => !consumedIds.has(a.id));
      } else if (rate.rateType === 'PER_HOUR') {
        const matchingAtt = attendances.filter(a => {
           if (rate.siteId && a.siteId !== rate.siteId) return false;
           return a.status === 'PRESENT' && a.workedMinutes;
        });
        qty = matchingAtt.reduce((sum, a) => sum + (a.workedMinutes ? a.workedMinutes / 60 : 0), 0);
        sourceRef = `attendance_hours:${qty}`;
        
        const consumedIds = new Set(matchingAtt.map(a => a.id));
        attendances = attendances.filter(a => !consumedIds.has(a.id));
      } else if (rate.rateType === 'FIXED_MONTHLY') {
        // Simple prorating or full month depending on config. Assumes 1 unit per month if active.
        qty = 1; 
        sourceRef = `contract_fixed`;
      } else if (rate.rateType === 'PER_SERVICE') {
        const matchingWo = wos.filter(w => {
           if (rate.siteId && w.siteId !== rate.siteId) return false;
           return w.status === 'COMPLETED' || w.status === 'CLOSED';
        });
        qty = matchingWo.length;
        sourceRef = `work_orders:${qty}`;
        
        const consumedIds = new Set(matchingWo.map(w => w.id));
        wos = wos.filter(w => !consumedIds.has(w.id));
      }

      if (qty > 0) {
        previews.push({
          contractId: contract.id,
          siteId: rate.siteId,
          serviceId: rate.serviceId,
          periodStart: isoStart,
          periodEnd: isoEnd,
          applicableRate: rate.rate,
          rateType: rate.rateType,
          quantity: qty,
          unit: rate.unit,
          grossAmount: qty * rate.rate,
          currency: rate.currency,
          generatedAt: new Date().toISOString(),
          sourceReference: sourceRef
        });
      }
    }

    return previews;
  }
};
