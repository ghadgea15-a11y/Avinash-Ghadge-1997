import { db } from '../firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { IncidentReportRecord, VisitorWatchlistRecord } from '../types';

export class GrcIntegrationEngine {
  /**
   * Automatically bridge High/Critical Incidents into GRC Risks and CAPA.
   */
  static async syncIncidentToGrc(companyId: string, incident: IncidentReportRecord) {
    if (!companyId || !incident) return;

    // Only process HIGH or CRITICAL incidents
    if (incident.severity === 'HIGH' || incident.severity === 'CRITICAL') {
      try {
        // 1. Create a GRC Risk
        const riskId = `RISK-INC-${incident.id}`;
        const riskRef = doc(collection(db, 'companies', companyId, 'grc_risks'), riskId);
        await setDoc(riskRef, {
          title: `Auto-Risk: ${incident.title || incident.category}`,
          description: `Automatically generated risk from Incident ${incident.incidentNumber || incident.id}. Details: ${incident.description}`,
          severity: incident.severity,
          status: 'IDENTIFIED',
          source: 'INCIDENT_REPORT',
          sourceId: incident.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });

        // 2. If CRITICAL, also generate a CAPA (Corrective and Preventive Action)
        if (incident.severity === 'CRITICAL') {
          const capaId = `CAPA-INC-${incident.id}`;
          const capaRef = doc(collection(db, 'companies', companyId, 'grc_capa'), capaId);
          
          // Set a default due date 7 days from now
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 7);

          await setDoc(capaRef, {
            title: `CAPA required for Critical Incident: ${incident.incidentNumber || incident.id}`,
            assignee: 'Safety Officer / Facility Head',
            dueDate: dueDate.toISOString().split('T')[0],
            status: 'OPEN',
            source: 'INCIDENT_REPORT',
            sourceId: incident.id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      } catch (err) {
        console.error('[GrcIntegrationEngine] Failed to sync incident to GRC:', err);
      }
    }
  }

  /**
   * Automatically bridge Watchlisted Visitors into GRC Risks.
   */
  static async syncBlacklistedVisitorToGrc(companyId: string, visitor: VisitorWatchlistRecord) {
    if (!companyId || !visitor) return;

    try {
      const riskId = `RISK-VIS-${visitor.id}`;
      const riskRef = doc(collection(db, 'companies', companyId, 'grc_risks'), riskId);
      await setDoc(riskRef, {
        title: `Security Risk: Watchlisted Visitor (${visitor.visitorName || 'Unknown'})`,
        description: `Visitor ${visitor.visitorName} (Phone: ${visitor.visitorPhone || 'N/A'}) was added to the watchlist. Reason: ${visitor.reason || 'Security Policy Violation'}`,
        severity: visitor.severity || 'HIGH',
        status: 'IDENTIFIED',
        source: 'VISITOR_WATCHLIST',
        sourceId: visitor.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error('[GrcIntegrationEngine] Failed to sync visitor to GRC:', err);
    }
  }
}
