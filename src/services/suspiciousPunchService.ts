import { db } from '../firebase';
import { collection, doc, setDoc, query, where, getDocs, orderBy, getDoc } from 'firebase/firestore';
import { SuspiciousMusterPunch, UserSession, ShiftRecord, SiteRecord, AttendanceRecord } from '../types';
import { SecurityAuditService } from './securityAuditService';
import { AuditTrailService } from './auditTrailService';

export class SuspiciousPunchService {
  /**
   * Evaluates a punch for anomalies. Does not throw, fails safely returning null if ok or error.
   * Only returns an anomaly record if one is detected.
   */
  static async evaluatePunch(
    session: UserSession,
    companyId: string,
    punchType: 'PUNCH_IN' | 'PUNCH_OUT',
    employeeId: string,
    siteId: string,
    shift: ShiftRecord,
    site: SiteRecord,
    gps?: { latitude: number, longitude: number, accuracy?: number },
    attendanceId?: string
  ): Promise<SuspiciousMusterPunch | null> {
    try {
      const now = Date.now();
      const anomalies: { type: string; evidence: string; score: number }[] = [];
      let totalScore = 0;

      // 1. Shift Window Evaluation
      const punchDate = new Date();
      // Basic check: is punch > 4 hours away from shift bounds?
      const [sh, sm] = shift.startTime.split(':').map(Number);
      const [eh, em] = shift.endTime.split(':').map(Number);
      
      const shiftStartToday = new Date();
      shiftStartToday.setHours(sh, sm, 0, 0);
      
      const shiftEndToday = new Date();
      shiftEndToday.setHours(eh, em, 0, 0);
      if (shiftEndToday < shiftStartToday) {
        shiftEndToday.setDate(shiftEndToday.getDate() + 1); // Overnight shift
      }

      const diffStart = Math.abs(punchDate.getTime() - shiftStartToday.getTime()) / (1000 * 60 * 60);
      const diffEnd = Math.abs(punchDate.getTime() - shiftEndToday.getTime()) / (1000 * 60 * 60);
      
      if (diffStart > 6 && diffEnd > 6) {
        anomalies.push({
          type: 'SHIFT_MISMATCH',
          evidence: `Punch executed ${Math.min(diffStart, diffEnd).toFixed(1)} hours outside shift bounds.`,
          score: 40
        });
      }

      // 2. Rapid Punch Detection
      // Look for multiple punches within 5 minutes for this employee
      const attRef = collection(db, 'companies', companyId, 'attendance');
      const todayString = punchDate.toISOString().split('T')[0];
      const attQ = query(attRef, where('employeeId', '==', employeeId), where('attendanceDate', '==', todayString));
      const attSnap = await getDocs(attQ);
      
      if (!attSnap.empty) {
        let punchCount = 0;
        attSnap.docs.forEach(d => {
          const a = d.data() as AttendanceRecord;
          if (a.checkIn && (punchDate.getTime() - new Date(a.checkIn).getTime() < 5 * 60000)) punchCount++;
          if (a.checkOut && (punchDate.getTime() - new Date(a.checkOut).getTime() < 5 * 60000)) punchCount++;
        });
        
        if (punchCount >= 2) {
          anomalies.push({
            type: 'RAPID_PUNCH',
            evidence: `Detected ${punchCount} punches within a 5-minute window.`,
            score: 50
          });
        }
      }

      // 3. Geofence Evaluation (Using provided GPS)
      if (site.geofenceEnabled && site.latitude && site.longitude && gps) {
        const { GeoUtils } = await import('../utils/geoUtils');
        const geoResult = GeoUtils.evaluateGeofence(
          gps.latitude, gps.longitude, gps.accuracy || 0,
          site.latitude, site.longitude, site.geofenceRadius || 100, site.accuracyThreshold || 50
        );

        if (geoResult.result === 'OUTSIDE_GEOFENCE') {
           anomalies.push({
             type: 'GEOFENCE_VIOLATION',
             evidence: `Punch outside assigned site. Distance: ${geoResult.distance.toFixed(1)}m. Limit: ${site.geofenceRadius}m.`,
             score: geoResult.distance > 5000 ? 80 : 50 // Far away = higher score
           });
        }
        
        if (GeoUtils.detectTampering(gps.latitude, gps.longitude, now)) {
           anomalies.push({
             type: 'DEVICE_TAMPERING',
             evidence: 'Detected suspicious location tampering signatures.',
             score: 90
           });
        }
      } else if (site.geofenceEnabled && !gps) {
        // No GPS provided but required
        anomalies.push({
          type: 'GEOFENCE_VIOLATION',
          evidence: 'Mandatory GPS coordinates bypassed or unavailable.',
          score: 30
        });
      }

      if (anomalies.length === 0) return null; // Clean punch

      // Compile Anomaly
      anomalies.forEach(a => totalScore += a.score);
      const primaryAnomaly = anomalies.reduce((prev, current) => (prev.score > current.score) ? prev : current);
      
      let finalSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      if (totalScore >= 90) finalSeverity = 'CRITICAL';
      else if (totalScore >= 70) finalSeverity = 'HIGH';
      else if (totalScore >= 40) finalSeverity = 'MEDIUM';

      const allEvidence = anomalies.map(a => a.evidence).join(' | ');

      const anomalyId = `SPUNCH-${Date.now()}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
      
      const record: SuspiciousMusterPunch = {
        id: anomalyId,
        companyId,
        siteId,
        employeeId,
        attendanceId,
        shiftId: shift.id,
        punchType,
        punchTimestamp: new Date().toISOString(),
        detectedAt: new Date().toISOString(),
        anomalyType: primaryAnomaly.type as any,
        severity: finalSeverity,
        riskScore: totalScore,
        evidence: allEvidence,
        status: 'DETECTED',
        correlationId: attendanceId
      };

      // Persist Suspicious Punch
      const docRef = doc(db, 'companies', companyId, 'suspicious_punches', anomalyId);
      await setDoc(docRef, record);

      // Security Audit & Immutable Audit integration
      if (finalSeverity === 'CRITICAL' || finalSeverity === 'HIGH') {
        const actorInfo = { userId: session.userId, employeeId: session.employeeId, role: session.role, companyId };
        
        await SecurityAuditService.logEvent(
          companyId,
          session.userId,
          session.role,
          session.employeeId,
          'ANOMALOUS_PUNCH_DETECTED',
          'suspicious_punches',
          anomalyId,
          true,
          finalSeverity,
          `Suspicious punch detected for employee ${employeeId}. Score: ${totalScore}. Evidence: ${primaryAnomaly.evidence}`
        );

        await AuditTrailService.logCreate(
          actorInfo,
          'WFM_SECURITY',
          'SuspiciousMusterPunch',
          anomalyId,
          `Detected suspicious ${punchType} for ${employeeId} (Score: ${totalScore})`,
          { riskScore: totalScore, primaryAnomaly: primaryAnomaly.type }
        );
      }

      return record;
    } catch (err) {
      console.error('[SuspiciousPunchService] Engine evaluation failed:', err);
      return null;
    }
  }

  static async getSuspiciousPunches(session: UserSession, companyId: string): Promise<SuspiciousMusterPunch[]> {
    try {
      const q = query(collection(db, 'companies', companyId, 'suspicious_punches'));
      const snap = await getDocs(q);
      const items = snap.docs.map(d => d.data() as SuspiciousMusterPunch);
      items.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
      return items;
    } catch (err) {
      console.error('getSuspiciousPunches error:', err);
      return [];
    }
  }

  static async resolveAnomaly(
    session: UserSession, 
    companyId: string, 
    anomalyId: string, 
    status: 'FALSE_POSITIVE' | 'CONFIRMED_ANOMALY' | 'RESOLVED',
    resolutionNotes: string
  ): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'suspicious_punches', anomalyId);
      
      const snap = await getDoc(docRef);
      if (!snap.exists()) return false;
      const data = snap.data() as SuspiciousMusterPunch;

      await setDoc(docRef, { 
        status, 
        resolution: resolutionNotes,
        reviewedBy: session.userId,
        reviewedAt: new Date().toISOString()
      }, { merge: true });

      const actorInfo = { userId: session.userId, employeeId: session.employeeId, role: session.role, companyId };
      await AuditTrailService.logUpdate(
        actorInfo,
        'WFM_SECURITY',
        'SuspiciousMusterPunch',
        anomalyId,
        `Resolved anomaly ${anomalyId} as ${status}. Notes: ${resolutionNotes}`,
        undefined,
        data.correlationId
      );

      return true;
    } catch (err) {
      console.error('resolveAnomaly error:', err);
      return false;
    }
  }
}
