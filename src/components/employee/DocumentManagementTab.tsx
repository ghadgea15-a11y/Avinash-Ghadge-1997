import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Plus, 
  History,
  Trash2,
  Calendar,
  ShieldCheck,
  RefreshCw,
  X
} from 'lucide-react';
import { 
  EmployeeRecord, 
  EmployeeDocumentRecord, 
  DocumentTypeConfig, 
  UserSession,
  DocumentStatus
} from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { StorageService } from '../../services/storageService';
import { motion, AnimatePresence } from 'motion/react';

interface DocumentManagementTabProps {
  employee: EmployeeRecord;
  userSession: UserSession;
  onUpdate: () => void;
}

export function DocumentManagementTab({ employee, userSession, onUpdate }: DocumentManagementTabProps) {
  const [documents, setDocuments] = useState<EmployeeDocumentRecord[]>([]);
  const [docTypes, setDocTypes] = useState<DocumentTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    typeCode: '',
    documentNumber: '',
    issueDate: '',
    expiryDate: '',
    remarks: '',
    previousDocumentId: ''
  });

  useEffect(() => {
    loadDocs();
  }, [employee.id]);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const [empDocs, types] = await Promise.all([
        FirestoreService.getEmployeeDocuments(userSession.companyId, employee.id),
        FirestoreService.getDocumentTypes(userSession.companyId)
      ]);
      setDocuments(empDocs);
      setDocTypes(types);
      if (types.length > 0) {
        setFormData(prev => ({ ...prev, typeCode: types[0].code }));
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !formData.typeCode) return;

    setUploading(true);
    try {
      const fileName = `documents/${employee.id}/${formData.typeCode}_${Date.now()}`;
      const fileUrl = await StorageService.uploadFile(fileName, selectedFile);

      const newDoc: EmployeeDocumentRecord = {
        id: `DOC_${Date.now()}`,
        companyId: userSession.companyId,
        employeeId: employee.id,
        documentTypeCode: formData.typeCode,
        documentNumber: formData.documentNumber,
        fileReference: fileName,
        fileUrl: fileUrl,
        issueDate: formData.issueDate,
        expiryDate: formData.expiryDate,
        status: 'UPLOADED',
        verificationStatus: 'PENDING',
        uploadedBy: userSession.employeeId || userSession.userId,
        uploadedByName: userSession.fullName,
        isLatest: true,
        previousDocumentId: formData.previousDocumentId || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await FirestoreService.saveEmployeeDocument(userSession.companyId, newDoc, {
        id: userSession.employeeId || userSession.userId,
        name: userSession.fullName
      });

      setShowUploadModal(false);
      setSelectedFile(null);
      setFormData({
        typeCode: docTypes[0]?.code || '',
        documentNumber: '',
        issueDate: '',
        expiryDate: '',
        remarks: '',
        previousDocumentId: ''
      });
      loadDocs();
      onUpdate();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleVerify = async (docId: string, status: 'VERIFIED' | 'REJECTED') => {
    const success = await FirestoreService.verifyDocument(
      userSession.companyId,
      employee.id,
      docId,
      { status },
      { id: userSession.employeeId || userSession.userId, name: userSession.fullName }
    );
    if (success) {
      loadDocs();
      onUpdate();
    }
  };

  const getStatusBadge = (status: DocumentStatus) => {
    const styles: any = {
      VERIFIED: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      EXPIRING_SOON: 'bg-amber-50 text-amber-600 border-amber-100',
      EXPIRED: 'bg-rose-50 text-rose-600 border-rose-100',
      UPLOADED: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      REJECTED: 'bg-slate-100 text-slate-600 border-slate-200'
    };
    return <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${styles[status] || styles.UPLOADED}`}>{status}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold flex items-center gap-2 text-black dark:text-slate-200 dark:text-white">
          <FileText className="w-4 h-4 text-indigo-500" />
          KYC & Compliance Documents
        </h3>
        <button 
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
        >
          <Upload className="w-3.5 h-3.5" />
          Upload New
        </button>
      </div>

      <div className="grid gap-3">
        {loading ? (
          <div className="py-8 text-center text-slate-400 text-xs">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="py-12 text-center bg-white dark:bg-slate-950 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">No documents uploaded yet</p>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="mt-3 text-xs font-bold text-indigo-600 hover:underline"
            >
              Click here to upload the first document
            </button>
          </div>
        ) : (
          documents.filter(d => d.isLatest).map(doc => (
            <div key={doc.id} className="p-3 bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                    <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-black dark:text-white">
                        {docTypes.find(t => t.code === doc.documentTypeCode)?.name || doc.documentTypeCode}
                      </h4>
                      {getStatusBadge(doc.status)}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-mono">#{doc.documentNumber || 'N/A'}</span>
                      {doc.expiryDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Expires: {doc.expiryDate}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a 
                    href={doc.fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                  {doc.status === 'UPLOADED' && (
                    <>
                      <button 
                        onClick={() => handleVerify(doc.id, 'VERIFIED')}
                        className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg text-emerald-600"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleVerify(doc.id, 'REJECTED')}
                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg text-rose-600"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => {
                      setFormData(prev => ({ 
                        ...prev, 
                        typeCode: doc.documentTypeCode, 
                        previousDocumentId: doc.id 
                      }));
                      setShowUploadModal(true);
                    }}
                    className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg text-amber-600"
                    title="Renew/Replace"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* If there's a history, show a small hint */}
              {doc.previousDocumentId && (
                <div className="mt-2 pt-2 border-t border-slate-50 dark:border-slate-700/50 flex items-center gap-1.5 text-[9px] text-slate-400">
                  <History className="w-3 h-3" />
                  <span>Replacement for version {doc.previousDocumentId.slice(-4)}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => !uploading && setShowUploadModal(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <h4 className="font-bold text-black dark:text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-indigo-600" />
                  {formData.previousDocumentId ? 'Renew Document' : 'Upload Document'}
                </h4>
                <button onClick={() => setShowUploadModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleUpload} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Document Type</label>
                    <select 
                      required
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.typeCode}
                      onChange={e => setFormData(prev => ({ ...prev, typeCode: e.target.value }))}
                      disabled={!!formData.previousDocumentId}
                    >
                      {docTypes.map(t => (
                        <option key={t.code} value={t.code}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Document #</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. DL-12345"
                      value={formData.documentNumber}
                      onChange={e => setFormData(prev => ({ ...prev, documentNumber: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Expiry Date</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.expiryDate}
                      onChange={e => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">File Attachment</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-200 dark:border-slate-700 border-dashed rounded-xl hover:border-indigo-400 transition-colors relative">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-8 w-8 text-slate-400" />
                      <div className="flex text-xs text-slate-600 dark:text-slate-400">
                        <label className="relative cursor-pointer bg-transparent rounded-md font-bold text-indigo-600 hover:text-indigo-500">
                          <span>{selectedFile ? selectedFile.name : 'Click to select file'}</span>
                          <input type="file" className="sr-only" onChange={handleFileChange} required />
                        </label>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">PDF, JPG, PNG up to 5MB</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <button 
                    type="button" 
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={uploading || !selectedFile}
                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-indigo-600/20"
                  >
                    {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    {uploading ? 'Processing...' : formData.previousDocumentId ? 'Complete Renewal' : 'Submit Document'}
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
