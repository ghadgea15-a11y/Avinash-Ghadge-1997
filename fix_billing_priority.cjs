const fs = require('fs');
let content = fs.readFileSync('src/services/billingRateService.ts', 'utf8');

const replacement = `
    const previews: BillingPreviewRecord[] = [];

    // Fetch Attendance for PER_SHIFT / PER_HOUR / PER_DAY / PER_EMPLOYEE
    const qAtt = query(
      collection(db, 'companies', companyId, 'attendance'),
      where('attendanceDate', '>=', startYMD),
      where('attendanceDate', '<=', endYMD)
    );
    const snapAtt = await getDocs(qAtt);
    let attendances = snapAtt.docs.map(d => d.data() as AttendanceRecord);
    
    // Fetch Work Orders for PER_SERVICE / VARIABLE_QUANTITY
    const qWo = query(
      collection(db, 'companies', companyId, 'work_orders'),
      where('createdAt', '>=', isoStart),
      where('createdAt', '<=', isoEnd)
    );
    const snapWo = await getDocs(qWo);
    let wos = snapWo.docs.map(d => d.data() as WorkOrderRecord);

    for (const rate of activeRates) {
      let qty = 0;
      let sourceRef = '';

      if (rate.rateType === 'PER_SHIFT' || rate.rateType === 'PER_DAY') {
        const matchingAtt = attendances.filter(a => {
           if (rate.siteId && a.siteId !== rate.siteId) return false;
           return a.status === 'PRESENT';
        });
        qty = matchingAtt.length;
        sourceRef = \`attendance_records:\${matchingAtt.length}\`;
        
        // Consume records so lower priority rates don't double count
        const consumedIds = new Set(matchingAtt.map(a => a.id));
        attendances = attendances.filter(a => !consumedIds.has(a.id));
        
      } else if (rate.rateType === 'PER_HOUR') {
        const matchingAtt = attendances.filter(a => {
           if (rate.siteId && a.siteId !== rate.siteId) return false;
           return a.status === 'PRESENT' && a.workedMinutes;
        });
        qty = matchingAtt.reduce((sum, a) => sum + (a.workedMinutes ? a.workedMinutes / 60 : 0), 0);
        sourceRef = \`attendance_hours:\${qty}\`;
        
        const consumedIds = new Set(matchingAtt.map(a => a.id));
        attendances = attendances.filter(a => !consumedIds.has(a.id));

      } else if (rate.rateType === 'FIXED_MONTHLY') {
        qty = 1; 
        sourceRef = \`contract_fixed\`;
      } else if (rate.rateType === 'PER_SERVICE') {
        const matchingWo = wos.filter(w => {
           if (rate.siteId && w.siteId !== rate.siteId) return false;
           return w.status === 'COMPLETED' || w.status === 'CLOSED';
        });
        qty = matchingWo.length;
        sourceRef = \`work_orders:\${qty}\`;
        
        const consumedIds = new Set(matchingWo.map(w => w.id));
        wos = wos.filter(w => !consumedIds.has(w.id));
      }
`;

content = content.replace(/    const previews: BillingPreviewRecord\[\] = \[\];([\s\S]*?)sourceRef = `work_orders:\$\{qty\}`;(.*?)      }/m, replacement);

fs.writeFileSync('src/services/billingRateService.ts', content);
