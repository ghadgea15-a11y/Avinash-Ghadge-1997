import React, { useState, useEffect, useMemo } from 'react';
import { 
  Boxes, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  ArrowDownLeft, 
  ArrowUpRight, 
  RefreshCw, 
  CheckCircle2, 
  Building, 
  Truck, 
  Layers, 
  Download, 
  Trash2, 
  Edit3, 
  Eye, 
  Tag, 
  MapPin, 
  ShieldCheck, 
  FileText, 
  DollarSign, 
  Archive, 
  RotateCcw,
  SlidersHorizontal,
  X,
  AlertOctagon,
  Users,
  Check
} from 'lucide-react';
import { 
  UserSession, 
  CompanyTenant, 
  InventoryItemRecord, 
  StockTransactionRecord, 
  InventoryVendorRecord, 
  InventoryCategory, 
  InventoryUnit, 
  StockTransactionType,
  SiteRecord,
  EmployeeRecord
} from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { BulkExportGovernanceService } from '../../services/bulkExportGovernanceService';

interface InventoryStockScreenProps {
  userSession: UserSession;
  activeCompany?: CompanyTenant | null;
  onNavigate?: (screen: any) => void;
}

type TabType = 'ITEMS' | 'TRANSACTIONS' | 'LOW_STOCK' | 'VENDORS';

