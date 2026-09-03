const fs = require('fs');
let file = fs.readFileSync('src/services/pmsService.ts', 'utf8');

file = file.replace(/const bpmInst = await BpmService\.createInstance\(companyId, \{(.*?)\}\);/gs,
  (match, inner) => {
    return `const bpmInst = await BpmService.submitForApproval(companyId, actor.uid, 'APPRAISAL', reviewId, 'APPRAISAL_RATING_FINALIZATION', { ${inner} });`;
  });

// Or simpler find replace for that exact block:
const search = `        const bpmInst = await BpmService.createInstance(companyId, {
          workflowId: 'WF-APPRAISAL-SIGN-OFF',
          sourceModule: 'APPRAISAL',
          transactionType: 'APPRAISAL_RATING_FINALIZATION',
          sourceRecordId: reviewId,
          requesterId: actor.uid,
          amount: 0,
          currency: 'INR'
        });`;

const replace = `        const bpmInst = await BpmService.submitForApproval(
          companyId, 
          actor.uid, 
          'APPRAISAL', 
          reviewId, 
          'APPRAISAL_RATING_FINALIZATION', 
          {}
        );`;

if (file.includes(search)) {
  file = file.replace(search, replace);
  fs.writeFileSync('src/services/pmsService.ts', file);
  console.log('Patched pms2');
} else {
  console.log('Not found in pms2');
}
