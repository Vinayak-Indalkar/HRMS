import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from '../server/routes/auth.js';
import employeesRoutes from '../server/routes/employees.js';
import attendanceRoutes from '../server/routes/attendance.js';
import leavesRoutes from '../server/routes/leaves.js';
import holidaysRoutes from '../server/routes/holidays.js';
import announcementsRoutes from '../server/routes/announcements.js';
import notificationsRoutes from '../server/routes/notifications.js';
import dashboardRoutes from '../server/routes/dashboard.js';
import settingsRoutes from '../server/routes/settings.js';
import profileRoutes from '../server/routes/profile.js';
import kpiRoutes from '../server/routes/kpi.js';
import clientsRoutes from '../server/routes/clients.js';
import policiesRoutes from '../server/routes/policies.js';
import reportsRoutes from '../server/routes/reports.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'HRMS MVP Backend (Vercel Serverless)',
    serverTime: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leavesRoutes);
app.use('/api/holidays', holidaysRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/kpi', kpiRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/policies', policiesRoutes);
app.use('/api/reports', reportsRoutes);

// Fallback 404 for unhandled API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error', details: err.stack });
});

export default app;
