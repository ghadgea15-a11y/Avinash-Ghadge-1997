import React, { useState, useEffect } from 'react';
import { UserSession, CompanyTenant, GatePassRecord, StockLocationRecord, InventoryItemRecord } from '../../types';
import { ScmService } from '../../services/scmService';
import { Plus, Search, AlertTriangle } from 'lucide-react';
import { ReportLossDamageModal } from '../eam/ReportLossDamageModal';

export function GatePassTab({ session, company }: { session: UserSession, company: CompanyTenant }) {
  const companyId = company.companyId || (company as any).id || session.companyId || '';
  const [passes, setPasses] = useState<GatePassRecord[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [returnPass, setReturnPass] = useState<GatePassRecord | null>(null);

  const loadPasses = async () => {
    if (!companyId) return;
    setPasses(await ScmService.getGatePasses(companyId));
  };

  useEffect(() => { loadPasses(); }, [companyId]);

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-black dark:text-white">Gate Passes</h3>
        <button 
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Create Gate Pass
        </button>
      </div>

      <div className="flex-1 rounded-md border border-slate-200 bg-white dark:bg-slate-900 shadow-sm overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 sticky top-0">
            <tr>
              <th className="px-4 py-3 font-medium">Pass No.</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Source -&gt; Dest</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {passes.map(p => (
              <tr key={p.id} className="hover:bg-white dark:bg-slate-950">
                <td className="px-4 py-3 font-medium text-black dark:text-white">{p.passNumber}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{p.passType}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                  {p.sourceLocationName || 'External'} &rarr; {p.destinationLocationName || 'External'}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{p.lines.length} lines</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-900 dark:text-slate-300">
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {p.status === 'SUBMITTED' && (
                    <button onClick={async () => {
                      await ScmService.approveGatePass(session, p.id || '', companyId);
                      loadPasses();
                    }} className="text-blue-600 hover:underline mr-2 text-xs font-medium">Approve</button>
                  )}
                  {p.status === 'APPROVED' && (
                    <button onClick={async () => {
                      try {
                        await ScmService.dispatchGatePass(session, p.id || '', companyId);
                        loadPasses();
                      } catch (e: any) { alert(e.message); }
                    }} className="text-purple-600 hover:underline text-xs font-medium">Dispatch</button>
                  )}
                  {p.status === 'GATE_VERIFIED' && p.passType === 'INWARD' && (
                    <button onClick={async () => {
                      try {
                        await ScmService.receiveGatePass(session, p.id || '', companyId);
                        loadPasses();
                      } catch (e: any) { alert(e.message); }
                    }} className="text-green-600 hover:underline text-xs font-medium ml-2">Receive Stock</button>
                  )}
                  {p.status === 'RETURN_PENDING' && (
                    <button onClick={async () => {
                      try {
                        await ScmService.returnGatePassMaterials(session, p.id || '', companyId, p.lines.map((l: any) => ({ itemId: l.itemId, returnedQuantity: l.quantity })));
                        loadPasses();
                      } catch (e: any) { alert(e.message); }
                    }} className="text-orange-600 hover:underline text-xs font-medium ml-2">Mark Returned</button>
                  )}
                </td>
              </tr>
            ))}
            {passes.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-slate-500 dark:text-slate-400">No gate passes found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && <CreateGatePassModal company={company} session={session} onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); loadPasses(); }} />}
      {returnPass && <ReturnGatePassModal company={company} session={session} pass={returnPass} onClose={() => setReturnPass(null)} onSuccess={() => { setReturnPass(null); loadPasses(); }} />}
    </div>
  );
}

function CreateGatePassModal({ company, session, onClose, onSuccess }: any) {
  const [locations, setLocations] = useState<StockLocationRecord[]>([]);
  const [items, setItems] = useState<InventoryItemRecord[]>([]);
  
  const [passType, setPassType] = useState<'INWARD'|'OUTWARD'|'RETURNABLE'|'NON_RETURNABLE'>('OUTWARD');
  const [sourceId, setSourceId] = useState('');
  const [destId, setDestId] = useState('');
  const [lines, setLines] = useState<{itemId: string; quantity: number}[]>([]);

  useEffect(() => {
    ScmService.getLocations(company.companyId).then(setLocations);
    ScmService.getItems(company.companyId).then(setItems);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0) return alert('Add at least one item.');
    
    const gp: GatePassRecord = {
      id: `GP-${Date.now()}`,
      referenceNo: `GP-${Math.floor(Math.random()*10000)}`,
      companyId: company.companyId,
      passNumber: `GP-${Math.floor(Math.random()*10000)}`,
      passType,
      type: passType,
      status: 'SUBMITTED',
      sourceLocationId: sourceId || undefined,
      destinationLocationId: destId || undefined,
      sourceLocationName: locations.find(l => l.id === sourceId)?.name,
      destinationLocationName: locations.find(l => l.id === destId)?.name,
      requesterId: session.userId,
      requesterName: session.fullName,
      recipientName: 'TBD',
      purpose: 'Material movement',
      createdAt: new Date().toISOString(),
      lines: lines.map((l: any) => {
        const item = items.find(i => i.id === l.itemId);
        return {
          itemId: item?.id || l.itemId,
          itemCode: item?.itemCode,
          itemName: item?.itemName || '',
          unit: item?.unit,
          uom: item?.unit || 'NOS',
          quantity: l.quantity
        };
      })
    };

    try {
      await ScmService.submitGatePass(session, gp);
      onSuccess();
    } catch(err: any) { alert(err.message); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-slate-900 shadow-xl">
        <form onSubmit={handleSubmit}>
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-black dark:text-white">Create Gate Pass</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900 dark:text-slate-300">Type</label>
                <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={passType} onChange={e => setPassType(e.target.value as any)}>
                  <option value="OUTWARD">Outward</option>
                  <option value="INWARD">Inward</option>
                  <option value="RETURNABLE">Returnable</option>
                  <option value="NON_RETURNABLE">Non-Returnable</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900 dark:text-slate-300">Source Loc</label>
                <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={sourceId} onChange={e => setSourceId(e.target.value)}>
                  <option value="">-- External --</option>
                  {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900 dark:text-slate-300">Dest Loc</label>
                <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={destId} onChange={e => setDestId(e.target.value)}>
                  <option value="">-- External --</option>
                  {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-sm font-semibold mb-2">Items</h4>
              {lines.map((line, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <select className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" value={line.itemId} onChange={e => {
                    const newLines = [...lines]; newLines[idx].itemId = e.target.value; setLines(newLines);
                  }}>
                    <option value="">Select item...</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.itemName}</option>)}
                  </select>
                  <input type="number" min="1" className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm" value={line.quantity} onChange={e => {
                    const newLines = [...lines]; newLines[idx].quantity = parseInt(e.target.value); setLines(newLines);
                  }} />
                  <button type="button" onClick={() => setLines(lines.filter((_, i) => i !== idx))} className="text-red-500 text-sm">Remove</button>
                </div>
              ))}
              <button type="button" onClick={() => setLines([...lines, {itemId: '', quantity: 1}])} className="text-sm text-blue-600 hover:underline">+ Add Item Line</button>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 bg-white dark:bg-slate-950 px-6 py-4 rounded-b-xl">
            <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium text-slate-900 dark:text-slate-300 hover:bg-slate-200">Cancel</button>
            <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Submit Pass</button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 shadow-xl">
        <form onSubmit={handleReturn}>
          <div className="border-b border-slate-200 px-6 py-4 flex justify-between">
            <h3 className="text-lg font-semibold text-black dark:text-white">Verify Returned Material</h3>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Enter the actual quantities being returned for Pass {pass.passNumber}. If quantities are missing or damaged, please file an Incident Report separately from the main Incident module.</p>
            {lines.map((l: any, idx: number) => (
              <div key={l.itemId} className="flex justify-between items-center bg-white dark:bg-slate-950 p-3 rounded-md border border-slate-200">
                <div>
                  <div className="font-medium text-sm">{l.itemName}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Issued: {l.quantity} | Previously Returned: {l.returnedQuantity || 0}</div>
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
          <div className="flex justify-end gap-3 bg-white dark:bg-slate-950 px-6 py-4 rounded-b-xl border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-900 dark:text-slate-300">Cancel</button>
            <button type="submit" className="rounded bg-orange-600 px-4 py-2 text-sm text-white">Confirm Return</button>
          </div>
        </form>
      </div>
    </div>
  );
}
