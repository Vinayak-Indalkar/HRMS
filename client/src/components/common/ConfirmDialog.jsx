import React from 'react';
import { AlertTriangle, AlertCircle, CheckCircle, Info } from 'lucide-react';
import Modal from './Modal';

/**
 * Global Reusable Confirmation Modal / Dialog Component
 */
export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Please Confirm',
  message,
  description,
  details = [],
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  variant = 'primary', // 'primary' | 'danger' | 'warning' | 'success'
  warningMessage = '',
  loading = false,
  maxWidth = 'max-w-md'
}) => {
  if (!isOpen) return null;

  const resolvedVariant = danger ? 'danger' : variant;

  const getVariantStyles = () => {
    switch (resolvedVariant) {
      case 'danger':
        return {
          icon: <AlertCircle className="w-5 h-5 text-rose-600" />,
          iconBg: 'bg-rose-50 border border-rose-100',
          btnBg: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
          iconBg: 'bg-amber-50 border border-amber-100',
          btnBg: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
        };
      case 'success':
        return {
          icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
          iconBg: 'bg-emerald-50 border border-emerald-100',
          btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
        };
      case 'primary':
      default:
        return {
          icon: <Info className="w-5 h-5 text-indigo-600" />,
          iconBg: 'bg-indigo-50 border border-indigo-100',
          btnBg: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
        };
    }
  };

  const vStyles = getVariantStyles();
  const promptText = description || message;

  return (
    <Modal isOpen={isOpen} onClose={loading ? () => {} : onClose} title={title} maxWidth={maxWidth}>
      <div className="space-y-4 text-xs">
        {/* Header Icon + Prompt */}
        <div className="flex items-start gap-3.5">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${vStyles.iconBg}`}>
            {vStyles.icon}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            {promptText && (
              <p className="text-sm font-medium text-slate-700 leading-relaxed">
                {promptText}
              </p>
            )}
          </div>
        </div>

        {/* Warning Alert Banner */}
        {warningMessage && (
          <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-800 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>{warningMessage}</span>
          </div>
        )}

        {/* Key-Value Summary Preview */}
        {details && details.length > 0 && (
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
            {details.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-0.5 border-b border-slate-100 last:border-0">
                <span className="text-slate-500 font-medium">{item.label}:</span>
                <span className="text-slate-900 font-bold truncate max-w-[240px] text-right">
                  {item.value || 'None'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2 text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 ${vStyles.btnBg}`}
          >
            {loading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            <span>{loading ? 'Processing...' : confirmText}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export const ConfirmationModal = ConfirmDialog;
export default ConfirmDialog;
