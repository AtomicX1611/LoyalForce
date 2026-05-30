import { useState, useMemo } from 'react';
import { Filter, SlidersHorizontal, Search, Users } from 'lucide-react';
import { members, personas } from '../data/dummyData';
import MemberTable from '../components/MemberTable';
import InterventionModal from '../components/InterventionModal';
import clsx from 'clsx';

const statusFilters = ['All', 'Critical', 'High', 'Medium', 'Low'];

export default function Segments() {
  const [selectedPersona, setSelectedPersona] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const matchPersona = selectedPersona === 'all' || m.persona === selectedPersona;
      const matchStatus = selectedStatus === 'All' || m.status === selectedStatus;
      const matchSearch =
        !searchQuery ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchPersona && matchStatus && matchSearch;
    });
  }, [selectedPersona, selectedStatus, searchQuery]);

  // Segment summary counts
  const criticalCount = members.filter(m => m.status === 'Critical').length;
  const highCount = members.filter(m => m.status === 'High').length;

  return (
    <div className="p-8 space-y-6">

      {/* Segment summary cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Shown', value: filtered.length, color: 'indigo' },
          { label: 'Critical Risk', value: criticalCount, color: 'rose' },
          { label: 'High Risk', value: highCount, color: 'amber' },
          { label: 'Avg Churn Risk', value: `${Math.round(members.reduce((s, m) => s + m.churnRisk, 0) / members.length)}%`, color: 'violet' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-2xl p-5 animate-fade-in">
            <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
            <p className={clsx(
              'text-2xl font-bold',
              color === 'rose' ? 'text-rose-600' :
              color === 'amber' ? 'text-amber-600' :
              color === 'violet' ? 'text-violet-600' :
              'text-indigo-600'
            )}>{value}</p>
          </div>
        ))}
      </section>

      {/* Filters toolbar */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex flex-col md:flex-row gap-4">

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          {/* Persona filter */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-slate-400 shrink-0" />
            <p className="text-xs font-semibold text-slate-500 whitespace-nowrap">Persona:</p>
            <div className="flex flex-wrap gap-1.5">
              {personas.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setSelectedPersona(id)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
                    selectedPersona === id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2 ml-auto">
            <Filter size={14} className="text-slate-400 shrink-0" />
            <p className="text-xs font-semibold text-slate-500 whitespace-nowrap">Status:</p>
            <div className="flex gap-1">
              {statusFilters.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedStatus(s)}
                  className={clsx(
                    'px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
                    selectedStatus === s
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Table header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={15} className="text-slate-400" />
          <p className="text-sm font-semibold text-slate-700">
            Showing <span className="text-indigo-600">{filtered.length}</span> of {members.length} members
          </p>
        </div>
        <p className="text-xs text-slate-400">Click a row to open intervention panel</p>
      </div>

      {/* Table */}
      <MemberTable members={filtered} onRowClick={setSelectedMember} />

      {/* Intervention Modal */}
      {selectedMember && (
        <InterventionModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
}
