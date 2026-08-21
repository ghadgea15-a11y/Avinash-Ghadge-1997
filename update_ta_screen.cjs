const fs = require('fs');
const file = 'src/components/screens/TalentAcquisitionScreen.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add states
code = code.replace(
  "const [isProcessVerificationModalOpen, setIsProcessVerificationModalOpen] = useState<boolean>(false);",
  "const [isProcessVerificationModalOpen, setIsProcessVerificationModalOpen] = useState<boolean>(false);\n  const [isAadhaarModalOpen, setIsAadhaarModalOpen] = useState<boolean>(false);\n  const [aadhaarState, setAadhaarState] = useState<'REQUEST_CONSENT' | 'AWAITING_CONSENT' | 'PROCESSING' | 'RESULT'>('REQUEST_CONSENT');\n  const [aadhaarResult, setAadhaarResult] = useState<any>(null);"
);

// Add workflow handler
code = code.replace(
  "const handleStartVerificationRequest = (candidate: CandidateRecord) => {",
  `const handleInitiateAadhaarWorkflow = (candidate: CandidateRecord) => {
    setSelectedCandidate(candidate);
    setAadhaarState('REQUEST_CONSENT');
    setAadhaarResult(null);
    setIsAadhaarModalOpen(true);
  };

  const handleProcessAadhaarConsent = async () => {
    if (!selectedCandidate) return;
    setAadhaarState('AWAITING_CONSENT');
    
    // Simulate candidate consent granted after 1s
    setTimeout(async () => {
      setAadhaarState('PROCESSING');
      
      try {
        const result = await TalentAcquisitionService.processAadhaarVerification(userSession, selectedCandidate.id);
        setAadhaarResult(result);
        setAadhaarState('RESULT');
        loadData(); // Refresh UI
      } catch (err) {
        console.error(err);
        setAadhaarResult({ success: false, message: 'Provider Not Configured or Error Occurred', status: 'PENDING' });
        setAadhaarState('RESULT');
      }
    }, 1500);
  };

  const handleStartVerificationRequest = (candidate: CandidateRecord) => {`
);

// Replace UI in Candidate Profile
const uiToReplace = `                        <select
                          value={selectedCandidate.aadhaarVerificationStatus}
                          onChange={(e) => handleUpdateVerification(selectedCandidate, 'aadhaar', e.target.value as VerificationStatus)}
                          className="text-xs p-1 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="VERIFIED">Verified</option>
                          <option value="FAILED">Failed</option>
                        </select>`;

const newUi = `                        <div className="flex flex-col gap-1 items-end">
                           <span className={\`text-[10px] font-bold px-2 py-0.5 rounded uppercase \${
                             selectedCandidate.aadhaarVerificationStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' :
                             selectedCandidate.aadhaarVerificationStatus === 'FAILED' ? 'bg-rose-100 text-rose-700' :
                             'bg-amber-100 text-amber-700'
                           }\`}>
                             {selectedCandidate.aadhaarVerificationStatus}
                           </span>
                           {selectedCandidate.aadhaarVerificationStatus === 'PENDING' && (
                             <button
                               onClick={() => handleInitiateAadhaarWorkflow(selectedCandidate)}
                               className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                             >
                               Initiate Auth
                             </button>
                           )}
                        </div>`;

code = code.replace(uiToReplace, newUi);

fs.writeFileSync(file, code);
