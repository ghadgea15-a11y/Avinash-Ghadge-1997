import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  writeBatch 
} from 'firebase/firestore';
import { SafetyChecksheetRecord, SafetyInterlockResult } from '../types/ops';
import { UserSession } from '../types';
import { FirestoreService } from './firestoreService';

export class SafetyInterlockService {
  /**
   * Evaluates a safety checksheet / hazard inspection.
   * If the inspection is marked as FAIL or has critical non-compliant items ('NO'),
   * automatically halts active work orders and tasks for the target site,
   * creates an emergency EHS safety incident, notifies managers, and logs immutable audit records.
   */
  static async processSafetyChecksheetInterlock(
    companyId: string,
    checksheet: SafetyChecksheetRecord,
    session?: UserSession
  ): Promise<SafetyInterlockResult> {
    const isFail = checksheet.overallStatus === 'FAIL' || 
      (checksheet.items && checksheet.items.some(i => i.response === 'NO'));

    const failedHazards = (checksheet.items || [])
      .filter(i => i.response === 'NO')
      .map(i => ({
        category: i.category,
        question: i.question,
        remarks: i.remarks || 'Non-compliant hazard detected during inspection'
      }));

    if (!isFail) {
      // Inspection Passed: check if there was a previous lock and update clearance
      return {
        interlockTriggered: false,
        overallStatus: 'PASS',
        siteId: checksheet.siteId,
        siteName: checksheet.siteName,
        haltedWorkOrdersCount: 0,
        haltedWorkOrderIds: [],
        haltedTasksCount: 0,
        failedHazards: [],
        message: `Safety Inspection '${checksheet.title}' PASSED. Site operations and work orders are authorized.`
      };
    }

    // --- AUTO-HALT EXECUTION ---
    const haltedWorkOrderIds: string[] = [];
    let haltedTasksCount = 0;
    const nowISO = new Date().toISOString();
    const batch = writeBatch(db);

    const siteFilterId = checksheet.siteId;
    const isAllSites = !siteFilterId || siteFilterId === 'ALL';

    // 1. Halt Active Work Orders for the Site
    try {
      const woColRef = collection(db, 'companies', companyId, 'work_orders');
      const woSnapshot = await getDocs(woColRef);
      
      woSnapshot.docs.forEach(docSnap => {
        const wo = docSnap.data();
        const matchesSite = isAllSites || wo.siteId === siteFilterId;
        const isActive = ['IN_PROGRESS', 'DISPATCHED', 'ACCEPTED', 'SUBMITTED', 'APPROVED', 'ASSIGNED', 'DUE'].includes(wo.status);

        if (matchesSite && isActive) {
          haltedWorkOrderIds.push(docSnap.id);
          const haltReason = `🚨 EHS SAFETY HOLD: Automatically halted due to failed inspection '${checksheet.title}' on site ${checksheet.siteName || siteFilterId}. Failed items: ${failedHazards.map(h => h.category + ' - ' + h.question).slice(0, 3).join('; ')}`;
          
          batch.update(docSnap.ref, {
            status: 'PAUSED',
            isSafetyHalted: true,
            safetyHaltReason: haltReason,
            safetyHaltChecksheetId: checksheet.id,
            safetyHaltedAt: nowISO,
            safetyHaltedBy: session?.fullName || checksheet.performedByUserName || 'EHS Safety Officer',
            updatedAt: nowISO
          });
        }
      });
    } catch (err) {
      console.warn('[SafetyInterlockService] Error querying work orders for halt:', err);
    }

    // 2. Halt/Flag Active Operational Tasks for the Site
    try {
      const tasksColRef = collection(db, 'companies', companyId, 'tasks');
      const tasksSnapshot = await getDocs(tasksColRef);
      
      tasksSnapshot.docs.forEach(docSnap => {
        const task = docSnap.data();
        const matchesSite = isAllSites || task.siteId === siteFilterId;
        const isActive = ['TODO', 'IN_PROGRESS'].includes(task.status);

        if (matchesSite && isActive) {
          haltedTasksCount++;
          batch.update(docSnap.ref, {
            isSafetyHalted: true,
            safetyHaltReason: `Safety Interlock Active: Failed hazard inspection '${checksheet.title}'`,
            safetyHaltChecksheetId: checksheet.id,
            safetyHaltedAt: nowISO,
            updatedAt: Date.now()
          });
        }
      });
    } catch (err) {
      console.warn('[SafetyInterlockService] Error querying tasks for halt:', err);
    }

    // 3. Automatically Log a High-Priority Safety Incident Report
    const incidentId = `INC-EHS-${Date.now()}`;
    const incidentNumber = `EHS-HAZ-${Date.now().toString().slice(-6)}`;
    const hazardSummaryText = failedHazards.length > 0 
      ? failedHazards.map((h, idx) => `${idx + 1}. [${h.category}] ${h.question} (Remarks: ${h.remarks})`).join('\n')
      : checksheet.summaryRemarks || 'Critical safety failure observed during formal check sheet review.';

    const incidentRecord = {
      id: incidentId,
      incidentNumber,
      companyId,
      siteId: siteFilterId,
      siteName: checksheet.siteName || 'All Sites',
      title: `🚨 EHS SAFETY INTERLOCK: ${checksheet.title} FAILED`,
      category: 'HAZARD_SAFETY_BREACH',
      severity: 'CRITICAL',
      status: 'OPEN',
      date: nowISO.split('T')[0],
      time: new Date().toLocaleTimeString('en-GB', { hour12: false }),
      reportedBy: session?.fullName || checksheet.performedByUserName || 'Safety Inspector',
      reportedByUid: session?.userId || checksheet.performedByUserId || 'SYSTEM',
      description: `AUTOMATED SAFETY INTERLOCK ACTIVE.\n\nSite hazard inspection '${checksheet.title}' marked as FAIL.\nAll active work orders (${haltedWorkOrderIds.length}) and field tasks (${haltedTasksCount}) have been placed on immediate SAFETY HOLD.\n\nFailed Hazard Items:\n${hazardSummaryText}\n\nInspector Summary: ${checksheet.summaryRemarks || 'Immediate remediation required.'}`,
      actionTaken: `Automated interlock triggered: ${haltedWorkOrderIds.length} work orders paused. Site operations frozen pending safety clearance.`,
      linkedChecksheetId: checksheet.id,
      createdAt: nowISO,
      updatedAt: nowISO
    };

    const incidentRef = doc(db, 'companies', companyId, 'incident_reports', incidentId);
    batch.set(incidentRef, incidentRecord);

    // 4. Record High-Priority Emergency Notification
    const notifId = `NOTIF-EHS-${Date.now()}`;
    const notifRef = doc(db, 'companies', companyId, 'notifications', notifId);
    batch.set(notifRef, {
      id: notifId,
      companyId,
      type: 'EMERGENCY',
      title: `🚨 SAFETY INTERLOCK: Operations Halted at ${checksheet.siteName || 'Site'}`,
      message: `Failed Inspection: ${checksheet.title}. ${haltedWorkOrderIds.length} work orders & ${haltedTasksCount} tasks halted on Safety Hold. Action required!`,
      siteId: siteFilterId,
      link: '/operations/safety',
      isRead: false,
      roleScope: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'FACILITY_MANAGER', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'SAFETY_OFFICER'],
      createdAt: nowISO,
      updatedAt: nowISO
    });

