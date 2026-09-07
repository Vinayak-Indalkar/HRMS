const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('hrms_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('hrms_token', token);
    } else {
      localStorage.removeItem('hrms_token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('hrms_token');
  }

  getActiveRole() {
    return localStorage.getItem('hrms_active_role');
  }

  setActiveRole(role) {
    if (role) {
      localStorage.setItem('hrms_active_role', role);
    } else {
      localStorage.removeItem('hrms_active_role');
    }
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers = {
      ...options.headers,
    };
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const activeRole = this.getActiveRole();
    if (activeRole) {
      headers['X-Active-Role'] = activeRole;
    }

    const config = {
      ...options,
      headers
    };

    if (config.body && typeof config.body === 'object' && !isFormData) {
      config.body = JSON.stringify(config.body);
    }

    try {
      const res = await fetch(url, config);
      let data = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json().catch(() => ({}));
      } else {
        const text = await res.text().catch(() => '');
        data = { error: text || `Request failed with status ${res.status}` };
      }

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          if (data.error && data.error.includes('expired') || res.status === 401) {
            // clear token on auth expiry
            // this.setToken(null);
          }
        }
        throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
      }

      return data;
    } catch (err) {
      throw err;
    }
  }

  get(endpoint, query = {}) {
    const qs = new URLSearchParams(Object.entries(query).filter(([_, v]) => v !== undefined && v !== null && v !== '')).toString();
    const path = qs ? `${endpoint}?${qs}` : endpoint;
    return this.request(path, { method: 'GET' });
  }

  post(endpoint, body = {}) {
    return this.request(endpoint, { method: 'POST', body });
  }

  put(endpoint, body = {}) {
    return this.request(endpoint, { method: 'PUT', body });
  }

  patch(endpoint, body = {}) {
    return this.request(endpoint, { method: 'PATCH', body });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Auth
  login(email, password) {
    return this.post('/auth/login', { email, password });
  }
  getMe() {
    return this.get('/auth/me');
  }
  forgotPassword(email) {
    return this.post('/auth/forgot-password', { email });
  }
  resetPassword(email, reset_token, new_password) {
    return this.post('/auth/reset-password', { email, reset_token, new_password });
  }
  changePassword(current_password, new_password) {
    return this.post('/auth/change-password', { current_password, new_password });
  }
  switchRole(role) {
    return this.post('/auth/switch-role', { role });
  }

  // Attendance
  getTodayAttendance() {
    return this.get('/attendance/today');
  }
  punchIn() {
    return this.post('/attendance/punch-in');
  }
  punchOut() {
    return this.post('/attendance/punch-out');
  }
  resetTodayAttendance() {
    return this.post('/attendance/reset-today');
  }
  getMyAttendance(year, month) {
    return this.get('/attendance/my', { year, month });
  }
  getTeamAttendance(date) {
    return this.get('/attendance/team', { date });
  }
  getAllAttendance(params) {
    return this.get('/attendance/all', params);
  }
  regularizeAttendance(data) {
    return this.post('/attendance/regularize', data);
  }

  // Leaves
  getLeaveBalances(userId) {
    return this.get('/leaves/balances', { user_id: userId });
  }
  getMyLeaves() {
    return this.get('/leaves/my');
  }
  applyLeave(data) {
    return this.post('/leaves/apply', data);
  }
  getLeaveApprovals() {
    return this.get('/leaves/approvals');
  }
  reviewLeave(id, status, remarks) {
    return this.post(`/leaves/${id}/review`, { status, remarks });
  }
  getTeamMembers() {
    return this.get('/leaves/team-members');
  }
  getTeamLeaves(params) {
    return this.get('/leaves/team-leaves', params);
  }
  cancelLeave(id, reason) {
    return this.post(`/leaves/${id}/cancel`, { reason });
  }
  getTeamLeaveCalendar() {
    return this.get('/leaves/team-calendar');
  }
  getAllLeaves() {
    return this.get('/leaves/all');
  }
  updateLeaveBalance(id, data) {
    return this.put(`/leaves/balances/${id}`, data);
  }

  // Employees & Directory
  getDirectory(params) {
    return this.get('/employees/directory', params);
  }
  getDepartments() {
    return this.get('/employees/departments');
  }
  getManagers() {
    return this.get('/employees/managers');
  }
  getAllEmployees(params) {
    return this.get('/employees', params);
  }
  getEmployee(id) {
    return this.get(`/employees/${id}`);
  }
  createEmployee(data) {
    return this.post('/employees', data);
  }
  updateEmployee(id, data) {
    return this.put(`/employees/${id}`, data);
  }
  toggleEmployeeStatus(id, status) {
    return this.patch(`/employees/${id}/status`, { status });
  }

  // Holidays
  getHolidays() {
    return this.get('/holidays');
  }
  getUpcomingHolidays() {
    return this.get('/holidays/upcoming');
  }
  createHoliday(data) {
    return this.post('/holidays', data);
  }
  updateHoliday(id, data) {
    return this.put(`/holidays/${id}`, data);
  }
  deleteHoliday(id) {
    return this.delete(`/holidays/${id}`);
  }

  // Announcements
  getAnnouncements(category) {
    return this.get('/announcements', { category });
  }
  createAnnouncement(data) {
    return this.post('/announcements', data);
  }
  updateAnnouncement(id, data) {
    return this.put(`/announcements/${id}`, data);
  }
  deleteAnnouncement(id) {
    return this.delete(`/announcements/${id}`);
  }

  // Notifications
  getNotifications() {
    return this.get('/notifications');
  }
  markNotificationRead(id) {
    return this.patch(`/notifications/${id}/read`);
  }
  markAllNotificationsRead() {
    return this.post('/notifications/mark-all-read');
  }

  // Dashboard
  getDashboardStats() {
    return this.get('/dashboard/stats');
  }

  // Reports
  getReportEmployees() {
    return this.get('/reports/employees');
  }
  getEmployeeReport(params) {
    return this.get('/reports/employee-report', params);
  }

  // Settings & Roles/Permissions
  getSettings() {
    return this.get('/settings');
  }
  updateSettings(data) {
    return this.put('/settings', data);
  }
  getRoles() {
    return this.get('/settings/roles');
  }
  getPermissionsCatalog() {
    return this.get('/settings/permissions');
  }
  createRole(data) {
    return this.post('/settings/roles', data);
  }
  updateRole(id, data) {
    return this.put(`/settings/roles/${id}`, data);
  }
  deleteRole(id) {
    return this.delete(`/settings/roles/${id}`);
  }

  // Clients & Multi-tenant Setup (Super Admin)
  getClients() {
    return this.get('/clients');
  }
  getClient(id) {
    return this.get(`/clients/${id}`);
  }
  createClient(data) {
    return this.post('/clients', data);
  }
  updateClient(id, data) {
    return this.put(`/clients/${id}`, data);
  }
  handoverClient(id, data) {
    return this.post(`/clients/${id}/handover`, data);
  }
  deleteClient(id) {
    return this.delete(`/clients/${id}`);
  }

  // Profile Module
  getProfile() {
    return this.get('/profile/me');
  }
  updateProfileBasic(data) {
    return this.put('/profile/basic', data);
  }
  updateProfileDemographics(data) {
    return this.put('/profile/demographics', data);
  }
  updateProfileContactAddress(data) {
    return this.put('/profile/contact-address', data);
  }
  addEmergencyContact(data) {
    return this.post('/profile/emergency-contacts', data);
  }
  updateEmergencyContact(contactId, data) {
    return this.put(`/profile/emergency-contacts/${contactId}`, data);
  }
  deleteEmergencyContact(contactId) {
    return this.delete(`/profile/emergency-contacts/${contactId}`);
  }
  uploadProfilePhoto(avatar_url) {
    return this.post('/profile/photo', { avatar_url });
  }
  removeProfilePhoto() {
    return this.delete('/profile/photo');
  }
  uploadDocument(data) {
    return this.post('/profile/documents', data);
  }
  deleteDocument(docId) {
    return this.delete(`/profile/documents/${docId}`);
  }
  verifyDocument(docId, data) {
    return this.post(`/profile/admin/documents/${docId}/verify`, data);
  }
  addEmploymentHistory(userId, data) {
    return this.post(`/profile/admin/${userId}/history`, data);
  }

  // KPI Module API Endpoints
  getKpiCategories() {
    return this.get('/kpi/categories');
  }
  createKpiCategory(data) {
    return this.post('/kpi/categories', data);
  }
  updateKpiCategory(id, data) {
    return this.put(`/kpi/categories/${id}`, data);
  }
  getKpiTemplates() {
    return this.get('/kpi/templates');
  }
  createKpiTemplate(data) {
    return this.post('/kpi/templates', data);
  }
  updateKpiTemplate(id, data) {
    return this.put(`/kpi/templates/${id}`, data);
  }
  getKpiPeriods() {
    return this.get('/kpi/periods');
  }
  createKpiPeriod(data) {
    return this.post('/kpi/periods', data);
  }
  getKpiAssignments(query = {}) {
    return this.get('/kpi/assignments', query);
  }
  createKpiAssignment(data) {
    return this.post('/kpi/assignments', data);
  }
  bulkAssignKpi(data) {
    return this.post('/kpi/assignments/bulk', data);
  }
  updateKpiAssignment(id, data) {
    return this.put(`/kpi/assignments/${id}`, data);
  }
  submitKpiProgress(assignmentId, data) {
    return this.post(`/kpi/assignments/${assignmentId}/progress`, data);
  }
  getKpiProgressHistory(assignmentId) {
    return this.get(`/kpi/assignments/${assignmentId}/progress`);
  }
  getPendingKpiReviews() {
    return this.get('/kpi/reviews/pending');
  }
  submitKpiReview(assignmentId, data) {
    return this.post(`/kpi/assignments/${assignmentId}/review`, data);
  }
  getEmployeeKpiDashboard(query = {}) {
    return this.get('/kpi/dashboard/employee', query);
  }
  getManagerKpiDashboard(query = {}) {
    return this.get('/kpi/dashboard/manager', query);
  }
  getAdminKpiDashboard(query = {}) {
    return this.get('/kpi/dashboard/admin', query);
  }
  getKpiReportsSummary(query = {}) {
    return this.get('/kpi/reports/summary', query);
  }
  getKpiSettings() {
    return this.get('/kpi/settings');
  }
  updateKpiSettings(data) {
    return this.put('/kpi/settings', data);
  }
  getKpiAuditLogs() {
    return this.get('/kpi/audit-logs');
  }

  // Client Organizations
  getClients(query = {}) {
    return this.get('/clients', query);
  }
  getClient(id) {
    return this.get(`/clients/${id}`);
  }
  createClient(data) {
    return this.post('/clients', data);
  }
  updateClient(id, data) {
    return this.put(`/clients/${id}`, data);
  }
  handoverClient(id, data) {
    return this.post(`/clients/${id}/handover`, data);
  }
  deleteClient(id) {
    return this.delete(`/clients/${id}`);
  }

  // Company Policies
  getPolicies(query = {}) {
    return this.get('/policies', query);
  }
  getPolicy(id) {
    return this.get(`/policies/${id}`);
  }
  createPolicy(data) {
    return this.post('/policies', data);
  }
  updatePolicy(id, data) {
    return this.put(`/policies/${id}`, data);
  }
  replacePolicyDocument(id, data) {
    return this.post(`/policies/${id}/replace-document`, data);
  }
  publishPolicy(id) {
    return this.post(`/policies/${id}/publish`);
  }
  unpublishPolicy(id) {
    return this.post(`/policies/${id}/unpublish`);
  }
  archivePolicy(id) {
    return this.post(`/policies/${id}/archive`);
  }
  deletePolicy(id) {
    return this.delete(`/policies/${id}`);
  }
  getPolicyHistory(id) {
    return this.get(`/policies/${id}/history`);
  }
  getPolicyCategories() {
    return this.get('/policies/categories');
  }
  createPolicyCategory(data) {
    return this.post('/policies/categories', data);
  }
  updatePolicyCategory(id, data) {
    return this.put(`/policies/categories/${id}`, data);
  }
  deletePolicyCategory(id) {
    return this.delete(`/policies/categories/${id}`);
  }
  getPolicyViewUrl(id) {
    return `/api/policies/${id}/view`;
  }
  getPolicyDownloadUrl(id) {
    return `/api/policies/${id}/download`;
  }
}

