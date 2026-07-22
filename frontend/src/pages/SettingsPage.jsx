import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import { useRole } from '../context/RoleContext';
import PageHeader from '../components/PageHeader';

const fields = [
  { key: 'company_name', label: 'Company Name' },
  { key: 'company_address', label: 'Company Address' },
  { key: 'company_gstin', label: 'Company GSTIN' },
  { key: 'company_phone', label: 'Company Phone' },
  { key: 'company_email', label: 'Company Email' },
  { key: 'invoice_terms', label: 'Default Invoice Terms' },
  { key: 'po_approval_threshold', label: 'PO Approval Threshold (₹)' },
  { key: 'bank_name', label: 'Bank Name' },
  { key: 'bank_account_no', label: 'Bank Account Number' },
  { key: 'bank_ifsc', label: 'Bank IFSC Code' }
];

export default function SettingsPage() {
  const { hasPermission, isAdmin } = useRole();
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-300">
      <PageHeader
        title="System Settings"
        description="Configure organizational details, GSTIN, bank dossier, and operational defaults for document printing."
        actions={
          canEdit && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl bg-accent-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          )
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        {fields.map((field) => (
          <label 
            key={field.key} 
            className="block rounded-2xl border border-border-color bg-bg-card p-5 shadow-brand transition-all hover:border-accent-primary/50"
          >
            <span className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
              {field.label}
            </span>
            <textarea
              rows={field.key === 'invoice_terms' || field.key === 'company_address' ? 4 : 1}
              disabled={!canEdit}
              value={form[field.key] || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
              className="w-full rounded-xl border border-border-color bg-bg-secondary px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none transition-colors disabled:opacity-60"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
