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
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 font-sans">
      <PageHeader
        title="System Settings"
        description="Configure organizational details, GSTIN, bank details, and operational defaults for document printing."
        actions={
          canEdit && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary text-xs uppercase tracking-wider font-mono disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          )
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <label 
            key={field.key} 
            className="block sheet p-4 space-y-2"
          >
            <span className="block text-xs font-mono font-bold uppercase tracking-wider text-text-muted">
              {field.label}
            </span>
            <textarea
              rows={field.key === 'invoice_terms' || field.key === 'company_address' ? 3 : 1}
              disabled={!canEdit}
              value={form[field.key] || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
              className="field w-full text-xs font-mono disabled:opacity-60"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
