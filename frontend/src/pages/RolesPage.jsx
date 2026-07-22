import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Table from '../components/Table';
import Modal from '../components/Modal';
import { useRole } from '../context/RoleContext';
import { getRoles, createRole, setRolePermissions } from '../api/userApi';
import PageHeader from '../components/PageHeader';

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

  useEffect(() => {
    fetchRolesList();
  }, []);

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
    { key: 'name', label: 'Role Name' },
    { key: 'user_count', label: 'Assigned Users Count' },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-2">
          {hasPermission('auth', 'edit') && (
            <button
              onClick={() => handleEditPermissions(item)}
              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 font-semibold text-xs bg-blue-50 dark:bg-blue-900/10 px-2 py-1 rounded-md transition-colors"
            >
              Configure Permissions
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
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
            >
              Create New Role
            </button>
          )
        }
      />

      {/* Roles List Table */}
      <Table columns={columns} data={roles} loading={loading} emptyMessage="No roles defined in the system." />

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
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Module / Feature
                  </th>
                  {ACTIONS.map(action => (
                    <th 
                      key={action.key} 
                      className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
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
