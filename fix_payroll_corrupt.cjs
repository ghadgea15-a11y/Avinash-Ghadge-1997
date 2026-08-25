const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

const badStr = `    } catch (err: any) {
      console.error('[FirestoreService] updatePayrollCycleStatus error:', err);
      handleFirestoreError(err, OperationType.UPDATE, \`companies/\${companyId}/payroll/\${cycleId}\`);
      return false;
    }
  }\`);
      return false;
    }`;

const goodStr = `    } catch (err: any) {
      console.error('[FirestoreService] updatePayrollCycleStatus error:', err);
      handleFirestoreError(err, OperationType.UPDATE, \`companies/\${companyId}/payroll/\${cycleId}\`);
      return false;
    }
  }`;

code = code.replace(badStr, goodStr);
fs.writeFileSync('src/services/firestoreService.ts', code);
