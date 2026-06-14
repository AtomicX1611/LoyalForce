import { Bell, Search, LogOut } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

const pageTitles = {
  '/':          { title: 'Dashboard',        subtitle: 'Loyalty health at a glance' },
  '/segments':  { title: 'Segment Explorer', subtitle: 'Drill into at-risk member groups and trigger interventions' },
  '/campaigns': { title: 'Campaigns',        subtitle: 'Active and scheduled loyalty campaigns' },
};

// Static system notifications — shown in a dropdown
const NOTIFICATIONS = [
  { id: 1, text: '3 Platinum members entered critical churn risk', time: '2 min ago', unread: true },
  { id: 2, text: 'Campaign "Gold Renewal" reached 80% delivery', time: '18 min ago', unread: true },
  { id: 3, text: 'ML model retrained — 97.2% accuracy', time: '1 hr ago', unread: false },
];

export default function Header() {
  const location = useLocation();
  const navigate  = useNavigate();
  const { user, logout } = useAuth();
  const page = pageTitles[location.pathname] || pageTitles['/'];

  const [searchVal,  setSearchVal]  = useState('');
  const [showNotifs, setShowNotifs] = useState(false);

  // Derive initials from email
  const initials = user?.email
    ? user.email.split('@')[0].slice(0, 2).toUpperCase()
    : 'LF';

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchVal.trim()) {
      // Navigate to segments with the search term in the URL state
      navigate('/segments', { state: { search: searchVal.trim() } });
      setSearchVal('');
    }
  };

  const unreadCount = NOTIFICATIONS.filter((n) => n.unread).length;

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h1 className="text-xl font-bold text-slate-900 leading-tight">{page.title}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{page.subtitle}</p>
      </div>

      <div className="flex items-center gap-3">

        {/* Search — press Enter to jump to Segments with pre-filled query */}
        <div className="relative hidden md:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search members… (Enter)"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            onKeyDown={handleSearch}
            className="pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all w-56"
          />
        </div>

        {/* Notifications bell with dropdown */}
        <div className="relative">
          <button
            id="header-notifications"
            onClick={() => setShowNotifs((v) => !v)}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <Bell size={16} className="text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {showNotifs && (
            <>
              {/* Click-away backdrop */}
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowNotifs(false)}
              />
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 overflow-hidden animate-fade-in">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-bold text-slate-900">Notifications</p>
                  <span className="text-xs bg-rose-100 text-rose-600 font-semibold px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                </div>
                <div className="divide-y divide-slate-50">
                  {NOTIFICATIONS.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 text-sm flex gap-3 items-start ${n.unread ? 'bg-indigo-50/40' : ''}`}
                    >
                      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.unread ? 'bg-indigo-500' : 'bg-slate-200'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-700 leading-snug">{n.text}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2.5 border-t border-slate-100 text-center">
                  <button
                    className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 transition-colors"
                    onClick={() => setShowNotifs(false)}
                  >
                    Mark all as read
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Tenant / user badge */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
          <div className="hidden lg:block">
            <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[140px]">{user?.email ?? '—'}</p>
            <p className="text-xs text-slate-500">{user?.tenant_id ?? '—'}</p>
          </div>
        </div>

        {/* Logout */}
        <button
          id="header-logout"
          onClick={logout}
          title="Sign out"
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-rose-50 hover:border-rose-200 transition-colors group"
        >
          <LogOut size={15} className="text-slate-500 group-hover:text-rose-500 transition-colors" />
        </button>
      </div>
    </header>
  );
}
