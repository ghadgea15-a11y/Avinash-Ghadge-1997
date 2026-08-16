const fs = require('fs');

let code = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf8');

// We also need StorageService imported.
if (!code.includes('StorageService')) {
  code = code.replace(/import \{ FirestoreService \} from '\.\.\/\.\.\/services\/firestoreService';/, 
  `import { FirestoreService } from '../../services/firestoreService';\nimport { StorageService } from '../../services/storageService';`);
}

const saveLogicRegex = /const newInc: IncidentReportRecord = \{[\s\S]*?const ok = await FirestoreService\.saveIncidentReport\(companyId, newInc\);\s*setIsLoading\(false\);/;

const replacement = `const incId = incidentForm.id || \`INC-\$\{Date.now()\}\`;
    let uploadedPhotoUrls: string[] = [];
    
    setIsLoading(true);
    
    if (incidentForm.photoFile && isOnline) {
      try {
        const path = \`companies/\$\{companyId\}/incidents/\$\{incId\}/\$\{incidentForm.photoFile.name\}\`;
        const url = await StorageService.uploadFile(path, incidentForm.photoFile);
        uploadedPhotoUrls.push(url);
      } catch (err) {
        setStatusMsg({ type: 'ERROR', text: 'Failed to upload photo.' });
        setIsLoading(false);
        return;
      }
    }

    const newInc: IncidentReportRecord = {
      id: incId,
      companyId,
      siteId: incidentForm.siteId || (selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || "")),
      siteName: siteObj?.name || 'Main Site',
      reportedById: userSession.employeeId,
      reportedByName: userSession.fullName,
      type: incidentForm.type,
      title: incidentForm.title.trim(),
      behaviorCategory: incidentForm.behaviorCategory,
      slaDeadline: incidentForm.slaDeadline,
      category: incidentForm.category,
      severity: incidentForm.severity,
      description: incidentForm.description.trim(),
      status: incidentForm.type === 'BBS_OBSERVATION' ? 'RECORDED' : 'OPEN',
      photoUrls: uploadedPhotoUrls,
      reportedAt: new Date().toISOString()
    };

    if (!isOnline) {
      OfflineSyncService.queueAction('INCIDENT_REPORT', { companyId, data: newInc });
      setIsIncidentModalOpen(false);
      setStatusMsg({ type: 'INFO', text: 'Offline: Incident Report queued for sync.' });
      setIsLoading(false);
      return;
    }
    
    const ok = await FirestoreService.saveIncidentReport(companyId, newInc);
    
    if (ok && newInc.severity === 'CRITICAL' && !incidentForm.id) {
       // Only notify on creation
       await FirestoreService.createNotification({
          id: \`NOTIF-\$\{Date.now()\}\`,
          title: 'CRITICAL INCIDENT REPORTED',
          message: \`\$\{newInc.title\} at \$\{newInc.siteName\}\`,
          type: 'ALERT',
          timestamp: new Date().toISOString(),
          isRead: false,
          siteId: newInc.siteId
       });
    }
    
    setIsLoading(false);`;

code = code.replace(saveLogicRegex, replacement);

fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', code);
