const fs = require('fs');
const file = 'src/services/leaveService.ts';
let code = fs.readFileSync(file, 'utf8');

// Update signature
code = code.replace(
  /weeklyOffDays: number\[\], \/\/ 0 = Sunday, 1 = Monday\.\.\.\n    holidays: HolidayRecord\[\],\n    policy: LeavePolicyRecord/,
  `weeklyOffDays: number[], // 0 = Sunday, 1 = Monday...\n    holidays: HolidayRecord[],\n    policy: LeavePolicyRecord,\n    employeeRegionId?: string`
);

// Update logic
const oldLogic = `    const holidayDates = new Set(holidays.map(h => h.date));

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();

      const isWeeklyOff = weeklyOffDays.includes(dayOfWeek);
      const isHoliday = holidayDates.has(dateStr);`;

const newLogic = `    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();

      const isWeeklyOff = weeklyOffDays.includes(dayOfWeek);
      const isHoliday = holidays.some(h => {
        if (h.date !== dateStr) return false;
        if (!h.applicableRegions || h.applicableRegions.length === 0) return true; // Global holiday
        return employeeRegionId && h.applicableRegions.includes(employeeRegionId);
      });`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync(file, code);
console.log('LeaveService Patched');
