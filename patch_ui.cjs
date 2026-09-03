const fs = require('fs');
let file = fs.readFileSync('src/components/screens/ReportsAnalyticsScreen.tsx', 'utf8');
const search = `                  {filteredEmployees.slice(0, 30).map((emp, idx) => {
                    let present = 0;
                    let absent = 0;
                    let weeklyOff = 4;
                    const dayCols = daysArray.map(day => {
                      const log = monthlyAttendanceMap.get(\`\${emp.id}_\${day}\`);
                      if (log) {
                        if (log.status === 'PRESENT') { present++; return 'P'; }
                        if (log.status === 'HALFDAY' || (log.status as string) === 'HALF_DAY') { present += 0.5; return 'HD'; }
                        if (log.status === 'ABSENT') { absent++; return 'A'; }
                        if (log.status === 'ON_LEAVE') return 'L';
                      }
                      const dayOfWeek = new Date(selectedYear, selectedMonth - 1, day).getDay();
                      if (dayOfWeek === 0) return 'WO';
                      present++;
                      return 'P';
                    });
                    const payDays = Math.min(daysInSelectedMonth, present + weeklyOff);
                    const gross = payDays * 650;
                    const net = Math.round(gross * 0.88);`;

const replace = `                  {filteredEmployees.slice(0, 30).map((emp, idx) => {
                    let present = 0;
                    let absent = 0;
                    let weeklyOff = 0;
                    let paidLeaves = 0;
                    
                    const empWeeklyOff = (emp as any).weeklyOff || (emp as any).weeklyOffDays || [0];
                    
                    const dayCols = daysArray.map(day => {
                      const dateStr = \`\${selectedYear}-\${String(selectedMonth).padStart(2, '0')}-\${String(day).padStart(2, '0')}\`;
                      const dayOfWeek = new Date(selectedYear, selectedMonth - 1, day).getDay();
                      const isDayOff = empWeeklyOff.includes(dayOfWeek);
                      
                      const log = monthlyAttendanceMap.get(\`\${emp.id}_\${day}\`);
                      const leave = leaves.find(l => l.employeeId === emp.id && l.status === 'APPROVED' && l.startDate <= dateStr && l.endDate >= dateStr);
                      
                      if (log) {
                        if (log.status === 'PRESENT') { present++; return 'P'; }
                        if (log.status === 'HALFDAY' || (log.status as string) === 'HALF_DAY') { present += 0.5; return 'HD'; }
                        if (log.status === 'ON_LEAVE') { paidLeaves++; return 'L'; }
                        if (log.status === 'ABSENT') { 
                          if (leave && leave.leaveType !== 'UNPAID' && leave.leaveType !== 'LWP') { paidLeaves++; return 'L'; }
                          absent++; return 'A'; 
                        }
                      }
                      
                      if (isDayOff) {
                        weeklyOff++;
                        return 'WO';
                      }
                      
                      if (leave && leave.leaveType !== 'UNPAID' && leave.leaveType !== 'LWP') {
                        paidLeaves++;
                        return 'L';
                      }
                      
                      absent++;
                      return '-';
                    });
                    
                    const payDays = Math.min(daysInSelectedMonth, present + paidLeaves + weeklyOff);
                    const gross = payDays * 650;
                    const net = Math.round(gross * 0.88);`;

if (file.includes(search)) {
  file = file.replace(search, replace);
  fs.writeFileSync('src/components/screens/ReportsAnalyticsScreen.tsx', file);
  console.log('Patched');
} else {
  console.log('Not found');
}
