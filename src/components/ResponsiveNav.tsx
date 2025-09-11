import React from 'react';
import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';

import { CurrencyDollar, FolderSimple, Bank, Tag } from 'phosphor-react';


type LinkDef = { to: string; label: string; icon?: React.ReactNode };

const LINKS: LinkDef[] = [
  { to: '/transactions', label: 'Transactions', icon: <CurrencyDollar size={18} className="text-current" /> },
  { to: '/transactions_categories', label: 'Categories', icon: <FolderSimple size={18} className="text-current" /> },
  { to: '/accounts', label: 'Accounts', icon: <Bank size={18} className="text-current" /> },
  { to: '/accounts_categories', label: 'Account cats', icon: <Tag size={18} className="text-current" /> },
];


export default function ResponsiveNav() {
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);  
  const  [theme, setTheme] = useState<string>(() => localStorage.getItem('site-theme') ?? 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('site-theme', theme);
  }, [theme]);

  const handleThemeChange = (t: string) => {
    setTheme(t);
    setThemeDropdownOpen(false); // chiudi dropdown dopo la scelta (opzionale)
  };

  return (
    <>
      {/* Top bar for md+ screens */}
      <nav
        className="hidden md:flex items-center justify-between gap-4 px-4 py-3 border-b border-base-300 bg-base-100 shadow-sm fixed top-0 left-0 right-0 z-40"
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-3">
          <div className="text-xl font-bold">MyApp</div>
          <div className="text-sm text-gray-500">dashboard</div>
        </div>

        <div className="dropdown dropdown-end">
          <button
            type="button"
            className="btn btn-ghost btn-sm gap-2"
            onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
          >
            Tema
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div className={`dropdown-content menu p-3 shadow bg-base-100 rounded-box w-48 ${themeDropdownOpen ? 'block' : 'hidden'}`}>
            <fieldset>
              <legend className="font-medium mb-2">Tema (DaisyUI)</legend>
              <div className="flex flex-col gap-2">
                {['light','dark','synthwave','valentine','retro'].map(t => (
                  <button
                    key={t}
                    onClick={() => handleThemeChange(t)}
                    className={`btn btn-sm justify-start capitalize ${
                      theme === t ? 'btn-primary' : 'btn-ghost'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </div>



        <ul className="flex items-center gap-2">
          {LINKS.map(link => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                    isActive
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                      : 'text-base-content hover:bg-base-200'
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
