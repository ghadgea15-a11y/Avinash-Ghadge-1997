import * as fs from 'fs';

const types = 'src/types/index.ts';
let tContent = fs.readFileSync(types, 'utf8');
if (!tContent.includes("'THREE_WAY_MATCH'")) {
  tContent = tContent.replace(
    "| 'PURCHASE_ORDERS'",
    "| 'PURCHASE_ORDERS'\n  | 'THREE_WAY_MATCH'"
  );
  fs.writeFileSync(types, tContent);
}

const drawer = 'src/components/common/NavigationDrawer.tsx';
let dContent = fs.readFileSync(drawer, 'utf8');

if (!dContent.includes('THREE_WAY_MATCH')) {
  dContent = dContent.replace(
    '<NavItem icon={ShoppingCart} label="14.3 Purchase Orders" screen="PURCHASE_ORDERS" />',
    '<NavItem icon={ShoppingCart} label="14.3 Purchase Orders" screen="PURCHASE_ORDERS" />\n                <NavItem icon={Receipt} label="14.4 3-Way Match" screen="THREE_WAY_MATCH" />'
  );
  if (!dContent.includes('Receipt')) {
    dContent = dContent.replace('ShoppingCart,', 'ShoppingCart, Receipt,');
  }
  fs.writeFileSync(drawer, dContent);
}

const rail = 'src/components/common/TabletNavigationRail.tsx';
let rContent = fs.readFileSync(rail, 'utf8');

if (!rContent.includes('THREE_WAY_MATCH')) {
  rContent = rContent.replace(
    '<NavItem icon={ShoppingCart} label="POs" screen="PURCHASE_ORDERS" />',
    '<NavItem icon={ShoppingCart} label="POs" screen="PURCHASE_ORDERS" />\n        <NavItem icon={Receipt} label="3-Way Match" screen="THREE_WAY_MATCH" />'
  );
  if (!rContent.includes('Receipt')) {
    rContent = rContent.replace('ShoppingCart,', 'ShoppingCart, Receipt,');
  }
  fs.writeFileSync(rail, rContent);
}

const appFile = 'src/App.tsx';
let aContent = fs.readFileSync(appFile, 'utf8');

if (!aContent.includes("import { ThreeWayMatchScreen }")) {
  aContent = aContent.replace(
    "import { PurchaseOrderManagementScreen } from './components/screens/PurchaseOrderManagementScreen';",
    "import { PurchaseOrderManagementScreen } from './components/screens/PurchaseOrderManagementScreen';\nimport { ThreeWayMatchScreen } from './components/screens/ThreeWayMatchScreen';"
  );
}

if (!aContent.includes("currentScreen === 'THREE_WAY_MATCH'")) {
  const replacement = `                    {currentScreen === 'THREE_WAY_MATCH' && (
                      <ThreeWayMatchScreen
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
