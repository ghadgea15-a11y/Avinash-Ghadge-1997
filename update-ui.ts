import * as fs from 'fs';

const file = 'src/components/screens/TalentAcquisitionScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add State
const stateInsert = `  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [conversionEligibility, setConversionEligibility] = useState<any>(null);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);`;
content = content.replace("  const [isConverting, setIsConverting] = useState<boolean>(false);", stateInsert);

// 2. Add handleCheckConversion function
const handleCheckCode = `
  const handleCheckConversion = async (candidate: CandidateRecord) => {
    if (!userSession) return;
    setIsConverting(true);
    try {
      const result = await TalentAcquisitionService.checkConversionEligibility(userSession, candidate.id);
      if (result.success) {
        setConversionEligibility(result);
        setIsChecklistModalOpen(true);
      } else {
        alert(result.error || 'Failed to check conversion eligibility');
      }
    } catch(err) {
      console.error(err);
    } finally {
      setIsConverting(false);
    }
  };
`;
content = content.replace('  const handle1ClickConvert = async (candidate: CandidateRecord) => {', handleCheckCode + '\n  const handle1ClickConvert = async (candidate: CandidateRecord) => {');

// 3. Update handle1ClickConvert
const oldHandle1Click = `const handle1ClickConvert = async (candidate: CandidateRecord) => {
    if (!activeCompany || !userSession) return;

    setIsConverting(true);
    try {
      const defaultSite = sites[0]?.id || 'SITE-001';
      const defaultDep = departments[0]?.id || 'DEP-SEC';
      const actor = { id: userSession.userId, name: userSession.fullName };

      const empId = await FirestoreService.convertCandidateToEmployee(activeCompany.companyId, candidate, {
        assignedSiteId: defaultSite,
        departmentId: defaultDep,
        assignedRegionId: sites.find(s => s.id === defaultSite)?.branchId || 'REG-001',
        assignedBranchId: sites.find(s => s.id === defaultSite)?.branchId || 'BR-001',
        designation: candidate.jobTitleAppliedFor,
        joinedDate: new Date().toISOString().split('T')[0],
        employmentType: 'PERMANENT',
        role: 'GUARD',
        assignedAreaId: 'AREA-001',
      }, actor);

      if (empId) {
        setConversionSuccessMsg(\`Successfully converted \${candidate.fullName} into Employee Master record!\`);
        setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, stage: 'CONVERTED_TO_EMPLOYEE', convertedToEmployeeId: empId } : c));
        if (selectedCandidate?.id === candidate.id) {
          setSelectedCandidate(prev => prev ? { ...prev, stage: 'CONVERTED_TO_EMPLOYEE', convertedToEmployeeId: empId } : null);
        }
      }
    } catch (err) {
      console.error('Conversion failed:', err);
    } finally {
      setIsConverting(false);
    }
  };`;

const newHandle1Click = `const handle1ClickConvert = async (candidate: CandidateRecord) => {
    if (!activeCompany || !userSession) return;

    setIsConverting(true);
    try {
      const defaultSite = sites[0]?.id || 'SITE-001';
      const defaultDep = departments[0]?.id || 'DEP-SEC';
      
      const result = await TalentAcquisitionService.convertCandidateToEmployeeAtomic(userSession, candidate.id, {
        assignedSiteId: defaultSite,
        departmentId: defaultDep,
        assignedRegionId: sites.find(s => s.id === defaultSite)?.branchId || 'REG-001',
        assignedBranchId: sites.find(s => s.id === defaultSite)?.branchId || 'BR-001',
        designation: candidate.jobTitleAppliedFor,
        joinedDate: new Date().toISOString().split('T')[0],
        employmentType: 'PERMANENT',
        role: 'GUARD',
        assignedAreaId: 'AREA-001',
      });

      if (result.success && result.employeeId) {
        setIsChecklistModalOpen(false);
        setConversionSuccessMsg(\`Successfully converted \${candidate.fullName} into Employee Master record!\`);
        setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, stage: 'CONVERTED_TO_EMPLOYEE', convertedToEmployeeId: result.employeeId! } : c));
        if (selectedCandidate?.id === candidate.id) {
          setSelectedCandidate(prev => prev ? { ...prev, stage: 'CONVERTED_TO_EMPLOYEE', convertedToEmployeeId: result.employeeId! } : null);
        }
      } else {
        alert(result.error || 'Conversion failed.');
      }
    } catch (err: any) {
      console.error('Conversion failed:', err);
      alert(err.message || 'Error converting candidate.');
    } finally {
      setIsConverting(false);
    }
  };`;

// Using regex or exact match depending on exact code spacing:
content = content.replace(/const handle1ClickConvert = async \(candidate: CandidateRecord\) => {[\s\S]*?setIsConverting\(false\);\s*\}\s*};/, newHandle1Click);

// 4. Update the Convert button onClick
content = content.replace(/onClick=\{\(\) => handle1ClickConvert\(selectedCandidate\)\}/g, 'onClick={() => handleCheckConversion(selectedCandidate)}');
content = content.replace(/onClick=\{\(\) => handle1ClickConvert\(c\)\}/g, 'onClick={() => handleCheckConversion(c)}');


// 5. Add Checklist Modal UI
const modalUI = `
      {/* CONVERSION CHECKLIST MODAL */}
      {isChecklistModalOpen && selectedCandidate && conversionEligibility && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-zinc-900 dark:text-white">Conversion Readiness Checklist</h3>
              <button onClick={() => setIsChecklistModalOpen(false)} className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    {conversionEligibility.checklist.atsSelection ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-rose-500" />}
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">ATS Selection Decision</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    {conversionEligibility.checklist.backgroundVerification ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-rose-500" />}
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Background Verification Cleared</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    {conversionEligibility.checklist.aadhaarVerification ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-rose-500" />}
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Aadhaar KYC Verified</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    {conversionEligibility.checklist.policeVerification ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-rose-500" />}
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Police Clearance Verified</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    {conversionEligibility.checklist.documents ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-rose-500" />}
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Mandatory Documents Uploaded</span>
                  </div>
                </div>
              </div>

              {!conversionEligibility.isEligible && (
                <div className="p-3 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 rounded-xl border border-rose-200 dark:border-rose-900/50 text-xs">
                  Candidate does not meet all mandatory conditions for conversion. Please complete missing verifications or documents.
                </div>
              )}
            </div>
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
              <button onClick={() => setIsChecklistModalOpen(false)} className="px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-sm font-bold transition">Cancel</button>
              <button 
                disabled={!conversionEligibility.isEligible || isConverting}
                onClick={() => handle1ClickConvert(selectedCandidate)} 
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-sm transition">
                {isConverting ? 'Processing...' : 'Confirm & Convert'}
              </button>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace('{/* CONVERSION SUCCESS MODAL */}', modalUI + '\n      {/* CONVERSION SUCCESS MODAL */}');

fs.writeFileSync(file, content);
