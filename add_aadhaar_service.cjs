const fs = require('fs');
const file = 'src/services/talentAcquisitionService.ts';
let code = fs.readFileSync(file, 'utf8');

const serviceMethod = `
  public static async processAadhaarVerification(
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

      // Ensure Aadhaar number exists
      if (!candidateData.aadhaarNumber) {
        return { success: false, status: 'FAILED', message: 'Aadhaar number not provided by candidate' };
      }

      // Check existing verification records to prevent duplicates
      const verificationsRef = collection(db, \`companies/\${session.companyId}/backgroundVerifications\`);
      const q = query(
        verificationsRef, 
        where('candidateId', '==', candidateId), 
        where('type', '==', 'AADHAAR')
      );
      
      const verificationsSnap = await getDocs(q);
      const activeVerifications = verificationsSnap.docs.filter(d => 
        d.data().status !== 'FAILED' && d.data().status !== 'CLOSED' && d.data().result !== 'FAILED'
      );

      if (activeVerifications.length > 0) {
        const active = activeVerifications[0].data();
        if (active.status === 'CLEARED' || active.result === 'CLEARED') {
           // It's already cleared
           return { success: true, status: 'VERIFIED', message: 'Candidate already has a verified Aadhaar record' };
        } else {
           // It's in progress
           return { success: true, status: 'PENDING', message: 'An Aadhaar verification is already in progress' };
        }
      }

      // 1. Record Consent
      const verificationId = uuidv4();
      const code = \`AADHAAR-\${new Date().getFullYear()}-\${Math.floor(1000 + Math.random() * 9000)}\`;
      
      const newRecord = {
        id: verificationId,
        companyId: session.companyId,
        candidateId,
        selectionId: 'DIRECT',
        requisitionId: candidateData.requisitionId || 'UNKNOWN',
        verificationCode: code,
        type: 'AADHAAR',
        consentStatus: 'GRANTED',
        consentTimestamp: new Date().toISOString(),
        verificationMethod: 'OFFLINE_KYC_OR_API',
        requestDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'REQUESTED',
        result: 'PENDING',
        notes: 'Aadhaar consent obtained digitally. Auth provider pending.',
        evidenceReferences: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, \`companies/\${session.companyId}/backgroundVerifications/\${verificationId}\`), newRecord);

      // Audit Log for consent
      await AuditService.logEvent(session, {
        action: 'UPDATE',
        module: 'TALENT',
        targetId: candidateId,
        description: \`Aadhaar verification consent recorded and workflow initiated for \${candidateData.fullName}\`,
        previousState: null,
        newState: { consent: 'GRANTED', verificationId }
      });

      // 2. Integration Boundary (Provider not configured as per constraints)
      // We will set it to PENDING per rules: "If no authorized provider exists: Keep status Pending - Provide a safe integration boundary"
      
      await updateDoc(candidateRef, {
        aadhaarVerificationStatus: 'PENDING',
        updatedAt: new Date().toISOString()
      });

      return { 
        success: true, 
        status: 'PENDING', 
        message: 'PENDING — AUTHORIZED VERIFICATION PROVIDER NOT CONFIGURED' 
      };

    } catch (err) {
      console.error('[TalentAcquisitionService] processAadhaarVerification error:', err);
      throw err;
    }
  }

  public static async updateCandidateStage(`;

code = code.replace("  public static async updateCandidateStage(", serviceMethod);

fs.writeFileSync(file, code);
