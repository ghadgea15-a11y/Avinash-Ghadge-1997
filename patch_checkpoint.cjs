const fs = require('fs');

let file = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf8');

// Fix handleSaveCheckpoint
file = file.replace(
  '    if (!companyId || !checkpointForm.checkpointName || !checkpointForm.siteId) {\n      setStatusMsg({ type: \'ERROR\', text: \'Checkpoint name and Site selection required.\' });\n      return;\n    }\n    const code = checkpointForm.code || `CP-${Math.floor(100 + Math.random() * 900)}`;\n    const newCp: PatrolCheckpointRecord = {\n      id: `CP-${Date.now()}`,\n      companyId,\n      siteId: checkpointForm.siteId,',
  `    const finalSiteId = checkpointForm.siteId || (selectedSiteId !== 'ALL' ? selectedSiteId : sites[0]?.id);\n    if (!companyId || !checkpointForm.checkpointName || !finalSiteId) {\n      setStatusMsg({ type: 'ERROR', text: 'Checkpoint name and Site selection required.' });\n      return;\n    }\n    const code = checkpointForm.code || \`CP-\${Math.floor(100 + Math.random() * 900)}\`;\n    const newCp: PatrolCheckpointRecord = {\n      id: \`CP-\${Date.now()}\`,\n      companyId,\n      siteId: finalSiteId,`
);

// Fix modal opening to pre-fill selected site
file = file.replace(
  'onClick={() => setIsCheckpointModalOpen(true)}',
  'onClick={() => { setCheckpointForm(prev => ({ ...prev, siteId: selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || "") })); setIsCheckpointModalOpen(true); }}'
);

// Fix the select dropdown visually so it maps empty string to a prompt if no site is selected
file = file.replace(
  '{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}',
  '<option value="">-- Select a Site --</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}'
);


fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', file);
console.log('Checkpoint bug patched');
