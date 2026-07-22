import React, { useState, useEffect } from 'react';
import { getEmployees, getAttendance, markAttendance, getAttendanceSummary } from '../../api/hrApi';
import { exportToCSV } from '../../utils/exportCSV';

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
    'Present': 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    'Absent': 'bg-red-500/20 text-red-400 border border-red-500/30',
    'Half Day': 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    'Leave': 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
  };

  const statusInitials = {
    'Present': 'P',
    'Absent': 'A',
    'Half Day': 'H',
    'Leave': 'L'
  };

  return (
    <div className="p-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">Employee Attendance</h1>
          <p className="text-slate-400 text-sm mt-1">Monitor working hours, clock-in reports, and log leaves.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white">Export CSV</button>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white focus:outline-none"
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
            className="bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white focus:outline-none"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-950/80 border border-red-500/50 rounded-lg text-red-200">{error}</div>}
      {success && <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-lg text-emerald-200">{success}</div>}

      {/* Main Attendance Grid */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md mb-6">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading attendance data...</div>
        ) : (
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/70 text-slate-300 font-semibold sticky top-0 z-10">
                  <th className="p-3 bg-slate-800 min-w-[150px] sticky left-0 z-20">Employee</th>
                  <th className="p-3 bg-slate-800 min-w-[70px] border-r border-slate-700">Code</th>
                  {daysArray.map(day => (
                    <th key={day} className="p-2 text-center min-w-[32px] border-r border-slate-700">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-800/40 text-slate-300 transition-colors">
                    <td className="p-3 font-semibold text-white sticky left-0 bg-slate-900/95 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                      <button
                        onClick={() => handleViewSummary(emp)}
                        className="text-left hover:text-teal-400 transition-colors font-semibold"
                      >
                        {emp.name}
                      </button>
                    </td>
                    <td className="p-3 font-mono text-slate-400 border-r border-slate-700">{emp.emp_code}</td>
                    {daysArray.map(day => {
                      const record = getRecord(emp.id, day);
                      const status = record ? record.status : '';
                      return (
                        <td
                          key={day}
                          onClick={() => handleCellClick(emp, day)}
                          className="p-1 text-center border-r border-slate-700 cursor-pointer hover:bg-slate-700/30 transition-colors"
                        >
                          {status ? (
                            <span className={`w-6 h-6 inline-flex items-center justify-center rounded-md text-[10px] font-extrabold ${statusColors[status]}`}>
                              {statusInitials[status]}
                            </span>
                          ) : (
                            <span className="text-slate-600 font-mono">—</span>
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
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-700 pb-3">
            <h3 className="text-lg font-bold text-white">
              Monthly Attendance Summary: <span className="text-teal-400">{summaryEmployee.name}</span>
            </h3>
            <button onClick={() => setSummaryEmployee(null)} className="text-slate-400 hover:text-white">✕ Close</button>
          </div>
          {employeeSummaryData ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                <p className="text-xs text-slate-400">Total Working Days</p>
                <p className="text-2xl font-bold text-slate-200 mt-1">{daysCount}</p>
              </div>
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 border-l-emerald-500/50">
                <p className="text-xs text-slate-400">Presents (P)</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{employeeSummaryData.present_count}</p>
              </div>
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 border-l-red-500/50">
                <p className="text-xs text-slate-400">Absents (A)</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{employeeSummaryData.absent_count}</p>
              </div>
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 border-l-amber-500/50">
                <p className="text-xs text-slate-400">Half Days (H)</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">{employeeSummaryData.half_day_count}</p>
              </div>
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 border-l-blue-500/50">
                <p className="text-xs text-slate-400">Leaves / Holidays (L)</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">{employeeSummaryData.leave_count}</p>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-sm">Loading summary...</p>
          )}
        </div>
      )}

      {/* MARK/EDIT MODAL */}
      {showMarkModal && activeEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="border-b border-slate-700 p-4 bg-slate-900/50 flex justify-between items-center">
              <div>
                <h3 className="text-md font-bold text-white">Mark Attendance</h3>
                <p className="text-slate-400 text-xs mt-0.5">{activeEmployee.name} | {activeDate}</p>
              </div>
              <button onClick={() => setShowMarkModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveAttendance} className="p-6 space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-2">Status</label>
                <div className="grid grid-cols-4 gap-2">
                  {['Present', 'Absent', 'Half Day', 'Leave'].map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setMarkStatus(st)}
                      className={`py-2 rounded font-bold transition-all text-xs border ${
                        markStatus === st 
                          ? 'bg-teal-600 text-white border-teal-500 shadow-lg shadow-teal-500/20' 
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600'
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
                    <label className="block text-slate-300 font-semibold mb-1 text-xs">Clock-In Time</label>
                    <input
                      type="time"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 text-xs">Clock-Out Time</label>
                    <input
                      type="time"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowMarkModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-white font-medium text-xs"
                >
                  Save Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
