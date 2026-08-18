const fs = require('fs');
let code = fs.readFileSync('src/components/scm/StockLocationTab.tsx', 'utf8');

code = code.replace(
  "import { Plus, MapPin } from 'lucide-react';",
  "import { Plus, MapPin, ArrowRightLeft } from 'lucide-react';\nimport { InventoryItemRecord } from '../../types';"
);

code = code.replace(
  "const [loading, setLoading] = useState(true);",
  "const [loading, setLoading] = useState(true);\n  const [showIssue, setShowIssue] = useState(false);\n  const [items, setItems] = useState<InventoryItemRecord[]>([]);"
);

code = code.replace(
  "const locs = await ScmService.getLocations(company.id);\n      const bals = await ScmService.getBalances(company.id);",
  "const locs = await ScmService.getLocations(company.id);\n      const bals = await ScmService.getBalances(company.id);\n      const itms = await ScmService.getItems(company.id);\n      setItems(itms);"
);

code = code.replace(
  "<button \n          onClick={() => {",
  `<button 
          onClick={() => setShowIssue(true)}
          className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 mr-3"
        >
          <ArrowRightLeft className="h-4 w-4" /> Issue Material
        </button>
        <button \n          onClick={() => {`
);

code = code.replace(
  "</div>\n  );\n}",
  `  {showIssue && <IssueMaterialModal company={company} session={session} locations={locations} items={items} onClose={() => setShowIssue(false)} onSuccess={() => { setShowIssue(false); loadData(); }} />}
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
`
);

fs.writeFileSync('src/components/scm/StockLocationTab.tsx', code);
