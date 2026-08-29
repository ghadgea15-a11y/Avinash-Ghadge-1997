import React, { useState } from 'react';
import { 
  PaymentBatchRecord, 
  BankExportFormat, 
  CompanyBankAccountRecord 
} from '../../types';
import { BankExportEngine } from '../../services/bankExportEngine';
import { FirestoreService } from '../../services/firestoreService';
import { 
  Download, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Building2, 
  CreditCard, 
  DollarSign, 
  ShieldCheck,
  Eye,
  FileSpreadsheet
} from 'lucide-react';

interface BankExportModalProps {
  batch: PaymentBatchRecord;
  companyBank: CompanyBankAccountRecord | null;
  companyId: string;
  actor: { uid: string; name: string };
  onClose: () => void;
  onExportSuccess: () => void;
}

export const BankExportModal: React.FC<BankExportModalProps> = ({
  batch,
  companyBank,
  companyId,
  actor,
  onClose,
  onExportSuccess
}) => {
  const [selectedFormat, setSelectedFormat] = useState<BankExportFormat>('STANDARD_CSV');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  // Generate file preview using the engine
  const fileResult = React.useMemo(() => {
    try {
      return BankExportEngine.generateBankExportFile(batch, companyBank, selectedFormat);
    } catch (err: any) {
      return null;
    }
  }, [batch, companyBank, selectedFormat]);

  const handleDownload = async () => {
    if (!fileResult) return;
    setExporting(true);
    setError(null);
    try {
      // 1. Download file to client
      BankExportEngine.downloadFile(fileResult);

      // 2. Record export metadata in Firestore
      const res = await FirestoreService.recordPaymentBatchExport(
        companyId,
        batch.id,
        selectedFormat,
        actor?.uid || 'SYSTEM'
      );

      if (res) {
        onExportSuccess();
      } else {
        setError('Failed to record export in audit logs');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to export bank file');
    } finally {
      setExporting(false);
    }
  };

  const previewLines = fileResult?.fileContent.split('\r\n').slice(0, 7) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white dark:bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-black dark:text-white">Secure NEFT / RTGS Bank File Export</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Batch: <span className="font-mono font-medium text-slate-900 dark:text-slate-300">{batch.batchNumber}</span> • {batch.payrollCycleLabel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-rose-700 text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Export Error</p>
                <p className="text-xs text-rose-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Batch Metrics Summary Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white dark:bg-slate-950 rounded-xl border border-slate-200/80">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Disbursement</p>
              <p className="text-xl font-bold text-black dark:text-white mt-1">₹{batch.totalAmount.toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5 flex items-center">
                <CheckCircle2 className="w-3 h-3 mr-1 inline" /> Authoritative Net Pay
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-slate-950 rounded-xl border border-slate-200/80">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Valid Beneficiaries</p>
              <p className="text-xl font-bold text-black dark:text-white mt-1">{batch.validBeneficiaryCount} / {batch.beneficiaryCount}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Mode: {batch.paymentMethod}</p>
            </div>
            <div className="p-4 bg-white dark:bg-slate-950 rounded-xl border border-slate-200/80">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Debit Bank Source</p>
              <p className="text-sm font-bold text-black dark:text-white mt-1 truncate">
                {companyBank?.bankName || batch.companyBankName || 'Company Account'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                {companyBank?.maskedAccountNumber || batch.companyMaskedAccount || '••••••••1234'}
              </p>
            </div>
          </div>

          {/* Export Format Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-300 mb-2">
              Select Corporate Bank Export Profile
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { id: 'STANDARD_CSV', name: 'Standard Universal NEFT/RTGS CSV', desc: 'Widely compatible with all Indian commercial banks' },
                { id: 'HDFC_CMS', name: 'HDFC Bank E-Net CMS Format', desc: 'Direct corporate CMS bulk upload specification' },
                { id: 'SBI_CORP', name: 'SBI Corporate Bulk Payment Format', desc: 'State Bank of India Corporate Banking standard' },
                { id: 'ICICI_E_BANKING', name: 'ICICI Bank E-Banking CMS', desc: 'Standard ICICI Corporate CMS template' },
                { id: 'KOTAK_CMS', name: 'Kotak Mahindra Corporate CMS', desc: 'Kotak bulk salary disbursement template' },
                { id: 'AXIS_BULK', name: 'Axis Bank Corporate Bulk', desc: 'Standard Axis Bank corporate file schema' },
                { id: 'PIPE_DELIMITED_TXT', name: 'Pipe-Delimited Bank Text File (.txt)', desc: 'Legacy core banking pipe delimited layout' }
              ].map(fmt => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setSelectedFormat(fmt.id as BankExportFormat)}
                  className={`p-3 text-left rounded-xl border transition-all ${
                    selectedFormat === fmt.id
                      ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-black dark:text-white">{fmt.name}</span>
                    {selectedFormat === fmt.id && (
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{fmt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Live File Preview Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-300 flex items-center">
                <FileSpreadsheet className="w-4 h-4 mr-1.5 text-slate-500 dark:text-slate-400" />
                Generated File Output Preview
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                File: {fileResult?.fileName}
              </span>
            </div>

            <div className="bg-slate-900 text-slate-200 p-3.5 rounded-xl text-xs font-mono overflow-x-auto shadow-inner border border-slate-800">
              {previewLines.map((line: any, idx: number) => (
                <div key={idx} className={`py-0.5 whitespace-pre ${idx === 0 ? 'text-amber-400 font-bold border-b border-slate-800 pb-1' : 'text-slate-300'}`}>
                  {line}
                </div>
              ))}
              {fileResult && fileResult.recordCount > 6 && (
                <div className="text-slate-500 dark:text-slate-400 italic pt-1">
                  ... +{fileResult.recordCount - 6} more employee disbursement records
                </div>
              )}
            </div>
          </div>

          {/* Security & Checksum Banner */}
          <div className="p-3.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Deterministic Checksum: <span className="font-mono font-bold text-black dark:text-slate-200">{fileResult?.checksum || 'N/A'}</span></span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Export Version: v{batch.exportVersion || 1} • Total: {fileResult?.recordCount || 0} Records
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-white dark:bg-slate-950 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-black dark:text-slate-200 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleDownload}
            disabled={exporting || !fileResult || batch.validBeneficiaryCount === 0}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'Exporting File...' : 'Download Payment File'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
