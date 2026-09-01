const fs = require('fs');
let code = fs.readFileSync('src/components/screens/IdentityBadgeScreen.tsx', 'utf8');

code = code.replace(
`      </AnimatePresence>
    </div>
  );
};`,
`      </AnimatePresence>
    </div>

    {/* Printable Badge - Visible only during print */}
    {selectedBadge && (
      <div className="hidden print:flex fixed inset-0 w-full h-full bg-white text-black items-center justify-center z-[9999]">
        <div className="w-[54mm] h-[86mm] border border-slate-300 rounded-xl bg-white relative overflow-hidden flex flex-col shadow-sm" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          <div className="h-14 bg-indigo-600 flex items-center justify-center p-2 text-white text-center">
             <h1 className="font-bold text-[10px] leading-tight">{activeCompany.brandName || activeCompany.companyLegalName || 'Company Identity'}</h1>
          </div>
          <div className="flex justify-center -mt-6 z-10 relative">
            <div className="w-16 h-16 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center overflow-hidden shadow-sm">
              {employees.find(e => e.id === selectedBadge.employeeId)?.profilePictureUrl ? (
                <img 
                  src={employees.find(e => e.id === selectedBadge.employeeId)?.profilePictureUrl} 
                  alt="" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User size={32} className="text-slate-400" />
              )}
            </div>
          </div>
          <div className="text-center px-2 pt-2 pb-1">
             <h2 className="font-bold text-[13px] leading-tight text-slate-900 truncate">{employees.find(e => e.id === selectedBadge.employeeId) ? \`\${employees.find(e => e.id === selectedBadge.employeeId)?.firstName} \${employees.find(e => e.id === selectedBadge.employeeId)?.lastName}\` : 'Unknown Employee'}</h2>
             <p className="text-[9px] text-indigo-700 font-bold uppercase mt-0.5 truncate">{employees.find(e => e.id === selectedBadge.employeeId)?.designation || 'Staff'}</p>
             <p className="text-[9px] text-slate-600 font-mono mt-1 font-semibold">ID: {employees.find(e => e.id === selectedBadge.employeeId)?.employeeId || selectedBadge.employeeId}</p>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center pb-2">
             <div className="p-1.5 bg-white border border-slate-100 rounded-lg shadow-sm">
               <QRCodeDisplay value={\`IDB-\${selectedBadge.id}\`} size={64} level="M" includeMargin={false} />
             </div>
             <p className="text-[7px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Scan to Verify</p>
          </div>
          <div className="py-1.5 px-2 bg-slate-100 flex flex-col items-center justify-center border-t border-slate-200">
             <p className="text-[7px] text-slate-500 font-bold uppercase tracking-wider">{selectedBadge.type || 'STANDARD'} BADGE</p>
          </div>
        </div>
      </div>
    )}
    </>
  );
};`
);

fs.writeFileSync('src/components/screens/IdentityBadgeScreen.tsx', code);
