import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Webhook, 
  ShieldCheck, 
  FileSpreadsheet, 
  Plus, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Trash2, 
  Download, 
  Code,
  Lock,
  Radio,
  ExternalLink,
  Send,
  Activity,
  Clock
} from 'lucide-react';
import { CompanyTenant, UserSession } from '../../types';
import { 
  ApiKeyRecord, 
  WebhookSubscriptionRecord, 
  WebhookDeliveryLogRecord, 
  SsoConfigRecord, 
  IntegrationConnectorRecord 
} from '../../types/integration';
import { IntegrationService } from '../../services/integrationService';
import { useFeedback } from '../../context/ActionFeedbackContext';

interface EnterpriseIntegrationScreenProps {
  currentCompany: CompanyTenant;
  userSession: UserSession;
  onNavigate?: (screenKey: string) => void;
}

export const EnterpriseIntegrationScreen: React.FC<EnterpriseIntegrationScreenProps> = ({
  currentCompany,
  userSession
}) => {
  const { showSuccess, showError } = useFeedback();
  const [activeTab, setActiveTab] = useState<'api_keys' | 'webhooks' | 'sso' | 'connectors'>('api_keys');
  const [loading, setLoading] = useState<boolean>(true);

  // States
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookSubscriptionRecord[]>([]);
  const [ssoConfig, setSsoConfig] = useState<SsoConfigRecord | null>(null);
  const [generatedKeyResult, setGeneratedKeyResult] = useState<string | null>(null);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [deliveryLogs, setDeliveryLogs] = useState<WebhookDeliveryLogRecord[]>([]);
  const [payrollCycles, setPayrollCycles] = useState<Array<{ id: string; monthYear: string; totalNetPay: number; status: string; totalEmployees: number }>>([]);
  const [selectedCycleMonth, setSelectedCycleMonth] = useState<string>('');
  const [selectedBankFormat, setSelectedBankFormat] = useState<'HDFC_ENET' | 'ICICI_CIB' | 'SBI_CMP' | 'AXIS_CORP'>('HDFC_ENET');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Modals
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(['READ_ATTENDANCE', 'READ_EMPLOYEES']);

  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [webhookName, setWebhookName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>(['attendance.marked', 'employee.created']);

  const isSuperOrExecutive = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER_PROMOTER', 'DIRECTOR_CEO', 'IT_ADMIN'].includes(userSession.role);

  const loadData = async () => {
    setLoading(true);
    try {
      const [keys, subs, sso, deliveries, cycles] = await Promise.all([
        IntegrationService.getApiKeys(currentCompany.companyId),
        IntegrationService.getWebhookSubscriptions(currentCompany.companyId),
        IntegrationService.getSsoConfig(currentCompany.companyId),
        IntegrationService.getWebhookDeliveries(currentCompany.companyId),
        IntegrationService.getApprovedPayrollCycles(currentCompany.companyId)
      ]);
      setApiKeys(keys);
      setWebhooks(subs);
      setSsoConfig(sso);
      setDeliveryLogs(deliveries);
      setPayrollCycles(cycles);
      if (cycles.length > 0 && !selectedCycleMonth) {
        setSelectedCycleMonth(cycles[0].monthYear);
      } else if (!selectedCycleMonth) {
        setSelectedCycleMonth(new Date().toISOString().slice(0, 7));
      }
    } catch (err: any) {
      showError('Failed to load integration data');
    } finally {
      setLoading(false);
    }
  };

  const handleTestWebhook = async (webhookId: string) => {
    setTestingWebhookId(webhookId);
    try {
      const result = await IntegrationService.testWebhookEndpoint(
        currentCompany.companyId,
        webhookId,
        { uid: userSession.uid || 'system', name: ((userSession.fullName || userSession.email) || 'Unknown') || 'Admin' }
      );
      if (result.success) {
        showSuccess(`Webhook ping successful (HTTP ${result.statusCode}). Signed with HMAC-SHA256.`);
      } else {
        showError(`Webhook test returned HTTP ${result.statusCode || 'ERROR'}: ${result.snippet}`);
      }
      loadData();
    } catch (err: any) {
      showError(err.message || 'Webhook test dispatch failed');
    } finally {
      setTestingWebhookId(null);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentCompany.companyId]);

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) {
      showError('Please provide an API key name');
      return;
    }
    try {
      const res = await IntegrationService.generateApiKey(
        currentCompany.companyId,
        { name: newKeyName, permissions: newKeyPermissions as any },
        { uid: userSession.uid || 'system', name: ((userSession.fullName || userSession.email) || 'Unknown') || 'Admin' }
      );
      setGeneratedKeyResult(res.plainTextKey);
      setIsKeyModalOpen(false);
      setNewKeyName('');
      loadData();
      showSuccess('API Key generated successfully. Copy it now!');
    } catch (err: any) {
      showError(err.message || 'Failed to generate API Key');
    }
  };

  const handleRotateKey = async (keyId: string) => {
    if (!confirm('Rotate this API Key? A new key will be generated with a 24-hour grace period during which the old key remains temporarily active.')) return;
    try {
      const res = await IntegrationService.rotateApiKey(
        currentCompany.companyId, 
        keyId, 
        { uid: userSession.uid || 'system', name: ((userSession.fullName || userSession.email) || 'Unknown') || 'Admin' },
        { gracePeriodHours: 24 }
      );
      setGeneratedKeyResult(res.newPlainTextKey);
      showSuccess(`API Key rotated! New key generated with 24-hour grace period until ${new Date(res.gracePeriodExpiresAt).toLocaleString()}`);
      loadData();
    } catch (err: any) {
      showError(err.message || 'Failed to rotate API key');
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API Key? External calls using it will fail immediately.')) return;
    try {
      await IntegrationService.revokeApiKey(currentCompany.companyId, keyId, { uid: userSession.uid || 'system', name: ((userSession.fullName || userSession.email) || 'Unknown') || 'Admin' });
      showSuccess('API Key revoked');
      loadData();
    } catch (err: any) {
      showError('Failed to revoke API key');
    }
  };

  const handleSaveWebhook = async () => {
    if (!webhookUrl.startsWith('https://')) {
      showError('Webhook target URL must start with https://');
      return;
    }
    try {
      await IntegrationService.saveWebhookSubscription(
        currentCompany.companyId,
        { name: webhookName, targetUrl: webhookUrl, subscribedEvents: webhookEvents as any },
        { uid: userSession.uid || 'system', name: ((userSession.fullName || userSession.email) || 'Unknown') || 'Admin' }
      );
      setIsWebhookModalOpen(false);
      setWebhookName('');
      setWebhookUrl('');
      loadData();
      showSuccess('Webhook subscription saved');
    } catch (err: any) {
      showError('Failed to save webhook');
    }
  };

  const handleSaveSso = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await IntegrationService.saveSsoConfig(
        currentCompany.companyId,
        ssoConfig || {},
        { uid: userSession.uid || 'system', name: ((userSession.fullName || userSession.email) || 'Unknown') || 'Admin' }
      );
      showSuccess('SSO Configuration updated');
      loadData();
    } catch (err: any) {
      showError('Failed to update SSO configuration');
    }
  };

  const handleExportTally = async () => {
    if (!selectedCycleMonth) {
      showError('Please select a payroll cycle');
      return;
    }
    setIsExporting(true);
    try {
      const xml = await IntegrationService.exportTallyPayrollVoucher(currentCompany.companyId, selectedCycleMonth);
      const blob = new Blob([xml], { type: 'text/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Tally_Payroll_${currentCompany.companyCode}_${selectedCycleMonth}.xml`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess(`Tally XML Journal Voucher for ${selectedCycleMonth} exported successfully with financial reconciliation.`);
    } catch (err: any) {
      showError(err.message || 'Failed to export Tally voucher');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportBankNeft = async () => {
    if (!selectedCycleMonth) {
      showError('Please select a payroll cycle');
      return;
    }
    setIsExporting(true);
    try {
      const result = await IntegrationService.exportBankNeftCsv(
        currentCompany.companyId, 
        selectedCycleMonth,
        selectedBankFormat
      );
      const blob = new Blob([result.csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NEFT_${selectedBankFormat}_${currentCompany.companyCode}_${selectedCycleMonth}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess(`Exported ${result.recordCount} records (₹${result.totalExported.toLocaleString('en-IN')}) in ${selectedBankFormat} format.`);
    } catch (err: any) {
      showError(err.message || 'Failed to export NEFT batch sheet');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Radio className="w-7 h-7 text-indigo-600" />
            Enterprise Integration & APIs
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage REST API keys, real-time webhooks, SAML/OIDC SSO, and Tally/Banking connectors.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={loadData} 
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Generated Key Alert Modal */}
      {generatedKeyResult && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Key className="w-6 h-6 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-900">Your New Live API Key</h4>
              <p className="text-xs text-amber-800">Copy this key now. For security, it will never be displayed again in plain text.</p>
              <code className="mt-2 block bg-amber-100 px-3 py-1.5 rounded font-mono text-sm text-amber-950 font-bold select-all border border-amber-200">
                {generatedKeyResult}
              </code>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                navigator.clipboard.writeText(generatedKeyResult);
                showSuccess('Copied to clipboard');
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
            >
              <Copy className="w-4 h-4" /> Copy Key
            </button>
            <button 
              onClick={() => setGeneratedKeyResult(null)}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-amber-100 rounded-lg"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('api_keys')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'api_keys' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Key className="w-4 h-4" />
          REST API Keys ({apiKeys.length})
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'webhooks' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Webhook className="w-4 h-4" />
          Webhooks ({webhooks.length})
        </button>
        <button
          onClick={() => setActiveTab('sso')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'sso' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Single Sign-On (SAML / OIDC)
        </button>
        <button
          onClick={() => setActiveTab('connectors')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'connectors' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Tally & Banking Connectors
        </button>
      </div>

      {/* TAB 1: API KEYS */}
      {activeTab === 'api_keys' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">Authenticate external integrations using versioned endpoints (`/api/v1/*`).</p>
            {isSuperOrExecutive && (
              <button
                onClick={() => setIsKeyModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" /> Generate API Key
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Key Name</th>
                  <th className="py-3 px-4">Prefix</th>
                  <th className="py-3 px-4">Permissions</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {apiKeys.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No active API keys found. Generate a key to begin.
                    </td>
                  </tr>
                ) : (
                  apiKeys.map(key => (
                    <tr key={key.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-800">{key.name}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">{key.keyPrefix}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {key.permissions.map(p => (
                            <span key={p} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded">
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {key.status === 'ACTIVE' && (
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                            ACTIVE ({key.rateLimitPerMinute || 120}/min)
                          </span>
                        )}
                        {key.status === 'ROTATED' && (
                          <div>
                            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                              ROTATED
                            </span>
                            {key.gracePeriodExpiresAt && (
                              <p className="text-[10px] text-amber-700 mt-1">
                                Grace: {new Date(key.gracePeriodExpiresAt) > new Date() ? 'Active until ' + new Date(key.gracePeriodExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Expired'}
                              </p>
                            )}
                          </div>
                        )}
                        {key.status === 'REVOKED' && (
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800">
                            REVOKED
                          </span>
                        )}
                        {key.status === 'EXPIRED' && (
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800">
                            EXPIRED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">{new Date(key.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {key.status === 'ACTIVE' && isSuperOrExecutive && (
                            <>
                              <button
                                onClick={() => handleRotateKey(key.id)}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                                title="Rotate Key (24h Grace Period)"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRevokeKey(key.id)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                                title="Revoke Key"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {key.status === 'ROTATED' && isSuperOrExecutive && (
                            <button
                              onClick={() => handleRevokeKey(key.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                              title="Immediate Revoke (Cancel Grace Period)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: WEBHOOKS */}
      {activeTab === 'webhooks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">Receive real-time HTTPS push notifications when events occur in your organization.</p>
            {isSuperOrExecutive && (
              <button
                onClick={() => setIsWebhookModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" /> Add Webhook Endpoint
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {webhooks.length === 0 ? (
              <div className="col-span-2 text-center py-8 bg-white border border-slate-200 rounded-xl text-slate-400">
                No webhook endpoints registered.
              </div>
            ) : (
              webhooks.map(wh => (
                <div key={wh.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">{wh.name}</h3>
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                      wh.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {wh.isActive ? 'ACTIVE' : 'PAUSED'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded text-xs font-mono text-slate-600 truncate border border-slate-100">
                    {wh.targetUrl}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {wh.subscribedEvents.map(e => (
                      <span key={e} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded border border-indigo-100">
                        {e}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <span>Last:</span>
                      {wh.lastDeliveryStatus ? (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          wh.lastDeliveryStatus === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {wh.lastDeliveryStatus}
                        </span>
                      ) : (
                        <span className="text-slate-400">Never fired</span>
                      )}
                    </div>
                    {isSuperOrExecutive && (
                      <button
                        onClick={() => handleTestWebhook(wh.id)}
                        disabled={testingWebhookId === wh.id}
                        className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded text-xs font-medium text-slate-700 transition"
                      >
                        {testingWebhookId === wh.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>Test Ping (HMAC)</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Webhook Delivery & Dispatch Logs */}
          <div className="mt-8 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-slate-900">Recent Webhook Dispatch & Delivery Logs</h3>
              </div>
              <button
                onClick={loadData}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Logs
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Delivery ID</th>
                    <th className="py-2.5 px-3">Event</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">HTTP Code</th>
                    <th className="py-2.5 px-3">Response Snippet</th>
                    <th className="py-2.5 px-3">Executed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deliveryLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No delivery logs recorded yet. Use the Test Ping button above to trigger an outbound webhook dispatch.
                      </td>
                    </tr>
                  ) : (
                    deliveryLogs.slice(0, 15).map(log => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono text-slate-600">{log.id}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-medium">
                            {log.event}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            log.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {log.httpStatusCode ? (
                            <span className={log.httpStatusCode >= 200 && log.httpStatusCode < 300 ? 'text-emerald-600' : 'text-rose-600'}>
                              {log.httpStatusCode}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 max-w-xs truncate text-slate-500 font-mono">
                          {log.responseBodySnippet || 'No response body'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {new Date(log.executedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SSO CONFIGURATION */}
      {activeTab === 'sso' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 max-w-3xl">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Corporate Identity & Single Sign-On</h3>
            <p className="text-xs text-slate-500 mt-0.5">Integrate Azure Active Directory, Okta, or Google Workspace via SAML 2.0 or OIDC.</p>
          </div>

          <form onSubmit={handleSaveSso} className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <input
                type="checkbox"
                id="enableSso"
                checked={ssoConfig?.isEnabled || false}
                onChange={e => setSsoConfig(prev => ({ ...(prev || {}), isEnabled: e.target.checked } as any))}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <label htmlFor="enableSso" className="text-sm font-semibold text-slate-800 cursor-pointer">
                Enable Enterprise Single Sign-On for {currentCompany.name}
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">SSO Protocol</label>
                <select
                  value={ssoConfig?.protocol || 'SAML_2_0'}
                  onChange={e => setSsoConfig(prev => ({ ...(prev || {}), protocol: e.target.value as any } as any))}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                >
                  <option value="SAML_2_0">SAML 2.0 (Okta, Azure AD, Ping)</option>
                  <option value="OIDC">OpenID Connect (OIDC)</option>
                  <option value="GOOGLE_WORKSPACE">Google Workspace Directory</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">IdP Entity ID / Issuer</label>
                <input
                  type="text"
                  value={ssoConfig?.samlEntityId || ''}
                  onChange={e => setSsoConfig(prev => ({ ...(prev || {}), samlEntityId: e.target.value } as any))}
                  placeholder="https://sts.windows.net/..."
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Single Sign-On Sign-In URL</label>
                <input
                  type="text"
                  value={ssoConfig?.samlSsoUrl || ''}
                  onChange={e => setSsoConfig(prev => ({ ...(prev || {}), samlSsoUrl: e.target.value } as any))}
                  placeholder="https://login.microsoftonline.com/.../saml2"
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                />
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
              >
                Save SSO Configuration
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: TALLY & BANKING CONNECTORS */}
      {activeTab === 'connectors' && (
        <div className="space-y-6">
          {/* Cycle & Batch Control Bar */}
          <div className="bg-slate-900 text-white rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-base">Select Finalized Payroll Cycle</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Financial exports require an approved, locked, or disbursed payroll cycle to guarantee data reconciliation.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Payroll Cycle Period</label>
                {payrollCycles.length > 0 ? (
                  <select
                    value={selectedCycleMonth}
                    onChange={e => setSelectedCycleMonth(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {payrollCycles.map(c => (
                      <option key={c.id} value={c.monthYear}>
                        {c.monthYear} ({c.status} • {c.totalEmployees} Emps • ₹{c.totalNetPay.toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="month"
                    value={selectedCycleMonth}
                    onChange={e => setSelectedCycleMonth(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                )}
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Bank NEFT/RTGS Spec</label>
                <select
                  value={selectedBankFormat}
                  onChange={e => setSelectedBankFormat(e.target.value as any)}
                  className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="HDFC_ENET">HDFC Bank ENet Format</option>
                  <option value="ICICI_CIB">ICICI Bank CIB Bulk Format</option>
                  <option value="SBI_CMP">SBI Corporate CMP Format</option>
                  <option value="AXIS_CORP">Axis Corporate Format</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tally Connector */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 flex flex-col justify-between shadow-sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                      <Code className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">Tally ERP 9 / Prime</h3>
                      <p className="text-xs text-slate-500">Accounting Journal Voucher</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-full">
                    ACTIVE
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Generates Tally-compliant XML Ledger Import vouchers mapping Gross Wages, PF/ESIC statutory liabilities, and expense reimbursements into your Tally Chart of Accounts.
                </p>
              </div>
              <button
                onClick={handleExportTally}
                disabled={isExporting || !selectedCycleMonth}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
              >
                <Download className="w-4 h-4" /> Download Tally XML ({selectedCycleMonth || 'Select Cycle'})
              </button>
            </div>

            {/* Bank NEFT Connector */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 flex flex-col justify-between shadow-sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">Direct Corporate NEFT</h3>
                      <p className="text-xs text-slate-500">Bank Bulk Payout CSV</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-full">
                    ACTIVE
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Generates corporate banking payout CSV formatted to published specifications ({selectedBankFormat.replace('_', ' ')}) with beneficiary IFSC, account number, net pay, and customer reference codes.
                </p>
              </div>
              <button
                onClick={handleExportBankNeft}
                disabled={isExporting || !selectedCycleMonth}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
              >
                <Download className="w-4 h-4" /> Download {selectedBankFormat} CSV ({selectedCycleMonth || 'Select Cycle'})
              </button>
            </div>

            {/* SAP IDoc Connector */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4 flex flex-col justify-between opacity-90">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-200 text-slate-600 rounded-xl">
                      <Radio className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm">SAP IDoc Connector</h3>
                      <p className="text-xs text-slate-500">HRMD_A / WPUUMS Posting</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold rounded-full">
                    IN DEVELOPMENT
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Native SAP ECC / S/4HANA IDoc payroll posting connector. Requires dedicated on-premise SAP RFC Gateway or SAP BTP middleware connection.
                </p>
              </div>
              <div className="space-y-2">
                <button
                  disabled
                  className="w-full py-2.5 bg-slate-200 text-slate-400 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <Clock className="w-4 h-4" /> Not Yet Implemented (RFC Gateway Required)
                </button>
                <p className="text-[10px] text-center text-slate-500">
                  Scheduled for enterprise release with SAP BTP Adapter.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE API KEY MODAL */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Generate New API Key</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Key Name / Client System</label>
              <input
                type="text"
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                placeholder="e.g., SAP ERP Biometric Connector"
                className="w-full border border-slate-300 rounded-lg p-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsKeyModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateApiKey}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Generate Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE WEBHOOK MODAL */}
      {isWebhookModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Register Webhook Endpoint</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Webhook Name</label>
              <input
                type="text"
                value={webhookName}
                onChange={e => setWebhookName(e.target.value)}
                placeholder="e.g. Slack Incident Alert Bot"
                className="w-full border border-slate-300 rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Payload URL (HTTPS)</label>
              <input
                type="url"
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full border border-slate-300 rounded-lg p-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsWebhookModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWebhook}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Save Endpoint
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
