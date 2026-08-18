const fs = require('fs');
let code = fs.readFileSync('src/services/scmService.ts', 'utf8');

// Also support IN_TRANSIT on gate verification if it's a Transfer Order
code = code.replace(
  `    const updates: Partial<GatePassRecord> = {
      verifiedAt: new Date().toISOString(),
      verifiedByUid: session.userId,
      verifiedByName: session.fullName,
      status: 'GATE_VERIFIED'
    };

    if (pass.passType === 'NON_RETURNABLE' || pass.passType === 'OUTWARD') {
      updates.status = 'CLOSED';
      updates.closedAt = new Date().toISOString();
    } else if (pass.passType === 'RETURNABLE') {
      updates.status = 'RETURN_PENDING';
    }`,
  `    const updates: Partial<GatePassRecord> = {
      verifiedAt: new Date().toISOString(),
      verifiedByUid: session.userId,
      verifiedByName: session.fullName,
      status: 'GATE_VERIFIED'
    };

    if (pass.transferOrderId) {
      // It remains GATE_VERIFIED or we can just say the pass is verified and transfer is IN_TRANSIT
      const trRef = doc(db, 'companies', companyId, 'transfer_orders', pass.transferOrderId);
      await updateDoc(trRef, { status: 'IN_TRANSIT', updatedAt: new Date().toISOString() });
      updates.status = 'CLOSED'; // Gate pass job is done since it left the gate
      updates.closedAt = new Date().toISOString();
    } else if (pass.passType === 'NON_RETURNABLE' || pass.passType === 'OUTWARD') {
      updates.status = 'CLOSED';
      updates.closedAt = new Date().toISOString();
    } else if (pass.passType === 'RETURNABLE') {
      updates.status = 'RETURN_PENDING';
    }`
);

fs.writeFileSync('src/services/scmService.ts', code);
