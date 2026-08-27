import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { Clock, Check, X, Sparkles, Shield, AlertCircle } from 'lucide-react';

interface AdminShiftModalProps {
  member: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSaveShift: (uid: string, shiftStart: string, shiftEnd: string) => Promise<void>;
}

const PRESET_SHIFTS = [
  {
    name: 'Morning Shift (Hurain & Faiza)',
    start: '09:30',
    end: '18:30',
    duration: '9 Hours',
    desc: '09:30 AM – 06:30 PM PKT • 30m grace limit: 10:00 AM',
  },
  {
    name: 'Midday Shift (Aazmeer)',
    start: '12:00',
    end: '21:00',
    duration: '9 Hours',
    desc: '12:00 PM – 09:00 PM PKT • 30m grace limit: 12:30 PM',
  },
  {
    name: 'Standard 9h Lead Shift',
    start: '10:30',
    end: '19:30',
    duration: '9 Hours',
    desc: '10:30 AM – 07:30 PM PKT • 30m grace limit: 11:00 AM',
  },
];

export const AdminShiftModal: React.FC<AdminShiftModalProps> = ({
  member,
  isOpen,
  onClose,
  onSaveShift,
}) => {
  const [shiftStart, setShiftStart] = useState(member.shiftStart || '09:30');
  const [shiftEnd, setShiftEnd] = useState(member.shiftEnd || '18:30');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate duration in hours and minutes
  const calculateDuration = (start: string, end: string) => {
    try {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      let diffM = (eh * 60 + em) - (sh * 60 + sm);
      if (diffM < 0) diffM += 24 * 60; // Overnight
      const hrs = Math.floor(diffM / 60);
      const mins = diffM % 60;
      return `${hrs}h ${mins > 0 ? `${mins}m` : ''}`.trim();
    } catch {
      return '9h';
    }
  };

  const currentDuration = calculateDuration(shiftStart, shiftEnd);

  // 30-minute grace limit
  const getGraceLimit = (start: string) => {
    try {
      const [sh, sm] = start.split(':').map(Number);
      const totalM = sh * 60 + sm + 30;
      const gh = Math.floor(totalM / 60) % 24;
      const gm = totalM % 60;
      const period = gh >= 12 ? 'PM' : 'AM';
      const dh = gh % 12 === 0 ? 12 : gh % 12;
      return `${dh}:${String(gm).padStart(2, '0')} ${period}`;
    } catch {
      return '--:--';
    }
  };

  const handleApplyPreset = (start: string, end: string) => {
    setShiftStart(start);
    setShiftEnd(end);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftStart || !shiftEnd) {
      setErrorMsg('Please specify valid start and end times');
      return;
    }
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await onSaveShift(member.uid, shiftStart, shiftEnd);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update shift');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0F1A]/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#161B27] border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Change Shift Schedule
              </h3>
              <p className="text-xs text-slate-400">
                Configure official 9-hour shift timing for <strong>{member.name}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Quick Shift Presets */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Quick Shift Presets (9 Hours)
          </label>
          <div className="grid grid-cols-1 gap-2">
            {PRESET_SHIFTS.map((preset, idx) => {
              const isSelected = shiftStart === preset.start && shiftEnd === preset.end;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset.start, preset.end)}
                  className={`text-left p-3 rounded-2xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                      : 'bg-[#1F2636] border-slate-700/80 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{preset.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 text-[10px] font-mono font-bold">
                        {preset.start} – {preset.end}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{preset.desc}</p>
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Start & End Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="p-4 rounded-2xl bg-[#1F2636] border border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Custom Timings</span>
              <span className="text-[11px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                Calculated Duration: {currentDuration}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Shift Start (24h or Time)
                </label>
                <input
                  type="time"
                  required
                  value={shiftStart}
                  onChange={(e) => setShiftStart(e.target.value)}
                  className="w-full bg-[#161B27] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Shift End (24h or Time)
                </label>
                <input
                  type="time"
                  required
                  value={shiftEnd}
                  onChange={(e) => setShiftEnd(e.target.value)}
                  className="w-full bg-[#161B27] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Shift Rules Info Pill */}
            <div className="bg-[#161B27] rounded-xl p-2.5 border border-slate-700/50 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center justify-between text-slate-300">
                <span>30-Minute Grace Cutoff:</span>
                <strong className="text-amber-400 font-mono">{getGraceLimit(shiftStart)}</strong>
              </div>
              <p className="text-[10px] text-slate-500">
                Clock-ins after {getGraceLimit(shiftStart)} will be flagged as <strong>Late</strong> in HR reports.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#1F2636] hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors border border-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
            >
              {isSaving ? 'Saving Shift...' : 'Save Shift Schedule'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
