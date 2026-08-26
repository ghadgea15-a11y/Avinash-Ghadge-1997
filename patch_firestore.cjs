const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

code = code.replace(
/static async approveTransfer\([\s\S]*?\} catch \(err\) \{[\s\S]*?return false;\s*\}/m,
`static async approveTransfer(
    companyId: string,
    requestId: string,
    actor: { id: string, name: string }
  ): Promise<boolean> {
    try {
      const xferRef = doc(db, 'companies', companyId, 'transfers', requestId);
      const now = new Date().toISOString();
      const eventId = \`EVT-\${Date.now()}-\${Math.random().toString(36).substring(2, 6)}\`;
      let employeeId = '';
      
      await runTransaction(db, async (t) => {
        const xferSnap = await t.get(xferRef);
        if (!xferSnap.exists()) throw new Error('Transfer not found');
        const xfer = xferSnap.data() as TransferRequest;
        
        if (xfer.status !== 'PENDING' && xfer.status !== 'TRANSFER_PENDING') {
          throw new Error('Transfer is not pending approval');
        }
        
        employeeId = xfer.employeeId;
        const empRef = doc(db, 'companies', companyId, 'employees', employeeId);
        const eventRef = doc(db, 'companies', companyId, 'employees', employeeId, 'lifecycleEvents', eventId);
        
        t.set(empRef, {
          assignedSiteId: xfer.newSiteId,
          assignedBranchId: xfer.newBranchId,
          assignedRegionId: xfer.newRegionId,
          lifecycleStatus: 'ACTIVE',
          updatedAt: now,
          updatedBy: actor.id
        }, { merge: true });

        t.set(xferRef, {
          status: 'APPROVED',
          approvedBy: actor.id,
          updatedAt: now
        }, { merge: true });

        t.set(eventRef, {
          id: eventId,
          type: 'TRANSFER',
          fromStatus: 'TRANSFER_PENDING',
          toStatus: 'ACTIVE',
          effectiveDate: xfer.effectiveDate,
          reason: 'Transfer Approved',
          initiatedBy: xfer.initiatedBy,
          approvedBy: actor.id,
          timestamp: now,
          details: { requestId, transferData: xfer }
        });
      });
      
      if (employeeId) {
        await this.logAuditEvent(companyId, actor.id, actor.name, 'EMPLOYEE_LIFECYCLE_EVENT', \`Recorded TRANSFER event for employee \${employeeId}: Transfer Approved\`, employeeId);
      }
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, \`approve transfer \${requestId}\`);
      return false;
    }`
);

code = code.replace(
/static async approvePromotion\([\s\S]*?\} catch \(err\) \{[\s\S]*?return false;\s*\}/m,
`static async approvePromotion(
    companyId: string,
    requestId: string,
    actor: { id: string, name: string }
  ): Promise<boolean> {
    try {
      const promoRef = doc(db, 'companies', companyId, 'promotions', requestId);
      const now = new Date().toISOString();
      const eventId = \`EVT-\${Date.now()}-\${Math.random().toString(36).substring(2, 6)}\`;
      let employeeId = '';
      
      await runTransaction(db, async (t) => {
        const promoSnap = await t.get(promoRef);
        if (!promoSnap.exists()) throw new Error('Promotion not found');
        const promo = promoSnap.data() as PromotionRequest;
        
        if (promo.status !== 'PENDING' && promo.status !== 'PROMOTION_PENDING') {
          throw new Error('Promotion is not pending approval');
        }
        
        employeeId = promo.employeeId;
        const empRef = doc(db, 'companies', companyId, 'employees', employeeId);
        const eventRef = doc(db, 'companies', companyId, 'employees', employeeId, 'lifecycleEvents', eventId);
        
        t.set(empRef, {
          designation: promo.newDesignation,
          departmentId: promo.newDepartmentId,
          reportingManagerId: promo.newManagerId || promo.previousManagerId,
          lifecycleStatus: 'ACTIVE',
          updatedAt: now,
          updatedBy: actor.id
        }, { merge: true });

        t.set(promoRef, {
          status: 'APPROVED',
          approvedBy: actor.id,
          updatedAt: now
        }, { merge: true });

        t.set(eventRef, {
          id: eventId,
          type: 'PROMOTION',
          fromStatus: 'PROMOTION_PENDING',
          toStatus: 'ACTIVE',
          effectiveDate: promo.effectiveDate,
          reason: 'Promotion Approved',
          initiatedBy: promo.initiatedBy,
          approvedBy: actor.id,
          timestamp: now,
          details: { requestId, promoData: promo }
        });
      });
      
      if (employeeId) {
        await this.logAuditEvent(companyId, actor.id, actor.name, 'EMPLOYEE_LIFECYCLE_EVENT', \`Recorded PROMOTION event for employee \${employeeId}: Promotion Approved\`, employeeId);
      }
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, \`approve promotion \${requestId}\`);
      return false;
    }`
);

fs.writeFileSync('src/services/firestoreService.ts', code);
console.log('Patched correctly');
