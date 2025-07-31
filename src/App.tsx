import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TransactionPage } from './views/TransactionPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TransactionPage />} />
      </Routes>
    </BrowserRouter>
  );
}