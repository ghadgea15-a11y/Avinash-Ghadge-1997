const fs = require('fs');
let code = fs.readFileSync('src/components/screens/SuperAdminDashboard.tsx', 'utf8');

const logic = `
  const filteredCompanies = companies.filter(c => 
    c.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.companyId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.companyLegalName && c.companyLegalName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const paginatedCompanies = filteredCompanies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
`;

code = code.replace(
  /  const filteredCompanies = companies\.filter\(c => [\s\S]*?  \);/,
  logic
);

fs.writeFileSync('src/components/screens/SuperAdminDashboard.tsx', code);
