const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

code = code.replace(
/static async initiateExit\([\s\S]*?\} catch \(err\) \{[\s\S]*?return null;\s*\}/m,
`static async initiateExit(
    companyId: string,
    request: Omit<ExitRequest, 'id' | 'status' | 'createdAt'>,
    actor: { id: string, name: string }
  ): Promise<string | null> {
    try {
      const requestId = \`EXIT-\${Date.now()}-\${Math.random().toString(36).substring(2, 6)}\`;
      const exitRef = doc(db, 'companies', companyId, 'exits', requestId);
      const empRef = doc(db, 'companies', companyId, 'employees', request.employeeId);
      const now = new Date().toISOString();
      const eventId = \`EVT-\${Date.now()}-\${Math.random().toString(36).substring(2, 6)}\`;
      const eventRef = doc(db, 'companies', companyId, 'employees', request.employeeId, 'lifecycleEvents', eventId);

      await runTransaction(db, async (t) => {
        t.set(exitRef, {
          ...request,
          id: requestId,
          status: 'PENDING',
          createdAt: now
        });
        
        t.set(empRef, {
          lifecycleStatus: 'EXIT_INITIATED'
        }, { merge: true });

        t.set(eventRef, {
          id: eventId,
          type: 'EXIT',
          toStatus: 'EXIT_INITIATED',
          effectiveDate: request.lastWorkingDay,
          reason: request.reason,
          initiatedBy: actor.id,
          timestamp: now,
          details: { requestId, exitType: request.exitType }
        });
      });

      await this.logAuditEvent(
        companyId,
        actor.id,
        actor.name,
        'EMPLOYEE_LIFECYCLE_EVENT',
        \`Recorded EXIT event for employee \${request.employeeId}: \${request.reason || 'No reason provided'}\`,
        request.employeeId
      );

      return requestId;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, \`exit request \${request.employeeId}\`);
      return null;
    }`
);

code = code.replace(
/static async approveExit\([\s\S]*?\} catch \(err\) \{[\s\S]*?return false;\s*\}/m,
`static async approveExit(
    companyId: string,
    requestId: string,
    actor: { id: string, name: string }
  ): Promise<boolean> {
    try {
      const exitRef = doc(db, 'companies', companyId, 'exits', requestId);
      const now = new Date().toISOString();
      const eventId = \`EVT-\${Date.now()}-\${Math.random().toString(36).substring(2, 6)}\`;
      let employeeId = '';

      await runTransaction(db, async (t) => {
        const exitSnap = await t.get(exitRef);
        if (!exitSnap.exists()) throw new Error('Exit not found');
        const exit = exitSnap.data() as ExitRequest;
        
        if (exit.status !== 'PENDING' && exit.status !== 'EXIT_PENDING') {
          throw new Error('Exit is not pending approval');
        }
        
        employeeId = exit.employeeId;
        const empRef = doc(db, 'companies', companyId, 'employees', employeeId);
        const eventRef = doc(db, 'companies', companyId, 'employees', employeeId, 'lifecycleEvents', eventId);

        t.set(empRef, {
          lifecycleStatus: 'EXITED',
          status: 'DEACTIVATED',
          updatedAt: now,
          updatedBy: actor.id
        }, { merge: true });

        t.set(exitRef, {
          status: 'APPROVED',
          approvedBy: actor.id,
          updatedAt: now
        }, { merge: true });

        t.set(eventRef, {
          id: eventId,
          type: 'EXIT',
          fromStatus: 'EXIT_INITIATED',
          toStatus: 'EXITED',
          effectiveDate: exit.lastWorkingDay,
          reason: 'Exit Approved',
          initiatedBy: exit.initiatedBy,
          approvedBy: actor.id,
          timestamp: now,
          details: { requestId, exitData: exit }
        });
      });

      if (employeeId) {
        await this.logAuditEvent(companyId, actor.id, actor.name, 'EMPLOYEE_LIFECYCLE_EVENT', \`Recorded EXIT event for employee \${employeeId}: Exit Approved\`, employeeId);
      }
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, \`approve exit \${requestId}\`);
      return false;
    }`
);

fs.writeFileSync('src/services/firestoreService.ts', code);
console.log('Exits Patched correctly');
