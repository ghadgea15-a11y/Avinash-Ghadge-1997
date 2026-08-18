const fs = require('fs');
let code = fs.readFileSync('src/components/scm/GatePassTab.tsx', 'utf8');

code = code.replace(
  "import { Plus, Search } from 'lucide-react';",
  "import { Plus, Search, AlertTriangle } from 'lucide-react';\nimport { ReportLossDamageModal } from '../eam/ReportLossDamageModal';"
);

code = code.replace(
  "const [showCreate, setShowCreate] = useState(false);",
  "const [showCreate, setShowCreate] = useState(false);\n  const [returnPass, setReturnPass] = useState<GatePassRecord | null>(null);"
);

code = code.replace(
  `{p.status === 'RETURN_PENDING' && (
                    <button onClick={async () => {
                      try {
                        await ScmService.returnGatePassMaterials(session, p.id, company.id, p.lines.map(l => ({ itemId: l.itemId, returnedQuantity: l.quantity })));
                        loadPasses();
                      } catch (e: any) { alert(e.message); }
                    }} className="text-orange-600 hover:underline text-xs font-medium ml-2">Mark Returned</button>
                  )}`,
  `{p.status === 'RETURN_PENDING' && (
                    <button onClick={() => setReturnPass(p)} className="text-orange-600 hover:underline text-xs font-medium ml-2">Return & Verify</button>
                  )}`
);

code = code.replace(
  "{showCreate && <CreateGatePassModal company={company} session={session} onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); loadPasses(); }} />}",
  `{showCreate && <CreateGatePassModal company={company} session={session} onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); loadPasses(); }} />}
      {returnPass && <ReturnGatePassModal company={company} session={session} pass={returnPass} onClose={() => setReturnPass(null)} onSuccess={() => { setReturnPass(null); loadPasses(); }} />}`
);

code += `
function ReturnGatePassModal({ company, session, pass, onClose, onSuccess }: any) {
  const [lines, setLines] = useState(pass.lines.map((l: any) => ({ ...l, returning: l.quantity - (l.returnedQuantity || 0) })));
  
  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ScmService.returnGatePassMaterials(session, pass.id, company.id, lines.map((l: any) => ({ itemId: l.itemId, returnedQuantity: l.returning })));
      onSuccess();
    } catch(err: any) { alert(err.message); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <form onSubmit={handleReturn}>
          <div className="border-b border-slate-200 px-6 py-4 flex justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Verify Returned Material</h3>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-500 mb-4">Enter the actual quantities being returned for Pass {pass.passNumber}. If quantities are missing or damaged, please file an Incident Report separately from the main Incident module.</p>
            {lines.map((l: any, idx: number) => (
              <div key={l.itemId} className="flex justify-between items-center bg-slate-50 p-3 rounded-md border border-slate-200">
                <div>
                  <div className="font-medium text-sm">{l.itemName}</div>
                  <div className="text-xs text-slate-500">Issued: {l.quantity} | Previously Returned: {l.returnedQuantity || 0}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Returning:</span>
                  <input type="number" max={l.quantity - (l.returnedQuantity || 0)} min="0" required 
                    className="w-20 rounded border border-slate-300 px-2 py-1 text-sm" 
                    value={l.returning} 
                    onChange={e => {
                      const v = parseInt(e.target.value);
                      const newL = [...lines]; newL[idx].returning = isNaN(v) ? 0 : v; setLines(newL);
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 bg-slate-50 px-6 py-4 rounded-b-xl border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-700">Cancel</button>
            <button type="submit" className="rounded bg-orange-600 px-4 py-2 text-sm text-white">Confirm Return</button>
          </div>
        </form>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/components/scm/GatePassTab.tsx', code);
