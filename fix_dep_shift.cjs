const fs = require('fs');
let code = fs.readFileSync('src/components/screens/DeploymentManagementScreen.tsx', 'utf8');

// Add shifts state
code = code.replace(/const \[sites, setSites\] = useState<SiteRecord\[\]>\(\[\]\);/,
`const [sites, setSites] = useState<SiteRecord[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);`);

// Subscribe to shifts
code = code.replace(/const u4 = FirestoreService\.subscribeToSites\(activeCompany\.companyId, \(data: any\) => setSites\(data\)\);/,
`const u4 = FirestoreService.subscribeToSites(activeCompany.companyId, (data: any) => setSites(data));
    const u5 = FirestoreService.subscribeToShifts(userSession, activeCompany.companyId, (data: any) => setShifts(data));`);

code = code.replace(/unsubs\.push\(u1, u2, u3, u4\);/, `unsubs.push(u1, u2, u3, u4, u5);`);

// Add Select Shift
const shiftSelect = `
            <select className="p-2 border rounded" value={formData.assignedShiftTypeId || ''} onChange={e => setFormData({...formData, assignedShiftTypeId: e.target.value})}>
              <option value="">Select Primary Shift</option>
              {shifts.map(shift => <option key={shift.id} value={shift.id}>{shift.name} ({shift.startTime}-{shift.endTime})</option>)}
            </select>
`;
code = code.replace(/<select className="p-2 border rounded" value=\{formData\.siteId\}/, shiftSelect + '$&');

fs.writeFileSync('src/components/screens/DeploymentManagementScreen.tsx', code);
