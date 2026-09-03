const fs = require('fs');

let content = fs.readFileSync('src/server/authRoutes.ts', 'utf8');

const auditRoute = `
authRoutes.get('/admin/audit/:companyId', verifyToken, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const decodedToken = (req as any).user;

    if (!decodedToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const aLvl = decodedToken.aLvl;
    const cId = decodedToken.cId;

    if (aLvl > 1) {
      return res.status(403).json({ error: 'Forbidden: Requires A0 or A1' });
    }

    if (aLvl === 1 && cId !== companyId) {
      return res.status(403).json({ error: 'Forbidden: Cross-tenant access denied' });
    }

    const db = getAdminDb();
    
    // 1. Fetch data
    const [regionsSnap, sitesSnap, departmentsSnap, employeesSnap, usersSnap] = await Promise.all([
      db.collection('companies').doc(companyId).collection('regions').get(),
      db.collection('companies').doc(companyId).collection('sites').get(),
      db.collection('companies').doc(companyId).collection('departments').get(),
      db.collection('companies').doc(companyId).collection('employees').get(),
      db.collection('users').where('companyId', '==', companyId).get()
    ]);

    const regions = regionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const sites = sitesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const departments = departmentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const employees = employeesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Pre-fetch all user claims
    const auth = getAuth();
    const userClaimsMap = new Map<string, any>();
    
    // Batch fetch users if possible, or just list them. We have authUid in employees.
    const uids = employees.map(e => (e as any).authUid).filter(uid => uid);
    if (uids.length > 0) {
      // Chunking if many
      const chunkSize = 100;
      for (let i = 0; i < uids.length; i += chunkSize) {
        const chunk = uids.slice(i, i + chunkSize);
        const getResult = await auth.getUsers(chunk.map(uid => ({ uid })));
        getResult.users.forEach(userRecord => {
          userClaimsMap.set(userRecord.uid, userRecord.customClaims || {});
        });
      }
    }

    // Define results structure
    const results = {
      regionCheck: { status: 'PASS', fails: [] as string[] },
      siteCheck: { status: 'PASS', fails: [] as string[], warnings: [] as string[] },
      hierarchyLinkCheck: { status: 'PASS', fails: [] as string[] },
      departmentCheck: { status: 'PASS', fails: [] as string[] },
      claimsIntegrityCheck: { status: 'PASS', fails: [] as string[] },
      duplicateOrphanCheck: { status: 'PASS', fails: [] as string[], warnings: [] as string[] },
      pinCredentialCheck: { status: 'PASS', fails: [] as string[] },
      coverageSummary: {
        totalRegions: regions.length,
        totalSites: sites.length,
        totalDepartments: departments.length,
        totalA0: 0, totalA1: 0, totalA2: 0, totalA3: 0, totalA4: 0, totalA5: 0, totalA6: 0, totalA7: 0, totalA8: 0, totalA9: 0
      }
    };

    // Populate counts
    employees.forEach(emp => {
      const lvl = (emp as any).authorityLevel;
      if (lvl >= 0 && lvl <= 9) {
        (results.coverageSummary as any)[\`totalA\${lvl}\`] += 1;
      }
    });

    // 1. REGION CHECK
    // List all Regions. FAIL if any Region has zero Sites under it.
    // Highlight ANY Region without an A4 -> FAIL
    regions.forEach((r: any) => {
      const regionSites = sites.filter((s: any) => s.regionId === r.id);
      if (regionSites.length === 0) {
        results.regionCheck.fails.push(\`Region "\${r.name || r.id}" has no sites.\`);
      }
      const a4Count = employees.filter((e: any) => e.authorityLevel === 4 && e.assignedRegionId === r.id).length;
      if (a4Count === 0) {
        results.regionCheck.fails.push(\`Region "\${r.name || r.id}" has no A4 (Regional Manager) assigned.\`);
      }
    });
    if (results.regionCheck.fails.length > 0) results.regionCheck.status = 'FAIL';

    // 2. SITE CHECK
    // List all Sites. FAIL if any Site has: no A5, no A6. Warning if 0 A7-A9.
    sites.forEach((s: any) => {
      const a5Count = employees.filter((e: any) => e.authorityLevel === 5 && e.assignedSiteId === s.id).length;
      const a6Count = employees.filter((e: any) => e.authorityLevel === 6 && e.assignedSiteId === s.id).length;
      const workforceCount = employees.filter((e: any) => [7,8,9].includes(e.authorityLevel) && e.assignedSiteId === s.id).length;
      
      if (a5Count === 0) {
        results.siteCheck.fails.push(\`Site "\${s.name || s.id}" has no A5 (Site In-Charge) assigned.\`);
      }
      if (a6Count === 0) {
        results.siteCheck.fails.push(\`Site "\${s.name || s.id}" has no A6 (Supervisor) assigned.\`);
      }
      if (workforceCount === 0) {
        results.siteCheck.warnings.push(\`Site "\${s.name || s.id}" has no workforce (A7-A9) linked.\`);
      }
    });
    if (results.siteCheck.fails.length > 0) results.siteCheck.status = 'FAIL';
    else if (results.siteCheck.warnings.length > 0) results.siteCheck.status = 'WARNING';

    // 3. HIERARCHY LINK CHECK
    // A6: confirm sId and rId match a valid, existing Site/Region.
    // A7/A8/A9: confirm they are linked to a valid, existing A6 Supervisor at the SAME Site.
    employees.forEach((emp: any) => {
      const name = emp.firstName + ' ' + emp.lastName;
      if (emp.authorityLevel === 6) {
        if (!emp.assignedSiteId || !sites.find(s => s.id === emp.assignedSiteId)) {
          results.hierarchyLinkCheck.fails.push(\`A6 "\${name}" has invalid/missing Site (\${emp.assignedSiteId}).\`);
        }
        if (!emp.assignedRegionId || !regions.find(r => r.id === emp.assignedRegionId)) {
          results.hierarchyLinkCheck.fails.push(\`A6 "\${name}" has invalid/missing Region (\${emp.assignedRegionId}).\`);
        }
      }
      if ([7,8,9].includes(emp.authorityLevel)) {
        if (!emp.assignedSupervisorId) {
          results.hierarchyLinkCheck.fails.push(\`Workforce "\${name}" is missing an A6 Supervisor.\`);
        } else {
          const supervisor = employees.find(e => e.id === emp.assignedSupervisorId);
          if (!supervisor || supervisor.authorityLevel !== 6) {
            results.hierarchyLinkCheck.fails.push(\`Workforce "\${name}" is linked to invalid A6 Supervisor (\${emp.assignedSupervisorId}).\`);
          } else if (supervisor.assignedSiteId !== emp.assignedSiteId) {
            results.hierarchyLinkCheck.fails.push(\`Workforce "\${name}" (Site: \${emp.assignedSiteId}) has A6 Supervisor from a different Site (\${supervisor.assignedSiteId}).\`);
          }
        }
      }
    });
    if (results.hierarchyLinkCheck.fails.length > 0) results.hierarchyLinkCheck.status = 'FAIL';

    // 4. DEPARTMENT CHECK
    // A3 Official: confirm a valid dId (department) is assigned from approved list
    const approvedDepts = ['HR', 'FINANCE', 'ADMIN', 'PROCUREMENT', 'EHS', 'QUALITY'];
    employees.forEach((emp: any) => {
      if (emp.authorityLevel === 3) {
        if (!emp.assignedDepartmentId) {
           results.departmentCheck.fails.push(\`A3 "\${emp.firstName} \${emp.lastName}" is missing a Department.\`);
        } else if (!departments.find(d => d.id === emp.assignedDepartmentId)) {
           // Maybe it's stored as code or something? Let's assume assignedDepartmentId refers to department document ID.
           // Or the department itself doesn't exist in DB.
           const isNameApproved = approvedDepts.includes(emp.assignedDepartmentId.toUpperCase()) || 
                                  departments.some(d => d.id === emp.assignedDepartmentId && approvedDepts.includes((d.name || d.code || '').toUpperCase()));
           if (!isNameApproved) {
               results.departmentCheck.fails.push(\`A3 "\${emp.firstName} \${emp.lastName}" has an invalid/unapproved Department (\${emp.assignedDepartmentId}).\`);
           }
        }
      }
    });
    if (results.departmentCheck.fails.length > 0) results.departmentCheck.status = 'FAIL';

    // 5. CLAIMS INTEGRITY CHECK
    employees.forEach((emp: any) => {
      const name = emp.firstName + ' ' + emp.lastName;
      if (emp.authUid) {
        const claims = userClaimsMap.get(emp.authUid);
        if (!claims) {
           results.claimsIntegrityCheck.fails.push(\`Employee "\${name}" has authUid but no user record/claims found in Firebase Auth.\`);
        } else {
           if (claims.cId !== companyId) results.claimsIntegrityCheck.fails.push(\`Claims mismatch for "\${name}": cId\`);
           if (claims.aLvl !== emp.authorityLevel) results.claimsIntegrityCheck.fails.push(\`Claims mismatch for "\${name}": aLvl (\${claims.aLvl} vs \${emp.authorityLevel})\`);
           if (emp.assignedRegionId && claims.rId !== emp.assignedRegionId) results.claimsIntegrityCheck.fails.push(\`Claims mismatch for "\${name}": rId\`);
           if (emp.assignedSiteId && claims.sId !== emp.assignedSiteId) results.claimsIntegrityCheck.fails.push(\`Claims mismatch for "\${name}": sId\`);
           if (emp.assignedDepartmentId && claims.dId !== emp.assignedDepartmentId) results.claimsIntegrityCheck.fails.push(\`Claims mismatch for "\${name}": dId\`);
        }
      }
    });
    if (results.claimsIntegrityCheck.fails.length > 0) results.claimsIntegrityCheck.status = 'FAIL';

    // 6. DUPLICATE / ORPHAN CHECK
    const mobileCounts: Record<string, number> = {};
    employees.forEach((emp: any) => {
       if (emp.phone) {
         mobileCounts[emp.phone] = (mobileCounts[emp.phone] || 0) + 1;
       }
    });
    employees.forEach((emp: any) => {
       const name = emp.firstName + ' ' + emp.lastName;
       if (emp.phone && mobileCounts[emp.phone] > 1) {
          if (!results.duplicateOrphanCheck.fails.includes(\`Duplicate mobile \${emp.phone}\`)) {
             results.duplicateOrphanCheck.fails.push(\`Duplicate mobile \${emp.phone} found across employees.\`);
          }
       }
       if (emp.companyId !== companyId) {
          results.duplicateOrphanCheck.fails.push(\`Employee "\${name}" has missing/mismatched cId.\`);
       }
       // Scope checks
       if ([4].includes(emp.authorityLevel) && !emp.assignedRegionId) {
          results.duplicateOrphanCheck.fails.push(\`A4 "\${name}" missing Region Scope.\`);
       }
       if ([5,6,7,8,9].includes(emp.authorityLevel) && !emp.assignedSiteId) {
          results.duplicateOrphanCheck.fails.push(\`A\${emp.authorityLevel} "\${name}" missing Site Scope.\`);
       }
    });
    if (results.duplicateOrphanCheck.fails.length > 0) results.duplicateOrphanCheck.status = 'FAIL';

    // 7. PIN / CREDENTIAL CHECK
    employees.forEach((emp: any) => {
       const name = emp.firstName + ' ' + emp.lastName;
       if (!emp.authUid) {
          results.pinCredentialCheck.fails.push(\`Employee "\${name}" lacks a usable login credential (authUid).\`);
       }
    });
    if (results.pinCredentialCheck.fails.length > 0) results.pinCredentialCheck.status = 'FAIL';

    res.json(results);
  } catch (err: any) {
    console.error('Error during audit:', err);
    res.status(500).json({ error: err.message });
  }
});
`;

if (!content.includes('/admin/audit/:companyId')) {
  // Add it before the export or at the end
  content = content + '\n\n' + auditRoute;
  fs.writeFileSync('src/server/authRoutes.ts', content);
  console.log("Patched authRoutes.ts");
} else {
  console.log("Already patched");
}
