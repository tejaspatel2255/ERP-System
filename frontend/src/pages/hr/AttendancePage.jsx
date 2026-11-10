import React, { useState, useEffect, useMemo } from 'react';
import { getEmployees, getAttendance, markAttendance, getAttendanceSummary } from '../../api/hrApi';
import { exportToCSV } from '../../utils/exportCSV';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import { calculateEmployeeLeaves, formatLeaveDays, ANNUAL_LEAVE_QUOTA } from '../../utils/leaveCalculator';
import { Calendar, User, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AttendancePage() {
  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState([]);
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
  const [currentDayRecord, setCurrentDayRecord] = useState(null);
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
      const [empRes, attRes, allAttRes] = await Promise.all([
        getEmployees(),
        getAttendance('', monthStr),
        getAttendance().catch(() => ({ attendance: [] }))
      ]);
      setEmployees(empRes.employees || []);
      setAttendanceRecords(attRes.attendance || []);
      setAllAttendanceRecords(allAttRes.attendance || attRes.attendance || []);
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
      (r) => r.employee_id === employeeId && r.date?.slice(0, 10) === dateStr
    );
  };

  // Calculate annual leave stats for any employee
  const getEmployeeLeaveStats = (empId) => {
    const records = allAttendanceRecords.length > 0 ? allAttendanceRecords : attendanceRecords;
    return calculateEmployeeLeaves(records, empId);
  };

  const handleCellClick = (emp, day) => {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const record = getRecord(emp.id, day);

    setActiveEmployee(emp);
    setActiveDate(dateStr);
    setCurrentDayRecord(record || null);
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

      const leaveDeductionMsg =
        markStatus === 'Leave'
          ? ' (-1.0 leave deducted from total 20)'
          : markStatus === 'Half Day'
          ? ' (-0.5 leave deducted from total 20)'
          : '';

      setSuccess(`Attendance marked as ${markStatus} for ${activeEmployee.name} on ${activeDate}${leaveDeductionMsg}.`);
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
    exportToCSV(
      attendanceRecords.map((r) => ({
        Employee: r.employee_name,
        Code: r.emp_code,
        Date: r.date?.slice(0, 10),
        Status: r.status,
        'Leave Deduction': r.status === 'Leave' ? '1.0' : r.status === 'Half Day' ? '0.5' : '0',
        'Check In': r.check_in || '',
        'Check Out': r.check_out || ''
      })),
      `attendance-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.csv`
    );
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
    Present: 'bg-[var(--success-bg)] text-[var(--success-text)] border border-[var(--success-border)]',
    Absent: 'bg-[var(--danger-bg)] text-[var(--danger-text)] border border-[var(--danger-border)]',
    'Half Day': 'bg-amber-500/15 text-amber-500 border border-amber-500/30',
    Leave: 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
  };

  const statusInitials = {
    Present: 'P',
    Absent: 'A',
    'Half Day': 'H',
    Leave: 'L'
  };

  // Projected leave calculation in modal
  const activeEmpLeaveStats = useMemo(() => {
    if (!activeEmployee) return { quota: 20, used: 0, remaining: 20 };
    return getEmployeeLeaveStats(activeEmployee.id);
  }, [activeEmployee, allAttendanceRecords, attendanceRecords]);

  const projectedCalculation = useMemo(() => {
    if (!activeEmployee) return { projectedRemaining: 20, diff: 0 };
    const oldStatus = currentDayRecord ? currentDayRecord.status : '';
    const oldDeduction = oldStatus === 'Leave' ? 1.0 : oldStatus === 'Half Day' ? 0.5 : 0;
    const newDeduction = markStatus === 'Leave' ? 1.0 : markStatus === 'Half Day' ? 0.5 : 0;
    const diff = newDeduction - oldDeduction;
    const projectedRemaining = Math.max(0, activeEmpLeaveStats.remaining - diff);
    return { projectedRemaining, diff };
  }, [activeEmployee, currentDayRecord, markStatus, activeEmpLeaveStats]);

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Employee Attendance"
        description="Monitor daily clock logs, attendance records, and automatic leave balance deductions (Total Quota: 20 | L: -1.0 | H: -0.5)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handleExportCSV} className="btn btn-secondary btn-sm">
              Export CSV
            </button>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="field !py-1 !text-xs w-auto font-medium"
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
              className="field !py-1 !text-xs w-auto font-medium"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
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

      {/* Leave Rule Legend Ribbon */}
      <div className="sheet p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-text-primary">Annual Leave Rules:</span>
          <span className="stamp font-mono">Total Quota: 20 Days</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] bg-rose-500/15 text-rose-500 border border-rose-500/30">
              L
            </span>
            <span className="text-text-secondary">Full Leave = <strong>-1.0 Day</strong></span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] bg-amber-500/15 text-amber-500 border border-amber-500/30">
              H
            </span>
            <span className="text-text-secondary">Half Day = <strong>-0.5 Day</strong></span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] bg-[var(--success-bg)] text-[var(--success-text)] border border-[var(--success-border)]">
              P
            </span>
            <span className="text-text-secondary">Present = 0 deduction</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] bg-[var(--danger-bg)] text-[var(--danger-text)] border border-[var(--danger-border)]">
              A
            </span>
            <span className="text-text-secondary">Absent = Unscheduled</span>
          </span>
        </div>
      </div>

      {/* Main Attendance Grid */}
      <div className="sheet overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-text-muted text-sm">Loading attendance data...</div>
        ) : (
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="bom w-full text-left border-collapse text-xs">
              <thead>
                <tr>
                  <th className="p-3 bg-bg-subtle min-w-[170px] sticky left-0 z-20 font-semibold border-r border-border-color">
                    Employee
                  </th>
                  <th className="p-3 bg-bg-subtle min-w-[90px] border-r border-border-color font-semibold">
                    Code
                  </th>
                  <th className="p-2 text-center min-w-[130px] bg-bg-subtle border-r border-border-color font-semibold">
                    Leave Balance
                    <span className="block text-[10px] font-normal text-text-muted">Quota: 20 Days</span>
                  </th>
                  <th className="p-2 text-center min-w-[80px] bg-bg-subtle border-r border-border-color font-semibold">
                    L (-1.0)
                  </th>
                  <th className="p-2 text-center min-w-[80px] bg-bg-subtle border-r border-border-color font-semibold">
                    H (-0.5)
                  </th>
                  {daysArray.map((day) => (
                    <th
                      key={day}
                      className="p-2 text-center min-w-[34px] border-r border-border-color font-semibold"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color">
                {employees.map((emp) => {
                  const leaveStats = getEmployeeLeaveStats(emp.id);
                  const remainingLeaves = leaveStats.remaining;

                  return (
                    <tr key={emp.id} className="bom-row text-text-secondary">
                      <td className="p-3 font-semibold text-text-primary sticky left-0 bg-bg-card shadow-sm border-r border-border-color">
                        <button
                          onClick={() => handleViewSummary(emp)}
                          className="text-left hover:text-accent-primary transition-colors font-medium flex items-center gap-1.5"
                        >
                          <User className="w-3.5 h-3.5 text-text-muted" />
                          <span>{emp.name}</span>
                        </button>
                      </td>
                      <td className="p-3 border-r border-border-color">
                        <span className="stamp font-mono">{emp.emp_code}</span>
                      </td>
                      {/* Leave Balance Column */}
                      <td className="p-2 border-r border-border-color text-center font-mono">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            remainingLeaves > 10
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : remainingLeaves > 4
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {formatLeaveDays(remainingLeaves)} / 20 left
                        </span>
                      </td>
                      {/* Full Leaves Count */}
                      <td className="p-2 border-r border-border-color text-center font-mono font-semibold text-rose-500">
                        {leaveStats.leaveCount > 0 ? `${leaveStats.leaveCount} d` : '—'}
                      </td>
                      {/* Half Days Count */}
                      <td className="p-2 border-r border-border-color text-center font-mono font-semibold text-amber-500">
                        {leaveStats.halfDayCount > 0
                          ? `${leaveStats.halfDayCount} (${formatLeaveDays(leaveStats.halfDayCount * 0.5)}d)`
                          : '—'}
                      </td>
                      {/* Month Days */}
                      {daysArray.map((day) => {
                        const record = getRecord(emp.id, day);
                        const status = record ? record.status : '';
                        return (
                          <td
                            key={day}
                            onClick={() => handleCellClick(emp, day)}
                            className="p-1 text-center border-r border-border-color cursor-pointer hover:bg-bg-hover transition-colors"
                            title={
                              status
                                ? `${emp.name} - Day ${day}: ${status} ${
                                    status === 'Leave'
                                      ? '(-1.0 leave)'
                                      : status === 'Half Day'
                                      ? '(-0.5 leave)'
                                      : ''
                                  }`
                                : `Click to log attendance for Day ${day}`
                            }
                          >
                            {status ? (
                              <span
                                className={`w-6 h-6 inline-flex items-center justify-center rounded text-xs font-semibold ${statusColors[status]}`}
                              >
                                {statusInitials[status]}
                              </span>
                            ) : (
                              <span className="text-text-muted font-mono opacity-40">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Row Summary Panel */}
      {summaryEmployee && (
        <div className="sheet p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-border-color pb-3">
            <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Calendar className="w-4 h-4 text-accent-primary" />
              <span>Monthly Attendance & Leave Summary:</span>
              <span className="text-accent-primary font-bold">{summaryEmployee.name}</span>
            </h3>
            <button onClick={() => setSummaryEmployee(null)} className="btn btn-ghost btn-xs">
              ✕ Close
            </button>
          </div>
          {(() => {
            const leaveStats = getEmployeeLeaveStats(summaryEmployee.id);
            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <div className="kpi-card">
                  <p className="kpi-label">Days in Month</p>
                  <p className="kpi-value text-text-primary mt-1">{daysCount}</p>
                </div>
                <div className="kpi-card border-l-[3px] border-l-[var(--success-rail)]">
                  <p className="kpi-label">Presents (P)</p>
                  <p className="kpi-value text-[var(--success-text)] mt-1">
                    {employeeSummaryData?.present_count ?? 0}
                  </p>
                </div>
                <div className="kpi-card border-l-[3px] border-l-[var(--danger-rail)]">
                  <p className="kpi-label">Absents (A)</p>
                  <p className="kpi-value text-[var(--danger-text)] mt-1">
                    {employeeSummaryData?.absent_count ?? 0}
                  </p>
                </div>
                <div className="kpi-card border-l-[3px] border-l-amber-500">
                  <p className="kpi-label">Half Days (H: -0.5)</p>
                  <p className="kpi-value text-amber-500 mt-1">
                    {leaveStats.halfDayCount}{' '}
                    <span className="text-xs font-normal text-text-muted">
                      (-{formatLeaveDays(leaveStats.halfDayCount * 0.5)} d)
                    </span>
                  </p>
                </div>
                <div className="kpi-card border-l-[3px] border-l-rose-500">
                  <p className="kpi-label">Leaves (L: -1.0)</p>
                  <p className="kpi-value text-rose-500 mt-1">
                    {leaveStats.leaveCount}{' '}
                    <span className="text-xs font-normal text-text-muted">
                      (-{formatLeaveDays(leaveStats.leaveCount * 1.0)} d)
                    </span>
                  </p>
                </div>
                <div className="kpi-card border-l-[3px] border-l-emerald-500 bg-bg-hover">
                  <p className="kpi-label">Remaining Leaves</p>
                  <p className="kpi-value text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                    {formatLeaveDays(leaveStats.remaining)}{' '}
                    <span className="text-xs font-normal text-text-muted">/ 20</span>
                  </p>
                </div>
              </div>
            );
          })()}
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
            <div className="p-3 sheet text-xs text-text-secondary flex flex-wrap justify-between items-center gap-2">
              <div>
                <span className="font-semibold text-text-primary text-sm">{activeEmployee.name}</span>
                <span className="text-text-muted ml-2 font-mono">({activeEmployee.emp_code})</span>
                <span className="mx-2">•</span>
                Date: <span className="stamp font-mono font-bold">{activeDate}</span>
              </div>
              <div className="text-right">
                <span className="text-text-muted">Current Leave Balance: </span>
                <strong className="text-accent-primary font-mono text-sm">
                  {formatLeaveDays(activeEmpLeaveStats.remaining)} / 20 Days
                </strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Select Attendance Status
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setMarkStatus('Present')}
                  className={`p-2.5 rounded text-left transition-all border ${
                    markStatus === 'Present'
                      ? 'btn btn-primary shadow-sm ring-2 ring-accent-primary/20'
                      : 'btn btn-secondary'
                  }`}
                >
                  <div className="font-bold text-xs">Present (P)</div>
                  <div className="text-[10px] opacity-80 mt-0.5">Full day · 0 leave</div>
                </button>

                <button
                  type="button"
                  onClick={() => setMarkStatus('Absent')}
                  className={`p-2.5 rounded text-left transition-all border ${
                    markStatus === 'Absent'
                      ? 'bg-slate-700 text-white border-slate-800 ring-2 ring-slate-500/20'
                      : 'btn btn-secondary'
                  }`}
                >
                  <div className="font-bold text-xs">Absent (A)</div>
                  <div className="text-[10px] opacity-80 mt-0.5">Unscheduled</div>
                </button>

                <button
                  type="button"
                  onClick={() => setMarkStatus('Half Day')}
                  className={`p-2.5 rounded text-left transition-all border ${
                    markStatus === 'Half Day'
                      ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-500/20'
                      : 'btn btn-secondary'
                  }`}
                >
                  <div className="font-bold text-xs">Half Day (H)</div>
                  <div className="text-[10px] font-semibold text-amber-200 mt-0.5">-0.5 Leave</div>
                </button>

                <button
                  type="button"
                  onClick={() => setMarkStatus('Leave')}
                  className={`p-2.5 rounded text-left transition-all border ${
                    markStatus === 'Leave'
                      ? 'bg-rose-600 text-white border-rose-700 ring-2 ring-rose-600/20'
                      : 'btn btn-secondary'
                  }`}
                >
                  <div className="font-bold text-xs">Leave (L)</div>
                  <div className="text-[10px] font-semibold text-rose-200 mt-0.5">-1.0 Leave</div>
                </button>
              </div>
            </div>

            {/* Projected Impact Preview */}
            <div className="p-3 rounded-lg border border-border-color bg-bg-subtle text-xs flex justify-between items-center">
              <span className="text-text-secondary flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-accent-primary" />
                <span>Projected Leave Balance after save:</span>
              </span>
              <span className="font-mono font-bold text-sm text-text-primary">
                {formatLeaveDays(projectedCalculation.projectedRemaining)} / 20 Days
                {projectedCalculation.diff !== 0 && (
                  <span
                    className={`ml-2 text-xs font-semibold ${
                      projectedCalculation.diff > 0 ? 'text-rose-500' : 'text-emerald-500'
                    }`}
                  >
                    ({projectedCalculation.diff > 0 ? `-${projectedCalculation.diff}` : `+${Math.abs(projectedCalculation.diff)}`} d)
                  </span>
                )}
              </span>
            </div>

            {markStatus !== 'Absent' && markStatus !== 'Leave' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                    Clock-In Time
                  </label>
                  <input
                    type="time"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="field tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                    Clock-Out Time
                  </label>
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
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Log
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
