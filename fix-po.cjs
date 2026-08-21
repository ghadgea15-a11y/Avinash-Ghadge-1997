const fs = require('fs');
const file = 'src/types/index.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "items: PurchaseOrderLineItem[];",
  "items: PurchaseOrderLineItem[];\n  lineItems?: PurchaseOrderLineItem[];\n  approvalWorkflow?: any;\n  pdfUrl?: string;\n  billingAddress?: string;\n  subTotal?: number;\n  totalTax?: number;\n  vendorGst?: string;"
);

content = content.replace(
  "export interface PoLineItem {",
  "export interface PoLineItem {\n"
);
// wait, PoLineItem might be completely missing.
fs.writeFileSync(file, content);