export const api = new ApiClient();
export default api;

export const getKpiCategories = (...args) => api.getKpiCategories(...args);
export const createKpiCategory = (...args) => api.createKpiCategory(...args);
export const updateKpiCategory = (...args) => api.updateKpiCategory(...args);
export const getKpiTemplates = (...args) => api.getKpiTemplates(...args);
export const createKpiTemplate = (...args) => api.createKpiTemplate(...args);
export const updateKpiTemplate = (...args) => api.updateKpiTemplate(...args);
export const getKpiPeriods = (...args) => api.getKpiPeriods(...args);
export const createKpiPeriod = (...args) => api.createKpiPeriod(...args);
export const getKpiAssignments = (...args) => api.getKpiAssignments(...args);
export const createKpiAssignment = (...args) => api.createKpiAssignment(...args);
export const bulkAssignKpi = (...args) => api.bulkAssignKpi(...args);
export const updateKpiAssignment = (...args) => api.updateKpiAssignment(...args);
export const submitKpiProgress = (...args) => api.submitKpiProgress(...args);
export const getKpiProgressHistory = (...args) => api.getKpiProgressHistory(...args);
export const getPendingKpiReviews = (...args) => api.getPendingKpiReviews(...args);
export const submitKpiReview = (...args) => api.submitKpiReview(...args);
export const getEmployeeKpiDashboard = (...args) => api.getEmployeeKpiDashboard(...args);
export const getManagerKpiDashboard = (...args) => api.getManagerKpiDashboard(...args);
export const getAdminKpiDashboard = (...args) => api.getAdminKpiDashboard(...args);
export const getKpiReportsSummary = (...args) => api.getKpiReportsSummary(...args);
export const getKpiSettings = (...args) => api.getKpiSettings(...args);
export const updateKpiSettings = (...args) => api.updateKpiSettings(...args);
export const getKpiAuditLogs = (...args) => api.getKpiAuditLogs(...args);

