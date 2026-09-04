const fs = require('fs');
let code = fs.readFileSync('src/components/wfm/PunchStation.tsx', 'utf8');

code = code.replace(
  "      } else {\n        const attendanceId = `ATT-${rosterId}`;",
  `      } else {
        const attendanceId = \`ATT-\${userSession.employeeId || userSession.userId}-\${todayDate}\`;
        res = await FirestoreService.punchOut(
          activeCompany.companyId,
          rosterId,
          userSession.employeeId || userSession.userId,
          gpsPayload,
          isOverride,
          isOverride ? overrideReason : undefined
        );`
);

fs.writeFileSync('src/components/wfm/PunchStation.tsx', code);
console.log('patched PunchStation punchOut call');
