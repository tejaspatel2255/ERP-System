import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';
import { useRole } from '../context/RoleContext';
import { Clock, CheckCircle, XCircle, UserCheck, AlertTriangle } from 'lucide-react';
import {
  getUsers,
  createUser,
  updateUser,
  getRoles,
  getDepartments,
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

  // Open Modal for Create
  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      department_id: departments[0]?.id || '',
      roles: [],
      is_active: true
    });
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      department_id: user.department_id || '',
      roles: user.roles || [],
      is_active: user.is_active
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

  // Submit User creation/edit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) return toast.error('Full Name is required.');
    if (!formData.email.trim()) return toast.error('Email is required.');
    if (!editingUser && !formData.password) return toast.error('Password is required.');
    if (!editingUser && formData.password.length < 6) return toast.error('Password must be at least 6 characters.');
    if (!formData.department_id) return toast.error('Department selection is required.');

    try {
      if (editingUser) {
        await updateUser(editingUser.id, {
          name: formData.name,
          email: formData.email,
          department_id: formData.department_id,
          is_active: formData.is_active
        });

        await assignUserRoles(editingUser.id, formData.roles);
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

      setIsModalOpen(false);
      fetchUsersList();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Action failed.');
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

  // Columns for Users table
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'department_name', label: 'Department', render: (item) => item.department_name || 'N/A' },
    {
      key: 'roles',
      label: 'Roles',
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.roles && item.roles.length > 0 ? (
            item.roles.map((r, i) => (
              <span key={i} className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/30 px-2 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                {r}
              </span>
            ))
          ) : (
            <span className="text-slate-400 dark:text-slate-500">None</span>
          )}
        </div>
      )
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (item) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          item.is_active 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800' 
            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800'
        }`}>
          {item.is_active ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-2">
          {hasPermission('auth', 'edit') && (
            <button
              onClick={() => handleOpenEdit(item)}
              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 font-semibold text-xs bg-blue-50 dark:bg-blue-900/10 px-2 py-1 rounded-md transition-colors"
            >
              Edit
            </button>
          )}
          {hasPermission('auth', 'edit') && (
            <button
              onClick={() => handleToggleStatus(item)}
              className={`font-semibold text-xs px-2 py-1 rounded-md transition-colors ${
                item.is_active 
                  ? 'text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/10' 
                  : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 bg-green-50 dark:bg-green-900/10'
              }`}
            >
              {item.is_active ? 'Deactivate' : 'Activate'}
            </button>
          )}
          <button
            onClick={() => handleOpenActivity(item)}
            className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300 font-semibold text-xs bg-slate-50 dark:bg-slate-900/10 px-2 py-1 rounded-md transition-colors"
          >
            Activity
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-300">
      <PageHeader
        title="User Accounts"
        description="Manage your organization's user accounts, approvals, departments, and roles."
        actions={
          hasPermission('auth', 'create') && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
            >
              Create User
            </button>
          )
        }
      />

      {/* PENDING APPROVALS SECTION */}
      {pendingUsers.length > 0 && (
        <div className="mb-8 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
                <Clock size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Pending Account Approvals
                  <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-slate-950">
                    {pendingUsers.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Self-registered users awaiting admin review and role assignment.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-amber-200/60 dark:divide-amber-900/30">
            {pendingUsers.map((pUser) => (
              <div key={pUser.id} className="py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white text-sm">{pUser.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{pUser.email} &bull; Registered {new Date(pUser.created_at).toLocaleDateString()}</div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Select Role Dropdown */}
                  <select
                    value={selectedPendingRoles[pUser.id] || (roles[0]?.id || '')}
                    onChange={(e) => setSelectedPendingRoles(prev => ({ ...prev, [pUser.id]: e.target.value }))}
                    className="rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 py-1.5 px-3 text-xs text-slate-900 dark:text-white shadow-xs focus:outline-none focus:border-amber-500"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleApprove(pUser.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500 transition-colors shadow-xs"
                  >
                    <CheckCircle size={14} />
                    Approve
                  </button>

                  <button
                    onClick={() => handleReject(pUser.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition-colors shadow-xs"
                  >
                    <XCircle size={14} />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Search Grid */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <SearchBar value={search} onChange={(val) => { setSearch(val); setPage(1); }} placeholder="Search users by name or email..." />
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => { setSelectedDept(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 px-4 text-sm text-slate-900 dark:text-white shadow-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>

          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => { setSelectedRole(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 px-4 text-sm text-slate-900 dark:text-white shadow-sm focus:outline-none focus:border-blue-500"
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
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUser ? 'Edit User Details' : 'Create New User'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              name="name"
              required
              className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              value={formData.name}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              name="email"
              required
              className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              value={formData.email}
              onChange={handleInputChange}
            />
          </div>

          {!editingUser && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
              <input
                type="password"
                name="password"
                required
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                value={formData.password}
                onChange={handleInputChange}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Department</label>
            <select
              name="department_id"
              required
              className="block w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              value={formData.department_id}
              onChange={handleInputChange}
            >
              <option value="" disabled>Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          {/* User Roles Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Assign Roles</label>
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              {roles.map((role) => {
                const isChecked = formData.roles.includes(role.name);
                return (
                  <label key={role.id} className="flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
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
            <div className="flex items-center space-x-2 py-2">
              <input
                type="checkbox"
                name="is_active"
                id="is_active"
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                checked={formData.is_active}
                onChange={handleInputChange}
              />
              <label htmlFor="is_active" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                Account Active
              </label>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Save Details
            </button>
          </div>
        </form>
      </Modal>

      {/* USER ACTIVITY SLIDE-IN DRAWER */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs transition-opacity animate-in fade-in"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      <div className={`fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 transition-transform duration-300 transform ${
        isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Drawer Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">User Activity History</h2>
              {drawerUser && <p className="text-sm text-slate-500 dark:text-slate-400">{drawerUser.name} ({drawerUser.email})</p>}
            </div>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Drawer Body Table */}
          <div className="flex-1 overflow-y-auto p-6">
            <Table
              loading={drawerLoading}
              emptyMessage="No activity recorded for this user."
              columns={[
                { key: 'action', label: 'Action' },
                { key: 'module', label: 'Module' },
                { key: 'record_id', label: 'ID', render: (item) => item.record_id || 'N/A' },
                {
                  key: 'created_at',
                  label: 'Time',
                  render: (item) => new Date(item.created_at).toLocaleString()
                }
              ]}
              data={drawerLogs}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;
