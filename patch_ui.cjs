const fs = require('fs');
let code = fs.readFileSync('src/components/screens/EmployeeModuleScreen.tsx', 'utf8');

const injectionPoint = "          </div>\n\n          {/* System Access & RBAC Credentials Card */}";
const newFields = `          </div>

          <h4 className="text-xs font-bold text-slate-300 mt-4 border-b border-slate-800 pb-2">Statutory & Bank Details</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">PAN Number</label>
              <input
                type="text"
                value={formData.panNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, panNumber: e.target.value.toUpperCase() }))}
                placeholder="ABCDE1234F"
                className={\`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none \${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
                }\`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Aadhar Number</label>
              <input
                type="text"
                value={formData.aadharNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, aadharNumber: e.target.value.replace(/\\D/g, '') }))}
                placeholder="123456789012"
                maxLength={12}
                className={\`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none \${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
                }\`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">UAN Number (PF)</label>
              <input
                type="text"
                value={formData.uanNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, uanNumber: e.target.value }))}
                placeholder="UAN"
                className={\`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none \${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
                }\`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">ESIC Number</label>
              <input
                type="text"
                value={formData.esicNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, esicNumber: e.target.value }))}
                placeholder="ESIC"
                className={\`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none \${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
                }\`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Bank Name</label>
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                placeholder="Bank Name"
                className={\`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none \${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
                }\`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Bank Account Number</label>
              <input
                type="text"
                value={formData.bankAccountNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, bankAccountNumber: e.target.value }))}
                placeholder="Account Number"
                className={\`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none \${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
                }\`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Bank IFSC</label>
              <input
                type="text"
                value={formData.bankIfsc}
                onChange={(e) => setFormData(prev => ({ ...prev, bankIfsc: e.target.value.toUpperCase() }))}
                placeholder="IFSC Code"
                className={\`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none \${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
                }\`}
              />
            </div>
          </div>

          {/* System Access & RBAC Credentials Card */}`;

code = code.replace(injectionPoint, newFields);
fs.writeFileSync('src/components/screens/EmployeeModuleScreen.tsx', code);
console.log('patched UI');
