import React, { useState } from 'react';
import { X, Plus, Trash2, Shield, Save, History, Layers } from 'lucide-react';
import { 
  CompliancePolicy, 
  PolicyModule, 
  PolicyType, 
  ComplianceSeverity, 
  PolicyCondition, 
  PolicyConditionOperator,
  PolicyScopeType,
  PolicyEnforcementAction,
  UserRole
} from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (policy: Partial<CompliancePolicy> & { name: string; module: PolicyModule; policyType: PolicyType }, changeReason: string) => Promise<void>;
  initialPolicy?: CompliancePolicy | null;
  isSaving: boolean;
}

const MODULE_OPTIONS: PolicyModule[] = ['HCM', 'WFM', 'PAYROLL', 'OPERATIONS', 'SCM', 'EAM', 'CRM', 'BPM', 'SECURITY', 'STATUTORY'];

const POLICY_TYPE_OPTIONS: { type: PolicyType; label: string; module: PolicyModule }[] = [
  { type: 'ATTENDANCE_OVERTIME_LIMIT', label: 'Overtime Limit Cap', module: 'WFM' },
  { type: 'MANDATORY_REST_HOURS', label: 'Mandatory Rest Period', module: 'WFM' },
  { type: 'GEOFENCE_RADIUS_STRICTNESS', label: 'Geo-Fence Radius Limit', module: 'WFM' },
  { type: 'KYC_DOCUMENT_MANDATORY', label: 'Mandatory KYC & Identity Verification', module: 'HCM' },
  { type: 'DOCUMENT_EXPIRY_COMPLIANCE', label: 'Document Expiration Enforcement', module: 'HCM' },
  { type: 'MINIMUM_WAGE_STATUTORY', label: 'Statutory Minimum Wage Floor', module: 'PAYROLL' },
  { type: 'PF_ESI_WAGE_CEILING', label: 'PF / ESI Ceiling Governance', module: 'PAYROLL' },
  { type: 'PAYROLL_DISBURSEMENT_TIMELINE', label: 'Payroll Payout SLA', module: 'PAYROLL' },
  { type: 'PO_AUTHORIZATION_THRESHOLD', label: 'PO Multi-Tier Authorization Limit', module: 'SCM' },
  { type: 'INVENTORY_SAFETY_STOCK', label: 'Inventory Safety Stock Floor', module: 'SCM' },
  { type: 'INCIDENT_SLA_RESOLUTION', label: 'Incident SLA Closure Limit', module: 'OPERATIONS' },
  { type: 'ASSET_MAINTENANCE_SCHEDULE', label: 'Asset Maintenance Interval', module: 'EAM' },
  { type: 'AFTER_HOURS_DATA_DOWNLOAD', label: 'After-Hours Download Surveillance', module: 'SECURITY' },
  { type: 'BULK_OPERATION_GOVERNANCE', label: 'Bulk Operation Governance Threshold', module: 'SECURITY' },
  { type: 'CONTRACT_EXPIRY_GOVERNANCE', label: 'Client Contract Renewal SLA', module: 'CRM' },
  { type: 'CUSTOM_RULE', label: 'Custom Parameter Rule', module: 'STATUTORY' }
];

const OPERATORS: { op: PolicyConditionOperator; label: string }[] = [
  { op: 'EQUALS', label: 'Equals (==)' },
  { op: 'NOT_EQUALS', label: 'Not Equals (!=)' },
  { op: 'GREATER_THAN', label: 'Greater Than (>)' },
  { op: 'GREATER_THAN_OR_EQUAL', label: 'Greater Than or Equal (>=)' },
  { op: 'LESS_THAN', label: 'Less Than (<)' },
  { op: 'LESS_THAN_OR_EQUAL', label: 'Less Than or Equal (<=)' },
  { op: 'IN', label: 'In Array' },
  { op: 'NOT_IN', label: 'Not In Array' },
  { op: 'CONTAINS', label: 'Contains Substring' },
  { op: 'EXISTS', label: 'Field Exists' },
  { op: 'NOT_EXISTS', label: 'Field Missing' }
];

