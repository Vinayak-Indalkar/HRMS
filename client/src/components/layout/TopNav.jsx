import { formatTime } from '../../utils/formatters';
import { formatDate } from '../../utils/formatters';
import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Bell,
  Calendar,
  ChevronDown,
  User,
  LogOut,
  RefreshCw,
  Check,
  Shield,
  ShieldCheck,
  UsersRound,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import Badge from '../common/Badge';

const getNotificationInitials = (n) => {
  if (n.sender_name) {
    return n.sender_name
      .split(' ')
      .filter(Boolean)
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
  if (n.message) {
    const match = n.message.match(/^([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)/);
    if (match) {
      return match[1]
        .split(' ')
        .filter(p => !p.endsWith('.'))
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
    }
  }
  if (n.title) {
    return n.title
      .split(' ')
      .filter(Boolean)
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
  return 'NT';
};

const getAvatarColor = (str) => {
  const colors = [
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'bg-amber-100 text-amber-700 border-amber-200',
    'bg-rose-100 text-rose-700 border-rose-200',
    'bg-purple-100 text-purple-700 border-purple-200',
    'bg-cyan-100 text-cyan-700 border-cyan-200',
  ];
  let hash = 0;
  for (let i = 0; i < (str || '').length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const TopNav = ({ onMenuClick, onNavigate }) => {
  const { user, availableRoles, switchActiveRole, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();

  // Dropdowns
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);
  const profileRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRoleSelect = async (roleKey) => {
    if (roleKey === user?.role) {
      setShowProfileDropdown(false);
      return;
    }
    setSwitchingRole(true);
    try {
      await switchActiveRole(roleKey);
      setShowProfileDropdown(false);
      onNavigate('dashboard');
    } catch (err) {
      console.error('Role switch failed:', err);
    } finally {
      setSwitchingRole(false);
    }
  };

  const formatRoleName = (r) => {
    if (!r) return 'Employee';
    switch (r.toLowerCase()) {
      case 'super_admin': return 'Super Admin';
      case 'hr_admin': return 'HR Admin';
      case 'manager': return 'Manager';
      case 'employee': return 'Employee';
      default: return r.replace(/_/g, ' ');
    }
  };

  const getRoleIcon = (r) => {
    switch ((r || '').toLowerCase()) {
      case 'super_admin': return ShieldCheck;
      case 'hr_admin': return Shield;
      case 'manager': return UsersRound;
      case 'employee': return UserCheck;
      default: return User;
    }
  };

  const todayDisplay = formatDate(new Date());

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 shadow-sm">
      {/* Left side: Hamburger + Date */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Toggle navigation menu"
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none transition-colors"
          title="Toggle Menu"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200">
          <Calendar className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          <span>{todayDisplay}</span>
        </div>
      </div>

      {/* Right side: Notification Bell + Profile */}
      <div className="flex items-center gap-3">

        {/* Notification Bell Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
            aria-expanded={showNotifs}
            aria-haspopup="dialog"
            className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none transition-colors border border-transparent hover:border-slate-200"
          >
            <Bell className="w-5 h-5" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div
              role="region"
              aria-label="Notifications Panel"
              className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in z-50"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-rose-100 text-rose-700 rounded-full font-semibold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium focus-visible:underline focus-visible:outline-none"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100" role="feed" aria-label="Notification list">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">No notifications yet</div>
                ) : (
                  notifications.map((n) => {
                    const initials = getNotificationInitials(n);
                    const avatarColor = getAvatarColor(initials);
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          markAsRead(n.id);
                          if (n.link) {
                            const route = n.link.replace('/', '');
                            onNavigate(route || 'dashboard');
                            setShowNotifs(false);
                          }
                        }}
                        className={`w-full p-3.5 hover:bg-slate-50 transition-colors text-left flex items-start gap-3 focus-visible:bg-slate-50 focus-visible:outline-none ${
                          !n.is_read ? 'bg-indigo-50/40' : ''
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-full font-bold flex items-center justify-center text-xs shrink-0 border shadow-xs ${avatarColor}`}
                          aria-hidden="true"
                        >
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-xs ${!n.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                              {n.title}
                            </p>
                            {!n.is_read && <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1" aria-hidden="true"></span>}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {formatTime(n.createdAt)}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Identity Chip & Interactive Role Switcher Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            aria-expanded={showProfileDropdown}
            aria-haspopup="menu"
            className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-xs hover:bg-slate-100/80 hover:border-slate-300 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none group"
          >
            <div className="relative shrink-0">
              <img
                src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`}
                alt={`${user?.name || 'User'}'s profile picture`}
                className="w-8 h-8 rounded-full object-cover bg-slate-200 ring-1 ring-slate-300"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div className="hidden sm:block text-left pr-1">
              <div className="flex items-center gap-1">
                <p className="text-xs font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
                  {user?.name}
                </p>
                {switchingRole && <div className="w-2.5 h-2.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin ml-1" />}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant={user?.role} size="sm">
                  {formatRoleName(user?.role)}
                </Badge>
                {availableRoles.length > 1 && (
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">
                    {availableRoles.length} roles
                  </span>
                )}
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${showProfileDropdown ? 'rotate-180 text-indigo-600' : ''}`} />
          </button>

          {/* Profile & Role Switcher Menu */}
          {showProfileDropdown && (
            <div
              role="menu"
              aria-label="User Account and Role Selection"
              className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in z-50 divide-y divide-slate-100"
            >
              {/* Header Info */}
              <div className="p-4 bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-50">
                <div className="flex items-center gap-3">
                  <img
                    src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`}
                    alt={user?.name}
                    className="w-11 h-11 rounded-2xl object-cover ring-2 ring-indigo-500/20 bg-white shadow-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{user?.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono text-slate-400 font-semibold">{user?.employee_code || 'EMP'}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[10px] font-semibold text-slate-600">{user?.department_name || user?.designation || 'Active'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Role Switcher Section */}
              <div className="p-3">
                <div className="flex items-center justify-between px-2 pb-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                    Switch Role View
                  </span>
                  {availableRoles.length > 1 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Multi-Role Enabled
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {['employee', 'manager', 'hr_admin', 'super_admin'].map((roleKey) => {
                    const isCurrent = (user?.role || '').toLowerCase() === roleKey.toLowerCase();
                    const RoleIcon = getRoleIcon(roleKey);

                    return (
                      <button
                        key={roleKey}
                        type="button"
                        onClick={() => handleRoleSelect(roleKey)}
                        disabled={switchingRole}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-indigo-50/80 border border-indigo-200 text-indigo-950 font-bold shadow-xs'
                            : 'hover:bg-slate-50 border border-transparent text-slate-700 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isCurrent ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                          }`}>
                            <RoleIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs truncate">{formatRoleName(roleKey)}</p>
                            <p className="text-[10px] text-slate-400 font-normal">
                              {roleKey === 'super_admin' && 'Universal administration & settings'}
                              {roleKey === 'hr_admin' && 'HR ops, employees, attendance, policies'}
                              {roleKey === 'manager' && 'Team roster, attendance & approvals'}
                              {roleKey === 'employee' && 'Self-service punch, leaves & policies'}
                            </p>
                          </div>
                        </div>

                        {isCurrent ? (
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white shrink-0 shadow-2xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Action Links */}
              <div className="p-2 space-y-1 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileDropdown(false);
                    onNavigate('my-profile');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-white rounded-xl transition-colors text-left cursor-pointer"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>My Profile & Account</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfileDropdown(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopNav;

