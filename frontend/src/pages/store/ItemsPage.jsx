import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import SearchBar from '../../components/SearchBar';
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
    <span className={`inline-flex items-center gap-1.5 font-semibold ${isCritical ? 'text-red-600 dark:text-red-400' : isLow ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
      <span className={`w-2 h-2 rounded-full ${isCritical ? 'bg-red-500 animate-pulse' : isLow ? 'bg-orange-500' : 'bg-green-500'}`} />
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
    { key: 'item_code', label: 'Item Code' },
    { key: 'name', label: 'Item Name' },
    { key: 'item_type', label: 'Type', render: i => {
      const typeColors = { 'Finished Good': 'bg-purple-100 text-purple-800 border-purple-200', 'Semi-Finished': 'bg-blue-100 text-blue-800 border-blue-200', 'Consumable': 'bg-orange-100 text-orange-800 border-orange-200', 'Raw Material': 'bg-slate-100 text-slate-700 border-slate-200' };
      return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold border ${typeColors[i.item_type] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>{i.item_type || 'Raw Material'}</span>;
    }},
    { key: 'category_name', label: 'Category', render: i => i.category_name || '—' },
    { key: 'unit', label: 'Unit' },
    { key: 'current_stock', label: 'Current Stock', render: i => <StockBadge item={i} /> },
    { key: 'reorder_level', label: 'Reorder Level', render: i => parseFloat(i.reorder_level) },
    {
      key: 'status', label: 'Stock Status', render: i => {
        const stock = parseFloat(i.current_stock), reorder = parseFloat(i.reorder_level);
        const label = stock <= 0 ? 'Critical' : stock <= reorder ? 'Low Stock' : 'In Stock';
        const cls = stock <= 0 ? 'bg-red-100 text-red-800 border-red-200' : stock <= reorder ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-green-100 text-green-800 border-green-200';
        return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${cls}`}>{label}</span>;
      }
    },
    {
      key: 'actions', label: 'Actions', render: i => (
        <div className="flex gap-2">
          {hasPermission('store', 'edit') && <button onClick={() => openEdit(i)} className="text-blue-600 text-xs font-semibold bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100">Edit</button>}
          {hasPermission('store', 'delete') && <button onClick={() => handleDelete(i)} className="text-red-600 text-xs font-semibold bg-red-50 px-2 py-1 rounded-md hover:bg-red-100">Delete</button>}
        </div>
      )
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Item Master</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage raw materials, finished goods, and consumables catalogue.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsCatOpen(true)} className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">+ Category</button>
          {hasPermission('store', 'create') && <button onClick={openCreate} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">+ New Item</button>}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1"><SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search by name or item code..." /></div>
        <select value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none">
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
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Item Code *</label>
              <input required value={form.item_code} onChange={e => setForm(p => ({ ...p, item_code: e.target.value }))} onBlur={handleCodeBlur} className={`block w-full rounded-lg border py-2 px-3 text-sm focus:outline-none ${codeError ? 'border-red-400' : 'border-slate-200 dark:border-slate-800'} bg-white dark:bg-slate-950 text-slate-900 dark:text-white`} placeholder="e.g. RM-001" />
              {codeError && <p className="text-xs text-red-500 mt-1">{codeError}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Item Type *</label>
              <select required value={form.item_type} onChange={e => setForm(p => ({ ...p, item_type: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none">
                {ITEM_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Item Name *</label>
              <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" placeholder="e.g. Cold Rolled Steel Sheet 2mm" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Unit *</label>
              <select required value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none">
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Reorder Level</label>
              <input type="number" min="0" step="any" value={form.reorder_level} onChange={e => setForm(p => ({ ...p, reorder_level: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
              <select value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none">
                <option value="">No Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
              <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Save Item</button>
          </div>
        </form>
      </Modal>

      {/* Add Category Modal */}
      <Modal isOpen={isCatOpen} onClose={() => setIsCatOpen(false)} title="Add Item Category">
        <form onSubmit={handleAddCategory} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Category Name *</label>
            <input required value={newCatName} onChange={e => setNewCatName(e.target.value)} className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none" placeholder="e.g. Raw Materials" />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsCatOpen(false)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Add Category</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ItemsPage;
