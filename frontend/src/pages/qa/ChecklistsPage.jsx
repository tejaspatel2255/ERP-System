import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
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
    { key: 'name', label: 'Checklist Name', render: i => <span className="font-medium text-text-primary">{i.name}</span> },
    { key: 'product_category', label: 'Product Category', render: i => i.product_category || 'General' },
    { key: 'item_count', label: 'Verification Items', render: i => <span className="tabular-nums">{i.item_count}</span> },
    { key: 'is_active', label: 'Status', render: i => (
      <StatusBadge status={i.is_active ? 'Active' : 'Draft'} />
    )},
    { key: 'actions', label: 'Actions', render: i => (
      hasPermission('qa', 'edit') && <button onClick={() => openEdit(i)} className="btn-secondary btn-xs">Edit Checklist</button>
    )}
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="QA Checklists"
        subtitle="Configure checklist procedures for product category quality tests."
        actions={
          hasPermission('qa', 'create') && <button onClick={openCreate} className="btn-primary">+ New Checklist</button>
        }
      />

      <Table columns={columns} data={checklists} loading={loading} emptyMessage="No QA checklists defined." />

      {/* Checklist Form Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editing ? 'Edit Checklist' : 'Create QA Checklist'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Checklist Name *</label>
              <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="field" placeholder="e.g. Inward Gate Steel Inspection" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Product Category</label>
              <input value={form.product_category} onChange={e => setForm(p => ({ ...p, product_category: e.target.value }))} className="field" placeholder="e.g. Steel Sheets" />
            </div>
          </div>

          <div className="sheet p-4 space-y-4">
            <h4 className="text-sm font-semibold text-text-primary">Verification Steps</h4>
            <div className="flex gap-2">
              <input value={newItem.question} onChange={e => setNewItem(p => ({ ...p, question: e.target.value }))} className="field flex-1 text-xs" placeholder="Inspection checklist step / question..." />
              <input value={newItem.expected_value} onChange={e => setNewItem(p => ({ ...p, expected_value: e.target.value }))} className="field w-40 text-xs" placeholder="Expected Value (e.g. Yes/Pass)" />
              <button type="button" onClick={handleAddItem} className="btn-primary btn-sm">+</button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-bg-subtle p-2 rounded text-xs border border-border-color">
                  <div>
                    <span className="font-semibold text-text-muted mr-2">#{idx+1}</span>
                    <span className="text-text-primary font-medium">{item.question}</span>
                    <span className="text-xs text-accent-primary ml-2">(Expected: {item.expected_value})</span>
                  </div>
                  <button type="button" onClick={() => handleRemoveItem(idx)} className="text-[var(--danger-text)] hover:opacity-80 font-semibold text-sm px-1.5">✕</button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button type="button" onClick={() => setIsFormOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Checklist</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ChecklistsPage;