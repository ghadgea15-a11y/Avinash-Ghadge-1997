import { db } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';
import { 
  UserSession, 
  PatrolTourCheckpointScan, 
  PatrolTourRecord 
} from '../types';
import { SecurityAuditService } from './securityAuditService';
import { AuditTrailService } from './auditTrailService';

export type PatrolAnomalyType = 
  | 'DUPLICATE_CHECKPOINT_SCAN'
  | 'CONCURRENT_GUARD_COLLISION'
  | 'IMPOSSIBLE_TRAVEL_SPEED'
  | 'GEOFENCE_VIOLATION'
  | 'QR_TAMPERING_SUSPECTED';

export interface SuspiciousPatrolScan {
  id: string;
  companyId: string;
  siteId: string;
  checkpointId: string;
  checkpointName: string;
  tourId: string;
  employeeId: string;
  employeeName: string;
  scannedAt: string;
  detectedAt: string;
  anomalyType: PatrolAnomalyType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  evidence: string;
  status: 'DETECTED' | 'FALSE_POSITIVE' | 'CONFIRMED' | 'RESOLVED';
  conflictingTourId?: string;
  conflictingEmployeeId?: string;
  conflictingEmployeeName?: string;
}

export class SuspiciousPatrolService {
  /**
   * Evaluates a patrol checkpoint scan for cross-tour anomalies.
   */
  static async evaluateScan(
    session: UserSession,
    companyId: string,
    siteId: string,
    checkpoint: any,
    scan: PatrolTourCheckpointScan,
    currentTour: PatrolTourRecord
  ): Promise<SuspiciousPatrolScan | null> {
    try {
      const now = new Date();
      const scanTime = new Date(scan.scannedAt);
      const oneMinuteAgo = new Timestamp(Math.floor((scanTime.getTime() - 60000) / 1000), 0);
      const anomalies: { type: PatrolAnomalyType; evidence: string; score: number; conflict?: any }[] = [];
      let totalScore = 0;

      // 1. Cross-Guard Duplicate Scan Check (The "Duplicate Device" Scenario)
      // Check for any other scan of this same checkpoint by a DIFFERENT guard in the last 1 minute
      const toursRef = collection(db, 'companies', companyId, 'patrol_tours');
      
      // Since scans are embedded in tours, we need a better way if possible.
      // But for small datasets, querying recent tours at this site works.
      const recentToursQ = query(
        toursRef,
        where('siteId', '==', siteId),
        where('updatedAt', '>=', oneMinuteAgo.toDate().toISOString()),
        limit(20)
      );
      
      const tourSnap = await getDocs(recentToursQ);
      
      for (const doc of tourSnap.docs) {
        const otherTour = doc.data() as PatrolTourRecord;
        if (otherTour.id === currentTour.id) continue;
        
        const otherScans = otherTour.checkpointScans || [];
        const conflictScan = otherScans.find((s: any) => 
          s.checkpointId === scan.checkpointId && 
          Math.abs(new Date(s.scannedAt).getTime() - scanTime.getTime()) < 60000 &&
          s.scannedByUid !== scan.scannedByUid
        );

        if (conflictScan) {
          anomalies.push({
            type: 'DUPLICATE_CHECKPOINT_SCAN',
            evidence: `Checkpoint '${scan.checkpointName}' was scanned by ${conflictScan.scannedByName} (Tour #${otherTour.tourNumber}) at ${new Date(conflictScan.scannedAt).toLocaleTimeString()} and again by ${scan.scannedByName} (Tour #${currentTour.tourNumber}) at ${scanTime.toLocaleTimeString()}. Time diff: ${Math.round(Math.abs(new Date(conflictScan.scannedAt).getTime() - scanTime.getTime()) / 1000)}s.`,
            score: 80,
            conflict: {
              tourId: otherTour.id,
              employeeId: conflictScan.scannedByUid,
              employeeName: conflictScan.scannedByName
            }
          });
          break; // Found a primary collision
        }
      }

      // 2. Impossible Travel Speed Check
      // If the same guard scanned a checkpoint too far away too quickly
      const lastScan = (currentTour.checkpointScans || [])
        .filter((s: any) => s.checkpointId !== scan.checkpointId)
        .sort((a: any, b: any) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())[0];

      if (lastScan && scan.gpsLocation && lastScan.gpsLocation) {
        const { GeoUtils } = await import('../utils/geoUtils');
        const dist = GeoUtils.calculateDistanceInMeters(
          scan.gpsLocation.latitude, scan.gpsLocation.longitude,
          lastScan.gpsLocation.latitude, lastScan.gpsLocation.longitude
        );
        const timeDiffSeconds = (scanTime.getTime() - new Date(lastScan.scannedAt).getTime()) / 1000;
        
        if (timeDiffSeconds > 0) {
          const speedKph = (dist / 1000) / (timeDiffSeconds / 3600);
          if (speedKph > 20 && dist > 100) { // Moving faster than 20km/h between checkpoints on foot is suspicious
            anomalies.push({
              type: 'IMPOSSIBLE_TRAVEL_SPEED',
              evidence: `Guard traveled ${dist.toFixed(0)}m in ${timeDiffSeconds.toFixed(0)}s (${speedKph.toFixed(1)} km/h). Exceeds physical patrol limits.`,
              score: 50
            });
          }
        }
      }

      if (anomalies.length === 0) return null;

      // Compile Anomaly
      anomalies.forEach(a => totalScore += a.score);
      const primary = anomalies.reduce((prev, curr) => prev.score > curr.score ? prev : curr);
      
      const severity = totalScore >= 90 ? 'CRITICAL' : (totalScore >= 60 ? 'HIGH' : (totalScore >= 30 ? 'MEDIUM' : 'LOW'));
      const anomalyId = `ANOM-PATROL-${Date.now()}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;

      const record: SuspiciousPatrolScan = {
        id: anomalyId,
        companyId,
        siteId,
        checkpointId: scan.checkpointId,
        checkpointName: scan.checkpointName,
        tourId: currentTour.id,
        employeeId: session.employeeId || session.userId,
        employeeName: session.fullName,
        scannedAt: scan.scannedAt,
        detectedAt: new Date().toISOString(),
        anomalyType: primary.type,
        severity,
        riskScore: totalScore,
        evidence: anomalies.map(a => a.evidence).join(' | '),
        status: 'DETECTED',
        conflictingTourId: primary.conflict?.tourId,
        conflictingEmployeeId: primary.conflict?.employeeId,
        conflictingEmployeeName: primary.conflict?.employeeName
      };

      // Persist to suspicious_patrol_scans
      const docRef = doc(db, 'companies', companyId, 'suspicious_patrol_scans', anomalyId);
      await setDoc(docRef, record);

      // Log to Security Audit
      await SecurityAuditService.logEvent(
        companyId,
        session.userId,
        session.role,
        session.employeeId,
        'PATROL_ANOMALY_DETECTED',
        'suspicious_patrol_scans',
        anomalyId,
        true,
        severity,
        `Patrol Anomaly: ${primary.type} - ${primary.evidence}`
      );

      // Enterprise Audit Log
      await AuditTrailService.log(
        session,
        'DETECT_ANOMALY',
        'SECURITY_OPERATIONS',
        {
          resourceId: anomalyId,
          newValue: record,
          status: 'WARNING',
          metadata: { anomalyType: primary.type, riskScore: totalScore }
        }
      );

      return record;
    } catch (err) {
      console.error('[SuspiciousPatrolService] evaluation failed:', err);
      return null;
    }
  }

  static async getAnomalies(companyId: string): Promise<SuspiciousPatrolScan[]> {
    try {
      const q = query(
        collection(db, 'companies', companyId, 'suspicious_patrol_scans'),
        orderBy('detectedAt', 'desc'),
        limit(100)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as SuspiciousPatrolScan);
    } catch (err) {
      return [];
    }
  }
}
