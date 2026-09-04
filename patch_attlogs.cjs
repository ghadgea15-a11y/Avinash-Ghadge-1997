const fs = require('fs');
let code = fs.readFileSync('src/components/wfm/AttendanceLogs.tsx', 'utf8');

code = code.replace(
  /<tr key=\{log.id\} className="hover:bg-slate-50 dark:hover:bg-slate-800\/50 transition-colors">[\s\S]*?<td className="py-3 px-6">/g,
  `<tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-6 font-medium">
                    {formatDateSafe(log.timestamp)} {formatTimeSafe(log.timestamp)}
                  </td>
                  <td className="py-3 px-6">
                    {log.userName}
                  </td>
                  <td className="py-3 px-6">
                    <span className={\`px-2 py-1 rounded-full text-[10px] font-bold \${log.action === 'PUNCH_IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}\`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-6">`
);

fs.writeFileSync('src/components/wfm/AttendanceLogs.tsx', code);
console.log('patched AttendanceLogs table');
