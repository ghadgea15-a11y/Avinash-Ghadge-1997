const fs = require('fs');
let file = fs.readFileSync('src/services/expenseService.ts', 'utf8');
const search = `        await BpmService.createInstance(companyId, {
          title: \`Expense Reimbursement: \${record.title} (₹\${record.totalAmount})\`,
          sourceModule: 'EXPENSE' as any,
          sourceRecordId: docRef.id,
          priority: record.totalAmount > 10000 ? 'HIGH' : 'MEDIUM',
          amount: record.totalAmount,
          currency: 'INR'
        }, actor);`;

const replace = `        await BpmService.submitForApproval(companyId, actor.userId || actor.uid || '', 'EXPENSE', docRef.id, 'EXPENSE_CLAIM', {
          title: \`Expense Reimbursement: \${record.title} (₹\${record.totalAmount})\`,
          amount: record.totalAmount,
          currency: 'INR',
          priority: record.totalAmount > 10000 ? 'HIGH' : 'MEDIUM'
        });`;

if (file.includes(search)) {
  file = file.replace(search, replace);
  fs.writeFileSync('src/services/expenseService.ts', file);
  console.log('Patched expenseService');
} else {
  console.log('Not found in expenseService');
}
