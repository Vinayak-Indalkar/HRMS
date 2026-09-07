import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'data.json');

const defaultData = {
  users: [],
  departments: [],
  designations: [],
  employees: [],
  attendance: [],
  leave_balances: [],
  leave_requests: [],
  holidays: [],
  announcements: [],
  notifications: [],
  emergency_contacts: [],
  employment_history: [],
  employee_documents: [],
  kpi_categories: [],
  kpi_templates: [],
  kpi_periods: [],
  kpi_assignments: [],
  kpi_progress: [],
  kpi_reviews: [],
  kpi_evidence: [],
  kpi_audit_logs: [],
  policy_categories: [],
  company_policies: [],
  company_policy_versions: [],
  settings: {
    company_name: 'Quantira Technologies',
    company_email: 'hr@quantiratechnologies.com',
    company_phone: '+1 (555) 019-2834',
    company_address: '100 Innovation Blvd, Suite 400, Tech City, CA',
    work_start_time: '09:00',
    work_end_time: '18:00',
    standard_hours: 8,
    half_day_hours: 4,
    weekend_days: ['Saturday', 'Sunday'],
    casual_leave_quota: 12,
    sick_leave_quota: 10,
    paid_leave_quota: 15,
    unpaid_leave_quota: 30,
    demographic_fields: [
      { id: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Non-Binary', 'Prefer not to say'], enabled: true, employee_editable: true },
      { id: 'marital_status', label: 'Marital Status', type: 'select', options: ['Single', 'Married', 'Divorced', 'Widowed'], enabled: true, employee_editable: true },
      { id: 'nationality', label: 'Nationality', type: 'text', enabled: true, employee_editable: true },
      { id: 'country_of_residence', label: 'Country of Residence', type: 'text', enabled: true, employee_editable: true }
    ]
  }
};

class JSONDatabase {
  constructor() {
    this.data = null;
    this.init();
  }

  init() {
    if (!fs.existsSync(DB_FILE)) {
      this.data = { ...defaultData };
      this.saveSync();
    } else {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        this.migrateUserRoles();
      } catch (err) {
        console.error('Error reading DB file, resetting to default:', err);
        this.data = { ...defaultData };
        this.saveSync();
      }
    }
  }

  migrateUserRoles() {
    if (!this.data.users || !Array.isArray(this.data.users)) return;
    let modified = false;

    this.data.users.forEach(u => {
      if (!Array.isArray(u.roles) || u.roles.length === 0) {
        if (u.role === 'super_admin' || u.role === 'admin') {
          u.roles = ['super_admin', 'manager', 'employee'];
        } else if (u.role === 'hr_admin') {
          u.roles = ['hr_admin', 'manager', 'employee'];
        } else if (u.role === 'manager') {
          u.roles = ['manager', 'employee'];
        } else {
          u.roles = ['employee'];
        }
        modified = true;
      }
      if (!u.active_role) {
        u.active_role = u.role || u.roles[0];
        modified = true;
      }
    });

    if (modified) {
      this.saveSync();
    }
  }

  saveSync() {
    try {
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  getCollection(name) {
    if (!this.data[name]) {
      this.data[name] = [];
    }
    return this.data[name];
  }

  find(collection, filterFn = () => true) {
    const list = this.getCollection(collection);
    return list.filter(filterFn);
  }

  findOne(collection, filterFn) {
    const list = this.getCollection(collection);
    return list.find(filterFn) || null;
  }

  findById(collection, id) {
    const list = this.getCollection(collection);
    return list.find(item => item.id === id) || null;
  }

  insert(collection, item) {
    const list = this.getCollection(collection);
    const newItem = {
      id: item.id || `${collection.slice(0, 3)}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...item
    };
    list.push(newItem);
    this.saveSync();
    return newItem;
  }

  update(collection, filterFn, updates) {
    const list = this.getCollection(collection);
    let updatedItem = null;
    const predicate = typeof filterFn === 'function' ? filterFn : (item => item.id === filterFn);
    const index = list.findIndex(predicate);
    if (index !== -1) {
      list[index] = {
        ...list[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      updatedItem = list[index];
      this.saveSync();
    }
    return updatedItem;
  }

  updateById(collection, id, updates) {
    return this.update(collection, item => item.id === id, updates);
  }

  delete(collection, filterFn) {
    const list = this.getCollection(collection);
    const initialLength = list.length;
    this.data[collection] = list.filter(item => !filterFn(item));
    const deleted = this.data[collection].length < initialLength;
    if (deleted) {
      this.saveSync();
    }
    return deleted;
  }

  deleteById(collection, id) {
    return this.delete(collection, item => item.id === id);
  }

  getSettings() {
    return this.data.settings || defaultData.settings;
  }

  updateSettings(newSettings) {
    this.data.settings = {
      ...this.getSettings(),
      ...newSettings,
      updatedAt: new Date().toISOString()
    };
    this.saveSync();
    return this.data.settings;
  }

  reset(newData = defaultData) {
    this.data = JSON.parse(JSON.stringify(newData));
    this.saveSync();
  }
}

export const db = new JSONDatabase();
export default db;
