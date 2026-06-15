import axiosInstance from './axiosInstance';

// Employees
export const getEmployees = async (deptId = '') => {
  const url = deptId ? `/hr/employees?department_id=${deptId}` : '/hr/employees';
  const res = await axiosInstance.get(url);
  return res.data;
};

export const createEmployee = async (data) => {
  const res = await axiosInstance.post('/hr/employees', data);
  return res.data;
};

export const getEmployeeById = async (id) => {
  const res = await axiosInstance.get(`/hr/employees/${id}`);
  return res.data;
};

export const updateEmployee = async (id, data) => {
  const res = await axiosInstance.put(`/hr/employees/${id}`, data);
  return res.data;
};

// Attendance
export const getAttendance = async (empId = '', month = '') => {
  let query = [];
  if (empId) query.push(`employee_id=${empId}`);
  if (month) query.push(`month=${month}`);
  const qStr = query.length ? `?${query.join('&')}` : '';
  const res = await axiosInstance.get(`/hr/attendance${qStr}`);
  return res.data;
};

export const markAttendance = async (data) => {
  const res = await axiosInstance.post('/hr/attendance', data);
  return res.data;
};

export const correctAttendance = async (id, data) => {
  const res = await axiosInstance.put(`/hr/attendance/${id}`, data);
  return res.data;
};

export const getAttendanceSummary = async (empId, year, month) => {
  const res = await axiosInstance.get(`/hr/attendance/summary/${empId}/${year}/${month}`);
  return res.data;
};

// Leave
export const getLeaveTypes = async () => {
  const res = await axiosInstance.get('/hr/leave-types');
  return res.data;
};

export const createLeaveType = async (data) => {
  const res = await axiosInstance.post('/hr/leave-types', data);
  return res.data;
};

export const getLeaveApplications = async (status = '', employeeId = '') => {
  let query = [];
  if (status) query.push(`status=${status}`);
  if (employeeId) query.push(`employee_id=${employeeId}`);
  const qStr = query.length ? `?${query.join('&')}` : '';
  const res = await axiosInstance.get(`/hr/leave-applications${qStr}`);
  return res.data;
};

export const applyLeave = async (data) => {
  const res = await axiosInstance.post('/hr/leave-applications', data);
  return res.data;
};

export const approveLeave = async (id) => {
  const res = await axiosInstance.patch(`/hr/leave-applications/${id}/approve`);
  return res.data;
};

export const rejectLeave = async (id, reason) => {
  const res = await axiosInstance.patch(`/hr/leave-applications/${id}/reject`, { reason });
  return res.data;
};

export const getLeaveBalance = async (empId) => {
  const res = await axiosInstance.get(`/hr/leave-balance/${empId}`);
  return res.data;
};

// Self Service
export const getSelfAttendance = async () => {
  const res = await axiosInstance.get('/hr/self/attendance');
  return res.data;
};

export const getSelfLeaveBalance = async () => {
  const res = await axiosInstance.get('/hr/self/leave-balance');
  return res.data;
};

export const selfApplyLeave = async (data) => {
  const res = await axiosInstance.post('/hr/self/leave-apply', data);
  return res.data;
};

export const getSelfLeaveApplications = async () => {
  const res = await axiosInstance.get('/hr/self/leave-applications');
  return res.data;
};

// Training
export const getTrainingSessions = async () => {
  const res = await axiosInstance.get('/hr/training');
  return res.data;
};

export const createTrainingSession = async (data) => {
  const res = await axiosInstance.post('/hr/training', data);
  return res.data;
};

export const getTrainingSessionById = async (id) => {
  const res = await axiosInstance.get(`/hr/training/${id}`);
  return res.data;
};

export const markTrainingAttendance = async (id, data) => {
  const res = await axiosInstance.post(`/hr/training/${id}/attendance`, data);
  return res.data;
};
