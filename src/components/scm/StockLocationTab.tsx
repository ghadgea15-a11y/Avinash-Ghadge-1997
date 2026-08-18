import React, { useState, useEffect } from 'react';
import { UserSession, CompanyTenant, StockLocationRecord, StockBalanceRecord } from '../../types';
import { ScmService } from '../../services/scmService';
import { Plus, MapPin, ArrowRightLeft } from 'lucide-react';
import { InventoryItemRecord } from '../../types';

export function StockLocationTab({ session, company }: { session: UserSession, company: CompanyTenant }) {
  const [locations, setLocations] = useState<StockLocationRecord[]>([]);
  const [balances, setBalances] = useState<StockBalanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIssue, setShowIssue] = useState(false);
  const [items, setItems] = useState<InventoryItemRecord[]>([]);

  const loadData = async () => {
    try {
      const locs = await ScmService.getLocations(company.companyId);
      const bals = await ScmService.getBalances(company.companyId);
      setLocations(locs);
      setBalances(bals);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [company.companyId]);

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-900">Stock Locations</h3>
        <button 
          onClick={() => setShowIssue(true)}
          className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 mr-3"
        >
          <ArrowRightLeft className="h-4 w-4" /> Issue Material
        </button>
        <button 
          onClick={() => {
            const name = prompt("Enter location name:");
            if (name) {
              const loc: StockLocationRecord = {
                id: `LOC-${Date.now()}`,
                companyId: company.companyId,
                name,
                type: 'SITE_STORE',
                status: 'ACTIVE',
                createdAt: new Date().toISOString()
              };
              ScmService.saveLocation(company.companyId, loc).then(loadData);
            }
          }}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Add Location
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map(loc => {
          const locBals = balances.filter(b => b.locationId === loc.id);
          const totalItems = locBals.length;
          const totalQty = locBals.reduce((sum, b) => sum + (b.quantity || 0), 0);
          
          return (
            <div key={loc.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">{loc.name}</h4>
                  <span className="text-xs text-slate-500">{loc.type}</span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Unique Items:</span>
                <span className="font-medium text-slate-900">{totalItems}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-500">Total Quantity:</span>
                <span className="font-medium text-slate-900">{totalQty}</span>
              </div>
            </div>
          )
        })}
        {locations.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-slate-500">
            No stock locations configured.
          </div>
        )}
      </div>
      {showIssue && <IssueMaterialModal company={company} session={session} locations={locations} items={items} onClose={() => setShowIssue(false)} onSuccess={() => { setShowIssue(false); loadData(); }} />}
    </div>
  );
}

function IssueMaterialModal({ company, session, locations, items, onClose, onSuccess }: any) {
  const [locId, setLocId] = useState('');
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ScmService.issueStock(session, company.id, locId, itemId, parseInt(qty), reason);
      onSuccess();
    } catch(err: any) { alert(err.message); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <form onSubmit={handleIssue}>
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-900">Issue Material (Internal)</h3>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium">Source Location</label>
              <select required className="mt-1 w-full rounded border px-3 py-2 text-sm" value={locId} onChange={e => setLocId(e.target.value)}>
                <option value="">Select location...</option>
                {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Item</label>
              <select required className="mt-1 w-full rounded border px-3 py-2 text-sm" value={itemId} onChange={e => setItemId(e.target.value)}>
                <option value="">Select item...</option>
                {items.map((i: any) => <option key={i.id} value={i.id}>{i.itemName}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Quantity</label>
              <input required type="number" min="1" className="mt-1 w-full rounded border px-3 py-2 text-sm" value={qty} onChange={e => setQty(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Reason / Recipient</label>
              <input required className="mt-1 w-full rounded border px-3 py-2 text-sm" value={reason} onChange={e => setReason(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-3 bg-slate-50 px-6 py-4 rounded-b-xl border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm">Cancel</button>
            <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-sm text-white">Issue Material</button>
          </div>
        </form>
      </div>
    </div>
  );
}

