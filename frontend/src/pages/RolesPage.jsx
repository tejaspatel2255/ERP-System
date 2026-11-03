import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Table from '../components/Table';
import Modal from '../components/Modal';
import { useRole } from '../context/RoleContext';
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  setRolePermissions,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment
} from '../api/userApi';
import PageHeader from '../components/PageHeader';
import { Shield, Pencil, Trash2, Check, X, Building2, Plus, Loader2 } from 'lucide-react';

// Define the exact list of modules and actions as they exist in the DB
const MODULES = [
  { key: 'auth', label: 'Auth & Roles' },
  { key: 'sales', label: 'Sales Management' },
  { key: 'purchase', label: 'Purchase Management' },
  { key: 'inventory', label: 'Store / Inventory' },
  { key: 'production', label: 'Production Workflows' },
  { key: 'maintenance', label: 'Asset & Maintenance' },
  { key: 'qa', label: 'Quality Assurance' },
  { key: 'qc', label: 'Quality Control' },
  { key: 'dispatch', label: 'Dispatch & Transports' },
  { key: 'hr', label: 'Human Resources' },
  { key: 'design', label: 'Design Files' },
  { key: 'dashboard', label: 'Dashboard & Reports' }
];

const ACTIONS = [
  { key: 'view', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' }
];

const RolesPage = () => {
  const { hasPermission } = useRole();

  // State Management
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  
  // Selected state
  const [newRoleName, setNewRoleName] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);

  // Role Edit & Saving State
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [editingRoleName, setEditingRoleName] = useState('');
  const [savingRoleId, setSavingRoleId] = useState(null);
  
  // Department Management State
  const [departments, setDepartments] = useState([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [deptLoading, setDeptLoading] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState(null);
  const [editingDeptName, setEditingDeptName] = useState('');
  const [savingDeptId, setSavingDeptId] = useState(null);

  // Matrix permissions mapping state
  // Format: { 'sales:view': true, 'sales:create': false, ... }
  const [matrixState, setMatrixState] = useState({});

  // Fetch Roles List
  const fetchRolesList = async () => {
    setLoading(true);
    try {
      const data = await getRoles();
      if (data.success) {
        setRoles(data.roles);
      }
    } catch (err) {
      toast.error('Failed to load roles list.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Departments List
  const fetchDepartmentsList = async () => {
    try {
      const data = await getDepartments();
      if (data.success) {
        setDepartments(data.departments);
      }
    } catch (err) {
      toast.error('Failed to load departments list.');
    }
  };

  useEffect(() => {
    fetchRolesList();
    fetchDepartmentsList();
  }, []);

  // Handle New Department Creation
  const handleCreateDeptSubmit = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) {
      return toast.error('Department name is required.');
    }
    setDeptLoading(true);
    try {
      const data = await createDepartment({ name: newDeptName.trim() });
      if (data.success || data.department) {
        toast.success('Department created successfully.');
        setNewDeptName('');
        fetchDepartmentsList();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create department.');
    } finally {
      setDeptLoading(false);
    }
  };

  // Handle Department Update (Save Inline Edit)
  const handleUpdateDeptSubmit = async (deptId) => {
    if (!editingDeptName.trim()) {
      return toast.error('Department name is required.');
    }
    setSavingDeptId(deptId);
    try {
      const data = await updateDepartment(deptId, { name: editingDeptName.trim() });
      if (data.success) {
        toast.success('Department updated successfully.');
        setEditingDeptId(null);
        setEditingDeptName('');
        fetchDepartmentsList();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update department.');
    } finally {
      setSavingDeptId(null);
    }
  };

  // Handle Department Deletion
  const handleDeleteDept = async (deptId) => {
    if (!window.confirm('Are you sure you want to delete this department?')) {
      return;
    }
    try {
      const data = await deleteDepartment(deptId);
      if (data.success) {
        toast.success('Department deleted successfully.');
        fetchDepartmentsList();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete department.');
    }
  };

  // Handle New Role Creation
  const handleCreateRoleSubmit = async (e) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      return toast.error('Role name is required.');
    }

    try {
      const data = await createRole({ name: newRoleName.trim() });
      if (data.success) {
        toast.success('Role created successfully.');
        setNewRoleName('');
        setIsRoleModalOpen(false);
        fetchRolesList();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create role.');
    }
  };

  // Role Edit & Delete Handlers
  const handleUpdateRoleSubmit = async (roleId) => {
    if (!editingRoleName.trim()) {
      return toast.error('Role name is required.');
    }
    setSavingRoleId(roleId);
    try {
      const data = await updateRole(roleId, { name: editingRoleName.trim() });
      if (data.success) {
        toast.success('Role updated successfully.');
        setEditingRoleId(null);
        setEditingRoleName('');
        fetchRolesList();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role.');
    } finally {
      setSavingRoleId(null);
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm('Are you sure you want to delete this role?')) {
      return;
    }
    try {
      const data = await deleteRole(roleId);
      if (data.success) {
        toast.success('Role deleted successfully.');
        fetchRolesList();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete role.');
    }
  };

  // Open Permission Matrix Modal
  const handleEditPermissions = (role) => {
    setSelectedRole(role);
    
    // Construct local mapping of role's existing permissions
    const mapping = {};
    
    // Pre-fill existing permissions from role data
    if (role.permissions && Array.isArray(role.permissions)) {
      role.permissions.forEach(p => {
        mapping[`${p.module_name}:${p.action}`] = true;
      });
    }

    setMatrixState(mapping);
    setIsPermModalOpen(true);
  };

  // Handle Grid Intersection Checkbox Toggle
  const handleMatrixToggle = (moduleKey, actionKey) => {
    const key = `${moduleKey}:${actionKey}`;
    setMatrixState(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Save the Permissions matrix configuration
  const handleSavePermissions = async () => {
    if (!selectedRole) return;

    // Convert matrix state map back to backend array format [{ module_name, action }]
    const selectedPermissions = [];
    Object.keys(matrixState).forEach(key => {
      if (matrixState[key]) {
        const [module_name, action] = key.split(':');
        selectedPermissions.push({ module_name, action });
      }
    });

    try {
      const data = await setRolePermissions(selectedRole.id, selectedPermissions);
      if (data.success) {
        toast.success(`Permissions updated for role '${selectedRole.name}'.`);
        setIsPermModalOpen(false);
        fetchRolesList();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update permissions.');
    }
  };

  // Columns for Roles overview table
  const columns = [
    {
      key: 'name',
      label: 'Role Name',
      render: (item) => {
        if (editingRoleId === item.id) {
          const isSaving = savingRoleId === item.id;
          return (
            <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
              <input
                type="text"
                className="rounded-lg border border-blue-500 dark:border-blue-500 bg-white dark:bg-slate-950 px-3 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-48 font-medium shadow-xs"
                value={editingRoleName}
                onChange={(e) => setEditingRoleName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleUpdateRoleSubmit(item.id);
                  } else if (e.key === 'Escape') {
                    setEditingRoleId(null);
                  }
                }}
                disabled={isSaving}
                autoFocus
              />
              <button
                type="button"
                onClick={() => handleUpdateRoleSubmit(item.id)}
                disabled={isSaving}
                className="inline-flex items-center justify-center p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                title="Save role name"
                aria-label="Save role name"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              </button>
              <button
                type="button"
                onClick={() => setEditingRoleId(null)}
                disabled={isSaving}
                className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                title="Cancel edit"
                aria-label="Cancel edit"
              >
                <X size={14} />
              </button>
            </div>
          );
        }
        return <span className="font-semibold text-slate-900 dark:text-white">{item.name}</span>;
      }
    },
    {
      key: 'user_count',
      label: 'Assigned Users Count',
      render: (item) => (
        <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          {item.user_count || 0} users
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <div className="flex items-center justify-end gap-2">
          {hasPermission('auth', 'edit') && (
            <button
              onClick={() => handleEditPermissions(item)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              title="Configure permissions matrix for this role"
            >
              <Shield size={14} />
              <span>Configure Permissions</span>
            </button>
          )}
          {hasPermission('auth', 'edit') && (
            <button
              onClick={() => {
                setEditingRoleId(item.id);
                setEditingRoleName(item.name);
              }}
              className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              title="Rename role"
              aria-label="Rename role"
            >
              <Pencil size={14} />
            </button>
          )}
          {hasPermission('auth', 'delete') && item.name !== 'Admin' && (
            <button
              onClick={() => handleDeleteRole(item.id)}
              className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/20"
              title="Delete role"
              aria-label="Delete role"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl animate-in fade-in duration-300">
      <PageHeader
        title="Roles & Permissions"
        description="Define system roles and configure granularity of access permissions across modules."
        actions={
          hasPermission('auth', 'create') && (
            <button
              onClick={() => setIsRoleModalOpen(true)}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              Create New Role
            </button>
          )
        }
      />

      {/* Roles List Table */}
      <Table columns={columns} data={roles} loading={loading} emptyMessage="No roles defined in the system." />

      {/* DEPARTMENTS MANAGEMENT SECTION */}
      {hasPermission('auth', 'create') && (
        <div className="mt-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-6 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Organization Departments</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">View and manage organizational structure departments.</p>
              </div>
            </div>
            <form onSubmit={handleCreateDeptSubmit} className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="text"
                placeholder="New Department Name"
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full md:w-64 shadow-xs"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
              />
              <button
                type="submit"
                disabled={deptLoading}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {deptLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                <span>{deptLoading ? 'Adding...' : 'Add Department'}</span>
              </button>
            </form>
          </div>

          {departments.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No departments defined yet — add one above.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {departments.map((dept) => {
                if (editingDeptId === dept.id) {
                  const isSaving = savingDeptId === dept.id;
                  return (
                    <div
                      key={dept.id}
                      className="flex items-center justify-between gap-2 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 shadow-xs animate-in fade-in duration-150"
                    >
                      <input
                        type="text"
                        className="rounded-lg border border-blue-500 bg-white dark:bg-slate-950 px-2.5 py-1 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full"
                        value={editingDeptName}
                        onChange={(e) => setEditingDeptName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleUpdateDeptSubmit(dept.id);
                          } else if (e.key === 'Escape') {
                            setEditingDeptId(null);
                          }
                        }}
                        disabled={isSaving}
                        autoFocus
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateDeptSubmit(dept.id)}
                          disabled={isSaving}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          title="Save department name"
                          aria-label="Save department name"
                        >
                          {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingDeptId(null)}
                          disabled={isSaving}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                          title="Cancel edit"
                          aria-label="Cancel edit"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={dept.id}
                    className="group flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-all shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {dept.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      {hasPermission('auth', 'edit') && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDeptId(dept.id);
                            setEditingDeptName(dept.name);
                          }}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          title="Rename department"
                          aria-label="Rename department"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                      {hasPermission('auth', 'delete') && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDept(dept.id)}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/20"
                          title="Delete department"
                          aria-label="Delete department"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CREATE ROLE MODAL */}
      <Modal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} title="Create New Role">
        <form onSubmit={handleCreateRoleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Role Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sales Executive, QC Analyst"
              className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsRoleModalOpen(false)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Create Role
            </button>
          </div>
        </form>
      </Modal>

      {/* PERMISSIONS MATRIX MODAL */}
      <Modal 
        isOpen={isPermModalOpen} 
        onClose={() => setIsPermModalOpen(false)} 
        title={`Configure Permissions Matrix: ${selectedRole?.name}`}
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Select the checkmarks at intersections to grant permissions to the role. Click save details to apply changes.
          </p>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 shadow-sm">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Module / Feature
                  </th>
                  {ACTIONS.map(action => (
                    <th 
                      key={action.key} 
                      className="px-6 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400"
                    >
                      {action.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {MODULES.map(module => (
                  <tr 
                    key={module.key}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {module.label}
                    </td>
                    {ACTIONS.map(action => {
                      const isChecked = !!matrixState[`${module.key}:${action.key}`];
                      return (
                        <td key={action.key} className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            checked={isChecked}
                            onChange={() => handleMatrixToggle(module.key, action.key)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsPermModalOpen(false)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Discard Changes
            </button>
            <button
              onClick={handleSavePermissions}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Save Permission Matrix
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RolesPage;
