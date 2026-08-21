import * as fs from 'fs';

const types = 'src/types/index.ts';
let tContent = fs.readFileSync(types, 'utf8');
if (!tContent.includes("'PURCHASE_ORDERS'")) {
  tContent = tContent.replace(
    "| 'RFQ_MANAGEMENT'",
    "| 'RFQ_MANAGEMENT'\n  | 'PURCHASE_ORDERS'"
  );
  fs.writeFileSync(types, tContent);
}

const drawer = 'src/components/common/NavigationDrawer.tsx';
let dContent = fs.readFileSync(drawer, 'utf8');

if (!dContent.includes('PURCHASE_ORDERS')) {
  dContent = dContent.replace(
    '<NavItem icon={FileSignature} label="14.2 RFQ Management" screen="RFQ_MANAGEMENT" />',
    '<NavItem icon={FileSignature} label="14.2 RFQ Management" screen="RFQ_MANAGEMENT" />\n                <NavItem icon={ShoppingCart} label="14.3 Purchase Orders" screen="PURCHASE_ORDERS" />'
  );
  if (!dContent.includes('ShoppingCart')) {
    dContent = dContent.replace('FileSignature,', 'FileSignature, ShoppingCart,');
  }
  fs.writeFileSync(drawer, dContent);
}

const rail = 'src/components/common/TabletNavigationRail.tsx';
let rContent = fs.readFileSync(rail, 'utf8');

if (!rContent.includes('PURCHASE_ORDERS')) {
  rContent = rContent.replace(
    '<NavItem icon={FileSignature} label="RFQs" screen="RFQ_MANAGEMENT" />',
    '<NavItem icon={FileSignature} label="RFQs" screen="RFQ_MANAGEMENT" />\n        <NavItem icon={ShoppingCart} label="POs" screen="PURCHASE_ORDERS" />'
  );
  if (!rContent.includes('ShoppingCart')) {
    rContent = rContent.replace('FileSignature,', 'FileSignature, ShoppingCart,');
  }
  fs.writeFileSync(rail, rContent);
}

const appFile = 'src/App.tsx';
let aContent = fs.readFileSync(appFile, 'utf8');

if (!aContent.includes("import { PurchaseOrderManagementScreen }")) {
  aContent = aContent.replace(
    "import { RfqManagementScreen } from './components/screens/RfqManagementScreen';",
    "import { RfqManagementScreen } from './components/screens/RfqManagementScreen';\nimport { PurchaseOrderManagementScreen } from './components/screens/PurchaseOrderManagementScreen';"
  );
}

if (!aContent.includes("currentScreen === 'PURCHASE_ORDERS'")) {
  const replacement = `                    {currentScreen === 'PURCHASE_ORDERS' && (
                      <PurchaseOrderManagementScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                        onNavigate={setCurrentScreen}
                      />
                    )}
                    {currentScreen === 'PROCUREMENT_SRM' && (`;
  
  aContent = aContent.replace("{currentScreen === 'PROCUREMENT_SRM' && (", replacement);
}
fs.writeFileSync(appFile, aContent);

console.log('Updated Navs and App');
