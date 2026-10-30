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
    {
      key: 'name',
      label: 'Checklist Name',
      render: i => <span className="font-semibold text-text-primary">{i.name}</span>
    },
    {
      key: 'product_category',
      label: 'Product Category',
      render: i => <span className="font-mono text-xs text-text-secondary">{i.product_category || 'General'}</span>
    },
    {
      key: 'item_count',
      label: 'Verification Items',
      render: i => <span className="font-mono text-xs font-bold text-text-primary">{i.item_count} step(s)</span>
    },
    {
      key: 'is_active',
      label: 'Status',
      render: i => <StatusBadge status={i.is_active ? 'Active' : 'Draft'} />
    },
    {
      key: 'actions',
      label: 'Actions',
      render: i => (
        hasPermission('qa', 'edit') && (
          <button
            onClick={() => openEdit(i)}
            className="btn btn-ghost px-2.5 py-1 text-xs font-mono uppercase tracking-wider text-accent-primary"
          >
            Edit Checklist
          </button>
        )
      )
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 animate-fadeIn font-sans">
      <PageHeader
        title="QA Checklists"
        description="Configure checklist procedures for product category quality tests."
        actions={
          hasPermission('qa', 'create') && (
            <button
              onClick={openCreate}
              className="btn btn-primary px-4 py-2 text-xs font-mono uppercase tracking-wider"
            >
              + New Checklist
            </button>
          )
        }
      />

      <div className="sheet">
        <Table columns={columns} data={checklists} loading={loading} emptyMessage="No QA checklists defined." />
      </div>

      {/* Checklist Form Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editing ? 'Edit Checklist' : 'Create QA Checklist'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Checklist Name *</label>
              <input
                required
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="field font-sans"
                placeholder="e.g. Inward Gate Steel Inspection"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Product Category</label>
              <input
                value={form.product_category}
                onChange={e => setForm(p => ({ ...p, product_category: e.target.value }))}
                className="field font-sans"
                placeholder="e.g. Steel Sheets"
              />
            </div>
          </div>

          <div className="sheet p-4 space-y-3 bg-bg-secondary">
            <h4 className="font-display text-sm font-bold uppercase tracking-wider text-text-primary">Verification Steps</h4>
            <div className="flex gap-2">
              <input
                value={newItem.question}
                onChange={e => setNewItem(p => ({ ...p, question: e.target.value }))}
                className="field flex-1 text-xs font-sans"
                placeholder="Inspection checklist step / question..."
              />
              <input
                value={newItem.expected_value}
                onChange={e => setNewItem(p => ({ ...p, expected_value: e.target.value }))}
                className="field w-40 text-xs font-mono"
                placeholder="Expected Value (e.g. Pass)"
              />
              <button
                type="button"
                onClick={handleAddItem}
                className="btn btn-primary px-3 py-1.5 text-xs font-mono uppercase"
              >
                +
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {form.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center sheet p-2.5 text-xs">
                  <div>
                    <span className="font-mono text-text-muted mr-2 font-bold">#{idx+1}</span>
                    <span className="text-text-primary font-medium">{item.question}</span>
                    <span className="text-[11px] font-mono text-accent-primary ml-2">(Expected: {item.expected_value})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="btn btn-ghost px-1.5 py-0.5 text-xs text-accent-danger hover:bg-accent-danger/10"
                    title="Remove item"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="btn btn-ghost px-4 py-2 text-xs font-mono uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary px-4 py-2 text-xs font-mono uppercase tracking-wider"
            >
              Save Checklist
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ChecklistsPage;
