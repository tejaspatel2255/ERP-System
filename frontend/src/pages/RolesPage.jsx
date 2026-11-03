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
            <div className="flex items-center gap-1.5 animate-fadeIn">
              <input
                type="text"
                className="field py-1 px-2.5 text-xs w-48 font-medium"
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
                className="btn btn-primary btn-sm btn-icon"
                title="Save role name"
                aria-label="Save role name"
              >
                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              </button>
              <button
                type="button"
                onClick={() => setEditingRoleId(null)}
                disabled={isSaving}
                className="btn btn-secondary btn-sm btn-icon"
                title="Cancel edit"
                aria-label="Cancel edit"
              >
                <X size={13} />
              </button>
            </div>
          );
        }
        return <span className="font-semibold text-text-primary">{item.name}</span>;
      }
    },
    {
      key: 'user_count',
      label: 'Assigned Users Count',
      render: (item) => (
        <span className="tb-cell text-[11px] px-2 py-0.5 rounded font-mono font-medium">
          {item.user_count || 0} users
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          {hasPermission('auth', 'edit') && (
            <button
              onClick={() => handleEditPermissions(item)}
              className="btn btn-primary btn-sm inline-flex items-center gap-1.5"
              title="Configure permissions matrix for this role"
            >
              <Shield size={13} />
              <span>Configure Permissions</span>
            </button>
          )}
          {hasPermission('auth', 'edit') && (
            <button
              onClick={() => {
                setEditingRoleId(item.id);
                setEditingRoleName(item.name);
              }}
              className="btn btn-ghost btn-sm btn-icon"
              title="Rename role"
              aria-label="Rename role"
            >
              <Pencil size={13} />
            </button>
          )}
          {hasPermission('auth', 'delete') && item.name !== 'Admin' && (
            <button
              onClick={() => handleDeleteRole(item.id)}
              className="btn btn-danger btn-sm btn-icon"
              title="Delete role"
              aria-label="Delete role"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Roles & Permissions"
        description="Define system roles and configure granularity of access permissions across modules."
        actions={
          hasPermission('auth', 'create') && (
            <button
              onClick={() => setIsRoleModalOpen(true)}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Create New Role
            </button>
          )
        }
      />

      {/* Roles List Table */}
      <Table columns={columns} data={roles} loading={loading} emptyMessage="No roles defined in the system." />

      {/* DEPARTMENTS MANAGEMENT SECTION */}
      {hasPermission('auth', 'create') && (
        <div className="sheet p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-color">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--info-bg)] text-[var(--info-text)]">
                <Building2 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Organization Departments</h3>
                <p className="text-xs text-text-secondary">View and manage organizational structure departments.</p>
              </div>
            </div>
            <form onSubmit={handleCreateDeptSubmit} className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="text"
                placeholder="New Department Name"
                className="field w-full md:w-64"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
              />
              <button
                type="submit"
                disabled={deptLoading}
                className="btn btn-primary btn-sm whitespace-nowrap"
              >
                {deptLoading ? <Loader2 size={14} className="animate-spin mr-1" /> : <Plus size={14} className="mr-1" />}
                <span>{deptLoading ? 'Adding...' : 'Add Department'}</span>
              </button>
            </form>
          </div>

          {departments.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted">
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
                      className="flex items-center justify-between gap-2 p-2.5 rounded bg-bg-secondary border border-accent-primary animate-fadeIn"
                    >
                      <input
                        type="text"
                        className="field py-1 px-2 text-xs font-medium w-full"
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
                          className="btn btn-primary btn-sm btn-icon"
                          title="Save department name"
                          aria-label="Save department name"
                        >
                          {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingDeptId(null)}
                          disabled={isSaving}
                          className="btn btn-secondary btn-sm btn-icon"
                          title="Cancel edit"
                          aria-label="Cancel edit"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={dept.id}
                    className="group flex items-center justify-between p-3 rounded bg-bg-secondary border border-border-color hover:border-text-muted transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent-primary shrink-0" />
                      <span className="text-xs font-medium text-text-primary truncate">
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
                          className="btn btn-ghost btn-xs btn-icon"
                          title="Rename department"
                          aria-label="Rename department"
                        >
                          <Pencil size={12} />
                        </button>
                      )}
                      {hasPermission('auth', 'delete') && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDept(dept.id)}
                          className="btn btn-ghost btn-xs btn-icon text-[var(--danger-rail)] hover:bg-[var(--danger-soft)]"
                          title="Delete department"
                          aria-label="Delete department"
                        >
                          <Trash2 size={12} />
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
            <label className="field-label block mb-1">
              Role Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sales Executive, QC Analyst"
              className="field"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setIsRoleModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
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
          <p className="text-xs text-text-secondary">
            Select the checkmarks at intersections to grant permissions to the role. Click save details to apply changes.
          </p>

          <div className="sheet overflow-x-auto">
            <table className="bom w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr>
                  <th>
                    Module / Feature
                  </th>
                  {ACTIONS.map(action => (
                    <th 
                      key={action.key} 
                      className="text-center"
                    >
                      {action.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map(module => (
                  <tr 
                    key={module.key}
                    className="bom-row"
                  >
                    <td className="font-medium text-text-primary">
                      {module.label}
                    </td>
                    {ACTIONS.map(action => {
                      const isChecked = !!matrixState[`${module.key}:${action.key}`];
                      return (
                        <td key={action.key} className="text-center">
                          <input
                            type="checkbox"
                            style={{ accentColor: 'var(--accent-primary)' }}
                            className="h-4 w-4 rounded border-border-color cursor-pointer"
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

          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setIsPermModalOpen(false)}
              className="btn btn-secondary"
            >
              Discard Changes
            </button>
            <button
              onClick={handleSavePermissions}
              className="btn btn-primary"
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
