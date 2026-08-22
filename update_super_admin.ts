import * as fs from 'fs';

let content = fs.readFileSync('src/services/superAdminService.ts', 'utf8');

const regex = /const tenantId = doc\(collection\(db, this\.TENANTS_COLLECTION\)\)\.id;[\s\S]*?updatedAt: Timestamp\.now\(\)\n    \};/;

const replacement = `    const tenantId = companyCode; // Use company code as the Document ID for legacy compatibility
    
    // Merge new Platform schema with legacy index.ts schema requirements
    const tenant = {
      id: tenantId,
      companyId: tenantId,
      companyCode,
      name: data.name,
      companyLegalName: data.name,
      brandName: data.name,
      subscriptionPlan: data.subscriptionPlan,
      licenseTier: data.subscriptionPlan,
      enabledModules: data.enabledModules,
      status: 'ACTIVE', // Automatically active to simplify provisioning for tests
      adminEmail: data.adminEmail,
      maxEmployees: data.maxEmployees,
      maxEmployeesAllowed: data.maxEmployees,
      maxSites: data.maxSites,
      maxSitesAllowed: data.maxSites,
      primaryColorHex: '#4f46e5',
      secondaryColorHex: '#06b6d4',
      allowedBranches: ['MAIN'],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };`;

content = content.replace(regex, replacement);

fs.writeFileSync('src/services/superAdminService.ts', content, 'utf8');
