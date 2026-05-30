import { Megaphone, Play, Pause, Clock, Users } from 'lucide-react';
import clsx from 'clsx';

const campaigns = [
  {
    id: 1,
    name: 'Platinum Winback — 10K Bonus + Priority Boarding',
    segment: 'Slipping Business Travelers',
    status: 'Active',
    members: 212,
    sent: 187,
    openRate: 64,
    clvRecovery: '$182,000',
    launched: 'May 22, 2026',
  },
  {
    id: 2,
    name: 'Gold Renewal — Status Miles Bridge',
    segment: 'Gold At-Risk',
    status: 'Active',
    members: 841,
    sent: 612,
    openRate: 58,
    clvRecovery: '$940,000',
    launched: 'May 18, 2026',
  },
  {
    id: 3,
    name: 'Leisure Re-engage — Points Expiry Alert',
    segment: 'Lapsed Leisure Flyers',
    status: 'Paused',
    members: 3204,
    sent: 2100,
    openRate: 41,
    clvRecovery: '$310,000',
    launched: 'May 10, 2026',
  },
  {
    id: 4,
    name: 'Silver Leisure — Summer Early Bird 15% Off',
    segment: 'All Segments',
    status: 'Scheduled',
    members: 5120,
    sent: 0,
    openRate: 0,
    clvRecovery: 'TBD',
    launched: 'Launches Jun 1, 2026',
  },
];

const statusStyle = {
  Active: 'bg-emerald-100 text-emerald-700',
  Paused: 'bg-amber-100 text-amber-700',
  Scheduled: 'bg-indigo-100 text-indigo-700',
};

export default function Campaigns() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{campaigns.length} campaigns</p>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm">
          <Megaphone size={14} />
          New Campaign
        </button>
      </div>

      <div className="grid gap-4">
        {campaigns.map((c) => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow animate-fade-in">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full', statusStyle[c.status])}>
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
        ))}
      </div>
    </div>
  );
}
