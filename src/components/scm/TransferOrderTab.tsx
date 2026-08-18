import React, { useState, useEffect } from 'react';
import { UserSession, CompanyTenant, TransferOrderRecord, StockLocationRecord, InventoryItemRecord } from '../../types';
import { TransferService } from '../../services/transferService';
import { ScmService } from '../../services/scmService';
import { Plus, ArrowRight, Package, ShieldCheck, Truck, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

export function TransferOrderTab({ session, company }: { session: UserSession, company: CompanyTenant }) {
  const [transfers, setTransfers] = useState<TransferOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [locations, setLocations] = useState<StockLocationRecord[]>([]);
  const [items, setItems] = useState<InventoryItemRecord[]>([]);
  const [receivingTransfer, setReceivingTransfer] = useState<TransferOrderRecord | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tList, lList, iList] = await Promise.all([
        TransferService.getTransfers(company.companyId),
        ScmService.getLocations(company.companyId),
        ScmService.getItems(company.companyId)
      ]);
      setTransfers(tList);
      setLocations(lList);
      setItems(iList);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [company.companyId]);

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-900">Transfer Orders</h3>
        <button 
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Create Transfer
        </button>
      </div>

      <div className="flex-1 overflow-auto rounded-md border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 sticky top-0">
            <tr>
              <th className="px-4 py-3 font-medium">Transfer #</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Destination</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Expected Date</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transfers.map(t => {
              const srcLoc = locations.find(l => l.id === t.sourceLocationId)?.name || t.sourceLocationId;
              const dstLoc = locations.find(l => l.id === t.destinationLocationId)?.name || t.destinationLocationId;
              
              return (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{t.transferNumber}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{srcLoc}</td>
                  <td className="px-4 py-3 text-slate-600 flex items-center gap-2"><ArrowRight className="h-3 w-3 text-slate-400" /> {dstLoc}</td>
                  <td className="px-4 py-3 text-slate-600">{t.lines.length} items</td>
                  <td className="px-4 py-3 text-slate-600">{t.expectedDeliveryDate ? new Date(t.expectedDeliveryDate).toLocaleDateString() : 'N/A'}</td>
                  <td className="px-4 py-3 text-right">
                    {t.status === 'SUBMITTED' && (
                      <button onClick={async () => {
                        try { await TransferService.approveTransfer(session, company.companyId, t.id); loadData(); } catch(e:any) { alert(e.message); }
                      }} className="text-blue-600 hover:underline text-xs font-medium">Approve & Reserve</button>
                    )}
                    {t.status === 'RESERVED' && (
                      <button onClick={async () => {
                        try { await TransferService.dispatchTransfer(session, company.companyId, t.id, 'TBD'); loadData(); } catch(e:any) { alert(e.message); }
                      }} className="text-orange-600 hover:underline text-xs font-medium ml-2">Dispatch</button>
                    )}
                    {(t.status === 'IN_TRANSIT' || t.status === 'DISPATCHED') && (
                      <button onClick={() => setReceivingTransfer(t)} className="text-green-600 hover:underline text-xs font-medium ml-2">Receive Stock</button>
                    )}
                  </td>
                </tr>
              );
            })}
            {transfers.length === 0 && !loading && (
              <tr><td colSpan={7} className="text-center py-8 text-slate-500">No transfer orders found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && <CreateTransferModal session={session} company={company} locations={locations} items={items} onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); loadData(); }} />}
      {receivingTransfer && <ReceiveTransferModal session={session} company={company} transfer={receivingTransfer} onClose={() => setReceivingTransfer(null)} onSuccess={() => { setReceivingTransfer(null); loadData(); }} />}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let bg = 'bg-slate-100 text-slate-800';
  let Icon = Package;
  
  if (status === 'SUBMITTED') { bg = 'bg-blue-100 text-blue-800'; Icon = FileText; }
  else if (status === 'APPROVED' || status === 'RESERVED') { bg = 'bg-indigo-100 text-indigo-800'; Icon = ShieldCheck; }
  else if (status === 'DISPATCHED' || status === 'IN_TRANSIT') { bg = 'bg-orange-100 text-orange-800'; Icon = Truck; }
  else if (status === 'RECEIVED' || status === 'COMPLETED') { bg = 'bg-green-100 text-green-800'; Icon = CheckCircle2; }
  else if (status === 'PARTIALLY_RECEIVED' || status === 'EXCEPTION') { bg = 'bg-red-100 text-red-800'; Icon = AlertTriangle; }
  
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${bg}`}>
      <Icon className="h-3 w-3" />
      {status.replace('_', ' ')}
    </span>
  );
}

// Minimal implementation for brevity
function CreateTransferModal({ session, company, locations, items, onClose, onSuccess }: any) {
  const [source, setSource] = useState('');
  const [dest, setDest] = useState('');
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('');
  
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const item = items.find((i: any) => i.id === itemId);
      const transferId = `TRF-${Date.now()}`;
      await TransferService.createTransfer(session, {
        id: transferId,
        companyId: company.companyId,
        transferNumber: `TR-${Math.floor(Math.random()*10000)}`,
        sourceLocationId: source,
        destinationLocationId: dest,
        requestedByUid: session.userId,
        requestedByName: session.fullName,
        purpose: 'Restock',
        priority: 'MEDIUM',
        status: 'SUBMITTED',
        lines: [
          { itemId, itemName: item.itemName, requestedQuantity: parseInt(qty), unitOfMeasure: item.unit }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      onSuccess();
    } catch(e: any) { alert(e.message); }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Create Transfer</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <select required className="w-full border p-2 rounded text-sm" value={source} onChange={e=>setSource(e.target.value)}>
            <option value="">Select Source Location...</option>
            {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select required className="w-full border p-2 rounded text-sm" value={dest} onChange={e=>setDest(e.target.value)}>
            <option value="">Select Destination Location...</option>
            {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select required className="w-full border p-2 rounded text-sm" value={itemId} onChange={e=>setItemId(e.target.value)}>
            <option value="">Select Item...</option>
            {items.map((i: any) => <option key={i.id} value={i.id}>{i.itemName}</option>)}
          </select>
          <input required type="number" min="1" placeholder="Quantity" className="w-full border p-2 rounded text-sm" value={qty} onChange={e=>setQty(e.target.value)} />
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded">Submit Request</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReceiveTransferModal({ session, company, transfer, onClose, onSuccess }: any) {
  const [lines, setLines] = useState(transfer.lines.map((l: any) => ({ ...l, received: l.dispatchedQuantity || 0, damaged: 0, missing: 0 })));
  
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await TransferService.receiveTransfer(session, company.companyId, transfer.id, lines.map((l: any) => ({
        itemId: l.itemId,
        received: l.received,
        damaged: l.damaged,
        missing: l.missing
      })));
      onSuccess();
    } catch(e: any) { alert(e.message); }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Receive Transfer: {transfer.transferNumber}</h3>
        <form onSubmit={handleSave} className="space-y-4">
          {lines.map((l: any, idx: number) => (
            <div key={l.itemId} className="p-3 border rounded bg-slate-50 flex gap-4 items-center">
              <div className="flex-1 font-medium">{l.itemName}</div>
              <div className="text-sm">Dispatched: {l.dispatchedQuantity}</div>
              <div className="flex flex-col gap-1 w-24">
                <label className="text-xs">Received</label>
                <input type="number" className="border p-1 text-sm rounded" value={l.received} onChange={e => {
                  const n = [...lines]; n[idx].received = parseInt(e.target.value) || 0; setLines(n);
                }} />
              </div>
              <div className="flex flex-col gap-1 w-24">
                <label className="text-xs">Damaged</label>
                <input type="number" className="border p-1 text-sm rounded" value={l.damaged} onChange={e => {
                  const n = [...lines]; n[idx].damaged = parseInt(e.target.value) || 0; setLines(n);
                }} />
              </div>
              <div className="flex flex-col gap-1 w-24">
                <label className="text-xs">Missing</label>
                <input type="number" className="border p-1 text-sm rounded" value={l.missing} onChange={e => {
                  const n = [...lines]; n[idx].missing = parseInt(e.target.value) || 0; setLines(n);
                }} />
              </div>
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm bg-green-600 text-white rounded">Confirm Receipt</button>
          </div>
        </form>
      </div>
    </div>
  );
}
