  /**
   * Synchronizes candidate ATS stage based on background verifications and documents.
   * To be called after a verification status updates.
   */
  public static async syncCandidateVerificationStatus(
    session: UserSession,
    candidateId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { companyId } = session;
    try {
      const candSnap = await getDoc(doc(db, 'companies', companyId, 'candidates', candidateId));
      if (!candSnap.exists()) return { success: false, error: 'Candidate not found.' };
      const candidate = candSnap.data() as CandidateRecord;

      // 1. Fetch all Background Verifications
      const bgQuery = query(
        collection(db, 'companies', companyId, 'backgroundVerifications'),
        where('candidateId', '==', candidateId)
      );
      const bgSnap = await getDocs(bgQuery);
      const verifications = bgSnap.docs.map(d => d.data() as BackgroundVerificationRecord);

      // 2. Fetch all Candidate Documents
      const docQuery = query(
        collection(db, 'companies', companyId, 'candidateDocuments'),
        where('candidateId', '==', candidateId)
      );
      const docSnap = await getDocs(docQuery);
      const documents = docSnap.docs.map(d => d.data() as CandidateDocumentRecord);

      // Evaluate logic
      const hasFailedBg = verifications.some(v => v.result === 'FAILED');
      const hasRejectedDoc = documents.some(d => d.status === 'REJECTED');
      const hasPendingBg = verifications.some(v => v.result === 'PENDING' || v.result === 'CLARIFICATION_REQUIRED');
      const hasPendingDoc = documents.some(d => d.status === 'PENDING' || d.status === 'UNDER_REVIEW');

      if (hasFailedBg || hasRejectedDoc) {
        // Move to VERIFICATION_FAILED
        if (candidate.stage !== 'VERIFICATION_FAILED') {
          await this.updateCandidateStatus(session, candidateId, 'VERIFICATION_FAILED', 'One or more verifications/documents failed.');
        }
      } else if (!hasPendingBg && !hasPendingDoc && verifications.length > 0) {
        // All CLEARED and VERIFIED
        if (candidate.stage !== 'READY_FOR_ONBOARDING') {
          await this.updateCandidateStatus(session, candidateId, 'READY_FOR_ONBOARDING', 'All verifications cleared successfully.');
        }
      }

      return { success: true };
    } catch (err: any) {
      console.error('[TalentAcquisitionService] syncCandidateVerificationStatus failure:', err);
      return { success: false, error: err.message };
    }
  }
