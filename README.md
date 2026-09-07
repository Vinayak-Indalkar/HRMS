# Quantira Technologies HRMS - Human Resource Management System (MVP)

A modern, responsive **Human Resource Management System (HRMS)** built for organizations with ~50 employees, supporting three primary user roles:
1. **Employee**
2. **Manager**
3. **HR / Admin**

---

## 🌟 Key Features

### 1. Role-Based Access Control (RBAC)
- **Employee**: Access personal dashboard, punch in/out with live timer, apply for leave, view personal balances & attendance history, company directory, holiday calendar, and announcements.
- **Manager**: All employee features + team presence overview, team attendance logs, leave approval queue with 1-click review & remarks, and team leave calendar.
- **HR / Admin**: Full company visibility, organizational headcount charts, employee CRUD with activation/deactivation, attendance audit & regularization, company-wide leave overrides, holiday management, announcement broadcasting, and system policy settings.

### 2. Precise Server-Authoritative Attendance
- **Server Timestamp Authority**: Accurate punch in and punch out calculated on the server.
- **Session Rules**: Prevents duplicate punch-ins, prevents punch out without active punch in.
- **Live Working Hours Counter**: Dynamically computes elapsed time (`HH:MM:SS`) with pulsating status indicator.
- **Status Classifications**: Automatically handles `Working`, `Completed`, `Present`, `Half Day`, and `Absent`.

### 3. Leave Management & Approval Workflows
- Support for **Casual Leave**, **Sick Leave**, **Paid Leave**, and **Unpaid Leave**.
- Dynamic calendar day calculation and automatic balance quota deduction upon manager approval.
- Team leave calendar to prevent understaffing.
- HR administrative override capability.

### 4. Employee Directory & Profiles
- Search by name, designation, email, or employee code.
- Filter by department.
- Detailed modal profiles displaying reporting managers, dates of joining, contact info, and emergency details.

### 5. Holidays & Announcements
- Official company holiday calendar with **Mandatory**, **Optional**, and **Weekend** tags.
- Categorized company notice board with targeted audience visibility.
- Real-time in-app notification center.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18 or v20+ recommended)
- npm

### 1. Install Dependencies
```bash
# In the root directory:
npm run install:all
```
*(Or install separately: `cd server && npm install`, `cd ../client && npm install`)*

### 2. Seed Demo Data
Populates realistic seed data for ~15 employees across Engineering, Sales, Marketing, HR, Finance, and Operations with past attendance records and leave requests:
```bash
npm run seed
```

### 3. Start the Application
You can run the full unified system (Backend API + Frontend SPA on single port `5000`):
```bash
node server/index.js
```
Then open: **`http://localhost:5000`** in your browser.

Or run in development mode with hot-reloading:
```bash
# Terminal 1 (Backend API on :5000)
npm run dev:server

# Terminal 2 (Vite Frontend with HMR on :3000)
npm run dev:client
```

---

## 🔑 Demo Login Credentials

The login screen features **One-Click Demo Role Switcher Buttons** for instant evaluation:

| Role | Email | Password | Access Level |
|---|---|---|---|
| 👑 **HR / Admin** | `admin@company.com` | `admin123` | Full administrative control, employee management, system settings |
| 👔 **Manager** | `manager.eng@company.com` | `manager123` | Engineering team lead, team attendance & leave approvals |
| 💼 **Employee** | `employee.alex@company.com` | `employee123` | Senior SWE, personal attendance, leave applications |

*Additional Manager accounts: `manager.sales@company.com`, `manager.ops@company.com`*

---

## 📁 Architecture Overview

```
HRMS/
├── server/
│   ├── index.js               # Express entrypoint & SPA static serving
│   ├── db/
│   │   ├── database.js        # File-backed atomic JSON database
│   │   ├── data.json          # Persistent database storage
│   │   └── seed.js            # Realistic 50-person organizational seed data
│   ├── middleware/
│   │   └── auth.js            # JWT auth & RBAC route guards
│   ├── services/
│   │   ├── attendanceService.js # Server timestamp punch engine
│   │   └── notificationService.js # In-app notification triggers
│   ├── routes/                # REST endpoints (auth, attendance, leaves, employees, etc.)
│   └── test-api.js            # Automated verification test suite
└── client/
    ├── src/
    │   ├── App.jsx            # Main app router & role-based dispatch
    │   ├── context/           # AuthContext & NotificationContext
    │   ├── components/        # SaaS Sidebar, TopNav, StatCards, LiveTimer, Modals
    │   ├── pages/             # Dashboards, Attendance, Leaves, Directory, Settings
    │   └── services/api.js    # Typed HTTP API client
    ├── tailwind.config.js     # SaaS palette and styling
    └── vite.config.js         # Vite configuration with API proxy
```

---

## 🧪 Automated Verification Suite

To run the automated verification test suite:
```bash
node server/test-api.js
```
Expected output: **21 PASSED, 0 FAILED**.
