import { Bell, Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const pageTitles = {
  '/': { title: 'Dashboard', subtitle: 'Loyalty health at a glance — Last updated 2 minutes ago' },
  '/segments': { title: 'Segment Explorer', subtitle: 'Drill into at-risk member groups and trigger interventions' },
  '/campaigns': { title: 'Campaigns', subtitle: 'Active and scheduled loyalty campaigns' },
  '/settings': { title: 'Settings', subtitle: 'Configure your workspace and integrations' },
};

export default function Header() {
  const location = useLocation();
  const page = pageTitles[location.pathname] || pageTitles['/'];

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h1 className="text-xl font-bold text-slate-900 leading-tight">{page.title}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{page.subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search members..."
            className="pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all w-52"
          />
        </div>

        {/* Notifications */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
          <Bell size={16} className="text-slate-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
        </button>

        {/* Tenant badge */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
            SM
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-semibold text-slate-800 leading-tight">Sarah Mitchell</p>
            <p className="text-xs text-slate-500">Northern Lights Air</p>
          </div>
        </div>
      </div>
    </header>
  );
}
