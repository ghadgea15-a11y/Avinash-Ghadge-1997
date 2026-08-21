  // --- OFFER MANAGEMENT ---
  
  static async prepareOffer(
    session: UserSession,
    companyId: string,
    candidateId: string,
    requisitionId: string,
    offerDetails: {
      offeredDesignation: string;
      offeredSalaryMonthly: number;
      currency: string;
      joiningDate: string;
      benefits?: string[];
    }
  ): Promise<{ success: boolean; error?: string; offerId?: string }> {
    try {
      if (!session.roles.some(r => ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'HR'].includes(r))) {
        return { success: false, error: 'Unauthorized to prepare offer.' };
      }

      const candidateSnap = await getDoc(doc(db, 'companies', companyId, 'candidates', candidateId));
      if (!candidateSnap.exists()) return { success: false, error: 'Candidate not found.' };

      // Generate Offer Record
      const offerId = `OFF-${Date.now()}`;
      const offerRecord: any = {
        id: offerId,
        companyId,
        candidateId,
        requisitionId,
        offerCode: offerId,
        ...offerDetails,
        status: 'DRAFT',
        preparedBy: session.userId,
        preparedAt: new Date().toISOString()
      };

      const offerRef = doc(db, 'companies', companyId, 'offers', offerId);
      await setDoc(offerRef, offerRecord);

      // Advance Status
      await this.updateCandidateStatus(
        session, companyId, candidateId, 'OFFER_PREPARATION', 'Offer drafting initiated'
      );

      // Audit Log
      await AuditTrailService.logAction(
        session, 'TALENT_ACQUISITION', 'OFFER_PREPARED', 'OFFER', offerId, true, 'HIGH',
        `Offer prepared for candidate ${candidateId}`, { candidateId }
      );

      return { success: true, offerId };
    } catch (err: any) {
      console.error('Error preparing offer:', err);
      return { success: false, error: err.message };
    }
  }

