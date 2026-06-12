import { useEffect, useState } from 'react';
import {
  Megaphone, Play, Pause, Clock, Users,
  Loader2, CheckCircle2, AlertCircle, RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import api from '../services/api';

// --- Static showcase campaigns (always shown at top as platform examples) ---
const SHOWCASE_CAMPAIGNS = [
  {
    id: 'showcase-1',
    name: 'Platinum Winback — 10K Bonus + Priority Boarding',
    segment: 'Slipping Business Travelers',
    status: 'Active',
    members: 212,
    sent: 187,
    openRate: 64,
    clvRecovery: '$182,000',
    launched: 'May 22, 2026',
    isShowcase: true,
  },
  {
    id: 'showcase-2',
    name: 'Gold Renewal — Status Miles Bridge',
    segment: 'Gold At-Risk',
    status: 'Active',
    members: 841,
    sent: 612,
    openRate: 58,
    clvRecovery: '$940,000',
    launched: 'May 18, 2026',
    isShowcase: true,
  },
  {
    id: 'showcase-3',
    name: 'Leisure Re-engage — Points Expiry Alert',
    segment: 'Lapsed Leisure Flyers',
    status: 'Paused',
    members: 3204,
    sent: 2100,
    openRate: 41,
    clvRecovery: '$310,000',
    launched: 'May 10, 2026',
    isShowcase: true,
  },
];

const statusStyle = {
  Active:    'bg-emerald-100 text-emerald-700',
  Paused:    'bg-amber-100 text-amber-700',
  Scheduled: 'bg-indigo-100 text-indigo-700',
  Deployed:  'bg-violet-100 text-violet-700',
};

function formatDate(isoStr) {
  if (!isoStr) return '—';
  try {
    return new Date(isoStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

function ShowcaseCard({ c }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full', statusStyle[c.status] ?? 'bg-slate-100 text-slate-600')}>
              {c.status}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock size={11} /> {c.launched}
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900">{c.name}</h3>
          <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1">
            <Users size={12} /> {c.segment}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {c.status === 'Active' && (
            <button className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
              <Pause size={14} className="text-slate-500" />
            </button>
          )}
          {c.status === 'Paused' && (
            <button className="w-9 h-9 rounded-lg border border-emerald-200 bg-emerald-50 flex items-center justify-center hover:bg-emerald-100 transition-colors">
              <Play size={14} className="text-emerald-600" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mt-5 pt-4 border-t border-slate-100">
        <div>
          <p className="text-xs text-slate-400 mb-1">Target Members</p>
          <p className="text-sm font-bold text-slate-800">{c.members.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">Sent</p>
          <p className="text-sm font-bold text-slate-800">{c.sent.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">Open Rate</p>
          <p className="text-sm font-bold text-slate-800">{c.openRate > 0 ? `${c.openRate}%` : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">CLV Recovery Est.</p>
          <p className="text-sm font-bold text-emerald-600">{c.clvRecovery}</p>
        </div>
      </div>

      {c.sent > 0 && (
        <div className="mt-3">
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${Math.round((c.sent / c.members) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">{Math.round((c.sent / c.members) * 100)}% delivered</p>
        </div>
      )}
    </div>
  );
}

function LiveCampaignCard({ c }) {
  const incentive = c.action_details?.incentive ?? '—';
  const title     = c.action_details?.title ?? 'Retention Campaign';

  return (
    <div className="bg-white border border-violet-200 rounded-2xl p-6 hover:shadow-md transition-shadow animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700">
              Deployed
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock size={11} /> {formatDate(c.executed_at)}
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1">
            <Users size={12} /> Member: <span className="font-semibold ml-1">{c.target_member_id}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <p className="text-xs text-slate-400 mb-1">Incentive / Campaign</p>
        <p className="text-sm font-semibold text-slate-700">{incentive}</p>
        <p className="text-xs text-slate-400 mt-2">Campaign ID: <span className="font-mono text-slate-600">{c.campaign_id}</span></p>
      </div>
    </div>
  );
}

export default function Campaigns() {
  const [liveCampaigns, setLiveCampaigns] = useState([]);
  const [total, setTotal]                 = useState(0);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [page, setPage]                   = useState(1);
  const LIMIT = 10;

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  function fetchCampaigns() {
    setLoading(true);
    setError('');
    api.get('/campaigns', { params: { page, limit: LIMIT } })
      .then(({ data }) => {
        setLiveCampaigns(data.data ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => setError('Could not load campaigns. Is the backend running?'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchCampaigns(); }, [page]);

  const totalCount = SHOWCASE_CAMPAIGNS.length + total;

  return (
    <div className="p-8 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{totalCount} total campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCampaigns}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={13} /> Refresh
          </button>
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm">
            <Megaphone size={14} />
            New Campaign
          </button>
        </div>
      </div>

      {/* ── Showcase / Platform Campaigns ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Platform Campaigns</h2>
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{SHOWCASE_CAMPAIGNS.length}</span>
        </div>
        <div className="grid gap-4">
          {SHOWCASE_CAMPAIGNS.map((c) => <ShowcaseCard key={c.id} c={c} />)}
        </div>
      </section>

      {/* ── Live / Deployed Campaigns from DB ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Deployed via Intervention Panel</h2>
          <span className="text-xs bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full">{total}</span>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700 text-sm flex items-center gap-2 mb-4">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 size={22} className="animate-spin mr-2" /> Loading live campaigns…
          </div>
        ) : liveCampaigns.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center">
            <CheckCircle2 size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500">No campaigns deployed yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Go to <strong>Segment Explorer</strong> → click a member → <em>Deploy Campaign</em>
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {liveCampaigns.map((c) => <LiveCampaignCard key={c.campaign_id} c={c} />)}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-xs text-slate-500">Page {page} of {totalPages} · {total} total</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
