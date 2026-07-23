import axiosInstance from './axiosInstance';

/**
 * Fetch list of users with pagination and optional search/filters
 * @param {Object} filters - Search, departmentId, roleId, page, limit
 */
export const getUsers = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });
  params.append('_t', Date.now());

  const response = await axiosInstance.get(`/users?${params.toString()}`);
  return response.data;
};

/**
 * Create a new user
 * @param {Object} data - { name, email, password, department_id, roles }
 */
export const createUser = async (data) => {
  const response = await axiosInstance.post('/users', data);
  return response.data;
};

/**
 * Update an existing user
 * @param {string} id - User UUID
 * @param {Object} data - { name, email, department_id, is_active }
 */
export const updateUser = async (id, data) => {
  const response = await axiosInstance.put(`/users/${id}`, data);
  return response.data;
};

/**
 * Soft delete / Deactivate a user
 * @param {string} id - User UUID
 */
export const deactivateUser = async (id) => {
  const response = await axiosInstance.delete(`/users/${id}`);
  return response.data;
};

/**
 * Fetch activity log of a single user
 * @param {string} id - User UUID
 */
export const getUserActivity = async (id) => {
  const response = await axiosInstance.get(`/users/${id}/activity`);
  return response.data;
};

/**
 * Assign roles to a user
 * @param {string} id - User UUID
 * @param {Array<string>} roles - Array of role IDs or names
 */
export const assignUserRoles = async (id, roles) => {
  const response = await axiosInstance.post(`/users/${id}/roles`, { roles });
  return response.data;
};

/**
 * Get all roles with user counts
 */
export const getRoles = async () => {
  const response = await axiosInstance.get('/roles');
  return response.data;
};

/**
 * Create a new role
 * @param {Object} data - { name }
 */
export const createRole = async (data) => {
  const response = await axiosInstance.post('/roles', data);
  return response.data;
};

/**
 * Update permissions for a role
 * @param {string} roleId - Role UUID
 * @param {Array<Object>} permissions - [{ module_name, action }, ...]
 */
export const setRolePermissions = async (roleId, permissions) => {
  const response = await axiosInstance.put(`/roles/${roleId}/permissions`, { permissions });
  return response.data;
};

/**
 * Fetch all departments
 */
export const getDepartments = async () => {
  const response = await axiosInstance.get('/departments');
  return response.data;
};

/**
 * Create a new department
 * @param {Object} data - { name }
 */
export const createDepartment = async (data) => {
  const response = await axiosInstance.post('/departments', data);
  return response.data;
};

/**
 * Get paginated activity logs system-wide
 * @param {Object} filters - { page, limit, module, userId, startDate, endDate }
 */
export const getActivityLogs = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });

  const response = await axiosInstance.get(`/activity-logs?${params.toString()}`);
  return response.data;
};

/**
 * Fetch list of pending users (is_active = FALSE)
 */
export const getPendingUsers = async () => {
  const response = await axiosInstance.get('/users/pending');
  return response.data;
};

/**
 * Approve a pending user and assign role (+ optional department)
 * @param {string} id - User UUID
 * @param {Object} data - { role_id, department_id }
 */
export const approveUser = async (id, data) => {
  const response = await axiosInstance.patch(`/users/${id}/approve`, data);
  return response.data;
};

/**
 * Reject and delete a pending user registration
 * @param {string} id - User UUID
 */
export const rejectUser = async (id) => {
  const response = await axiosInstance.delete(`/users/${id}/reject`);
  return response.data;
};

export default {
  getUsers,
  createUser,
  updateUser,
  deactivateUser,
  getUserActivity,
  assignUserRoles,
  getRoles,
  createRole,
  setRolePermissions,
  getDepartments,
  createDepartment,
  getActivityLogs,
  getPendingUsers,
  approveUser,
  rejectUser
};
