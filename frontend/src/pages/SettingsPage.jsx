import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useRole } from '../context/RoleContext';

const fields = [
  'company_name',
  'company_address',
  'company_gstin',
  'company_phone',
  'company_email',
  'invoice_terms',
  'po_approval_threshold',
  'bank_name',
  'bank_account_no',
  'bank_ifsc'
];

export default function SettingsPage() {
  const { hasPermission, isAdmin } = useRole();
  const canEdit = isAdmin || hasPermission('auth', 'edit');
  const [form, setForm] = useState({});

  useEffect(() => {
    axiosInstance.get('/settings').then((res) => {
      const values = Object.fromEntries((res.data.settings || []).map((s) => [s.key, s.value]));
      setForm(values);
    });
  }, []);

  const handleSave = async () => {
    await axiosInstance.put('/settings', form);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-black text-white">Settings</h1>
      <p className="mt-1 text-sm text-slate-400">Company details used by print views and operational defaults.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {fields.map((key) => (
          <label key={key} className="space-y-1 rounded-xl border border-slate-800 bg-slate-900 p-4">
            <span className="block text-xs uppercase tracking-[0.2em] text-slate-400">{key}</span>
            <textarea
              rows={key === 'invoice_terms' || key === 'company_address' ? 4 : 1}
              disabled={!canEdit}
              value={form[key] || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
        ))}
      </div>
      {canEdit && (
        <button onClick={handleSave} className="mt-6 rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950">
          Save
        </button>
      )}
    </div>
  );
}
