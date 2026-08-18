const fs = require('fs');
let code = fs.readFileSync('src/components/scm/ItemMasterTab.tsx', 'utf8');

code = code.replace(
  "serialTracking: false, batchTracking: false, minStockThreshold: 0, unitCost: 0",
  "serialTracking: false, batchTracking: false, minStockThreshold: 10, criticalStockLevel: 5, reorderLevel: 20, thresholdEnabled: true, notificationEnabled: true, unitCost: 0"
);

const newFields = `
            <div className="border-t border-slate-200 pt-4 mt-4">
              <h4 className="text-sm font-semibold mb-2">Threshold & Notifications</h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={formData.thresholdEnabled} onChange={e => setFormData({...formData, thresholdEnabled: e.target.checked})} className="rounded border-slate-300" />
                  Enable Stock Thresholds
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={formData.notificationEnabled} onChange={e => setFormData({...formData, notificationEnabled: e.target.checked})} className="rounded border-slate-300" />
                  Enable Auto Notifications
                </label>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Reorder Level (Low)</label>
                  <input type="number" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={formData.reorderLevel} onChange={e => setFormData({...formData, reorderLevel: parseInt(e.target.value)})} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Min Threshold</label>
                  <input type="number" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={formData.minStockThreshold} onChange={e => setFormData({...formData, minStockThreshold: parseInt(e.target.value)})} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Critical Level</label>
                  <input type="number" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={formData.criticalStockLevel} onChange={e => setFormData({...formData, criticalStockLevel: parseInt(e.target.value)})} />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 rounded-b-xl">`;

code = code.replace(
  "</div>\n          <div className=\"flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 rounded-b-xl\">",
  newFields
);

fs.writeFileSync('src/components/scm/ItemMasterTab.tsx', code);
