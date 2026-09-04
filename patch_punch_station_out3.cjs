const fs = require('fs');
let code = fs.readFileSync('src/components/wfm/PunchStation.tsx', 'utf8');

const regex = /      } else {\n        const attendanceId = `ATT-\${userSession.employeeId \|\| userSession.userId}-\${todayDate}`;[\s\S]*?        res = await FirestoreService.punchOut\([\s\S]*?\n        \);\n      }/g;

code = code.replace(
  regex,
  `      } else {
        const attendanceId = \`ATT-\${userSession.employeeId || userSession.userId}-\${todayDate}\`;
        res = await FirestoreService.punchOut(
          activeCompany.companyId,
          rosterId,
          userSession.employeeId || userSession.userId,
          gpsPayload,
          isOverride,
          isOverride ? overrideReason : undefined
        );
      }`
);

fs.writeFileSync('src/components/wfm/PunchStation.tsx', code);
console.log('patched PunchStation punchOut 3');
