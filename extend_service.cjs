const fs = require('fs');
let code = fs.readFileSync('src/services/enterpriseIntelligenceService.ts', 'utf-8');

code = code.replace(
  "// TODO: Audit, Payroll exceptions, Contracts",
  `// 6. Contracts
    let contractQuery = query(collection(db, 'companies', companyId, 'contracts'), where('status', 'in', ['ACTIVE', 'EXPIRING_SOON']));
    const contractSnap = await getDocs(contractQuery);
    const contracts = contractSnap.docs.map(d => d.data() as any);
    result.financial.contractRenewals = contracts.filter(c => c.status === 'EXPIRING_SOON' || (c.endDate && new Date(c.endDate).getTime() < nowMs + 30 * 24 * 3600 * 1000)).length;

    // 7. Security Audits
    let auditQuery = query(collection(db, 'companies', companyId, 'security_audits'), where('status', 'in', ['SCHEDULED', 'OVERDUE']));
    const auditSnap = await getDocs(auditQuery);
    result.compliance.overdueAudits = auditSnap.docs.filter(d => d.data().status === 'OVERDUE' || (d.data().dueDate && new Date(d.data().dueDate).getTime() < nowMs)).length;

    // 8. Payroll
    let payrollQuery = query(collection(db, 'companies', companyId, 'payroll_cycles'), where('status', '==', 'PROCESSING_ERROR'));
    const payrollSnap = await getDocs(payrollQuery);
    result.financial.payrollExceptions = payrollSnap.size;`
);

fs.writeFileSync('src/services/enterpriseIntelligenceService.ts', code);
