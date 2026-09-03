import { collection, doc, getDocs, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { GrcIntegrationEngine } from './grcIntegrationEngine';
import { BlacklistCheckResult, IncidentReportRecord, UserSession, VisitorLogRecord, VisitorWatchlistRecord } from '../types';
import { FirestoreService } from './firestoreService';
import { QueryScopeEngine } from './queryScopeEngine';

function normalizePhone(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/[\s\-\+\(\)]/g, '').replace(/^0+/, '').replace(/^91/, '');
}

function normalizeVehicle(veh?: string): string {
  if (!veh) return '';
  return veh.toUpperCase().replace(/[\s\-]/g, '');
}

export class VisitorWatchlistService {
  /**
   * Real-time subscription to company visitor watchlist
   */
  static subscribeToWatchlist(
    session: UserSession,
    companyId: string,
    onData: (records: VisitorWatchlistRecord[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'visitor_watchlist');
      const q = query(colRef, ...QueryScopeEngine.buildScope(session, 'VISITORS'));
      return onSnapshot(q, (snap) => {
        const records = snap.docs.map(d => ({ id: d.id, ...d.data() } as VisitorWatchlistRecord));
        onData(records);
      }, (err) => {
        console.warn('[VisitorWatchlistService] subscribe error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[VisitorWatchlistService] subscribe exception:', e);
      onData([]);
      return () => {};
    }
  }

  /**
   * Add a visitor to the Security Blacklist / Watchlist
   */
  static async addToWatchlist(
    companyId: string,
    record: VisitorWatchlistRecord,
    session: UserSession
  ): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'visitor_watchlist', record.id);
      await setDoc(ref, {
        ...record,
        companyId,
        status: 'ACTIVE',
        blacklistedBy: session.employeeId,
        blacklistedByName: session.fullName || session.email,
        blacklistedAt: record.blacklistedAt || new Date().toISOString(),
        createdAt: record.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Auto-Sync to GRC
      await GrcIntegrationEngine.syncBlacklistedVisitorToGrc(companyId, record);

      // Audit log entry
      await FirestoreService.logAuditEvent(
        companyId,
        session.employeeId,
        session.fullName || 'Security Officer',
        'VISITOR_BLACKLISTED',
        `Visitor Added to Security Blacklist: ${record.visitorName} (Phone: ${record.visitorPhone || 'N/A'}). Severity: ${record.severity}. Reason: ${record.reason}`
      );

      return true;
    } catch (err) {
      console.error('[VisitorWatchlistService] addToWatchlist error:', err);
      return false;
    }
  }

  /**
   * Revoke a Blacklist / Watchlist entry
   */
  static async revokeWatchlistEntry(
    companyId: string,
    entryId: string,
    session: UserSession,
    reason: string
  ): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'visitor_watchlist', entryId);
      await setDoc(ref, {
        status: 'REVOKED',
        revokedAt: new Date().toISOString(),
        revokedBy: session.employeeId,
        revocationReason: reason,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await FirestoreService.logAuditEvent(
        companyId,
        session.employeeId,
        session.fullName || 'Security Officer',
        'VISITOR_BLACKLIST_REVOKED',
        `Security Blacklist Revoked for Entry ${entryId}. Reason: ${reason}`
      );

      return true;
    } catch (err) {
      console.error('[VisitorWatchlistService] revokeWatchlistEntry error:', err);
      return false;
    }
  }

