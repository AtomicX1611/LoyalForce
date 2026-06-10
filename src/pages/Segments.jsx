import { useState, useEffect, useCallback } from 'react';
import { Filter, SlidersHorizontal, Search, Users, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import MemberTable from '../components/MemberTable';
import InterventionModal from '../components/InterventionModal';
import api from '../services/api';
import clsx from 'clsx';

// ---- Persona options — values map to backend analytics.assigned_persona ----
const personaOptions = [
  { id: '',                          label: 'All Segments' },
  { id: 'Slipping Business Traveler', label: 'Slipping Business Travelers' },
  { id: 'Loyal Frequent Flyer',      label: 'Loyal Frequent Flyers' },
  { id: 'Lapsed Member',             label: 'Lapsed Members' },
  { id: 'Emerging Traveler',         label: 'Emerging Travelers' },
  { id: 'Casual Holidaymaker',       label: 'Casual Holidaymakers' },
];

const PAGE_SIZE = 20;

/**
 * Normalize a customer document from the backend into the shape that
 * MemberTable and InterventionModal already expect.
 *
 * Backend shape:
 *   { member_id, tier, clv, points_balance,
 *     analytics: { churn_risk_score, assigned_persona, xai_factors },
 *     campaign_tracking: { status } }
 *
 * Frontend shape expected by existing components:
 *   { id, tier, clv, pointsBalance, churnRisk, persona, status,
 *     churnFactors: [{ label, severity, detail }],
 *     recommendedAction: { title, description, ctaLabel, campaign } }
 */
function normalizeCustomer(doc) {
  const risk = doc.analytics?.churn_risk_score ?? 0;

  // Derive a simple status label from the churn risk score
  let status = 'Low';
  if (risk >= 80) status = 'Critical';
  else if (risk >= 60) status = 'High';
  else if (risk >= 40) status = 'Medium';

  // Map XAI factor strings into the badge format the modal expects
  const xaiFactors = doc.analytics?.xai_factors ?? [];
  const churnFactors = xaiFactors.map((f, i) => ({
    label: f,
    severity: i === 0 ? 'high' : i === 1 ? 'medium' : 'low',
    detail: '',  // backend doesn't provide sub-detail text; label is self-contained
  }));

  const persona = doc.analytics?.assigned_persona ?? 'Unknown';

  return {
    id: doc.member_id,
    tier: doc.tier ?? 'Silver',
    clv: doc.clv ?? 0,
    pointsBalance: doc.points_balance ?? 0,
    churnRisk: Math.round(risk),
    persona,
    status,
    churnFactors,
    // Derive a recommended action from the persona
    recommendedAction: {
      title: `Retention Campaign — ${persona}`,
      description: `Deploy a personalised retention intervention for this ${persona} member based on their churn risk profile.`,
      ctaLabel: 'Deploy Campaign',
      campaign: `${persona} — Churn Risk ${Math.round(risk)}%`,
    },
    // Pass the raw member_id through for the campaign PATCH call
    _member_id: doc.member_id,
    _campaign_status: doc.campaign_tracking?.status ?? 'Idle',
  };
}

// Skeleton row
function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-4 bg-slate-200 rounded animate-pulse" style={{ width: `${50 + i * 8}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function Segments() {
  const [customers, setCustomers]     = useState([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [selectedPersona, setSelectedPersona] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember]   = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Fetch whenever page or persona changes
  const fetchCustomers = useCallback(() => {
    setLoading(true);
    setError('');

    const params = { page, limit: PAGE_SIZE };
    if (selectedPersona) params.segment = selectedPersona;

    api.get('/customers', { params })
      .then(({ data }) => {
        setCustomers(data.data.map(normalizeCustomer));
        setTotal(data.total);
      })
      .catch(() => setError('Could not load customers. Is the backend running?'))
      .finally(() => setLoading(false));
  }, [page, selectedPersona]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Reset to page 1 when persona filter changes
  const handlePersonaChange = (id) => {
    setSelectedPersona(id);
    setPage(1);
  };

  // Client-side search filter on the current page (search by member_id)
  const filtered = searchQuery
    ? customers.filter((m) =>
        m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.persona.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : customers;

  // Summary counts from the current page
  const criticalCount = customers.filter((m) => m.status === 'Critical').length;
  const highCount     = customers.filter((m) => m.status === 'High').length;
  const avgRisk       = customers.length
    ? Math.round(customers.reduce((s, m) => s + m.churnRisk, 0) / customers.length)
    : 0;

  return (
    <div className="p-8 space-y-6">

      {/* Summary cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Shown (this page)', value: filtered.length, color: 'indigo' },
          { label: 'Critical Risk',     value: criticalCount,   color: 'rose'   },
          { label: 'High Risk',         value: highCount,       color: 'amber'  },
          { label: 'Avg Churn Risk',    value: `${avgRisk}%`,   color: 'violet' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-2xl p-5 animate-fade-in">
            <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
            <p className={clsx(
              'text-2xl font-bold',
              color === 'rose'   ? 'text-rose-600'   :
              color === 'amber'  ? 'text-amber-600'  :
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
              placeholder="Search by member ID or persona..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          {/* Persona filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <SlidersHorizontal size={14} className="text-slate-400 shrink-0" />
            <p className="text-xs font-semibold text-slate-500 whitespace-nowrap">Persona:</p>
            <div className="flex flex-wrap gap-1.5">
              {personaOptions.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => handlePersonaChange(id)}
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
        </div>
      </section>

      {/* Table header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={15} className="text-slate-400" />
          <p className="text-sm font-semibold text-slate-700">
            Showing <span className="text-indigo-600">{filtered.length}</span> of{' '}
            <span className="text-indigo-600">{total.toLocaleString()}</span> members
          </p>
        </div>
        <p className="text-xs text-slate-400">Click a row to open intervention panel</p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700 text-sm">
          ⚠ {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70">
                  {['Member', 'Tier', 'CLV', 'Churn Risk', 'Status', 'Action'].map((h) => (
                    <th key={h} className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <MemberTable members={filtered} onRowClick={setSelectedMember} />
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={13} /> Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Intervention Modal */}
      {selectedMember && (
        <InterventionModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onCampaignDeployed={(memberId) => {
            // Optimistically update campaign status in the local list
            setCustomers((prev) =>
              prev.map((m) =>
                m.id === memberId
                  ? { ...m, _campaign_status: 'Campaign Active' }
                  : m
              )
            );
            setSelectedMember(null);
          }}
        />
      )}
    </div>
  );
}
