import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({ message, type = 'success', onClose }) => {
  if (!message) return null;

  const typeConfig = {
    success: {
      icon: CheckCircle2,
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      iconColor: 'text-emerald-500'
    },
    error: {
      icon: AlertCircle,
      bg: 'bg-rose-50 text-rose-800 border-rose-200',
      iconColor: 'text-rose-500'
    },
    info: {
      icon: Info,
      bg: 'bg-blue-50 text-blue-800 border-blue-200',
      iconColor: 'text-blue-500'
    }
  };

  const config = typeConfig[type] || typeConfig.success;
  const Icon = config.icon;

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-fade-in max-w-sm">
      <div className={`flex items-center gap-3 p-4 rounded-xl border shadow-lg ${config.bg}`}>
        <Icon className={`w-5 h-5 shrink-0 ${config.iconColor}`} />
        <p className="text-sm font-medium flex-1">{message}</p>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Toast;
