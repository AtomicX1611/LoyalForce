import clsx from 'clsx';

const tierConfig = {
  Platinum: { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
  Gold: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  Silver: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
};

const statusConfig = {
  Critical: { bg: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-200' },
  High: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200' },
  Medium: { bg: 'bg-indigo-50', text: 'text-indigo-700', ring: 'ring-indigo-200' },
  Low: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
};

const riskBarColor = (score) => {
  if (score >= 80) return 'bg-rose-500';
  if (score >= 60) return 'bg-amber-500';
  if (score >= 40) return 'bg-indigo-400';
  return 'bg-emerald-500';
};

export default function MemberTable({ members, onRowClick }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70">
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Member</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tier</th>
              <th className="text-right px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">CLV</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-44">Churn Risk</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="text-right px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((member, idx) => {
              const tier = tierConfig[member.tier] || tierConfig.Silver;
              const status = statusConfig[member.status] || statusConfig.Low;
              return (
                <tr
                  key={member.id}
                  onClick={() => onRowClick(member)}
                  className="hover:bg-indigo-50/40 cursor-pointer transition-colors duration-100 group"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Member */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-700 font-semibold text-xs shrink-0">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">{member.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{member.id}</p>
                      </div>
                    </div>
                  </td>

                  {/* Tier */}
                  <td className="px-4 py-4">
                    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', tier.bg, tier.text)}>
                      <span className={clsx('w-1.5 h-1.5 rounded-full', tier.dot)} />
                      {member.tier}
                    </span>
                  </td>

                  {/* CLV */}
                  <td className="px-4 py-4 text-right">
                    <span className="font-semibold text-slate-800">
                      ${member.clv.toLocaleString()}
                    </span>
                  </td>

                  {/* Churn Risk */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={clsx('h-full rounded-full transition-all', riskBarColor(member.churnRisk))}
                          style={{ width: `${member.churnRisk}%` }}
                        />
                      </div>
                      <span className={clsx(
                        'text-xs font-bold tabular-nums',
                        member.churnRisk >= 80 ? 'text-rose-600' :
                        member.churnRisk >= 60 ? 'text-amber-600' :
                        member.churnRisk >= 40 ? 'text-indigo-600' : 'text-emerald-600'
                      )}>
                        {member.churnRisk}%
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-4">
                    <span className={clsx(
                      'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1',
                      status.bg, status.text, status.ring
                    )}>
                      {member.status}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); onRowClick(member); }}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                    >
                      View →
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {members.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-slate-400 text-sm">No members match this filter.</p>
        </div>
      )}
    </div>
  );
}
