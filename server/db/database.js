import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import defaultData from './seedData.js';

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DB_FILE = isVercel
  ? path.join('/tmp', 'hrms_data.json')
  : path.join(__dirname, 'data.json');

class JSONDatabase {
  constructor() {
    this.data = null;
    this.init();
  }

  init() {
    const candidateFiles = [
      DB_FILE,
      path.join(__dirname, 'data.json'),
      path.join(process.cwd(), 'server', 'db', 'data.json'),
      path.join(process.cwd(), 'data.json')
    ];

    let loaded = false;
    for (const file of candidateFiles) {
      if (fs.existsSync(file)) {
        try {
          const raw = fs.readFileSync(file, 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
            this.data = parsed;
            loaded = true;
            break;
          }
        } catch (err) {
          console.warn(`Error reading database file at ${file}:`, err.message);
        }
      }
    }

    if (!loaded) {
      this.data = JSON.parse(JSON.stringify(defaultData));
    }

    this.migrateUserRoles();
    this.saveSync();
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
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.warn('Failed to write database file (in-memory state preserved):', err.message);
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
