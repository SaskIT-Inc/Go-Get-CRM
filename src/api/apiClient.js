import { getToken, setToken, clearToken } from '@/lib/auth-storage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8070';

export class ApiError extends Error {
  constructor(message, status, errorCode, data) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
    this.data = data;
  }
}

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let payload = body;
  if (body !== undefined && !isForm) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { method, headers, body: payload });

  if (!response.ok) {
    let message = response.statusText;
    let errorCode;
    let data;
    try {
      const parsed = await response.json();
      const detail = parsed.detail;
      // `detail` is usually a plain string, but some endpoints (e.g.
      // /auth/login's "email not verified" case) send a structured object
      // so the frontend can branch without parsing message text.
      if (detail && typeof detail === 'object') {
        message = detail.message || message;
        errorCode = detail.error_code;
        data = detail;
      } else if (detail) {
        message = detail;
      }
    } catch {
      // response body wasn't JSON; fall back to statusText
    }
    throw new ApiError(message, response.status, errorCode, data);
  }

  if (response.status === 204) return null;
  return response.json();
}

// One accessor per entity: entities.<Name>.list/filter/get/create/update/delete/bulkCreate.
function createEntityClient(entityName) {
  return {
    list: (sort, limit) => request(`/api/${entityName}/query`, { method: 'POST', body: { sort, limit } }),
    filter: (query = {}, sort, limit) =>
      request(`/api/${entityName}/query`, { method: 'POST', body: { filter: query, sort, limit } }),
    get: (id) => request(`/api/${entityName}/${id}`),
    create: (data) => request(`/api/${entityName}`, { method: 'POST', body: data }),
    update: (id, data) => request(`/api/${entityName}/${id}`, { method: 'PATCH', body: data }),
    delete: (id) => request(`/api/${entityName}/${id}`, { method: 'DELETE' }),
    bulkCreate: (items) => request(`/api/${entityName}/bulk`, { method: 'POST', body: items }),
  };
}

const ENTITY_NAMES = [
  'User', 'Client', 'Service', 'ServiceFiling', 'Task', 'Appointment', 'Invoice', 'Document',
  'Retainer', 'ServiceMaster', 'StatusStageMaster', 'DocumentChecklist', 'TaskComment',
  'ComplianceAlert', 'EmailDraft', 'Lead', 'Signature', 'WorkflowTemplate',
  'FilingPipeline', 'ProcessTemplate', 'Estimate', 'Activity', 'AutomationRulesMaster',
  'TaskTemplate', 'Payment', 'PaymentMethod',
  'Announcement', 'Conversation', 'Message', 'Notification', 'DocumentComment', 'Office',
  'Vendor', 'DocumentType', 'Package', 'TeamMemberBookingProfile', 'IndustryType', 'Communication',
  'RecurringEmailSequence',
];

const entities = Object.fromEntries(ENTITY_NAMES.map((name) => [name, createEntityClient(name)]));

export const api = {
  entities,

  auth: {
    me: () => request('/auth/me'),
    login: async (email, password) => {
      const { access_token, user } = await request('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      setToken(access_token);
      return user;
    },
    logout: () => {
      clearToken();
    },
    updateMe: (data) => request('/auth/me', { method: 'PATCH', body: data }),
    register: async (data) => {
      const { access_token, user } = await request('/auth/register', { method: 'POST', body: data });
      setToken(access_token);
      return user;
    },
    verifyEmail: async (data) => {
      const { access_token, user } = await request('/auth/verify-email', { method: 'POST', body: data });
      setToken(access_token);
      return user;
    },
    resendVerification: (data) => request('/auth/resend-verification', { method: 'POST', body: data }),
    getInvite: (token) => request(`/auth/invite/${token}`),
    acceptInvite: async (data) => {
      const { access_token, user } = await request('/auth/accept-invite', { method: 'POST', body: data });
      setToken(access_token);
      return user;
    },
  },

  users: {
    inviteUser: (data) => request('/auth/invite', { method: 'POST', body: data }),
    updateAccess: (userId, data) => request(`/auth/users/${userId}/access`, { method: 'PATCH', body: data }),
    deleteUser: (userId) => request(`/auth/users/${userId}`, { method: 'DELETE' }),
  },

  company: {
    get: () => request('/api/company-profile'),
    update: (data) => request('/api/company-profile', { method: 'PATCH', body: data }),
    getNotificationSettings: () => request('/api/notification-settings'),
    updateNotificationSettings: (data) => request('/api/notification-settings', { method: 'PATCH', body: data }),
    getSystemPreferences: () => request('/api/system-preferences'),
    updateSystemPreferences: (data) => request('/api/system-preferences', { method: 'PATCH', body: data }),
    getWebsiteIntegration: () => request('/api/website-integration'),
  },

  notifications: {
    markAllRead: () => request('/api/notifications/mark-all-read', { method: 'POST' }),
  },

  craForms: {
    list: () => request('/api/cra-forms'),
  },

  provincialTax: {
    list: () => request('/api/provincial-tax-info'),
  },

  integrations: {
    Core: {
      UploadFile: async ({ file }) => {
        const form = new FormData();
        form.append('file', file);
        return request('/api/files', { method: 'POST', body: form, isForm: true });
      },
      SendEmail: ({ to, subject, body, html, cc, attachments }) =>
        request('/api/integrations/send-email', { method: 'POST', body: { to, subject, body, html, cc, attachments } }),
    },
    getConnectedAccounts: () => request('/api/integrations/connected-accounts'),
    getGoogleConnectUrl: () => request('/api/integrations/google/connect'),
    disconnectGoogle: () => request('/api/integrations/google/disconnect', { method: 'DELETE' }),
    getOneDriveStatus: () => request('/api/integrations/onedrive/status'),
    getOneDriveConnectUrl: () => request('/api/integrations/onedrive/connect'),
    disconnectOneDrive: () => request('/api/integrations/onedrive/disconnect', { method: 'DELETE' }),
    getOutlookConnectUrl: () => request('/api/integrations/outlook/connect'),
    disconnectOutlook: () => request('/api/integrations/outlook/disconnect', { method: 'DELETE' }),
  },

  functions: {
    invoke: (name, payload) => request(`/api/functions/${name}`, { method: 'POST', body: payload }),
  },

  public: {
    contact: (data) => request('/api/public/contact', { method: 'POST', body: data }),
    chatbot: (message, history) => request('/api/public/chatbot', { method: 'POST', body: { message, history } }),
  },
};
