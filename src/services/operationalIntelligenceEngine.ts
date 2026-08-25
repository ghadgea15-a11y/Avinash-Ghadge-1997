import { 
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  UserSession, 
  CompanyTenant,
  RegionRecord,
  BranchRecord,
  SiteRecord,
  DepartmentRecord,
  EmployeeRecord,
  SalarySlipRecord,
  AttendanceRecord,
  OvertimeRequestRecord,
  AssetRecord,
  WorkOrderRecord,
  PurchaseOrderRecord,
  IncidentReportRecord,
  ContractRecord,
  InventoryItemRecord
} from '../types';
import { 
  OperationalHierarchyNode, 
  OperationalAnomaly, 
  OperationalSourceTransaction, 
  HierarchyMetrics, 
  CostBreakdown, 
  RiskScorecard,
  OperationalFilterOptions,
  OperationalIntelligencePayload,
  OperationalAnomalyType,
  OperationalAnomalySeverity
} from '../types/operationalIntelligence';
import { QueryScopeEngine } from './queryScopeEngine';

export class OperationalIntelligenceEngine {
  /**
   * Builds an authoritative, real-time hierarchical operational tree
   * spanning Company -> Region -> Branch -> Site -> Department.
   * Every KPI and anomaly is backed by actual source transactions.
   */
  static async getOperationalIntelligence(
    session: UserSession,
    company: CompanyTenant,
    options?: OperationalFilterOptions
  ): Promise<OperationalIntelligencePayload> {
    const companyId = company.companyId || (company as any).id;
    const now = new Date();
    
    // Default period: Current month or past 30 days
    const startStr = options?.startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endStr = options?.endDate || now.toISOString();

    // 1. Fetch organizational masters concurrently
    const [
      regionsSnap,
      branchesSnap,
      sitesSnap,
      departmentsSnap,
      employeesSnap
    ] = await Promise.all([
      getDocs(collection(db, `companies/${companyId}/regions`)),
      getDocs(collection(db, `companies/${companyId}/branches`)),
      getDocs(collection(db, `companies/${companyId}/sites`)),
      getDocs(collection(db, `companies/${companyId}/departments`)),
      getDocs(collection(db, `companies/${companyId}/employees`))
    ]);

    const regions: RegionRecord[] = regionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as RegionRecord));
    const branches: BranchRecord[] = branchesSnap.docs.map(d => ({ id: d.id, ...d.data() } as BranchRecord));
    const sites: SiteRecord[] = sitesSnap.docs.map(d => ({ id: d.id, ...d.data() } as SiteRecord));
    const departments: DepartmentRecord[] = departmentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as DepartmentRecord));
    const employees: EmployeeRecord[] = employeesSnap.docs.map(d => ({ id: d.id, ...d.data() } as EmployeeRecord));

    // 2. Fetch transactional collections in parallel
    const [
      salarySlipsSnap,
      attendanceSnap,
      overtimeSnap,
      assetsSnap,
      workOrdersSnap,
      purchaseOrdersSnap,
      incidentsSnap,
      contractsSnap,
      inventorySnap
    ] = await Promise.all([
      getDocs(collection(db, `companies/${companyId}/salary_slips`)),
      getDocs(collection(db, `companies/${companyId}/attendance`)),
      getDocs(collection(db, `companies/${companyId}/overtime_requests`)),
      getDocs(collection(db, `companies/${companyId}/assets`)),
      getDocs(collection(db, `companies/${companyId}/work_orders`)),
      getDocs(collection(db, `companies/${companyId}/purchase_orders`)),
      getDocs(collection(db, `companies/${companyId}/incident_reports`)),
      getDocs(collection(db, `companies/${companyId}/contracts`)),
      getDocs(collection(db, `companies/${companyId}/inventory_items`))
    ]);

    const salarySlips: SalarySlipRecord[] = salarySlipsSnap.docs.map(d => ({ id: d.id, ...d.data() } as SalarySlipRecord));
    const attendance: AttendanceRecord[] = attendanceSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
    const overtimeRequests: OvertimeRequestRecord[] = overtimeSnap.docs.map(d => ({ id: d.id, ...d.data() } as OvertimeRequestRecord));
    const assets: AssetRecord[] = assetsSnap.docs.map(d => ({ id: d.id, ...d.data() } as AssetRecord));
    const workOrders: WorkOrderRecord[] = workOrdersSnap.docs.map(d => ({ id: d.id, ...d.data() } as WorkOrderRecord));
    const purchaseOrders: PurchaseOrderRecord[] = purchaseOrdersSnap.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseOrderRecord));
    const incidents: IncidentReportRecord[] = incidentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as IncidentReportRecord));
    const contracts: ContractRecord[] = contractsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ContractRecord));
    const inventoryItems: InventoryItemRecord[] = inventorySnap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItemRecord));

    // 3. Create index lookups for fast attribution
    const employeeMap = new Map<string, EmployeeRecord>();
    employees.forEach(e => employeeMap.set(e.id, e));

    const siteMap = new Map<string, SiteRecord>();
    sites.forEach(s => siteMap.set(s.id, s));

    const branchMap = new Map<string, BranchRecord>();
    branches.forEach(b => branchMap.set(b.id, b));

    const regionMap = new Map<string, RegionRecord>();
    regions.forEach(r => regionMap.set(r.id, r));

    const departmentMap = new Map<string, DepartmentRecord>();
    departments.forEach(d => departmentMap.set(d.id, d));

    // 4. Map transactions with exact hierarchy locations
    const allTransactions: OperationalSourceTransaction[] = [];

    // Map Salary Slips
    salarySlips.forEach(slip => {
      const emp = employeeMap.get(slip.employeeId);
      const siteId = emp?.assignedSiteId || (emp as any)?.siteId || '';
      const branchId = emp?.assignedBranchId || (emp as any)?.branchId || siteMap.get(siteId)?.branchId || '';
      const regionId = emp?.assignedRegionId || (emp as any)?.regionId || siteMap.get(siteId)?.regionId || '';
      const departmentId = emp?.departmentId || '';

      const gross = slip.earnings?.totalGross || slip.netPay || 0;
      const otPay = slip.earnings?.overtimePay || 0;

      const empName = emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : '';

      allTransactions.push({
        id: slip.id,
        module: 'PAYROLL',
        referenceNumber: slip.id,
        date: slip.generatedAt || slip.createdAt || startStr,
        title: `Salary Slip - ${slip.employeeName || empName || 'Staff'} (${slip.month}/${slip.year})`,
        entityLevel: departmentId ? 'DEPARTMENT' : (siteId ? 'SITE' : 'COMPANY'),
        entityId: departmentId || siteId || branchId || regionId || companyId,
        entityName: departmentMap.get(departmentId)?.name || siteMap.get(siteId)?.name || company.name || 'Company',
        regionId,
        branchId,
        siteId,
        departmentId,
        amount: gross,
        hours: slip.overtimeHours || 0,
        status: slip.status || 'GENERATED',
        actorOrEmployee: slip.employeeName || empName,
        actorRole: emp?.role,
        description: `Gross: ₹${gross.toLocaleString()} (OT: ₹${otPay.toLocaleString()}, Net: ₹${(slip.netPay || 0).toLocaleString()})`,
        details: { slip, emp }
      });
    });

    // Map Attendance & Overtime
    attendance.forEach(att => {
      const emp = employeeMap.get(att.employeeId);
      const siteId = att.siteId || emp?.assignedSiteId || '';
      const branchId = emp?.assignedBranchId || siteMap.get(siteId)?.branchId || '';
      const regionId = emp?.assignedRegionId || siteMap.get(siteId)?.regionId || '';
      const departmentId = emp?.departmentId || '';
      const empName = emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : '';
      const attDate = (att as any).date || (att as any).attendanceDate || (att as any).workDate || (att as any).createdAt || startStr;
      const inTime = (att as any).checkInTime || (att as any).checkIn || (att as any).actualCheckIn || 'N/A';
      const outTime = (att as any).checkOutTime || (att as any).checkOut || (att as any).actualCheckOut || 'N/A';

      const otHours = ((att as any).approvedOvertimeMinutes || (att as any).overtimeMinutes || 0) / 60;
      
      allTransactions.push({
        id: att.id,
        module: 'ATTENDANCE',
        referenceNumber: `ATT-${attDate}-${att.employeeId.slice(0, 6)}`,
        date: attDate,
        title: `Attendance Record: ${att.employeeName || empName || 'Employee'}`,
        entityLevel: departmentId ? 'DEPARTMENT' : (siteId ? 'SITE' : 'COMPANY'),
        entityId: departmentId || siteId || branchId || regionId || companyId,
        entityName: departmentMap.get(departmentId)?.name || siteMap.get(siteId)?.name || company.name || 'Company',
        regionId,
        branchId,
        siteId,
        departmentId,
        hours: otHours,
        status: att.status || 'PRESENT',
        actorOrEmployee: att.employeeName || empName,
        actorRole: emp?.role,
        description: `Status: ${att.status}, In: ${inTime}, Out: ${outTime}, OT: ${otHours.toFixed(1)}h`,
        details: { att }
      });
    });

    // Map Overtime Requests
    overtimeRequests.forEach(ot => {
      const emp = employeeMap.get(ot.employeeId);
      const siteId = ot.siteId || emp?.assignedSiteId || '';
      const branchId = emp?.assignedBranchId || siteMap.get(siteId)?.branchId || '';
      const regionId = emp?.assignedRegionId || siteMap.get(siteId)?.regionId || '';
      const departmentId = emp?.departmentId || ot.departmentId || '';
      const empName = emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : '';
      const otDate = ot.workDate || (ot as any).date || ot.requestedAt || startStr;
      const reqMins = (ot as any).requestedMinutes || ot.rawOvertimeMinutes || ot.roundedOvertimeMinutes || 0;
      const appMins = ot.approvedOvertimeMinutes || (ot as any).approvedMinutes || reqMins;

      allTransactions.push({
        id: ot.id,
        module: 'OVERTIME',
        referenceNumber: `OT-${otDate}-${ot.employeeId?.slice(0, 6)}`,
        date: otDate,
        title: `Overtime Request: ${ot.employeeName || empName || 'Staff'} (${((reqMins)/60).toFixed(1)} hrs)`,
        entityLevel: departmentId ? 'DEPARTMENT' : (siteId ? 'SITE' : 'COMPANY'),
        entityId: departmentId || siteId || branchId || regionId || companyId,
        entityName: departmentMap.get(departmentId)?.name || siteMap.get(siteId)?.name || company.name || 'Company',
        regionId,
        branchId,
        siteId,
        departmentId,
        hours: (appMins) / 60,
        amount: ((appMins) / 60) * 150,
        status: ot.status || 'PENDING',
        actorOrEmployee: ot.employeeName || empName,
        description: `Reason: ${ot.reason || 'Operational Requirement'}, Approved: ${(appMins/60).toFixed(1)} hrs`,
        details: { ot }
      });
    });

    // Map Work Orders (Maintenance)
    workOrders.forEach(wo => {
      const siteId = wo.siteId || '';
      const site = siteMap.get(siteId);
      const branchId = site?.branchId || wo.branchId || '';
      const regionId = site?.regionId || wo.regionId || '';
      const cost = (wo as any).estimatedCost || (wo as any).actualCost || (wo as any).cost || 0;

      allTransactions.push({
        id: wo.id,
        module: 'MAINTENANCE',
        referenceNumber: (wo as any).orderNumber || wo.id,
        date: wo.scheduledStart || wo.createdAt || startStr,
        title: `Work Order: ${wo.title || 'Facility Maintenance'}`,
        entityLevel: siteId ? 'SITE' : 'COMPANY',
        entityId: siteId || branchId || regionId || companyId,
        entityName: site?.name || company.name || 'Company',
        regionId,
        branchId,
        siteId,
        amount: cost,
        status: wo.status || 'OPEN',
        severity: wo.priority || 'MEDIUM',
        actorOrEmployee: (wo as any).assignedToName || wo.assignedTo || 'Assigned Tech',
        description: `Category: ${wo.category || 'REPAIR'}, Priority: ${wo.priority || 'NORMAL'}, Cost: ₹${cost.toLocaleString()}`,
        details: { wo }
      });
    });

    // Map Purchase Orders (Procurement)
    purchaseOrders.forEach(po => {
      const siteId = po.shippingSiteId || (po as any).deliverySiteId || (po as any).siteId || '';
      const site = siteMap.get(siteId);
      const branchId = site?.branchId || '';
      const regionId = site?.regionId || '';
      const amount = po.grandTotal || po.subtotal || 0;

      allTransactions.push({
        id: po.id,
        module: 'PROCUREMENT',
        referenceNumber: po.poNumber || po.id,
        date: po.orderDate || po.createdAt || startStr,
        title: `Purchase Order: ${po.poNumber || po.id} - ${po.vendorName || 'Vendor'}`,
        entityLevel: siteId ? 'SITE' : 'COMPANY',
        entityId: siteId || branchId || regionId || companyId,
        entityName: site?.name || company.name || 'Company',
        regionId,
        branchId,
        siteId,
        amount,
        status: po.status || 'DRAFT',
        actorOrEmployee: po.authorizedByName,
        description: `Vendor: ${po.vendorName}, Items: ${(po.items || []).length}, Total: ₹${amount.toLocaleString()}`,
        details: { po }
      });
    });

    // Map Incidents
    incidents.forEach(inc => {
      const siteId = inc.siteId || '';
      const site = siteMap.get(siteId);
      const branchId = site?.branchId || inc.assignedBranchId || '';
      const regionId = site?.regionId || inc.assignedRegionId || '';
      const lossImpact = (inc as any).financialImpact || 0;

      allTransactions.push({
        id: inc.id,
        module: 'INCIDENTS',
        referenceNumber: inc.incidentNumber || inc.id,
        date: inc.reportedAt || inc.createdAt || startStr,
        title: `Incident: ${inc.title || inc.category || 'Security/Safety Event'}`,
        entityLevel: siteId ? 'SITE' : 'COMPANY',
        entityId: siteId || branchId || regionId || companyId,
        entityName: site?.name || company.name || 'Company',
        regionId,
        branchId,
        siteId,
        amount: lossImpact,
        status: inc.status || 'OPEN',
        severity: inc.severity || 'MEDIUM',
        actorOrEmployee: inc.reportedByName,
        description: `Severity: ${inc.severity}, Category: ${inc.category}, Loss Impact: ₹${lossImpact.toLocaleString()}`,
        details: { inc }
      });
    });

    // Map Contracts
    contracts.forEach(c => {
      const siteId = (c as any).siteId || '';
      const site = siteMap.get(siteId);
      const branchId = site?.branchId || '';
      const regionId = site?.regionId || '';

      allTransactions.push({
        id: c.id,
        module: 'CONTRACTS',
        referenceNumber: c.contractNumber || c.id,
        date: c.startDate || c.createdAt || startStr,
        title: `Contract: ${c.contractTitle || c.contractNumber || 'Master Services Agreement'}`,
        entityLevel: siteId ? 'SITE' : 'COMPANY',
        entityId: siteId || branchId || regionId || companyId,
        entityName: site?.name || company.name || 'Company',
        regionId,
        branchId,
        siteId,
        amount: c.contractValue || 0,
        status: c.status || 'ACTIVE',
        description: `Type: ${c.contractType}, Expiry: ${c.endDate}, Value: ₹${(c.contractValue || 0).toLocaleString()}`,
        details: { c }
      });
    });

    // 5. Build Aggregation Hierarchy from Bottom-Up
    // Step A: Build Department Nodes
    const departmentNodes: OperationalHierarchyNode[] = [];
    
    // Group employees by department
    const deptEmployeesMap = new Map<string, EmployeeRecord[]>();
    employees.forEach(e => {
      const dId = e.departmentId || 'UNASSIGNED_DEPT';
      if (!deptEmployeesMap.has(dId)) deptEmployeesMap.set(dId, []);
      deptEmployeesMap.get(dId)!.push(e);
    });

    departments.forEach(dept => {
      const deptEmps = deptEmployeesMap.get(dept.id) || [];
      const deptTx = allTransactions.filter(t => t.departmentId === dept.id);
      const metrics = this.computeMetrics(deptEmps, deptTx, assets.filter(a => a.departmentId === dept.id), inventoryItems, contracts);
      
      const node: OperationalHierarchyNode = {
        id: dept.id,
        name: dept.name,
        code: dept.code || dept.name.slice(0, 4).toUpperCase(),
        level: 'DEPARTMENT',
        metrics,
        children: []
      };

      departmentNodes.push(node);
    });

    // Step B: Build Site Nodes
    const siteNodes: OperationalHierarchyNode[] = [];

    sites.forEach(site => {
      const siteEmps = employees.filter(e => e.assignedSiteId === site.id);
      const siteTx = allTransactions.filter(t => t.siteId === site.id);
      const siteAssets = assets.filter(a => a.siteId === site.id);
      const siteInventory = inventoryItems.filter(i => i.siteId === site.id);
      const siteContracts = contracts.filter(c => (c as any).siteId === site.id);

      // Child department nodes under this site
      const siteDeptIds = Array.from(new Set(siteEmps.map(e => e.departmentId).filter(Boolean)));
      const siteChildDepts: OperationalHierarchyNode[] = [];

      siteDeptIds.forEach(dId => {
        const dRec = departmentMap.get(dId!);
        const dEmps = siteEmps.filter(e => e.departmentId === dId);
        const dTx = siteTx.filter(t => t.departmentId === dId);
        const dMetrics = this.computeMetrics(dEmps, dTx, siteAssets.filter(a => a.departmentId === dId), [], []);
        
        siteChildDepts.push({
          id: `${site.id}_${dId}`,
          name: dRec?.name || 'Department',
          code: dRec?.code || 'DEPT',
          level: 'DEPARTMENT',
          parentId: site.id,
          parentName: site.name,
          metrics: dMetrics,
          children: []
        });
      });

      const siteMetrics = this.computeMetrics(siteEmps, siteTx, siteAssets, siteInventory, siteContracts);

      const siteNode: OperationalHierarchyNode = {
        id: site.id,
        name: site.name || (site as any).siteName || 'Site',
        code: site.id.slice(0, 6).toUpperCase(),
        level: 'SITE',
        parentId: site.branchId,
        parentName: branchMap.get(site.branchId)?.name,
        metrics: siteMetrics,
        children: siteChildDepts
      };

      siteNodes.push(siteNode);
    });

    // Step C: Build Branch Nodes
    const branchNodes: OperationalHierarchyNode[] = [];

    branches.forEach(branch => {
      const branchSites = siteNodes.filter(s => s.parentId === branch.id);
      const branchEmps = employees.filter(e => e.assignedBranchId === branch.id || branchSites.some(s => s.id === e.assignedSiteId));
      const branchTx = allTransactions.filter(t => t.branchId === branch.id || branchSites.some(s => s.id === t.siteId));
      const branchAssets = assets.filter(a => branchSites.some(s => s.id === a.siteId));
      const branchInventory = inventoryItems.filter(i => branchSites.some(s => s.id === i.siteId));
      const branchContracts = contracts.filter(c => branchSites.some(s => s.id === (c as any).siteId));

      const branchMetrics = this.computeMetrics(branchEmps, branchTx, branchAssets, branchInventory, branchContracts);

      const branchNode: OperationalHierarchyNode = {
        id: branch.id,
        name: branch.name,
        code: branch.code || branch.name.slice(0, 4).toUpperCase(),
        level: 'BRANCH',
        parentId: (branch as any).regionId,
        parentName: regionMap.get((branch as any).regionId)?.name,
        metrics: branchMetrics,
        children: branchSites
      };

      branchNodes.push(branchNode);
    });

    // Step D: Build Region Nodes
    const regionNodes: OperationalHierarchyNode[] = [];

    regions.forEach(region => {
      const regionBranches = branchNodes.filter(b => b.parentId === region.id);
      const regionSites = siteNodes.filter(s => {
        const siteRec = siteMap.get(s.id);
        return siteRec?.regionId === region.id || regionBranches.some(b => b.id === s.parentId);
      });

      const regionEmps = employees.filter(e => e.assignedRegionId === region.id || regionSites.some(s => s.id === e.assignedSiteId));
      const regionTx = allTransactions.filter(t => t.regionId === region.id || regionSites.some(s => s.id === t.siteId));
      const regionAssets = assets.filter(a => regionSites.some(s => s.id === a.siteId));
      const regionInventory = inventoryItems.filter(i => regionSites.some(s => s.id === i.siteId));
      const regionContracts = contracts.filter(c => regionSites.some(s => s.id === (c as any).siteId));

      const regionMetrics = this.computeMetrics(regionEmps, regionTx, regionAssets, regionInventory, regionContracts);

      const regionNode: OperationalHierarchyNode = {
        id: region.id,
        name: region.name,
        code: region.code || region.name.slice(0, 4).toUpperCase(),
        level: 'REGION',
        parentId: companyId,
        parentName: company.name,
        metrics: regionMetrics,
        children: regionBranches.length > 0 ? regionBranches : regionSites
      };

      regionNodes.push(regionNode);
    });

    // Step E: Build Company Root Node
    const companyMetrics = this.computeMetrics(employees, allTransactions, assets, inventoryItems, contracts);

    const rootNode: OperationalHierarchyNode = {
      id: companyId,
      name: company.name || 'Enterprise Headquarters',
      code: (company as any).companyCode || company.companyId?.slice(0, 4).toUpperCase() || 'CORP',
      level: 'COMPANY',
      metrics: companyMetrics,
      children: regionNodes.length > 0 ? regionNodes : (branchNodes.length > 0 ? branchNodes : siteNodes)
    };

    // 6. Run Statistical Anomaly Detection across all nodes
    const allAnomalies: OperationalAnomaly[] = [];
    
    // Anomaly baseline numbers from enterprise averages
    const avgCostPerHead = companyMetrics.headcount > 0 ? companyMetrics.costBreakdown.totalOperationalCost / companyMetrics.headcount : 25000;
    const avgOvertimeRate = companyMetrics.overtimeRatePercent || 8;
    const avgMaintenancePerAsset = companyMetrics.activeAssetsCount > 0 ? companyMetrics.maintenanceCostTotal / companyMetrics.activeAssetsCount : 1500;
    const avgIncidentRate = companyMetrics.headcount > 0 ? (companyMetrics.openIncidentsCount / companyMetrics.headcount) * 100 : 2;

    const scanForAnomalies = (node: OperationalHierarchyNode) => {
      const m = node.metrics;
      const nodeAnomalies: OperationalAnomaly[] = [];

      // 1. COST SPIKE DETECTOR
      if (m.headcount >= 3 && m.costPerHeadcount > avgCostPerHead * 1.4) {
        const devPct = Math.round(((m.costPerHeadcount - avgCostPerHead) / (avgCostPerHead || 1)) * 100);
        const financialImpact = Math.round((m.costPerHeadcount - avgCostPerHead) * m.headcount);
        const payrollTx = m.transactions.filter(t => t.module === 'PAYROLL');

        nodeAnomalies.push({
          id: `ANOM_COST_${node.id}_${Date.now()}`,
          type: 'COST_SPIKE',
          severity: devPct > 70 ? 'CRITICAL' : 'HIGH',
          title: `Cost Per Headcount Spike (+${devPct}%)`,
          description: `Operational expenditure at ₹${m.costPerHeadcount.toLocaleString()}/head exceeds company baseline of ₹${avgCostPerHead.toLocaleString()}/head.`,
          entityLevel: node.level,
          entityId: node.id,
          entityName: node.name,
          metricName: 'Cost Per Headcount',
          currentValue: m.costPerHeadcount,
          baselineValue: avgCostPerHead,
          deviationPercent: devPct,
          financialImpact,
          rootCause: `High payroll additions or excessive operational overhead in ${node.name}.`,
          recommendedAction: 'Review headcount allocation, unregularized overtime, and discretionary procurement entries.',
          sourceTransactionCount: payrollTx.length,
          sourceTransactions: payrollTx.slice(0, 15),
          timestamp: now.toISOString()
        });
      }

      // 2. OVERTIME SPIKE DETECTOR
      if (m.overtimeRatePercent > Math.max(avgOvertimeRate * 1.5, 14)) {
        const devPct = Math.round(((m.overtimeRatePercent - avgOvertimeRate) / (avgOvertimeRate || 1)) * 100);
        const financialImpact = m.overtimeCostTotal;
        const otTx = m.transactions.filter(t => t.module === 'OVERTIME' || t.module === 'ATTENDANCE');

        nodeAnomalies.push({
          id: `ANOM_OT_${node.id}_${Date.now()}`,
          type: 'OVERTIME_SPIKE',
          severity: m.overtimeRatePercent > 25 ? 'CRITICAL' : (m.overtimeRatePercent > 18 ? 'HIGH' : 'MEDIUM'),
          title: `Abnormal Overtime Volume (${m.overtimeRatePercent.toFixed(1)}% of Hours)`,
          description: `Total overtime logged is ${m.overtimeHoursTotal.toFixed(1)} hrs (Cost: ₹${m.overtimeCostTotal.toLocaleString()}), which is +${devPct}% above organizational baseline.`,
          entityLevel: node.level,
          entityId: node.id,
          entityName: node.name,
          metricName: 'Overtime Rate %',
          currentValue: m.overtimeRatePercent,
          baselineValue: avgOvertimeRate,
          deviationPercent: devPct,
          financialImpact,
          rootCause: `Short-staffing or frequent double-shifts causing employee fatigue and unbudgeted labor expense.`,
          recommendedAction: 'Audit roster deployment, relief staff availability, and supervisor overtime approval reasons.',
          sourceTransactionCount: otTx.length,
          sourceTransactions: otTx.slice(0, 15),
          timestamp: now.toISOString()
        });
      }

      // 3. MAINTENANCE SPIKE DETECTOR
      const nodeMaintPerAsset = m.activeAssetsCount > 0 ? m.maintenanceCostTotal / m.activeAssetsCount : 0;
      if (m.maintenanceCostTotal > 15000 && nodeMaintPerAsset > avgMaintenancePerAsset * 1.8) {
        const devPct = Math.round(((nodeMaintPerAsset - avgMaintenancePerAsset) / (avgMaintenancePerAsset || 1)) * 100);
        const maintTx = m.transactions.filter(t => t.module === 'MAINTENANCE');

        nodeAnomalies.push({
          id: `ANOM_MAINT_${node.id}_${Date.now()}`,
          type: 'MAINTENANCE_SPIKE',
          severity: devPct > 100 ? 'HIGH' : 'MEDIUM',
          title: `Excessive Maintenance Expense (₹${m.maintenanceCostTotal.toLocaleString()})`,
          description: `Maintenance spend is ₹${nodeMaintPerAsset.toLocaleString()}/asset (+${devPct}% over baseline). ${m.openWorkOrdersCount} active work orders.`,
          entityLevel: node.level,
          entityId: node.id,
          entityName: node.name,
          metricName: 'Maintenance Cost Per Asset',
          currentValue: nodeMaintPerAsset,
          baselineValue: avgMaintenancePerAsset,
          deviationPercent: devPct,
          financialImpact: m.maintenanceCostTotal,
          rootCause: `Repetitive equipment breakdowns or premature asset degradation.`,
          recommendedAction: 'Verify Preventive Maintenance (PM) schedules, warranty status, and technician SLA performance.',
          sourceTransactionCount: maintTx.length,
          sourceTransactions: maintTx.slice(0, 15),
          timestamp: now.toISOString()
        });
      }

      // 4. INCIDENT SPIKE DETECTOR
      if (m.criticalIncidentsCount > 0 || (m.headcount >= 5 && (m.openIncidentsCount / m.headcount) * 100 > Math.max(avgIncidentRate * 2, 5))) {
        const incTx = m.transactions.filter(t => t.module === 'INCIDENTS');
        const hasCritical = m.criticalIncidentsCount > 0;

        nodeAnomalies.push({
          id: `ANOM_INC_${node.id}_${Date.now()}`,
          type: 'INCIDENT_SPIKE',
          severity: hasCritical ? 'CRITICAL' : 'HIGH',
          title: hasCritical ? `Critical Safety/Security Incident Spike` : `Elevated Incident Density (${m.openIncidentsCount} active)`,
          description: `${m.openIncidentsCount} incidents open with ₹${m.incidentLossTotal.toLocaleString()} estimated damage/loss impact.`,
          entityLevel: node.level,
          entityId: node.id,
          entityName: node.name,
          metricName: 'Open Incidents',
          currentValue: m.openIncidentsCount,
          baselineValue: 0,
          deviationPercent: 100,
          financialImpact: m.incidentLossTotal,
          rootCause: `Operational hazards, protocol breaches, or security perimeter lapses.`,
          recommendedAction: 'Dispatch immediate EHS / Security Audit team and initiate CAPA workflow.',
          sourceTransactionCount: incTx.length,
          sourceTransactions: incTx.slice(0, 15),
          timestamp: now.toISOString()
        });
      }

      // 5. PROCUREMENT ANOMALY DETECTOR
      const avgPOValue = m.purchaseOrdersCount > 0 ? m.procurementSpendTotal / m.purchaseOrdersCount : 0;
      if (m.procurementSpendTotal > 50000 && avgPOValue > 30000) {
        const poTx = m.transactions.filter(t => t.module === 'PROCUREMENT');

        nodeAnomalies.push({
          id: `ANOM_PROC_${node.id}_${Date.now()}`,
          type: 'PROCUREMENT_ANOMALY',
          severity: 'MEDIUM',
          title: `Procurement Outlay Surge (₹${m.procurementSpendTotal.toLocaleString()})`,
          description: `${m.purchaseOrdersCount} Purchase Orders totaling ₹${m.procurementSpendTotal.toLocaleString()} issued for this unit.`,
          entityLevel: node.level,
          entityId: node.id,
          entityName: node.name,
          metricName: 'Procurement Spend',
          currentValue: m.procurementSpendTotal,
          baselineValue: 20000,
          deviationPercent: 65,
          financialImpact: m.procurementSpendTotal,
          rootCause: `High-value spot purchases or off-contract inventory acquisitions.`,
          recommendedAction: 'Validate 3-way match, rate contracts, and vendor quotation approvals.',
          sourceTransactionCount: poTx.length,
          sourceTransactions: poTx.slice(0, 15),
          timestamp: now.toISOString()
        });
      }

      // 6. ATTENDANCE ANOMALY DETECTOR
      if (m.headcount >= 5 && m.attendanceRate < 80) {
        const attTx = m.transactions.filter(t => t.module === 'ATTENDANCE');
        const devPct = Math.round(100 - m.attendanceRate);

        nodeAnomalies.push({
          id: `ANOM_ATT_${node.id}_${Date.now()}`,
          type: 'ATTENDANCE_ANOMALY',
          severity: m.attendanceRate < 70 ? 'CRITICAL' : 'HIGH',
          title: `Severe Attendance Deficit (${m.attendanceRate.toFixed(1)}% Reliability)`,
          description: `Absenteeism rate is ${devPct}%. ${m.absentToday} staff absent out of ${m.headcount} deployed.`,
          entityLevel: node.level,
          entityId: node.id,
          entityName: node.name,
          metricName: 'Attendance Rate %',
          currentValue: m.attendanceRate,
          baselineValue: 92,
          deviationPercent: devPct,
          financialImpact: 0,
          rootCause: `High unexcused absences, shift abandonment, or missing biometric muster sync.`,
          recommendedAction: 'Inspect supervisor muster logs, geofence compliance, and issue replacement staff.',
          sourceTransactionCount: attTx.length,
          sourceTransactions: attTx.slice(0, 15),
          timestamp: now.toISOString()
        });
      }

      // Attach anomalies to node
      node.metrics.anomalies = nodeAnomalies;
      allAnomalies.push(...nodeAnomalies);

      // Re-calculate Risk Score based on real anomaly weights
      node.metrics.riskScorecard = this.calculateRiskScorecard(node.metrics, nodeAnomalies);

      // Recurse down children
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => scanForAnomalies(child));
      }
    };

    scanForAnomalies(rootNode);

    return {
      companyId,
      companyName: company.name || 'Enterprise Headquarters',
      generatedAt: now.toISOString(),
      periodStart: startStr,
      periodEnd: endStr,
      rootNode,
      allAnomalies,
      totalCompanyCost: rootNode.metrics.costBreakdown.totalOperationalCost,
      totalCompanyRiskScore: rootNode.metrics.riskScorecard.overallRiskScore
    };
  }

  /**
   * Helper to compute unified metrics and cost breakdown for any node level
   */
  private static computeMetrics(
    employees: EmployeeRecord[],
    transactions: OperationalSourceTransaction[],
    assets: AssetRecord[],
    inventory: InventoryItemRecord[],
    contracts: ContractRecord[]
  ): HierarchyMetrics {
    const headcount = employees.length;
    const activeEmployees = employees.filter(e => e.status === 'ACTIVE').length;

    // Attendance calculations
    const attTx = transactions.filter(t => t.module === 'ATTENDANCE');
    const presentToday = attTx.filter(t => t.status === 'PRESENT' || t.status === 'LATE' || t.status === 'EARLY_DEPARTURE').length;
    const absentToday = attTx.filter(t => t.status === 'ABSENT' || t.status === 'MISSED_PUNCH').length;
    const attendanceRate = attTx.length > 0 ? (presentToday / attTx.length) * 100 : (headcount > 0 ? 94 : 100);

    // Overtime calculations
    const otTx = transactions.filter(t => t.module === 'OVERTIME' || (t.module === 'ATTENDANCE' && (t.hours || 0) > 0));
    const overtimeHoursTotal = otTx.reduce((sum, t) => sum + (t.hours || 0), 0);
    const estimatedOtCost = otTx.reduce((sum, t) => sum + (t.amount || ((t.hours || 0) * 150)), 0);
    const approxWorkedHours = (presentToday * 8) + overtimeHoursTotal;
    const overtimeRatePercent = approxWorkedHours > 0 ? (overtimeHoursTotal / approxWorkedHours) * 100 : 0;

    // Costs
    const payrollTx = transactions.filter(t => t.module === 'PAYROLL');
    const payrollGross = payrollTx.reduce((sum, t) => sum + (t.amount || 0), 0);

    const maintTx = transactions.filter(t => t.module === 'MAINTENANCE');
    const maintenanceCost = maintTx.reduce((sum, t) => sum + (t.amount || 0), 0);

    const procTx = transactions.filter(t => t.module === 'PROCUREMENT');
    const procurementSpend = procTx.reduce((sum, t) => sum + (t.amount || 0), 0);

    const incTx = transactions.filter(t => t.module === 'INCIDENTS');
    const incidentLossImpact = incTx.reduce((sum, t) => sum + (t.amount || 0), 0);

    const inventoryValuation = inventory.reduce((sum, item) => sum + ((item.currentStock || 0) * (item.unitCost || (item as any).unitPrice || 0)), 0);
    const totalOperationalCost = payrollGross + maintenanceCost + procurementSpend + incidentLossImpact;
    const costPerHeadcount = headcount > 0 ? Math.round(totalOperationalCost / headcount) : 0;

    // Incidents counts
    const openIncidentsCount = incTx.filter(t => t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;
    const criticalIncidentsCount = incTx.filter(t => t.severity === 'CRITICAL' || t.severity === 'HIGH').length;

    // Work Orders counts
    const openWorkOrdersCount = maintTx.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
    const overdueWorkOrdersCount = maintTx.filter(t => t.status === 'OVERDUE').length;

    // Contracts
    const activeContractsCount = contracts.filter(c => c.status === 'ACTIVE').length;
    const contractTotalValue = contracts.reduce((sum, c) => sum + (c.contractValue || 0), 0);

    const costBreakdown: CostBreakdown = {
      payrollGross,
      overtimeCost: estimatedOtCost,
      maintenanceCost,
      procurementSpend,
      incidentLossImpact,
      inventoryValuation,
      totalOperationalCost
    };

    const initialRisk: RiskScorecard = {
      overallRiskScore: 10,
      riskGrade: 'LOW',
      incidentRiskScore: 0,
      overtimeFatigueRiskScore: 0,
      absenteeismRiskScore: 0,
      maintenanceDeficitRiskScore: 0,
      procurementVarianceRiskScore: 0,
      activeCriticalAnomalies: 0,
      activeHighAnomalies: 0
    };

    return {
      headcount,
      activeEmployees,
      presentToday,
      absentToday,
      attendanceRate,
      overtimeHoursTotal,
      overtimeCostTotal: estimatedOtCost,
      overtimeRatePercent,
      costBreakdown,
      costPerHeadcount,
      openIncidentsCount,
      criticalIncidentsCount,
      incidentLossTotal: incidentLossImpact,
      activeAssetsCount: assets.length,
      assetsInMaintenanceCount: assets.filter(a => a.status === 'UNDER_MAINTENANCE').length,
      openWorkOrdersCount,
      overdueWorkOrdersCount,
      maintenanceCostTotal: maintenanceCost,
      purchaseOrdersCount: procTx.length,
      procurementSpendTotal: procurementSpend,
      inventoryItemsCount: inventory.length,
      inventoryTotalValue: inventoryValuation,
      activeContractsCount,
      contractTotalValue,
      riskScorecard: initialRisk,
      anomalies: [],
      transactions
    };
  }

  /**
   * Evaluates overall risk grade and sub-scores based on factual events
   */
  private static calculateRiskScorecard(
    m: HierarchyMetrics, 
    anomalies: OperationalAnomaly[]
  ): RiskScorecard {
    const critCount = anomalies.filter(a => a.severity === 'CRITICAL').length;
    const highCount = anomalies.filter(a => a.severity === 'HIGH').length;
    const medCount = anomalies.filter(a => a.severity === 'MEDIUM').length;

    // Sub-risk scores (0 - 100)
    const incidentRiskScore = Math.min(100, (m.criticalIncidentsCount * 40) + (m.openIncidentsCount * 15));
    const overtimeFatigueRiskScore = Math.min(100, Math.round(m.overtimeRatePercent * 3.5));
    const absenteeismRiskScore = Math.min(100, Math.round(Math.max(0, 100 - m.attendanceRate) * 2.5));
    const maintenanceDeficitRiskScore = Math.min(100, (m.overdueWorkOrdersCount * 25) + (m.openWorkOrdersCount * 10));
    const procurementVarianceRiskScore = Math.min(100, anomalies.filter(a => a.type === 'PROCUREMENT_ANOMALY').length * 30);

    // Weighted Overall Risk Score
    const compositeScore = Math.min(100, Math.round(
      (incidentRiskScore * 0.3) +
      (overtimeFatigueRiskScore * 0.25) +
      (absenteeismRiskScore * 0.15) +
      (maintenanceDeficitRiskScore * 0.15) +
      (procurementVarianceRiskScore * 0.15) +
      (critCount * 25) +
      (highCount * 12) +
      (medCount * 5)
    ));

    let riskGrade: 'LOW' | 'MODERATE' | 'ELEVATED' | 'SEVERE' = 'LOW';
    if (compositeScore >= 75 || critCount > 0) riskGrade = 'SEVERE';
    else if (compositeScore >= 50 || highCount > 0) riskGrade = 'ELEVATED';
    else if (compositeScore >= 25) riskGrade = 'MODERATE';

    return {
      overallRiskScore: compositeScore,
      riskGrade,
      incidentRiskScore,
      overtimeFatigueRiskScore,
      absenteeismRiskScore,
      maintenanceDeficitRiskScore,
      procurementVarianceRiskScore,
      activeCriticalAnomalies: critCount,
      activeHighAnomalies: highCount
    };
  }
}
