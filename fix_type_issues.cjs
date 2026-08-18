const fs = require('fs');
let code = fs.readFileSync('src/types/index.ts', 'utf8');

// Remove transferOrderId from where it shouldn't be
code = code.replace(
  "  evidenceUrls?: string[];\n  transferOrderId?: string;\n  reason?: string;\n}",
  "  evidenceUrls?: string[];\n  reason?: string;\n}"
);

// Add to GatePassRecord safely
code = code.replace(
  "  evidenceUrls?: string[];\n  \n  createdAt: string;",
  "  evidenceUrls?: string[];\n  transferOrderId?: string;\n  createdAt: string;"
);

fs.writeFileSync('src/types/index.ts', code);

// Fix transferService.ts
let trCode = fs.readFileSync('src/services/transferService.ts', 'utf8');

trCode = trCode.replace(
  "lines: transfer.lines.map(l => ({ itemId: l.itemId, itemName: l.itemName, quantity: l.dispatchedQuantity || 0 })),",
  "lines: transfer.lines.map(l => ({ itemId: l.itemId, itemName: l.itemName, itemCode: 'NA', unit: l.unitOfMeasure, quantity: l.dispatchedQuantity || 0 })),"
);

trCode = trCode.replace(
  "let finalStatus = transfer.status;",
  "let finalStatus: import('../types').TransferOrderStatus = transfer.status;"
);

fs.writeFileSync('src/services/transferService.ts', trCode);
