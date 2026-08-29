import React, { useState, useEffect } from 'react';
import { UserSession, CompanyTenant, InventoryItemRecord } from '../../types';
import { ScmService } from '../../services/scmService';
import { Plus, Package, Edit, Search } from 'lucide-react';

export function ItemMasterTab({ session, company }: { session: UserSession, company: CompanyTenant }) {
  const [items, setItems] = useState<InventoryItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  const loadItems = async () => {
    try {
      const data = await ScmService.getItems(company.companyId);
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, [company.companyId]);

  const filtered = items.filter(i => 
    i.itemName.toLowerCase().includes(search.toLowerCase()) || 
    i.itemCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-black dark:text-white">Item Master</h3>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Add Item
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2">
        <Search className="h-4 w-4 text-slate-400" />
        <input 
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or code..."
          className="flex-1 outline-none text-sm"
        />
      </div>

      <div className="flex-1 rounded-md border border-slate-200 bg-white dark:bg-slate-900 shadow-sm overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 sticky top-0">
            <tr>
              <th className="px-4 py-3 font-medium">Item Code</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">UOM</th>
              <th className="px-4 py-3 font-medium">Tracking</th>
              <th className="px-4 py-3 font-medium">Global Stock</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(item => (
              <tr key={item.id} className="hover:bg-white dark:bg-slate-950">
                <td className="px-4 py-3 font-medium text-black dark:text-white">{item.itemCode}</td>
                <td className="px-4 py-3">{item.itemName}</td>
                <td className="px-4 py-3">{item.category}</td>
                <td className="px-4 py-3">{item.unit}</td>
                <td className="px-4 py-3 text-xs">
                  {item.serialTracking && <span className="rounded bg-indigo-100 text-indigo-700 px-2 py-0.5 mr-1">Serial</span>}
                  {item.batchTracking && <span className="rounded bg-teal-100 text-teal-700 px-2 py-0.5">Batch</span>}
                  {!item.serialTracking && !item.batchTracking && <span className="text-slate-400">Qty Only</span>}
                </td>
                <td className="px-4 py-3 font-medium">{item.currentStock}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${item.status === 'IN_STOCK' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-900'}`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr><td colSpan={7} className="text-center py-8 text-slate-500 dark:text-slate-400">No items found</td></tr>
            )}
          </tbody>
        </table>
      </div>
      
      {showModal && (
        <ItemModal 
          company={company} 
          session={session}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); loadItems(); }}
        />
      )}
    </div>
  );
}

function ItemModal({ company, session, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    itemCode: '', itemName: '', category: 'OFFICE_SUPPLIES', unit: 'PCS',
    serialTracking: false, batchTracking: false, minStockThreshold: 10, criticalStockLevel: 5, reorderLevel: 20, thresholdEnabled: true, notificationEnabled: true, unitCost: 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const item: InventoryItemRecord = {
        id: `ITEM-${Date.now()}`,
        companyId: company.companyId,
        ...formData,
        currentStock: 0,
        status: 'OUT_OF_STOCK',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any; // Cast needed because of dynamic strict types
      await ScmService.saveItem(company.companyId, item);
      onSuccess();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 shadow-xl">
        <form onSubmit={handleSubmit}>
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-black dark:text-white">Create New Item</h3>
          </div>
          <div className="space-y-4 p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900 dark:text-slate-300">Item Code</label>
                <input required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={formData.itemCode} onChange={e => setFormData({...formData, itemCode: e.target.value})} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900 dark:text-slate-300">Item Name</label>
                <input required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={formData.itemName} onChange={e => setFormData({...formData, itemName: e.target.value})} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900 dark:text-slate-300">Category</label>
                <input required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900 dark:text-slate-300">Unit of Measure</label>
                <select required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
                  <option value="PCS">Pieces (PCS)</option>
                  <option value="KG">Kilograms (KG)</option>
                  <option value="LITERS">Liters</option>
                  <option value="METERS">Meters</option>
                  <option value="BOXES">Boxes</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-900 dark:text-slate-300">
                <input type="checkbox" checked={formData.serialTracking} onChange={e => setFormData({...formData, serialTracking: e.target.checked})} className="rounded border-slate-300" />
                Serial Number Tracking
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-900 dark:text-slate-300">
                <input type="checkbox" checked={formData.batchTracking} onChange={e => setFormData({...formData, batchTracking: e.target.checked})} className="rounded border-slate-300" />
                Batch Tracking
              </label>
            </div>
          
            <div className="border-t border-slate-200 pt-4 mt-4">
              <h4 className="text-sm font-semibold mb-2">Threshold & Notifications</h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <label className="flex items-center gap-2 text-sm text-slate-900 dark:text-slate-300">
                  <input type="checkbox" checked={formData.thresholdEnabled} onChange={e => setFormData({...formData, thresholdEnabled: e.target.checked})} className="rounded border-slate-300" />
                  Enable Stock Thresholds
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-900 dark:text-slate-300">
                  <input type="checkbox" checked={formData.notificationEnabled} onChange={e => setFormData({...formData, notificationEnabled: e.target.checked})} className="rounded border-slate-300" />
                  Enable Auto Notifications
                </label>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-900 dark:text-slate-300">Reorder Level (Low)</label>
                  <input type="number" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={formData.reorderLevel} onChange={e => setFormData({...formData, reorderLevel: parseInt(e.target.value)})} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-900 dark:text-slate-300">Min Threshold</label>
                  <input type="number" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={formData.minStockThreshold} onChange={e => setFormData({...formData, minStockThreshold: parseInt(e.target.value)})} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-900 dark:text-slate-300">Critical Level</label>
                  <input type="number" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={formData.criticalStockLevel} onChange={e => setFormData({...formData, criticalStockLevel: parseInt(e.target.value)})} />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 bg-white dark:bg-slate-950 px-6 py-4 rounded-b-xl">
            <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium text-slate-900 dark:text-slate-300 hover:bg-slate-200">Cancel</button>
            <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Save Item</button>
          </div>
        </form>
      </div>
    </div>
  );
}
