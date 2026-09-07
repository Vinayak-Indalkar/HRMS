import { formatTime } from '../../utils/formatters';
import React, { useState, useEffect } from 'react';
import { Clock, Play, Square, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import LiveTimer from './LiveTimer';
import Badge from './Badge';
import ConfirmDialog from './ConfirmDialog';

export const PunchCard = ({ onStatusChange, compact = false, className = '' }) => {
  const [attData, setAttData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPunchOutConfirm, setShowPunchOutConfirm] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchAttendance = async () => {
    try {
      const data = await api.getTodayAttendance();
      setAttData(data);
      if (onStatusChange) onStatusChange(data);
    } catch (err) {
      console.error('Failed to fetch attendance status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
    const interval = setInterval(fetchAttendance, 15000);
    return () => clearInterval(interval);
  }, []);

  const handlePunchIn = async () => {
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.punchIn();
      setSuccessMsg('Successfully punched in! Working timer started.');
      await fetchAttendance();
    } catch (err) {
      setError(err.message || 'Failed to punch in');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePunchOutClick = () => {
    setShowPunchOutConfirm(true);
  };

  const handleConfirmPunchOut = async () => {
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.punchOut();
      setSuccessMsg('Successfully punched out! Shift completed.');
      await fetchAttendance();
      setShowPunchOutConfirm(false);
    } catch (err) {
      setError(err.message || 'Failed to punch out');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetToday = async () => {
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.resetTodayAttendance();
      setSuccessMsg('Attendance reset for today. Ready for fresh test punch!');
      await fetchAttendance();
    } catch (err) {
      setError(err.message || 'Failed to reset attendance');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex items-center justify-center min-h-[120px]">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isWorking = attData?.isWorking;
  const punchInTime = attData?.punchInTime;
  const punchOutTime = attData?.punchOutTime;
  const status = attData?.status || 'Not Punched In';
  const totalHours = attData?.totalWorkingHours ?? attData?.todayRecord?.total_working_hours;
  const todayRecords = attData?.todayRecords || [];

  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-2 bg-slate-100/90 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <LiveTimer startTime={punchInTime} isWorking={isWorking} fixedHours={totalHours} />
        </div>
        {isWorking ? (
          <button
            onClick={handlePunchOutClick}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>{actionLoading ? 'Saving...' : 'Punch Out'}</span>
          </button>
        ) : (
          <button
            onClick={handlePunchIn}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>{actionLoading ? 'Saving...' : status === 'Completed' ? 'Punch In Again' : 'Punch In'}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left: Status & Live Working Timer */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">My Daily Attendance</span>
            <Badge variant={status}>{status}</Badge>
          </div>
          <div className="flex items-baseline gap-3">
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono tracking-tight flex items-center gap-2">
              <LiveTimer
                startTime={punchInTime}
                isWorking={isWorking}
                fixedHours={totalHours}
              />
            </div>
            {isWorking && (
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Live Active Shift
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            {isWorking
              ? 'Working session is live. Timer calculates dynamically from server-recorded punch-in.'
              : status === 'Completed'
              ? `Shift finished today. Total logged: ${totalHours || 0} hours.`
              : 'Click Punch In when beginning work. Server timestamp will be recorded.'}
          </p>
        </div>

        {/* Center: Punch Times */}
        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 min-w-[220px]">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Punch In Time</span>
            <span className="text-sm font-bold text-slate-800">
              {punchInTime
                ? formatTime(punchInTime)
                : '--:--'}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Punch Out Time</span>
            <span className="text-sm font-bold text-slate-800">
              {punchOutTime
                ? formatTime(punchOutTime)
                : '--:--'}
            </span>
          </div>
        </div>

        {/* Right: Big Action Button */}
        <div className="flex flex-col items-stretch md:items-end min-w-[180px]">
          {error && (
            <p role="alert" className="text-xs text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-200 mb-2">
              {error}
            </p>
          )}
          {successMsg && (
            <p role="status" aria-live="polite" className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-xl border border-emerald-200 mb-2">
              {successMsg}
            </p>
          )}

          {isWorking ? (
            <button
              type="button"
              onClick={handlePunchOutClick}
              disabled={actionLoading}
              aria-label="Punch out from work"
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold shadow-lg shadow-rose-600/30 transition-all text-sm focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <Square className="w-4 h-4 fill-current" aria-hidden="true" />
              <span>{actionLoading ? 'Recording...' : 'Punch Out'}</span>
            </button>
          ) : (
            <div className="flex flex-col items-center gap-2 w-full">
              <button
                type="button"
                onClick={handlePunchIn}
                disabled={actionLoading}
                aria-label={status === 'Completed' ? 'Punch in again for another work session' : 'Punch in to start work'}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold shadow-lg text-sm transition-all bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-emerald-600/30 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                <span>
                  {actionLoading
                    ? 'Recording...'
                    : status === 'Completed'
                    ? 'Punch In Again'
                    : 'Punch In'}
                </span>
              </button>
              {status === 'Completed' && (
                <button
                  type="button"
                  onClick={handleResetToday}
                  disabled={actionLoading}
                  aria-label="Reset today's attendance for demo"
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold hover:underline transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 rounded px-1"
                >
                  ↺ Reset Today for Demo
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Punch Out Confirmation Popup */}
      <ConfirmDialog
        isOpen={showPunchOutConfirm}
        onClose={() => setShowPunchOutConfirm(false)}
        onConfirm={handleConfirmPunchOut}
        title="Confirm Punch Out"
        message="Are you sure you really want to punch out? Your current working session will be stopped and your work hours will be recorded."
        confirmText="Yes, Punch Out"
        cancelText="Cancel"
        danger={true}
        loading={actionLoading}
      />
    </div>
  );
};

export default PunchCard;
