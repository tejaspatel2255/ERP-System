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
import { formatDate } from '../../utils/formatDate';

const UNITS = ['Pcs', 'Kg', 'Ltr', 'Mtr', 'Box', 'Set', 'Nos', 'Pair', 'Roll', 'Sheet'];
const ITEM_TYPES = ['Raw Material', 'Finished Good', 'Semi-Finished', 'Consumable'];

const StockBadge = ({ item }) => {
  const stock = parseFloat(item.current_stock);
  const reorder = parseFloat(item.reorder_level);
  const isCritical = stock <= 0;
  const isLow = stock <= reorder && stock > 0;
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-xs font-semibold ${isCritical ? 'text-accent-danger' : isLow ? 'text-amber-500' : 'text-accent-success'}`}>
      <span className={`w-2 h-2 rounded-full ${isCritical ? 'bg-accent-danger animate-pulse' : isLow ? 'bg-amber-500' : 'bg-accent-success'}`} />
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
  const [form, setForm] = useState({ item_code: '', name: '', description: '', unit: 'Pcs', category_id: '', reorder_level: 0, item_type: 'Raw Material', opening_stock: 0 });

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
    setForm({ item_code: '', name: '', description: '', unit: 'Pcs', category_id: '', reorder_level: 0, item_type: 'Raw Material', opening_stock: 0 });
    setIsFormOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item); setCodeError('');
    setForm({ item_code: item.item_code, name: item.name, description: item.description || '', unit: item.unit, category_id: item.category_id || '', reorder_level: parseFloat(item.reorder_level), item_type: item.item_type || 'Raw Material', opening_stock: parseFloat(item.current_stock) || 0 });
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
    {
      key: 'item_code',
      label: 'Item Code',
      render: i => (
        <span className="font-mono text-xs font-semibold tracking-wider text-text-primary">
          {i.item_code}
        </span>
      )
    },
    {
      key: 'name',
      label: 'Item Name',
      render: i => (
        <span className="font-medium text-text-primary">
          {i.name}
        </span>
      )
    },
    {
      key: 'item_type',
      label: 'Type',
      render: i => <StatusBadge status={i.item_type || 'Raw Material'} />
    },
    {
      key: 'category_name',
      label: 'Category',
      render: i => (
        <span className="font-mono text-xs text-text-secondary">
          {i.category_name || '—'}
        </span>
      )
    },
    {
      key: 'unit',
      label: 'Unit',
      render: i => (
        <span className="font-mono text-xs text-text-muted">
          {i.unit}
        </span>
      )
    },
    {
      key: 'current_stock',
      label: 'Current Stock',
      render: i => <StockBadge item={i} />
    },
    {
      key: 'reorder_level',
      label: 'Reorder Level',
      render: i => (
        <span className="font-mono text-xs text-text-secondary">
          {parseFloat(i.reorder_level)}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Stock Status',
      render: i => {
        const stock = parseFloat(i.current_stock), reorder = parseFloat(i.reorder_level);
        const label = stock <= 0 ? 'Critical' : stock <= reorder ? 'Low Stock' : 'In Stock';
        return <StatusBadge status={label} />;
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: i => (
        <div className="flex items-center gap-1.5">
          {hasPermission('store', 'edit') && (
            <button
              onClick={() => openEdit(i)}
              className="btn btn-ghost px-2 py-1 text-xs font-mono uppercase tracking-wider text-accent-primary"
            >
              Edit
            </button>
          )}
          {hasPermission('store', 'delete') && (
            <button
              onClick={() => handleDelete(i)}
              className="btn btn-ghost px-2 py-1 text-xs font-mono uppercase tracking-wider text-accent-danger"
            >
              Delete
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 animate-fadeIn font-sans">
      <PageHeader
        title="Item Master"
        description="Manage raw materials, finished goods, and consumables catalogue."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsCatOpen(true)}
              className="btn btn-ghost px-3.5 py-2 text-xs font-mono uppercase tracking-wider"
            >
              + Category
            </button>
            {hasPermission('store', 'create') && (
              <button
                onClick={openCreate}
                className="btn btn-primary px-4 py-2 text-xs font-mono uppercase tracking-wider"
              >
                + New Item
              </button>
            )}
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="sheet p-3 flex flex-col sm:flex-row gap-3 bg-bg-secondary">
        <div className="flex-1">
          <SearchBar
            value={search}
            onChange={v => { setSearch(v); setPage(1); }}
            placeholder="Search by name or item code..."
          />
        </div>
        <select
          value={selectedCategory}
          onChange={e => { setSelectedCategory(e.target.value); setPage(1); }}
          className="field text-xs font-sans sm:w-64"
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Items Table */}
      <div className="sheet">
        <Table columns={columns} data={items} loading={loading} emptyMessage="No items found." />
      </div>

      {/* Pagination */}
      <div className="flex justify-end">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* Item Form Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editing ? 'Edit Item Details' : 'Create New Item'}>
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Item Code *</label>
              <input
                required
                value={form.item_code}
                onChange={e => setForm(p => ({ ...p, item_code: e.target.value }))}
                onBlur={handleCodeBlur}
                className={`field font-mono ${codeError ? 'border-accent-danger' : ''}`}
                placeholder="e.g. RM-001"
              />
              {codeError && <p className="text-xs text-accent-danger mt-1 font-mono">{codeError}</p>}
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Item Type *</label>
              <select
                required
                value={form.item_type}
                onChange={e => setForm(p => ({ ...p, item_type: e.target.value }))}
                className="field font-sans"
              >
                {ITEM_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Item Name *</label>
              <input
                required
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="field font-sans"
                placeholder="e.g. Cold Rolled Steel Sheet 2mm"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Unit *</label>
              <select
                required
                value={form.unit}
                onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                className="field font-sans"
              >
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Reorder Level</label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.reorder_level}
                onChange={e => setForm(p => ({ ...p, reorder_level: e.target.value }))}
                className="field font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">{editing ? 'Current Stock' : 'Opening Stock'}</label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.opening_stock}
                onChange={e => setForm(p => ({ ...p, opening_stock: e.target.value }))}
                className="field font-mono"
                placeholder="0"
              />
              <p className="text-[11px] text-text-muted mt-1 font-mono">{editing ? 'Directly update stock level' : 'Initial stock on creation'}</p>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Category</label>
              <select
                value={form.category_id}
                onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
                className="field font-sans"
              >
                <option value="">No Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Description</label>
              <input
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="field font-sans"
              />
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
              Save Item
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Category Modal */}
      <Modal isOpen={isCatOpen} onClose={() => setIsCatOpen(false)} title="Add Item Category">
        <form onSubmit={handleAddCategory} className="space-y-4 font-sans">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-text-secondary mb-1">Category Name *</label>
            <input
              required
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              className="field font-sans"
              placeholder="e.g. Raw Materials"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setIsCatOpen(false)}
              className="btn btn-ghost px-4 py-2 text-xs font-mono uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary px-4 py-2 text-xs font-mono uppercase tracking-wider"
            >
              Add Category
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ItemsPage;
