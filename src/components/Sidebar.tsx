import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  const links = [
    { to: '/transactions',         label: 'Transactions' },
    { to: '/transactions_categories',label: 'Transaction Categories' },
    { to: '/accounts', label: 'Accounts' },
    { to: '/accounts_categories',label: 'Accounts Categories' },
  ];

  return (
    <nav className="w-64 bg-gray-100 p-4">
      <ul>
        {links.map(link => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              className={({ isActive }) =>
                isActive ? 'font-bold text-blue-600' : 'text-gray-700'
              }
            >
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}