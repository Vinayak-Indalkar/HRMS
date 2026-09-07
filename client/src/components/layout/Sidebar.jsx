import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  ContactRound,
  Clock3,
  CalendarDays,
  CalendarCheck,
  Megaphone,
  Files,
  ChartNoAxesCombined,
  CircleUserRound,
  Settings,
  Target,
  UsersRound,
  UserCheck,
  ClipboardCheck,
  CalendarRange,
  UserCog,
  ShieldCheck,
  Building2,
  BriefcaseBusiness,
  History,
  UserPlus,
  ClipboardList,
  Library,
  Tags,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  LogOut,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ activePage, onNavigate, isMobileOpen, setIsMobileOpen, isCollapsed = false }) => {
  const { user, logout } = useAuth();
  const role = user?.role || 'employee';

  // Submenu expansion state
  const [expandedMenus, setExpandedMenus] = useState({});

  useEffect(() => {
    if (['my-corner', 'my-attendance', 'my-leave'].includes(activePage)) {
      setExpandedMenus(prev => ({ ...prev, 'my-corner': true }));
    }
  }, [activePage]);

  const toggleSubmenu = (menuKey) => {
    setExpandedMenus((prev) => ({ ...prev, [menuKey]: !prev[menuKey] }));
  };

  // Construct Role-Specific Navigation according to requirements
  const getRoleNav = () => {
    // 1. Super Admin: Dashboard, Client Setup, User Management, Roles & Permissions, Company Attendance, Leaves, Holidays, Announcements, Policies, Reports, Audit Logs, Settings
    if (role === 'super_admin') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'client-setup', label: 'Client Setup', icon: Building2, matchPages: ['client-setup', 'clients'] },
        { id: 'user-management', label: 'User Management', icon: UserCog, matchPages: ['user-management'] },
        { id: 'roles-permissions', label: 'Roles & Permissions', icon: ShieldCheck, matchPages: ['roles-permissions'] },
        { id: 'admin-attendance', label: 'Employee Attendance', icon: Clock3, matchPages: ['admin-attendance', 'attendance'] },
        { id: 'admin-leaves', label: 'Leave Governance', icon: CalendarDays, matchPages: ['admin-leaves', 'leaves'] },
        { id: 'holidays', label: 'Holiday Management', icon: CalendarCheck, matchPages: ['holidays'] },
        { id: 'announcements', label: 'Announcements', icon: Megaphone, matchPages: ['announcements'] },
        { id: 'company-policies', label: 'Company Policies', icon: BookOpen, matchPages: ['company-policies', 'policies'] },
        { id: 'reports', label: 'Reports & Analytics', icon: ChartNoAxesCombined, matchPages: ['reports', 'kpi-reports'] },
        { id: 'audit-logs', label: 'Security & Audit Logs', icon: History, matchPages: ['audit-logs'] },
        { id: 'settings', label: 'System Settings', icon: Settings, matchPages: ['settings'] }
      ];
    }

    // 2. HR Admin: Dashboard, Employees, Employee Attendance, Leave Management, Holidays, Announcements, Company Policies, Reports, Directory
    if (role === 'hr_admin') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'employee-management', label: 'Employees', icon: Users, matchPages: ['employee-management'] },
        { id: 'admin-attendance', label: 'Employee Attendance', icon: Clock3, matchPages: ['admin-attendance', 'attendance'] },
        { id: 'admin-leaves', label: 'Leave Management', icon: CalendarDays, matchPages: ['admin-leaves', 'leaves'] },
        { id: 'holidays', label: 'Holiday Management', icon: CalendarCheck, matchPages: ['holidays'] },
        { id: 'announcements', label: 'Announcements', icon: Megaphone, matchPages: ['announcements'] },
        { id: 'company-policies', label: 'Company Policies', icon: BookOpen, matchPages: ['company-policies', 'policies'] },
        { id: 'reports', label: 'Reports', icon: ChartNoAxesCombined, matchPages: ['reports', 'kpi-reports'] },
        { id: 'directory', label: 'Company Directory', icon: ContactRound, matchPages: ['directory'] }
      ];
    }

    // 3. Manager: Dashboard, My Team, Team Attendance, Leave Approvals, Team Leave Calendar, Directory
    if (role === 'manager') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'team-roster', label: 'My Team', icon: UsersRound, matchPages: ['team-roster'] },
        { id: 'team-attendance', label: 'Team Attendance', icon: UserCheck, matchPages: ['team-attendance'] },
        { id: 'leave-approvals', label: 'Leave Approvals', icon: ClipboardCheck, matchPages: ['leave-approvals'] },
        { id: 'team-leave-calendar', label: 'Team Leave Calendar', icon: CalendarRange, matchPages: ['team-leave-calendar', 'team-leave', 'apply-team-leave'] },
        { id: 'directory', label: 'Directory', icon: ContactRound, matchPages: ['directory'] }
      ];
    }

    // 4. Employee: Dashboard, Attendance, Leave Management, Holiday Calendar, Announcements, Company Policies, Directory
    return [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'my-attendance', label: 'Attendance', icon: Clock3, matchPages: ['my-attendance', 'attendance'] },
      { id: 'my-leave', label: 'Leave Management', icon: CalendarDays, matchPages: ['my-leave', 'leaves'] },
      { id: 'holidays', label: 'Holiday Calendar', icon: CalendarCheck, matchPages: ['holidays'] },
      { id: 'announcements', label: 'Announcements', icon: Megaphone, matchPages: ['announcements'] },
      { id: 'company-policies', label: 'Company Policies', icon: BookOpen, matchPages: ['company-policies', 'policies'] },
      { id: 'directory', label: 'Directory', icon: ContactRound, matchPages: ['directory'] }
    ];
  };

  const navItems = getRoleNav();

  const handleNavClick = (item) => {
    if (item.action) {
      item.action();
    } else {
      onNavigate(item.id);
    }
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 bg-slate-900 text-white flex flex-col transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isCollapsed ? 'lg:w-20 w-64' : 'w-64'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Brand Header */}
        <div
          className={`h-16 flex items-center border-b border-slate-800 shrink-0 bg-slate-950/40 transition-all duration-300 ${
            isCollapsed ? 'lg:justify-center lg:px-2 px-5 gap-3' : 'gap-3 px-5'
          }`}
        >
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-md shrink-0">
            <img
              src="/sidebar-logo.png"
              alt="Quantira Technologies"
              className="w-full h-full object-contain"
            />
          </div>
          <div className={`min-w-0 flex-1 transition-opacity duration-300 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
            <h1 className="text-xs font-bold tracking-tight text-white leading-tight truncate">Quantira Technologies</h1>
            <p className="text-[10px] font-medium text-sky-400 tracking-wide uppercase">HRMS Suite</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav
          aria-label="Main Navigation"
          className={`flex-1 overflow-y-auto py-3 space-y-1 transition-all duration-300 ${
            isCollapsed ? 'lg:px-2.5 px-3' : 'px-3'
          }`}
        >
          {/* Quick Profile Card (Non-collapsed) */}
          {!isCollapsed && (
            <div className="mb-3">
              <button
                onClick={() => onNavigate('my-profile')}
                title="Open My Profile"
                className={`w-full group relative overflow-hidden rounded-2xl transition-all duration-300 text-left border p-2.5 ${
                  activePage === 'my-profile'
                    ? 'bg-gradient-to-r from-indigo-900/90 to-indigo-800/90 border-indigo-500 shadow-lg shadow-indigo-950/60 ring-2 ring-indigo-500/30'
                    : 'bg-gradient-to-br from-slate-800/90 via-slate-800/60 to-slate-900/90 border-slate-700/60 hover:border-indigo-500/50 hover:bg-slate-800 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`}
                        alt={user?.name}
                        className="w-8 h-8 rounded-xl object-cover ring-2 ring-indigo-500/40 group-hover:ring-indigo-400 transition-all shadow-md"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border border-slate-900 rounded-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate group-hover:text-indigo-200">
                        {user?.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {user?.employee_code} • {user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'hr_admin' ? 'HR Admin' : user?.role === 'manager' ? 'Manager' : 'Employee'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white shrink-0" />
                </div>
              </button>
            </div>
          )}

          {!isCollapsed && (
            <p className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Main Menu
            </p>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isSubmenuActive = item.hasSubmenu && item.subItems?.some((sub) => activePage === sub.id || (sub.matchPages && sub.matchPages.includes(activePage)));
            const isActive = activePage === item.id || (item.matchPages && item.matchPages.includes(activePage)) || isSubmenuActive;
            const isExpanded = expandedMenus[item.menuKey];

            if (item.hasSubmenu) {
              return (
                <div key={item.id} className="space-y-1">
                  <button
                    onClick={() => {
                      if (isCollapsed) {
                        onNavigate(item.subItems[0].id);
                      } else {
                        toggleSubmenu(item.menuKey);
                        if (item.id) {
                          onNavigate(item.id);
                        }
                      }
                    }}
                    title={item.label}
                    aria-label={item.label}
                    className={`w-full flex items-center rounded-xl text-sm font-medium transition-all group relative focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none ${
                      isCollapsed
                        ? 'lg:justify-center lg:p-2.5 justify-between px-3.5 py-2.5'
                        : 'justify-between px-3.5 py-2'
                    } ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className={`flex items-center ${isCollapsed ? 'lg:justify-center gap-3' : 'gap-3'}`}>
                      <Icon
                        className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                        aria-hidden="true"
                      />
                      <span className={`truncate text-xs font-semibold ${isCollapsed ? 'lg:hidden' : 'inline'}`}>
                        {item.label}
                      </span>
                    </div>

                    {/* Collapsed rail hover tooltip with submenu options */}
                    {isCollapsed && (
                      <div
                        className="hidden lg:group-hover:flex absolute left-full ml-3 px-3 py-2 bg-slate-950 text-white text-xs font-semibold rounded-xl shadow-2xl border border-slate-800 whitespace-nowrap z-50 pointer-events-none flex-col gap-1"
                        role="tooltip"
                      >
                        <span className="font-bold text-indigo-400 flex items-center gap-1.5 border-b border-slate-800 pb-1">
                          <Icon className="w-3.5 h-3.5" /> {item.label}
                        </span>
                        {item.subItems?.map((sub) => (
                          <span key={sub.id} className="text-[11px] text-slate-300 font-normal">
                            • {sub.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>

                  {/* Expanded Submenu items */}
                  {!isCollapsed && isExpanded && (
                    <div className="pl-4 pr-1 space-y-0.5 border-l border-slate-800/80 ml-4 animate-in fade-in">
                      {item.subItems.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = activePage === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => handleNavClick(sub)}
                            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              isSubActive
                                ? 'bg-indigo-500/20 text-indigo-300 font-bold border-r-2 border-indigo-500'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                            }`}
                          >
                            <SubIcon
                              className={`w-4 h-4 shrink-0 ${
                                isSubActive ? 'text-indigo-400' : 'text-slate-500'
                              }`}
                            />
                            <span className="truncate">{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Normal Menu Item without submenus
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                title={item.label}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center rounded-xl text-sm font-medium transition-all group relative focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none ${
                  isCollapsed
                    ? 'lg:justify-center lg:p-2.5 justify-between px-3.5 py-2.5'
                    : 'justify-between px-3.5 py-2'
                } ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <div className={`flex items-center ${isCollapsed ? 'lg:justify-center gap-3' : 'gap-3'}`}>
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                    aria-hidden="true"
                  />
                  <span className={`truncate text-xs font-semibold ${isCollapsed ? 'lg:hidden' : 'inline'}`}>
                    {item.label}
                  </span>
                </div>

                {/* Floating tooltip for collapsed rail view on desktop */}
                {isCollapsed && (
                  <div
                    className="hidden lg:group-hover:flex absolute left-full ml-3 px-2.5 py-1.5 bg-slate-950 text-white text-xs font-semibold rounded-xl shadow-2xl border border-slate-800 whitespace-nowrap z-50 pointer-events-none items-center gap-1.5"
                    role="tooltip"
                  >
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Fixed Position Logout Button at Left Bottom */}
        <div
          className={`p-3 border-t border-slate-800/80 bg-slate-950/60 shrink-0 transition-all duration-300 ${
            isCollapsed ? 'lg:p-2' : 'p-3'
          }`}
        >
          <button
            onClick={() => {
              if (setIsMobileOpen) setIsMobileOpen(false);
              logout();
            }}
            title="Log Out of System"
            aria-label="Log Out"
            className={`w-full flex items-center rounded-xl text-sm font-semibold transition-all group relative border border-rose-900/40 bg-rose-950/20 hover:bg-rose-600 text-rose-300 hover:text-white shadow-sm hover:shadow-lg hover:shadow-rose-950/50 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none ${
              isCollapsed
                ? 'lg:justify-center lg:p-2.5 justify-between px-3.5 py-2.5'
                : 'justify-between px-3.5 py-2'
            }`}
          >
            <div className={`flex items-center ${isCollapsed ? 'lg:justify-center gap-3' : 'gap-3'}`}>
              <LogOut
                className="w-5 h-5 shrink-0 text-rose-400 group-hover:text-white transition-transform group-hover:-translate-x-0.5"
                aria-hidden="true"
              />
              <span className={`truncate text-xs tracking-wide ${isCollapsed ? 'lg:hidden' : 'inline'}`}>
                Log Out
              </span>
            </div>

            {/* Collapsed rail hover tooltip */}
            {isCollapsed && (
              <div
                className="hidden lg:group-hover:flex absolute left-full ml-3 px-2.5 py-1.5 bg-rose-950 text-white text-xs font-semibold rounded-xl shadow-2xl border border-rose-800 whitespace-nowrap z-50 pointer-events-none items-center gap-1.5"
                role="tooltip"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-300" />
                Log Out
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

