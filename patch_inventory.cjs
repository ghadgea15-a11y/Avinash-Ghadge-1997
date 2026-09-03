const fs = require('fs');

function replaceAll(file, search, replace) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.split(search).join(replace);
  fs.writeFileSync(file, content);
}

const invFile = 'src/components/screens/InventoryStockScreen.tsx';
let invContent = fs.readFileSync(invFile, 'utf8');

// Fix 213: curr.currentStock
invContent = invContent.replace(/curr\.currentStock \*/g, '(curr.currentStock || 0) *');
invContent = invContent.replace(/curr\.unitCost \*/g, '(curr.unitCost || 0) *');

// Fix 265, 266, 268: number | undefined to number
invContent = invContent.replace(/currentStock: item\.currentStock,/g, 'currentStock: item.currentStock || 0,');
invContent = invContent.replace(/minStockThreshold: item\.minStockThreshold,/g, 'minStockThreshold: item.minStockThreshold || 0,');
invContent = invContent.replace(/unitCost: item\.unitCost,/g, 'unitCost: item.unitCost || 0,');

// Fix 561
invContent = invContent.replace(/item\.currentStock \* item\.unitCost/g, '(item.currentStock || 0) * (item.unitCost || 0)');

// Fix 885, 886
invContent = invContent.replace(/item\.currentStock <= item\.minStockThreshold/g, '(item.currentStock || 0) <= (item.minStockThreshold || 0)');
invContent = invContent.replace(/item\.currentStock === 0/g, '(item.currentStock || 0) === 0');
invContent = invContent.replace(/item\.currentStock > 0/g, '(item.currentStock || 0) > 0');
invContent = invContent.replace(/{item\.currentStock} {item\.uom}/g, '{item.currentStock || 0} {item.uom}');

fs.writeFileSync(invFile, invContent);

const repFile = 'src/components/screens/ReportsAnalyticsScreen.tsx';
let repContent = fs.readFileSync(repFile, 'utf8');
repContent = repContent.replace(/curr\.currentStock \* curr\.unitCost/g, '(curr.currentStock || 0) * (curr.unitCost || 0)');
fs.writeFileSync(repFile, repContent);

const siteDashFile = 'src/components/screens/dashboards/SiteInChargeDashboard.tsx';
let siteDashContent = fs.readFileSync(siteDashFile, 'utf8');
siteDashContent = siteDashContent.replace(/i\.currentStock <= i\.minStockThreshold/g, '(i.currentStock || 0) <= (i.minStockThreshold || 0)');
fs.writeFileSync(siteDashFile, siteDashContent);

const adminDashFile = 'src/components/screens/dashboards/official/AdminDashboard.tsx';
let adminDashContent = fs.readFileSync(adminDashFile, 'utf8');
adminDashContent = adminDashContent.replace(/i\.currentStock <= i\.minStockThreshold/g, '(i.currentStock || 0) <= (i.minStockThreshold || 0)');
fs.writeFileSync(adminDashFile, adminDashContent);

const transferFile = 'src/services/transferService.ts';
let transferContent = fs.readFileSync(transferFile, 'utf8');
transferContent = transferContent.replace(/uom: l\.itemUom,/g, 'uom: l.itemUom || "",');
fs.writeFileSync(transferFile, transferContent);

console.log("Patched all TS errors.");