export const PolicyManagerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  initialPolicy,
  isSaving
}) => {
  const [name, setName] = useState(initialPolicy?.name || '');
  const [description, setDescription] = useState(initialPolicy?.description || '');
  const [module, setModule] = useState<PolicyModule>(initialPolicy?.module || 'WFM');
  const [policyType, setPolicyType] = useState<PolicyType>(initialPolicy?.policyType || 'ATTENDANCE_OVERTIME_LIMIT');
  const [severity, setSeverity] = useState<ComplianceSeverity>(initialPolicy?.severity || 'HIGH');
  const [scopeType, setScopeType] = useState<PolicyScopeType>(initialPolicy?.scope?.scopeType || 'COMPANY_WIDE');
  const [scopeTargets, setScopeTargets] = useState<string>(initialPolicy?.scope?.targetIds?.join(', ') || '');
  const [conditions, setConditions] = useState<any[]>(
    initialPolicy?.conditions || [{ field: 'monthlyOvertimeHours', operator: 'LESS_THAN_OR_EQUAL', value: 50, description: 'Maximum overtime hours' }]
  );
  const [warningThreshold, setWarningThreshold] = useState<string>(
    initialPolicy?.thresholds?.warningThreshold !== undefined ? String(initialPolicy.thresholds.warningThreshold) : ''
  );
  const [violationThreshold, setViolationThreshold] = useState<string>(
    initialPolicy?.thresholds?.violationThreshold !== undefined ? String(initialPolicy.thresholds.violationThreshold) : ''
  );
  const [enforcementAction, setEnforcementAction] = useState<PolicyEnforcementAction>(
    initialPolicy?.enforcementAction || 'CREATE_VIOLATION'
  );
  const [effectiveFrom, setEffectiveFrom] = useState(initialPolicy?.effectiveFrom || new Date().toISOString().slice(0, 10));
  const [effectiveTo, setEffectiveTo] = useState(initialPolicy?.effectiveTo || '');
  const [changeReason, setChangeReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddCondition = () => {
    setConditions([
      ...conditions,
      { field: '', operator: 'EQUALS', value: '', description: '' }
    ]);
  };

  const handleUpdateCondition = (index: number, updates: Partial<PolicyCondition>) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], ...updates };
    setConditions(updated);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Policy Name is required.');
      return;
    }
    if (conditions.length === 0) {
      setError('At least one condition must be specified.');
      return;
    }
    if (initialPolicy && !changeReason.trim()) {
      setError('Change reason is required for policy audit trail versioning.');
      return;
    }

    try {
      setError(null);
      const parsedTargets = scopeTargets ? scopeTargets.split(',').map(s => s.trim()).filter(Boolean) : undefined;
      
      const payload: Partial<CompliancePolicy> & { name: string; module: PolicyModule; policyType: PolicyType } = {
        id: initialPolicy?.id,
        name: name.trim(),
        description: description.trim(),
        module,
        policyType,
        severity,
        scope: {
          scopeType,
          targetIds: parsedTargets
        },
        conditions: conditions.map(c => ({
          ...c,
          value: !isNaN(Number(c.value)) && c.value !== '' ? Number(c.value) : (c.value === 'true' ? true : c.value === 'false' ? false : c.value)
        })),
        thresholds: {
          warningThreshold: warningThreshold ? Number(warningThreshold) : undefined,
          violationThreshold: violationThreshold ? Number(violationThreshold) : undefined
        },
        enforcementAction,
        effectiveFrom,
        effectiveTo: effectiveTo || undefined,
        enabled: initialPolicy?.enabled !== undefined ? initialPolicy.enabled : true,
        responsibleRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'OPERATIONS_MANAGER'] as UserRole[]
      };

      await onSave(payload, changeReason || 'Initial policy configuration');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save policy');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-black dark:text-white">
                {initialPolicy ? `Edit Policy (v${initialPolicy.version})` : 'Create Compliance Policy'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure deterministic evaluation rules, severity thresholds and enforcement triggers.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-sm">
              {error}
            </div>
          )}

          {/* Core Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 mb-1">
                Policy Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Monthly Overtime Statutory Limit"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-black dark:text-white focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 mb-1">
                Governance Module *
              </label>
              <select
                value={module}
                onChange={e => setModule(e.target.value as PolicyModule)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-black dark:text-white"
              >
                {MODULE_OPTIONS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 mb-1">
              Description & Statutory Basis
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detail the statutory labor law or operational compliance rationale..."
              rows={2}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-black dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Policy Type & Severity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 mb-1">
                Rule Archetype
              </label>
              <select
                value={policyType}
                onChange={e => setPolicyType(e.target.value as PolicyType)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-black dark:text-white"
              >
                {POLICY_TYPE_OPTIONS.filter(opt => opt.module === module || opt.module === 'STATUTORY').map(opt => (
                  <option key={opt.type} value={opt.type}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 mb-1">
                Risk Severity Level
              </label>
              <select
                value={severity}
                onChange={e => setSeverity(e.target.value as ComplianceSeverity)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-black dark:text-white font-medium"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 mb-1">
                Enforcement Action
              </label>
              <select
                value={enforcementAction}
                onChange={e => setEnforcementAction(e.target.value as PolicyEnforcementAction)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-black dark:text-white"
              >
                <option value="CREATE_VIOLATION">Create Violation & Alert</option>
                <option value="TRIGGER_BPM">Trigger BPM Remediation</option>
                <option value="NOTIFY_ADMIN">Notify Administrator Only</option>
                <option value="LOG_WARNING">Log Warning Only</option>
                <option value="BLOCK_TRANSACTION">Block Operation</option>
              </select>
            </div>
          </div>

          {/* Scope */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-950 dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 mb-1">
                Scope Applicability
              </label>
              <select
                value={scopeType}
                onChange={e => setScopeType(e.target.value as PolicyScopeType)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-black dark:text-white"
              >
                <option value="COMPANY_WIDE">Company-Wide (All Sites & Roles)</option>
                <option value="SITE">Specific Sites / Projects</option>
                <option value="DEPARTMENT">Specific Departments</option>
                <option value="ROLE">Specific Roles</option>
              </select>
            </div>

            {scopeType !== 'COMPANY_WIDE' && (
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 mb-1">
                  Target IDs / Names (comma-separated)
                </label>
                <input
                  type="text"
                  value={scopeTargets}
                  onChange={e => setScopeTargets(e.target.value)}
                  placeholder="e.g. site-01, site-02"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-black dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Conditions Builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-500" />
                Rule Conditions (Deterministic Evaluation)
              </label>
              <button
                type="button"
                onClick={handleAddCondition}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Condition
              </button>
            </div>

            <div className="space-y-3">
              {conditions.map((cond, index) => (
                <div key={index} className="p-3 bg-white dark:bg-slate-950 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                    <div className="md:col-span-4">
                      <input
                        type="text"
                        value={cond.field}
                        onChange={e => handleUpdateCondition(index, { field: e.target.value })}
                        placeholder="Field (e.g. distanceMeters, monthlyOvertimeHours)"
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-black dark:text-white"
                      />
                    </div>
                    <div className="md:col-span-4">
                      <select
                        value={cond.operator}
                        onChange={e => handleUpdateCondition(index, { operator: e.target.value as PolicyConditionOperator })}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-black dark:text-white"
                      >
                        {OPERATORS.map(op => (
                          <option key={op.op} value={op.op}>{op.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <input
                        type="text"
                        value={cond.value}
                        onChange={e => handleUpdateCondition(index, { value: e.target.value })}
                        placeholder="Threshold Value"
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-black dark:text-white"
                      />
                    </div>
                    <div className="md:col-span-1 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveCondition(index)}
                        disabled={conditions.length === 1}
                        className="p-1.5 text-rose-500 hover:text-rose-700 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={cond.description || ''}
                      onChange={e => handleUpdateCondition(index, { description: e.target.value })}
                      placeholder="Condition rationale / evidence prompt (optional)"
                      className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-400"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dates & Versioning Reason */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 mb-1">
                Effective From
              </label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={e => setEffectiveFrom(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-black dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 mb-1">
                Effective To (Optional Expiry)
              </label>
              <input
                type="date"
                value={effectiveTo}
                onChange={e => setEffectiveTo(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-black dark:text-white"
              />
            </div>
          </div>

          {/* Change Reason (Required for Version Snapshots) */}
          <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
            <label className="block text-xs font-bold text-amber-900 dark:text-amber-300 mb-1 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              Change Justification (Immutable Audit Snapshot) *
            </label>
            <input
              type="text"
              value={changeReason}
              onChange={e => setChangeReason(e.target.value)}
              placeholder="e.g. Updated maximum OT cap in accordance with Factory Act 2026 amendment"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-lg text-black dark:text-white"
              required={!!initialPolicy}
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:bg-slate-800/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-900 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : initialPolicy ? 'Update & Snapshot Policy' : 'Create Policy'}
          </button>
        </div>
      </div>
    </div>
  );
};
