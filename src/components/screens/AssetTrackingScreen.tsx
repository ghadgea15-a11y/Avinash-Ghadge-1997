import React, { useState, useEffect, useMemo } from 'react';
import { 
  Boxes,
  Plus, 
  Search, 
  Filter, 
  Download, 
  Edit2, 
  Trash2, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  UserCheck, 
  ArrowRightLeft, 
  Wrench, 
  ShieldCheck, 
  Building2, 
  FileText, 
  X, 
  Radio, 
  Smartphone, 
  Camera, 
  Car, 
  Cpu, 
  Sparkles,
  Info,
  Calendar,
  Layers,
  ChevronRight,
  Printer,
  Check
} from 'lucide-react';
import { 
  CompanyTenant, 
  UserSession, 
  PhaseAScreen, 
  SiteRecord, 
  EmployeeRecord,
  AssetRecord,
  AssetCategory,
  AssetStatus,
  AssetCondition,
  AssetMovementHistoryRecord,
  AssetMaintenanceRecord,
  AssetMaintenanceType
} from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { useTheme } from '../../context/ThemeContext';

interface AssetTrackingScreenProps {
  userSession: UserSession;
  activeCompany: CompanyTenant | null;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const AssetTrackingScreen: React.FC<AssetTrackingScreenProps> = ({
  userSession,
  activeCompany,
  onNavigate
}) => {
  const { isDark } = useTheme();
  const companyId = activeCompany?.companyId || userSession.companyId;

  const [activeTab, setActiveTab] = useState<'REGISTER' | 'MOVEMENTS' | 'MAINTENANCE' | 'SCANNER'>('REGISTER');
  
  // Real-time Firestore state
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [movements, setMovements] = useState<AssetMovementHistoryRecord[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<AssetMaintenanceRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [siteFilter, setSiteFilter] = useState<string>('ALL');

  // Modals state
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetRecord | null>(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedAssetForAssign, setSelectedAssetForAssign] = useState<AssetRecord | null>(null);

  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedAssetForReturn, setSelectedAssetForReturn] = useState<AssetRecord | null>(null);

  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [selectedAssetForAudit, setSelectedAssetForAudit] = useState<AssetRecord | null>(null);

  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [selectedAssetForMaintenance, setSelectedAssetForMaintenance] = useState<AssetRecord | null>(null);

  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedAssetForQr, setSelectedAssetForQr] = useState<AssetRecord | null>(null);

  const [isGatePassModalOpen, setIsGatePassModalOpen] = useState(false);
  const [selectedAssetForGatePass, setSelectedAssetForGatePass] = useState<AssetRecord | null>(null);

  const [isBulkQrModalOpen, setIsBulkQrModalOpen] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Scanner simulation lookup
  const [scanCodeInput, setScanCodeInput] = useState('');
  const [scannedAssetResult, setScannedAssetResult] = useState<AssetRecord | null>(null);

  // Forms State
  const [assetForm, setAssetForm] = useState({
    assetCode: '',
    assetName: '',
    category: 'SECURITY_EQUIPMENT' as AssetCategory,
    brand: '',
    model: '',
    serialNumber: '',
    barcodeOrQr: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseCost: '',
    currentValue: '',
    warrantyExpiryDate: '',
    status: 'AVAILABLE' as AssetStatus,
    condition: 'EXCELLENT' as AssetCondition,
    siteId: '',
    warehouseLocation: 'Central Arsenal / Security Store',
    nextMaintenanceDate: '',
    specifications: '',
    notes: ''
  });

  const [assignForm, setAssignForm] = useState({
    employeeId: '',
    siteId: '',
    expectedReturnDate: '',
    condition: 'EXCELLENT' as AssetCondition,
    remarks: ''
  });

  const [returnForm, setReturnForm] = useState({
    condition: 'GOOD' as AssetCondition,
    warehouseLocation: 'Central Security Store',
    siteId: '',
    sendToMaintenance: false,
    remarks: ''
  });

