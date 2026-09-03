const fs = require('fs');

let content = fs.readFileSync('src/services/operationalIntelligenceEngine.ts', 'utf8');

// Replace the bad block
const badBlock = `    // Add Visitor metrics
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
    }`;

if (content.includes(badBlock)) {
  const replacement = `
      // Visitor metrics mapped per node
      let nodeActiveVisitors = 0;
      let nodeTotalVisitors = 0;
      visitors.filter(v => v.siteId === node.id || v.assignedBranchId === node.id || v.assignedRegionId === node.id).forEach(vis => {
        nodeTotalVisitors++;
        if (vis.status === 'CHECKED_IN' || vis.status === 'IN_SITE') nodeActiveVisitors++;
      });
      // Attach to node metrics if we want to extend the interface, else just push anomaly if needed
      if (nodeTotalVisitors > 100) {
        nodeAnomalies.push({
          id: 'ANOM-VIS-' + node.id + '-' + Date.now(),
          type: 'UNAUTHORIZED_ACCESS',
          severity: 'MEDIUM',
          title: 'High Visitor Traffic Detected',
          description: \`\${nodeTotalVisitors} visitors recorded exceed normal threshold for \${node.name}.\`,
          entityLevel: node.level,
          entityId: node.id,
          entityName: node.name,
          metricName: 'Total Visitors',
          currentValue: nodeTotalVisitors,
          baselineValue: 50,
          deviationPercent: Math.round(((nodeTotalVisitors - 50) / 50) * 100),
          financialImpact: 0,
          rootCause: 'Unusual spike in physical site visits.',
          recommendedAction: 'Verify entry logs and enforce strict badge access.',
          sourceTransactionCount: nodeTotalVisitors,
          sourceTransactions: [],
          timestamp: new Date().toISOString()
        });
      }
  `;
  content = content.replace(badBlock, replacement);
  fs.writeFileSync('src/services/operationalIntelligenceEngine.ts', content);
  console.log("Patched visitor logic inside loop");
} else {
  console.log("Bad block not found");
}

