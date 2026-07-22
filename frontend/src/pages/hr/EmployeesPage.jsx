import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { getEmployees, createEmployee, updateEmployee } from '../../api/hrApi';
import { getDepartments, getUsers } from '../../api/userApi';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';

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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Employee Directory</h2>
          <p className="text-text-secondary text-sm mt-1">Manage corporate hierarchy, department roles, and user account linkages.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-accent-primary hover:opacity-90 text-white font-medium py-2 px-4 rounded-xl shadow-sm transition-all flex items-center gap-2 text-sm"
        >
          <span>+</span> Add Employee
        </button>
      </div>

      {error && <div className="p-3 bg-accent-danger/10 border border-accent-danger/30 rounded-xl text-accent-danger text-sm">{error}</div>}
      {success && <div className="p-3 bg-accent-success/10 border border-accent-success/30 rounded-xl text-accent-success text-sm">{success}</div>}

      <div className="flex gap-4 items-center bg-bg-card border border-border-color rounded-2xl p-4 shadow-brand">
        <label className="text-xs font-bold uppercase tracking-wider text-text-muted">Department Filter:</label>
        <select
          value={selectedDeptFilter}
          onChange={(e) => setSelectedDeptFilter(e.target.value)}
          className="bg-bg-secondary border border-border-color rounded-xl py-2 px-3 text-text-primary text-sm focus:outline-none"
        >
          <option value="">All Departments</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="p-12 text-center text-text-muted bg-bg-card border border-border-color rounded-2xl">Loading directory...</div>
      ) : employees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Employees Found"
          description="There are currently no employee records matching your filter criteria. Add a new employee to get started."
          actionLabel="Add Employee"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="bg-bg-card border border-border-color rounded-2xl overflow-hidden shadow-brand">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-color bg-bg-secondary text-text-muted font-semibold text-xs uppercase tracking-wider">
                  <th className="p-4">Emp Code</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Designation</th>
                  <th className="p-4">Linked User</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color text-sm">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-bg-hover text-text-primary transition-colors">
                    <td className="p-4 font-mono text-accent-primary font-medium">{emp.emp_code}</td>
                    <td className="p-4 font-semibold text-text-primary">{emp.name}</td>
                    <td className="p-4 text-text-secondary">{emp.department_name || '—'}</td>
                    <td className="p-4 text-text-primary">{emp.designation}</td>
                    <td className="p-4">
                      {emp.user_name ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-accent-success border border-accent-success/20">
                          {emp.user_name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-accent-warning border border-accent-warning/20">
                          Unlinked
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-text-muted text-sm">{emp.email || '—'}</td>
                    <td className="p-4 text-text-muted text-sm">{emp.phone || '—'}</td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleOpenEdit(emp)}
                        className="px-3 py-1 bg-bg-secondary hover:bg-bg-hover border border-border-color rounded-lg text-xs font-semibold text-text-primary transition-all"
                      >
                        Edit / Link
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE/EDIT MODAL */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingEmp ? 'Edit Employee Details' : 'Add New Employee'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-text-secondary font-semibold mb-1 text-xs">Emp Code *</label>
              <input
                type="text"
                value={empCode}
                onChange={(e) => setEmpCode(e.target.value)}
                className="w-full bg-bg-secondary border border-border-color rounded-xl p-2.5 text-text-primary font-mono text-sm focus:outline-none"
                required
                disabled={!!editingEmp}
              />
            </div>
            <div>
              <label className="block text-text-secondary font-semibold mb-1 text-xs">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-bg-secondary border border-border-color rounded-xl p-2.5 text-text-primary text-sm focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-text-secondary font-semibold mb-1 text-xs">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-bg-secondary border border-border-color rounded-xl p-2.5 text-text-primary text-sm focus:outline-none"
                placeholder="name@company.com"
              />
            </div>
            <div>
              <label className="block text-text-secondary font-semibold mb-1 text-xs">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-bg-secondary border border-border-color rounded-xl p-2.5 text-text-primary text-sm focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-text-secondary font-semibold mb-1 text-xs">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full bg-bg-secondary border border-border-color rounded-xl p-2.5 text-text-primary text-sm focus:outline-none"
              >
                <option value="">-- Choose Dept --</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-text-secondary font-semibold mb-1 text-xs">Designation *</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full bg-bg-secondary border border-border-color rounded-xl p-2.5 text-text-primary text-sm focus:outline-none"
                required
              />
            </div>
          </div>

          {/* User Account Linkage Selection */}
          <div className="rounded-xl border border-border-color bg-bg-secondary/60 p-3.5 space-y-2">
            <label className="block text-text-primary font-bold text-xs uppercase tracking-wider">
              Link User Account
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full bg-bg-card border border-border-color rounded-xl p-2.5 text-text-primary text-sm focus:outline-none"
            >
              <option value="">-- No Linked User Account (Standalone Profile) --</option>
              {usersList.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-text-muted leading-tight">
              Linking a User Account grants this employee access to Self-Service features (leave applications & clock logs).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-text-secondary font-semibold mb-1 text-xs">Joining Date *</label>
              <input
                type="date"
                value={joinDate}
                onChange={(e) => setJoinDate(e.target.value)}
                className="w-full bg-bg-secondary border border-border-color rounded-xl p-2.5 text-text-primary text-sm focus:outline-none"
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
                  className="w-4 h-4 rounded border-border-color text-accent-primary"
                />
                <label htmlFor="is-active" className="text-text-primary font-semibold text-xs">Is Active Profile</label>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-bg-secondary border border-border-color hover:bg-bg-hover rounded-xl text-text-secondary text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-accent-primary hover:opacity-90 rounded-xl text-white font-semibold text-sm shadow-sm"
            >
              Save Employee
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
