import React, { useState, useEffect } from 'react';
import { LandingPageConfig } from '../../types/landingPageEditor';
import { LandingPageEditorService } from '../../services/landingPageEditorService';
import { StorageService } from '../../services/storageService';
import { UserSession } from '../../types';
import { PremiumLandingPage } from '../public/PremiumLandingPage';
import { Save, Eye, EyeOff, CheckCircle2, RotateCcw, Monitor, FileCode2, History, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface SuperAdminLandingEditorScreenProps {
  currentSession: UserSession;
  onNavigate: (screen: string) => void;
}

export const SuperAdminLandingEditorScreen: React.FC<SuperAdminLandingEditorScreenProps> = ({ currentSession, onNavigate }) => {
  const [config, setConfig] = useState<LandingPageConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState<'theme' | 'header' | 'hero' | 'sections' | 'seo' | 'history'>('theme');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);

  useEffect(() => {
    loadDraft();
  }, []);

  const loadDraft = async () => {
    setIsLoading(true);
    const draft = await LandingPageEditorService.getDraftConfig();
    setConfig(draft);
    
    // Also load history
    const logs = await LandingPageEditorService.getCmsAuditLogs();
    setHistoryLogs(logs);
    
    setIsLoading(false);
  };

  const handleSaveDraft = async () => {
    if (!config) return;
    setIsSaving(true);
    const res = await LandingPageEditorService.saveDraftConfig(config, currentSession, 'Manual draft save');
    setIsSaving(false);
    if (!res.success) {
      alert(`Error saving draft: ${res.error}`);
    } else {
      alert('Draft saved successfully!');
    }
  };

  const handlePublish = async () => {
    if (!config) return;
    setIsPublishing(true);
    const res = await LandingPageEditorService.publishConfig(config, currentSession, 'Published from CMS');
    setIsPublishing(false);
    if (!res.success) {
      alert(`Error publishing: ${res.error}`);
    } else {
      alert('Landing page published successfully!');
      loadDraft(); // refresh history
    }
  };

  const handleChange = (section: keyof LandingPageConfig, key: string, value: any) => {
    if (!config) return;
    setConfig({
      ...config,
      [section]: {
        ...(config[section] as any),
        [key]: value
      }
    });
  };

  const toggleSection = (key: keyof LandingPageConfig['sections']) => {
    if (!config) return;
    setConfig({
      ...config,
      sections: {
        ...config.sections,
        [key]: !config.sections[key]
      }
    });
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    if (!config) return;
    const newOrder = [...config.sectionOrder];
    if (index + direction < 0 || index + direction >= newOrder.length) return;
    
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + direction];
    newOrder[index + direction] = temp;
    
    setConfig({ ...config, sectionOrder: newOrder });
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) { 
      alert("Image must be smaller than 5MB");
      return;
    }

    try {
      setIsUploading(true);
      // Optional: Cleanup old logo if it's a firebase storage URL
      if (config?.header.customLogoUrl && config.header.customLogoUrl.includes('firebasestorage')) {
        await StorageService.cleanupOldFile(config.header.customLogoUrl);
      }
      
      const ext = file.name.split('.').pop();
      const path = `public/landing_page/logo_${Date.now()}.${ext}`;
      const url = await StorageService.uploadFile(path, file);
      handleChange('header', 'customLogoUrl', url);
    } catch (err) {
      console.error('Failed to upload logo:', err);
      alert('Failed to upload logo. Please check permissions or try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRollback = async (versionId: string) => {
    if (!confirm('Are you sure you want to rollback to this version? This will overwrite the live site immediately.')) return;
    setIsLoading(true);
    const res = await LandingPageEditorService.rollbackToVersion(versionId, currentSession);
    if (res.success && res.rolledBackConfig) {
      setConfig(res.rolledBackConfig);
      alert('Rollback successful');
    } else {
      alert(`Rollback failed: ${res.error}`);
    }
    loadDraft();
  };

  if (isLoading || !config) {
    return <div className="flex h-screen items-center justify-center text-slate-400">Loading CMS...</div>;
  }

  return (
    <div className="flex h-screen bg-[#060B19] overflow-hidden text-slate-300">
      
      {/* Editor Sidebar */}
      <div className="w-96 border-r border-slate-800 bg-[#0A1128] flex flex-col h-full z-10 shrink-0">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold">
            <FileCode2 className="w-5 h-5 text-blue-500" />
            Website Editor
          </div>
          <button onClick={() => onNavigate('SUPER_ADMIN_DASHBOARD')} className="text-xs text-slate-400 hover:text-white">
            Close
          </button>
        </div>

        <div className="flex p-2 gap-2 border-b border-slate-800 bg-[#060B19] overflow-x-auto custom-scrollbar">
          <button onClick={() => setActiveTab('theme')} className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded ${activeTab === 'theme' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>Theme</button>
          <button onClick={() => setActiveTab('header')} className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded ${activeTab === 'header' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>Header</button>
          <button onClick={() => setActiveTab('hero')} className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded ${activeTab === 'hero' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>Hero</button>
          <button onClick={() => setActiveTab('sections')} className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded ${activeTab === 'sections' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>Layout</button>
          <button onClick={() => setActiveTab('seo')} className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded ${activeTab === 'seo' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>SEO</button>
          <button onClick={() => setActiveTab('history')} className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>History</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          
          {activeTab === 'theme' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={config.theme.primaryColor} onChange={(e) => handleChange('theme', 'primaryColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" />
                  <input type="text" value={config.theme.primaryColor} onChange={(e) => handleChange('theme', 'primaryColor', e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Secondary Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={config.theme.secondaryColor} onChange={(e) => handleChange('theme', 'secondaryColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" />
                  <input type="text" value={config.theme.secondaryColor} onChange={(e) => handleChange('theme', 'secondaryColor', e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Accent Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={config.theme.accentColor} onChange={(e) => handleChange('theme', 'accentColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" />
                  <input type="text" value={config.theme.accentColor} onChange={(e) => handleChange('theme', 'accentColor', e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Font Family</label>
                <select value={config.theme.fontFamily} onChange={(e) => handleChange('theme', 'fontFamily', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white">
                  <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                  <option value="Inter">Inter</option>
                  <option value="Outfit">Outfit</option>
                  <option value="Roboto">Roboto</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Hero Font Size</label>
                <select value={config.theme.heroFontSize} onChange={(e) => handleChange('theme', 'heroFontSize', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white">
                  <option value="sm">Small</option>
                  <option value="base">Normal</option>
                  <option value="lg">Large</option>
                  <option value="xl">Extra Large</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'header' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-2">
                  Custom Logo (Image)
                  {isUploading && <Loader2 className="w-3 h-3 text-emerald-500 animate-spin" />}
                </label>
                <input disabled={isUploading} type="file" accept="image/*" onChange={handleLogoUpload} className="w-full text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 disabled:opacity-50" />
                {config.header.customLogoUrl && (
                  <div className="mt-2 relative inline-block">
                    <img src={config.header.customLogoUrl} alt="Logo preview" className="h-10 object-contain bg-white rounded p-1" />
                    <button onClick={() => handleChange('header', 'customLogoUrl', '')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Logo Title</label>
                <input type="text" value={config.header.logoTitle} onChange={(e) => handleChange('header', 'logoTitle', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Logo Subtitle</label>
                <input type="text" value={config.header.logoSubtitle} onChange={(e) => handleChange('header', 'logoSubtitle', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">CTA Button Text</label>
                <input type="text" value={config.header.ctaButtonText} onChange={(e) => handleChange('header', 'ctaButtonText', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white" />
              </div>
            </div>
          )}

          {activeTab === 'hero' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Main Headline</label>
                <textarea rows={2} value={config.hero.headlineMain} onChange={(e) => handleChange('hero', 'headlineMain', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Highlight Headline</label>
                <input type="text" value={config.hero.headlineHighlight} onChange={(e) => handleChange('hero', 'headlineHighlight', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Subheadline</label>
                <textarea rows={4} value={config.hero.subheadline} onChange={(e) => handleChange('hero', 'subheadline', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Company Highlight Name</label>
                <input type="text" value={config.hero.companyHighlightName} onChange={(e) => handleChange('hero', 'companyHighlightName', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white" />
              </div>
            </div>
          )}

          {activeTab === 'sections' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400 mb-2">Toggle visibility and reorder sections (Header and Footer are fixed).</div>
              <div className="space-y-2">
                <label className="flex items-center justify-between p-2 rounded bg-slate-900/50 border border-slate-800">
                  <span className="text-sm font-medium capitalize text-slate-500">Header (Fixed)</span>
                  <input type="checkbox" checked={config.sections.header} onChange={() => toggleSection('header')} className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-blue-600 focus:ring-offset-slate-900" />
                </label>
                
                {config.sectionOrder?.map((key, index) => (
                  <div key={key} className="flex items-center gap-2 p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="flex flex-col gap-1">
                      <button onClick={() => moveSection(index, -1)} disabled={index === 0} className="text-slate-500 hover:text-white disabled:opacity-30"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg></button>
                      <button onClick={() => moveSection(index, 1)} disabled={index === config.sectionOrder.length - 1} className="text-slate-500 hover:text-white disabled:opacity-30"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                    </div>
                    <span className="text-sm font-medium capitalize flex-1">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <input type="checkbox" checked={config.sections[key as keyof LandingPageConfig['sections']]} onChange={() => toggleSection(key as keyof LandingPageConfig['sections'])} className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-blue-600 focus:ring-offset-slate-900" />
                  </div>
                ))}

                <label className="flex items-center justify-between p-2 rounded bg-slate-900/50 border border-slate-800">
                  <span className="text-sm font-medium capitalize text-slate-500">Footer (Fixed)</span>
                  <input type="checkbox" checked={config.sections.footer} onChange={() => toggleSection('footer')} className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-blue-600 focus:ring-offset-slate-900" />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Meta Title</label>
                <input type="text" value={config.seo?.metaTitle || ''} onChange={(e) => handleChange('seo', 'metaTitle', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Meta Description</label>
                <textarea rows={4} value={config.seo?.metaDescription || ''} onChange={(e) => handleChange('seo', 'metaDescription', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Meta Keywords</label>
                <input type="text" value={config.seo?.metaKeywords || ''} onChange={(e) => handleChange('seo', 'metaKeywords', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white" />
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400 mb-2">CMS Audit Logs and Publishing History. Click rollback to revert live site.</div>
              {historyLogs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-900 border border-slate-800 rounded flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-white block">{log.actionType}</span>
                      <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    {log.actionType === 'PAGE_PUBLISHED' && log.details?.versionId && (
                      <button onClick={() => handleRollback(log.details.versionId)} className="text-[10px] bg-red-900/30 text-red-400 hover:text-red-300 px-2 py-1 rounded border border-red-800/50">Rollback to this</button>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-300">By: {log.userEmail}</div>
                  {log.details?.notes && <div className="text-[10px] text-slate-500 italic">Note: {log.details.notes}</div>}
                </div>
              ))}
              {historyLogs.length === 0 && <div className="text-xs text-slate-500 italic">No history found.</div>}
            </div>
          )}

        </div>

        <div className="p-4 border-t border-slate-800 flex flex-col gap-2">
          <button 
            onClick={handleSaveDraft} 
            disabled={isSaving}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>
          <button 
            onClick={handlePublish}
            disabled={isPublishing}
            className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isPublishing ? 'Publishing...' : 'Publish to Live'}
          </button>
        </div>
      </div>

      {/* Live Preview Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-black/40">
        <div className="h-12 border-b border-slate-800 flex items-center justify-center gap-4 bg-[#0A1128]">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Live Preview</span>
          <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1 border border-slate-800">
            <button 
              onClick={() => setPreviewMode('desktop')}
              className={`p-1.5 rounded ${previewMode === 'desktop' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setPreviewMode('mobile')}
              className={`p-1.5 rounded ${previewMode === 'mobile' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4 flex justify-center custom-scrollbar">
          <div 
            className={`bg-white shadow-2xl transition-all duration-300 ease-in-out origin-top flex flex-col ${
              previewMode === 'mobile' ? 'w-[375px] rounded-[2.5rem] border-[8px] border-slate-800 h-[812px] overflow-hidden' : 'w-full rounded-xl border border-slate-800 min-h-full'
            }`}
          >
            <div className={`flex-1 w-full overflow-y-auto ${previewMode === 'mobile' ? 'custom-scrollbar-hide' : 'custom-scrollbar'}`}>
              {/* Pass the live draft config directly to the Landing Page component */}
              <div className="pointer-events-auto w-full min-h-full">
                 <PremiumLandingPage onNavigate={() => {}} config={config} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
