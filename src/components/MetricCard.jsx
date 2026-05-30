import { TrendingUp, TrendingDown } from 'lucide-react';
import clsx from 'clsx';

export default function MetricCard({ title, value, change, changeLabel, icon: Icon, iconBg, trend, prefix, suffix }) {
  const isPositive = trend === 'up';
  const isNeutral = trend === 'neutral';

  // For CLV at Risk and High Risk Segment — up is bad (red), for Total Members — up is good (green)
  const changeIsGood = (trend === 'up' && !isNeutral);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-4 hover:shadow-md transition-shadow duration-200 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1 tracking-tight">
            {prefix && <span className="text-xl font-semibold text-slate-600 mr-0.5">{prefix}</span>}
            {value}
            {suffix && <span className="text-xl font-semibold text-slate-600 ml-0.5">{suffix}</span>}
          </p>
        </div>
        <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center', iconBg)}>
          <Icon size={20} className="text-white" />
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {isPositive ? (
          <TrendingUp size={14} className={clsx(changeIsGood ? 'text-emerald-500' : 'text-rose-500')} />
        ) : (
          <TrendingDown size={14} className="text-emerald-500" />
        )}
        <span className={clsx(
          'text-sm font-semibold',
          isPositive
            ? changeIsGood ? 'text-emerald-600' : 'text-rose-600'
            : 'text-emerald-600'
        )}>
          {change > 0 ? '+' : ''}{change}%
        </span>
        <span className="text-sm text-slate-400">{changeLabel || 'vs last month'}</span>
      </div>
    </div>
  );
}
