import { Users, DollarSign, AlertOctagon } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import PointsChart from '../components/PointsChart';
import { metrics, members } from '../data/dummyData';

const formatCLV = (val) => {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return val.toString();
};

const topAtRisk = members
  .filter(m => m.churnRisk >= 80)
  .sort((a, b) => b.churnRisk - a.churnRisk)
  .slice(0, 3);

export default function Dashboard() {
  return (
    <div className="p-8 space-y-8">

      {/* Metric Cards */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <MetricCard
            title="Total Members"
            value={metrics.totalMembers.toLocaleString()}
            change={metrics.totalMembersChange}
            trend="up"
            icon={Users}
            iconBg="bg-indigo-500"
            changeIsGood={true}
          />
          <MetricCard
            title="CLV at Risk (Next 30 Days)"
            value={formatCLV(metrics.clvAtRisk)}
            prefix="$"
            change={metrics.clvAtRiskChange}
            trend="up"
            icon={DollarSign}
            iconBg="bg-rose-500"
            changeIsGood={false}
          />
          <MetricCard
            title="High-Risk Churn Segment"
            value={metrics.highRiskSegmentCount.toLocaleString()}
            suffix=" members"
            change={metrics.highRiskSegmentChange}
            trend="up"
            icon={AlertOctagon}
            iconBg="bg-amber-500"
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
            {topAtRisk.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group border border-slate-100"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{member.name}</p>
                  <p className="text-xs text-slate-500">{member.tier} · ${member.clv.toLocaleString()} CLV</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-rose-600">{member.churnRisk}%</p>
                  <p className="text-xs text-slate-400">risk</p>
                </div>
              </div>
            ))}
          </div>

          <a
            href="/segments"
            className="mt-4 w-full text-center text-sm text-indigo-600 font-semibold hover:text-indigo-800 block pt-3 border-t border-slate-100 transition-colors"
          >
            View all at-risk members →
          </a>
        </div>
      </section>

      {/* Insight strip */}
      <section>
        <div className="bg-gradient-to-r from-indigo-600 to-violet-700 rounded-2xl p-6 text-white flex items-center justify-between animate-fade-in delay-300">
          <div>
            <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-1">AI Insight</p>
            <h3 className="text-base font-bold mb-1">8,941 members are at elevated churn risk — $4.82M CLV in jeopardy</h3>
            <p className="text-sm text-indigo-200">
              3 high-priority segments identified. Deploying a targeted winback campaign today could recover up to <strong className="text-white">$1.2M</strong> in predicted CLV.
            </p>
          </div>
          <a
            href="/segments"
            className="shrink-0 ml-6 bg-white text-indigo-700 font-bold text-sm px-5 py-3 rounded-xl hover:bg-indigo-50 transition-colors shadow-md"
          >
            Explore Segments
          </a>
        </div>
      </section>

    </div>
  );
}
