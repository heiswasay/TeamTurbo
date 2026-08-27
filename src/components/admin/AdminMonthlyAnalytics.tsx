import React, { useState, useMemo } from 'react';
import { WorkEntry, UserProfile, CompanyTag } from '../../types';
import { exportWorkEntriesToCSV } from '../../lib/exportUtils';
import { formatDateLabel, getTodayDateString, getPastDates } from '../../lib/dateUtils';
import { 
  BarChart3, 
  Download, 
  Search, 
  Filter, 
  PieChart, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Calendar,
  Layers
} from 'lucide-react';

interface AdminMonthlyAnalyticsProps {
  entries: WorkEntry[];
  teamMembers: UserProfile[];
  companies: CompanyTag[];
}

export const AdminMonthlyAnalytics: React.FC<AdminMonthlyAnalyticsProps> = ({
  entries = [],
  teamMembers = [],
  companies = [],
}) => {
  const todayStr = getTodayDateString();
  const [startDate, setStartDate] = useState(getPastDates(30)[29] || todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMember, setFilterMember] = useState<string>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');

  const activeMembers = (teamMembers || []).filter((m) => m.active !== false);

  // Filter entries in selected date range & filters
  const filteredEntries = useMemo(() => {
    return (entries || []).filter((e) => {
      if (e.date < startDate || e.date > endDate) return false;
      if (filterMember !== 'all' && e.userId !== filterMember) return false;
      if (filterCompany !== 'all' && e.company !== filterCompany) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const textMatch = (e.taskText || '').toLowerCase().includes(q);
        const remarkMatch = (e.remarks || '').toLowerCase().includes(q);
        const userMatch = (e.userName || '').toLowerCase().includes(q);
        if (!textMatch && !remarkMatch && !userMatch) return false;
      }
      return true;
    });
  }, [entries, startDate, endDate, filterMember, filterCompany, searchQuery]);

  // Member Performance Stats in Range
  const memberMetrics = useMemo(() => {
    return activeMembers.map((member) => {
      const memEntries = (entries || []).filter((e) => e.userId === member.uid && e.date >= startDate && e.date <= endDate);
      const total = memEntries.length;
      const completed = memEntries.filter((e) => e.status === 'completed').length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      const rework = memEntries.filter((e) => e.review === 'needs_rework').length;
      const reworkRate = total > 0 ? Math.round((rework / total) * 100) : 0;

      // Most worked company for this member
      const compCounts: { [c: string]: number } = {};
      for (const e of memEntries) {
        compCounts[e.company] = (compCounts[e.company] || 0) + 1;
      }
      const topCompany = Object.entries(compCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

      return {
        member,
        total,
        completed,
        completionRate,
        rework,
        reworkRate,
        topCompany,
      };
    });
  }, [activeMembers, entries, startDate, endDate]);

  // Overall Company distribution in Range
  const companyDistribution = useMemo(() => {
    const counts: { [company: string]: number } = {};
    for (const e of filteredEntries) {
      counts[e.company] = (counts[e.company] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filteredEntries]);

  const handleExport = () => {
    exportWorkEntriesToCSV(
      filteredEntries,
      `team_work_entries_${startDate}_to_${endDate}.csv`
    );
  };

  return (
    <div className="space-y-6">

      {/* Header & Date Range Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-indigo-400" />
              Monthly Analytics, Search & CSV Reports
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Review completion rates, rework metrics, client distributions, and run full-text searches
            </p>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-2xl text-xs transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2 self-start lg:self-center"
          >
            <Download className="w-4 h-4" />
            Export Filtered CSV ({filteredEntries.length} Records)
          </button>
        </div>

        {/* Filters Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-800">
          
          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Member Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Team Member
            </label>
            <select
              value={filterMember}
              onChange={(e) => setFilterMember(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option key="member-all" value="all">All Members</option>
              {activeMembers.map((m) => (
                <option key={`member-${m.uid}`} value={m.uid}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Full-Text Search */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Search Text & Remarks
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Keywords, tasks..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 pl-8 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            </div>
          </div>

        </div>

      </div>

      {/* Member Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {memberMetrics.map(({ member, total, completed, completionRate, rework, reworkRate, topCompany }) => (
          <div 
            key={member.uid}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3 flex flex-col justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
                {member.name.charAt(0)}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{member.name}</h4>
                <p className="text-[11px] text-slate-400">{member.designation}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400">Total Logs</span>
                <p className="text-base font-bold text-white">{total}</p>
              </div>

              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-[10px] text-emerald-400">Completion</span>
                <p className="text-base font-bold text-emerald-400">{completionRate}%</p>
              </div>

              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-[10px] text-rose-400">Rework Rate</span>
                <p className="text-base font-bold text-rose-400">{reworkRate}%</p>
              </div>

              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-[10px] text-indigo-300">Top Client</span>
                <p className="text-xs font-bold text-slate-200 truncate" title={topCompany}>
                  {topCompany}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Company Distribution & Full-text Search Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Company Volume Chart / Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Work by Company / Client</h3>
          </div>

          {companyDistribution.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No client data in selected range</p>
          ) : (
            <div className="space-y-2.5">
              {companyDistribution.map(([comp, count]) => {
                const pct = Math.round((count / filteredEntries.length) * 100);
                return (
                  <div key={comp} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-300">{comp}</span>
                      <span className="text-slate-400">{count} tasks ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Filtered Entry Feed */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">
                Filtered Work Feed ({filteredEntries.length} Results)
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              {formatDateLabel(startDate)} – {formatDateLabel(endDate)}
            </span>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {filteredEntries.length === 0 ? (
              <p className="text-xs text-slate-500 py-10 text-center">No work records match current filters</p>
            ) : (
              filteredEntries.map((entry) => (
                <div 
                  key={entry.id}
                  className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{entry.userName}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-indigo-300 font-semibold">{entry.company}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-400">{formatDateLabel(entry.date)}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-400 font-mono">{entry.timeSpent}</span>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      entry.review === 'ok' ? 'bg-emerald-500/20 text-emerald-300' : entry.review === 'needs_rework' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {entry.review === 'ok' ? 'Approved' : entry.review === 'needs_rework' ? 'Rework' : 'Pending'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-850">
                    {entry.taskText}
                  </p>

                  {entry.remarks && (
                    <p className="text-xs text-amber-300/80 italic">
                      Remarks: "{entry.remarks}"
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
