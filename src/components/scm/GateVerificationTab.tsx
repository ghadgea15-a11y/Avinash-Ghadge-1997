import React, { useState, useEffect } from 'react';
import { UserSession, CompanyTenant, GatePassRecord } from '../../types';
import { ScmService } from '../../services/scmService';
import { Search, CheckCircle } from 'lucide-react';

export function GateVerificationTab({ session, company }: { session: UserSession, company: CompanyTenant }) {
  const companyId = company.companyId || (company as any).id || session.companyId || '';
  const [passes, setPasses] = useState<GatePassRecord[]>([]);

  const loadPasses = async () => {
    if (!companyId) return;
    const all = await ScmService.getGatePasses(companyId);
    setPasses(all.filter((p: any) => p.status === 'DISPATCHED' || (p.passType === 'INWARD' && p.status === 'APPROVED')));
  };

  useEffect(() => { loadPasses(); }, [companyId]);

  const handleVerify = async (pass: GatePassRecord) => {
    try {
      await ScmService.verifyGatePass(session, pass.id || '', companyId);
      loadPasses();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-black dark:text-white">Gate Verification Queue</h3>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {passes.map(p => (
          <div key={p.id} className="rounded-lg border border-slate-200 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className="flex justify-between border-b border-slate-100 pb-3 mb-3">
              <div>
                <h4 className="font-semibold text-black dark:text-white">{p.passNumber}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{p.passType}</p>
              </div>
              <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800 h-fit">
                {p.status}
              </span>
            </div>
            
            <div className="text-sm space-y-2 mb-4">
              <p><span className="text-slate-500 dark:text-slate-400">Source:</span> {p.sourceLocationName || 'External'}</p>
              <p><span className="text-slate-500 dark:text-slate-400">Dest:</span> {p.destinationLocationName || 'External'}</p>
              <p><span className="text-slate-500 dark:text-slate-400">Items:</span> {p.lines.map((l: any) => `${l.quantity}x ${l.itemName}`).join(', ')}</p>
            </div>

            <button 
              onClick={() => handleVerify(p)}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4" /> Verify Gate Pass
            </button>
          </div>
        ))}

        {passes.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400">
            No gate passes pending verification at the gate.
          </div>
        )}
      </div>
    </div>
  );
}
