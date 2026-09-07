import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Dashboards
import EmployeeDashboard from './pages/dashboard/EmployeeDashboard';
import ManagerDashboard from './pages/dashboard/ManagerDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';

// Attendance
import MyAttendancePage from './pages/attendance/MyAttendancePage';
import TeamAttendancePage from './pages/attendance/TeamAttendancePage';
import AdminAttendancePage from './pages/attendance/AdminAttendancePage';

// Leave
import MyLeavePage from './pages/leave/MyLeavePage';
import LeaveApprovalsPage from './pages/leave/LeaveApprovalsPage';
import AdminLeavesPage from './pages/leave/AdminLeavesPage';
import TeamLeavePage from './pages/leave/TeamLeavePage';
import ApplyTeamLeavePage from './pages/leave/ApplyTeamLeavePage';
import TeamLeaveCalendarPage from './pages/leave/TeamLeaveCalendarPage';

// Employees & Directory
import DirectoryPage from './pages/employees/DirectoryPage';
import EmployeeManagementPage from './pages/employees/EmployeeManagementPage';
import MyTeamPage from './pages/employees/MyTeamPage';

// Holidays & Announcements
import HolidayCalendarPage from './pages/holidays/HolidayCalendarPage';
import AnnouncementsPage from './pages/announcements/AnnouncementsPage';

// Profile & Settings
import MyProfilePage from './pages/profile/MyProfilePage';
import MyCornerPage from './pages/profile/MyCornerPage';
import SettingsPage from './pages/settings/SettingsPage';
import RolesPermissionsPage from './pages/settings/RolesPermissionsPage';
import AuditLogsPage from './pages/settings/AuditLogsPage';
import ClientSetupPage from './pages/settings/ClientSetupPage';
import CompanyPoliciesPage from './pages/policies/CompanyPoliciesPage';

// KPI Management
import KPIDashboardPage from './pages/kpi/KPIDashboardPage';
import KPILibraryPage from './pages/kpi/KPILibraryPage';
import KPICategoriesPage from './pages/kpi/KPICategoriesPage';
import KPIAssignmentsPage from './pages/kpi/KPIAssignmentsPage';
import KPIReviewsPage from './pages/kpi/KPIReviewsPage';
import KPIReportsPage from './pages/kpi/KPIReportsPage';
import KPISettingsPage from './pages/kpi/KPISettingsPage';
import KPIHistoryPage from './pages/kpi/KPIHistoryPage';
import MyKPIsPage from './pages/kpi/MyKPIsPage';
import ReportsPage from './pages/reports/ReportsPage';

