import React from 'react';
import { NavLink } from 'react-router-dom';

type LinkDef = { to: string; label: string; icon?: React.ReactNode };

const LINKS: LinkDef[] = [
  { to: '/transactions', label: 'Transactions', icon: '💸' },
  { to: '/transactions_categories', label: 'Categories', icon: '📂' },
  { to: '/accounts', label: 'Accounts', icon: '🏦' },
  { to: '/accounts_categories', label: 'Account cats', icon: '🗂️' },
];

export default function ResponsiveNav() {
  return (
    <>
      {/* Top bar for md+ screens */}
      <nav
        className="hidden md:flex items-center justify-between gap-4 px-4 py-3 bg-white border-b border-neutral-200 shadow-sm
                   fixed top-0 left-0 right-0 z-40"
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-3">
          <div className="text-xl font-bold">MyApp</div>
          <div className="text-sm text-gray-500">dashboard</div>
        </div>

        <ul className="flex items-center gap-2">
          {LINKS.map(link => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-100'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`
                }
              >
                <span className="text-lg">{link.icon}</span>
                <span>{link.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom bar for small screens */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-200 shadow-inner"
        aria-label="Mobile navigation"
      >
        <ul className="flex justify-between items-center px-2 py-2">
          {LINKS.map(link => (
            <li key={link.to} className="flex-1">
              <NavLink
                to={link.to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 text-xs py-1 ${
                    isActive ? 'text-blue-600' : 'text-gray-600'
                  }`
                }
              >
                <span className="text-lg">{link.icon}</span>
                <span className="truncate max-w-[70px]">{link.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
