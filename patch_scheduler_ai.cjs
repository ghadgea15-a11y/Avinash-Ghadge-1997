const fs = require('fs');
let code = fs.readFileSync('src/components/wfm/RosterScheduler.tsx', 'utf8');

// 1. Add selectedRelieverId to state
code = code.replace(
  /const \[selectedShiftId, setSelectedShiftId\] = useState<string>\(''\);/,
  `const [selectedShiftId, setSelectedShiftId] = useState<string>('');\n  const [selectedRelieverId, setSelectedRelieverId] = useState<string>('');`
);

// 2. Add Reliever info into assignmentContext handling
code = code.replace(
  /setSelectedShiftId\(existingRoster\?.shiftId \|\| ''\);/,
  `setSelectedShiftId(existingRoster?.shiftId || '');\n    setSelectedRelieverId(existingRoster?.relieverId || '');`
);

// 3. Save Reliever info to roster record
code = code.replace(
  /date: format\(assignmentContext.date, 'yyyy-MM-dd'\),/,
  `date: format(assignmentContext.date, 'yyyy-MM-dd'),\n        rosterDate: format(assignmentContext.date, 'yyyy-MM-dd'),\n        relieverId: selectedRelieverId || undefined,\n        relieverName: selectedRelieverId ? employees.find(e => e.id === selectedRelieverId)?.name || '' : undefined,`
);

// 4. Update the Modal UI to include Reliever selection
code = code.replace(
  /<\/select>\n              <\/div>\n            <\/div>/,
  `</select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Replacement / Reliever (Optional)
                </label>
                <select
                  value={selectedRelieverId}
                  onChange={(e) => setSelectedRelieverId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">-- No Reliever --</option>
                  {employees.filter(e => e.id !== assignmentContext?.employeeId).map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name || \`\${e.firstName} \${e.lastName}\`}
                    </option>
                  ))}
                </select>
              </div>
            </div>`
);

// 5. Add AI Auto-Scheduling logic
code = code.replace(
  /const handlePrevWeek = \(\) => setCurrentWeekStart\(prev => subWeeks\(prev, 1\)\);/,
  `const handlePrevWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));

  const handleAutoSchedule = async () => {
    if (!activeCompany || !userSession) return;
    if (shifts.length === 0) {
      setError('Please create at least one shift in Shift Master first.');
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const newRosters = [];
      const batchDate = Date.now();
      let rstCounter = 0;

      for (const emp of filteredEmployees) {
        let workedDays = 0;
        const site = sites.find(s => s.id === emp.siteId) || sites[0];
        
        for (let i = 0; i < 7; i++) {
          const d = addDays(currentWeekStart, i);
          const dateStr = format(d, 'yyyy-MM-dd');
          
          const existing = rosters.find(r => r.employeeId === emp.id && (r.date === dateStr || r.rosterDate === dateStr));
          if (existing) {
             workedDays++;
             continue; 
          }
          
          if (workedDays >= 6) {
             // 7th day is Weekly Off
             continue;
          }

          // Cycle through shifts for rotational, or pick first if not mapped
          const defaultShift = shifts[0];
          newRosters.push({
            id: \`RST-AI-\${batchDate}-\${rstCounter++}\`,
            companyId: activeCompany.companyId,
            employeeId: emp.id!,
            employeeName: emp.name || \`\${emp.firstName} \${emp.lastName}\`,
            shiftId: defaultShift.id!,
            shiftName: defaultShift.name,
            siteId: emp.siteId || site?.id || '',
            siteName: site?.name || '',
            date: dateStr,
            rosterDate: dateStr,
            status: 'ACTIVE',
            createdBy: userSession.uid,
            createdAt: new Date().toISOString()
          });
          workedDays++;
        }
      }

      if (newRosters.length > 0) {
        await FirestoreService.bulkSaveRosters(activeCompany.companyId, newRosters, { id: userSession.uid });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to auto-schedule');
    } finally {
      setIsProcessing(false);
    }
  };`
);

// 6. Add Bot icon to imports
code = code.replace(
  /Users, MapPin, Copy, Save, AlertCircle, Plus, Edit2, Trash2/,
  `Users, MapPin, Copy, Save, AlertCircle, Plus, Edit2, Trash2, Bot`
);

// 7. Add AI button to UI next to Copy
code = code.replace(
  /<\/button>\n          <button\n            onClick=\{handleNextWeek\}/,
  `</button>
          <button
            onClick={handleAutoSchedule}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-medium rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
          >
            <Bot className="w-4 h-4" />
            AI Auto-Schedule
          </button>
          <button
            onClick={handleNextWeek}`
);

fs.writeFileSync('src/components/wfm/RosterScheduler.tsx', code);
console.log('patched roster ai logic');
