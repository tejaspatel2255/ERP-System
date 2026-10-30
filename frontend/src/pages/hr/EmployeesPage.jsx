import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { getEmployees, createEmployee, updateEmployee } from '../../api/hrApi';
import { getDepartments, getUsers } from '../../api/userApi';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import Table from '../../components/Table';
import StatusBadge from '../../components/StatusBadge';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [empCode, setEmpCode] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [designation, setDesignation] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    fetchData();
  }, [selectedDeptFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, deptRes, usersRes] = await Promise.all([
        getEmployees(selectedDeptFilter),
        getDepartments(),
        getUsers({ limit: 100 })
      ]);
      setEmployees(empRes.employees || []);
      setDepartments(deptRes.departments || []);
      setUsersList(usersRes.users || []);
    } catch (err) {
      setError('Failed to load employee directory.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingEmp(null);
    setName('');
    setEmpCode(`EMP-${String(Date.now()).slice(-5)}`);
    setEmail('');
    setPhone('');
    setDepartmentId('');
    setDesignation('');
    setJoinDate(new Date().toISOString().slice(0, 10));
    setIsActive(true);
    setUserId('');
    setShowModal(true);
  };

  const handleOpenEdit = (emp) => {
    setEditingEmp(emp);
    setName(emp.name);
    setEmpCode(emp.emp_code);
    setEmail(emp.email || '');
    setPhone(emp.phone || '');
    setDepartmentId(emp.department_id || '');
    setDesignation(emp.designation);
    setJoinDate(new Date(emp.join_date).toISOString().slice(0, 10));
    setIsActive(emp.is_active);
    setUserId(emp.user_id || '');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const payload = {
      name,
      emp_code: empCode,
      email,
      phone,
      department_id: departmentId || null,
      designation,
      join_date: joinDate,
      is_active: isActive,
      user_id: userId || null
    };

    try {
      if (editingEmp) {
        await updateEmployee(editingEmp.id, payload);
        setSuccess('Employee updated & user linkage saved successfully.');
      } else {
        await createEmployee(payload);
        setSuccess('Employee created successfully.');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save employee profile.');
    }
  };

  const columns = [
    {
      key: 'emp_code',
      label: 'Emp Code',
      render: (emp) => <span className="font-mono text-accent-primary font-bold">{emp.emp_code}</span>
    },
    {
      key: 'name',
      label: 'Name',
      render: (emp) => <span className="font-semibold text-text-primary">{emp.name}</span>
    },
    {
      key: 'department_name',
      label: 'Department',
      render: (emp) => <span className="text-text-secondary">{emp.department_name || '—'}</span>
    },
    {
      key: 'designation',
      label: 'Designation',
      render: (emp) => <span className="text-text-primary font-medium">{emp.designation}</span>
    },
    {
      key: 'user_name',
      label: 'Linked User',
      render: (emp) => emp.user_name ? (
        <span className="font-mono text-xs text-accent-success font-semibold">
          @{emp.user_name}
        </span>
      ) : (
        <span className="text-[10px] font-mono uppercase text-text-muted">Unlinked</span>
      )
    },
    {
      key: 'email',
      label: 'Email',
      render: (emp) => <span className="text-text-muted text-xs font-mono">{emp.email || '—'}</span>
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (emp) => <span className="text-text-muted text-xs font-mono">{emp.phone || '—'}</span>
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (emp) => <StatusBadge status={emp.is_active ? 'Active' : 'Inactive'} />
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (emp) => (
        <button
          onClick={() => handleOpenEdit(emp)}
          className="btn btn-secondary text-xs py-1 px-2.5"
        >
          Edit / Link
        </button>
      )
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 font-sans">
      <PageHeader
        title="Employee Directory"
        description="Manage corporate hierarchy, department roles, and user account linkages."
        actions={
          <button
            onClick={handleOpenCreate}
            className="btn btn-primary text-xs uppercase tracking-wider font-mono"
          >
            + Add Employee
          </button>
        }
      />

      {error && <div className="p-3 bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-xs font-mono">{error}</div>}
      {success && <div className="p-3 bg-accent-success/10 border border-accent-success/30 text-accent-success text-xs font-mono">{success}</div>}

      <div className="flex gap-4 items-center bg-bg-surface border border-border-color rounded-xs p-3 font-mono text-xs">
        <label className="font-bold uppercase tracking-wider text-text-muted">Department Filter:</label>
        <select
          value={selectedDeptFilter}
          onChange={(e) => setSelectedDeptFilter(e.target.value)}
          className="field text-xs py-1 px-2.5"
        >
          <option value="">All Departments</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div className="sheet">
        {employees.length === 0 && !loading ? (
          <EmptyState
            icon={Users}
            title="No Employees Found"
            description="There are currently no employee records matching your filter criteria. Add a new employee to get started."
            actionLabel="Add Employee"
            onAction={handleOpenCreate}
          />
        ) : (
          <Table columns={columns} data={employees} loading={loading} emptyMessage="No employees found." />
        )}
      </div>

      {/* CREATE/EDIT MODAL */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingEmp ? 'Edit Employee Details' : 'Add New Employee'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Emp Code *</label>
              <input
                type="text"
                value={empCode}
                onChange={(e) => setEmpCode(e.target.value)}
                className="field w-full font-mono"
                required
                disabled={!!editingEmp}
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="field w-full"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field w-full"
                placeholder="name@company.com"
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="field w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="field w-full"
              >
                <option value="">-- Choose Dept --</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Designation *</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="field w-full"
                required
              />
            </div>
          </div>

          {/* User Account Linkage Selection */}
          <div className="rounded-xs border border-border-color bg-bg-surface p-3.5 space-y-2">
            <label className="block text-text-primary font-mono font-bold text-xs uppercase tracking-wider">
              Link User Account
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="field w-full"
            >
              <option value="">-- No Linked User Account (Standalone Profile) --</option>
              {usersList.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-text-muted leading-tight font-mono">
              Linking a User Account grants this employee access to Self-Service features (leave applications & clock logs).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Joining Date *</label>
              <input
                type="date"
                value={joinDate}
                onChange={(e) => setJoinDate(e.target.value)}
                className="field w-full"
                required
              />
            </div>
            {editingEmp && (
              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  id="is-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded-xs border-border-color text-accent-primary"
                />
                <label htmlFor="is-active" className="text-text-primary font-mono text-xs cursor-pointer font-bold uppercase tracking-wider">Is Active Profile</label>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary text-xs"
            >
              Save Employee
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
