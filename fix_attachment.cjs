const fs = require('fs');

let f1 = fs.readFileSync('src/components/hrms/LeaveApplyForm.tsx', 'utf8');

f1 = f1.replace(/\{(\/\* Emergency Contact \*\/)\}/, `$1
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Supporting Document / Medical Certificate URL</label>
              <div className="relative">
                <input
                  type="url"
                  value={formData.attachmentUrl}
                  onChange={(e) => setFormData({ ...formData, attachmentUrl: e.target.value })}
                  placeholder="https://drive.google.com/file/..."
                  className="w-full pl-10 pr-4 py-3 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:bg-slate-900 text-black dark:text-white outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all"
                />
                <Paperclip className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              </div>
            </div>
            
            {/* Emergency Contact */}`);

if (!f1.includes("Paperclip")) {
  f1 = f1.replace("from 'lucide-react';", ", Paperclip } from 'lucide-react';");
}

fs.writeFileSync('src/components/hrms/LeaveApplyForm.tsx', f1);
