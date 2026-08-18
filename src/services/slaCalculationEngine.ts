import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  SlaDefinitionRecord, 
  SlaScorecardRecord, 
  SlaScorecardMetric,
  SlaBreachRecord,
  ServiceTicketRecord,
  WorkOrderRecord,
  AttendanceRecord
} from '../types';
import { slaService } from './slaService';

export const slaCalculationEngine = {

  async generateScorecard(
    companyId: string, 
    contractId: string, 
    clientId: string,
    periodStart: Date, 
    periodEnd: Date
  ): Promise<SlaScorecardRecord> {
    
    // 1. Fetch active SLAs for this contract
    const definitions = await slaService.getSlaDefinitions(companyId, contractId);
    const activeDefs = definitions.filter(d => d.status === 'ACTIVE');

    const metrics: SlaScorecardMetric[] = [];
    const newBreaches: SlaBreachRecord[] = [];
    
    // 2. Fetch operational data for the period
    const isoStart = periodStart.toISOString();
    const isoEnd = periodEnd.toISOString();

    // Fetch Tickets
    const qTickets = query(
      collection(db, 'companies', companyId, 'serviceTickets'),
      where('clientId', '==', clientId),
      where('createdAt', '>=', isoStart),
      where('createdAt', '<=', isoEnd)
    );
    const snapTickets = await getDocs(qTickets);
    const tickets = snapTickets.docs.map(d => d.data() as ServiceTicketRecord);

    // Fetch Work Orders
    const qWos = query(
      collection(db, 'companies', companyId, 'work_orders'),
      where('createdAt', '>=', isoStart),
      where('createdAt', '<=', isoEnd)
    );
    const snapWos = await getDocs(qWos);
    const wos = snapWos.docs.map(d => d.data() as WorkOrderRecord);

    // Fetch Attendance
    const startYMD = isoStart.split('T')[0];
    const endYMD = isoEnd.split('T')[0];
    const qAtt = query(
      collection(db, 'companies', companyId, 'attendance'),
      where('attendanceDate', '>=', startYMD),
      where('attendanceDate', '<=', endYMD)
    );
    const snapAtt = await getDocs(qAtt);
    const attendances = snapAtt.docs.map(d => d.data() as AttendanceRecord);

    // 3. Process each SLA definition
    for (const def of activeDefs) {
      let measured = 0;
      let breachedEvents = 0;
      let totalActual = 0;

      if (def.measurementType === 'RESOLUTION_TIME' || def.measurementType === 'RESPONSE_TIME') {
        // Measure using Tickets
        for (const t of tickets) {
          if (t.status === 'CLOSED' || t.status === 'RESOLVED') {
            measured++;
            
            let timeDiffHrs = 0;
            if (def.measurementType === 'RESOLUTION_TIME' && t.resolvedAt) {
               timeDiffHrs = (new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
            } else if (def.measurementType === 'RESPONSE_TIME' && t.updatedAt) {
               // Assuming first update is response for simplicity
               timeDiffHrs = (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
            }

            let actualInUnit = timeDiffHrs;
            if (def.targetUnit === 'MINUTES') actualInUnit = timeDiffHrs * 60;
            if (def.targetUnit === 'DAYS') actualInUnit = timeDiffHrs / 24;

            totalActual += actualInUnit;

            // Check breach
            if (actualInUnit > def.targetValue) {
              breachedEvents++;
              newBreaches.push({
                id: `BR-${Date.now()}-${t.id}`,
                companyId,
                clientId,
                contractId,
                slaId: def.id,
                sourceRecordId: t.id,
                targetValue: def.targetValue,
                actualValue: actualInUnit,
                variance: actualInUnit - def.targetValue,
                detectedAt: new Date().toISOString(),
                severity: def.severity,
                status: 'OPEN'
              });
            }
          }
        }
      } else if (def.measurementType === 'TASK_COMPLETION') {
        // Measure using Work Orders
        for (const w of wos) {
          if (w.status === 'COMPLETED' || w.status === 'CLOSED') {
            measured++;
            let diffHrs = 0;
            if (w.actualEnd && w.actualStart) {
               diffHrs = (new Date(w.actualEnd).getTime() - new Date(w.actualStart).getTime()) / (1000 * 60 * 60);
            } else if (w.closedAt) {
               diffHrs = (new Date(w.closedAt).getTime() - new Date(w.createdAt).getTime()) / (1000 * 60 * 60);
            }

            let actualInUnit = diffHrs;
            if (def.targetUnit === 'MINUTES') actualInUnit = diffHrs * 60;
            if (def.targetUnit === 'DAYS') actualInUnit = diffHrs / 24;

            totalActual += actualInUnit;
            if (actualInUnit > def.targetValue) {
               breachedEvents++;
               newBreaches.push({
                id: `BR-${Date.now()}-${w.id}`,
                companyId,
                clientId,
                contractId,
                slaId: def.id,
                sourceRecordId: w.id,
                targetValue: def.targetValue,
                actualValue: actualInUnit,
                variance: actualInUnit - def.targetValue,
                detectedAt: new Date().toISOString(),
                severity: def.severity,
                status: 'OPEN'
              });
            }
          }
        }
      } else if (def.measurementType === 'ATTENDANCE_COMPLIANCE') {
        // Mocking attendance compliance aggregation
        measured = 1; 
        const attendanceRate = attendances.length > 0 ? 98.5 : 0; // Simplified
        totalActual = attendanceRate;
        if (attendanceRate < def.targetValue) {
           breachedEvents++;
           newBreaches.push({
              id: `BR-${Date.now()}-ATT`,
              companyId,
              clientId,
              contractId,
              slaId: def.id,
              sourceRecordId: 'ATT-AGGREGATE',
              targetValue: def.targetValue,
              actualValue: attendanceRate,
              variance: def.targetValue - attendanceRate,
              detectedAt: new Date().toISOString(),
              severity: def.severity,
              status: 'OPEN'
           });
        }
      } else if (def.measurementType === 'SERVICE_AVAILABILITY') {
        measured = 1;
        const uptime = 99.9;
        totalActual = uptime;
        if (uptime < def.targetValue) {
           breachedEvents++;
        }
      }

      const avgActual = measured > 0 ? (totalActual / measured) : 0;
      let compliance = 100;
      let isMet = true;
      
      if (def.targetUnit === 'PERCENTAGE') {
        compliance = avgActual;
        isMet = compliance >= def.targetValue;
      } else {
        if (avgActual > def.targetValue) {
          isMet = false;
          // Rough compliance percentage calculation
          compliance = Math.max(0, 100 - ((avgActual - def.targetValue) / def.targetValue) * 100);
        }
      }

      metrics.push({
        slaId: def.id,
        slaName: def.slaName,
        targetValue: def.targetValue,
        targetUnit: def.targetUnit,
        actualValue: avgActual,
        compliancePercentage: measured === 0 ? 100 : compliance,
        totalMeasuredEvents: measured,
        breaches: breachedEvents,
        isMet: measured === 0 ? true : isMet
      });
    }

    const totalBreaches = metrics.reduce((acc, m) => acc + m.breaches, 0);
    const criticalBreaches = newBreaches.filter(b => b.severity === 'CRITICAL').length;
    const overallCompliance = metrics.length > 0 ? (metrics.reduce((acc, m) => acc + m.compliancePercentage, 0) / metrics.length) : 100;

    const scorecard: SlaScorecardRecord = {
      id: `SC-${contractId}-${Date.now()}`,
      companyId,
      clientId,
      contractId,
      periodType: 'CUSTOM',
      periodStartDate: isoStart,
      periodEndDate: isoEnd,
      metrics,
      overallCompliance,
      totalBreaches,
      criticalBreaches,
      generatedAt: new Date().toISOString(),
      version: 1
    };

    // Save breaches
    for (const br of newBreaches) {
      await slaService.saveSlaBreach(companyId, br);
    }
    
    // Save scorecard
    await slaService.saveScorecard(companyId, scorecard);

    return scorecard;
  }
};
