const fs = require('fs');
const file = 'src/components/screens/TalentAcquisitionScreen.tsx';
let code = fs.readFileSync(file, 'utf8');

const modalUI = `
      {/* Aadhaar Verification Workflow Modal */}
      {isAadhaarModalOpen && selectedCandidate && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className={\`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border flex flex-col \${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }\`}>
            <div className={\`p-6 border-b flex items-center justify-between \${isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-slate-50'}\`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl text-indigo-600">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Aadhaar KYC Auth</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{selectedCandidate.fullName}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsAadhaarModalOpen(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {aadhaarState === 'REQUEST_CONSENT' && (
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-2 text-indigo-500">
                    <UserCheck className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-lg">Candidate Consent Required</h4>
                  <p className="text-sm text-slate-500">
                    Per the UIDAI guidelines, candidate consent must be obtained and recorded before processing an Aadhaar verification request.
                  </p>
                  <p className="text-xs font-medium text-slate-500 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg border border-amber-100 dark:border-amber-800/30">
                    Warning: Verify physical identity proof if remote consent was provided.
                  </p>
                </div>
              )}

              {aadhaarState === 'AWAITING_CONSENT' && (
                <div className="flex flex-col items-center justify-center py-8">
                   <RefreshCw className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
                   <h4 className="font-bold">Awaiting Consent Validation...</h4>
                   <p className="text-xs text-slate-500 mt-2">Checking candidate confirmation</p>
                </div>
              )}

              {aadhaarState === 'PROCESSING' && (
                <div className="flex flex-col items-center justify-center py-8">
                   <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                   <h4 className="font-bold">Processing Verification...</h4>
                   <p className="text-xs text-slate-500 mt-2">Connecting to authorized provider</p>
                </div>
              )}

              {aadhaarState === 'RESULT' && aadhaarResult && (
                <div className="space-y-4 text-center py-4">
                  <div className={\`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 \${
                    aadhaarResult.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-600' : 
                    aadhaarResult.status === 'FAILED' ? 'bg-rose-100 text-rose-600' : 
                    'bg-amber-100 text-amber-600'
                  }\`}>
                    {aadhaarResult.status === 'VERIFIED' ? <ShieldCheck className="w-8 h-8" /> : 
                     aadhaarResult.status === 'FAILED' ? <X className="w-8 h-8" /> : 
                     <AlertCircle className="w-8 h-8" />}
                  </div>
                  <h4 className="font-bold text-lg">
                    {aadhaarResult.status === 'VERIFIED' ? 'Verification Successful' : 
                     aadhaarResult.status === 'FAILED' ? 'Verification Failed' : 
                     'Verification Pending'}
                  </h4>
                  <p className="text-sm text-slate-500">{aadhaarResult.message}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAadhaarModalOpen(false)}
                className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Close
              </button>
              {aadhaarState === 'REQUEST_CONSENT' && (
                <button
                  type="button"
                  onClick={handleProcessAadhaarConsent}
                  className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 transition flex items-center gap-2"
                >
                  Confirm & Request Auth
                </button>
              )}
            </div>
          </div>
        </div>
      )}
`;

code = code.replace("    </div>\n  );\n};\n\nexport default TalentAcquisitionScreen;", modalUI + "\n    </div>\n  );\n};\n\nexport default TalentAcquisitionScreen;");

fs.writeFileSync(file, code);
