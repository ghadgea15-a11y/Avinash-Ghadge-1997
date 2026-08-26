const fs = require('fs');
let code = fs.readFileSync('src/components/screens/LoginScreen.tsx', 'utf8');

const backupCodesUI = `
          {mfaSetupData && (
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl space-y-4">
              <img src={mfaSetupData.qrCodeDataUrl} alt="QR Code" className="w-48 h-48" />
              <div className="text-center w-full">
                <p className="text-xs font-semibold text-slate-700 mb-2">Backup Recovery Codes</p>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                   {mfaSetupData.backupCodes.map((c, i) => (
                      <span key={i}>{c}</span>
                   ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Save these in a secure place. They will not be shown again.</p>
              </div>
            </div>
          )}
`;

code = code.replace(
  "          {mfaSetupData && (\n            <div className=\"flex justify-center p-4 bg-white rounded-xl\">\n              <img src={mfaSetupData.qrCodeDataUrl} alt=\"QR Code\" className=\"w-48 h-48\" />\n            </div>\n          )}",
  backupCodesUI
);

fs.writeFileSync('src/components/screens/LoginScreen.tsx', code);
console.log('LoginScreen backup codes patched.');
