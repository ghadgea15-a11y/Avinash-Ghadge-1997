const fs = require('fs');
const file = 'src/services/talentAcquisitionService.ts';
let code = fs.readFileSync(file, 'utf8');

const updatedLogic = `      if (updates.result === 'CLEARED' || updates.result === 'FAILED') {
        const notification: any = {
          id: \`NOTIF-BGV-\${Date.now()}\`,
          title: \`Verification \${updates.result}: \${current.verificationCode}\`,
          message: \`The \${current.type} check for candidate ID \${current.candidateId} has \${updates.result.toLowerCase()}.\`,
          type: updates.result === 'FAILED' ? 'ERROR' : 'SUCCESS',
          roleScope: ['HR', 'COMPANY_ADMIN'],
          timestamp: new Date().toISOString(),
          isRead: false,
          metadata: { verificationId, candidateId: current.candidateId }
        };
        await FirestoreService.createNotification(companyId, notification);
      }

      // Sync Police or Aadhaar verification status to Candidate
      if (current.type === 'POLICE' || current.type === 'AADHAAR') {
        const candidateRef = doc(db, 'companies', companyId, 'candidates', current.candidateId);
        if (current.type === 'POLICE') {
          await updateDoc(candidateRef, {
            policeVerificationStatus: updates.result === 'CLEARED' ? 'VERIFIED' : updates.result === 'FAILED' ? 'FAILED' : 'PENDING'
          });
        }
        if (current.type === 'AADHAAR') {
          await updateDoc(candidateRef, {
            aadhaarVerificationStatus: updates.result === 'CLEARED' ? 'VERIFIED' : updates.result === 'FAILED' ? 'FAILED' : 'PENDING'
          });
        }
      }

      return { success: true };`;

const regex = /      if \(updates\.result === 'CLEARED' \|\| updates\.result === 'FAILED'\) \{[\s\S]*?return \{ success: true \};/m;
code = code.replace(regex, updatedLogic);

fs.writeFileSync(file, code);
