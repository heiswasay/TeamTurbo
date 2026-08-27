import React, { useState, useMemo, useEffect } from 'react';
import { Handover, HandoverStatus, UserProfile, CompanyTag, DEFAULT_COMPANIES } from '../../types';
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
  Search,
  Filter,
  Trash2,
  MoreVertical,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Layers,
  Inbox,
  SendHorizontal
} from 'lucide-react';

interface AdminHandoversProps {
  handovers: Handover[];
  teamMembers: UserProfile[];
  companies?: CompanyTag[];
  currentUserId: string;
  currentUserName: string;
  onSendHandover: (handover: Omit<Handover, 'id' | 'createdAt'>) => Promise<any>;
  onUpdateStatus: (handoverId: string, status: HandoverStatus) => Promise<void>;
  onDeleteHandover: (handoverId: string) => Promise<void>;
}

export const AdminHandovers: React.FC<AdminHandoversProps> = ({
  handovers = [],
  teamMembers = [],
  companies = [],
  currentUserId,
  currentUserName,
  onSendHandover,
  onUpdateStatus,
  onDeleteHandover,
}) => {
  // Navigation View Scope: 'all' | 'received' | 'sent'
  const [viewScope, setViewScope] = useState<'all' | 'received' | 'sent'>('all');
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<string>('all');

  // Modal State for Admin creating a Handover
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toUserId, setToUserId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [relatedCompany, setRelatedCompany] = useState(companies?.[0]?.name || DEFAULT_COMPANIES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Active Companies
  const activeCompanies = useMemo(() => {
    const list = (companies && companies.length > 0)
      ? companies.filter((c) => !c.archived).map((c) => c.name)
      : DEFAULT_COMPANIES;
    return Array.from(new Set(list));
  }, [companies]);

  // Target team members to send to (all active team members except current admin)
  const targetMembers = useMemo(() => {
    return (teamMembers || []).filter((m) => m.active !== false && m.uid !== currentUserId);
  }, [teamMembers, currentUserId]);

  useEffect(() => {
    if (!toUserId && targetMembers.length > 0) {
      setToUserId(targetMembers[0].uid);
    }
  }, [targetMembers, toUserId]);

  // Key Counters
  const totalCount = handovers.length;
  const pendingCount = handovers.filter((h) => h.status === 'pending').length;
  const acceptedCount = handovers.filter((h) => h.status === 'accepted').length;
  const completedCount = handovers.filter((h) => h.status === 'completed').length;
  const myReceivedPending = handovers.filter((h) => h.toUserId === currentUserId && h.status === 'pending').length;

  // Filtered List Computation
  const filteredHandovers = useMemo(() => {
    return (handovers || []).filter((h) => {
      // 1. View Scope filter
      if (viewScope === 'received' && h.toUserId !== currentUserId) return false;
      if (viewScope === 'sent' && h.fromUserId !== currentUserId) return false;

      // 2. Company filter
      if (selectedCompany !== 'all' && h.relatedCompany !== selectedCompany) return false;

      // 3. Status filter
      if (selectedStatus !== 'all' && h.status !== selectedStatus) return false;

      // 4. Member filter (involved either as sender or recipient)
      if (selectedMember !== 'all' && h.fromUserId !== selectedMember && h.toUserId !== selectedMember) {
        return false;
      }

      // 5. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (h.title || '').toLowerCase().includes(q);
        const matchesMsg = (h.message || '').toLowerCase().includes(q);
        const matchesFrom = (h.fromUserName || '').toLowerCase().includes(q);
        const matchesTo = (h.toUserName || '').toLowerCase().includes(q);
        const matchesComp = (h.relatedCompany || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesMsg && !matchesFrom && !matchesTo && !matchesComp) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Sort newest first
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [handovers, viewScope, selectedCompany, selectedStatus, selectedMember, searchQuery, currentUserId]);

  const handleSendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveToUserId = toUserId || targetMembers[0]?.uid;
    if (!effectiveToUserId) {
      setFeedbackMsg({ type: 'error', text: 'Please select a recipient from the team.' });
      return;
    }
    if (!title.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Please enter a handover subject/task title.' });
      return;
    }
    if (!message.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Please provide detailed handover instructions.' });
      return;
    }

    const targetUser = teamMembers.find((m) => m.uid === effectiveToUserId);
    const targetName = targetUser?.name || 'Teammate';

    setSubmitting(true);
    setFeedbackMsg(null);

    try {
      await onSendHandover({
        fromUserId: currentUserId,
        fromUserName: currentUserName || 'Lead Admin',
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
      console.error('Failed to dispatch handover:', err);
      setFeedbackMsg({ type: 'error', text: err?.message || 'Failed to dispatch handover.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (handoverId: string, newStatus: HandoverStatus) => {
    try {
      await onUpdateStatus(handoverId, newStatus);
      setFeedbackMsg({ type: 'success', text: `Handover status updated to ${newStatus}.` });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      console.error('Failed to update handover status:', err);
      setFeedbackMsg({ type: 'error', text: 'Failed to update handover status.' });
    }
  };

  const handleDelete = async (handoverId: string, itemTitle: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete handover "${itemTitle}"?`)) {
      return;
    }
    try {
      await onDeleteHandover(handoverId);
      setFeedbackMsg({ type: 'success', text: 'Handover deleted successfully.' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      console.error('Failed to delete handover:', err);
      setFeedbackMsg({ type: 'error', text: 'Failed to delete handover.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast / Feedback Notice */}
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

      {/* Action Required Banner for Admin */}
      {myReceivedPending > 0 && (
        <div className="bg-amber-500/10 border-2 border-amber-500/60 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500 text-slate-950 rounded-2xl font-bold shadow-lg shadow-amber-500/20">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  You Have {myReceivedPending} Pending Handover{myReceivedPending > 1 ? 's' : ''} Awaiting Your Review
                </h3>
                <p className="text-xs text-amber-200/90 mt-0.5">
                  Team members have handed over active tasks to you. Acknowledge them below to take ownership.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setViewScope('received');
                setSelectedStatus('pending');
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all"
            >
              View My Pending ({myReceivedPending})
            </button>
          </div>
        </div>
      )}

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#161B27] border border-slate-800 rounded-3xl p-4 shadow-lg flex items-center gap-3.5">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{totalCount}</div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Handovers</div>
          </div>
        </div>

        <div className="bg-[#161B27] border border-slate-800 rounded-3xl p-4 shadow-lg flex items-center gap-3.5">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-amber-400">{pendingCount}</div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pending Action</div>
          </div>
        </div>

        <div className="bg-[#161B27] border border-slate-800 rounded-3xl p-4 shadow-lg flex items-center gap-3.5">
          <div className="p-3 bg-sky-500/10 text-sky-400 rounded-2xl border border-sky-500/20">
            <CheckCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-sky-400">{acceptedCount}</div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">In Progress</div>
          </div>
        </div>

        <div className="bg-[#161B27] border border-slate-800 rounded-3xl p-4 shadow-lg flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-400">{completedCount}</div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Completed</div>
          </div>
        </div>
      </div>

      {/* Main Handover Management Container */}
      <div className="bg-[#161B27] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        
        {/* Header & Quick Dispatch */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
                Team Work Handovers & Shift Transfers
              </h2>
              <span className="px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold rounded-full uppercase">
                Admin Control
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Oversee all in-flight work handed over between team members, or transfer tasks directly as Lead Admin.
            </p>
          </div>

          <button
            id="admin-send-handover-btn"
            onClick={() => {
              if (targetMembers.length > 0 && !toUserId) {
                setToUserId(targetMembers[0].uid);
              }
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 self-start md:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            Dispatch New Handover
          </button>
        </div>

        {/* View Scope Tabs & Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
            
            {/* View Scope Pill Switcher */}
            <div className="flex items-center gap-1.5 p-1 bg-[#1F2636] rounded-2xl border border-slate-700/80">
              <button
                type="button"
                onClick={() => setViewScope('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  viewScope === 'all'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                All Team Handovers ({totalCount})
              </button>

              <button
                type="button"
                onClick={() => setViewScope('received')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  viewScope === 'received'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Inbox className="w-3.5 h-3.5" />
                Received by Me ({handovers.filter((h) => h.toUserId === currentUserId).length})
              </button>

              <button
                type="button"
                onClick={() => setViewScope('sent')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  viewScope === 'sent'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <SendHorizontal className="w-3.5 h-3.5" />
                Dispatched by Me ({handovers.filter((h) => h.fromUserId === currentUserId).length})
              </button>
            </div>

            {/* Clear All Filters Button */}
            {(selectedCompany !== 'all' || selectedStatus !== 'all' || selectedMember !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCompany('all');
                  setSelectedStatus('all');
                  setSelectedMember('all');
                  setSearchQuery('');
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 self-end"
              >
                <X className="w-3.5 h-3.5" />
                Reset Filters
              </button>
            )}
          </div>

          {/* Search Bar & Dropdown Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search subject, notes, names..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1F2636] border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter by Company */}
            <div>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full bg-[#1F2636] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">🏢 All Clients / Companies</option>
                {activeCompanies.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Filter by Status */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-[#1F2636] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">⚡ All Statuses</option>
                <option value="pending">⏳ Pending Acknowledgment</option>
                <option value="accepted">🔄 In Progress (Accepted)</option>
                <option value="completed">✅ Completed</option>
              </select>
            </div>

            {/* Filter by Member */}
            <div>
              <select
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                className="w-full bg-[#1F2636] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">👥 All Team Members</option>
                {teamMembers.map((m) => (
                  <option key={m.uid} value={m.uid}>{m.name} ({m.role})</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* Handover Cards Grid / List */}
        <div className="space-y-3.5 pt-2">
          {filteredHandovers.length === 0 ? (
            <div className="py-14 text-center bg-[#1F2636]/40 rounded-3xl border border-slate-800/80 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <ArrowRightLeft className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-white">No handovers found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery || selectedCompany !== 'all' || selectedStatus !== 'all' || selectedMember !== 'all'
                  ? 'No handovers match your current search and filter criteria.'
                  : 'No work handovers have been created yet. Click Dispatch New Handover above to start.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredHandovers.map((h) => {
                const isSentToMe = h.toUserId === currentUserId;
                const isSentByMe = h.fromUserId === currentUserId;

                return (
                  <div
                    key={h.id}
                    className="p-5 rounded-2xl bg-[#1F2636] border border-slate-700/80 hover:border-slate-600 transition-all shadow-md space-y-3.5 relative overflow-hidden"
                  >
                    {/* Top Row: Sender -> Recipient Flow, Company Tag, Date, and Status Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                      
                      {/* Transfer Route Badge */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-white bg-[#161B27] px-2.5 py-1 rounded-lg border border-slate-700/60">
                          <User className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{h.fromUserName}</span>
                          {isSentByMe && <span className="text-[10px] text-indigo-300 font-mono">(You)</span>}
                        </div>

                        <div className="flex items-center text-slate-500 font-bold">
                          <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                        </div>

                        <div className="flex items-center gap-1.5 font-bold text-white bg-[#161B27] px-2.5 py-1 rounded-lg border border-slate-700/60">
                          <User className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{h.toUserName}</span>
                          {isSentToMe && <span className="text-[10px] text-emerald-300 font-mono">(You)</span>}
                        </div>

                        <span className="text-slate-600 hidden sm:inline">•</span>

                        {/* Company Badge */}
                        <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-semibold rounded-lg flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-indigo-400" />
                          {h.relatedCompany}
                        </span>
                      </div>

                      {/* Right Meta: Timestamp & Status Badge */}
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {formatDateLabel(h.createdAt || '')}
                        </span>

                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider flex items-center gap-1 ${
                          h.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : h.status === 'accepted'
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                        }`}>
                          {h.status === 'completed' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              Completed
                            </>
                          ) : h.status === 'accepted' ? (
                            <>
                              <CheckCheck className="w-3 h-3" />
                              In Progress
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              Pending
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Subject & Context Details */}
                    <div className="space-y-1.5">
                      <h4 className="text-sm font-bold text-white tracking-tight">
                        {h.title}
                      </h4>
                      <p className="text-xs text-slate-300 bg-[#161B27] p-3.5 rounded-xl border border-slate-700/60 leading-relaxed whitespace-pre-wrap font-sans">
                        {h.message}
                      </p>
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      
                      {/* Status Override Selector for Admin */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400 font-medium text-[11px]">Set Status:</span>
                        <select
                          value={h.status}
                          onChange={(e) => handleStatusChange(h.id, e.target.value as HandoverStatus)}
                          className="bg-[#161B27] border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="pending">⏳ Pending</option>
                          <option value="accepted">🔄 Accepted (In Progress)</option>
                          <option value="completed">✅ Completed</option>
                        </select>
                      </div>

                      {/* Specific Quick Action Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        
                        {/* If sent to Admin & Pending */}
                        {isSentToMe && h.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(h.id, 'accepted')}
                            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                            Acknowledge Handover
                          </button>
                        )}

                        {/* If sent to Admin & Accepted */}
                        {isSentToMe && h.status === 'accepted' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(h.id, 'completed')}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Mark as Done
                          </button>
                        )}

                        {/* Delete Handover Option */}
                        <button
                          type="button"
                          onClick={() => handleDelete(h.id, h.title)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Delete Handover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Admin Send Handover Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0F1A]/80 backdrop-blur-sm">
          <div className="bg-[#161B27] border border-slate-700/80 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 relative">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-600/30">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Dispatch Work Handover</h3>
                  <p className="text-[11px] text-slate-400">Transfer tasks, shifts, or client instructions as Admin</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendSubmit} className="space-y-4">
              
              {/* Recipient Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Handover To (Recipient) <span className="text-rose-400">*</span>
                </label>
                <select
                  value={toUserId}
                  onChange={(e) => setToUserId(e.target.value)}
                  className="w-full bg-[#1F2636] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                >
                  {targetMembers.map((m) => (
                    <option key={m.uid} value={m.uid}>
                      {m.name} — {m.designation || m.role} ({m.shiftTime || 'Standard Shift'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Client / Company Tag */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Associated Client / Company <span className="text-rose-400">*</span>
                </label>
                <select
                  value={relatedCompany}
                  onChange={(e) => setRelatedCompany(e.target.value)}
                  className="w-full bg-[#1F2636] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                >
                  {activeCompanies.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Subject / Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Task / Handover Subject <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. SEO Keyword Audit for Nutracene or Client Meeting Prep"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#1F2636] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Context / Instructions Textarea */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Detailed Handover Context & Instructions <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Explain current progress, next actionable steps, links, or blocker notes for the recipient..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-[#1F2636] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 resize-none"
                  required
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submitting ? 'Dispatching...' : 'Dispatch Handover'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
