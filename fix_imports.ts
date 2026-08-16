import * as fs from 'fs';

let content = fs.readFileSync('src/components/screens/dashboards/SiteInChargeDashboard.tsx', 'utf-8');

content = content.replace(
  "MaterialMovementRecord, AssetRecord, InventoryItemRecord, PatrolLogRecord",
  "MaterialMovementRecord, AssetRecord, InventoryItemRecord, PatrolLogRecord, TaskRecord, DailySiteLogRecord"
);

content = content.replace(
  "import { Users, Building, Shield, Clock, AlertTriangle, Truck, UserCheck, HardDrive, Package, CheckSquare } from 'lucide-react';",
  "import { Users, Building, Shield, Clock, AlertTriangle, Truck, UserCheck, HardDrive, Package, CheckSquare, AlertCircle, ClipboardList } from 'lucide-react';"
);

fs.writeFileSync('src/components/screens/dashboards/SiteInChargeDashboard.tsx', content);
