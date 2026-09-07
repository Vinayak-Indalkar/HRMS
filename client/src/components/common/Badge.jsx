import React from 'react';

export const Badge = ({ children, variant = 'default', size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm font-semibold'
  };

  // Distinct color palettes for every status across the application:
  const variantMap = {
    // 1. Emerald / Forest Green: Approved, Published, Present, Verified, Active, On Track
    present: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/20',
    present_status: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/20',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/20',
    published: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/20',
    verified: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/20',
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/20',
    'on track': 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/20',
    on_track: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/20',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/20',
    'earned leave (el)': 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/20',

    // 2. Teal / Deep Sea: Completed, Handed Over
    completed: 'bg-teal-50 text-teal-700 border-teal-200 ring-1 ring-teal-500/20',
    'handed over': 'bg-teal-50 text-teal-700 border-teal-200 ring-1 ring-teal-500/20',
    handed_over: 'bg-teal-50 text-teal-700 border-teal-200 ring-1 ring-teal-500/20',
    teal: 'bg-teal-50 text-teal-700 border-teal-200 ring-1 ring-teal-500/20',

    // 3. Electric Blue: Working, Working Now, Active Shift
    working: 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/20',
    'working now': 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/20',
    blue: 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/20',

    // 4. Sky Blue: L1 Approved, Assigned, Manager, In Progress, Half Day Leave
    'l1 approved': 'bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-sky-500/20',
    assigned: 'bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-sky-500/20',
    'in progress': 'bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-sky-500/20',
    manager: 'bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-sky-500/20',
    'pending setup': 'bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-sky-500/20',
    sky: 'bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-sky-500/20',
    info: 'bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-sky-500/20',
    'half day leave': 'bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-sky-500/20',
    'half day leave (hd)': 'bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-sky-500/20',

    // 5. Amber / Warm Gold: Pending, Draft, Pending Verification, Submitted
    pending: 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/20',
    'pending approval': 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/20',
    draft: 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/20',
    'pending verification': 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/20',
    submitted: 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/20',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/20',
    amber: 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/20',
    'leave without pay (lwp)': 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/20',
    restricted: 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/20',
    'restricted holiday': 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/20',

    // 6. Yellow: Half Day attendance
    'half day': 'bg-yellow-50 text-yellow-800 border-yellow-300 ring-1 ring-yellow-500/20',
    'half-day': 'bg-yellow-50 text-yellow-800 border-yellow-300 ring-1 ring-yellow-500/20',
    yellow: 'bg-yellow-50 text-yellow-800 border-yellow-300 ring-1 ring-yellow-500/20',

    // 7. Vivid Orange: Pending L2 / HR, Pending Handover, Late Arrival, Pending Regularization, Needs Attention
    'pending l2 / hr': 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-500/20',
    'pending handover': 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-500/20',
    pending_handover: 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-500/20',
    'pending regularization': 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-500/20',
    late: 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-500/20',
    'late arrival': 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-500/20',
    'needs attention': 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-500/20',
    needs_attention: 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-500/20',
    orange: 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-500/20',

    // 8. Royal Indigo: Unpublished, Regularized, Mandatory, Super Admin
    unpublished: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-500/20',
    regularized: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-500/20',
    mandatory: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-500/20',
    super_admin: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-500/20',
    'super admin': 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-500/20',
    'casual leave (cl)': 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-500/20',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-500/20',
    primary: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-500/20',

    // 9. Deep Purple: Archived, On Leave, In Review, Optional
    archived: 'bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-500/20',
    'on leave': 'bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-500/20',
    leave: 'bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-500/20',
    'in review': 'bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-500/20',
    in_review: 'bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-500/20',
    optional: 'bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-500/20',
    purple: 'bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-500/20',

    // 10. Violet: HR Admin, Admin, Probation
    hr_admin: 'bg-violet-50 text-violet-700 border-violet-200 ring-1 ring-violet-500/20',
    'hr admin': 'bg-violet-50 text-violet-700 border-violet-200 ring-1 ring-violet-500/20',
    admin: 'bg-violet-50 text-violet-700 border-violet-200 ring-1 ring-violet-500/20',
    probation: 'bg-violet-50 text-violet-700 border-violet-200 ring-1 ring-violet-500/20',
    violet: 'bg-violet-50 text-violet-700 border-violet-200 ring-1 ring-violet-500/20',

    // 11. Fuchsia / Magenta: Early Out, Notice Period
    'early out': 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 ring-1 ring-fuchsia-500/20',
    'early departure': 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 ring-1 ring-fuchsia-500/20',
    'notice period': 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 ring-1 ring-fuchsia-500/20',
    notice_period: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 ring-1 ring-fuchsia-500/20',
    fuchsia: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 ring-1 ring-fuchsia-500/20',
    pink: 'bg-pink-50 text-pink-700 border-pink-200 ring-1 ring-pink-500/20',

    // 12. Rose / Crimson Red: Absent, Rejected, Expired, Terminated, Suspended, At Risk
    absent: 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500/20',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500/20',
    expired: 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500/20',
    terminated: 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500/20',
    suspended: 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500/20',
    'at risk': 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500/20',
    at_risk: 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500/20',
    'sick leave (sl)': 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500/20',
    danger: 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500/20',
    error: 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500/20',
    rose: 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500/20',

    // 13. Slate / Neutral: Inactive, Cancelled, Not Punched In, Weekend, Employee
    inactive: 'bg-slate-100 text-slate-700 border-slate-300 ring-1 ring-slate-400/20',
    cancelled: 'bg-slate-100 text-slate-700 border-slate-300 ring-1 ring-slate-400/20',
    'not punched in': 'bg-slate-100 text-slate-600 border-slate-200 ring-1 ring-slate-400/20',
    weekend: 'bg-slate-100 text-slate-600 border-slate-200 ring-1 ring-slate-400/20',
    employee: 'bg-slate-100 text-slate-700 border-slate-200 ring-1 ring-slate-400/20',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200 ring-1 ring-slate-400/20',
    default: 'bg-slate-100 text-slate-700 border-slate-200 ring-1 ring-slate-400/20'
  };

  const resolveClass = () => {
    // 1. Direct match by variant
    if (variant && variantMap[variant]) return variantMap[variant];

    // 2. Case-insensitive match by variant
    if (variant) {
      const lower = String(variant).trim().toLowerCase();
      if (variantMap[lower]) return variantMap[lower];
    }

    // 3. Match by children content string
    if (typeof children === 'string') {
      const lowerChild = children.trim().toLowerCase();
      if (variantMap[lowerChild]) return variantMap[lowerChild];
    }

    return variantMap.default;
  };

  const variantClass = resolveClass();

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold capitalize rounded-full border shadow-2xs ${sizeClasses[size] || sizeClasses.md} ${variantClass}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 shrink-0"></span>
      {children}
    </span>
  );
};

export default Badge;
