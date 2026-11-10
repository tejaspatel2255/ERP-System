export const ANNUAL_LEAVE_QUOTA = 20;

/**
 * Calculates leave deductions based on employee attendance records and approved leaves.
 * Rules:
 * - 'Leave' (L) = 1.0 leave deducted
 * - 'Half Day' (H) = 0.5 leave deducted
 * - Total Annual Quota = 20
 *
 * @param {Array} attendanceRecords - Array of attendance records
 * @param {string} employeeId - Optional filter for specific employee
 * @param {number} approvedAppDays - Optional approved leave application days
 * @returns {object} { quota: 20, leaveCount, halfDayCount, attendanceUsed, totalUsed, remaining }
 */
export const calculateEmployeeLeaves = (attendanceRecords = [], employeeId = null, approvedAppDays = 0) => {
  const records = employeeId
    ? attendanceRecords.filter((r) => r.employee_id === employeeId)
    : attendanceRecords;

  let leaveCount = 0;
  let halfDayCount = 0;

  records.forEach((r) => {
    if (r.status === 'Leave') {
      leaveCount += 1;
    } else if (r.status === 'Half Day') {
      halfDayCount += 1;
    }
  });

  const attendanceUsed = (leaveCount * 1.0) + (halfDayCount * 0.5);
  const totalUsed = attendanceUsed + (parseFloat(approvedAppDays) || 0);
  const remaining = Math.max(0, ANNUAL_LEAVE_QUOTA - totalUsed);

  return {
    quota: ANNUAL_LEAVE_QUOTA,
    leaveCount,
    halfDayCount,
    attendanceUsed,
    approvedAppDays: parseFloat(approvedAppDays) || 0,
    totalUsed,
    remaining
  };
};

/**
 * Formats leave numbers (e.g., 20, 18.5, 1.0 -> 1)
 */
export const formatLeaveDays = (days) => {
  const num = parseFloat(days) || 0;
  return num % 1 === 0 ? num.toFixed(0) : num.toFixed(1);
};
