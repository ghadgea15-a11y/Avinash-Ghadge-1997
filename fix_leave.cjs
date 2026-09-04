const fs = require('fs');

let f1 = fs.readFileSync('src/services/bpmIntegrationService.ts', 'utf8');

const newLeaveMethod = `  private static async handleLeaveApproval(instance: BpmApprovalInstance, reviewerId: string, transaction: any) {
    const now = new Date().toISOString();
    const reqRef = doc(db, 'companies', instance.companyId, 'leaveRequests', instance.sourceRecordId);
    let reqData = null;

    if (transaction) {
      const snap = await transaction.get(reqRef);
      if (snap.exists()) reqData = snap.data();
    } else {
      const snap = await getDoc(reqRef);
      if (snap.exists()) reqData = snap.data();
    }

    if (!reqData) throw new Error('Leave request not found');

    // Update status
    await this.performWrite(reqRef, { status: 'APPROVED', approvedBy: reviewerId, approvedAt: now, updatedAt: now }, transaction);

    // Deduct balance
    const employeeId = reqData.employeeId;
    const leaveCode = reqData.leaveType || reqData.leaveCode;
    const daysCount = reqData.daysCount || 0;
    const startDate = new Date(reqData.startDate || now);
    const year = startDate.getFullYear();

    const balanceRef = doc(db, 'companies', instance.companyId, 'leaveBalances', employeeId);
    let balanceData = null;

    if (transaction) {
      const bSnap = await transaction.get(balanceRef);
      if (bSnap.exists()) balanceData = bSnap.data();
    } else {
      const bSnap = await getDoc(balanceRef);
      if (bSnap.exists()) balanceData = bSnap.data();
    }

    if (balanceData && balanceData.balances) {
      const balances = [...balanceData.balances];
      const idx = balances.findIndex((b) => b.leaveCode === leaveCode);
      let balanceBefore = 0;
      let balanceAfter = 0;

      if (idx !== -1) {
        balanceBefore = balances[idx].availableBalance || 0;
        balances[idx].used = (balances[idx].used || 0) + daysCount;
        balances[idx].availableBalance = (balances[idx].allocated || 0) + (balances[idx].accrued || 0) + (balances[idx].carriedOver || 0) - balances[idx].used - (balances[idx].pending || 0);
        balanceAfter = balances[idx].availableBalance;
      }
      await this.performWrite(balanceRef, { balances, updatedAt: now }, transaction, 'SET');

      // Create Ledger Entry
      const ledgerRef = doc(collection(db, 'companies', instance.companyId, 'leaveLedger'));
      const ledgerEntry = {
        id: ledgerRef.id,
        companyId: instance.companyId,
        employeeId: employeeId,
        employeeName: reqData.employeeName || '',
        leaveCode: leaveCode,
        year: year,
        transactionType: 'LEAVE_DEBIT',
        transactionDate: now,
        creditDays: 0,
        debitDays: daysCount,
        balanceBefore: balanceBefore,
        balanceAfter: balanceAfter,
        reason: reqData.reason || 'Leave Approved',
        referenceId: instance.sourceRecordId,
        createdBy: reviewerId,
        createdAt: now
      };
      await this.performWrite(ledgerRef, ledgerEntry, transaction, 'SET');
    }
  }

  static async onWorkflowApproved`;

f1 = f1.replace('static async onWorkflowApproved', newLeaveMethod);

f1 = f1.replace(/case 'LEAVE':\s+await this\.performWrite[^;]+;\s+break;/g, `case 'LEAVE':
        await this.handleLeaveApproval(instance, reviewerId, transaction);
        break;`);

fs.writeFileSync('src/services/bpmIntegrationService.ts', f1);
