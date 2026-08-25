import { db } from '../firebase';
import { doc, getDoc, runTransaction, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { IncidentReportRecord, IncidentStatus, IncidentTimelineEvent } from '../types';

export class IncidentWorkflowEngine {

  static async escalateIncident(
    companyId: string,
    reportId: string,
    reason: string,
    actor: { id: string; name: string }
  ) {
    const ref = doc(db, 'companies', companyId, 'incident_reports', reportId);
    await runTransaction(db, async (t) => {
      const snap = await t.get(ref);
      if (!snap.exists()) throw new Error("Incident not found");
      const inc = snap.data() as IncidentReportRecord;

      if (['CLOSED', 'VERIFIED'].includes(inc.status)) {
        throw new Error("Cannot escalate a closed incident.");
      }

      const timeline = inc.timeline || [];
      timeline.push({
        timestamp: new Date().toISOString(),
        actorId: actor.id,
        actorName: actor.name,
        action: 'ESCALATED',
        notes: reason
      });

      t.update(ref, {
        status: 'ESCALATED',
        timeline,
        updatedAt: new Date().toISOString()
      });

      const auditRef = doc(collection(db, 'companies', companyId, 'audit_logs'));
      t.set(auditRef, {
        action: 'INCIDENT_ESCALATED',
        targetId: reportId,
        actorId: actor.id,
        actorName: actor.name,
        details: reason,
        timestamp: new Date().toISOString()
      });
    });
  }

  static async submitInvestigation(
    companyId: string,
    reportId: string,
    investigation: {
      ownerId: string;
      ownerName: string;
      immediateAction: string;
      rootCause: string;
      correctiveAction: string;
      preventiveAction?: string;
      evidenceUrl?: string;
    },
    actor: { id: string; name: string }
  ) {
    const ref = doc(db, 'companies', companyId, 'incident_reports', reportId);
    await runTransaction(db, async (t) => {
      const snap = await t.get(ref);
      if (!snap.exists()) throw new Error("Incident not found");
      const inc = snap.data() as IncidentReportRecord;

      if (inc.status === 'CLOSED') {
        throw new Error("Cannot investigate a closed incident.");
      }
      
      if (inc.severity === 'CRITICAL' && !investigation.evidenceUrl) {
         throw new Error("Critical incidents require evidence URL for investigation.");
      }

      const timeline = inc.timeline || [];
      timeline.push({
        timestamp: new Date().toISOString(),
        actorId: actor.id,
        actorName: actor.name,
        action: 'INVESTIGATED',
        notes: "Investigation submitted"
      });

      t.update(ref, {
        status: 'UNDER_INVESTIGATION',
        assignedInvestigatorId: investigation.ownerId,
        assignedInvestigatorName: investigation.ownerName,
        immediateAction: investigation.immediateAction,
        rootCause: investigation.rootCause,
        correctiveAction: investigation.correctiveAction,
        preventiveAction: investigation.preventiveAction || null,
        resolutionNotes: investigation.evidenceUrl ? `Evidence: ${investigation.evidenceUrl}` : null,
        timeline,
        updatedAt: new Date().toISOString()
      });
      
      const auditRef = doc(collection(db, 'companies', companyId, 'audit_logs'));
      t.set(auditRef, {
        action: 'INCIDENT_INVESTIGATED',
        targetId: reportId,
        actorId: actor.id,
        actorName: actor.name,
        details: 'Investigation logged',
        timestamp: new Date().toISOString()
      });
    });
  }

  static async closeIncident(
    companyId: string,
    reportId: string,
    notes: string,
    actor: { id: string; name: string, role?: string }
  ) {
    const ref = doc(db, 'companies', companyId, 'incident_reports', reportId);
    await runTransaction(db, async (t) => {
      const snap = await t.get(ref);
      if (!snap.exists()) throw new Error("Incident not found");
      const inc = snap.data() as IncidentReportRecord;

      if (inc.status === 'CLOSED') {
        throw new Error("Incident is already closed.");
      }

      if (inc.severity === 'CRITICAL' && actor.role !== 'SUPER_ADMIN' && actor.role !== 'ADMIN') {
        throw new Error("Critical incidents require Administrator approval for closure.");
      }
      
      if (!inc.rootCause && inc.severity !== 'LOW') {
          throw new Error("Cannot close without root cause investigation.");
      }

      const timeline = inc.timeline || [];
      timeline.push({
        timestamp: new Date().toISOString(),
        actorId: actor.id,
        actorName: actor.name,
        action: 'CLOSED',
        notes: notes
      });

      t.update(ref, {
        status: 'CLOSED',
        resolvedById: actor.id,
        resolvedByName: actor.name,
        resolvedAt: new Date().toISOString(),
        verifiedById: actor.id,
        verifiedByName: actor.name,
        verifiedAt: new Date().toISOString(),
        timeline,
        updatedAt: new Date().toISOString()
      });
      
      const auditRef = doc(collection(db, 'companies', companyId, 'audit_logs'));
      t.set(auditRef, {
        action: 'INCIDENT_CLOSED',
        targetId: reportId,
        actorId: actor.id,
        actorName: actor.name,
        details: notes,
        timestamp: new Date().toISOString()
      });
    });
  }

  static async evaluateSlaAndEscalations(companyId: string) {
    const q = query(
      collection(db, 'companies', companyId, 'incident_reports'),
      where('status', 'in', ['OPEN', 'UNDER_INVESTIGATION', 'IN_PROGRESS'])
    );
    const snap = await getDocs(q);
    
    const now = Date.now();
    for (const d of snap.docs) {
      const inc = d.data() as IncidentReportRecord;
      if (inc.slaDeadline) {
        const deadline = new Date(inc.slaDeadline).getTime();
        
        // Auto-escalate if overdue by more than 24h
        if (now > deadline + (24 * 3600 * 1000) && inc.status !== 'ESCALATED') {
          await this.escalateIncident(
            companyId,
            inc.id,
            "Automatic Escalation: SLA Overdue by >24 Hours",
            { id: "SYSTEM", name: "System Automatic Governance" }
          );
        }
      }
    }
  }
}
