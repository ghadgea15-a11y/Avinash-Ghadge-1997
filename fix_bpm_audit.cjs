const fs = require('fs');
let code = fs.readFileSync('src/services/bpmService.ts', 'utf8');

if (!code.includes("import { doc, collection, runTransaction, getDocs, query, where, orderBy, setDoc, limit } from 'firebase/firestore';")) {
  // It probably already has these
}

code = code.replace(
  /transaction\.set\(instanceRef, instance\);\s+return instance;/,
  `transaction.set(instanceRef, instance);
      
      const auditRec = AuditTrailService.buildAuditRecord(
        { userId: session.userId, employeeId: session.employeeId, role: session.role, companyId: session.companyId },
        session.companyId,
        'BPM',
        \`BPM_ACTION_\${actionType}\`,
        'EXECUTE',
        'BpmApprovalInstance',
        instanceId,
        true,
        'MEDIUM',
        instanceId,
        \`Action \${actionType} performed on BPM Instance \${instanceId}\${proxyDetails.asProxy ? \` as proxy for \${proxyDetails.delegatorId}\` : ''}\`,
        undefined,
        { actionType, reason, proxyDetails }
      );
      if (auditRec) {
        const auditRef = doc(db, 'companies', session.companyId, 'audit_logs', auditRec.id);
        transaction.set(auditRef, auditRec);
      }
      
      return instance;`
);

// We need to make sure we remove the floating async AuditTrailService.logUpdate calls that we just moved inside the transaction
code = code.replace(
  /AuditTrailService\.logUpdate\(session, 'BPM', 'BpmApprovalInstance', instanceId, \`Proxy action \$\{actionType\} performed on behalf of \$\{proxyDetails\.delegatorId\}\`, \{ proxyUserId: session\.userId, delegatorId: proxyDetails\.delegatorId \}, instanceId\)\.catch\(\(\) => \{\}\);/,
  `// Replaced by internal transaction audit log`
);

fs.writeFileSync('src/services/bpmService.ts', code);
