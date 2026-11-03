import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';
import StatusBadge from '../components/StatusBadge';
import { useRole } from '../context/RoleContext';
import { Clock, CheckCircle, XCircle, Plus, X } from 'lucide-react';
import {
  getUsers,
  createUser,
  updateUser,
  getRoles,
  getDepartments,
  createDepartment,
  getUserActivity,
  assignUserRoles,
  getPendingUsers,
  approveUser,
  rejectUser
} from '../api/userApi';
import PageHeader from '../components/PageHeader';

const UsersPage = () => {
  const { hasPermission } = useRole();

  // State Management
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingLoading, setPendingLoading] = useState(false);
  
  // Pending Approval Action States (map user.id -> selectedRoleId)
  const [selectedPendingRoles, setSelectedPendingRoles] = useState({});

  // Filtering & Pagination
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  // Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerUser, setDrawerUser] = useState(null);
  const [drawerLogs, setDrawerLogs] = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    department_id: '',
    roles: [],
    is_active: true
  });

  // Inline Department Creation State
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [creatingDeptLoading, setCreatingDeptLoading] = useState(false);
  const [previousDeptId, setPreviousDeptId] = useState('');

  // Fetch Pending Users
  const fetchPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const data = await getPendingUsers();
      if (data.success) {
        setPendingUsers(data.users);
      }
    } catch (err) {
      // ignore if user doesn't have permission
    } finally {
      setPendingLoading(false);
    }
  }, []);

  // Fetch Active Users List
  const fetchUsersList = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        search,
        departmentId: selectedDept,
        roleId: selectedRole,
        page,
        limit: 25
      };
      const data = await getUsers(filters);
      if (data.success) {
        setUsers(data.users);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch users.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedDept, selectedRole, page]);

  // Fetch Roles and Departments on Mount
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [rolesData, deptsData] = await Promise.all([getRoles(), getDepartments()]);
        if (rolesData.success) {
          setRoles(rolesData.roles);
        }
        if (deptsData.success) setDepartments(deptsData.departments);
      } catch (err) {
        toast.error('Failed to load roles/departments metadata.');
      }
    };
    fetchMetadata();
    fetchPending();
  }, [fetchPending]);

  // Sync users list with state changes
  useEffect(() => {
    fetchUsersList();
  }, [fetchUsersList]);

  // Handle Approve Pending User
  const handleApprove = async (userId) => {
    const roleId = selectedPendingRoles[userId] || (roles[0]?.id || roles[0]?.name);
    if (!roleId) {
      return toast.error('Please select a role to assign before approving.');
    }

    try {
      await approveUser(userId, { role_id: roleId });
      toast.success('User approved and role assigned successfully!');
      fetchPending();
      fetchUsersList();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve user.');
    }
  };

  // Handle Reject Pending User
  const handleReject = async (userId) => {
    if (!window.confirm('Are you sure you want to reject and remove this registration request?')) {
      return;
    }

    try {
      await rejectUser(userId);
      toast.success('Registration request rejected.');
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject registration.');
    }
  };

  // Close Modal and Reset Form State
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setIsAddingDept(false);
    setNewDeptName('');
    setFormData({
      name: '',
      email: '',
      password: '',
      department_id: '',
      roles: [],
      is_active: true
    });
  };

  // Open Modal for Create
  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      department_id: String(departments[0]?.id || ''),
      roles: [],
      is_active: true
    });
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      department_id: String(user.department_id || departments[0]?.id || ''),
      roles: user.roles || [],
      is_active: user.is_active ?? true
    });
    setIsModalOpen(true);
  };

  // Handle Form Input Changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle Department Select Change (Inline Creation Trigger)
  const handleDepartmentChange = (e) => {
    const value = e.target.value;
    if (value === '__add_new__') {
      setPreviousDeptId(formData.department_id);
      setIsAddingDept(true);
      setNewDeptName('');
    } else {
      setFormData(prev => ({ ...prev, department_id: String(value) }));
    }
  };

  // Create Inline Department
  const handleCreateInlineDept = async () => {
    if (!newDeptName.trim()) {
      return toast.error('Department name is required.');
    }
    setCreatingDeptLoading(true);
    try {
      const res = await createDepartment({ name: newDeptName.trim() });
      const deptsRes = await getDepartments();
      if (deptsRes.success) {
        setDepartments(deptsRes.departments);
      }
      const createdId = res.department?.id || res.id;
      if (createdId) {
        setFormData(prev => ({ ...prev, department_id: createdId }));
      }
      setIsAddingDept(false);
      setNewDeptName('');
      toast.success('Department created successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create department.');
    } finally {
      setCreatingDeptLoading(false);
    }
  };

  // Cancel Inline Department Creation
  const handleCancelInlineDept = () => {
    setIsAddingDept(false);
    setNewDeptName('');
    setFormData(prev => ({
      ...prev,
      department_id: previousDeptId || (departments[0]?.id || '')
    }));
  };

  // Handle Role Checkbox Changes
  const handleRoleCheckboxChange = (roleName) => {
    setFormData(prev => {
      const currentRoles = [...prev.roles];
      const idx = currentRoles.indexOf(roleName);
      if (idx > -1) {
        currentRoles.splice(idx, 1);
      } else {
        currentRoles.push(roleName);
      }
      return { ...prev, roles: currentRoles };
    });
  };

  // Submitting state for form
  const [submitting, setSubmitting] = useState(false);

  // Submit User creation/edit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name?.trim()) return toast.error('Full Name is required.');
    if (!formData.email?.trim()) return toast.error('Email is required.');
    if (!editingUser && !formData.password) return toast.error('Password is required.');
    if (!editingUser && formData.password.length < 6) return toast.error('Password must be at least 6 characters.');
    if (!formData.department_id) return toast.error('Department selection is required.');

    setSubmitting(true);

    try {
      if (editingUser) {
        console.debug('Sending updateUser department_id:', String(formData.department_id));
        const updateRes = await updateUser(editingUser.id, {
          name: formData.name,
          email: formData.email,
          department_id: String(formData.department_id),
          is_active: formData.is_active
        });

        const returnedDeptId = updateRes?.user?.department_id;
        console.debug('Received updateUser user.department_id:', String(returnedDeptId));

        if (returnedDeptId && String(returnedDeptId) !== String(formData.department_id)) {
          console.warn(`[Department Update Mismatch] Sent: ${formData.department_id}, Returned: ${returnedDeptId}`);
        }

        if (updateRes?.success && updateRes?.user) {
          setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...updateRes.user, roles: formData.roles || u.roles } : u));
        }

        if (formData.roles && Array.isArray(formData.roles)) {
          try {
            await assignUserRoles(editingUser.id, formData.roles);
          } catch (roleErr) {
            console.warn('Role assignment warning:', roleErr);
          }
        }
        toast.success('User updated successfully.');
      } else {
        await createUser({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          department_id: formData.department_id,
          roles: formData.roles
        });
        toast.success('User created successfully.');
      }

      handleCloseModal();
      await fetchUsersList();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open User Activity Drawer
  const handleOpenActivity = async (user) => {
    setDrawerUser(user);
    setDrawerLogs([]);
    setIsDrawerOpen(true);
    setDrawerLoading(true);

    try {
      const data = await getUserActivity(user.id);
      if (data.success) {
        setDrawerLogs(data.logs);
      }
    } catch (err) {
      toast.error('Failed to load user activity.');
    } finally {
      setDrawerLoading(false);
    }
  };

  // Toggle user active status directly
  const handleToggleStatus = async (user) => {
    try {
      const nextStatus = !user.is_active;
      await updateUser(user.id, {
        name: user.name,
        email: user.email,
        department_id: user.department_id,
        is_active: nextStatus
      });
      toast.success(`User account ${nextStatus ? 'activated' : 'deactivated'}.`);
      fetchUsersList();
    } catch (err) {
      toast.error('Failed to change user status.');
    }
  };

  // Helper for initials
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Columns for Users table
  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[var(--info-bg)] text-[var(--info-text)] border border-[var(--info-border)] text-xs font-semibold flex items-center justify-center shrink-0">
            {getInitials(item.name)}
          </div>
          <span className="font-medium text-text-primary">{item.name}</span>
        </div>
      )
    },
    { key: 'email', label: 'Email', render: (item) => <span className="font-mono text-xs text-text-secondary">{item.email}</span> },
    { key: 'department_name', label: 'Department', render: (item) => item.department_name || 'N/A' },
    {
      key: 'roles',
      label: 'Roles',
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.roles && item.roles.length > 0 ? (
            item.roles.map((r, i) => (
              <span key={i} className="tb-cell text-[11px] px-2 py-0.5 rounded font-medium">
                {r}
              </span>
            ))
          ) : (
            <span className="text-text-muted text-xs">None</span>
          )}
        </div>
      )
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (item) => <StatusBadge status={item.is_active ? 'Active' : 'Inactive'} />
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-1.5">
          {hasPermission('auth', 'edit') && (
            <button
              onClick={() => handleOpenEdit(item)}
              className="btn btn-ghost btn-sm"
            >
              Edit
            </button>
          )}
          {hasPermission('auth', 'edit') && (
            <button
              onClick={() => handleToggleStatus(item)}
              className={item.is_active ? 'btn btn-danger btn-sm' : 'btn btn-ghost btn-sm'}
            >
              {item.is_active ? 'Deactivate' : 'Activate'}
            </button>
          )}
          <button
            onClick={() => handleOpenActivity(item)}
            className="btn btn-ghost btn-sm"
          >
            Activity
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="User Accounts"
        description="Manage your organization's user accounts, approvals, departments, and roles."
        actions={
          hasPermission('auth', 'create') && (
            <button
              onClick={handleOpenCreate}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Create User
            </button>
          )
        }
      />

      {/* PENDING APPROVALS SECTION */}
      {pendingUsers.length > 0 && (
        <div className="sheet p-4 sm:p-5 border-l-4 border-l-[var(--warning-rail)] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border-color">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--warning-soft)] text-[var(--warning-rail)]">
                <Clock size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  Pending Account Approvals
                  <span className="tb-cell text-[11px] px-2 py-0.5 rounded font-mono font-medium text-[var(--warning-rail)]">
                    {pendingUsers.length}
                  </span>
                </h2>
                <p className="text-xs text-text-secondary">
                  Self-registered users awaiting admin review and role assignment.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-border-color">
            {pendingUsers.map((pUser) => (
              <div key={pUser.id} className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[var(--warning-soft)] text-[var(--warning-rail)] text-xs font-semibold flex items-center justify-center shrink-0">
                    {getInitials(pUser.name)}
                  </div>
                  <div>
                    <div className="font-medium text-text-primary text-sm">{pUser.name}</div>
                    <div className="text-xs text-text-secondary">
                      <span className="font-mono">{pUser.email}</span> &bull; Registered {new Date(pUser.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Select Role Dropdown */}
                  <select
                    value={selectedPendingRoles[pUser.id] || (roles[0]?.id || '')}
                    onChange={(e) => setSelectedPendingRoles(prev => ({ ...prev, [pUser.id]: e.target.value }))}
                    className="field py-1 px-2.5 text-xs w-auto"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleApprove(pUser.id)}
                    className="btn btn-primary btn-sm inline-flex items-center gap-1"
                  >
                    <CheckCircle size={13} />
                    Approve
                  </button>

                  <button
                    onClick={() => handleReject(pUser.id)}
                    className="btn btn-danger btn-sm inline-flex items-center gap-1"
                  >
                    <XCircle size={13} />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="sheet p-3 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[240px]">
          <SearchBar value={search} onChange={(val) => { setSearch(val); setPage(1); }} placeholder="Search users by name or email..." />
        </div>
        <div className="w-48">
          <label className="field-label block mb-1">Department</label>
          <select
            value={selectedDept}
            onChange={(e) => { setSelectedDept(e.target.value); setPage(1); }}
            className="field"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>
        <div className="w-48">
          <label className="field-label block mb-1">Role</label>
          <select
            value={selectedRole}
            onChange={(e) => { setSelectedRole(e.target.value); setPage(1); }}
            className="field"
          >
            <option value="">All Roles</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Users Table */}
      <Table columns={columns} data={users} loading={loading} emptyMessage="No users found matching your search criteria." />

      {/* Pagination */}
      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* CREATE/EDIT USER MODAL */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingUser ? 'Edit User Details' : 'Create New User'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="field-label block mb-1">Full Name</label>
            <input
              type="text"
              name="name"
              required
              className="field"
              value={formData.name}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <label className="field-label block mb-1">Email Address</label>
            <input
              type="email"
              name="email"
              required
              className="field"
              value={formData.email}
              onChange={handleInputChange}
            />
          </div>

          {!editingUser && (
            <div>
              <label className="field-label block mb-1">Password</label>
              <input
                type="password"
                name="password"
                required
                className="field"
                value={formData.password}
                onChange={handleInputChange}
              />
            </div>
          )}

          <div>
            <label className="field-label block mb-1">Department</label>
            {!isAddingDept ? (
              <select
                name="department_id"
                required
                className="field"
                value={formData.department_id}
                onChange={handleDepartmentChange}
              >
                <option value="" disabled>Select Department</option>
                {departments.map((dept) => (
                  <option key={String(dept.id)} value={String(dept.id)}>{dept.name}</option>
                ))}
                {hasPermission('auth', 'create') && (
                  <option value="__add_new__">+ Add New Department...</option>
                )}
              </select>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  placeholder="New Department Name"
                  className="field flex-1"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleCreateInlineDept}
                  disabled={creatingDeptLoading}
                  className="btn btn-primary btn-sm whitespace-nowrap"
                >
                  {creatingDeptLoading ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelInlineDept}
                  disabled={creatingDeptLoading}
                  className="btn btn-secondary btn-sm whitespace-nowrap"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* User Roles Selection */}
          <div>
            <label className="field-label block mb-1.5">Assign Roles</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-bg-secondary rounded border border-border-color">
              {roles.map((role) => {
                const isChecked = formData.roles.includes(role.name);
                return (
                  <label key={role.id} className="flex items-center space-x-2 text-sm text-text-primary cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-border-color text-accent-primary focus:ring-accent-primary"
                      checked={isChecked}
                      onChange={() => handleRoleCheckboxChange(role.name)}
                    />
                    <span>{role.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {editingUser && (
            <div className="flex items-center space-x-2 py-1">
              <input
                type="checkbox"
                name="is_active"
                id="is_active"
                className="rounded border-border-color text-accent-primary focus:ring-accent-primary h-4 w-4"
                checked={formData.is_active}
                onChange={handleInputChange}
              />
              <label htmlFor="is_active" className="text-sm font-medium text-text-primary cursor-pointer">
                Account Active
              </label>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={handleCloseModal}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
            >
              {submitting ? 'Saving...' : 'Save Details'}
            </button>
          </div>
        </form>
      </Modal>

      {/* USER ACTIVITY SLIDE-IN DRAWER (Rendered via React Portal) */}
      {isDrawerOpen && createPortal(
        <>
          <div 
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] transition-opacity animate-fadeIn"
            onClick={() => setIsDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-bg-card shadow-lg border-l border-border-color flex flex-col animate-fadeIn">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border-color bg-bg-card select-none">
              <div>
                <h2 className="text-base font-semibold text-text-primary">User Activity History</h2>
                {drawerUser && (
                  <p className="text-xs text-text-secondary mt-0.5">
                    {drawerUser.name} (<span className="font-mono">{drawerUser.email}</span>)
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="btn btn-ghost btn-sm btn-icon"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body Table */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-bg-card">
              <Table
                loading={drawerLoading}
                emptyMessage="No activity recorded for this user."
                columns={[
                  { key: 'action', label: 'Action' },
                  { key: 'module', label: 'Module' },
                  { key: 'record_id', label: 'ID', render: (item) => <span className="font-mono text-xs">{item.record_id || 'N/A'}</span> },
                  {
                    key: 'created_at',
                    label: 'Time',
                    render: (item) => <span className="font-mono text-xs text-text-muted">{new Date(item.created_at).toLocaleString()}</span>
                  }
                ]}
                data={drawerLogs}
              />
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default UsersPage;