export const getClients = (...args) => api.getClients(...args);
export const getClient = (...args) => api.getClient(...args);
export const createClient = (...args) => api.createClient(...args);
export const updateClient = (...args) => api.updateClient(...args);
export const handoverClient = (...args) => api.handoverClient(...args);
export const deleteClient = (...args) => api.deleteClient(...args);

export const getPolicies = (...args) => api.getPolicies(...args);
export const getPolicy = (...args) => api.getPolicy(...args);
export const createPolicy = (...args) => api.createPolicy(...args);
export const updatePolicy = (...args) => api.updatePolicy(...args);
export const replacePolicyDocument = (...args) => api.replacePolicyDocument(...args);
export const publishPolicy = (...args) => api.publishPolicy(...args);
export const unpublishPolicy = (...args) => api.unpublishPolicy(...args);
export const archivePolicy = (...args) => api.archivePolicy(...args);
export const deletePolicy = (...args) => api.deletePolicy(...args);
export const getPolicyHistory = (...args) => api.getPolicyHistory(...args);
export const getPolicyCategories = (...args) => api.getPolicyCategories(...args);
export const createPolicyCategory = (...args) => api.createPolicyCategory(...args);
export const updatePolicyCategory = (...args) => api.updatePolicyCategory(...args);
export const deletePolicyCategory = (...args) => api.deletePolicyCategory(...args);
export const getPolicyViewUrl = (...args) => api.getPolicyViewUrl(...args);
export const getPolicyDownloadUrl = (...args) => api.getPolicyDownloadUrl(...args);

export const getReportEmployees = (...args) => api.getReportEmployees(...args);
export const getEmployeeReport = (...args) => api.getEmployeeReport(...args);



