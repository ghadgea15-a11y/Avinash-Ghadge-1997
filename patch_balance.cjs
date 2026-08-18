const fs = require('fs');
let code = fs.readFileSync('src/types/index.ts', 'utf8');

code += `
export interface StockBalanceRecord {
  id: string; // usually \`\${locationId}_\${itemId}\`
  companyId: string;
  locationId: string;
  itemId: string;
  quantity: number;
  reservedQuantity?: number;
  lastUpdatedAt: string;
}
`;
fs.writeFileSync('src/types/index.ts', code);
