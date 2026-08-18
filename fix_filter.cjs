const fs = require('fs');
let content = fs.readFileSync('src/components/crm/ContractRegisterTab.tsx', 'utf8');

const replacement = `
  const filteredContracts = contracts.filter(c => {
    const s = search.toLowerCase();
    const matchSearch = c.contractTitle.toLowerCase().includes(s) || c.contractNumber.toLowerCase().includes(s) || (clients[c.clientId] || '').toLowerCase().includes(s);
    if (!matchSearch) return false;
    
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    
    return true;
  });

  const handleSave = async (e: React.FormEvent) => {
`;

content = content.replace(/  const filteredContracts = contracts\.filter[\s\S]*?const handleSave = async/m, replacement);
fs.writeFileSync('src/components/crm/ContractRegisterTab.tsx', content);