export const App = () => {
  const { user, loading, isAuthenticated } = useAuth();

  // Navigation state
  const [authView, setAuthView] = useState('login'); // 'login' | 'forgot' | 'reset'
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [activePage, setActivePage] = useState('dashboard');

  // When active role changes, ensure activePage is valid for the newly selected role
  React.useEffect(() => {
    if (!user) return;
    const currentRole = user.role || 'employee';

    // List of restricted pages per role
    const adminPages = ['user-management', 'employee-management', 'client-setup', 'clients', 'roles-permissions', 'settings', 'audit-logs'];
    const managerPages = ['team-attendance', 'team-roster', 'team-leave', 'apply-team-leave', 'leave-approvals', 'team-leave-calendar'];
    const managerBlocked = ['my-attendance', 'my-leave', 'announcements', 'company-policies', 'policies', 'my-corner'];

    if (currentRole === 'employee') {
      if (adminPages.includes(activePage) || managerPages.includes(activePage) || activePage === 'my-corner') {
        setActivePage('dashboard');
      }
    } else if (currentRole === 'manager') {
      if (adminPages.includes(activePage) || managerBlocked.includes(activePage)) {
        setActivePage('dashboard');
      }
    } else if (currentRole === 'hr_admin') {
      if (['client-setup', 'clients', 'roles-permissions', 'audit-logs', 'settings', 'my-corner'].includes(activePage) || managerPages.includes(activePage)) {
        setActivePage('dashboard');
      }
    } else if (currentRole === 'super_admin') {
      if (activePage === 'my-corner' || managerPages.includes(activePage)) {
        setActivePage('dashboard');
      }
    }
  }, [user?.role]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="bg-white p-2.5 rounded-2xl shadow-xl">
            <img src="/logo.png" alt="Quantira Technologies" className="h-10 w-auto object-contain" />
          </div>
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mt-2"></div>
          <p className="text-xs font-semibold text-indigo-300 tracking-wider uppercase">Loading Quantira HRMS...</p>
        </div>
      </div>
    );
  }

  // Not authenticated -> show Auth views
  if (!isAuthenticated) {
    if (authView === 'forgot') {
      return (
        <ForgotPasswordPage
          onNavigateToLogin={() => setAuthView('login')}
          onNavigateToReset={(email, token) => {
            setResetEmail(email);
            setResetToken(token);
            setAuthView('reset');
          }}
        />
      );
    }

    if (authView === 'reset') {
      return (
        <ResetPasswordPage
          initialEmail={resetEmail}
          initialToken={resetToken}
          onNavigateToLogin={() => setAuthView('login')}
        />
      );
    }

    return (
      <LoginPage
        onNavigateToForgot={() => setAuthView('forgot')}
      />
    );
  }

  // Authenticated Application Shell
  const role = user?.role || 'employee';

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        if (['admin', 'super_admin', 'hr_admin'].includes(role)) return <AdminDashboard onNavigate={setActivePage} />;
        if (role === 'manager') return <ManagerDashboard onNavigate={setActivePage} />;
        return <EmployeeDashboard onNavigate={setActivePage} />;

      case 'my-corner':
        return <AdminDashboard onNavigate={setActivePage} />;

      case 'directory':
        return <DirectoryPage />;

      case 'my-attendance':
        if (role === 'manager') return <ManagerDashboard onNavigate={setActivePage} />;
        return <MyAttendancePage />;

      case 'team-attendance':
        if (role !== 'manager') return <EmployeeDashboard onNavigate={setActivePage} />;
        return <TeamAttendancePage />;

      case 'team-roster':
        if (role !== 'manager') return <EmployeeDashboard onNavigate={setActivePage} />;
        return <MyTeamPage onNavigate={setActivePage} />;

      case 'attendance':
      case 'admin-attendance':
        if (['admin', 'super_admin', 'hr_admin'].includes(role)) return <AdminAttendancePage />;
        return <MyAttendancePage />;

      case 'my-leave':
        if (role === 'manager') return <ManagerDashboard onNavigate={setActivePage} />;
        return <MyLeavePage />;

      case 'team-leave':
        if (role !== 'manager') return <EmployeeDashboard onNavigate={setActivePage} />;
        return <TeamLeavePage onNavigate={setActivePage} />;

      case 'apply-team-leave':
        if (role !== 'manager') return <EmployeeDashboard onNavigate={setActivePage} />;
        return <ApplyTeamLeavePage onNavigate={setActivePage} />;

      case 'leave-approvals':
        if (role !== 'manager') return <EmployeeDashboard onNavigate={setActivePage} />;
        return <LeaveApprovalsPage onNavigate={setActivePage} />;

      case 'team-leave-calendar':
        if (role !== 'manager') return <EmployeeDashboard onNavigate={setActivePage} />;
        return <TeamLeaveCalendarPage onNavigate={setActivePage} />;

      case 'leaves':
      case 'admin-leaves':
        if (['admin', 'super_admin', 'hr_admin'].includes(role)) return <AdminLeavesPage />;
        return <MyLeavePage />;

      case 'user-management':
      case 'employee-management':
        if (!['admin', 'super_admin', 'hr_admin'].includes(role)) return <EmployeeDashboard onNavigate={setActivePage} />;
        return <EmployeeManagementPage />;

      case 'holidays':
        return <HolidayCalendarPage />;

      case 'announcements':
        if (role === 'manager') return <ManagerDashboard onNavigate={setActivePage} />;
        return <AnnouncementsPage />;

      case 'company-policies':
      case 'policies':
        if (role === 'manager') return <ManagerDashboard onNavigate={setActivePage} />;
        return <CompanyPoliciesPage />;

      case 'my-profile':
        return <MyProfilePage />;

      case 'roles-permissions':
        if (role !== 'super_admin') return <AdminDashboard onNavigate={setActivePage} />;
        return <RolesPermissionsPage />;

      case 'settings':
        if (role !== 'super_admin') return <AdminDashboard onNavigate={setActivePage} />;
        return <SettingsPage />;

      case 'audit-logs':
        if (role !== 'super_admin') return <AdminDashboard onNavigate={setActivePage} />;
        return <AuditLogsPage />;

      case 'client-setup':
      case 'clients':
        if (role !== 'super_admin') return <AdminDashboard onNavigate={setActivePage} />;
        return <ClientSetupPage />;

      case 'kpi-dashboard':
        if (role === 'employee') return <MyKPIsPage onNavigate={setActivePage} />;
        return <KPIDashboardPage onNavigate={setActivePage} />;

      case 'my-kpis':
        return <MyKPIsPage onNavigate={setActivePage} />;

      case 'kpi-library':
        return <KPILibraryPage onNavigate={setActivePage} />;

      case 'kpi-categories':
        return <KPICategoriesPage onNavigate={setActivePage} />;

      case 'kpi-assignments':
        return <KPIAssignmentsPage onNavigate={setActivePage} />;

      case 'kpi-reviews':
        return <KPIReviewsPage onNavigate={setActivePage} />;

      case 'reports':
      case 'kpi-reports':
        return <ReportsPage onNavigate={setActivePage} />;

      case 'kpi-settings':
        return <KPISettingsPage onNavigate={setActivePage} />;

      case 'kpi-history':
        return <KPIHistoryPage onNavigate={setActivePage} />;

      default:
        if (['admin', 'super_admin', 'hr_admin'].includes(role)) return <AdminDashboard onNavigate={setActivePage} />;
        if (role === 'manager') return <ManagerDashboard onNavigate={setActivePage} />;
        return <EmployeeDashboard onNavigate={setActivePage} />;
    }
  };

  return (
    <AppLayout activePage={activePage} onNavigate={setActivePage}>
      {renderContent()}
    </AppLayout>
  );
};

export default App;

