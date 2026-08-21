const fs = require('fs');
const file = 'src/services/talentAcquisitionService.ts';
let code = fs.readFileSync(file, 'utf8');

const serviceMethod = `
  public static async requestPoliceVerification(
    session: UserSession,
    candidateId: string
  ): Promise<{ success: boolean; status: VerificationStatus; message: string }> {
    try {
      const candidateRef = doc(db, \`companies/\${session.companyId}/candidates/\${candidateId}\`);
      const candidateSnap = await getDoc(candidateRef);

      if (!candidateSnap.exists()) {
        throw new Error('Candidate not found');
      }

      const candidateData = candidateSnap.data();

      // Check existing verification records to prevent duplicates
      const verificationsRef = collection(db, \`companies/\${session.companyId}/backgroundVerifications\`);
      const q = query(
        verificationsRef, 
        where('candidateId', '==', candidateId), 
        where('type', '==', 'POLICE')
      );
      
      const verificationsSnap = await getDocs(q);
      const activeVerifications = verificationsSnap.docs.filter(d => 
        d.data().status !== 'FAILED' && d.data().status !== 'CLOSED' && d.data().result !== 'FAILED'
      );

      if (activeVerifications.length > 0) {
        const active = activeVerifications[0].data();
        if (active.status === 'CLEARED' || active.result === 'CLEARED') {
           return { success: true, status: 'VERIFIED', message: 'Candidate already has a cleared Police Verification record' };
        } else {
           return { success: true, status: 'PENDING', message: 'A Police verification is already in progress' };
        }
      }

      const verificationId = \`BGV-\${Date.now()}-\${Math.random().toString(36).substring(2,8).toUpperCase()}\`;
      const code = \`POLICE-\${new Date().getFullYear()}-\${Math.floor(1000 + Math.random() * 9000)}\`;
      
      const newRecord = {
        id: verificationId,
        companyId: session.companyId,
        candidateId,
        selectionId: 'DIRECT',
        requisitionId: candidateData.requisitionId || 'UNKNOWN',
        verificationCode: code,
        type: 'POLICE',
        verificationMethod: 'MANUAL_SUBMISSION',
        requestDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'REQUESTED',
        result: 'PENDING',
        notes: 'Police Verification requested. Waiting for submission.',
        evidenceReferences: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, \`companies/\${session.companyId}/backgroundVerifications/\${verificationId}\`), newRecord);

      await AuditTrailService.logAction(
        session,
        'TALENT_ACQUISITION',
        'UPDATE',
        'CANDIDATE_RECORD',
        candidateId,
        true,
        'MEDIUM',
        \`Police verification requested and workflow initiated for \${candidateData.fullName}\`,
        { verificationId }
      );
      
      await updateDoc(candidateRef, {
        policeVerificationStatus: 'PENDING',
        updatedAt: new Date().toISOString()
      });

      return { 
        success: true, 
        status: 'PENDING', 
        message: 'Police Verification Request initiated successfully' 
      };

    } catch (err) {
      console.error('[TalentAcquisitionService] requestPoliceVerification error:', err);
      throw err;
    }
  }

  public static async processAadhaarVerification(`;

code = code.replace("  public static async processAadhaarVerification(", serviceMethod);

fs.writeFileSync(file, code);
