import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, DollarSign, AlertOctagon, Loader2 } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import PointsChart from '../components/PointsChart';
import api from '../services/api';

const formatCLV = (val) => {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return val?.toString() ?? '0';
};

// Skeleton shimmer block
function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-slate-200 rounded-xl ${className}`} />
  );
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get('/dashboard/metrics')
      .then(({ data }) => setMetrics(data))
      .catch(() => setError('Failed to load dashboard metrics. Is the backend running?'))
      .finally(() => setLoading(false));
  }, []);

  // --- Skeleton loading state -----------------------------------------------
  if (loading) {
    return (
      <div className="p-8 space-y-8">
        <section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32" />)}
          </div>
        </section>
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <Skeleton className="xl:col-span-2 h-72" />
          <Skeleton className="h-72" />
        </section>
      </div>
    );
  }

  // --- Error state ----------------------------------------------------------
  if (error) {
    return (
      <div className="p-8">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-700 text-sm">
          ⚠ {error}
        </div>
      </div>
    );
  }

  const topAtRisk = metrics?.top_at_risk ?? [];
  const highRiskCount = metrics?.high_risk_count ?? 0;
  const avgRisk = metrics?.avg_churn_risk ?? 0;

  return (
    <div className="p-8 space-y-8">

      {/* Metric Cards */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <MetricCard
            title="Total Members"
            value={(metrics?.total_customers ?? 0).toLocaleString()}
            change={null}
            trend="up"
            icon={Users}
            iconBg="bg-indigo-500"
            changeIsGood={true}
          />
          <MetricCard
            title="Avg Churn Risk Score"
            value={`${avgRisk}%`}
            change={null}
            trend="up"
            icon={AlertOctagon}
            iconBg="bg-amber-500"
            changeIsGood={false}
          />
          <MetricCard
            title="High-Risk Churn Segment"
            value={highRiskCount.toLocaleString()}
            suffix=" members"
            change={null}
            trend="up"
            icon={DollarSign}
            iconBg="bg-rose-500"
            changeIsGood={false}
          />
        </div>
      </section>

      {/* Charts row */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2">
          <PointsChart />
        </div>

        {/* Top critical members panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-fade-in delay-300">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Critical Members</h2>
              <p className="text-xs text-slate-500 mt-0.5">Requires immediate action</p>
            </div>
            <span className="text-xs bg-rose-100 text-rose-700 font-bold px-2.5 py-1 rounded-full">
              {topAtRisk.length} Critical
            </span>
          </div>

          <div className="space-y-3">
            {topAtRisk.map((member) => {
              // member_id from API, derive initials from member_id (e.g. "M480934" → "M4")
              const initials = member.member_id?.slice(0, 2).toUpperCase() ?? '??';
              return (
                <div
                  key={member.member_id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group border border-slate-100"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{member.member_id}</p>
                    <p className="text-xs text-slate-500">
                      {member.tier} · {member.assigned_persona}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-rose-600">{member.churn_risk_score}%</p>
                    <p className="text-xs text-slate-400">risk</p>
                  </div>
                </div>
              );
            })}

            {topAtRisk.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">No critical members found.</p>
            )}
          </div>

          <Link
            to="/segments"
            className="mt-4 w-full text-center text-sm text-indigo-600 font-semibold hover:text-indigo-800 block pt-3 border-t border-slate-100 transition-colors"
          >
            View all at-risk members →
          </Link>
        </div>
      </section>

      {/* Insight strip */}
      <section>
        <div className="bg-gradient-to-r from-indigo-600 to-violet-700 rounded-2xl p-6 text-white flex items-center justify-between animate-fade-in delay-300">
          <div>
            <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-1">AI Insight</p>
            <h3 className="text-base font-bold mb-1">
              {highRiskCount.toLocaleString()} members are at elevated churn risk
            </h3>
            <p className="text-sm text-indigo-200">
              Average churn risk across the tenant is{' '}
              <strong className="text-white">{avgRisk}%</strong>.{' '}
              Deploying targeted retention campaigns can meaningfully recover predicted CLV.
            </p>
          </div>
          <Link
            to="/segments"
            className="shrink-0 ml-6 bg-white text-indigo-700 font-bold text-sm px-5 py-3 rounded-xl hover:bg-indigo-50 transition-colors shadow-md"
          >
            Explore Segments
          </Link>
        </div>
      </section>

    </div>
  );
}
