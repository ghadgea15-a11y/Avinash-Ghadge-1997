import * as fs from 'fs';

const drawer = 'src/components/common/NavigationDrawer.tsx';
let dContent = fs.readFileSync(drawer, 'utf8');

if (!dContent.includes('RFQ_MANAGEMENT')) {
  dContent = dContent.replace(
    '<NavItem icon={Building2} label="14.1 Vendor Management" screen="VENDOR_MANAGEMENT" />',
    '<NavItem icon={Building2} label="14.1 Vendor Management" screen="VENDOR_MANAGEMENT" />\n                <NavItem icon={FileSignature} label="14.2 RFQ Management" screen="RFQ_MANAGEMENT" />'
  );
  if (!dContent.includes('FileSignature')) {
    dContent = dContent.replace('Building2,', 'Building2, FileSignature,');
  }
  fs.writeFileSync(drawer, dContent);
}

const rail = 'src/components/common/TabletNavigationRail.tsx';
let rContent = fs.readFileSync(rail, 'utf8');

if (!rContent.includes('RFQ_MANAGEMENT')) {
  rContent = rContent.replace(
    '<NavItem icon={Building2} label="Vendors" screen="VENDOR_MANAGEMENT" />',
    '<NavItem icon={Building2} label="Vendors" screen="VENDOR_MANAGEMENT" />\n        <NavItem icon={FileSignature} label="RFQs" screen="RFQ_MANAGEMENT" />'
  );
  if (!rContent.includes('FileSignature')) {
    rContent = rContent.replace('Building2,', 'Building2, FileSignature,');
  }
  fs.writeFileSync(rail, rContent);
}

const types = 'src/types/index.ts';
let tContent = fs.readFileSync(types, 'utf8');
if (!tContent.includes("'RFQ_MANAGEMENT'")) {
  tContent = tContent.replace(
    "| 'VENDOR_MANAGEMENT'",
    "| 'VENDOR_MANAGEMENT'\n  | 'RFQ_MANAGEMENT'"
  );
  fs.writeFileSync(types, tContent);
}

console.log('Updated Navs');