  /**
   * Real-time Pre-Check-in Blacklist Lookup
   * Scans Active Watchlist, Incident Reports, and Historical Visitor Logs.
   */
  static checkVisitorBlacklist(
    params: {
      visitorPhone?: string;
      visitorName?: string;
      vehicleNumber?: string;
      idNumber?: string;
      watchlist?: VisitorWatchlistRecord[];
      incidents?: IncidentReportRecord[];
      visitorLogs?: VisitorLogRecord[];
    }
  ): BlacklistCheckResult {
    const { visitorPhone, visitorName, vehicleNumber, idNumber, watchlist = [], incidents = [], visitorLogs = [] } = params;

    const normPhone = normalizePhone(visitorPhone);
    const normName = visitorName?.trim().toLowerCase() || '';
    const normVeh = normalizeVehicle(vehicleNumber);
    const normId = idNumber?.trim().toLowerCase() || '';

    if (!normPhone && !normName && !normVeh && !normId) {
      return { isBlacklisted: false, matchedSource: 'NONE' };
    }

    // 1. Check Explicit Active Watchlist Records
    for (const entry of watchlist) {
      if (entry.status !== 'ACTIVE') continue;

      const entryPhone = normalizePhone(entry.visitorPhone);
      const entryName = entry.visitorName?.trim().toLowerCase() || '';
      const entryVeh = normalizeVehicle(entry.vehicleNumber);
      const entryId = entry.idNumber?.trim().toLowerCase() || '';

      // Phone Match (Highest confidence)
      if (normPhone && entryPhone && (normPhone === entryPhone || normPhone.endsWith(entryPhone) || entryPhone.endsWith(normPhone))) {
        return {
          isBlacklisted: true,
          severity: entry.severity || 'HIGH',
          reason: entry.reason,
          matchedSource: 'WATCHLIST',
          matchedField: 'PHONE',
          watchlistId: entry.id,
          blacklistedAt: entry.blacklistedAt,
          blacklistedByName: entry.blacklistedByName,
          incidentReportId: entry.incidentReportId,
          incidentCategory: entry.incidentCategory,
          incidentDate: entry.incidentDate,
          notes: entry.notes || `Matched registered blacklisted phone: ${entry.visitorPhone}`
        };
      }

      // ID Number Match
      if (normId && entryId && normId === entryId) {
        return {
          isBlacklisted: true,
          severity: entry.severity || 'CRITICAL',
          reason: entry.reason,
          matchedSource: 'WATCHLIST',
          matchedField: 'ID',
          watchlistId: entry.id,
          blacklistedAt: entry.blacklistedAt,
          blacklistedByName: entry.blacklistedByName,
          incidentReportId: entry.incidentReportId,
          notes: `Matched blacklisted Govt ID / Pass: ${entry.idNumber}`
        };
      }

      // Vehicle Match
      if (normVeh && entryVeh && normVeh === entryVeh) {
        return {
          isBlacklisted: true,
          severity: entry.severity || 'HIGH',
          reason: `Blacklisted vehicle detected (${entry.vehicleNumber}). ${entry.reason}`,
          matchedSource: 'WATCHLIST',
          matchedField: 'VEHICLE',
          watchlistId: entry.id,
          blacklistedAt: entry.blacklistedAt,
          blacklistedByName: entry.blacklistedByName,
          incidentReportId: entry.incidentReportId,
          notes: `Vehicle registration flagged in security database.`
        };
      }

      // Exact Full Name Match (if at least 4 chars)
      if (normName && entryName && normName.length >= 4 && (normName === entryName || (normName.includes(entryName) && entryName.length > 5))) {
        return {
          isBlacklisted: true,
          severity: entry.severity || 'MEDIUM',
          reason: entry.reason,
          matchedSource: 'WATCHLIST',
          matchedField: 'NAME',
          watchlistId: entry.id,
          blacklistedAt: entry.blacklistedAt,
          blacklistedByName: entry.blacklistedByName,
          incidentReportId: entry.incidentReportId,
          notes: `Name match with security watchlist record: ${entry.visitorName}`
        };
      }
    }

    // 2. Check Security Incident Reports for past offenders / suspects / involved persons
    for (const inc of incidents) {
      const incTitle = (inc.title || '').toLowerCase();
      const incDesc = (inc.description || '').toLowerCase();
      const incSuspect = (inc.suspectName || (inc as any).involvedPerson || (inc as any).perpetratorName || '').toLowerCase();
      const incPhone = normalizePhone((inc as any).suspectPhone || (inc as any).visitorPhone || (inc as any).phone);
      const incVeh = normalizeVehicle((inc as any).vehicleNumber || (inc as any).vehicleNo);

      // Check phone match in incident
      if (normPhone && normPhone.length >= 7) {
        const phoneMatch = (incPhone && (normPhone === incPhone || normPhone.endsWith(incPhone))) || 
                           incDesc.includes(normPhone) || 
                           (inc as any).notes?.toLowerCase().includes(normPhone);

        if (phoneMatch) {
          return {
            isBlacklisted: true,
            severity: inc.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
            reason: `Person linked to previous security incident: "${inc.title}" (${inc.category || 'Security Breach'}).`,
            matchedSource: 'INCIDENT_REPORT',
            matchedField: 'PHONE',
            incidentReportId: inc.id,
            incidentDate: inc.date || inc.incidentDate || inc.createdAt,
            incidentCategory: inc.category || inc.type,
            incidentDescription: inc.description,
            notes: `Phone number found in Incident #${inc.id} reported on ${inc.date || inc.createdAt?.substring(0, 10)}.`
          };
        }
      }

      // Check vehicle match in incident
      if (normVeh && normVeh.length >= 5) {
        if (incVeh === normVeh || incDesc.includes(normVeh.toLowerCase())) {
          return {
            isBlacklisted: true,
            severity: inc.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
            reason: `Vehicle ${vehicleNumber} was flagged in Security Incident #${inc.id} ("${inc.title}").`,
            matchedSource: 'INCIDENT_REPORT',
            matchedField: 'VEHICLE',
            incidentReportId: inc.id,
            incidentDate: inc.date || inc.createdAt,
            incidentCategory: inc.category,
            incidentDescription: inc.description,
            notes: `Vehicle registration logged in past incident investigations.`
          };
        }
      }

      // Check exact suspect name match in incident
      if (normName && normName.length >= 5 && incSuspect && (incSuspect === normName || (incSuspect.includes(normName) && normName.length >= 6))) {
        return {
          isBlacklisted: true,
          severity: inc.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
          reason: `Name matches identified suspect/individual in Incident #${inc.id}: "${inc.title}".`,
          matchedSource: 'INCIDENT_REPORT',
          matchedField: 'NAME',
          incidentReportId: inc.id,
          incidentDate: inc.date || inc.createdAt,
          incidentCategory: inc.category,
          incidentDescription: inc.description,
          notes: `Suspect name match in ${inc.category || 'security'} report.`
        };
      }
    }

    // 3. Check Past Visitor Logs Flagged with Violations / Incidents
    for (const log of visitorLogs) {
      if ((log as any).isBlacklisted || (log as any).securityFlagged || (log as any).status === 'BANNED') {
        const logPhone = normalizePhone(log.visitorPhone);
        const logName = log.visitorName?.trim().toLowerCase() || '';

        if (normPhone && logPhone && normPhone === logPhone) {
          return {
            isBlacklisted: true,
            severity: 'HIGH',
            reason: (log as any).securityNotes || `Previously flagged during visit on ${(log.checkInTime || log.createdAt)?.substring(0, 10)}.`,
            matchedSource: 'PREVIOUS_VIOLATION',
            matchedField: 'PHONE',
            notes: `Badge #${log.badgeNumber || 'N/A'} had security violation recorded.`
          };
        }

        if (normName && logName && normName === logName && normName.length >= 5) {
          return {
            isBlacklisted: true,
            severity: 'HIGH',
            reason: (log as any).securityNotes || `Previous visit flagged for security violation.`,
            matchedSource: 'PREVIOUS_VIOLATION',
            matchedField: 'NAME',
            notes: `Historical visitor entry was flagged as BANNED.`
          };
        }
      }
    }

    return { isBlacklisted: false, matchedSource: 'NONE' };
  }
}
