import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import { useRole } from '../context/RoleContext';
import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/PageHeader';
import { Building2, Landmark, FileText, Sun, Moon, Save } from 'lucide-react';

const organizationFields = [
  { key: 'company_name', label: 'Company Name' },
  { key: 'company_phone', label: 'Company Phone' },
  { key: 'company_email', label: 'Company Email' },
  { key: 'company_gstin', label: 'Company GSTIN' },
  { key: 'company_address', label: 'Company Address' }
];

const bankingFields = [
  { key: 'bank_name', label: 'Bank Name' },
  { key: 'bank_account_no', label: 'Bank Account Number' },
  { key: 'bank_ifsc', label: 'Bank IFSC Code' }
];

const operationalFields = [
  { key: 'po_approval_threshold', label: 'PO Approval Threshold (₹)' },
  { key: 'invoice_terms', label: 'Default Invoice Terms' }
];

export default function SettingsPage() {
  const { hasPermission, isAdmin } = useRole();
  const { theme, setTheme } = useTheme();
  const canEdit = isAdmin || hasPermission('auth', 'edit');
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axiosInstance.get('/settings').then((res) => {
      const values = Object.fromEntries((res.data.settings || []).map((s) => [s.key, s.value]));
      setForm(values);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axiosInstance.put('/settings', form);
      toast.success('System settings saved successfully.');
    } catch (err) {
      toast.error('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field) => {
    const isMultiLine = field.key === 'invoice_terms' || field.key === 'company_address';
    return (
      <div key={field.key} className={isMultiLine ? 'md:col-span-2' : ''}>
        <label className="field-label block mb-1">
          {field.label}
        </label>
        {isMultiLine ? (
          <textarea
            rows={field.key === 'invoice_terms' ? 4 : 2}
            disabled={!canEdit}
            value={form[field.key] || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
            className="field"
          />
        ) : (
          <input
            type="text"
            disabled={!canEdit}
            value={form[field.key] || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
            className="field font-mono"
          />
        )}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="System Settings"
        description="Configure organizational details, GSTIN, bank dossier, and operational defaults for document printing."
        actions={
          canEdit && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary inline-flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          )
        }
      />

      {/* Theme Appearance Setting Group */}
      <div className="sheet p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border-color">
          <Sun className="w-4 h-4 text-accent-primary" />
          <h3 className="text-sm font-semibold text-text-primary">Theme & Appearance</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-primary">Workspace Theme Mode</p>
            <p className="text-xs text-text-muted mt-0.5">Toggle between clean enterprise light mode or dark interface mode.</p>
          </div>
          <div className="flex items-center gap-1.5 bg-bg-secondary p-1 rounded border border-border-color">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`btn-sm inline-flex items-center gap-1.5 transition-all ${
                theme === 'light' ? 'btn-primary' : 'btn-ghost'
              }`}
            >
              <Sun className="w-3.5 h-3.5" /> Light
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`btn-sm inline-flex items-center gap-1.5 transition-all ${
                theme === 'dark' ? 'btn-primary' : 'btn-ghost'
              }`}
            >
              <Moon className="w-3.5 h-3.5" /> Dark
            </button>
          </div>
        </div>
      </div>

      {/* Organization Details Group */}
      <div className="sheet p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border-color">
          <Building2 className="w-4 h-4 text-accent-primary" />
          <h3 className="text-sm font-semibold text-text-primary">Organization Details</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {organizationFields.map(renderField)}
        </div>
      </div>

      {/* Banking & Settlement Group */}
      <div className="sheet p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border-color">
          <Landmark className="w-4 h-4 text-accent-primary" />
          <h3 className="text-sm font-semibold text-text-primary">Banking & Settlement Dossier</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bankingFields.map(renderField)}
        </div>
      </div>

      {/* Operational Defaults Group */}
      <div className="sheet p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border-color">
          <FileText className="w-4 h-4 text-accent-primary" />
          <h3 className="text-sm font-semibold text-text-primary">Operational Defaults & Document Terms</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {operationalFields.map(renderField)}
        </div>
      </div>
    </div>
  );
}
