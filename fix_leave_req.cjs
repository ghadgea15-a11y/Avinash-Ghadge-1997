const fs = require('fs');

let f1 = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

f1 = f1.replace(/static async createLeaveRequest[\s\S]*?return true;\n  }/, (match) => {
    return `static async createLeaveRequest(companyId: string, data: any): Promise<boolean> {
    const ref = doc(collection(db, 'companies', companyId, 'leaveRequests'));
    const newReq = {
      ...data,
      id: ref.id,
      createdAt: new Date().toISOString(),
      status: 'PENDING_APPROVAL'
    };
    await setDoc(ref, newReq);
    
    // Trigger BPM Workflow
    try {
      const { BpmService } = await import('./bpmService');
      await BpmService.submitForApproval(
        companyId,
        data.employeeId,
        'LEAVE',
        ref.id,
        'LEAVE_REQUEST',
        newReq
      );
    } catch (e) {
      console.warn("BPM trigger failed for leave, falling back to PENDING", e);
      await updateDoc(ref, { status: 'PENDING' });
    }
    
    return true;
  }`;
});

fs.writeFileSync('src/services/firestoreService.ts', f1);
