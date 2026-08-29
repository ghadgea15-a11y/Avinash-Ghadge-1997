const fs = require('fs');
let content = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

const replacements = [
  {
    find: `  static async acknowledgeHandover(companyId: string, handoverId: string, actor: any): Promise<boolean> {\n    const ref = doc(db, 'companies', companyId, 'shift_handovers', handoverId);\n  }\n    return true;\n  }`,
    replace: `  static async acknowledgeHandover(companyId: string, handoverId: string, actor: any): Promise<boolean> {\n    const ref = doc(db, 'companies', companyId, 'shift_handovers', handoverId);\n    await updateDoc(ref, { acknowledged: true, acknowledgedBy: actor?.userId || actor?.name || 'User', acknowledgedAt: new Date().toISOString() });\n    return true;\n  }`
  },
  {
    find: `  static async cancelPaymentBatch(companyId: string, batchId: string, actorId: string, reason: string): Promise<boolean> {\n    const ref = doc(db, 'companies', companyId, 'payment_batches', batchId);\n  }\n    return true;\n  }`,
    replace: `  static async cancelPaymentBatch(companyId: string, batchId: string, actorId: string, reason: string): Promise<boolean> {\n    const ref = doc(db, 'companies', companyId, 'payment_batches', batchId);\n    await updateDoc(ref, { status: 'CANCELLED', cancelledById: actorId, cancellationReason: reason, updatedAt: new Date().toISOString() });\n    return true;\n  }`
  },
  {
    find: `  static async recordPaymentBatchExport(companyId: string, batchId: string, format: string, actorId: string): Promise<boolean> {\n    const ref = doc(db, 'companies', companyId, 'payment_batches', batchId);\n  }\n    return true;\n  }`,
    replace: `  static async recordPaymentBatchExport(companyId: string, batchId: string, format: string, actorId: string): Promise<boolean> {\n    const ref = doc(db, 'companies', companyId, 'payment_batches', batchId);\n    await updateDoc(ref, { lastExportedFormat: format, lastExportedAt: new Date().toISOString(), lastExportedBy: actorId });\n    return true;\n  }`
  },
  {
    find: `  static async calculatePayrollCycle(companyId: string, cycleId: string, actor: any): Promise<boolean> {\n    const ref = doc(db, 'companies', companyId, 'payrollCycles', cycleId);\n  }\n    return true;\n  }`,
    replace: `  static async calculatePayrollCycle(companyId: string, cycleId: string, actor: any): Promise<boolean> {\n    const ref = doc(db, 'companies', companyId, 'payrollCycles', cycleId);\n    await updateDoc(ref, { status: 'CALCULATED', calculatedBy: actor?.userId || 'SYSTEM', calculatedAt: new Date().toISOString() });\n    return true;\n  }`
  },
  {
    find: `  static async approvePayrollCycle(companyId: string, cycleId: string, actor: any): Promise<boolean> {\n    const ref = doc(db, 'companies', companyId, 'payrollCycles', cycleId);\n  }\n    return true;\n  }`,
    replace: `  static async approvePayrollCycle(companyId: string, cycleId: string, actor: any): Promise<boolean> {\n    const ref = doc(db, 'companies', companyId, 'payrollCycles', cycleId);\n    await updateDoc(ref, { status: 'APPROVED', approvedBy: actor?.userId || 'SYSTEM', approvedAt: new Date().toISOString() });\n    return true;\n  }`
  }
];

replacements.forEach(r => {
  content = content.replace(r.find, r.replace);
});

fs.writeFileSync('src/services/firestoreService.ts', content);
