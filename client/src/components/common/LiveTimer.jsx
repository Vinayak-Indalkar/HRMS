import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export const LiveTimer = ({ startTime, isWorking = false, fixedHours = null, className = '' }) => {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    if (!isWorking || !startTime) {
      if (fixedHours !== null && fixedHours !== undefined) {
        const hrs = Math.floor(fixedHours);
        const mins = Math.floor((fixedHours - hrs) * 60);
        const secs = Math.floor(((fixedHours - hrs) * 60 - mins) * 60);
        setElapsed(
          `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        );
      } else {
        setElapsed('00:00:00');
      }
      return;
    }

    const calculateElapsed = () => {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const diffSecs = Math.max(0, Math.floor((now - start) / 1000));

      const hours = Math.floor(diffSecs / 3600);
      const minutes = Math.floor((diffSecs % 3600) / 60);
      const seconds = diffSecs % 60;

      setElapsed(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    calculateElapsed();
    const timer = setInterval(calculateElapsed, 1000);
    return () => clearInterval(timer);
  }, [startTime, isWorking, fixedHours]);

  return (
    <div
      role="timer"
      aria-label={isWorking ? `Working time: ${elapsed}` : `Shift duration: ${elapsed}`}
      className={`inline-flex items-center font-mono font-semibold tracking-wider ${className}`}
    >
      {isWorking && (
        <span className="relative flex h-2.5 w-2.5 mr-2" aria-hidden="true">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
      )}
      <span>{elapsed}</span>
    </div>
  );
};

export default LiveTimer;
