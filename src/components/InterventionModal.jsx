import { useEffect, useState } from 'react';
import {
  X,
  AlertTriangle,
  Info,
  Zap,
  Rocket,
  CalendarDays,
  TrendingDown,
  Star,
  Clock,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import clsx from 'clsx';
import api from '../services/api';

const severityConfig = {
  high: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    badge: 'bg-rose-100 text-rose-700',
    icon: AlertTriangle,
    iconColor: 'text-rose-500',
    label: 'High Impact',
  },
  medium: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    icon: Info,
    iconColor: 'text-amber-500',
    label: 'Medium Impact',
  },
  low: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-600',
    icon: Info,
    iconColor: 'text-slate-400',
    label: 'Low Impact',
  },
};

const tierColors = {
  Platinum: 'from-violet-500 to-indigo-600',
  Gold: 'from-amber-400 to-orange-500',
  Silver: 'from-slate-400 to-slate-600',
};

/**
 * InterventionModal
 *
 * Props:
 *  - member             : normalised customer object from Segments.jsx
 *  - onClose()          : close handler
 *  - onCampaignDeployed(memberId) : called after a successful PATCH — lets the
 *                          parent update its local list optimistically
 */
export default function InterventionModal({ member, onClose, onCampaignDeployed }) {
  const [deploying, setDeploying] = useState(false);
  const [deployed, setDeployed]   = useState(member?._campaign_status === 'Campaign Active');
  const [deployError, setDeployError] = useState('');

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Sync deployed badge when member prop changes (e.g. re-opening same member)
  useEffect(() => {
    setDeployed(member?._campaign_status === 'Campaign Active');
    setDeployError('');
  }, [member]);

  if (!member) return null;

  const gradient = tierColors[member.tier] || 'from-slate-400 to-slate-600';

  const handleDeploy = async () => {
    if (deployed || deploying) return;
    setDeploying(true);
    setDeployError('');

    try {
      await api.patch(`/customers/${member._member_id}/campaign`, {
        action_title: member.recommendedAction.title,
        incentive: member.recommendedAction.campaign,
      });

      setDeployed(true);
      // Notify parent to update list state
      onCampaignDeployed?.(member.id);

      // Auto-close after 1.5 s so the user sees the success tick
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setDeployError(
        err.response?.data?.detail ?? 'Campaign deploy failed. Please try again.'
      );
    } finally {
      setDeploying(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Side panel */}
      <div className="fixed top-0 right-0 h-screen w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col animate-slide-in overflow-hidden">

        {/* Header gradient band */}
        <div className={clsx('bg-gradient-to-r p-6 text-white', gradient)}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg">
                {member.id?.slice(0, 2).toUpperCase() ?? '??'}
              </div>
              <div>
                <h2 className="text-lg font-bold leading-tight">{member.id}</h2>
                <p className="text-white/80 text-sm">{member.persona}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Quick stats in header */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="bg-white/15 rounded-xl p-3 text-center">
              <p className="text-white/70 text-xs mb-0.5">CLV</p>
              <p className="font-bold text-white">${member.clv.toLocaleString()}</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3 text-center">
              <p className="text-white/70 text-xs mb-0.5">Churn Risk</p>
              <p className="font-bold text-white">{member.churnRisk}%</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3 text-center">
              <p className="text-white/70 text-xs mb-0.5">Tier</p>
              <p className="font-bold text-white">{member.tier}</p>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Member stats */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Member Activity</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                <Star size={14} className="text-amber-400 mx-auto mb-1" />
                <p className="text-xs text-slate-500">Points Balance</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">
                  {((member.pointsBalance ?? 0) / 1000).toFixed(0)}K
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                <TrendingDown size={14} className="text-rose-400 mx-auto mb-1" />
                <p className="text-xs text-slate-500">Churn Score</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{member.churnRisk}%</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                <Clock size={14} className="text-slate-400 mx-auto mb-1" />
                <p className="text-xs text-slate-500">Campaign</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">
                  {member._campaign_status === 'Campaign Active' ? 'Active' : 'Idle'}
                </p>
              </div>
            </div>
          </div>

          {/* Churn Factors — XAI Badges */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={14} className="text-indigo-500" />
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Top Churn Factors</h3>
              <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded-full">AI Explained</span>
            </div>
            <div className="space-y-2.5">
              {(member.churnFactors ?? []).map((factor, idx) => {
                const cfg = severityConfig[factor.severity] ?? severityConfig.low;
                const FactorIcon = cfg.icon;
                return (
                  <div
                    key={idx}
                    className={clsx('rounded-xl border p-4 flex gap-3 animate-fade-in', cfg.bg, cfg.border)}
                    style={{ animationDelay: `${idx * 80}ms` }}
                  >
                    <FactorIcon size={16} className={clsx('shrink-0 mt-0.5', cfg.iconColor)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-slate-800">{factor.label}</p>
                        <span className={clsx('text-xs font-medium px-1.5 py-0.5 rounded-full', cfg.badge)}>
                          {cfg.label}
                        </span>
                      </div>
                      {factor.detail && (
                        <p className="text-xs text-slate-500 leading-relaxed">{factor.detail}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {(member.churnFactors ?? []).length === 0 && (
                <p className="text-sm text-slate-400">No churn factors available.</p>
              )}
            </div>
          </div>

          {/* Recommended Action */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Rocket size={14} className="text-emerald-500" />
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recommended Action</h3>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-indigo-50 border border-emerald-200/60 rounded-2xl p-5">
              <h4 className="text-base font-bold text-slate-900 mb-1">{member.recommendedAction.title}</h4>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">{member.recommendedAction.description}</p>

              <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-slate-200/60 p-3 mb-4">
                <p className="text-xs text-slate-500 mb-1">Campaign Template</p>
                <p className="text-sm font-semibold text-slate-800">{member.recommendedAction.campaign}</p>
              </div>

              {/* Deploy error */}
              {deployError && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">
                  ⚠ {deployError}
                </p>
              )}

              {/* CTA button */}
              <button
                id={`deploy-campaign-${member.id}`}
                onClick={handleDeploy}
                disabled={deploying || deployed}
                className={clsx(
                  'w-full font-semibold py-3.5 rounded-xl transition-all duration-200 shadow-md flex items-center justify-center gap-2 text-sm',
                  deployed
                    ? 'bg-emerald-500 text-white cursor-default shadow-emerald-200'
                    : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0'
                )}
              >
                {deployed ? (
                  <><CheckCircle2 size={15} /> Campaign Active</>
                ) : deploying ? (
                  <><Loader2 size={15} className="animate-spin" /> Deploying…</>
                ) : (
                  <><Rocket size={15} /> {member.recommendedAction.ctaLabel}</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
