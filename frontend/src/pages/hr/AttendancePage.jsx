import React, { useState, useEffect } from 'react';
import { getEmployees, getAttendance, markAttendance, getAttendanceSummary } from '../../api/hrApi';
import { exportToCSV } from '../../utils/exportCSV';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';

export default function AttendancePage() {
  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selected Month/Year
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-indexed

  // Mark/Edit Attendance State
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [activeEmployee, setActiveEmployee] = useState(null);
  const [activeDate, setActiveDate] = useState('');
  const [markStatus, setMarkStatus] = useState('Present');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');

  // Selected Employee Summary State
  const [summaryEmployee, setSummaryEmployee] = useState(null);
  const [employeeSummaryData, setEmployeeSummaryData] = useState(null);

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedMonth]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      const [empRes, attRes] = await Promise.all([
        getEmployees(),
        getAttendance('', monthStr)
      ]);
      setEmployees(empRes.employees || []);
      setAttendanceRecords(attRes.attendance || []);
    } catch (err) {
      setError('Failed to fetch attendance records.');
    } finally {
      setLoading(false);
    }
  };

  // Helper: Get number of days in selected month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const daysCount = getDaysInMonth(selectedYear, selectedMonth);
  const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);

  // Helper: Find attendance record for an employee and day
  const getRecord = (employeeId, day) => {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return attendanceRecords.find(
      r => r.employee_id === employeeId && r.date.slice(0, 10) === dateStr
    );
  };

  const handleCellClick = (emp, day) => {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const record = getRecord(emp.id, day);

    setActiveEmployee(emp);
    setActiveDate(dateStr);
    setMarkStatus(record ? record.status : 'Present');
    setCheckIn(record ? record.check_in || '' : '');
    setCheckOut(record ? record.check_out || '' : '');
    setShowMarkModal(true);
  };

  const handleSaveAttendance = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await markAttendance({
        employee_id: activeEmployee.id,
        date: activeDate,
        status: markStatus,
        check_in: checkIn || null,
        check_out: checkOut || null
      });
      setSuccess(`Attendance marked for ${activeEmployee.name} on ${activeDate}.`);
      setShowMarkModal(false);
      fetchData();
      if (summaryEmployee && summaryEmployee.id === activeEmployee.id) {
        handleViewSummary(activeEmployee);
      }
    } catch (err) {
      setError('Failed to update attendance.');
    }
  };

  const handleExportCSV = () => {
    if (attendanceRecords.length === 0) return;
    exportToCSV(attendanceRecords.map((r) => ({
      Employee: r.employee_name,
      Code: r.emp_code,
      Date: r.date?.slice(0, 10),
      Status: r.status,
      'Check In': r.check_in || '',
      'Check Out': r.check_out || ''
    })), `attendance-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.csv`);
  };

  const handleViewSummary = async (emp) => {
    setSummaryEmployee(emp);
    try {
      const res = await getAttendanceSummary(emp.id, selectedYear, selectedMonth);
      setEmployeeSummaryData(res.summary);
    } catch (err) {
      setError('Failed to load employee monthly summary.');
    }
  };

  const statusColors = {
    'Present': 'bg-[var(--success-bg)] text-[var(--success-text)] border border-[var(--success-border)]',
    'Absent': 'bg-[var(--danger-bg)] text-[var(--danger-text)] border border-[var(--danger-border)]',
    'Half Day': 'bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]',
    'Leave': 'bg-[var(--info-bg)] text-[var(--info-text)] border border-[var(--info-border)]'
  };

  const statusInitials = {
    'Present': 'P',
    'Absent': 'A',
    'Half Day': 'H',
    'Leave': 'L'
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Employee Attendance"
        description="Monitor working hours, clock-in reports, and log leaves."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportCSV}
              className="btn-secondary"
            >
              Export CSV
            </button>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="field w-auto font-medium"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="field w-auto font-medium"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        }
      />

      {error && <div className="rounded-md border px-3 py-2 text-sm border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]">{error}</div>}
      {success && <div className="rounded-md border px-3 py-2 text-sm border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]">{success}</div>}

      {/* Main Attendance Grid */}
      <div className="sheet overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-text-muted text-sm">Loading attendance data...</div>
        ) : (
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="bom w-full text-left border-collapse text-xs">
              <thead>
                <tr>
                  <th className="p-3 bg-bg-subtle min-w-[160px] sticky left-0 z-20 font-semibold">Employee</th>
                  <th className="p-3 bg-bg-subtle min-w-[80px] border-r border-border-color font-semibold">Code</th>
                  {daysArray.map(day => (
                    <th key={day} className="p-2 text-center min-w-[34px] border-r border-border-color font-semibold">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color">
                {employees.map((emp) => (
                  <tr key={emp.id} className="bom-row text-text-secondary">
                    <td className="p-3 font-semibold text-text-primary sticky left-0 bg-bg-card shadow-sm">
                      <button
                        onClick={() => handleViewSummary(emp)}
                        className="text-left hover:text-accent-primary transition-colors font-medium"
                      >
                        {emp.name}
                      </button>
                    </td>
                    <td className="p-3 border-r border-border-color"><span className="stamp">{emp.emp_code}</span></td>
                    {daysArray.map(day => {
                      const record = getRecord(emp.id, day);
                      const status = record ? record.status : '';
                      return (
                        <td
                          key={day}
                          onClick={() => handleCellClick(emp, day)}
                          className="p-1 text-center border-r border-border-color cursor-pointer hover:bg-bg-hover transition-colors"
                        >
                          {status ? (
                            <span className={`w-6 h-6 inline-flex items-center justify-center rounded text-xs font-semibold ${statusColors[status]}`}>
                              {statusInitials[status]}
                            </span>
                          ) : (
                            <span className="text-text-muted font-mono">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Row Summary Panel */}
      {summaryEmployee && (
        <div className="sheet p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-border-color pb-3">
            <h3 className="text-base font-semibold text-text-primary">
              Monthly Attendance Summary: <span className="text-accent-primary">{summaryEmployee.name}</span>
            </h3>
            <button onClick={() => setSummaryEmployee(null)} className="btn-ghost btn-xs">✕ Close</button>
          </div>
          {employeeSummaryData ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="kpi-card">
                <p className="kpi-label">Total Working Days</p>
                <p className="kpi-value text-text-primary mt-1">{daysCount}</p>
              </div>
              <div className="kpi-card border-l-[3px] border-l-[var(--success-rail)]">
                <p className="kpi-label">Presents (P)</p>
                <p className="kpi-value text-[var(--success-text)] mt-1">{employeeSummaryData.present_count}</p>
              </div>
              <div className="kpi-card border-l-[3px] border-l-[var(--danger-rail)]">
                <p className="kpi-label">Absents (A)</p>
                <p className="kpi-value text-[var(--danger-text)] mt-1">{employeeSummaryData.absent_count}</p>
              </div>
              <div className="kpi-card border-l-[3px] border-l-[var(--warning-rail)]">
                <p className="kpi-label">Half Days (H)</p>
                <p className="kpi-value text-[var(--warning-text)] mt-1">{employeeSummaryData.half_day_count}</p>
              </div>
              <div className="kpi-card border-l-[3px] border-l-[var(--info-rail)]">
                <p className="kpi-label">Leaves / Holidays (L)</p>
                <p className="kpi-value text-accent-primary mt-1">{employeeSummaryData.leave_count}</p>
              </div>
            </div>
          ) : (
            <p className="text-text-muted text-sm">Loading summary...</p>
          )}
        </div>
      )}

      {/* MARK/EDIT MODAL */}
      <Modal
        isOpen={showMarkModal}
        onClose={() => setShowMarkModal(false)}
        title="Mark Attendance Log"
        size="md"
      >
        {activeEmployee && (
          <form onSubmit={handleSaveAttendance} className="space-y-4">
            <div className="p-3 sheet text-xs text-text-secondary">
              <span className="font-semibold text-text-primary">{activeEmployee.name}</span> | Date: <span className="stamp">{activeDate}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Status</label>
              <div className="grid grid-cols-4 gap-2">
                {['Present', 'Absent', 'Half Day', 'Leave'].map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setMarkStatus(st)}
                    className={`py-2 rounded font-semibold transition-all text-xs border ${
                      markStatus === st 
                        ? 'btn-primary' 
                        : 'btn-secondary'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {markStatus !== 'Absent' && markStatus !== 'Leave' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Clock-In Time</label>
                  <input
                    type="time"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="field tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Clock-Out Time</label>
                  <input
                    type="time"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="field tabular-nums"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
              <button
                type="button"
                onClick={() => setShowMarkModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                Save Log
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}