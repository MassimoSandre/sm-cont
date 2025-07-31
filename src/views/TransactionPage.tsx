import React, { useState } from 'react';
import { useTransactionViewModel } from '../viewModels/useTransactionViewModel';
import type { Transaction } from '../models/Transaction';
import { v4 as uuidv4 } from 'uuid';

export const TransactionPage: React.FC = () => {
  const { transactions, addTransaction} = useTransactionViewModel();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTransaction: Transaction = {
        id: uuidv4(),
        amount: parseFloat(amount),
        category,
        date: new Date().toISOString(),
        description: description || undefined
    };
    addTransaction(newTransaction);
    setAmount(''); setCategory(''); setDescription('');
  };

  return (
    <div>
      <h2>Transazioni</h2>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Categoria</th>
            <th>Importo</th>
            <th>Descrizione</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(s => (
            <tr key={s.id}>
              <td>{new Date(s.date).toLocaleDateString()}</td>
              <td>{s.category}</td>
              <td>{s.amount.toFixed(2)}€</td>
              <td>{s.description || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Aggiungi Spesa</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="number"
          step="0.01"
          placeholder="Amount"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Category"
          value={category}
          onChange={e => setCategory(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <button type="submit">Aggiungi</button>
      </form>
    </div>
  );
};