const CATEGORY_LABELS: Record<InventoryCategory, { label: string; color: string }> = {
  UNIFORM: { label: 'Uniform & Attire', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  SAFETY_GEAR: { label: 'Safety & PPE', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  SURVEILLANCE_EQUIPMENT: { label: 'Surveillance & CCTV', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  FIRE_SAFETY: { label: 'Fire Safety', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  COMMUNICATION: { label: 'Walkie-Talkie / Comm', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  FIRST_AID: { label: 'First Aid & Medical', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' },
  OFFICE_SUPPLIES: { label: 'Stationery / Register', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
  ACCESS_CARDS: { label: 'RFID / Access Cards', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300' },
  OTHER: { label: 'General Equipment', color: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300' }
};

export const InventoryStockScreen: React.FC<InventoryStockScreenProps> = ({
  userSession,
  activeCompany
}) => {
  const companyId = activeCompany?.companyId || userSession.companyId || 'GLOBAL';

  // Permission Checks
  const canManage = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'OPERATIONS_MANAGER', 'SITE_SUPERVISOR'].includes(userSession.role);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>('ITEMS');

  // Real-time State
  const [items, setItems] = useState<InventoryItemRecord[]>([]);
  const [transactions, setTransactions] = useState<StockTransactionRecord[]>([]);
  const [vendors, setVendors] = useState<InventoryVendorRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('ALL');

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItemRecord | null>(null);
  const [showTxModal, setShowTxModal] = useState(false);
  const [txTargetItem, setTxTargetItem] = useState<InventoryItemRecord | null>(null);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<InventoryVendorRecord | null>(null);
  const [actionProcessing, setActionProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form States
  const [itemForm, setItemForm] = useState<{
    itemCode: string;
    itemName: string;
    category: InventoryCategory;
    description: string;
    unit: InventoryUnit;
    currentStock: number;
    minStockThreshold: number;
    maxStockLimit: number;
    unitCost: number;
    warehouseLocation: string;
    siteId: string;
    supplierVendorId: string;
    status: InventoryItemRecord['status'];
    barcode: string;
  }>({
    itemCode: '',
    itemName: '',
    category: 'UNIFORM',
    description: '',
    unit: 'PCS',
    currentStock: 10,
    minStockThreshold: 5,
    maxStockLimit: 100,
    unitCost: 500,
    warehouseLocation: 'Main Store Room - Rack A1',
    siteId: '',
    supplierVendorId: '',
    status: 'IN_STOCK',
    barcode: ''
  });

  const [txForm, setTxForm] = useState<{
    transactionType: StockTransactionType;
    quantity: number;
    referenceNumber: string;
    employeeId: string;
    employeeName: string;
    fromSiteId: string;
    toSiteId: string;
    vendorSupplier: string;
    remarks: string;
  }>({
    transactionType: 'PURCHASE_INWARD',
    quantity: 1,
    referenceNumber: '',
    employeeId: '',
    employeeName: '',
    fromSiteId: '',
    toSiteId: '',
    vendorSupplier: '',
    remarks: ''
  });

  const [vendorForm, setVendorForm] = useState<{
    vendorCode: string;
    vendorName: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    gstin: string;
    paymentTerms: string;
  }>({
    vendorCode: '',
    vendorName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    gstin: '',
    paymentTerms: '30 Days Net'
  });

  // Fetch initial data & listeners
  useEffect(() => {
    if (!companyId) return;
    setLoading(true);

    const unsubItems = FirestoreService.subscribeToInventoryItems(userSession, companyId, (data) => {
      setItems(data);
      setLoading(false);
    });

    const unsubTxs = FirestoreService.subscribeToStockTransactions(userSession, companyId, (data) => {
      setTransactions(data);
    });

    const unsubVendors = FirestoreService.subscribeToInventoryVendors(userSession, companyId, (data) => {
      setVendors(data);
    });

    FirestoreService.getSites(companyId).then(setSites);
    FirestoreService.getEmployees(companyId).then(setEmployees);

    return () => {
      unsubItems();
      unsubTxs();
      unsubVendors();
    };
  }, [companyId]);

  // Derived Metrics
  const metrics = useMemo(() => {
    const totalItems = items.length;
    const lowStockCount = items.filter(i => i.status === 'LOW_STOCK').length;
    const outOfStockCount = items.filter(i => i.status === 'OUT_OF_STOCK').length;
    const inStockCount = items.filter(i => i.status === 'IN_STOCK').length;
    const totalValuation = items.reduce((acc, curr) => acc + (curr.currentStock * (curr.unitCost || 0)), 0);

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayInward = transactions
      .filter(t => t.transactionType === 'PURCHASE_INWARD' && (t.createdAt || '').startsWith(todayStr))
      .reduce((sum, t) => sum + t.quantity, 0);

    const todayOutward = transactions
      .filter(t => (t.transactionType === 'ISSUE_TO_EMPLOYEE' || t.transactionType === 'DAMAGE_SCRAP') && (t.createdAt || '').startsWith(todayStr))
      .reduce((sum, t) => sum + t.quantity, 0);

    return {
      totalItems,
      lowStockCount,
      outOfStockCount,
      inStockCount,
      totalValuation,
      todayInward,
      todayOutward
    };
  }, [items, transactions]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchQuery = 
        item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.warehouseLocation && item.warehouseLocation.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchStatus = selectedStatus === 'ALL' || item.status === selectedStatus;
      const matchSite = selectedSiteFilter === 'ALL' || item.siteId === selectedSiteFilter;

      return matchQuery && matchCat && matchStatus && matchSite;
    });
  }, [items, searchQuery, selectedCategory, selectedStatus, selectedSiteFilter]);

  // Low Stock Items
  const lowStockItems = useMemo(() => {
    return items.filter(i => i.status === 'LOW_STOCK' || i.status === 'OUT_OF_STOCK');
  }, [items]);

  // Open Edit Item
  const handleOpenEditItem = (item: InventoryItemRecord) => {
    setEditingItem(item);
    setItemForm({
      itemCode: item.itemCode,
      itemName: item.itemName,
      category: item.category,
      description: item.description || '',
      unit: item.unit,
      currentStock: item.currentStock,
      minStockThreshold: item.minStockThreshold,
      maxStockLimit: item.maxStockLimit || 100,
      unitCost: item.unitCost,
      warehouseLocation: item.warehouseLocation || '',
      siteId: item.siteId || '',
      supplierVendorId: item.supplierVendorId || '',
      status: item.status,
      barcode: item.barcode || ''
    });
    setShowItemModal(true);
  };

  // Open Create Item
  const handleOpenCreateItem = () => {
    setEditingItem(null);
    const codeNum = String(items.length + 1).padStart(3, '0');
    setItemForm({
      itemCode: `INV-${codeNum}`,
      itemName: '',
      category: 'UNIFORM',
      description: '',
      unit: 'PCS',
      currentStock: 10,
      minStockThreshold: 5,
      maxStockLimit: 100,
      unitCost: 500,
      warehouseLocation: 'Central Supply Warehouse',
      siteId: sites[0]?.id || '',
      supplierVendorId: vendors[0]?.id || '',
      status: 'IN_STOCK',
      barcode: `890${Date.now().toString().slice(-9)}`
    });
    setShowItemModal(true);
  };

  // Save Item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.itemName.trim() || !itemForm.itemCode.trim()) {
      setStatusMessage({ type: 'error', text: 'Item Name and Code are required.' });
      return;
    }

    setActionProcessing(true);
    try {
      const itemId = editingItem ? editingItem.id : `ITEM-${Date.now()}`;
      const selectedSite = sites.find(s => s.id === itemForm.siteId);
      const selectedVendor = vendors.find(v => v.id === itemForm.supplierVendorId);

      const payload: InventoryItemRecord = {
        id: itemId,
        companyId,
        itemCode: itemForm.itemCode.trim().toUpperCase(),
        itemName: itemForm.itemName.trim(),
        category: itemForm.category,
        description: itemForm.description.trim(),
        unit: itemForm.unit,
        currentStock: Number(itemForm.currentStock) || 0,
        minStockThreshold: Number(itemForm.minStockThreshold) || 5,
        maxStockLimit: Number(itemForm.maxStockLimit) || 100,
        unitCost: Number(itemForm.unitCost) || 0,
        warehouseLocation: itemForm.warehouseLocation.trim(),
        siteId: itemForm.siteId || '',
        siteName: selectedSite?.name || '',
        supplierVendorId: itemForm.supplierVendorId || '',
        supplierVendorName: selectedVendor?.vendorName || '',
        status: itemForm.status,
        barcode: itemForm.barcode.trim(),
        createdAt: editingItem?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const success = await FirestoreService.saveInventoryItem(companyId, payload, {
        uid: userSession.userId,
        name: userSession.fullName || userSession.email
      });

      if (success) {
        setShowItemModal(false);
        setStatusMessage({ type: 'success', text: `Item "${payload.itemName}" saved successfully.` });
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to save item. Check permissions.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error occurred.' });
    } finally {
      setActionProcessing(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Delete Item
  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${itemName}"? This action cannot be undone.`)) return;

    setActionProcessing(true);
    try {
      const ok = await FirestoreService.deleteInventoryItem(companyId, itemId, {
        uid: userSession.userId,
        name: userSession.fullName || userSession.email
      });
      if (ok) {
        setStatusMessage({ type: 'success', text: `Item "${itemName}" removed.` });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error deleting item.' });
    } finally {
      setActionProcessing(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Open Transaction Modal
  const handleOpenTxModal = (item?: InventoryItemRecord, defaultType: StockTransactionType = 'PURCHASE_INWARD') => {
    const target = item || items[0];
    setTxTargetItem(target || null);
    setTxForm({
      transactionType: defaultType,
      quantity: 1,
      referenceNumber: `PO-${Date.now().toString().slice(-6)}`,
      employeeId: '',
      employeeName: '',
      fromSiteId: target?.siteId || sites[0]?.id || '',
      toSiteId: sites[1]?.id || '',
      vendorSupplier: target?.supplierVendorName || (vendors[0]?.vendorName || 'Direct Purchase'),
      remarks: ''
    });
    setShowTxModal(true);
  };

  // Save Transaction
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txTargetItem) {
      setStatusMessage({ type: 'error', text: 'Please select a valid inventory item.' });
      return;
    }
    if (txForm.quantity <= 0) {
      setStatusMessage({ type: 'error', text: 'Quantity must be greater than 0.' });
      return;
    }

    setActionProcessing(true);
    try {
      const selectedEmp = employees.find(e => e.id === txForm.employeeId);
      const totalVal = (txTargetItem.unitCost || 0) * txForm.quantity;

      const res = await FirestoreService.recordStockTransaction(
        companyId,
        {
          companyId,
          itemId: txTargetItem.id,
          itemName: txTargetItem.itemName,
          itemCode: txTargetItem.itemCode,
          transactionType: txForm.transactionType,
          quantity: Number(txForm.quantity),
          unitCost: txTargetItem.unitCost || 0,
          totalValue: totalVal,
          referenceNumber: txForm.referenceNumber.trim() || `REF-${Date.now().toString().slice(-4)}`,
          employeeId: txForm.employeeId,
          employeeName: selectedEmp ? `${selectedEmp.firstName} ${selectedEmp.lastName}` : txForm.employeeName,
          fromSiteId: txForm.fromSiteId,
          toSiteId: txForm.toSiteId,
          siteName: txTargetItem.siteName || '',
          vendorSupplier: txForm.vendorSupplier,
          remarks: txForm.remarks.trim(),
          performedByUid: userSession.userId,
          performedByName: userSession.fullName || userSession.email
        },
        { uid: userSession.userId, name: userSession.fullName || userSession.email }
      );

      if (res.success) {
        setShowTxModal(false);
        setStatusMessage({ 
          type: 'success', 
          text: `Transaction recorded! New stock for "${txTargetItem.itemName}": ${res.newStock} ${txTargetItem.unit}` 
        });
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to record transaction.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error executing stock transaction.' });
    } finally {
      setActionProcessing(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  // Save Vendor
  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorForm.vendorName.trim()) {
      setStatusMessage({ type: 'error', text: 'Vendor Name is required.' });
      return;
    }

    setActionProcessing(true);
    try {
      const vId = editingVendor ? editingVendor.id : `VEND-${Date.now()}`;
      const payload: InventoryVendorRecord = {
        id: vId,
        companyId,
        vendorCode: vendorForm.vendorCode.trim().toUpperCase() || `VEN-${vendors.length + 1}`,
        vendorName: vendorForm.vendorName.trim(),
        contactPerson: vendorForm.contactPerson.trim(),
        email: vendorForm.email.trim(),
        phone: vendorForm.phone.trim(),
        address: vendorForm.address.trim(),
        gstin: vendorForm.gstin.trim().toUpperCase(),
        paymentTerms: vendorForm.paymentTerms.trim(),
        status: 'ACTIVE',
        createdAt: editingVendor?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const success = await FirestoreService.saveInventoryVendor(companyId, payload, {
        uid: userSession.userId,
        name: userSession.fullName || userSession.email
      });

      if (success) {
        setShowVendorModal(false);
        setStatusMessage({ type: 'success', text: `Vendor "${payload.vendorName}" saved successfully.` });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save vendor.' });
    } finally {
      setActionProcessing(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Export CSV
  const handleExportCSV = async () => {
    // Module 10.4: Export Governance Evaluation
    const targetCompanyId = companyId || activeCompany?.companyId || '';
    await BulkExportGovernanceService.evaluateAndRecordExport({
      session: userSession,
      companyId: targetCompanyId,
      module: 'SCM_INVENTORY',
      entityType: 'InventoryItemRecord',
      exportFormat: 'CSV',
      dataClassification: 'INVENTORY_SCM',
      recordCount: filteredItems.length,
      exportName: `Inventory_Stock_Report_${targetCompanyId}_${new Date().toISOString().slice(0, 10)}.csv`,
      reason: 'Exported stock and warehouse inventory master'
    });

    const headers = ['Item Code', 'Item Name', 'Category', 'Current Stock', 'Unit', 'Min Threshold', 'Unit Cost (INR)', 'Total Value (INR)', 'Warehouse Location', 'Site', 'Status'];
    const rows = filteredItems.map(item => [
      item.itemCode,
      `"${item.itemName.replace(/"/g, '""')}"`,
      item.category,
      item.currentStock,
      item.unit,
      item.minStockThreshold,
      item.unitCost,
      item.currentStock * item.unitCost,
      `"${(item.warehouseLocation || '').replace(/"/g, '""')}"`,
      `"${(item.siteName || '').replace(/"/g, '""')}"`,
      item.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Inventory_Stock_Report_${companyId}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="inventory-stock-screen" className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Boxes className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Inventory & Stock Management
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Live Ledger
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Building className="w-3.5 h-3.5" />
              {activeCompany?.brandName || activeCompany?.companyLegalName || 'Enterprise'} • Guard Uniforms, Tactical Gear & Warehouse Logistics
            </p>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <>
              <button
                id="btn-quick-inward"
                onClick={() => handleOpenTxModal(undefined, 'PURCHASE_INWARD')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
              >
                <ArrowDownLeft className="w-4 h-4" />
                Inward Stock
              </button>
              <button
                id="btn-quick-issue"
                onClick={() => handleOpenTxModal(undefined, 'ISSUE_TO_EMPLOYEE')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
              >
                <ArrowUpRight className="w-4 h-4" />
                Issue to Guard
              </button>
              <button
                id="btn-add-item"
                onClick={handleOpenCreateItem}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </>
          )}
          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Status Notifications */}
      {statusMessage && (
        <div className={`p-4 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between border ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' 
            : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Items</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {metrics.totalItems}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Unique SKUs in System</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Valuation</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate">
            ₹{metrics.totalValuation.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Stock Asset Value</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">In Stock</span>
            <CheckCircle2 className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {metrics.inStockCount}
          </div>
          <div className="text-[11px] text-teal-600 dark:text-teal-400 mt-1 font-medium">Optimal Quantities</div>
        </div>

        <div className={`p-4 rounded-2xl border shadow-sm transition-colors ${
          metrics.lowStockCount > 0 
            ? 'bg-amber-50/70 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800' 
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Low Stock</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
            {metrics.lowStockCount}
          </div>
          <div className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 font-medium">Needs Replenishment</div>
        </div>

        <div className={`p-4 rounded-2xl border shadow-sm transition-colors ${
          metrics.outOfStockCount > 0 
            ? 'bg-rose-50/70 border-rose-300 dark:bg-rose-950/30 dark:border-rose-800' 
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Out of Stock</span>
            <AlertOctagon className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
            {metrics.outOfStockCount}
          </div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-medium">0 Balance Items</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Flow</span>
            <RefreshCw className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <span className="text-emerald-600">+{metrics.todayInward}</span> / <span className="text-rose-600">-{metrics.todayOutward}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Inward / Issued Units</div>
        </div>

      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 sm:gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('ITEMS')}
          className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'ITEMS'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Boxes className="w-4 h-4" />
          Inventory Items ({items.length})
        </button>

        <button
          onClick={() => setActiveTab('TRANSACTIONS')}
          className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'TRANSACTIONS'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          Stock Transactions ({transactions.length})
        </button>

        <button
          onClick={() => setActiveTab('LOW_STOCK')}
          className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'LOW_STOCK'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Low Stock Alerts
          {lowStockItems.length > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500 text-white">
              {lowStockItems.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('VENDORS')}
          className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'VENDORS'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Truck className="w-4 h-4" />
          Suppliers & Vendors ({vendors.length})
        </button>
      </div>

      {/* TAB 1: INVENTORY ITEMS */}
      {activeTab === 'ITEMS' && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search Item, Code, Rack..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Categories</option>
                {Object.keys(CATEGORY_LABELS).map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat as InventoryCategory].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Stock Statuses</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="LOW_STOCK">Low Stock</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
                <option value="DISCONTINUED">Discontinued</option>
              </select>
            </div>

            {/* Site Filter */}
            <div>
              <select
                value={selectedSiteFilter}
                onChange={(e) => setSelectedSiteFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Sites / Warehouses</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Items Table / Cards */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
              <p className="text-sm font-medium">Loading inventory records from Firestore...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Boxes className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Inventory Items Found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                No items match your selected filters. Create new items to track guard uniforms, body armor, radios, and emergency supplies.
              </p>
              {canManage && (
                <button
                  onClick={handleOpenCreateItem}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add First Item
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-bold tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Code & Item</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Current Stock</th>
                      <th className="px-4 py-3">Cost / Value</th>
                      <th className="px-4 py-3">Location & Site</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredItems.map((item) => {
                      const catInfo = CATEGORY_LABELS[item.category] || CATEGORY_LABELS.OTHER;
                      const isLow = item.currentStock <= item.minStockThreshold;
                      const isOut = item.currentStock <= 0;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          
                          {/* Item Info */}
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <span>{item.itemName}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                              {item.itemCode} {item.barcode && `• #${item.barcode}`}
                            </div>
                          </td>

                          {/* Category */}
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${catInfo.color}`}>
                              {catInfo.label}
                            </span>
                          </td>

                          {/* Stock Count */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`text-base font-black ${
                                isOut ? 'text-rose-600 dark:text-rose-400' :
                                isLow ? 'text-amber-600 dark:text-amber-400' :
                                'text-slate-900 dark:text-white'
                              }`}>
                                {item.currentStock}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">{item.unit}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              Min Alert: {item.minStockThreshold} {item.unit}
                            </div>
                          </td>

                          {/* Cost */}
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              ₹{item.unitCost?.toLocaleString('en-IN')} <span className="text-[10px] text-slate-400 font-normal">/ {item.unit}</span>
                            </div>
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                              Val: ₹{(item.currentStock * (item.unitCost || 0)).toLocaleString('en-IN')}
                            </div>
                          </td>

                          {/* Location */}
                          <td className="px-4 py-3">
                            <div className="text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {item.warehouseLocation || 'Central Store'}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {item.siteName || 'HQ Main Facility'}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            {item.status === 'OUT_OF_STOCK' || isOut ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                                <AlertOctagon className="w-3 h-3" /> Out of Stock
                              </span>
                            ) : item.status === 'LOW_STOCK' || isLow ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                <AlertTriangle className="w-3 h-3" /> Low Stock
                              </span>
                            ) : item.status === 'DISCONTINUED' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                Discontinued
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                <CheckCircle2 className="w-3 h-3" /> In Stock
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              {canManage && (
                                <>
                                  <button
                                    title="Quick Stock Inward"
                                    onClick={() => handleOpenTxModal(item, 'PURCHASE_INWARD')}
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors"
                                  >
                                    <ArrowDownLeft className="w-4 h-4" />
                                  </button>
                                  <button
                                    title="Issue Item to Staff"
                                    onClick={() => handleOpenTxModal(item, 'ISSUE_TO_EMPLOYEE')}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors"
                                  >
                                    <ArrowUpRight className="w-4 h-4" />
                                  </button>
                                  <button
                                    title="Edit Item Details"
                                    onClick={() => handleOpenEditItem(item)}
                                    className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    title="Delete Item"
                                    onClick={() => handleDeleteItem(item.id, item.itemName)}
                                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 2: STOCK TRANSACTIONS */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Live Stock Ledger & Movement Register</h2>
              <p className="text-xs text-slate-500">Every inward purchase, issue to security personnel, site transfer and scrap logged with cryptographic audit records.</p>
            </div>
            {canManage && (
              <button
                onClick={() => handleOpenTxModal()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                <Plus className="w-4 h-4" /> Record Movement
              </button>
            )}
          </div>

          {transactions.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Transactions Logged Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Stock movements will appear here automatically when inward deliveries, guard dispatches, or returns are processed.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-bold tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Date & Ref</th>
                      <th className="px-4 py-3">Movement Type</th>
                      <th className="px-4 py-3">Item Details</th>
                      <th className="px-4 py-3">Quantity</th>
                      <th className="px-4 py-3">Stock Shift</th>
                      <th className="px-4 py-3">Recipient / Supplier</th>
                      <th className="px-4 py-3">Logged By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {transactions.map((tx) => {
                      const isAddition = tx.transactionType === 'PURCHASE_INWARD' || tx.transactionType === 'RETURN_FROM_EMPLOYEE';
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          
                          {/* Date & Ref */}
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {tx.referenceNumber || tx.id}
                            </div>
                          </td>

                          {/* Movement Type */}
                          <td className="px-4 py-3">
                            {tx.transactionType === 'PURCHASE_INWARD' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                <ArrowDownLeft className="w-3 h-3" /> Purchase Inward
                              </span>
                            ) : tx.transactionType === 'ISSUE_TO_EMPLOYEE' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                <ArrowUpRight className="w-3 h-3" /> Issued to Guard
                              </span>
                            ) : tx.transactionType === 'SITE_TRANSFER' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                                <RefreshCw className="w-3 h-3" /> Site Transfer
                              </span>
                            ) : tx.transactionType === 'RETURN_FROM_EMPLOYEE' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                                <RotateCcw className="w-3 h-3" /> Return from Staff
                              </span>
                            ) : tx.transactionType === 'DAMAGE_SCRAP' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                <AlertTriangle className="w-3 h-3" /> Damage / Scrap
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                <SlidersHorizontal className="w-3 h-3" /> Audit Adjustment
                              </span>
                            )}
                          </td>

                          {/* Item Details */}
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900 dark:text-white">{tx.itemName}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{tx.itemCode}</div>
                          </td>

                          {/* Quantity */}
                          <td className="px-4 py-3">
                            <span className={`font-black text-sm ${isAddition ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isAddition ? `+${tx.quantity}` : `-${tx.quantity}`}
                            </span>
                          </td>

                          {/* Stock Shift */}
                          <td className="px-4 py-3">
                            <div className="text-xs font-mono text-slate-700 dark:text-slate-300">
                              {tx.previousStock} → <span className="font-bold text-slate-900 dark:text-white">{tx.newStock}</span>
                            </div>
                          </td>

                          {/* Party */}
                          <td className="px-4 py-3">
                            <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                              {tx.employeeName || tx.vendorSupplier || '—'}
                            </div>
                            {tx.remarks && <div className="text-[10px] text-slate-500 italic max-w-xs truncate">{tx.remarks}</div>}
                          </td>

                          {/* Performed By */}
                          <td className="px-4 py-3">
                            <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                              {tx.performedByName || 'Admin'}
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 3: LOW STOCK ALERTS */}
      {activeTab === 'LOW_STOCK' && (
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">Replenishment Priority Queue</h3>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {lowStockItems.length} items are currently below safety buffer thresholds. Initiate Purchase Orders immediately to avoid stockouts.
                </p>
              </div>
            </div>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">All Stock Levels Optimal!</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Zero items are below their minimum configured inventory thresholds.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowStockItems.map((item) => (
                <div key={item.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-amber-200 dark:border-amber-900/50 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {item.category}
                      </span>
                      <span className="text-xs font-mono text-slate-400">{item.itemCode}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2">
                      {item.itemName}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Location: {item.warehouseLocation || 'Main Store'}
                    </p>

                    <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Current Stock</div>
                        <div className="text-xl font-black text-rose-600 dark:text-rose-400">{item.currentStock} {item.unit}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Min Threshold</div>
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.minStockThreshold} {item.unit}</div>
                      </div>
                    </div>
                  </div>

                  {canManage && (
                    <button
                      onClick={() => handleOpenTxModal(item, 'PURCHASE_INWARD')}
                      className="mt-4 w-full py-2.5 px-3 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ArrowDownLeft className="w-4 h-4" />
                      Order / Inward Refill
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: VENDORS & SUPPLIERS */}
      {activeTab === 'VENDORS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Registered Uniform & Equipment Suppliers</h2>
              <p className="text-xs text-slate-500">Manage verified vendors for direct purchase orders, GST invoices, and equipment warranties.</p>
            </div>
            {canManage && (
              <button
                onClick={() => {
                  setEditingVendor(null);
                  setVendorForm({
                    vendorCode: `VEN-${vendors.length + 1}`,
                    vendorName: '',
                    contactPerson: '',
                    email: '',
                    phone: '',
                    address: '',
                    gstin: '',
                    paymentTerms: '30 Days Net'
                  });
                  setShowVendorModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Vendor
              </button>
            )}
          </div>

          {vendors.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Truck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Suppliers Registered</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Add security gear vendors, uniform manufacturers, and surveillance distributors.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendors.map((v) => (
                <div key={v.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md">
                        {v.vendorCode}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {v.status}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2">
                      {v.vendorName}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <Users className="w-3.5 h-3.5" /> Contact: <span className="font-semibold text-slate-700 dark:text-slate-300">{v.contactPerson}</span>
                    </p>

                    <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <div>📞 {v.phone || 'N/A'}</div>
                      <div>✉️ {v.email || 'N/A'}</div>
                      {v.gstin && <div>🏛️ GSTIN: <span className="font-mono text-slate-700 dark:text-slate-300">{v.gstin}</span></div>}
                      {v.paymentTerms && <div>💳 Terms: {v.paymentTerms}</div>}
                    </div>
                  </div>

                  {canManage && (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingVendor(v);
                          setVendorForm({
                            vendorCode: v.vendorCode,
                            vendorName: v.vendorName,
                            contactPerson: v.contactPerson,
                            email: v.email,
                            phone: v.phone,
                            address: v.address || '',
                            gstin: v.gstin || '',
                            paymentTerms: v.paymentTerms || '30 Days Net'
                          });
                          setShowVendorModal(true);
                        }}
                        className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                      >
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm(`Delete vendor ${v.vendorName}?`)) {
                            await FirestoreService.deleteInventoryVendor(companyId, v.id, {
                              uid: userSession.userId,
                              name: userSession.fullName || userSession.email
                            });
                          }
                        }}
                        className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD / EDIT INVENTORY ITEM */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
            
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <Boxes className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingItem ? 'Edit Inventory Item' : 'Add New Inventory SKU'}
                </h3>
              </div>
              <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Item Code / SKU *</label>
                  <input
                    type="text"
                    required
                    value={itemForm.itemCode}
                    onChange={(e) => setItemForm({ ...itemForm, itemCode: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    placeholder="e.g. UNIF-SHIRT-M"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Item Name *</label>
                  <input
                    type="text"
                    required
                    value={itemForm.itemName}
                    onChange={(e) => setItemForm({ ...itemForm, itemName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="e.g. Security Guard Uniform Shirt (Medium)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value as InventoryCategory })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {Object.keys(CATEGORY_LABELS).map((cat) => (
                      <option key={cat} value={cat}>{CATEGORY_LABELS[cat as InventoryCategory].label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Measurement Unit</label>
                  <select
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value as InventoryUnit })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="PCS">Pieces (PCS)</option>
                    <option value="PAIRS">Pairs</option>
                    <option value="SETS">Sets</option>
                    <option value="BOXES">Boxes</option>
                    <option value="METERS">Meters</option>
                    <option value="ROLLS">Rolls</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Initial / Current Stock</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={itemForm.currentStock}
                    onChange={(e) => setItemForm({ ...itemForm, currentStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Min Stock Threshold (Alert level)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={itemForm.minStockThreshold}
                    onChange={(e) => setItemForm({ ...itemForm, minStockThreshold: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={itemForm.unitCost}
                    onChange={(e) => setItemForm({ ...itemForm, unitCost: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Warehouse / Storage Location</label>
                  <input
                    type="text"
                    value={itemForm.warehouseLocation}
                    onChange={(e) => setItemForm({ ...itemForm, warehouseLocation: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="e.g. Central Store - Rack B2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Assigned Site</label>
                  <select
                    value={itemForm.siteId}
                    onChange={(e) => setItemForm({ ...itemForm, siteId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">Central / Company HQ</option>
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Preferred Supplier / Vendor</label>
                  <select
                    value={itemForm.supplierVendorId}
                    onChange={(e) => setItemForm({ ...itemForm, supplierVendorId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.vendorName}</option>
                    ))}
                  </select>
                </div>

              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description / Specs</label>
                <textarea
                  rows={2}
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  placeholder="Material specs, size standards, warranty information..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionProcessing}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionProcessing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {editingItem ? 'Save Changes' : 'Create Item SKU'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: STOCK MOVEMENT TRANSACTION */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-8">
            
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Record Stock Movement
                </h3>
              </div>
              <button onClick={() => setShowTxModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="p-5 space-y-4">
              
              {/* Item Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Select Item *</label>
                <select
                  required
                  value={txTargetItem?.id || ''}
                  onChange={(e) => {
                    const found = items.find(i => i.id === e.target.value);
                    setTxTargetItem(found || null);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                >
                  {items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.itemName} ({item.itemCode}) — Current: {item.currentStock} {item.unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Movement Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Movement Type *</label>
                <select
                  value={txForm.transactionType}
                  onChange={(e) => setTxForm({ ...txForm, transactionType: e.target.value as StockTransactionType })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                >
                  <option value="PURCHASE_INWARD">📥 Purchase Inward (Stock Refill +)</option>
                  <option value="ISSUE_TO_EMPLOYEE">📤 Issue to Security Guard / Staff (-)</option>
                  <option value="SITE_TRANSFER">🔄 Transfer to Another Site (-)</option>
                  <option value="RETURN_FROM_EMPLOYEE">↩️ Return from Guard / Staff (+)</option>
                  <option value="DAMAGE_SCRAP">⚠️ Damage / Scrap Write-off (-)</option>
                  <option value="AUDIT_ADJUSTMENT">📊 Physical Audit Adjustment</option>
                </select>
              </div>

              {/* Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {txForm.transactionType === 'AUDIT_ADJUSTMENT' ? 'New Audited Count *' : 'Quantity *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={txForm.quantity}
                    onChange={(e) => setTxForm({ ...txForm, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-black text-base"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Reference / PO / Gate Pass #</label>
                  <input
                    type="text"
                    value={txForm.referenceNumber}
                    onChange={(e) => setTxForm({ ...txForm, referenceNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    placeholder="e.g. GP-2026-081"
                  />
                </div>
              </div>

              {/* Employee recipient (if issuing or returning) */}
              {(txForm.transactionType === 'ISSUE_TO_EMPLOYEE' || txForm.transactionType === 'RETURN_FROM_EMPLOYEE') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Guard / Employee Assigned *</label>
                  <select
                    value={txForm.employeeId}
                    onChange={(e) => {
                      const emp = employees.find(emp => emp.id === e.target.value);
                      setTxForm({
                        ...txForm,
                        employeeId: e.target.value,
                        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : ''
                      });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">Select Guard / Staff</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeId || emp.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Supplier if inward */}
              {txForm.transactionType === 'PURCHASE_INWARD' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Vendor / Supplier Name</label>
                  <input
                    type="text"
                    value={txForm.vendorSupplier}
                    onChange={(e) => setTxForm({ ...txForm, vendorSupplier: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="e.g. Apex Uniforms & Tactical Gear"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Remarks / Note</label>
                <textarea
                  rows={2}
                  value={txForm.remarks}
                  onChange={(e) => setTxForm({ ...txForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  placeholder="Reason for movement, batch info, condition notes..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTxModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionProcessing}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionProcessing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Stock Update
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VENDOR FORM */}
      {showVendorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-8">
            
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <Truck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingVendor ? 'Edit Supplier' : 'Register New Vendor'}
                </h3>
              </div>
              <button onClick={() => setShowVendorModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVendor} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Vendor Code</label>
                  <input
                    type="text"
                    required
                    value={vendorForm.vendorCode}
                    onChange={(e) => setVendorForm({ ...vendorForm, vendorCode: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Vendor / Firm Name *</label>
                  <input
                    type="text"
                    required
                    value={vendorForm.vendorName}
                    onChange={(e) => setVendorForm({ ...vendorForm, vendorName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                    placeholder="e.g. Apex Security Supplies Ltd"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={vendorForm.contactPerson}
                    onChange={(e) => setVendorForm({ ...vendorForm, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={vendorForm.phone}
                    onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={vendorForm.email}
                    onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={vendorForm.gstin}
                    onChange={(e) => setVendorForm({ ...vendorForm, gstin: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase"
                    placeholder="27AAAPL1234C1Z5"
                  />
                </div>

              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Terms</label>
                <input
                  type="text"
                  value={vendorForm.paymentTerms}
                  onChange={(e) => setVendorForm({ ...vendorForm, paymentTerms: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  placeholder="e.g. 30 Days Net / 50% Advance"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Address</label>
                <textarea
                  rows={2}
                  value={vendorForm.address}
                  onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  placeholder="Office & warehouse address..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowVendorModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionProcessing}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionProcessing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Save Vendor
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
