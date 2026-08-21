import * as fs from 'fs';

const file = 'src/services/talentAcquisitionService.ts';
const content = fs.readFileSync(file, 'utf8');

const insertPos = content.lastIndexOf('}');
if (insertPos === -1) throw new Error('Could not find end of class');

const newMethods = `

  public static async checkConversionEligibility(session: UserSession, candidateId: string) {
    try {
      const companyId = session.companyId;
      const candSnap = await getDoc(doc(db, 'companies', companyId, 'candidates', candidateId));
      if (!candSnap.exists()) return { success: false, error: 'Candidate not found' };
      const candidate = candSnap.data() as CandidateRecord;

      if (candidate.stage === 'CONVERTED_TO_EMPLOYEE' || candidate.convertedToEmployeeId) {
        return { success: false, error: 'Candidate is already converted to an employee.' };
      }

      const hasSelectedStage = candidate.statusHistory?.some(h => h.stage === 'SELECTED') || candidate.stage === 'READY_FOR_ONBOARDING' || candidate.stage === 'DOCUMENT_VERIFICATION' || candidate.stage === 'BACKGROUND_VERIFICATION';

      const bgQuery = query(collection(db, 'companies', companyId, 'backgroundVerifications'), where('candidateId', '==', candidateId));
      const bgSnap = await getDocs(bgQuery);
      const bgVerifications = bgSnap.docs.map(d => d.data() as BackgroundVerificationRecord);
      const bgCompleted = bgVerifications.length > 0 && !bgVerifications.some(v => v.result !== 'CLEARED');

      const aadhaarVerified = candidate.aadhaarVerificationStatus === 'VERIFIED';
      const policeVerified = candidate.policeVerificationStatus === 'VERIFIED';

      const docQuery = query(collection(db, 'companies', companyId, 'candidateDocuments'), where('candidateId', '==', candidateId));
      const docSnap = await getDocs(docQuery);
      const documents = docSnap.docs.map(d => d.data() as CandidateDocumentRecord);
      const requiredDocs = STANDARD_CANDIDATE_DOCUMENTS.filter(d => d.required);
      const uploadedDocTypes = documents.filter(d => d.status === 'VERIFIED').map(d => d.type);
      const docsAvailable = requiredDocs.every(req => uploadedDocTypes.includes(req.type));

      const infoAvailable = !!(candidate.jobTitleAppliedFor);

      const isEligible = hasSelectedStage && bgCompleted && aadhaarVerified && policeVerified && docsAvailable && infoAvailable;

      return {
        success: true,
        isEligible,
        checklist: {
          atsSelection: !!hasSelectedStage,
          backgroundVerification: bgCompleted,
          aadhaarVerification: aadhaarVerified,
          policeVerification: policeVerified,
          documents: docsAvailable,
          infoReady: infoAvailable
        }
      };

    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public static async convertCandidateToEmployeeAtomic(
    session: UserSession,
    candidateId: string,
    employeeData: Partial<EmployeeRecord>
  ): Promise<{ success: boolean; employeeId?: string; error?: string }> {
    try {
      const companyId = session.companyId;
      const candidateRef = doc(db, 'companies', companyId, 'candidates', candidateId);
      
      const newEmployeeId = employeeData.id || \`EMP-\${Date.now()}\`;
      const employeeRef = doc(db, 'companies', companyId, 'employees', newEmployeeId);

      const result = await runTransaction(db, async (transaction) => {
        const candidateSnap = await transaction.get(candidateRef);
        if (!candidateSnap.exists()) throw new Error('Candidate not found');
        const candidate = candidateSnap.data() as CandidateRecord;

        if (candidate.stage === 'CONVERTED_TO_EMPLOYEE' || candidate.convertedToEmployeeId) {
          throw new Error('Candidate already converted.');
        }

        if (candidate.aadhaarVerificationStatus !== 'VERIFIED' || candidate.policeVerificationStatus !== 'VERIFIED') {
           throw new Error('Candidate does not meet mandatory verification requirements for conversion.');
        }

        const newEmployee: EmployeeRecord = {
          ...employeeData,
          id: newEmployeeId,
          employeeId: employeeData.employeeId || newEmployeeId,
          employeeCode: employeeData.employeeCode || newEmployeeId,
          companyId,
          firstName: candidate.fullName.split(' ')[0],
          lastName: candidate.fullName.split(' ').slice(1).join(' ') || ' ',
          email: candidate.email || '',
          contactNumber: candidate.phoneNumber,
          dateOfBirth: candidate.dateOfBirth,
          gender: candidate.gender,
          maskedAadhaar: candidate.aadhaarNumber ? \`XXXX-XXXX-\${candidate.aadhaarNumber.slice(-4)}\` : '',
          panNumber: candidate.panNumber || '',
          lifecycleStatus: 'ONBOARDING',
          status: 'PENDING_VERIFICATION',
          onboardingTasks: [],
          documents: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: session.userId,
          updatedBy: session.userId,
          assignedSiteId: employeeData.assignedSiteId || candidate.siteId || 'SITE-001',
          departmentId: employeeData.departmentId || 'DEP-001',
          assignedRegionId: employeeData.assignedRegionId || 'REG-001',
          assignedBranchId: employeeData.assignedBranchId || 'BR-001',
          designation: employeeData.designation || candidate.jobTitleAppliedFor,
          joinedDate: employeeData.joinedDate || new Date().toISOString().split('T')[0],
          employmentType: employeeData.employmentType || 'PERMANENT',
          role: employeeData.role || 'EMPLOYEE'
        } as EmployeeRecord;

        transaction.set(employeeRef, newEmployee);

        const newHistory = [...(candidate.statusHistory || []), {
          stage: 'CONVERTED_TO_EMPLOYEE' as CandidateStage,
          changedAt: new Date().toISOString(),
          changedBy: session.userId,
          notes: \`Converted to Employee \${newEmployee.employeeCode}\`
        }];

        transaction.update(candidateRef, {
          stage: 'CONVERTED_TO_EMPLOYEE',
          convertedToEmployeeId: newEmployeeId,
          updatedAt: new Date().toISOString(),
          statusHistory: newHistory
        });

        if (candidate.requisitionId) {
           const requisitionRef = doc(db, 'companies', companyId, 'jobRequisitions', candidate.requisitionId);
           const reqSnap = await transaction.get(requisitionRef);
           if (reqSnap.exists()) {
              const reqData = reqSnap.data();
              const newFilled = (reqData.filledPositions || 0) + 1;
              const newPipeline = Math.max(0, (reqData.pipelineCount || 0) - 1);
              const newStatus = (newFilled >= reqData.openPositions && reqData.status === 'OPEN') ? 'FILLED' : reqData.status;
              transaction.update(requisitionRef, {
                 filledPositions: newFilled,
                 pipelineCount: newPipeline,
                 status: newStatus,
                 updatedAt: new Date().toISOString()
              });
           }
        }
        
        return { employeeId: newEmployeeId, employeeCode: newEmployee.employeeCode, fullName: candidate.fullName };
      });

      await AuditTrailService.logAction(
        session,
        'TALENT_ACQUISITION',
        'CANDIDATE_CONVERTED',
        'EMPLOYEE',
        result.employeeId,
        true,
        'HIGH',
        \`Candidate \${result.fullName} converted to employee \${result.employeeCode}\`,
        { candidateId, employeeId: result.employeeId, applicationId: candidateId }
      );

      const notification: any = {
        id: \`NOTIF-CONV-\${Date.now()}\`,
        title: \`Employee Converted\`,
        message: \`\${result.fullName} has been converted to Employee (\${result.employeeCode}).\`,
        type: 'SUCCESS',
        roleScope: ['HR', 'COMPANY_ADMIN'],
        timestamp: new Date().toISOString(),
        isRead: false,
        metadata: { employeeId: result.employeeId, candidateId }
      };
      await FirestoreService.createNotification(companyId, notification);

      const docQuery = query(collection(db, 'companies', companyId, 'candidateDocuments'), where('candidateId', '==', candidateId));
      const docSnap = await getDocs(docQuery);
      
      if (!docSnap.empty) {
         const empDocs = docSnap.docs.map((d: any) => {
             const cDoc = d.data();
             return {
                 id: cDoc.id,
                 type: cDoc.type,
                 title: cDoc.type,
                 fileUrl: cDoc.fileUrl,
                 fileName: cDoc.fileName,
                 uploadDate: cDoc.uploadedAt,
                 status: cDoc.status === 'VERIFIED' ? 'VERIFIED' : 'PENDING'
             };
         });
         await updateDoc(employeeRef, {
             documents: empDocs
         });
      }

      return { success: true, employeeId: result.employeeId };
    } catch (err: any) {
      console.error('[TalentAcquisitionService] convertCandidateToEmployeeAtomic failure:', err);
      return { success: false, error: err.message };
    }
  }
`;

const updatedContent = content.slice(0, insertPos) + newMethods + content.slice(insertPos);
fs.writeFileSync(file, updatedContent);
