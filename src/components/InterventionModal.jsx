import { useEffect, useState, useCallback } from 'react';
import {
  X,
  AlertTriangle,
  Info,
  Zap,
  Rocket,
  Star,
  Clock,
  Loader2,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  SlidersHorizontal,
  RefreshCw,
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
  Gold:     'from-amber-400 to-orange-500',
  Silver:   'from-slate-400 to-slate-600',
};

// Churn risk colour based on value
function riskColor(risk) {
  if (risk >= 70) return 'text-rose-600';
  if (risk >= 40) return 'text-amber-500';
  return 'text-emerald-600';
}

function riskBg(risk) {
  if (risk >= 70) return 'bg-rose-50 border-rose-200';
  if (risk >= 40) return 'bg-amber-50 border-amber-200';
  return 'bg-emerald-50 border-emerald-200';
}

/**
 * WhatIfSimulator
 *
 * Props:
 *  member — normalised customer object
 *
 * Calls POST /api/predict/what-if with the member_id + slider values
 * and shows the recalculated churn risk.
 */
function WhatIfSimulator({ member }) {
  // Slider state
  const [flightDelta,      setFlightDelta]      = useState(0);
  const [redemptionRatio,  setRedemptionRatio]  = useState(null);   // null = use stored
  const [monthsInactive,   setMonthsInactive]   = useState(null);   // null = use stored

  const [result,   setResult]   = useState(null);   // WhatIfResponse
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const runSimulation = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/predict/what-if', {
        member_id:               member._member_id,
        flight_freq_delta:       flightDelta,
        points_redeemed_ratio:   redemptionRatio,
        months_inactive_override: monthsInactive,
      });
      setResult(data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (err.response?.status === 503) {
        setError('ML model not loaded on backend. Run: py scripts/train_and_export.py');
      } else {
        setError(detail ?? 'Simulation failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [member._member_id, flightDelta, redemptionRatio, monthsInactive]);

  // Run once on mount to show baseline
  useEffect(() => {
    runSimulation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const delta = result ? result.delta : null;
  const newRisk = result ? result.recalculated_churn_risk : null;

  return (
    <div className="space-y-4">
      {/* Sliders */}
      <div className="space-y-3">
        {/* Flight frequency */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-600">
              Flight Frequency Change
            </label>
            <span className="text-xs font-bold text-indigo-600">
              {flightDelta >= 0 ? '+' : ''}{flightDelta.toFixed(1)} flights/mo
            </span>
          </div>
          <input
            type="range"
            min="-3"
            max="3"
            step="0.5"
            value={flightDelta}
            onChange={(e) => setFlightDelta(parseFloat(e.target.value))}
            className="w-full h-1.5 accent-indigo-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
            <span>−3 (less)</span><span>0</span><span>+3 (more)</span>
          </div>
        </div>

        {/* Points redemption */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-600">
              Points Redemption Ratio
            </label>
            <span className="text-xs font-bold text-indigo-600">
              {redemptionRatio !== null ? `${(redemptionRatio * 100).toFixed(0)}%` : 'Current'}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={redemptionRatio ?? (member.pointsBalance > 0 ? 0.05 : 0)}
            onChange={(e) => setRedemptionRatio(parseFloat(e.target.value))}
            className="w-full h-1.5 accent-indigo-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
            <span>0% (none)</span><span>50%</span><span>100% (all)</span>
          </div>
        </div>

        {/* Months inactive */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-600">
              Months Since Last Flight
            </label>
            <span className="text-xs font-bold text-indigo-600">
              {monthsInactive !== null ? `${monthsInactive} mo` : 'Current'}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="24"
            step="1"
            value={monthsInactive ?? 0}
            onChange={(e) => setMonthsInactive(parseInt(e.target.value, 10))}
            className="w-full h-1.5 accent-indigo-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
            <span>0 mo</span><span>12 mo</span><span>24 mo</span>
          </div>
        </div>
      </div>

      {/* Run button */}
      <button
        onClick={runSimulation}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all"
      >
        {loading
          ? <><Loader2 size={14} className="animate-spin" /> Simulating…</>
          : <><RefreshCw size={14} /> Run Simulation</>
        }
      </button>

      {/* Error */}
      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          ⚠ {error}
        </p>
      )}

      {/* Result */}
      {result && !error && (
        <div className={clsx('rounded-xl border p-4', riskBg(newRisk))}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Recalculated Churn Risk</p>
              <p className={clsx('text-2xl font-black', riskColor(newRisk))}>
                {newRisk}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 mb-0.5">Change</p>
              <div className="flex items-center gap-1 justify-end">
                {delta < 0
                  ? <TrendingDown size={16} className="text-emerald-500" />
                  : delta > 0
                  ? <TrendingUp size={16} className="text-rose-500" />
                  : null
                }
                <p className={clsx(
                  'text-base font-bold',
                  delta < 0 ? 'text-emerald-600' : delta > 0 ? 'text-rose-600' : 'text-slate-500'
                )}>
                  {delta >= 0 ? '+' : ''}{delta}%
                </p>
              </div>
              <p className="text-[10px] text-slate-400">vs current score</p>
            </div>
          </div>

          {delta <= -10 && (
            <p className="mt-3 text-xs text-emerald-700 bg-emerald-100 rounded-lg px-3 py-2 font-medium">
              💡 This scenario would meaningfully reduce churn risk. Consider deploying a targeted campaign.
            </p>
          )}
          {delta >= 10 && (
            <p className="mt-3 text-xs text-rose-700 bg-rose-100 rounded-lg px-3 py-2 font-medium">
              ⚠ This scenario increases churn risk significantly. Early intervention is recommended.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * InterventionModal
 *
 * Props:
 *  - member             : normalised customer object from Segments.jsx
 *  - onClose()          : close handler
 *  - onCampaignDeployed(memberId) : called after a successful PATCH
 */
export default function InterventionModal({ member, onClose, onCampaignDeployed }) {
  const [deploying,    setDeploying]    = useState(false);
  const [deployed,     setDeployed]     = useState(member?._campaign_status === 'Campaign Active');
  const [deployError,  setDeployError]  = useState('');

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Sync deployed badge when member prop changes
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
        incentive:    member.recommendedAction.campaign,
      });

      setDeployed(true);
      onCampaignDeployed?.(member.id);
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

          {/* Quick stats */}
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

          {/* Member Activity */}
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

          {/* Churn Factors — XAI */}
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

          {/* ── What-If Simulator ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <SlidersHorizontal size={14} className="text-violet-500" />
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">What-If Simulator</h3>
              <span className="text-xs text-violet-600 font-medium bg-violet-50 px-1.5 py-0.5 rounded-full">Live ML</span>
            </div>
            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200/60 rounded-2xl p-5">
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Adjust the sliders to simulate how behavioural changes would affect this member's churn risk.
                The ML model recalculates in real time.
              </p>
              <WhatIfSimulator member={member} />
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

              {deployError && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">
                  ⚠ {deployError}
                </p>
              )}

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
