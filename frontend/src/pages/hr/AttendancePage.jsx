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

  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const daysCount = getDaysInMonth(selectedYear, selectedMonth);
  const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);

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
    'Present': 'bg-accent-success/20 text-accent-success border border-accent-success/30 font-bold',
    'Absent': 'bg-accent-danger/20 text-accent-danger border border-accent-danger/30 font-bold',
    'Half Day': 'bg-accent-warning/20 text-accent-warning border border-accent-warning/30 font-bold',
    'Leave': 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30 font-bold'
  };

  const statusInitials = {
    'Present': 'P',
    'Absent': 'A',
    'Half Day': 'H',
    'Leave': 'L'
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 font-sans">
      <PageHeader
        title="Employee Attendance"
        description="Monitor shift working hours, presence registers, and clock logs."
        actions={
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={handleExportCSV}
              className="btn btn-secondary text-xs font-mono"
            >
              Export CSV
            </button>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="field text-xs py-1 px-2.5 font-mono"
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
              className="field text-xs py-1 px-2.5 font-mono"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        }
      />

      {error && <div className="p-3 bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-xs font-mono">{error}</div>}
      {success && <div className="p-3 bg-accent-success/10 border border-accent-success/30 text-accent-success text-xs font-mono">{success}</div>}

      {/* Main Attendance Sheet Grid */}
      <div className="sheet overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-text-muted text-xs font-mono">Loading attendance data...</div>
        ) : (
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-color bg-bg-surface text-text-muted font-mono font-bold uppercase tracking-wider sticky top-0 z-10">
                  <th className="p-2.5 bg-bg-surface min-w-[160px] sticky left-0 z-20">Employee</th>
                  <th className="p-2.5 bg-bg-surface min-w-[80px] border-r border-border-color">Code</th>
                  {daysArray.map(day => (
                    <th key={day} className="p-1.5 text-center min-w-[32px] border-r border-border-color">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color font-mono">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-bg-hover text-text-secondary transition-colors">
                    <td className="p-2.5 font-semibold text-text-primary sticky left-0 bg-bg-card shadow-xs font-sans">
                      <button
                        onClick={() => handleViewSummary(emp)}
                        className="text-left hover:text-accent-primary transition-colors font-bold"
                      >
                        {emp.name}
                      </button>
                    </td>
                    <td className="p-2.5 font-mono text-accent-primary border-r border-border-color font-bold">{emp.emp_code}</td>
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
                            <span className={`w-5 h-5 inline-flex items-center justify-center rounded-xs text-[10px] ${statusColors[status]}`}>
                              {statusInitials[status]}
                            </span>
                          ) : (
                            <span className="text-text-muted font-mono text-[10px]">—</span>
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
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-text-primary">
              Monthly Attendance Summary: <span className="text-accent-primary">{summaryEmployee.name}</span>
            </h3>
            <button onClick={() => setSummaryEmployee(null)} className="btn btn-secondary text-xs py-0.5 px-2">✕ Close</button>
          </div>
          {employeeSummaryData ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 font-mono">
              <div className="bg-bg-surface p-3 rounded-xs border border-border-color">
                <p className="text-[10px] uppercase text-text-muted font-bold">Total Days</p>
                <p className="text-xl font-bold text-text-primary mt-1">{daysCount}</p>
              </div>
              <div className="bg-bg-surface p-3 rounded-xs border border-border-color border-l-4 border-l-accent-success">
                <p className="text-[10px] uppercase text-text-muted font-bold">Presents (P)</p>
                <p className="text-xl font-bold text-accent-success mt-1">{employeeSummaryData.present_count}</p>
              </div>
              <div className="bg-bg-surface p-3 rounded-xs border border-border-color border-l-4 border-l-accent-danger">
                <p className="text-[10px] uppercase text-text-muted font-bold">Absents (A)</p>
                <p className="text-xl font-bold text-accent-danger mt-1">{employeeSummaryData.absent_count}</p>
              </div>
              <div className="bg-bg-surface p-3 rounded-xs border border-border-color border-l-4 border-l-accent-warning">
                <p className="text-[10px] uppercase text-text-muted font-bold">Half Days (H)</p>
                <p className="text-xl font-bold text-accent-warning mt-1">{employeeSummaryData.half_day_count}</p>
              </div>
              <div className="bg-bg-surface p-3 rounded-xs border border-border-color border-l-4 border-l-accent-primary">
                <p className="text-[10px] uppercase text-text-muted font-bold">Leaves (L)</p>
                <p className="text-xl font-bold text-accent-primary mt-1">{employeeSummaryData.leave_count}</p>
              </div>
            </div>
          ) : (
            <p className="text-text-muted text-xs font-mono">Loading summary...</p>
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
            <div className="p-3 bg-bg-surface border border-border-color rounded-xs text-xs text-text-secondary font-mono">
              <span className="font-bold text-text-primary">{activeEmployee.name}</span> | Date: <span>{activeDate}</span>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-2">Status</label>
              <div className="grid grid-cols-4 gap-2">
                {['Present', 'Absent', 'Half Day', 'Leave'].map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setMarkStatus(st)}
                    className={`py-1.5 rounded-xs font-mono font-bold transition-all text-xs border ${
                      markStatus === st 
                        ? 'bg-accent-primary text-white border-accent-primary shadow-xs' 
                        : 'bg-bg-surface text-text-secondary border-border-color hover:bg-bg-hover'
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
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Clock-In Time</label>
                  <input
                    type="time"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="field w-full text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-1">Clock-Out Time</label>
                  <input
                    type="time"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="field w-full text-xs font-mono"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
              <button
                type="button"
                onClick={() => setShowMarkModal(false)}
                className="btn btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary text-xs"
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
