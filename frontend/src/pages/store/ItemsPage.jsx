import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import SearchBar from '../../components/SearchBar';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useRole } from '../../context/RoleContext';
import { getItems, createItem, updateItem, deleteItem, getCategories, createCategory } from '../../api/storeApi';

const UNITS = ['Pcs', 'Kg', 'Ltr', 'Mtr', 'Box', 'Set', 'Nos', 'Pair', 'Roll', 'Sheet'];
const ITEM_TYPES = ['Raw Material', 'Finished Good', 'Semi-Finished', 'Consumable'];

const StockBadge = ({ item }) => {
  const stock = parseFloat(item.current_stock);
  const reorder = parseFloat(item.reorder_level);
  const isCritical = stock <= 0;
  const isLow = stock <= reorder && stock > 0;
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold tabular-nums ${isCritical ? 'text-[var(--danger-text)]' : isLow ? 'text-[var(--warning-text)]' : 'text-[var(--success-text)]'}`}>
      <span className={`w-2 h-2 rounded-full ${isCritical ? 'bg-[var(--danger-rail)]' : isLow ? 'bg-[var(--warning-rail)]' : 'bg-[var(--success-rail)]'}`} />
      {stock}
    </span>
  );
};

const ItemsPage = () => {
  const { hasPermission } = useRole();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCatOpen, setIsCatOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [codeError, setCodeError] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [form, setForm] = useState({ item_code: '', name: '', description: '', unit: 'Pcs', category_id: '', reorder_level: 0, item_type: 'Raw Material' });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getItems({ search, categoryId: selectedCategory, page, limit: 50 });
      if (data.success) { setItems(data.items); setTotalPages(data.pagination.totalPages); }
    } catch { toast.error('Failed to load items.'); }
    finally { setLoading(false); }
  }, [search, selectedCategory, page]);

  useEffect(() => {
    getCategories().then(d => { if (d.success) setCategories(d.categories); }).catch(() => {});
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openCreate = () => {
    setEditing(null); setCodeError('');
    setForm({ item_code: '', name: '', description: '', unit: 'Pcs', category_id: '', reorder_level: 0, item_type: 'Raw Material' });
    setIsFormOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item); setCodeError('');
    setForm({ item_code: item.item_code, name: item.name, description: item.description || '', unit: item.unit, category_id: item.category_id || '', reorder_level: parseFloat(item.reorder_level), item_type: item.item_type || 'Raw Material' });
    setIsFormOpen(true);
  };

  const handleCodeBlur = async () => {
    if (!form.item_code.trim() || (editing && editing.item_code === form.item_code.trim())) { setCodeError(''); return; }
    try {
      const res = await getItems({ search: form.item_code.trim(), limit: 5 });
      const exact = res.items?.find(i => i.item_code === form.item_code.trim());
      setCodeError(exact ? `Code '${form.item_code}' is already taken.` : '');
    } catch { setCodeError(''); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (codeError) return toast.error(codeError);
    try {
      if (editing) { await updateItem(editing.id, form); toast.success('Item updated.'); }
      else { await createItem(form); toast.success('Item created.'); }
      setIsFormOpen(false); fetchItems();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed.'); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete item '${item.name}'? This cannot be undone.`)) return;
    try { await deleteItem(item.id); toast.success('Item deleted.'); fetchItems(); }
    catch (err) { toast.error(err.response?.data?.message || 'Delete failed.'); }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const data = await createCategory({ name: newCatName.trim() });
      if (data.success) { setCategories(prev => [...prev, data.category].sort((a, b) => a.name.localeCompare(b.name))); toast.success('Category added.'); setNewCatName(''); setIsCatOpen(false); }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add category.'); }
  };

  const columns = [
    { key: 'item_code', label: 'Item Code', render: i => <span className="stamp">{i.item_code}</span> },
    { key: 'name', label: 'Item Name', render: i => <span className="font-medium text-text-primary">{i.name}</span> },
    { key: 'item_type', label: 'Type', render: i => {
      return <StatusBadge status={i.item_type || 'Raw Material'} />;
    }},
    { key: 'category_name', label: 'Category', render: i => i.category_name || '—' },
    { key: 'unit', label: 'Unit' },
    { key: 'current_stock', label: 'Current Stock', render: i => <StockBadge item={i} /> },
    { key: 'reorder_level', label: 'Reorder Level', render: i => <span className="tabular-nums">{parseFloat(i.reorder_level)}</span> },
    {
      key: 'status', label: 'Stock Status', render: i => {
        const stock = parseFloat(i.current_stock), reorder = parseFloat(i.reorder_level);
        const status = stock <= 0 ? 'Critical' : stock <= reorder ? 'Low Stock' : 'In Stock';
        return <StatusBadge status={status} />;
      }
    },
    {
      key: 'actions', label: 'Actions', render: i => (
        <div className="flex gap-1.5">
          {hasPermission('store', 'edit') && <button onClick={() => openEdit(i)} className="btn-secondary btn-xs">Edit</button>}
          {hasPermission('store', 'delete') && <button onClick={() => handleDelete(i)} className="btn-secondary btn-xs text-[var(--danger-text)] hover:border-[var(--danger-border)]">Delete</button>}
        </div>
      )
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Item Master"
        subtitle="Manage raw materials, finished goods, and consumables catalogue."
        actions={
          <div className="flex gap-2">
            <button onClick={() => setIsCatOpen(true)} className="btn-secondary">+ Category</button>
            {hasPermission('store', 'create') && <button onClick={openCreate} className="btn-primary">+ New Item</button>}
          </div>
        }
      />

      <div className="sheet p-3 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="flex-1"><SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search by name or item code..." /></div>
        <select value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setPage(1); }} className="field md:w-56">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <Table columns={columns} data={items} loading={loading} emptyMessage="No items found." />
      <div className="mt-4"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} /></div>

      {/* Item Form Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editing ? 'Edit Item Details' : 'Create New Item'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Item Code *</label>
              <input required value={form.item_code} onChange={e => setForm(p => ({ ...p, item_code: e.target.value }))} onBlur={handleCodeBlur} className={`field font-mono ${codeError ? 'border-[var(--danger-border)]' : ''}`} placeholder="e.g. RM-001" />
              {codeError && <p className="text-xs text-[var(--danger-text)] mt-1">{codeError}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Item Type *</label>
              <select required value={form.item_type} onChange={e => setForm(p => ({ ...p, item_type: e.target.value }))} className="field">
                {ITEM_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Item Name *</label>
              <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="field" placeholder="e.g. Cold Rolled Steel Sheet 2mm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Unit *</label>
              <select required value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} className="field">
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Reorder Level</label>
              <input type="number" min="0" step="any" value={form.reorder_level} onChange={e => setForm(p => ({ ...p, reorder_level: e.target.value }))} className="field tabular-nums" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Category</label>
              <select value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))} className="field">
                <option value="">No Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Description</label>
              <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="field" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button type="button" onClick={() => setIsFormOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Item</button>
          </div>
        </form>
      </Modal>

      {/* Add Category Modal */}
      <Modal isOpen={isCatOpen} onClose={() => setIsCatOpen(false)} title="Add Item Category">
        <form onSubmit={handleAddCategory} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Category Name *</label>
            <input required value={newCatName} onChange={e => setNewCatName(e.target.value)} className="field" placeholder="e.g. Raw Materials" />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button type="button" onClick={() => setIsCatOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Add Category</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ItemsPage;