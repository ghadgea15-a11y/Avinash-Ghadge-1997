const fs = require('fs');
let code = fs.readFileSync('src/components/wfm/AttendanceAdjustmentWorkflow.tsx', 'utf8');

code = code.replace(
  /const handleOpenModal = \(att: AttendanceRecord\) => \{[\s\S]*?setReason\(''\);\n  \};/,
  `const getLocalTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return \`\${hh}:\${mm}\`;
    } catch(e) { return ''; }
  };

  const handleOpenModal = (att: AttendanceRecord) => {
    setSelectedAtt(att);
    setNewCheckIn(getLocalTime(att.checkInTime));
    setNewCheckOut(getLocalTime(att.checkOutTime));
    setApprovedOt(att.approvedOvertimeMinutes || 0);
    setNewStatus(att.status);
    setReason('');
  };`
);

fs.writeFileSync('src/components/wfm/AttendanceAdjustmentWorkflow.tsx', code);
console.log('patched handleOpenModal');
