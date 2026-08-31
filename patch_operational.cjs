const fs = require('fs');
const file = 'src/services/operationalIntelligenceEngine.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Add daily_site_logs to Promise.all
code = code.replace(/patrolAnomaliesSnap\n    \] = await Promise\.all\(\[/, `patrolAnomaliesSnap,\n      dailySiteLogsSnap\n    ] = await Promise.all([`);

code = code.replace(/getDocs\(collection\(db, \`companies\/\$\{companyId\}\/suspicious_patrol_scans\`\)\)/, `getDocs(collection(db, \`companies/\${companyId}/suspicious_patrol_scans\`)),\n      getDocs(collection(db, \`companies/\${companyId}/daily_site_logs\`))`);

// 2. Add const dailySiteLogs
code = code.replace(/const patrolAnomalies.*?;/, `const patrolAnomalies: any[] = patrolAnomaliesSnap.docs.map(d => ({ id: d.id, ...d.data() }));\n    const dailySiteLogs: any[] = dailySiteLogsSnap.docs.map(d => ({ id: d.id, ...d.data() }));`);

// 3. Add to node loop
const anomalyLogic = `
      // 8. INCIDENT & DAILY LOG DISCREPANCY DETECTOR (Cross-Referencing)
      if (node.level === 'SITE') {
        const siteDailyLogs = dailySiteLogs.filter(l => l.siteId === node.id);
        const siteIncidents = incidents.filter(i => i.siteId === node.id);
        
        siteDailyLogs.forEach(log => {
          if (!log.date) return;
          // Extract date part (YYYY-MM-DD)
          const logDateStr = typeof log.date === 'string' && log.date.includes('T') ? log.date.split('T')[0] : log.date;
          
          // Count incidents for this specific site and date
          const incidentsOnDate = siteIncidents.filter(inc => {
             const incDate = inc.date || inc.incidentDate || inc.createdAt;
             if (!incDate) return false;
             const incDateStr = typeof incDate === 'string' && incDate.includes('T') ? incDate.split('T')[0] : incDate;
             return incDateStr === logDateStr;
          });
          
          // Check for discrepancies: Daily Log reports a different number of incidents than what actually exists in Incident Reports
          const reportedInLog = log.totalIncidentsReported || 0;
          const actualIncidents = incidentsOnDate.length;
          
          if (reportedInLog !== actualIncidents) {
            nodeAnomalies.push({
              id: 'DISC_' + log.id,
              type: 'SECURITY_ANOMALY',
              severity: 'HIGH',
              title: 'Incident & Daily Log Discrepancy',
              description: \`Cross-reference mismatch on \${logDateStr}: Daily Log reported \${reportedInLog} incidents, but \${actualIncidents} official incident reports exist for this site.\`,
              detectedAt: new Date().toISOString(),
              resourceId: log.id,
              resourceType: 'SITE_OPERATIONS',
              financialImpact: 0,
              metricsContext: {
                 reported: reportedInLog,
                 actual: actualIncidents,
                 date: logDateStr
              }
            });
          }
        });
      }
`;

code = code.replace(/\/\/ Re-calculate Risk Score based on real anomaly weights/, anomalyLogic + '\n      // Re-calculate Risk Score based on real anomaly weights');

fs.writeFileSync(file, code, 'utf8');
console.log('patched');
