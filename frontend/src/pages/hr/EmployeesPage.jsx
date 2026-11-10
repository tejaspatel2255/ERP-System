import React, { useState, useEffect } from 'react';
import { Users, Calendar } from 'lucide-react';
import { getEmployees, createEmployee, updateEmployee, getAttendance } from '../../api/hrApi';
import { getDepartments, getUsers } from '../../api/userApi';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import Table from '../../components/Table';
import StatusBadge from '../../components/StatusBadge';
import {
  calculateEmployeeLeaves,
  formatLeaveDays,
  ANNUAL_LEAVE_QUOTA
} from '../../utils/leaveCalculator';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
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
      const [empRes, deptRes, usersRes, attRes] = await Promise.all([
        getEmployees(selectedDeptFilter),
        getDepartments(),
        getUsers({ limit: 100 }),
        getAttendance().catch(() => ({ attendance: [] }))
      ]);
      setEmployees(empRes.employees || []);
      setDepartments(deptRes.departments || []);
      setUsersList(usersRes.users || []);
      setAttendanceRecords(attRes.attendance || []);
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

  const getInitials = (n) => {
    if (!n) return 'EM';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return n.slice(0, 2).toUpperCase();
  };

  const columns = [
    {
      key: 'emp_code',
      label: 'Emp Code',
      render: (emp) => <span className="stamp font-mono">{emp.emp_code}</span>
    },
    {
      key: 'name',
      label: 'Employee',
      render: (emp) => (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-[var(--info-bg)] text-[var(--info-text)] font-semibold text-xs grid place-items-center shrink-0">
            {getInitials(emp.name)}
          </div>
          <div>
            <div className="font-semibold text-text-primary leading-tight">{emp.name}</div>
            <div className="text-xs text-text-secondary">{emp.designation}</div>
          </div>
        </div>
      )
    },
    {
      key: 'department_name',
      label: 'Department',
      render: (emp) => <span className="text-text-secondary">{emp.department_name || '—'}</span>
    },
    {
      key: 'leave_balance',
      label: 'Leave Balance',
      render: (emp) => {
        const stats = calculateEmployeeLeaves(attendanceRecords, emp.id);
        const rem = stats.remaining;
        return (
          <div className="space-y-0.5">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
                rem > 10
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : rem > 3
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              }`}
            >
              {formatLeaveDays(rem)} / 20 left
            </span>
            {stats.totalUsed > 0 && (
              <p className="text-[10px] text-text-muted font-mono">
                Used: {formatLeaveDays(stats.totalUsed)}d ({stats.leaveCount} L, {stats.halfDayCount} H)
              </p>
            )}
          </div>
        );
      }
    },
    {
      key: 'user_name',
      label: 'Linked User',
      render: (emp) =>
        emp.user_name ? (
          <StatusBadge status="Active" label={emp.user_name} />
        ) : (
          <StatusBadge status="Draft" label="Unlinked" />
        )
    },
    {
      key: 'email',
      label: 'Email',
      render: (emp) => <span className="text-text-muted text-xs">{emp.email || '—'}</span>
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (emp) => <span className="text-text-muted text-xs tabular-nums font-mono">{emp.phone || '—'}</span>
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (emp) => (
        <button
          onClick={() => handleOpenEdit(emp)}
          className="btn btn-secondary btn-xs"
        >
          Edit / Link
        </button>
      )
    }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Employee Directory"
        description="Manage corporate hierarchy, department roles, and annual leave allocations (Total Quota: 20 Days | L: -1.0 | H: -0.5)."
        actions={
          <button onClick={handleOpenCreate} className="btn btn-primary">
            + Add Employee
          </button>
        }
      />

      {error && (
        <div className="rounded-md border px-3 py-2 text-sm border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border px-3 py-2 text-sm border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]">
          {success}
        </div>
      )}

      <div className="sheet p-3 flex flex-wrap gap-3 items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Department:
          </label>
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="field md:w-56 !py-1 !text-xs"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-text-muted">
          Standard Annual Quota: <strong className="text-text-primary">20 Days</strong> (Deducted via Attendance L [-1.0] and H [-0.5])
        </div>
      </div>

      {employees.length === 0 && !loading ? (
        <EmptyState
          icon={Users}
          title="No Employees Found"
          description="There are currently no employee records matching your filter criteria. Add a new employee to get started."
          actionLabel="Add Employee"
          onAction={handleOpenCreate}
        />
      ) : (
        <Table
          columns={columns}
          data={employees}
          loading={loading}
          emptyMessage="No employees found."
        />
      )}

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
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Emp Code *
              </label>
              <input
                type="text"
                value={empCode}
                onChange={(e) => setEmpCode(e.target.value)}
                className="field font-mono"
                required
                disabled={!!editingEmp}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="field"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field"
                placeholder="name@company.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="field tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="field"
              >
                <option value="">-- Choose Dept --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Designation *
              </label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="field"
                required
              />
            </div>
          </div>

          {/* User Account Linkage Selection */}
          <div className="sheet p-3 space-y-2">
            <label className="block text-text-primary font-semibold text-xs">
              Link User Account
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="field"
            >
              <option value="">-- No Linked User Account (Standalone Profile) --</option>
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
            <p className="text-xs text-text-muted leading-tight">
              Linking a User Account grants this employee access to Self-Service features (leave applications & clock logs).
            </p>
          </div>

          {/* Leave Quota Standard Info */}
          <div className="p-3 rounded-lg border border-border-color bg-bg-subtle text-xs space-y-1">
            <div className="font-semibold text-text-primary flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-accent-primary" />
              <span>Standard Leave Entitlement: 20 Days</span>
            </div>
            <p className="text-text-muted leading-relaxed">
              Every employee receives 20 annual leaves. Attendance marked as <strong>Leave (L)</strong> deducts 1.0 day; <strong>Half Day (H)</strong> deducts 0.5 day from this balance automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Joining Date *
              </label>
              <input
                type="date"
                value={joinDate}
                onChange={(e) => setJoinDate(e.target.value)}
                className="field"
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
                  className="rounded"
                />
                <label
                  htmlFor="is-active"
                  className="text-text-primary font-medium text-xs cursor-pointer"
                >
                  Active Profile
                </label>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Employee
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
