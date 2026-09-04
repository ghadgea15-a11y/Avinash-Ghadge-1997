const fs = require('fs');
let code = fs.readFileSync('src/components/wfm/SupervisorRollCall.tsx', 'utf8');

code = code.replace(
  "setEmployees(data.filter(e => e.status === 'ACTIVE' || !e.status));",
  `
          let emps = data.filter(e => e.status === 'ACTIVE' || !e.status);
          if (userSession.role === 'SUPERVISOR' || (userSession.roles && userSession.roles.includes('SUPERVISOR'))) {
            emps = emps.filter(e => (e.assignedSiteId === userSession.branchId || e.siteId === userSession.branchId) && e.role !== 'SUPERVISOR' && e.role !== 'COMPANY_ADMIN');
          }
          setEmployees(emps);
  `
);

code = code.replace(
  /const success = await FirestoreService\.saveAttendance\(activeCompany\.companyId, \{[\s\S]*?\} as any\);/,
  `const attQuery = query(collection(db, 'companies', activeCompany.companyId, 'attendance'), where('employeeId', '==', emp.id), where('date', '==', todayStr));
      const existSnap = await getDocs(attQuery);
      
      let existingRecord = existSnap.empty ? null : existSnap.docs[0].data();
      
      const payload: any = {
        id: existSnap.empty ? logId : existSnap.docs[0].id,
        employeeId: emp.id,
        userName: \`\${emp.firstName} \${emp.lastName}\`,
        action: status === 'PRESENT' ? 'PUNCH_IN' : (status === 'ABSENT' ? 'ABSENT' : 'HALFDAY'),
        date: todayStr,
        attendanceDate: todayStr,
        siteId: emp.assignedSiteId || 'SITE-DEFAULT',
        locationDetails: 'Marked by Supervisor',
        markedBy: userSession.userId || userSession.uid || '',
        status: status as any
      };

      if (!existingRecord || !existingRecord.checkInTime) {
        payload.checkInTime = (status === 'PRESENT' || status === 'LATE' || status === 'OVERTIME') ? new Date().toISOString() : undefined;
      }
      
      const attRef = doc(db, 'companies', activeCompany.companyId, 'attendance', payload.id);
      await setDoc(attRef, { ...payload, updatedAt: new Date().toISOString() }, { merge: true });
      const success = true;`
);

// We need to make sure `query`, `collection`, `where`, `getDocs`, `doc`, `setDoc`, `db` are imported if not already.
if (!code.includes('import { db } from')) {
  code = `import { db } from '../../firebase';\nimport { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';\n` + code;
} else if (!code.includes('getDocs')) {
    code = code.replace("from 'firebase/firestore';", ", getDocs, doc, setDoc } from 'firebase/firestore';");
}


fs.writeFileSync('src/components/wfm/SupervisorRollCall.tsx', code);
console.log('patched SupervisorRollCall duplicates and filtering');
