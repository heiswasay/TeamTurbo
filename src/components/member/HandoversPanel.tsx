import React, { useState, useMemo, useEffect } from 'react';
import { Handover, HandoverStatus, UserProfile, DEFAULT_COMPANIES, CompanyTag } from '../../types';
import { formatDateLabel } from '../../lib/dateUtils';
import { 
  ArrowRightLeft, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  User, 
  Building2, 
  Plus, 
  X,
  CheckCheck,
  ChevronDown
} from 'lucide-react';

interface HandoversPanelProps {
  handovers: Handover[];
  teamMembers: UserProfile[];
  companies?: CompanyTag[];
  currentUserId: string;
  currentUserName: string;
  onSendHandover?: (handover: Omit<Handover, 'id' | 'createdAt'>) => Promise<any>;
  onCreateHandover?: (handover: Omit<Handover, 'id' | 'createdAt'>) => Promise<any>;
  onUpdateStatus?: (handoverId: string, status: HandoverStatus) => Promise<void>;
  onAcknowledge?: (handoverId: string) => Promise<void>;
}

export const HandoversPanel: React.FC<HandoversPanelProps> = ({
  handovers = [],
  teamMembers = [],
  companies = [],
  currentUserId,
  currentUserName,
  onSendHandover,
  onCreateHandover,
  onUpdateStatus,
  onAcknowledge,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toUserId, setToUserId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [relatedCompany, setRelatedCompany] = useState(companies?.[0]?.name || DEFAULT_COMPANIES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Available other members to send to
  const otherMembers = useMemo(() => {
    return (teamMembers || []).filter((m) => m.uid !== currentUserId && m.active !== false);
  }, [teamMembers, currentUserId]);

  const activeCompanies = useMemo(() => {
    const list = (companies && companies.length > 0)
      ? companies.filter((c) => !c.archived).map((c) => c.name)
      : DEFAULT_COMPANIES;
    return Array.from(new Set(list));
  }, [companies]);

  // Keep selected company valid
  useEffect(() => {
    if (activeCompanies.length > 0 && !activeCompanies.includes(relatedCompany)) {
      setRelatedCompany(activeCompanies[0]);
    }
  }, [activeCompanies, relatedCompany]);

  // Initialize toUserId when otherMembers load
  useEffect(() => {
    if (!toUserId && otherMembers.length > 0) {
      setToUserId(otherMembers[0].uid);
    }
  }, [otherMembers, toUserId]);

  // Received handovers vs Sent handovers
  const receivedHandovers = (handovers || []).filter((h) => h.toUserId === currentUserId);
  const sentHandovers = (handovers || []).filter((h) => h.fromUserId === currentUserId);
  const unacknowledged = receivedHandovers.filter((h) => h.status === 'pending');

  const handleSendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveToUserId = toUserId || otherMembers[0]?.uid;
    if (!effectiveToUserId) {
      setFeedbackMsg({ type: 'error', text: 'Please select a team member to receive the handover.' });
      return;
    }
    if (!title.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Please enter a handover subject/title.' });
      return;
    }
    if (!message.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Please enter detailed handover instructions.' });
      return;
    }

    const targetUser = teamMembers.find((m) => m.uid === effectiveToUserId);
    const targetName = targetUser?.name || 'Teammate';

    setSubmitting(true);
    setFeedbackMsg(null);

    const sendFn = onSendHandover || onCreateHandover;
    if (!sendFn) {
      setFeedbackMsg({ type: 'error', text: 'Handover service is currently unavailable.' });
      setSubmitting(false);
      return;
    }

    try {
      await sendFn({
        fromUserId: currentUserId,
        fromUserName: currentUserName || 'Team Member',
        toUserId: effectiveToUserId,
        toUserName: targetName,
        title: title.trim(),
        message: message.trim(),
        relatedCompany: relatedCompany || activeCompanies[0] || 'Internal',
        status: 'pending',
      });

      setTitle('');
      setMessage('');
      setIsModalOpen(false);
      setFeedbackMsg({ type: 'success', text: `Handover successfully dispatched to ${targetName}!` });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to send handover:', err);
      setFeedbackMsg({ type: 'error', text: err?.message || 'Failed to dispatch handover. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledgeClick = async (handoverId: string) => {
    try {
      if (onUpdateStatus) {
        await onUpdateStatus(handoverId, 'accepted');
      } else if (onAcknowledge) {
        await onAcknowledge(handoverId);
      }
      setFeedbackMsg({ type: 'success', text: 'Handover acknowledged and task accepted!' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err) {
      console.error('Failed to acknowledge handover:', err);
    }
  };

  const handleCompleteClick = async (handoverId: string) => {
    try {
      if (onUpdateStatus) {
        await onUpdateStatus(handoverId, 'completed');
        setFeedbackMsg({ type: 'success', text: 'Handover marked as completed!' });
        setTimeout(() => setFeedbackMsg(null), 3000);
      }
    } catch (err) {
      console.error('Failed to complete handover:', err);
    }
  };

  return (
    <div className="space-y-6">

      {feedbackMsg && (
        <div className={`p-4 rounded-2xl text-xs flex items-center justify-between gap-3 shadow-lg ${
          feedbackMsg.type === 'success'
            ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
            : 'bg-rose-950/70 border border-rose-800 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span className="font-semibold">{feedbackMsg.text}</span>
          </div>
          <button type="button" onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Unacknowledged Urgent Banner */}
      {unacknowledged.length > 0 && (
        <div className="bg-amber-500/10 border-2 border-amber-500/60 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-amber-500 text-slate-950 rounded-2xl font-bold shadow-lg shadow-amber-500/20">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Pending Work Handovers ({unacknowledged.length})
              </h3>
              <p className="text-xs text-amber-200/90">
                A teammate has transferred active tasks or shifts to you. Please acknowledge to take ownership.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {unacknowledged.map((h) => (
              <div 
                key={h.id}
                className="bg-[#161B27] border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-300">
                      From {h.fromUserName}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-xs font-semibold text-slate-300">{h.relatedCompany}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{h.title}</h4>
                  <p className="text-xs text-slate-300 bg-[#1F2636] p-2.5 rounded-xl border border-slate-700/60">
                    {h.message}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleAcknowledgeClick(h.id)}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Acknowledge Handover
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Handovers Management Panel */}
      <div className="bg-[#161B27] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
              Work Handovers
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Transfer in-flight tasks and shift context across team members seamlessly
            </p>
          </div>

          <button
            id="send-handover-btn"
            onClick={() => {
              if (otherMembers.length > 0 && !toUserId) {
                setToUserId(otherMembers[0].uid);
              }
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 self-start sm:self-center"
          >
            <Plus className="w-4 h-4" />
            Send a Handover
          </button>
        </div>

        {/* Two Columns: Received vs Sent */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Column 1: Received Handovers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Received Handovers ({receivedHandovers.length})
              </span>
            </div>

            {receivedHandovers.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center bg-[#1F2636]/40 rounded-2xl border border-slate-800/60">
                No handovers received yet.
              </p>
            ) : (
              <div className="space-y-3">
                {receivedHandovers.map((h) => (
                  <div
                    key={h.id}
                    className="p-4 rounded-2xl bg-[#1F2636] border border-slate-700/80 hover:border-slate-600 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        From {h.fromUserName}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        h.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : h.status === 'accepted'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>
                        {h.status === 'completed' ? 'Completed' : h.status === 'accepted' ? 'Acknowledged' : 'Pending'}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-white">{h.title}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      Company: <span className="text-slate-300 font-medium">{h.relatedCompany}</span>
                    </div>
                    
                    <p className="text-xs text-slate-300 bg-[#161B27] p-2.5 rounded-xl border border-slate-700/60">
                      {h.message}
                    </p>

                    {/* Actions for recipient */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      {h.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleAcknowledgeClick(h.id)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}
                      {h.status === 'accepted' && (
                        <button
                          type="button"
                          onClick={() => handleCompleteClick(h.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Column 2: Sent Handovers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Sent Handovers ({sentHandovers.length})
              </span>
            </div>

            {sentHandovers.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center bg-[#1F2636]/40 rounded-2xl border border-slate-800/60">
                You haven't sent any handovers yet.
              </p>
            ) : (
              <div className="space-y-3">
                {sentHandovers.map((h) => (
                  <div
                    key={h.id}
                    className="p-4 rounded-2xl bg-[#1F2636] border border-slate-700/80 hover:border-slate-600 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-indigo-400" />
                        To {h.toUserName}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        h.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : h.status === 'accepted'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>
                        {h.status === 'completed' ? 'Completed' : h.status === 'accepted' ? 'Acknowledged' : 'Pending'}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-white">{h.title}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      Company: <span className="text-slate-300 font-medium">{h.relatedCompany}</span>
                    </div>
                    
                    <p className="text-xs text-slate-300 bg-[#161B27] p-2.5 rounded-xl border border-slate-700/60">
                      {h.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Send Handover Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0F1A]/80 backdrop-blur-sm">
          <div className="bg-[#161B27] border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Send Task Handover</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Transfer To Team Member
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={toUserId || (otherMembers[0]?.uid ?? '')}
                      onChange={(e) => setToUserId(e.target.value)}
                      className="w-full bg-[#1F2636] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none pr-8"
                    >
                      {otherMembers.length === 0 ? (
                        <option key="no-members" value="">No other members available</option>
                      ) : (
                        otherMembers.map((m) => (
                          <option key={`to-member-${m.uid}`} value={m.uid}>
                            {m.name} ({m.designation})
                          </option>
                        ))
                      )}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Related Company / Client
                  </label>
                  <div className="relative">
                    <select
                      value={relatedCompany}
                      onChange={(e) => setRelatedCompany(e.target.value)}
                      className="w-full bg-[#1F2636] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none pr-8"
                    >
                      {activeCompanies.map((c, idx) => (
                        <option key={`handover-comp-${idx}-${c}`} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Handover Title / Subject
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. In-progress banner graphics & pending client review"
                  className="w-full bg-[#1F2636] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Detailed Handover Instructions & Context
                </label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Include file locations, pending tasks, blocker notes, or next steps..."
                  className="w-full bg-[#1F2636] border border-slate-700/80 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#1F2636] hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-xl transition-colors border border-slate-700/60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !title.trim() || !message.trim() || (!toUserId && otherMembers.length === 0)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submitting ? 'Sending...' : 'Send Handover'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
