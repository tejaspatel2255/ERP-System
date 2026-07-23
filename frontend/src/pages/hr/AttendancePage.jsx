import React, { useState, useEffect } from 'react';
import { CalendarCheck } from 'lucide-react';
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
    'Present': 'bg-accent-success/15 text-accent-success border border-accent-success/30',
    'Absent': 'bg-accent-danger/15 text-accent-danger border border-accent-danger/30',
    'Half Day': 'bg-accent-warning/15 text-accent-warning border border-accent-warning/30',
    'Leave': 'bg-accent-info/15 text-accent-info border border-accent-info/30'
  };

  const statusInitials = {
    'Present': 'P',
    'Absent': 'A',
    'Half Day': 'H',
    'Leave': 'L'
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-300">
      <PageHeader
        title="Employee Attendance"
        description="Monitor working hours, clock-in reports, and log leaves."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center justify-center rounded-xl bg-bg-card border border-border-color px-4 py-2 text-sm font-semibold text-text-primary shadow-brand hover:bg-bg-hover transition-colors"
            >
              Export CSV
            </button>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-bg-card border border-border-color rounded-xl py-2 px-3 text-text-primary text-sm font-semibold focus:outline-none focus:border-accent-primary"
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
              className="bg-bg-card border border-border-color rounded-xl py-2 px-3 text-text-primary text-sm font-semibold focus:outline-none focus:border-accent-primary"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        }
      />

      {error && <div className="mb-6 p-4 bg-accent-danger/10 border border-accent-danger/30 rounded-2xl text-accent-danger text-sm">{error}</div>}
      {success && <div className="mb-6 p-4 bg-accent-success/10 border border-accent-success/30 rounded-2xl text-accent-success text-sm">{success}</div>}

      {/* Main Attendance Grid */}
      <div className="bg-bg-card border border-border-color rounded-2xl overflow-hidden shadow-brand mb-6">
        {loading ? (
          <div className="p-12 text-center text-text-muted text-sm">Loading attendance data...</div>
        ) : (
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-color bg-bg-secondary text-text-muted font-semibold sticky top-0 z-10 uppercase tracking-wider">
                  <th className="p-3 bg-bg-secondary min-w-[160px] sticky left-0 z-20">Employee</th>
                  <th className="p-3 bg-bg-secondary min-w-[80px] border-r border-border-color">Code</th>
                  {daysArray.map(day => (
                    <th key={day} className="p-2 text-center min-w-[34px] border-r border-border-color">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-bg-hover text-text-secondary transition-colors">
                    <td className="p-3 font-semibold text-text-primary sticky left-0 bg-bg-card shadow-sm">
                      <button
                        onClick={() => handleViewSummary(emp)}
                        className="text-left hover:text-accent-primary transition-colors font-bold"
                      >
                        {emp.name}
                      </button>
                    </td>
                    <td className="p-3 font-mono text-accent-primary border-r border-border-color">{emp.emp_code}</td>
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
                            <span className={`w-6 h-6 inline-flex items-center justify-center rounded-md text-[10px] font-extrabold ${statusColors[status]}`}>
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
        <div className="bg-bg-card border border-border-color rounded-2xl p-6 shadow-brand space-y-4">
          <div className="flex justify-between items-center border-b border-border-color pb-3">
            <h3 className="text-base font-bold text-text-primary">
              Monthly Attendance Summary: <span className="text-accent-primary">{summaryEmployee.name}</span>
            </h3>
            <button onClick={() => setSummaryEmployee(null)} className="text-text-muted hover:text-text-primary font-bold text-sm">✕ Close</button>
          </div>
          {employeeSummaryData ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-bg-secondary p-4 rounded-xl border border-border-color">
                <p className="text-xs text-text-muted">Total Working Days</p>
                <p className="text-2xl font-bold text-text-primary mt-1">{daysCount}</p>
              </div>
              <div className="bg-bg-secondary p-4 rounded-xl border border-border-color border-l-4 border-l-accent-success">
                <p className="text-xs text-text-muted">Presents (P)</p>
                <p className="text-2xl font-bold text-accent-success mt-1">{employeeSummaryData.present_count}</p>
              </div>
              <div className="bg-bg-secondary p-4 rounded-xl border border-border-color border-l-4 border-l-accent-danger">
                <p className="text-xs text-text-muted">Absents (A)</p>
                <p className="text-2xl font-bold text-accent-danger mt-1">{employeeSummaryData.absent_count}</p>
              </div>
              <div className="bg-bg-secondary p-4 rounded-xl border border-border-color border-l-4 border-l-accent-warning">
                <p className="text-xs text-text-muted">Half Days (H)</p>
                <p className="text-2xl font-bold text-accent-warning mt-1">{employeeSummaryData.half_day_count}</p>
              </div>
              <div className="bg-bg-secondary p-4 rounded-xl border border-border-color border-l-4 border-l-accent-info">
                <p className="text-xs text-text-muted">Leaves / Holidays (L)</p>
                <p className="text-2xl font-bold text-accent-info mt-1">{employeeSummaryData.leave_count}</p>
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
            <div className="p-3 bg-bg-secondary border border-border-color rounded-xl text-xs text-text-secondary">
              <span className="font-bold text-text-primary">{activeEmployee.name}</span> | Date: <span className="font-mono">{activeDate}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-2">Status</label>
              <div className="grid grid-cols-4 gap-2">
                {['Present', 'Absent', 'Half Day', 'Leave'].map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setMarkStatus(st)}
                    className={`py-2 rounded-xl font-bold transition-all text-xs border ${
                      markStatus === st 
                        ? 'bg-accent-primary text-white border-accent-primary shadow-sm' 
                        : 'bg-bg-secondary text-text-secondary border-border-color hover:bg-bg-hover'
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
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Clock-In Time</label>
                  <input
                    type="time"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full bg-bg-secondary border border-border-color rounded-xl p-2.5 text-text-primary text-xs font-mono focus:outline-none focus:border-accent-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Clock-Out Time</label>
                  <input
                    type="time"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full bg-bg-secondary border border-border-color rounded-xl p-2.5 text-text-primary text-xs font-mono focus:outline-none focus:border-accent-primary"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-border-color">
              <button
                type="button"
                onClick={() => setShowMarkModal(false)}
                className="px-4 py-2 bg-bg-secondary border border-border-color hover:bg-bg-hover rounded-xl text-text-secondary text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-accent-primary hover:opacity-90 rounded-xl text-white font-semibold text-sm shadow-sm"
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
