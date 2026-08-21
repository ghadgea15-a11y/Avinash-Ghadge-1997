const fs = require('fs');
const file = 'src/components/screens/TalentAcquisitionScreen.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add Police Workflow states and handlers
const newWorkflowHandlers = `
  const handleInitiatePoliceWorkflow = async (candidate: CandidateRecord) => {
    setSelectedCandidate(candidate);
    
    // Instead of a modal, directly request it, as it is an async process often manual
    if (!userSession) return;
    
    try {
      const result = await TalentAcquisitionService.requestPoliceVerification(userSession, candidate.id);
      if (result.success) {
        alert(result.message);
      } else {
        alert(result.message);
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred while requesting Police Verification');
    }
  };

  const handleInitiateAadhaarWorkflow = (candidate: CandidateRecord) => {`;

code = code.replace("  const handleInitiateAadhaarWorkflow = (candidate: CandidateRecord) => {", newWorkflowHandlers);

const uiToReplace = `                        <select
                          value={selectedCandidate.policeVerificationStatus}
                          onChange={(e) => handleUpdateVerification(selectedCandidate, 'police', e.target.value as VerificationStatus)}
                          className="text-xs p-1 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="VERIFIED">Verified</option>
                          <option value="FAILED">Failed</option>
                        </select>`;

const newUi = `                        <div className="flex flex-col gap-1 items-end">
                           <span className={\`text-[10px] font-bold px-2 py-0.5 rounded uppercase \${
                             selectedCandidate.policeVerificationStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' :
                             selectedCandidate.policeVerificationStatus === 'FAILED' ? 'bg-rose-100 text-rose-700' :
                             'bg-amber-100 text-amber-700'
                           }\`}>
                             {selectedCandidate.policeVerificationStatus}
                           </span>
                           {selectedCandidate.policeVerificationStatus === 'PENDING' && (
                             <button
                               onClick={() => handleInitiatePoliceWorkflow(selectedCandidate)}
                               className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                             >
                               Request PV
                             </button>
                           )}
                        </div>`;

code = code.replace(uiToReplace, newUi);

fs.writeFileSync(file, code);
