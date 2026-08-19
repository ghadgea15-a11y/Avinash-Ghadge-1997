import re

with open('src/services/slaCalculationEngine.ts', 'r') as f:
    content = f.read()

new_logic = """
      } else if (def.measurementType === 'ATTENDANCE_COMPLIANCE') {
        measured = attendances.length;
        
        let compliantCount = 0;
        attendances.forEach(a => {
          if (['PRESENT', 'LATE', 'EARLY_DEPARTURE', 'HALF_DAY'].includes(a.status)) {
            compliantCount++;
          }
        });
        
        const attendanceRate = measured > 0 ? (compliantCount / measured) * 100 : 100;
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
"""

pattern = re.compile(r"      \} else if \(def\.measurementType === 'ATTENDANCE_COMPLIANCE'\) \{.*?              severity: def\.severity,", re.DOTALL)
content = pattern.sub(new_logic.strip(), content)

with open('src/services/slaCalculationEngine.ts', 'w') as f:
    f.write(content)
