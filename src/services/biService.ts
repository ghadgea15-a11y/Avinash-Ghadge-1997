import { collection, doc, getDoc, getDocs, query, where, orderBy, getCountFromServer, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { UserSession, KpiDefinition, KpiSnapshot, KpiValue, KpiStatus, KpiTrendDirection, SnapshotStatus, DataQuality } from '../types';
import { FirestoreService } from './firestoreService';
import { endOfDay, startOfDay, subDays, format } from 'date-fns';

const CALCULATION_VERSION = 'BI_DAILY_V1';

export class BiService {
  // KPI Definitions based on enterprise requirements
  static readonly KPI_DEFINITIONS: KpiDefinition[] = [
    {
      kpiId: 'WF_TOTAL_EMPLOYEES',
      name: 'Total Employees',
      category: 'WORKFORCE',
      description: 'Total headcount of employees',
      calculationType: 'COUNT',
      source: 'employees',
      unit: 'Count',
      frequency: 'DAILY',
      active: true,
      visibilityPermissions: ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'HR_ADMIN'],
      higherIsBetter: true
    },
    {
      kpiId: 'WF_ACTIVE_EMPLOYEES',
      name: 'Active Employees',
      category: 'WORKFORCE',
      description: 'Headcount of currently active employees',
      calculationType: 'COUNT',
      source: 'employees',
      unit: 'Count',
      frequency: 'DAILY',
      active: true,
      visibilityPermissions: ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'HR_ADMIN'],
      higherIsBetter: true
    },
    {
      kpiId: 'OP_OPEN_INCIDENTS',
      name: 'Open Incidents',
      category: 'OPERATIONS',
      description: 'Total number of currently open incidents',
      calculationType: 'COUNT',
      source: 'incident_reports',
      unit: 'Count',
      target: 0,
      warningThreshold: 5,
      criticalThreshold: 10,
      frequency: 'DAILY',
      active: true,
      visibilityPermissions: ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A4_REGIONAL_AREA_MANAGER', 'A5_SITE_IN_CHARGE'],
      higherIsBetter: false
    },
    {
      kpiId: 'OP_RESOLVED_INCIDENTS',
      name: 'Resolved Incidents',
      category: 'OPERATIONS',
      description: 'Number of incidents resolved in the period',
      calculationType: 'COUNT',
      source: 'incident_reports',
      unit: 'Count',
      frequency: 'DAILY',
      active: true,
      visibilityPermissions: ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A4_REGIONAL_AREA_MANAGER'],
      higherIsBetter: true
    },
    {
      kpiId: 'EAM_TOTAL_ASSETS',
      name: 'Total Assets',
      category: 'ASSETS',
      description: 'Total number of enterprise assets',
      calculationType: 'COUNT',
      source: 'assets',
      unit: 'Count',
      frequency: 'DAILY',
      active: true,
      visibilityPermissions: ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A4_REGIONAL_AREA_MANAGER'],
      higherIsBetter: true
    },
    {
      kpiId: 'EAM_ASSETS_MAINTENANCE',
      name: 'Assets in Maintenance',
      category: 'ASSETS',
      description: 'Total assets currently undergoing maintenance',
      calculationType: 'COUNT',
      source: 'assets',
      unit: 'Count',
      frequency: 'DAILY',
      active: true,
      visibilityPermissions: ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A4_REGIONAL_AREA_MANAGER'],
      higherIsBetter: false
    },
    {
      kpiId: 'CRM_ACTIVE_CONTRACTS',
      name: 'Active Contracts',
      category: 'CRM',
      description: 'Number of currently active client contracts',
      calculationType: 'COUNT',
      source: 'contracts',
      unit: 'Count',
      frequency: 'DAILY',
      active: true,
      visibilityPermissions: ['A0_OWNER', 'A1_DIRECTOR_CEO', 'COMMERCIAL'],
      higherIsBetter: true
    },
    {
      kpiId: 'SERVICE_OPEN_TICKETS',
      name: 'Open Tickets',
      category: 'SERVICE',
      description: 'Number of open helpdesk/service tickets',
      calculationType: 'COUNT',
      source: 'service_tickets',
      unit: 'Count',
      frequency: 'DAILY',
      active: true,
      visibilityPermissions: ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A4_REGIONAL_AREA_MANAGER'],
      higherIsBetter: false
    }
  ];

  static calculateTrendAndStatus(
    currentValue: number, 
    previousValue: number | null, 
    def: KpiDefinition
  ): { trendDirection: KpiTrendDirection, difference: number | null, percentageChange: number | null, status: KpiStatus } {
    let trendDirection: KpiTrendDirection = 'STABLE';
    let difference: number | null = null;
    let percentageChange: number | null = null;

    if (previousValue !== null) {
      difference = currentValue - previousValue;
      if (difference > 0) trendDirection = 'UP';
      else if (difference < 0) trendDirection = 'DOWN';
      
      if (previousValue !== 0) {
        percentageChange = (difference / previousValue) * 100;
      }
    }

    let status: KpiStatus = 'NO_TARGET';
    if (def.target !== undefined) {
      if (def.higherIsBetter) {
        if (currentValue >= def.target) status = 'ON_TARGET';
        else if (def.criticalThreshold !== undefined && currentValue <= def.criticalThreshold) status = 'CRITICAL';
        else if (def.warningThreshold !== undefined && currentValue <= def.warningThreshold) status = 'WARNING';
        else status = 'WARNING';
      } else {
        // Lower is better
        if (currentValue <= def.target) status = 'ON_TARGET';
        else if (def.criticalThreshold !== undefined && currentValue >= def.criticalThreshold) status = 'CRITICAL';
        else if (def.warningThreshold !== undefined && currentValue >= def.warningThreshold) status = 'WARNING';
        else status = 'WARNING';
      }
    }

    return { trendDirection, difference, percentageChange, status };
  }

  static async generateSnapshot(companyId: string, session: UserSession, date: Date = new Date()): Promise<KpiSnapshot> {
    const snapshotDateStr = format(date, 'yyyy-MM-dd');
    const snapshotId = `SNAP_${companyId}_${snapshotDateStr}`;
    const periodStart = startOfDay(date).toISOString();
    const periodEnd = endOfDay(date).toISOString();
    const prevDate = subDays(date, 1);
    const prevPeriodStart = startOfDay(prevDate).toISOString();
    const prevPeriodEnd = endOfDay(prevDate).toISOString();
    
    // Quick lock/initial state creation to prevent double-generation via transactions
    let existingSnapshot: KpiSnapshot | null = null;
    try {
      existingSnapshot = await runTransaction(db, async (t) => {
        const snapRef = doc(db, 'companies', companyId, 'bi_snapshots', snapshotId);
        const docSnap = await t.get(snapRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as KpiSnapshot;
          if (data.status === 'COMPLETE' && data.calculationVersion === CALCULATION_VERSION) {
            return data; // Already generated successfully today
          }
        }
        
        // Write GENERATING state
        const initState: KpiSnapshot = {
          id: snapshotId,
          companyId,
          snapshotDate: snapshotDateStr,
          periodStart,
          periodEnd,
          generatedAt: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          values: [],
          calculationVersion: CALCULATION_VERSION,
          status: 'GENERATING',
          dataQuality: 'INSUFFICIENT'
        };
        t.set(snapRef, initState, { merge: true });
        return null;
      });
    } catch (e) {
      console.warn('Could not lock snapshot generation', e);
    }

    if (existingSnapshot) {
      return existingSnapshot;
    }

    const kpiValues: KpiValue[] = [];
    const moduleDataQuality: Record<string, DataQuality> = {};
    let globalStatus: SnapshotStatus = 'COMPLETE';
    let globalDataQuality: DataQuality = 'COMPLETE';

    // Gather KPIs concurrently
    const promises = this.KPI_DEFINITIONS.filter(kpi => kpi.active).map(async (def) => {
      let currentVal = 0;
      let prevVal = 0;
      let isPartial = false;

      try {
        switch (def.kpiId) {
          case 'WF_TOTAL_EMPLOYEES': {
            const snap = await getCountFromServer(query(collection(db, 'companies', companyId, 'employees')));
            currentVal = snap.data().count;
            moduleDataQuality['WORKFORCE'] = 'COMPLETE';
            break;
          }
          case 'WF_ACTIVE_EMPLOYEES': {
            const snap = await getCountFromServer(query(collection(db, 'companies', companyId, 'employees'), where('status', '==', 'ACTIVE')));
            currentVal = snap.data().count;
            break;
          }
          case 'OP_OPEN_INCIDENTS': {
            const snap = await getCountFromServer(query(collection(db, 'companies', companyId, 'incident_reports'), where('status', 'in', ['OPEN', 'REPORTED', 'UNDER_INVESTIGATION', 'INVESTIGATING', 'ACTION_REQUIRED'])));
            currentVal = snap.data().count;
            moduleDataQuality['OPERATIONS'] = 'COMPLETE';
            break;
          }
          case 'OP_RESOLVED_INCIDENTS': {
            const curSnap = await getCountFromServer(query(collection(db, 'companies', companyId, 'incident_reports'), where('status', 'in', ['RESOLVED', 'CLOSED', 'VERIFIED']), where('updatedAt', '>=', periodStart), where('updatedAt', '<=', periodEnd)));
            currentVal = curSnap.data().count;
            const prevSnap = await getCountFromServer(query(collection(db, 'companies', companyId, 'incident_reports'), where('status', 'in', ['RESOLVED', 'CLOSED', 'VERIFIED']), where('updatedAt', '>=', prevPeriodStart), where('updatedAt', '<=', prevPeriodEnd)));
            prevVal = prevSnap.data().count;
            break;
          }
          case 'EAM_TOTAL_ASSETS': {
            const snap = await getCountFromServer(query(collection(db, 'companies', companyId, 'assets')));
            currentVal = snap.data().count;
            moduleDataQuality['ASSETS'] = 'COMPLETE';
            break;
          }
          case 'EAM_ASSETS_MAINTENANCE': {
            const snap = await getCountFromServer(query(collection(db, 'companies', companyId, 'assets'), where('status', '==', 'MAINTENANCE')));
            currentVal = snap.data().count;
            break;
          }
          case 'CRM_ACTIVE_CONTRACTS': {
            const snap = await getCountFromServer(query(collection(db, 'companies', companyId, 'contracts'), where('status', '==', 'ACTIVE')));
            currentVal = snap.data().count;
            moduleDataQuality['CRM'] = 'COMPLETE';
            break;
          }
          case 'SERVICE_OPEN_TICKETS': {
            try {
               const snap = await getCountFromServer(query(collection(db, 'companies', companyId, 'service_tickets'), where('status', 'in', ['OPEN', 'IN_PROGRESS'])));
               currentVal = snap.data().count;
               moduleDataQuality['SERVICE'] = 'COMPLETE';
            } catch(e) {
               isPartial = true; // Sub-collection might not exist yet
               moduleDataQuality['SERVICE'] = 'INSUFFICIENT';
            }
            break;
          }
        }

        // Try to fetch previous value from yesterday's snapshot if applicable
        const prevSnapshotId = `SNAP_${companyId}_${format(prevDate, 'yyyy-MM-dd')}`;
        const prevSnapDoc = await getDoc(doc(db, 'companies', companyId, 'bi_snapshots', prevSnapshotId));
        if (prevSnapDoc.exists()) {
          const prevData = prevSnapDoc.data() as KpiSnapshot;
          const matchedKpi = prevData.values?.find((v: KpiValue) => v.kpiId === def.kpiId);
          if (matchedKpi) {
            prevVal = matchedKpi.currentValue;
          }
        }

        const { trendDirection, difference, percentageChange, status } = this.calculateTrendAndStatus(currentVal, prevVal, def);

        kpiValues.push({
          kpiId: def.kpiId,
          name: def.name,
          category: def.category,
          currentValue: currentVal,
          previousValue: prevVal,
          difference,
          percentageChange,
          trendDirection,
          status,
          target: def.target,
          unit: def.unit
        });
        
        if (isPartial) {
          globalStatus = 'PARTIAL';
          globalDataQuality = 'PARTIAL';
        }

      } catch (err) {
        console.error(`Error calculating KPI ${def.kpiId}:`, err);
        globalStatus = 'PARTIAL';
        globalDataQuality = 'PARTIAL';
      }
    });

    await Promise.allSettled(promises);

    const snapshot: KpiSnapshot = {
      id: snapshotId,
      companyId,
      snapshotDate: snapshotDateStr,
      periodStart,
      periodEnd,
      generatedAt: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      values: kpiValues,
      calculationVersion: CALCULATION_VERSION,
      status: globalStatus,
      dataQuality: globalDataQuality,
      moduleDataQuality
    };

    // Save final transactional state
    await runTransaction(db, async (t) => {
      const snapRef = doc(db, 'companies', companyId, 'bi_snapshots', snapshotId);
      t.set(snapRef, snapshot, { merge: true });
    });

    await FirestoreService.logAuditEvent(companyId, session.userId, session.fullName, 'bi.snapshot_generated', `Generated BI snapshot ${snapshotId} [Status: ${globalStatus}]`);

    return snapshot;
  }

  static async getLatestSnapshot(companyId: string): Promise<KpiSnapshot | null> {
    const q = query(collection(db, 'companies', companyId, 'bi_snapshots'), orderBy('snapshotDate', 'desc'));
    try {
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data() as KpiSnapshot;
      }
    } catch(err) {
      console.warn("Could not fetch latest snapshot using order by:", err);
      // Fallback: manually fetch today's
      const snapshotDateStr = format(new Date(), 'yyyy-MM-dd');
      const snapshotId = `SNAP_${companyId}_${snapshotDateStr}`;
      const docSnap = await getDoc(doc(db, 'companies', companyId, 'bi_snapshots', snapshotId));
      if (docSnap.exists()) return docSnap.data() as KpiSnapshot;
    }
    return null;
  }
}
