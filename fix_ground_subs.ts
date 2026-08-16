import * as fs from 'fs';

['SemiSkilledDashboard.tsx', 'SupportStaffDashboard.tsx'].forEach(filename => {
  let content = fs.readFileSync('src/components/screens/dashboards/' + filename, 'utf-8');

  // Replace unsub with parallel unsubs
  const oldSub = `    const unsub = FirestoreService.subscribeToAttendanceLogs(userSession, company.companyId, (data) => {
      setAttendance(data.filter(a => a.employeeId === userSession.employeeId));
    });
    
    setTimeout(() => setLoading(false), 800);
    return () => unsub();`;

  const newSub = `    const unsubs = [
      FirestoreService.subscribeToAttendanceLogs(userSession, company.companyId, (data) => {
        setAttendance(data.filter(a => a.employeeId === userSession.employeeId));
      }),
      FirestoreService.subscribeToTasks(userSession, company.companyId, (data) => {
        setTasks(data.filter(t => t.assignedTo === userSession.employeeId));
      }),
      FirestoreService.subscribeToAnnouncements(userSession, company.companyId, (data) => {
        setAnnouncements(data);
      })
    ];
    
    setTimeout(() => setLoading(false), 800);
    return () => unsubs.forEach(unsub => unsub());`;

  content = content.replace(oldSub, newSub);

  fs.writeFileSync('src/components/screens/dashboards/' + filename, content);
});
