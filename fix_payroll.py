import re

with open('src/services/payrollEngine.ts', 'r') as f:
    content = f.read()

new_logic = """
    // 1. Calculate LOP (Loss of Pay) / Leaves
    const approvedLeaves = leaves.filter(l => 
      l.employeeId === employee.id && 
      (l.status === 'APPROVED' || (l as any).status === 'ACCEPTED')
    );
    
    let unpaidLeaveDays = 0;
    let paidLeaveDays = 0;
    
    approvedLeaves.forEach(l => {
      if (l.leaveType === 'UNPAID') {
        unpaidLeaveDays += l.daysCount || 0;
      } else {
        paidLeaveDays += l.daysCount || 0;
      }
    });

    // 2. Attendance aggregation (worked days, OT hours)
    let workedDays = 0;
    let explicitAbsentDays = 0;
    let explicitPaidRestDays = 0;
    let otHours = 0;

    attendances.forEach(att => {
      if (att.status === 'PRESENT' || att.status === 'LATE' || att.status === 'EARLY_DEPARTURE') {
        workedDays += 1;
      } else if (att.status === 'HALF_DAY') {
        workedDays += 0.5;
        explicitAbsentDays += 0.5;
      } else if (att.status === 'ABSENT' || att.status === 'MISSED_PUNCH') {
        explicitAbsentDays += 1;
      } else if (att.status === 'HOLIDAY' || att.status === 'WEEKLY_OFF') {
        explicitPaidRestDays += 1;
      }
      
      if (att.approvedOvertimeMinutes && att.approvedOvertimeMinutes > 0) {
        otHours += att.approvedOvertimeMinutes / 60;
      }
    });

    // LOP Days Calculation
    // Total LOP is explicitly unpaid leaves plus explicit unregularized absences.
    let lopDays = unpaidLeaveDays + explicitAbsentDays;
    
    // Cap LOP to max days in month
    lopDays = Math.min(daysInMonth, Math.max(0, lopDays));
    
    let payableDays = daysInMonth - lopDays;
"""

# Replace the old logic
pattern = re.compile(r"// 1\. Calculate LOP \(Loss of Pay\) / Unpaid Leaves.*?const lopDays = Math\.max\(0, daysInMonth - payableDays\);", re.DOTALL)
content = pattern.sub(new_logic.strip(), content)

with open('src/services/payrollEngine.ts', 'w') as f:
    f.write(content)
