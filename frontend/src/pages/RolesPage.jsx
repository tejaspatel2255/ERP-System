import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Table from '../components/Table';
import Modal from '../components/Modal';
import { useRole } from '../context/RoleContext';
import { getRoles, createRole, setRolePermissions, getDepartments, createDepartment } from '../api/userApi';
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
  
  // Department Management State
  const [departments, setDepartments] = useState([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [deptLoading, setDeptLoading] = useState(false);
  
  // Matrix permissions mapping state
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
    const mapping = {};
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
      render: (item) => <span className="font-semibold text-text-primary">{item.name}</span>
    },
    {
      key: 'user_count',
      label: 'Assigned Users Count',
      render: (item) => <span className="font-mono font-bold text-accent-primary">{item.user_count}</span>
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-2">
          {hasPermission('auth', 'edit') && (
            <button
              onClick={() => handleEditPermissions(item)}
              className="btn btn-secondary text-xs py-1 px-2.5 font-mono"
            >
              Configure Permissions
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 font-sans">
      <PageHeader
        title="Roles & Permissions"
        description="Define system roles and configure granularity of access permissions across modules."
        actions={
          hasPermission('auth', 'create') && (
            <button
              onClick={() => setIsRoleModalOpen(true)}
              className="btn btn-primary text-xs uppercase tracking-wider font-mono"
            >
              + Create New Role
            </button>
          )
        }
      />

      {/* Roles List Table */}
      <div className="sheet">
        <Table columns={columns} data={roles} loading={loading} emptyMessage="No roles defined in the system." />
      </div>

      {/* DEPARTMENTS MANAGEMENT SECTION */}
      {hasPermission('auth', 'create') && (
        <div className="sheet p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border-color pb-3">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-text-primary">Organization Departments</h3>
              <p className="text-xs text-text-muted mt-0.5">View existing system departments and create new ones.</p>
            </div>
            <form onSubmit={handleCreateDeptSubmit} className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="New Department Name"
                className="field text-xs py-1.5 px-3 w-full sm:w-64"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
              />
              <button
                type="submit"
                disabled={deptLoading}
                className="btn btn-primary text-xs whitespace-nowrap"
              >
                {deptLoading ? 'Adding...' : 'Add Department'}
              </button>
            </form>
          </div>

          <div className="flex flex-wrap gap-2 pt-1 font-mono text-xs">
            {departments.map((dept) => (
              <span
                key={dept.id}
                className="inline-flex items-center px-2.5 py-1 rounded-xs font-semibold bg-bg-surface text-text-secondary border border-border-color"
              >
                {dept.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CREATE ROLE MODAL */}
      <Modal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} title="Create New Role">
        <form onSubmit={handleCreateRoleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">
              Role Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sales Executive, QC Analyst"
              className="field w-full"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setIsRoleModalOpen(false)}
              className="btn btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary text-xs"
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
        <div className="space-y-4 font-sans">
          <p className="text-xs text-text-muted">
            Select checkmarks at intersections to grant permissions to the role. Click save details to apply changes.
          </p>

          <div className="overflow-x-auto border border-border-color rounded-xs bg-bg-surface">
            <table className="w-full text-left border-collapse min-w-[500px] text-xs">
              <thead>
                <tr className="border-b border-border-color bg-bg-surface font-mono font-bold uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-3">
                    Module / Feature
                  </th>
                  {ACTIONS.map(action => (
                    <th 
                      key={action.key} 
                      className="px-4 py-3 text-center"
                    >
                      {action.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color">
                {MODULES.map(module => (
                  <tr 
                    key={module.key}
                    className="hover:bg-bg-hover transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-text-primary">
                      {module.label}
                    </td>
                    {ACTIONS.map(action => {
                      const isChecked = !!matrixState[`${module.key}:${action.key}`];
                      return (
                        <td key={action.key} className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            className="rounded-xs border-border-color text-accent-primary focus:ring-accent-primary cursor-pointer"
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
              className="btn btn-secondary text-xs"
            >
              Discard Changes
            </button>
            <button
              onClick={handleSavePermissions}
              className="btn btn-primary text-xs"
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
