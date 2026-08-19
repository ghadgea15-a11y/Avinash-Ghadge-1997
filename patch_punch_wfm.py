import re

with open('src/services/firestoreService.ts', 'r') as f:
    content = f.read()

if "import { SuspiciousPunchService } from './suspiciousPunchService';" not in content:
    content = content.replace("import { AuditTrailService } from './auditTrailService';", "import { AuditTrailService } from './auditTrailService';\nimport { SuspiciousPunchService } from './suspiciousPunchService';")

punch_in_audit = """      // Module 10.3 Integration: Suspicious Punch Engine (Runs synchronously in lifecycle)
      const actorInfo = { userId: employeeId, companyId, role: 'EMPLOYEE' }; 
      const anomalyRecord = await SuspiciousPunchService.evaluatePunch(
         actorInfo as any, companyId, 'PUNCH_IN', employeeId, siteId, shift, siteSnap.data() as any, gps, id
      );

      // Persist Punch In
      const docRef = doc(db, 'companies', companyId, 'attendance', id);
      await setDoc(docRef, recordPayload, { merge: true });
"""
content = re.sub(r"      // Persist Punch In\n      const docRef = doc\(db, 'companies', companyId, 'attendance', id\);\n      await setDoc\(docRef, recordPayload, \{ merge: true \}\);", punch_in_audit, content)


punch_out_audit = """      // Module 10.3 Integration
      const actorInfo = { userId: record.employeeId, companyId, role: 'EMPLOYEE' }; 
      await SuspiciousPunchService.evaluatePunch(
         actorInfo as any, companyId, 'PUNCH_OUT', record.employeeId, record.siteId, shift, siteSnap.data() as any, gps, attendanceId
      );

      // Save Output
      await setDoc(ref, payload, { merge: true });
"""
content = re.sub(r"      // Save Output\n      await setDoc\(ref, payload, \{ merge: true \}\);", punch_out_audit, content)

with open('src/services/firestoreService.ts', 'w') as f:
    f.write(content)
