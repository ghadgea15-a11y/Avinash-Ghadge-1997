const fs = require('fs');

function updateDashboard(file) {
  let code = fs.readFileSync(file, 'utf8');
  
  if (!code.includes('OfflineSyncService')) {
    code = code.replace(/import \{ FirestoreService \} from '\.\.\/\.\.\/\.\.\/services\/firestoreService';/,
    `import { FirestoreService } from '../../../services/firestoreService';
import { OfflineSyncService } from '../../../services/offlineSyncService';`);
  }

  // Adding handlePunchIn and handlePunchOut
  const punchMethods = `
  const handlePunchIn = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const logData = {
      companyId: company.companyId,
      employeeId: userSession.employeeId,
      employeeName: userSession.fullName,
      siteId: userSession.assignedSiteId || 'UNKNOWN_SITE',
      shiftId: userSession.assignedShiftId || 'DEFAULT_SHIFT',
      date: todayStr,
      checkInTime: new Date().toISOString(),
      status: 'PRESENT',
      checkInMethod: 'SELF_GPS',
      lateArrivalMinutes: 0,
      earlyDepartureMinutes: 0,
      overtimeMinutes: 0
    };
    OfflineSyncService.queueAction('PUNCH_IN', { companyId: company.companyId, data: logData });
    // Trigger local update manually or wait for sync?
    // We can just call checkInEmployee directly if online, but offline queue handles it.
    // For immediate UI update, we'll try to do the network call directly, fallback to queue
    FirestoreService.checkInEmployee(company.companyId, logData).then((res) => {
      if(!res.success) alert(res.message);
    }).catch(() => {
      alert("Offline: Check-in queued.");
    });
  };

  const handlePunchOut = () => {
    if(!punchedInToday) return;
    const logData = {
      attendanceId: punchedInToday.id,
      checkOutTime: new Date().toISOString(),
      shift: undefined // Optional
    };
    OfflineSyncService.queueAction('PUNCH_OUT', { companyId: company.companyId, data: logData });
    FirestoreService.checkOutEmployee(company.companyId, punchedInToday.id, logData.checkOutTime, undefined, undefined).then(() => {
    }).catch(() => {
      alert("Offline: Check-out queued.");
    });
  };
`;
  
  code = code.replace(/const openIncidents = [^\n]+;\n/, `const openIncidents = incidents.filter(i => i.status === 'OPEN' || i.status === 'UNDER_INVESTIGATION').length;
${punchMethods}
`);

  const buttons = `
          <div className="mt-4 flex gap-2">
            {!isPunchedIn && !punchedInToday?.checkOutTime && (
              <button onClick={handlePunchIn} className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow text-sm">
                Punch In (GPS)
              </button>
            )}
            {isPunchedIn && (
              <button onClick={handlePunchOut} className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow text-sm">
                Punch Out
              </button>
            )}
            {punchedInToday?.checkOutTime && (
              <div className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-center text-sm border">
                Shift Completed
              </div>
            )}
          </div>
`;

  code = code.replace(/<p className="text-xs text-slate-500 mt-2">\s*\{isPunchedIn[^<]+<\/p>/, `$&${buttons}`);

  fs.writeFileSync(file, code);
}

['src/components/screens/dashboards/SkilledStaffDashboard.tsx',
 'src/components/screens/dashboards/SemiSkilledDashboard.tsx',
 'src/components/screens/dashboards/SupportStaffDashboard.tsx'].forEach(updateDashboard);