    // 5. Update the checksheet document with interlock metadata
    const checksheetRef = doc(db, 'companies', companyId, 'safety_checksheets', checksheet.id);
    batch.update(checksheetRef, {
      interlockTriggered: true,
      haltedWorkOrdersCount: haltedWorkOrderIds.length,
      haltedWorkOrderIds,
      incidentReportId: incidentId,
      updatedAt: nowISO
    });

    // Commit all atomic changes
    await batch.commit();

    // 6. Log Audit Event
    await FirestoreService.logAuditEvent(
      companyId,
      session?.userId || checksheet.performedByUserId || 'SYSTEM',
      session?.fullName || checksheet.performedByUserName || 'Safety Officer',
      'EHS_SAFETY_INTERLOCK_HALT_TRIGGERED',
      `Safety Interlock triggered for ${checksheet.siteName || siteFilterId}. ${haltedWorkOrderIds.length} Work Orders and ${haltedTasksCount} Tasks placed on Safety Hold due to failed '${checksheet.title}'. Incident: #${incidentNumber}`
    );

    return {
      interlockTriggered: true,
      overallStatus: 'FAIL',
      siteId: siteFilterId,
      siteName: checksheet.siteName,
      haltedWorkOrdersCount: haltedWorkOrderIds.length,
      haltedWorkOrderIds,
      haltedTasksCount,
      incidentReportId: incidentId,
      failedHazards,
      message: `🚨 EHS SAFETY INTERLOCK TRIGGERED: ${haltedWorkOrderIds.length} Work Orders and ${haltedTasksCount} Tasks have been placed on immediate SAFETY HOLD at ${checksheet.siteName || 'the site'}. Incident #${incidentNumber} generated.`
    };
  }

  /**
   * Release safety hold after a remediation re-inspection passes or manager approval.
   */
  static async releaseSafetyHalt(
    companyId: string,
    workOrderId: string,
    clearanceNotes: string,
    session: UserSession
  ): Promise<boolean> {
    try {
      const woRef = doc(db, 'companies', companyId, 'work_orders', workOrderId);
      const woSnap = await getDoc(woRef);
      if (!woSnap.exists()) return false;

      const nowISO = new Date().toISOString();
      await updateDoc(woRef, {
        isSafetyHalted: false,
        status: 'IN_PROGRESS',
        safetyClearanceNotes: clearanceNotes,
        safetyClearedAt: nowISO,
        safetyClearedBy: session.fullName || session.userId,
        updatedAt: nowISO
      });

      await FirestoreService.logAuditEvent(
        companyId,
        session.userId,
        session.fullName || 'Safety Authority',
        'EHS_SAFETY_HOLD_RELEASED',
        `Safety Hold released for Work Order #${workOrderId}. Clearance Notes: ${clearanceNotes}`
      );

      return true;
    } catch (err) {
      console.error('[SafetyInterlockService] releaseSafetyHalt error:', err);
      return false;
    }
  }

  /**
   * Checks if a site currently has an active safety lock / failed inspection.
   */
  static async getSiteSafetyInterlockStatus(
    companyId: string,
    siteId: string
  ): Promise<{ isHalted: boolean; failedChecksheetsCount: number; activeIncidentsCount: number }> {
    try {
      if (!siteId || siteId === 'ALL') return { isHalted: false, failedChecksheetsCount: 0, activeIncidentsCount: 0 };
      
      const csColRef = collection(db, 'companies', companyId, 'safety_checksheets');
      const csQuery = query(csColRef, where('siteId', '==', siteId), where('overallStatus', '==', 'FAIL'));
      const csSnap = await getDocs(csQuery);

      const incColRef = collection(db, 'companies', companyId, 'incident_reports');
      const incQuery = query(incColRef, where('siteId', '==', siteId), where('status', '==', 'OPEN'), where('category', '==', 'HAZARD_SAFETY_BREACH'));
      const incSnap = await getDocs(incQuery);

      const isHalted = csSnap.docs.length > 0 || incSnap.docs.length > 0;

      return {
        isHalted,
        failedChecksheetsCount: csSnap.docs.length,
        activeIncidentsCount: incSnap.docs.length
      };
    } catch (err) {
      console.warn('[SafetyInterlockService] getSiteSafetyInterlockStatus error:', err);
      return { isHalted: false, failedChecksheetsCount: 0, activeIncidentsCount: 0 };
    }
  }
}
