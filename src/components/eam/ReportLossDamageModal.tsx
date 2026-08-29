import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { XCircle, Upload, AlertTriangle } from 'lucide-react';
import { UserSession, AssetRecord, SiteRecord } from '../../types';
import { EamIncidentService } from '../../services/eamIncidentService';
import { StorageService } from '../../services/storageService';

interface ReportLossDamageModalProps {
  session: UserSession;
  companyId: string;
  asset: AssetRecord;
  sites: SiteRecord[];
  onClose: () => void;
  onSuccess: () => void;
}

export function ReportLossDamageModal({
  session,
  companyId,
  asset,
  sites,
  onClose,
  onSuccess
}: ReportLossDamageModalProps) {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'LOST' | 'DAMAGED' | 'MISSING' | 'STOLEN'>('DAMAGED');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [damageSeverity, setDamageSeverity] = useState<'MINOR' | 'MODERATE' | 'SEVERE' | 'TOTAL_LOSS'>('MINOR');
  const [description, setDescription] = useState('');
  const [siteId, setSiteId] = useState(asset.siteId || '');
  const [estimatedImpactAmount, setEstimatedImpactAmount] = useState<number | ''>('');
  
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !description) return;

    try {
      setLoading(true);
      
      // Pre-generate the incident ID to upload files to the correct path before creating the record.
      const incidentId = `INC-EAM-${Date.now()}`;
      
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const path = `companies/${companyId}/assets/${asset.id}/incidents/${incidentId}/${file.name}`;
        const url = await StorageService.uploadFile(path, file);
        uploadedUrls.push(url);
      }

      await EamIncidentService.reportLossDamage(companyId, asset.id, session, {
        type,
        severity,
        damageSeverity: type === 'DAMAGED' ? damageSeverity : undefined,
        description,
        siteId,
        custodianId: asset.currentCustodianId,
        estimatedImpactAmount: estimatedImpactAmount ? Number(estimatedImpactAmount) : undefined,
        photoUrls: uploadedUrls,
        preGeneratedIncidentId: incidentId
      });

      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Failed to report incident.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 text-red-700 rounded-lg">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-black dark:text-white">Report Loss or Damage</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Asset: {asset.assetName} ({asset.assetCode})</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-slate-400">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Incident Type</label>
              <select
                required
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full px-4 py-2 bg-white dark:bg-slate-950 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <option value="DAMAGED">Damaged</option>
                <option value="LOST">Lost</option>
                <option value="MISSING">Missing</option>
                <option value="STOLEN">Stolen</option>
              </select>
            </div>
            
            {type === 'DAMAGED' && (
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Damage Severity</label>
                <select
                  required
                  value={damageSeverity}
                  onChange={e => setDamageSeverity(e.target.value as any)}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-950 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="MINOR">Minor</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="SEVERE">Severe</option>
                  <option value="TOTAL_LOSS">Total Loss</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Incident Severity</label>
              <select
                required
                value={severity}
                onChange={e => setSeverity(e.target.value as any)}
                className="w-full px-4 py-2 bg-white dark:bg-slate-950 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Last Known Site / Location</label>
              <select
                required
                value={siteId}
                onChange={e => setSiteId(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-slate-950 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <option value="">Select Site...</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Estimated Financial Impact ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={estimatedImpactAmount}
                onChange={e => setEstimatedImpactAmount(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-4 py-2 bg-white dark:bg-slate-950 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Description & Circumstances</label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Detail what happened, when it was noticed, involved parties, etc."
                className="w-full px-4 py-2 bg-white dark:bg-slate-950 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Evidence / Photos</label>
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files) {
                    setFiles(Array.from(e.target.files));
                  }
                }}
                className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
              />
              {files.length > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{files.length} file(s) selected</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium">Cancel</button>
            <button 
              type="submit" 
              disabled={loading} 
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Incident Report'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
