import sys

with open('src/services/firestoreService.ts', 'r') as f:
    code = f.read()

target_str = """  static async updatePayrollCycleStatus(
    companyId: string,
    cycleId: string,
    status: 'PENDING_APPROVAL' | 'APPROVED' | 'LOCKED' | 'CANCELLED' | 'DISBURSED',
    actor: { uid: string; name: string }
  ): Promise<boolean> {"""

start_idx = code.find(target_str)
if start_idx == -1:
    print("Not found target_str")
    sys.exit(1)

end_marker = "handleFirestoreError(err, OperationType.UPDATE, `companies/${companyId}/payroll/${cycleId}`);"
end_idx_raw = code.find(end_marker, start_idx)
if end_idx_raw == -1:
    print("Not found end_marker")
    sys.exit(1)

end_idx = code.find('}', end_idx_raw) + 1
next_end_idx = code.find('}', end_idx) + 1

replacement = """  static async updatePayrollCycleStatus(
    companyId: string,
    cycleId: string,
    status: 'PENDING_APPROVAL' | 'APPROVED' | 'LOCKED' | 'CANCELLED' | 'DISBURSED',
    actor: { uid: string; name: string }
  ): Promise<boolean> {
    try {
      const now = new Date().toISOString();
      const cycleRef = doc(db, 'companies', companyId, 'payroll', cycleId);
      
      const updateData: Partial<PayrollCycleRecord> = {
        status
      };

      if (status === 'APPROVED') {
        updateData.approvedAt = now;
      } else if (status === 'LOCKED') {
        updateData.lockedAt = now;
      } else if (status === 'DISBURSED') {
        updateData.disbursedAt = now;
      }

      const slips = await this.getSalarySlips(companyId, cycleId);
      
      // Use batch for atomic update
      let batch = writeBatch(db);
      let opCount = 0;

      batch.update(cycleRef, updateData);
      opCount++;

      for (const slip of slips) {
        const slipRef = doc(db, 'companies', companyId, 'salary_slips', slip.id);
        batch.update(slipRef, {
          status: status === 'DISBURSED' ? 'PAID' : 'APPROVED'
        });
        opCount++;
        
        if (opCount >= 495) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }
      }

      const auditRec = AuditTrailService.buildAuditRecord(
        { userId: actor.uid, companyId },
        companyId,
        'HCM',
        `PAYROLL_${status}` as any,
        'UPDATE',
        'PayrollCycleRecord',
        cycleId,
        true,
        'HIGH',
        undefined,
        `Payroll cycle ${cycleId} was marked as ${status} by ${actor.name}`,
        undefined,
        { status }
      );

      if (auditRec) {
        const auditRef = doc(db, 'companies', companyId, 'audit_logs', auditRec.id);
        batch.set(auditRef, auditRec);
      }

      await batch.commit();
      return true;
    } catch (err: any) {
      console.error('[FirestoreService] updatePayrollCycleStatus error:', err);
      handleFirestoreError(err, OperationType.UPDATE, `companies/${companyId}/payroll/${cycleId}`);
      return false;
    }
  }"""

new_code = code[:start_idx] + replacement + code[next_end_idx:]
with open('src/services/firestoreService.ts', 'w') as f:
    f.write(new_code)
print("Success")
