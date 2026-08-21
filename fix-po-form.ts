import * as fs from 'fs';
const file = 'src/components/screens/PurchaseOrderManagementScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

const creationForm = `
        {/* Creation Form */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
             <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
                   <div>
                     <h2 className="text-xl font-bold text-slate-900">Create Purchase Order</h2>
                     <p className="text-sm text-slate-500">Draft a new PO or import from RFQ</p>
                   </div>
                   <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                     <X className="w-5 h-5" />
                   </button>
                </div>
                <div className="p-6 space-y-6">
                   <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-start gap-3">
                      <div className="bg-blue-100 p-2 rounded-full"><Search className="w-5 h-5 text-blue-700" /></div>
                      <div>
                         <h3 className="text-sm font-semibold text-blue-900">Import from RFQ</h3>
                         <p className="text-xs text-blue-700 mt-1">Select an awarded RFQ to automatically populate vendor, items, and negotiated prices.</p>
                         <button className="mt-3 text-xs font-semibold bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors">
                            Select Awarded RFQ
                         </button>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Vendor Name</label>
                         <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" placeholder="e.g. Acme Corp" />
                      </div>
                      <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Site</label>
                         <select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm">
                            <option>Main HQ (Mumbai)</option>
                            <option>Pune Facility</option>
                         </select>
                      </div>
                   </div>

                   <div>
                      <div className="flex items-center justify-between mb-2">
                         <label className="block text-sm font-medium text-slate-700">Line Items</label>
                         <button className="text-xs text-indigo-600 font-medium hover:text-indigo-800 flex items-center">
                            <Plus className="w-3 h-3 mr-1" /> Add Item
                         </button>
                      </div>
                      <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 text-center">
                         <p className="text-sm text-slate-500">No items added yet. Import an RFQ or add items manually.</p>
                      </div>
                   </div>

                   <div className="flex items-center justify-between bg-slate-100 p-4 rounded-lg">
                      <div className="text-sm text-slate-600">
                         Budget Headroom: <span className="font-semibold text-green-600">₹4,50,000</span>
                      </div>
                      <div className="text-right">
                         <div className="text-xs text-slate-500">Grand Total</div>
                         <div className="text-xl font-bold text-slate-900">₹0.00</div>
                      </div>
                   </div>
                </div>
                <div className="p-6 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
                   <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">
                      Cancel
                   </button>
                   <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Save as Draft
                   </button>
                </div>
             </div>
          </div>
        )}
`;

content = content.replace('{/* Filters */}', creationForm + '\n\n        {/* Filters */}');
fs.writeFileSync(file, content);
console.log('Added PO Form');
