import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, AlertCircle, Clock, Search, Filter, 
  Plus, FileText, ChevronRight, CheckCircle2, XCircle, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserSession, AssetRecord, WarrantyRecord, WarrantyClaimRecord } from '../../types';
import { WarrantyService } from '../../services/warrantyService';
import { StorageService } from '../../services/storageService';

interface WarrantyTrackingProps {
  session: UserSession;
  companyId: string;
  assets: AssetRecord[];
}

export function WarrantyTracking({ session, companyId, assets }: WarrantyTrackingProps) {
  const [activeTab, setActiveTab] = useState<'WARRANTIES' | 'CLAIMS'>('WARRANTIES');
  const [warranties, setWarranties] = useState<WarrantyRecord[]>([]);
  const [claims, setClaims] = useState<WarrantyClaimRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // New Warranty Form
  const [isWarrantyModalOpen, setIsWarrantyModalOpen] = useState(false);
  const [newWarranty, setNewWarranty] = useState<Partial<WarrantyRecord>>({
    warrantyType: 'MANUFACTURER',
    status: 'ACTIVE',
    claimEligibility: true,
    startDate: new Date().toISOString().split('T')[0],
  });
  const [warrantyFiles, setWarrantyFiles] = useState<File[]>([]);
  const warrantyFileInput = useRef<HTMLInputElement>(null);

  // Claim Modal
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyRecord | null>(null);
  const [newClaim, setNewClaim] = useState<Partial<WarrantyClaimRecord>>({
    priority: 'MEDIUM',
    status: 'CLAIM_CREATED'
  });
  const [claimFiles, setClaimFiles] = useState<File[]>([]);
  const claimFileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [w, c] = await Promise.all([
        WarrantyService.getWarranties(companyId),
        WarrantyService.getWarrantyClaims(companyId)
      ]);
      setWarranties(w);
      setClaims(c);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWarranty.assetId || !newWarranty.startDate || !newWarranty.endDate || !newWarranty.warrantyNumber) return;

    try {
      setUploading(true);
      const wId = `WAR-${Date.now()}`;
      
      // Upload files
      const uploadedUrls: string[] = [];
      for (const file of warrantyFiles) {
        const path = `companies/${companyId}/assets/${newWarranty.assetId}/warranties/${wId}/${file.name}`;
        const url = await StorageService.uploadFile(path, file);
        uploadedUrls.push(url);
      }

      const wRecord: WarrantyRecord = {
        id: wId,
        companyId,
        assetId: newWarranty.assetId,
        warrantyProvider: newWarranty.warrantyProvider || '',
        warrantyNumber: newWarranty.warrantyNumber,
        warrantyType: newWarranty.warrantyType as any,
        startDate: new Date(newWarranty.startDate).toISOString(),
        endDate: new Date(newWarranty.endDate).toISOString(),
        coverageDescription: newWarranty.coverageDescription || '',
        status: 'ACTIVE',
        claimEligibility: newWarranty.claimEligibility ?? true,
        documentUrls: uploadedUrls,
        createdBy: session.userId,
        updatedBy: session.userId,
        createdAt: '',
        updatedAt: ''
      };

      await WarrantyService.saveWarranty(companyId, wRecord, {
        id: session.userId,
        name: session.fullName
      });

      setIsWarrantyModalOpen(false);
      setWarrantyFiles([]);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save warranty.');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarranty || !newClaim.issueDescription) return;

    try {
      setUploading(true);
      const claimId = `CLM-${Date.now()}`;

      // Upload evidence
      const uploadedUrls: string[] = [];
      for (const file of claimFiles) {
        const path = `companies/${companyId}/assets/${selectedWarranty.assetId}/claims/${claimId}/${file.name}`;
        const url = await StorageService.uploadFile(path, file);
        uploadedUrls.push(url);
      }

      const cRecord: WarrantyClaimRecord = {
        id: claimId,
        companyId,
        warrantyId: selectedWarranty.id,
        assetId: selectedWarranty.assetId,
        issueDescription: newClaim.issueDescription,
        reportedBy: session.userId,
        reportedByName: session.fullName,
        reportedAt: new Date().toISOString(),
        priority: newClaim.priority as any,
        evidenceUrls: uploadedUrls,
        status: 'CLAIM_CREATED',
        createdAt: '',
        updatedAt: ''
      };

      await WarrantyService.createClaim(companyId, cRecord, {
        id: session.userId,
        name: session.fullName
      });

      setIsClaimModalOpen(false);
      setSelectedWarranty(null);
      setClaimFiles([]);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create claim.');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateClaimStatus = async (claimId: string, newStatus: any) => {
    try {
      await WarrantyService.updateClaimStatus(companyId, claimId, newStatus, {
        id: session.userId,
        name: session.fullName
      });
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to update claim status.');
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'ACTIVE': return 'bg-emerald-100 text-emerald-700';
      case 'EXPIRING_SOON': return 'bg-amber-100 text-amber-700';
      case 'EXPIRED': return 'bg-red-100 text-red-700 font-bold';
      case 'CLAIM_IN_PROGRESS': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-900';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('WARRANTIES')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'WARRANTIES' 
                ? 'bg-white dark:bg-slate-700 text-black dark:text-white shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
            }`}
          >
            Warranty Register
          </button>
          <button
            onClick={() => setActiveTab('CLAIMS')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'CLAIMS' 
                ? 'bg-white dark:bg-slate-700 text-black dark:text-white shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
            }`}
          >
            Claims Management
          </button>
        </div>

        {activeTab === 'WARRANTIES' && (
          <div className="flex gap-2">
            <button
              onClick={async () => {
                await WarrantyService.processWarrantyExpiries(companyId);
                loadData();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-300 dark:text-slate-200 rounded-lg font-medium transition-colors"
            >
              <Clock className="w-4 h-4" /> Check Expiries
            </button>
            <button
              onClick={() => setIsWarrantyModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Warranty
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : activeTab === 'WARRANTIES' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {warranties.map(w => (
            <div key={w.id} className="bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getStatusColor(w.status).split(' ')[0]} bg-opacity-20`}>
                    <ShieldCheck className={`w-6 h-6 ${getStatusColor(w.status).split(' ')[1]}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-black dark:text-white">{w.warrantyNumber}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Asset: {assets.find(a => a.id === w.assetId)?.assetName || w.assetId}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(w.status)}`}>
                  {w.status.replace('_', ' ')}
                </span>
              </div>
              
              <div className="space-y-3 mb-6 flex-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Provider</span>
                  <span className="font-medium text-black dark:text-white">{w.warrantyProvider || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Start Date</span>
                  <span className="font-medium text-black dark:text-white">{new Date(w.startDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">End Date</span>
                  <span className="font-medium text-black dark:text-white">{new Date(w.endDate).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 mt-auto">
                <button
                  onClick={() => { setSelectedWarranty(w); setIsClaimModalOpen(true); }}
                  disabled={!w.claimEligibility || w.status === 'EXPIRED'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-300 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <AlertCircle className="w-4 h-4" /> File Claim
                </button>
              </div>
            </div>
          ))}
          {warranties.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-950 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
              <ShieldCheck className="w-12 h-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-black dark:text-white mb-1">No Warranties</h3>
              <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm">
                Register asset warranties to track coverage and file claims.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {claims.map(claim => (
            <div key={claim.id} className="bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-black dark:text-white">{claim.id}</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-900 dark:text-slate-300 text-xs font-medium">
                      {claim.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Asset: {assets.find(a => a.id === claim.assetId)?.assetName || claim.assetId}</p>
                  <p className="text-slate-900 dark:text-slate-300">{claim.issueDescription}</p>
                </div>
                
                <div className="flex flex-col gap-2 min-w-[200px]">
                  {claim.status === 'CLAIM_CREATED' && (
                    <button onClick={() => handleUpdateClaimStatus(claim.id, 'SUBMITTED')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
                      Submit Claim
                    </button>
                  )}
                  {claim.status === 'SUBMITTED' && (
                    <>
                      <button onClick={() => handleUpdateClaimStatus(claim.id, 'APPROVED')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">Approve</button>
                      <button onClick={() => handleUpdateClaimStatus(claim.id, 'REJECTED')} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">Reject</button>
                    </>
                  )}
                  {claim.status === 'APPROVED' && (
                    <button onClick={() => handleUpdateClaimStatus(claim.id, 'SERVICE_IN_PROGRESS')} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">
                      Start Service
                    </button>
                  )}
                  {claim.status === 'SERVICE_IN_PROGRESS' && (
                    <button onClick={() => handleUpdateClaimStatus(claim.id, 'RESOLVED')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">
                      Mark Resolved
                    </button>
                  )}
                  {claim.status === 'RESOLVED' && (
                    <button onClick={() => handleUpdateClaimStatus(claim.id, 'CLOSED')} className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium">
                      Close Claim
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {claims.length === 0 && (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
              No warranty claims found.
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {isWarrantyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex justify-between items-center">
                <h2 className="text-xl font-bold text-black dark:text-white">Register Warranty</h2>
                <button onClick={() => setIsWarrantyModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-400">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSaveWarranty} className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Asset</label>
                    <select
                      required
                      value={newWarranty.assetId || ''}
                      onChange={e => setNewWarranty({...newWarranty, assetId: e.target.value})}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-950 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    >
                      <option value="">Select Asset...</option>
                      {assets.map(a => (
                        <option key={a.id} value={a.id}>{a.assetCode} - {a.assetName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Warranty Number</label>
                    <input
                      required
                      type="text"
                      value={newWarranty.warrantyNumber || ''}
                      onChange={e => setNewWarranty({...newWarranty, warrantyNumber: e.target.value})}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-950 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Provider/Vendor</label>
                    <input
                      type="text"
                      value={newWarranty.warrantyProvider || ''}
                      onChange={e => setNewWarranty({...newWarranty, warrantyProvider: e.target.value})}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-950 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Start Date</label>
                    <input
                      required
                      type="date"
                      value={newWarranty.startDate?.split('T')[0] || ''}
                      onChange={e => setNewWarranty({...newWarranty, startDate: e.target.value})}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-950 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">End Date</label>
                    <input
                      required
                      type="date"
                      value={newWarranty.endDate?.split('T')[0] || ''}
                      onChange={e => setNewWarranty({...newWarranty, endDate: e.target.value})}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-950 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Coverage Description</label>
                    <textarea
                      rows={3}
                      value={newWarranty.coverageDescription || ''}
                      onChange={e => setNewWarranty({...newWarranty, coverageDescription: e.target.value})}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-950 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Warranty Documents</label>
                    <input
                      type="file"
                      multiple
                      ref={warrantyFileInput}
                      onChange={(e) => {
                        if (e.target.files) {
                          setWarrantyFiles(Array.from(e.target.files));
                        }
                      }}
                      className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    {warrantyFiles.length > 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{warrantyFiles.length} file(s) selected</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsWarrantyModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400">Cancel</button>
                  <button type="submit" disabled={uploading} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50">
                    {uploading ? 'Saving...' : 'Save Warranty'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isClaimModalOpen && selectedWarranty && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex justify-between items-center">
                <h2 className="text-xl font-bold text-black dark:text-white">File Warranty Claim</h2>
                <button onClick={() => { setIsClaimModalOpen(false); setSelectedWarranty(null); }} className="text-slate-400 hover:text-slate-600 dark:text-slate-400">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleCreateClaim} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Warranty Details</label>
                  <div className="p-4 bg-white dark:bg-slate-950 dark:bg-slate-900 rounded-lg text-sm text-slate-600 dark:text-slate-400">
                    <p><strong>Number:</strong> {selectedWarranty.warrantyNumber}</p>
                    <p><strong>Provider:</strong> {selectedWarranty.warrantyProvider}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Issue Description</label>
                  <textarea
                    required
                    rows={4}
                    value={newClaim.issueDescription || ''}
                    onChange={e => setNewClaim({...newClaim, issueDescription: e.target.value})}
                    placeholder="Describe the defect or issue in detail..."
                    className="w-full px-4 py-2 bg-white dark:bg-slate-950 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Evidence Documents</label>
                  <input
                    type="file"
                    multiple
                    ref={claimFileInput}
                    onChange={(e) => {
                      if (e.target.files) {
                        setClaimFiles(Array.from(e.target.files));
                      }
                    }}
                    className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  {claimFiles.length > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{claimFiles.length} file(s) selected</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Priority</label>
                  <select
                    value={newClaim.priority || 'MEDIUM'}
                    onChange={e => setNewClaim({...newClaim, priority: e.target.value as any})}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-950 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => { setIsClaimModalOpen(false); setSelectedWarranty(null); }} className="px-4 py-2 text-slate-600 dark:text-slate-400">Cancel</button>
                  <button type="submit" disabled={uploading} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50">
                    {uploading ? 'Submitting...' : 'Submit Claim'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
