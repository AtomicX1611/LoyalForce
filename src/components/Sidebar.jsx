import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Plane,
  Bell,
  Settings,
  ChevronDown,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/segments', label: 'Segments', icon: Users },
  { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
];

const secondaryItems = [
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 flex flex-col bg-white border-r border-slate-200 h-screen sticky top-0">
      {/* Logo / Tenant */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-200">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
          <Plane size={16} className="text-white -rotate-45" />
        </div>
        <div>
          <p className="text-sm font-700 text-slate-900 leading-tight font-bold">Northern Lights Air</p>
          <p className="text-xs text-slate-500 leading-tight">Loyalty Analytics</p>
        </div>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-2 mb-2">Main</p>
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={16}
                  className={`transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`}
                />
                {label}
                {label === 'Segments' && (
                  <span className="ml-auto text-xs bg-rose-100 text-rose-600 font-semibold px-1.5 py-0.5 rounded-full">
                    8.9K
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}

        <div className="pt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-2 mb-2">System</p>
          {secondaryItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={16}
                    className={`transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`}
                  />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User profile */}
      <div className="px-3 py-4 border-t border-slate-200">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            SM
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">Sarah Mitchell</p>
            <p className="text-xs text-slate-500 truncate">Marketing Manager</p>
          </div>
          <ChevronDown size={14} className="text-slate-400 shrink-0" />
        </button>
      </div>
    </aside>
  );
}
