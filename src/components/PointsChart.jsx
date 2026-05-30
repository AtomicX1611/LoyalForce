import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { pointsChartData } from '../data/dummyData';

const formatM = (value) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-sm">
        <p className="font-semibold text-slate-800 mb-2">{label}</p>
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 mb-1">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: entry.color }}
            />
            <span className="text-slate-600">{entry.name}:</span>
            <span className="font-semibold text-slate-900">{formatM(entry.value)} pts</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function PointsChart() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-fade-in delay-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Points Accrued vs. Redeemed</h2>
          <p className="text-sm text-slate-500 mt-0.5">6-month trend across the full member base</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-indigo-500 rounded-full inline-block" />
            <span className="text-slate-600 font-medium">Accrued</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-500 rounded-full inline-block" />
            <span className="text-slate-600 font-medium">Redeemed</span>
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={pointsChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#94a3b8', fontFamily: 'Inter' }}
          />
          <YAxis
            tickFormatter={formatM}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#94a3b8', fontFamily: 'Inter' }}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="accrued"
            name="Accrued"
            stroke="#6366f1"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#4f46e5', strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="redeemed"
            name="Redeemed"
            stroke="#10b981"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#059669', strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
