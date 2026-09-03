const fs = require('fs');
let content = fs.readFileSync('src/services/operationalIntelligenceEngine.ts', 'utf8');

// Ensure import
if (!content.includes("VisitorLogRecord")) {
  content = content.replace(
    "  InventoryItemRecord\n}",
    "  InventoryItemRecord,\n  VisitorLogRecord\n}"
  );
}

// Ensure fetch visitor_logs
if (!content.includes("getDocs(collection(db, `companies/${companyId}/visitor_logs`))")) {
  content = content.replace(
    "getDocs(collection(db, `companies/${companyId}/daily_site_logs`))",
    "getDocs(collection(db, `companies/${companyId}/daily_site_logs`)),\n      getDocs(collection(db, `companies/${companyId}/visitor_logs`))"
  );
  
  content = content.replace(
    "dailySiteLogsSnap\n    ] = await Promise.all([",
    "dailySiteLogsSnap,\n      visitorLogsSnap\n    ] = await Promise.all(["
  );
}

if (!content.includes("const visitors:")) {
  content = content.replace(
    "const incidents: IncidentReportRecord[] = incidentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as IncidentReportRecord));",
    "const incidents: IncidentReportRecord[] = incidentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as IncidentReportRecord));\n    const visitors: VisitorLogRecord[] = visitorLogsSnap ? visitorLogsSnap.docs.map(d => ({ id: d.id, ...d.data() } as VisitorLogRecord)) : [];"
  );
}

// Add visitor metrics processing
const visitorProcessing = `
    // Add Visitor metrics
    let activeVisitorsCount = 0;
    let totalVisitorsCount = 0;
    visitors.forEach(vis => {
      totalVisitorsCount++;
      if (vis.status === 'CHECKED_IN' || vis.status === 'IN_SITE') activeVisitorsCount++;
      
      const siteId = vis.siteId;
      if (siteId && metricsBySite[siteId]) {
        if (!metricsBySite[siteId].visitorCount) metricsBySite[siteId].visitorCount = 0;
        metricsBySite[siteId].visitorCount++;
      }
    });

    if (totalVisitorsCount > 100) {
      anomalies.push({
        id: 'ANOM-VIS-' + Date.now(),
        type: 'UNAUTHORIZED_ACCESS',
        severity: 'MEDIUM',
        title: 'High Visitor Traffic Detected',
        description: 'Total visitors recorded exceed normal threshold.',
        siteId: 'Various',
        detectedAt: new Date().toISOString(),
        status: 'OPEN',
        relatedRecordId: 'visitor_logs'
      });
    }
`;

if (!content.includes("activeVisitorsCount = 0")) {
  content = content.replace(
    "// 4. INCIDENT SPIKE DETECTOR",
    `${visitorProcessing}\n\n      // 4. INCIDENT SPIKE DETECTOR`
  );
  fs.writeFileSync('src/services/operationalIntelligenceEngine.ts', content);
  console.log("Patched operationalIntelligenceEngine.ts with Visitors");
}