  const [auditForm, setAuditForm] = useState({
    condition: 'GOOD' as AssetCondition,
    verifiedLocation: 'On-Site Security Desk',
    notes: ''
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    serviceVendor: '',
    serviceDate: new Date().toISOString().split('T')[0],
    serviceCost: '',
    serviceType: 'PREVENTIVE_CALIBRATION' as AssetMaintenanceType,
    issueDescription: '',
    actionTaken: '',
    nextServiceDate: '',
    status: 'COMPLETED' as 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    returnToAvailable: true
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Real-time Data Subscriptions
  useEffect(() => {
    if (!companyId) return;
    setLoading(true);

    const unsubAssets = FirestoreService.subscribeToAssets(companyId, (data) => {
      setAssets(data);
      setLoading(false);
    });

    const unsubMovements = FirestoreService.subscribeToAssetMovements(companyId, (data) => {
      setMovements(data);
    });

    const unsubMaintenance = FirestoreService.subscribeToAssetMaintenance(companyId, (data) => {
      setMaintenanceRecords(data);
    });

    const unsubSites = FirestoreService.subscribeToSites(companyId, (data) => {
      setSites(data);
    });

    const unsubEmployees = FirestoreService.subscribeToEmployees(companyId, (data) => {
      setEmployees(data);
    });

    return () => {
      unsubAssets();
      unsubMovements();
      unsubMaintenance();
      unsubSites();
      unsubEmployees();
    };
  }, [companyId]);

  // Calculations & Metrics
  const totalAssetsCount = assets.length;
  const totalValuation = assets.reduce((acc, a) => acc + (Number(a.currentValue) || Number(a.purchaseCost) || 0), 0);
  const assignedCount = assets.filter(a => a.status === 'ASSIGNED').length;
  const maintenanceCount = assets.filter(a => a.status === 'UNDER_MAINTENANCE' || a.status === 'DAMAGED').length;
  const availableCount = assets.filter(a => a.status === 'AVAILABLE').length;

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      const matchSearch = 
        (a.assetName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.assetCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.serialNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.brand || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.model || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.assignedEmployeeName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.siteName || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchCategory = categoryFilter === 'ALL' || a.category === categoryFilter;
      const matchStatus = statusFilter === 'ALL' || a.status === statusFilter;
      const matchSite = siteFilter === 'ALL' || a.siteId === siteFilter;

      return matchSearch && matchCategory && matchStatus && matchSite;
    });
  }, [assets, searchQuery, categoryFilter, statusFilter, siteFilter]);

  // Handle Create / Edit Asset Modal
  const openCreateAssetModal = () => {
    const nextCode = `AST-${new Date().getFullYear()}-${String(assets.length + 1).padStart(3, '0')}`;
    setEditingAsset(null);
    setAssetForm({
      assetCode: nextCode,
      assetName: '',
      category: 'SECURITY_EQUIPMENT',
      brand: '',
      model: '',
      serialNumber: '',
      barcodeOrQr: nextCode,
      purchaseDate: new Date().toISOString().split('T')[0],
      purchaseCost: '',
      currentValue: '',
      warrantyExpiryDate: '',
      status: 'AVAILABLE',
      condition: 'EXCELLENT',
      siteId: '',
      warehouseLocation: 'Central Security Store',
      nextMaintenanceDate: '',
      specifications: '',
      notes: ''
    });
    setIsAssetModalOpen(true);
  };

  const openEditAssetModal = (asset: AssetRecord) => {
    setEditingAsset(asset);
    setAssetForm({
      assetCode: asset.assetCode || '',
      assetName: asset.assetName || '',
      category: asset.category || 'SECURITY_EQUIPMENT',
      brand: asset.brand || '',
      model: asset.model || '',
      serialNumber: asset.serialNumber || '',
      barcodeOrQr: asset.barcodeOrQr || asset.assetCode || '',
      purchaseDate: asset.purchaseDate || new Date().toISOString().split('T')[0],
      purchaseCost: asset.purchaseCost ? String(asset.purchaseCost) : '',
      currentValue: asset.currentValue ? String(asset.currentValue) : '',
      warrantyExpiryDate: asset.warrantyExpiryDate || '',
      status: asset.status || 'AVAILABLE',
      condition: asset.condition || 'EXCELLENT',
      siteId: asset.siteId || '',
      warehouseLocation: asset.warehouseLocation || 'Central Security Store',
      nextMaintenanceDate: asset.nextMaintenanceDate || '',
      specifications: asset.specifications || '',
      notes: asset.notes || ''
    });
    setIsAssetModalOpen(true);
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetForm.assetName.trim() || !assetForm.assetCode.trim()) {
      showToast('Please provide Asset Name and Asset Code');
      return;
    }

    setSubmitting(true);
    const selectedSite = sites.find(s => s.id === assetForm.siteId);
    const assetId = editingAsset ? editingAsset.id : `AST-${Date.now()}`;
    const pCost = Number(assetForm.purchaseCost) || 0;
    const cVal = assetForm.currentValue ? Number(assetForm.currentValue) : pCost;

    const payload: AssetRecord = {
      id: assetId,
      companyId,
      assetCode: assetForm.assetCode.trim().toUpperCase(),
      assetName: assetForm.assetName.trim(),
      category: assetForm.category,
      brand: assetForm.brand.trim(),
      model: assetForm.model.trim(),
      serialNumber: assetForm.serialNumber.trim(),
      barcodeOrQr: (assetForm.barcodeOrQr || assetForm.assetCode).trim().toUpperCase(),
      purchaseDate: assetForm.purchaseDate,
      purchaseCost: pCost,
      currentValue: cVal,
      warrantyExpiryDate: assetForm.warrantyExpiryDate || '',
      status: assetForm.status,
      condition: assetForm.condition,
      siteId: assetForm.siteId || '',
      siteName: selectedSite?.name || '',
      warehouseLocation: assetForm.warehouseLocation.trim(),
      nextMaintenanceDate: assetForm.nextMaintenanceDate || '',
      specifications: assetForm.specifications.trim(),
      notes: assetForm.notes.trim(),
      createdAt: editingAsset?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const success = await FirestoreService.saveAsset(
      companyId,
      payload,
      { uid: userSession.userId, name: userSession.fullName }
    );

    setSubmitting(false);
    if (success) {
      setIsAssetModalOpen(false);
      showToast(editingAsset ? 'Asset updated successfully' : 'New asset registered successfully');
    } else {
      showToast('Failed to save asset. Please try again.');
    }
  };

  // Handle Assign Custody (Check-Out)
  const handleAssignCustody = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetForAssign || !assignForm.employeeId) {
      showToast('Please select an employee/guard to assign');
      return;
    }

    setSubmitting(true);
    const selectedEmp = employees.find(e => e.id === assignForm.employeeId);
    const selectedSite = sites.find(s => s.id === assignForm.siteId);

    const empName = selectedEmp ? `${selectedEmp.firstName} ${selectedEmp.lastName || ''}`.trim() : assignForm.employeeId;

    const success = await FirestoreService.assignAssetCustody(
      companyId,
      selectedAssetForAssign,
      {
        employeeId: assignForm.employeeId,
        employeeName: empName,
        siteId: assignForm.siteId || selectedAssetForAssign.siteId,
        siteName: selectedSite?.name || selectedAssetForAssign.siteName,
        expectedReturnDate: assignForm.expectedReturnDate,
        condition: assignForm.condition,
        remarks: assignForm.remarks
      },
      { uid: userSession.userId, name: userSession.fullName }
    );

    setSubmitting(false);
    if (success) {
      setIsAssignModalOpen(false);
      setSelectedAssetForAssign(null);
      showToast(`Asset issued to ${empName}`);
    } else {
      showToast('Failed to issue asset.');
    }
  };

  // Handle Return Custody (Check-In)
  const handleReturnCustody = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetForReturn) return;

    setSubmitting(true);
    const selectedSite = sites.find(s => s.id === returnForm.siteId);

    const success = await FirestoreService.returnAssetCustody(
      companyId,
      selectedAssetForReturn,
      {
        condition: returnForm.condition,
        warehouseLocation: returnForm.warehouseLocation,
        siteId: returnForm.siteId,
        siteName: selectedSite?.name,
        sendToMaintenance: returnForm.sendToMaintenance,
        remarks: returnForm.remarks
      },
      { uid: userSession.userId, name: userSession.fullName }
    );

    setSubmitting(false);
    if (success) {
      setIsReturnModalOpen(false);
      setSelectedAssetForReturn(null);
      showToast('Asset returned and custody updated');
    } else {
      showToast('Failed to return asset.');
    }
  };

  // Handle Physical Verification (Audit Scan)
  const handleRecordAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetForAudit) return;

    setSubmitting(true);
    const success = await FirestoreService.recordPhysicalAssetAudit(
      companyId,
      selectedAssetForAudit,
      {
        condition: auditForm.condition,
        verifiedLocation: auditForm.verifiedLocation,
        notes: auditForm.notes
      },
      { uid: userSession.userId, name: userSession.fullName }
    );

    setSubmitting(false);
    if (success) {
      setIsAuditModalOpen(false);
      setSelectedAssetForAudit(null);
      showToast(`Physical audit recorded for ${selectedAssetForAudit.assetName}`);
    } else {
      showToast('Failed to record audit.');
    }
  };

  // Handle Maintenance Logging
  const handleRecordMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetForMaintenance) return;

    setSubmitting(true);
    const cost = Number(maintenanceForm.serviceCost) || 0;
    const nextStatus = maintenanceForm.returnToAvailable ? 'AVAILABLE' : 'UNDER_MAINTENANCE';

    const success = await FirestoreService.recordAssetMaintenance(
      companyId,
      {
        companyId,
        assetId: selectedAssetForMaintenance.id,
        assetCode: selectedAssetForMaintenance.assetCode,
        assetName: selectedAssetForMaintenance.assetName,
        serviceVendor: maintenanceForm.serviceVendor.trim() || 'Internal Technician',
        serviceDate: maintenanceForm.serviceDate,
        serviceCost: cost,
        serviceType: maintenanceForm.serviceType,
        issueDescription: maintenanceForm.issueDescription.trim(),
        actionTaken: maintenanceForm.actionTaken.trim(),
        nextServiceDate: maintenanceForm.nextServiceDate || '',
        status: maintenanceForm.status,
        loggedByUid: userSession.userId,
        loggedByName: userSession.fullName
      },
      selectedAssetForMaintenance,
      nextStatus,
      { uid: userSession.userId, name: userSession.fullName }
    );

    setSubmitting(false);
    if (success) {
      setIsMaintenanceModalOpen(false);
      setSelectedAssetForMaintenance(null);
      showToast('Asset maintenance record saved');
    } else {
      showToast('Failed to log maintenance.');
    }
  };

  // Handle Asset Deletion
  const handleDeleteAsset = async (asset: AssetRecord) => {
    if (!window.confirm(`Are you sure you want to delete asset "${asset.assetName}" (${asset.assetCode})? This action cannot be undone.`)) {
      return;
    }

    const success = await FirestoreService.deleteAsset(
      companyId,
      asset.id,
      { uid: userSession.userId, name: userSession.fullName }
    );

    if (success) {
      showToast('Asset deleted successfully');
    } else {
      showToast('Failed to delete asset.');
    }
  };

  // Scanner Simulator
  const handleLookupScanCode = () => {
    if (!scanCodeInput.trim()) return;
    const query = scanCodeInput.trim().toUpperCase();
    const found = assets.find(a => 
      a.assetCode.toUpperCase() === query || 
      (a.barcodeOrQr && a.barcodeOrQr.toUpperCase() === query) ||
      (a.serialNumber && a.serialNumber.toUpperCase() === query)
    );

    if (found) {
      setScannedAssetResult(found);
    } else {
      setScannedAssetResult(null);
      showToast('No matching asset found for this code');
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (assets.length === 0) {
      showToast('No asset records to export');
      return;
    }

    const headers = [
      'Asset Code',
      'Asset Name',
      'Category',
      'Brand',
      'Model',
      'Serial Number',
      'Status',
      'Condition',
      'Assigned Employee',
      'Assigned Site',
      'Warehouse Location',
      'Purchase Date',
      'Purchase Cost (INR)',
      'Current Value (INR)',
      'Last Audit Date',
      'Next Maintenance'
    ];

    const rows = assets.map(a => [
      `"${a.assetCode || ''}"`,
      `"${a.assetName || ''}"`,
      `"${a.category || ''}"`,
      `"${a.brand || ''}"`,
      `"${a.model || ''}"`,
      `"${a.serialNumber || ''}"`,
      `"${a.status || ''}"`,
      `"${a.condition || ''}"`,
      `"${a.assignedEmployeeName || 'Unassigned'}"`,
      `"${a.siteName || ''}"`,
      `"${a.warehouseLocation || ''}"`,
      `"${a.purchaseDate || ''}"`,
      a.purchaseCost || 0,
      a.currentValue || 0,
      `"${a.lastAuditDate ? new Date(a.lastAuditDate).toLocaleDateString() : 'Pending'}"`,
      `"${a.nextMaintenanceDate || 'None'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Asset_Register_${activeCompany?.brandName || 'Company'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Asset register exported to CSV');
  };

  // Helper Badge Color
  const getStatusBadge = (status: AssetStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'ASSIGNED':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800';
      case 'UNDER_MAINTENANCE':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'DAMAGED':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      case 'LOST':
      case 'DISPOSED':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getConditionBadge = (condition: AssetCondition) => {
    switch (condition) {
      case 'NEW':
      case 'EXCELLENT':
        return 'text-emerald-600 dark:text-emerald-400 font-semibold';
      case 'GOOD':
        return 'text-blue-600 dark:text-blue-400 font-semibold';
      case 'FAIR':
        return 'text-amber-600 dark:text-amber-400 font-semibold';
      case 'POOR':
        return 'text-rose-600 dark:text-rose-400 font-bold';
      default:
        return 'text-slate-500';
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} p-4 sm:p-6 lg:p-8 font-sans`}>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 bg-indigo-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                <Boxes className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  Asset Tracking & Custody
                </h1>
                <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                  {activeCompany?.brandName || 'Enterprise'} • Security Radios, Scanners, Patrol Gear, Vehicles & IT Hardware
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsBulkQrModalOpen(true)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 ${
                isDark 
                  ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200' 
                  : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700 shadow-sm'
              }`}
            >
              <Printer className="w-4 h-4 text-purple-500" />
              <span>Print QR Sheet (सर्व QR प्रिंट)</span>
            </button>

            <button
              onClick={handleExportCSV}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 ${
                isDark 
                  ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200' 
                  : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700 shadow-sm'
              }`}
            >
              <Download className="w-4 h-4 text-indigo-500" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={openCreateAssetModal}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Asset (नवीन साधन)</span>
            </button>
          </div>
        </div>

        {/* KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Total Assets */}
          <div className={`p-4 sm:p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Assets</span>
              <Boxes className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {totalAssetsCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Active inventory tags</p>
          </div>

          {/* Total Valuation */}
          <div className={`p-4 sm:p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Asset Valuation</span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              ₹{totalValuation.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Book / Purchase value</p>
          </div>

          {/* In Custody / Assigned */}
          <div className={`p-4 sm:p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">In Active Custody</span>
              <UserCheck className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
              {assignedCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Issued to guards/staff</p>
          </div>

          {/* Available in Store */}
          <div className={`p-4 sm:p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">In Store / Available</span>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {availableCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Ready for deployment</p>
          </div>

          {/* Maintenance / Repair */}
          <div className={`p-4 sm:p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm col-span-2 lg:col-span-1`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Maintenance & Repair</span>
              <Wrench className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              {maintenanceCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Servicing / Calibration</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('REGISTER')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap px-2 ${
              activeTab === 'REGISTER'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Asset Master Register ({assets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('MOVEMENTS')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap px-2 ${
              activeTab === 'MOVEMENTS'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Custody & Movement Ledger ({movements.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('MAINTENANCE')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap px-2 ${
              activeTab === 'MAINTENANCE'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Maintenance & Servicing ({maintenanceRecords.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('SCANNER')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap px-2 ${
              activeTab === 'SCANNER'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <QrCode className="w-4 h-4 text-purple-500" />
            <span>Barcode / QR Verifier</span>
          </button>
        </div>

        {/* TAB 1: ASSET MASTER REGISTER */}
        {activeTab === 'REGISTER' && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between`}>
              <div className="relative w-full md:w-80">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Asset, Tag, Serial #, Brand..."
                  className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border focus:outline-none transition ${
                    isDark 
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-600'
                  }`}
                />
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className={`px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <option value="ALL">All Categories</option>
                  <option value="SECURITY_EQUIPMENT">Security Equipment (Metal Detector, Body Cam)</option>
                  <option value="COMMUNICATION_RADIO">Walkie-Talkie & Wireless</option>
                  <option value="ELECTRONICS_IT">Electronics & IT Hardware</option>
                  <option value="VEHICLES">Patrol Vehicles & Vans</option>
                  <option value="WEAPONS_TACTICAL">Tactical & Guard Gear</option>
                  <option value="FACILITY_SAFETY">Fire & Safety Apparatus</option>
                  <option value="OTHER">Other Assets</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="AVAILABLE">Available in Store</option>
                  <option value="ASSIGNED">Assigned (In Custody)</option>
                  <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                  <option value="DAMAGED">Damaged / Scrap</option>
                  <option value="LOST">Lost / Missing</option>
                </select>

                <select
                  value={siteFilter}
                  onChange={(e) => setSiteFilter(e.target.value)}
                  className={`px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <option value="ALL">All Sites</option>
                  {sites.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Assets Table / Grid */}
            {loading ? (
              <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-4 border-slate-300 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
                <p className="text-xs font-semibold">Loading Asset Catalog...</p>
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className={`p-12 text-center rounded-2xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                <Boxes className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-40" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No assets matching your filters</h3>
                <p className="text-xs text-slate-500 mt-1">Register new walkie-talkies, detectors, vehicles or hardware to start tracking.</p>
                <button
                  onClick={openCreateAssetModal}
                  className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow transition"
                >
                  Register First Asset
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAssets.map(asset => (
                  <div 
                    key={asset.id} 
                    className={`rounded-2xl border p-5 transition-all hover:shadow-md ${
                      isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
                    } flex flex-col justify-between`}
                  >
                    <div>
                      {/* Card Header: Code & Status */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900">
                              {asset.assetCode}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getStatusBadge(asset.status)}`}>
                              {asset.status.replace('_', ' ')}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5 line-clamp-1">
                            {asset.assetName}
                          </h3>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedAssetForQr(asset);
                            setIsQrModalOpen(true);
                          }}
                          title="View QR Code & Tag"
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                        >
                          <QrCode className="w-4 h-4 text-purple-500" />
                        </button>
                      </div>

                      {/* Brand, Model & Specs */}
                      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Brand / Model:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-200">{asset.brand} {asset.model}</span>
                        </div>
                        {asset.serialNumber && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Serial #:</span>
                            <span className="font-mono font-medium text-slate-700 dark:text-slate-200">{asset.serialNumber}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Condition:</span>
                          <span className={getConditionBadge(asset.condition)}>{asset.condition}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Current Value:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{(asset.currentValue || asset.purchaseCost || 0).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Current Custody / Assignment info */}
                      <div className="py-3 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                          <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Custodian: </span>
                          <strong className="text-slate-800 dark:text-slate-200">
                            {asset.assignedEmployeeName ? asset.assignedEmployeeName : 'In Central Store'}
                          </strong>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                          <Building2 className="w-3.5 h-3.5 text-sky-500" />
                          <span>Location: </span>
                          <span className="text-slate-700 dark:text-slate-300 truncate">
                            {asset.siteName || asset.warehouseLocation || 'Main Warehouse'}
                          </span>
                        </div>
                        {asset.lastAuditDate && (
                          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] pt-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-500" />
                            <span>Audited: {new Date(asset.lastAuditDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1">
                        {asset.status === 'AVAILABLE' ? (
                          <button
                            onClick={() => {
                              setSelectedAssetForAssign(asset);
                              setAssignForm({
                                employeeId: '',
                                siteId: asset.siteId || '',
                                expectedReturnDate: '',
                                condition: asset.condition,
                                remarks: ''
                              });
                              setIsAssignModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition flex items-center gap-1"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Issue</span>
                          </button>
                        ) : asset.status === 'ASSIGNED' ? (
                          <button
                            onClick={() => {
                              setSelectedAssetForReturn(asset);
                              setReturnForm({
                                condition: asset.condition,
                                warehouseLocation: asset.warehouseLocation || 'Central Security Store',
                                siteId: asset.siteId || '',
                                sendToMaintenance: false,
                                remarks: ''
                              });
                              setIsReturnModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition flex items-center gap-1"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>Return</span>
                          </button>
                        ) : null}

                        {asset.status === 'ASSIGNED' && (
                          <button
                            onClick={() => {
                              setSelectedAssetForGatePass(asset);
                              setIsGatePassModalOpen(true);
                            }}
                            title="Print Handover Gate Pass (कस्टडी पावती)"
                            className="p-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 transition"
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-500" />
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setSelectedAssetForAudit(asset);
                            setAuditForm({
                              condition: asset.condition,
                              verifiedLocation: asset.siteName || asset.warehouseLocation || 'On-Site',
                              notes: ''
                            });
                            setIsAuditModalOpen(true);
                          }}
                          title="Physical Verification Audit"
                          className="p-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedAssetForMaintenance(asset);
                            setMaintenanceForm({
                              serviceVendor: '',
                              serviceDate: new Date().toISOString().split('T')[0],
                              serviceCost: '',
                              serviceType: 'PREVENTIVE_CALIBRATION',
                              issueDescription: '',
                              actionTaken: '',
                              nextServiceDate: '',
                              status: 'COMPLETED',
                              returnToAvailable: true
                            });
                            setIsMaintenanceModalOpen(true);
                          }}
                          title="Log Maintenance & Servicing"
                          className="p-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                        >
                          <Wrench className="w-3.5 h-3.5 text-amber-500" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditAssetModal(asset)}
                          title="Edit Details"
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAsset(asset)}
                          title="Delete Asset"
                          className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CUSTODY & MOVEMENT LEDGER */}
        {activeTab === 'MOVEMENTS' && (
          <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm space-y-4`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Immutable Custody & Movement Log</h3>
                <p className="text-xs text-slate-500">Every check-out, check-in, repair handover and audit trail.</p>
              </div>
            </div>

            {movements.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No asset movement transactions recorded yet. Hand over or audit assets to generate ledger entries.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`border-b ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                      <th className="py-3 px-3 font-semibold">Timestamp</th>
                      <th className="py-3 px-3 font-semibold">Asset Tag</th>
                      <th className="py-3 px-3 font-semibold">Action</th>
                      <th className="py-3 px-3 font-semibold">Custodian / Personnel</th>
                      <th className="py-3 px-3 font-semibold">Location / Site</th>
                      <th className="py-3 px-3 font-semibold">Condition</th>
                      <th className="py-3 px-3 font-semibold">Logged By</th>
                      <th className="py-3 px-3 font-semibold">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {movements.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                        <td className="py-3 px-3 font-mono text-slate-500">
                          {new Date(m.timestamp).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{m.assetCode}</span>
                          <span className="block text-[11px] text-slate-500 truncate max-w-[150px]">{m.assetName}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            m.action === 'CHECK_OUT' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300' :
                            m.action === 'CHECK_IN' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300' :
                            m.action === 'AUDIT_VERIFIED' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300' :
                            'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                          }`}>
                            {m.action.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                          {m.employeeName || '—'}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                          {m.siteName || 'Central Store'}
                        </td>
                        <td className="py-3 px-3">
                          <span className={getConditionBadge(m.conditionAtAction)}>{m.conditionAtAction}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {m.performedByName}
                        </td>
                        <td className="py-3 px-3 text-slate-500 italic max-w-[200px] truncate">
                          {m.remarks || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MAINTENANCE & SERVICING LOG */}
        {activeTab === 'MAINTENANCE' && (
          <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm space-y-4`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Maintenance, Calibration & AMC Log</h3>
                <p className="text-xs text-slate-500">Service records, repairs, vendor invoices and scheduled calibration.</p>
              </div>
            </div>

            {maintenanceRecords.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No maintenance or servicing records logged. Use "Log Maintenance" on any asset to register repairs.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {maintenanceRecords.map(m => (
                  <div key={m.id} className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-indigo-500">{m.assetCode}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {m.serviceType.replace('_', ' ')}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">{m.assetName}</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      <strong>Vendor / Service By:</strong> {m.serviceVendor}
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      <strong>Issue / Reason:</strong> {m.issueDescription}
                    </p>
                    {m.actionTaken && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        <strong>Action Taken:</strong> {m.actionTaken}
                      </p>
                    )}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">Cost: ₹{m.serviceCost.toLocaleString()}</span>
                      <span className="text-slate-400">Date: {m.serviceDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: BARCODE / QR ASSET SCANNER & VERIFIER */}
        {activeTab === 'SCANNER' && (
          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm space-y-6 max-w-2xl mx-auto text-center`}>
            <div className="w-16 h-16 rounded-3xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto shadow-inner">
              <QrCode className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Barcode & QR Code Asset Verifier</h3>
              <p className="text-xs text-slate-500 mt-1">Scan or enter Asset Tag / Barcode / Serial Number to audit or inspect on the spot.</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={scanCodeInput}
                onChange={(e) => setScanCodeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookupScanCode()}
                placeholder="Scan or type AST-2026-001, Serial #..."
                className={`flex-1 px-4 py-3 rounded-xl text-xs font-mono uppercase border focus:outline-none transition ${
                  isDark 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-purple-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-purple-600'
                }`}
              />
              <button
                onClick={handleLookupScanCode}
                className="px-5 py-3 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow transition flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                <span>Verify Asset</span>
              </button>
            </div>

            {scannedAssetResult && (
              <div className={`p-5 rounded-2xl border text-left animate-in fade-in ${
                isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-purple-50/50 border-purple-200'
              } space-y-3`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">{scannedAssetResult.assetCode}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getStatusBadge(scannedAssetResult.status)}`}>
                    {scannedAssetResult.status}
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">{scannedAssetResult.assetName}</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <div><strong>Brand:</strong> {scannedAssetResult.brand} {scannedAssetResult.model}</div>
                  <div><strong>Serial #:</strong> {scannedAssetResult.serialNumber || 'N/A'}</div>
                  <div><strong>Current Custodian:</strong> {scannedAssetResult.assignedEmployeeName || 'In Store'}</div>
                  <div><strong>Location:</strong> {scannedAssetResult.siteName || scannedAssetResult.warehouseLocation}</div>
                  <div><strong>Condition:</strong> <span className={getConditionBadge(scannedAssetResult.condition)}>{scannedAssetResult.condition}</span></div>
                  <div><strong>Value:</strong> ₹{(scannedAssetResult.currentValue || 0).toLocaleString()}</div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedAssetForAudit(scannedAssetResult);
                      setAuditForm({
                        condition: scannedAssetResult.condition,
                        verifiedLocation: scannedAssetResult.siteName || scannedAssetResult.warehouseLocation || 'On-Site Verified',
                        notes: 'Verified via Barcode Scanner'
                      });
                      setIsAuditModalOpen(true);
                    }}
                    className="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Physical Audit Today</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: REGISTER / EDIT ASSET                                           */}
      {/* ========================================================================= */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          } max-h-[90vh] flex flex-col animate-in zoom-in-95`}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes className="w-4 h-4 text-indigo-500" />
                <span>{editingAsset ? 'Edit Asset Profile' : 'Register New Asset Tag'}</span>
              </h2>
              <button 
                onClick={() => setIsAssetModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Asset Tag / Code *
                  </label>
                  <input
                    type="text"
                    value={assetForm.assetCode}
                    onChange={(e) => setAssetForm({ ...assetForm, assetCode: e.target.value })}
                    required
                    placeholder="e.g. AST-2026-001"
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono uppercase border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Category *
                  </label>
                  <select
                    value={assetForm.category}
                    onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value as AssetCategory })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="SECURITY_EQUIPMENT">Security Equipment (Metal Detector, Bodycam)</option>
                    <option value="COMMUNICATION_RADIO">Walkie-Talkie & Wireless Radios</option>
                    <option value="ELECTRONICS_IT">Electronics & IT Hardware (NVR, Bio-reader)</option>
                    <option value="VEHICLES">Patrol Vehicles / Vans / Bikes</option>
                    <option value="WEAPONS_TACTICAL">Tactical Gear / Baton / Torch</option>
                    <option value="FACILITY_SAFETY">Fire & Safety Apparatus</option>
                    <option value="FURNITURE_FIXTURES">Furniture & Fixtures</option>
                    <option value="OTHER">Other Equipment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Asset Name / Description *
                </label>
                <input
                  type="text"
                  value={assetForm.assetName}
                  onChange={(e) => setAssetForm({ ...assetForm, assetName: e.target.value })}
                  required
                  placeholder="e.g. Motorola CP040 16CH Walkie Talkie"
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Brand / Make
                  </label>
                  <input
                    type="text"
                    value={assetForm.brand}
                    onChange={(e) => setAssetForm({ ...assetForm, brand: e.target.value })}
                    placeholder="e.g. Motorola, Garrett, Hikvision"
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Model #
                  </label>
                  <input
                    type="text"
                    value={assetForm.model}
                    onChange={(e) => setAssetForm({ ...assetForm, model: e.target.value })}
                    placeholder="e.g. CP-040 VHF"
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Manufacturer Serial #
                  </label>
                  <input
                    type="text"
                    value={assetForm.serialNumber}
                    onChange={(e) => setAssetForm({ ...assetForm, serialNumber: e.target.value })}
                    placeholder="e.g. SN-88392019"
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Purchase Cost (₹)
                  </label>
                  <input
                    type="number"
                    value={assetForm.purchaseCost}
                    onChange={(e) => setAssetForm({ ...assetForm, purchaseCost: e.target.value })}
                    placeholder="0.00"
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Current Book Value (₹)
                  </label>
                  <input
                    type="number"
                    value={assetForm.currentValue}
                    onChange={(e) => setAssetForm({ ...assetForm, currentValue: e.target.value })}
                    placeholder="Same as purchase or depreciated"
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={assetForm.purchaseDate}
                    onChange={(e) => setAssetForm({ ...assetForm, purchaseDate: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Initial Status
                  </label>
                  <select
                    value={assetForm.status}
                    onChange={(e) => setAssetForm({ ...assetForm, status: e.target.value as AssetStatus })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="AVAILABLE">AVAILABLE (In Store)</option>
                    <option value="ASSIGNED">ASSIGNED (In Custody)</option>
                    <option value="UNDER_MAINTENANCE">UNDER MAINTENANCE</option>
                    <option value="DAMAGED">DAMAGED</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Physical Condition
                  </label>
                  <select
                    value={assetForm.condition}
                    onChange={(e) => setAssetForm({ ...assetForm, condition: e.target.value as AssetCondition })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="NEW">Brand New</option>
                    <option value="EXCELLENT">Excellent</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair (Usable)</option>
                    <option value="POOR">Poor (Needs Attention)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Primary Site / Branch
                  </label>
                  <select
                    value={assetForm.siteId}
                    onChange={(e) => setAssetForm({ ...assetForm, siteId: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="">Central Store / Head Office</option>
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Storage Shelf / Warehouse Location
                </label>
                <input
                  type="text"
                  value={assetForm.warehouseLocation}
                  onChange={(e) => setAssetForm({ ...assetForm, warehouseLocation: e.target.value })}
                  placeholder="e.g. Armory Locker #4, Rack B-2"
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssetModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingAsset ? 'Update Asset' : 'Register Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ISSUE CUSTODY (CHECK-OUT)                                       */}
      {/* ========================================================================= */}
      {isAssignModalOpen && selectedAssetForAssign && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl p-6 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          } animate-in zoom-in-95 space-y-4`}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-500" />
                <span>Issue Asset: {selectedAssetForAssign.assetName}</span>
              </h2>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignCustody} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Assign To Guard / Employee *
                </label>
                <select
                  value={assignForm.employeeId}
                  onChange={(e) => setAssignForm({ ...assignForm, employeeId: e.target.value })}
                  required
                  className={`w-full px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="">Select Employee / Guard...</option>
                  {employees.filter(e => e.status === 'ACTIVE').map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName || ''} ({emp.employeeId || emp.id})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Deployment Site
                  </label>
                  <select
                    value={assignForm.siteId}
                    onChange={(e) => setAssignForm({ ...assignForm, siteId: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="">Current Assigned Site</option>
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Condition at Handover
                  </label>
                  <select
                    value={assignForm.condition}
                    onChange={(e) => setAssignForm({ ...assignForm, condition: e.target.value as AssetCondition })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="EXCELLENT">Excellent (Flawless)</option>
                    <option value="GOOD">Good (Working)</option>
                    <option value="FAIR">Fair (Minor Scratches)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Expected Return Date (Optional)
                </label>
                <input
                  type="date"
                  value={assignForm.expectedReturnDate}
                  onChange={(e) => setAssignForm({ ...assignForm, expectedReturnDate: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Remarks / Handover Notes
                </label>
                <input
                  type="text"
                  value={assignForm.remarks}
                  onChange={(e) => setAssignForm({ ...assignForm, remarks: e.target.value })}
                  placeholder="e.g. Issued with charger and holster"
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow transition disabled:opacity-50"
                >
                  {submitting ? 'Issuing...' : 'Confirm Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RETURN CUSTODY (CHECK-IN)                                       */}
      {/* ========================================================================= */}
      {isReturnModalOpen && selectedAssetForReturn && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl p-6 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          } animate-in zoom-in-95 space-y-4`}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-emerald-500" />
                <span>Return Asset to Store: {selectedAssetForReturn.assetName}</span>
              </h2>
              <button onClick={() => setIsReturnModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Returning from: <strong>{selectedAssetForReturn.assignedEmployeeName}</strong>
            </p>

            <form onSubmit={handleReturnCustody} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Return Condition *
                </label>
                <select
                  value={returnForm.condition}
                  onChange={(e) => setReturnForm({ ...returnForm, condition: e.target.value as AssetCondition })}
                  className={`w-full px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="EXCELLENT">Excellent (No defects)</option>
                  <option value="GOOD">Good (Normal wear)</option>
                  <option value="FAIR">Fair (Needs cleaning)</option>
                  <option value="POOR">Poor (Damaged / Broken)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Storage Location
                </label>
                <input
                  type="text"
                  value={returnForm.warehouseLocation}
                  onChange={(e) => setReturnForm({ ...returnForm, warehouseLocation: e.target.value })}
                  placeholder="e.g. Armory Locker #4"
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="sendMaintenance"
                  checked={returnForm.sendToMaintenance}
                  onChange={(e) => setReturnForm({ ...returnForm, sendToMaintenance: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="sendMaintenance" className="text-xs font-medium text-amber-500 cursor-pointer">
                  Send directly to Maintenance / Repair queue (if defective)
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Remarks / Return Inspection Notes
                </label>
                <input
                  type="text"
                  value={returnForm.remarks}
                  onChange={(e) => setReturnForm({ ...returnForm, remarks: e.target.value })}
                  placeholder="e.g. Inspected by Supervisor. Fully working."
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition disabled:opacity-50"
                >
                  {submitting ? 'Returning...' : 'Accept Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: PHYSICAL AUDIT VERIFICATION                                     */}
      {/* ========================================================================= */}
      {isAuditModalOpen && selectedAssetForAudit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          } animate-in zoom-in-95 space-y-4`}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Physical Verification Audit</span>
              </h2>
              <button onClick={() => setIsAuditModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-xs">
              <p className="font-bold text-slate-800 dark:text-slate-100">{selectedAssetForAudit.assetName}</p>
              <p className="font-mono text-indigo-500">{selectedAssetForAudit.assetCode}</p>
            </div>

            <form onSubmit={handleRecordAudit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Verified Physical Condition
                </label>
                <select
                  value={auditForm.condition}
                  onChange={(e) => setAuditForm({ ...auditForm, condition: e.target.value as AssetCondition })}
                  className={`w-full px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="EXCELLENT">EXCELLENT (Operating flawlessly)</option>
                  <option value="GOOD">GOOD (Operating)</option>
                  <option value="FAIR">FAIR (Minor issues)</option>
                  <option value="POOR">POOR (Damaged / Needs service)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Verified Location / Site
                </label>
                <input
                  type="text"
                  value={auditForm.verifiedLocation}
                  onChange={(e) => setAuditForm({ ...auditForm, verifiedLocation: e.target.value })}
                  placeholder="e.g. North Gate Control Desk"
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Audit Notes / Remarks
                </label>
                <input
                  type="text"
                  value={auditForm.notes}
                  onChange={(e) => setAuditForm({ ...auditForm, notes: e.target.value })}
                  placeholder="e.g. Physical serial number matched"
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAuditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Mark Audited Today'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: LOG MAINTENANCE & SERVICING                                     */}
      {/* ========================================================================= */}
      {isMaintenanceModalOpen && selectedAssetForMaintenance && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl p-6 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          } animate-in zoom-in-95 space-y-4`}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-500" />
                <span>Log Maintenance: {selectedAssetForMaintenance.assetName}</span>
              </h2>
              <button onClick={() => setIsMaintenanceModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordMaintenance} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Service Type *
                  </label>
                  <select
                    value={maintenanceForm.serviceType}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, serviceType: e.target.value as AssetMaintenanceType })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="PREVENTIVE_CALIBRATION">Preventive / Calibration</option>
                    <option value="REPAIR">Repair / Defect Fix</option>
                    <option value="ANNUAL_AMC">Annual AMC Servicing</option>
                    <option value="PARTS_REPLACEMENT">Parts / Battery Replacement</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Service Vendor / Technician
                  </label>
                  <input
                    type="text"
                    value={maintenanceForm.serviceVendor}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, serviceVendor: e.target.value })}
                    placeholder="e.g. Motorola Service Centre"
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Servicing Cost (₹)
                  </label>
                  <input
                    type="number"
                    value={maintenanceForm.serviceCost}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, serviceCost: e.target.value })}
                    placeholder="0.00"
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Service Date
                  </label>
                  <input
                    type="date"
                    value={maintenanceForm.serviceDate}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, serviceDate: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Issue / Defect Description
                </label>
                <input
                  type="text"
                  value={maintenanceForm.issueDescription}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, issueDescription: e.target.value })}
                  placeholder="e.g. Battery not holding charge, antenna loose"
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Action Taken / Resolution
                </label>
                <input
                  type="text"
                  value={maintenanceForm.actionTaken}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, actionTaken: e.target.value })}
                  placeholder="e.g. Replaced Li-Ion cell pack and calibrated"
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="returnAvailable"
                  checked={maintenanceForm.returnToAvailable}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, returnToAvailable: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="returnAvailable" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  Service Complete: Set Asset Status back to "AVAILABLE (In Store)"
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMaintenanceModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow transition disabled:opacity-50"
                >
                  {submitting ? 'Logging...' : 'Save Service Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: VIEW & PRINT QR CODE TAG                                        */}
      {/* ========================================================================= */}
      {isQrModalOpen && selectedAssetForQr && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl border shadow-2xl p-6 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          } animate-in zoom-in-95 text-center space-y-4`}>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Asset QR & Barcode Tag</h2>
              <button onClick={() => setIsQrModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Label View */}
            <div className="p-6 rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-sm space-y-3">
              <div className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase">
                {activeCompany?.brandName || 'LOG SHEET MUSTER'}
              </div>
              
              {/* QR Code Representation */}
              <div className="w-36 h-36 mx-auto bg-slate-950 p-2 rounded-xl flex items-center justify-center">
                <QrCode className="w-28 h-28 text-white" />
              </div>

              <div className="space-y-0.5">
                <div className="font-mono text-base font-black tracking-wider text-slate-950">
                  {selectedAssetForQr.assetCode}
                </div>
                <div className="text-xs font-bold text-slate-800 line-clamp-1">
                  {selectedAssetForQr.assetName}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  SN: {selectedAssetForQr.serialNumber || 'N/A'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  window.print();
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow transition flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print Asset Tag</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: OFFICIAL CUSTODY HANDOVER VOUCHER / GATE PASS                    */}
      {/* ========================================================================= */}
      {isGatePassModalOpen && selectedAssetForGatePass && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl p-6 sm:p-8 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          } animate-in zoom-in-95 space-y-6 my-8`}>
            
            <div className="flex items-center justify-between no-print">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Official Equipment Gate Pass & Handover Slip (साधन वाटप पावती)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow transition flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Gate Pass</span>
                </button>
                <button 
                  onClick={() => setIsGatePassModalOpen(false)} 
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-6 sm:p-8 rounded-2xl bg-white text-slate-900 border-2 border-slate-800 space-y-6 font-sans">
              {/* Header */}
              <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-950">
                  {activeCompany?.brandName || 'LOG SHEET MUSTER ENTERPRISE'}
                </h2>
                <p className="text-xs font-semibold text-slate-700">
                  SECURITY & FACILITY OPERATIONS • ASSET CUSTODY VOUCHER
                </p>
                <div className="inline-block px-3 py-1 bg-slate-900 text-white text-[11px] font-mono font-bold rounded mt-1 uppercase">
                  GATE PASS / HANDOVER SLIP # GP-{selectedAssetForGatePass.assetCode}
                </div>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-300 pb-4">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Issue Date & Time:</span>
                  <span className="font-semibold text-slate-900">{new Date().toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Assigned Duty Site:</span>
                  <span className="font-semibold text-slate-900">{selectedAssetForGatePass.siteName || 'All Assigned Posts'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Custodian / Guard Name:</span>
                  <span className="font-bold text-slate-950 text-sm">{selectedAssetForGatePass.assignedEmployeeName || 'Authorized Personnel'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Issued By (Officer):</span>
                  <span className="font-semibold text-slate-900">{userSession.fullName}</span>
                </div>
              </div>

              {/* Equipment Specifics */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Equipment Particulars (साधन तपशील):
                </h4>
                <table className="w-full text-left text-xs border border-slate-400">
                  <thead className="bg-slate-100 border-b border-slate-400 font-bold">
                    <tr>
                      <th className="p-2 border-r border-slate-300">Asset Code</th>
                      <th className="p-2 border-r border-slate-300">Description / Model</th>
                      <th className="p-2 border-r border-slate-300">Serial #</th>
                      <th className="p-2 border-r border-slate-300">Condition</th>
                      <th className="p-2">Est. Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="p-2 font-mono font-bold border-r border-slate-300">{selectedAssetForGatePass.assetCode}</td>
                      <td className="p-2 border-r border-slate-300">
                        <strong>{selectedAssetForGatePass.assetName}</strong>
                        <div className="text-[10px] text-slate-600">{selectedAssetForGatePass.brand} {selectedAssetForGatePass.model}</div>
                      </td>
                      <td className="p-2 font-mono border-r border-slate-300">{selectedAssetForGatePass.serialNumber || 'N/A'}</td>
                      <td className="p-2 font-semibold border-r border-slate-300 text-emerald-700">{selectedAssetForGatePass.condition}</td>
                      <td className="p-2 font-mono">₹{(selectedAssetForGatePass.currentValue || selectedAssetForGatePass.purchaseCost || 0).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Custodian Terms & Declaration */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-300 text-[11px] text-slate-700 space-y-1">
                <p className="font-bold text-slate-900">Declaration & Undertaking (हमीपत्र):</p>
                <p>
                  1. I acknowledge that this equipment remains company property and has been issued strictly for official duty.
                </p>
                <p>
                  2. मी सदर साहित्य सुस्थितीत प्राप्त केले असून कर्तव्याच्या समाप्तीनंतर किंवा मागणी केल्यावर त्वरित सुस्थितीत परत करण्याची हमी देतो.
                </p>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-xs text-center border-t border-slate-300">
                <div className="space-y-12">
                  <div className="h-8 border-b border-dashed border-slate-600"></div>
                  <div>
                    <div className="font-bold text-slate-900">{userSession.fullName}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Issuing Authority / Store Incharge</div>
                  </div>
                </div>

                <div className="space-y-12">
                  <div className="h-8 border-b border-dashed border-slate-600"></div>
                  <div>
                    <div className="font-bold text-slate-900">{selectedAssetForGatePass.assignedEmployeeName}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Receiver / Guard Signature</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: BULK QR CODE STICKERS PRINT SHEET                                */}
      {/* ========================================================================= */}
      {isBulkQrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className={`w-full max-w-4xl rounded-3xl border shadow-2xl p-6 sm:p-8 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          } animate-in zoom-in-95 space-y-6 my-8`}>
            
            <div className="flex items-center justify-between no-print">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Bulk Asset QR / Barcode Sticker Sheet ({assets.length} Tags)
                </h2>
                <p className="text-xs text-slate-500">
                  Ready for A4 sticker sheet printing or barcode thermal labeling.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow transition flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Sticker Sheet</span>
                </button>
                <button 
                  onClick={() => setIsBulkQrModalOpen(false)} 
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sticker Grid */}
            <div className="p-6 rounded-2xl bg-white text-slate-900 border border-slate-200 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[70vh] overflow-y-auto">
              {assets.map(asset => (
                <div 
                  key={asset.id} 
                  className="p-3 border-2 border-slate-900 rounded-xl flex flex-col items-center justify-center text-center space-y-1.5 break-inside-avoid"
                >
                  <div className="text-[9px] font-bold text-indigo-700 tracking-wider uppercase truncate w-full">
                    {activeCompany?.brandName || 'LOG SHEET'}
                  </div>
                  <div className="w-20 h-20 bg-slate-950 p-1 rounded-lg flex items-center justify-center">
                    <QrCode className="w-16 h-16 text-white" />
                  </div>
                  <div className="font-mono text-xs font-black text-slate-950 tracking-wider">
                    {asset.assetCode}
                  </div>
                  <div className="text-[10px] font-bold text-slate-800 line-clamp-1 w-full">
                    {asset.assetName}
                  </div>
                  {asset.serialNumber && (
                    <div className="text-[8px] font-mono text-slate-500 truncate w-full">
                      SN: {asset.serialNumber}
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
