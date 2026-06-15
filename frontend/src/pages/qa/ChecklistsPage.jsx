import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { useRole } from '../../context/RoleContext';
import { getChecklists, createChecklist, updateChecklist, getChecklistById } from '../../api/qaApi';

const ChecklistsPage = () => {
  const { hasPermission } = useRole();
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({ name: '', product_category: '', is_active: true, items: [] });
  const [newItem, setNewItem] = useState({ question: '', expected_value: 'Pass' });

  const fetchChecklists = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getChecklists();
      if (d.success) setChecklists(d.checklists);
    } catch { toast.error('Failed to load checklists.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchChecklists(); }, [fetchChecklists]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', product_category: '', is_active: true, items: [] });
    setNewItem({ question: '', expected_value: 'Pass' });
    setIsFormOpen(true);
  };

  const openEdit = async (checklist) => {
    try {
      const d = await getChecklistById(checklist.id);
      if (d.success) {
        setEditing(checklist);
        setForm({
          name: d.checklist.name,
          product_category: d.checklist.product_category || '',
          is_active: d.checklist.is_active,
          items: d.items
        });
        setNewItem({ question: '', expected_value: 'Pass' });
        setIsFormOpen(true);
      }
    } catch { toast.error('Failed to load checklist details.'); }
  };

  const handleAddItem = () => {
    if (!newItem.question.trim()) return;
    setForm(p => ({ ...p, items: [...p.items, { ...newItem }] }));
    setNewItem({ question: '', expected_value: 'Pass' });
  };

  const handleRemoveItem = (index) => {
    setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.items.length) return toast.error('Add at least one checklist verification item.');
    try {
      if (editing) {
        await updateChecklist(editing.id, form);
        toast.success('Checklist updated.');
      } else {
        await createChecklist(form);
        toast.success('Checklist created.');
      }
      setIsFormOpen(false);
      fetchChecklists();
    } catch { toast.error('Failed to save checklist.'); }
  };

  const columns = [
    { key: 'name', label: 'Checklist Name' },
    { key: 'product_category', label: 'Product Category', render: i => i.product_category || 'General' },
    { key: 'item_count', label: 'Verification Items', render: i => i.item_count },
    { key: 'is_active', label: 'Status', render: i => (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold border ${i.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
        {i.is_active ? 'Active' : 'Inactive'}
      </span>
    )},
    { key: 'actions', label: 'Actions', render: i => (
      hasPermission('qa', 'edit') && <button onClick={() => openEdit(i)} className="text-blue-600 text-xs font-semibold bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100">Edit Checklist</button>
    )}
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">QA Checklists</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Configure checklist procedures for product category quality tests.</p>
        </div>
        {hasPermission('qa', 'create') && <button onClick={openCreate} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">+ New Checklist</button>}
      </div>

      <Table columns={columns} data={checklists} loading={loading} emptyMessage="No QA checklists defined." />

      {/* Checklist Form Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editing ? 'Edit Checklist' : 'Create QA Checklist'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Checklist Name *</label>
              <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" placeholder="e.g. Inward Gate Steel Inspection" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Product Category</label>
              <input value={form.product_category} onChange={e => setForm(p => ({ ...p, product_category: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" placeholder="e.g. Steel Sheets" />
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Verification Steps</h4>
            <div className="flex gap-2">
              <input value={newItem.question} onChange={e => setNewItem(p => ({ ...p, question: e.target.value }))} className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-1.5 px-3 text-xs text-slate-900 dark:text-white focus:outline-none" placeholder="Inspection checklist step / question..." />
              <input value={newItem.expected_value} onChange={e => setNewItem(p => ({ ...p, expected_value: e.target.value }))} className="w-40 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-1.5 px-3 text-xs text-slate-900 dark:text-white focus:outline-none" placeholder="Expected Value (e.g. Yes/Pass)" />
              <button type="button" onClick={handleAddItem} className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-500 font-bold">+</button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-2 rounded-lg text-xs">
                  <div>
                    <span className="font-semibold text-slate-400 mr-2">#{idx+1}</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">{item.question}</span>
                    <span className="text-[10px] text-blue-600 ml-2">(Expected: {item.expected_value})</span>
                  </div>
                  <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700 font-bold text-sm px-1.5">✕</button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Save Checklist</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ChecklistsPage;
