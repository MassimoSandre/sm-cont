import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import TransactionsPage from './views/TransactionsPage';
import TransactionsCategoryPage from './views/TransactionsCategoryPage';
import AccountsPage from './views/AccountsPage';
import AccountsCategoryPage from './views/AccountsCategoryPage';

/*{ to: '/transactions',         label: 'Transactions' },
    { to: '/transactions_categories',label: 'Transaction Categories' },
    { to: '/accounts', label: 'Accounts' },
    { to: '/accounts_categories',label: 'Accounts Categories' },
*/
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>  
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="transactions_categories" element={<TransactionsCategoryPage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="accounts_categories" element={<AccountsCategoryPage />} />
          {/* <Route path="accounts" element={<AccountsPage />} />
          <Route path="accounts_categories" element={<AccountsCategoryPage />} /> */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}