const fs = require('fs');

let content = fs.readFileSync('src/components/wfm/SupervisorRollCall.tsx', 'utf8');

// The line is mangled: action: status === 'PRESENT' ? 'PUNCH_IN' : (status ===status: PRESENT as any?status: PRESENT as any:status: PRESENT as any),
// Let's just rewrite the whole handleMark function to be safe.
const newHandleMark = `  const handleMark = async (emp: any, status: 'PRESENT' | 'ABSENT' | 'HALFDAY') => {
    const dismiss = showLoading(\`Marking \${emp.firstName} as \${status}...\`);
    try {
      const logId = \`ATT-\${emp.id}-\${Date.now()}\`;
      const success = await FirestoreService.saveAttendance(activeCompany.companyId, {
        id: logId,
        logId,
        employeeId: emp.id,
        userName: \`\${emp.firstName} \${emp.lastName}\`,
        action: status === 'PRESENT' ? 'PUNCH_IN' : (status === 'ABSENT' ? 'ABSENT' : 'HALFDAY'),
        timestamp: new Date().toISOString(),
        siteId: emp.assignedSiteId || 'SITE-DEFAULT',
        locationDetails: 'Marked by Supervisor',
        markedBy: userSession.userId || userSession.uid || '',
        status: status as any
      } as any);
      dismiss();
      if (success) {
        showSuccess(\`Marked \${emp.firstName} as \${status}\`);
      } else {
        showError('Failed to record attendance');
      }
    } catch (e) {
      dismiss();
      showError('Error recording attendance');
    }
  };`;

// replace from `const handleMark = async (emp: any, status:` down to `showError('Error recording attendance');` + 2 lines.
// It might be easier to just regex the whole block
const regex = /const handleMark = async[^]*?showError\('Error recording attendance'\);\n\s*\}\n\s*\};/m;
content = content.replace(regex, newHandleMark);
fs.writeFileSync('src/components/wfm/SupervisorRollCall.tsx', content);

