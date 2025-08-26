import React, { useState } from 'react';
import { useTransactionsViewModel } from '../viewModels/useTransactionsViewModel';
import type { Transaction } from '../models/Transaction';


export const TransactionsPage: React.FC = () => {
  const { transactions, addTransaction} = useTransactionsViewModel();
  const [category_id, setCategoryId] = useState('');
  const [from_account_id, setFromAccountId] = useState('');
  const [to_account_id, setToAccountId] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [amount, setAmount] = useState('');
  const [amount_decimal, setAmountDecimal] = useState('');
  const [currency, setCurrency] = useState('');
  
  const [exchange_rate, setExchangeRate] = useState('');
  const [date, setDate] = useState('');
  const [transaction_date, setTransactionDate] = useState('');
  const [scheduled_date, setScheduledDate] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [color, setColor] = useState('');
  const [icon, setIcon] = useState('');
  

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTransaction: Transaction = {
        id: 0, // Assuming the backend will assign the ID
        category_id: parseInt(category_id, 10),
        from_account_id: parseInt(from_account_id, 10) || undefined,
        to_account_id: parseInt(to_account_id, 10) || undefined,

        type: type,
        status: status,
        method: method,

        amount: parseInt(amount, 10),
        amount_decimal: parseInt(amount_decimal, 10) || 2,

        currency: currency || 'EUR',
        exchange_rate: parseFloat(exchange_rate) || 1.0,

        date: new Date(date).toISOString(),
        transaction_date: new Date(transaction_date).toISOString(),
        scheduled_date: scheduled_date ? new Date(scheduled_date).toISOString() : undefined,

        description: description || undefined,

        note: note || undefined,
        tags: tags || undefined,

        color: color || '#000000',
        icon: icon || 'default-icon',
    };
    addTransaction(newTransaction);
    setAmount(''); setCategoryId(''); setDescription('');
    setFromAccountId(''); setToAccountId(''); setType(''); setStatus('');
    setMethod(''); setAmountDecimal(''); setCurrency('');
    setExchangeRate(''); setDate(''); setTransactionDate('');
    setScheduledDate(''); setNotes(''); setTags(''); setColor(''); 
    setIcon('');

  };

  return (
    <div>
      <h2>Transactions</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Category</th>
            <th>From Account</th>
            <th>To Account</th>

            <th>Type</th>
            <th>Status</th>
            <th>Method</th>

            <th>Amount</th>
            <th>Amount Decimal</th>

            <th>Currency</th>
            <th>Exchange Rate</th>

            <th>Date</th>
            <th>Transaction Date</th>
            <th>Scheduled Date</th>

            <th>Description</th>

            <th>Note</th>
            <th>Tags</th>

            <th>Color</th>
            <th>Icon</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(s => (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td>{s.category_id}</td>
              <td>{s.from_account_id}</td>
              <td>{s.to_account_id}</td>

              <td>{s.type}</td>
              <td>{s.status}</td>
              <td>{s.method}</td>

              <td>{s.amount}</td>
              <td>{s.amount_decimal}</td>

              <td>{s.currency}</td>
              <td>{s.exchange_rate}</td>

              <td>{new Date(s.date).toLocaleDateString()}</td>
              <td>{new Date(s.transaction_date).toLocaleDateString()}</td>
              <td>{s.scheduled_date ? new Date(s.scheduled_date).toLocaleDateString() : 'N/A'}</td>

              <td>{s.description || 'N/A'}</td>

              <td>{s.note || 'N/A'}</td>
              <td>{s.tags || 'N/A'}</td>

              <td style={{ backgroundColor: s.color }}>{s.color}</td>
              <td><i className={s.icon}></i></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Add Transaction</h3>
      <form onSubmit={handleSubmit}>
        <input type="number" placeholder="Category ID" value={category_id} onChange={(e) => setCategoryId(e.target.value)} required />
        <input type="number" placeholder="From Account ID" value={from_account_id}
                onChange={(e) => setFromAccountId(e.target.value)} />
        <input type="number" placeholder="To Account ID" value={to_account_id}
                onChange={(e) => setToAccountId(e.target.value)} />
        <input type="text" placeholder="Type" value={type} onChange={(e) => setType(e.target.value)} required />
        <input type="text" placeholder="Status" value={status} onChange={(e) => setStatus(e.target.value)} required />
        <input type="text" placeholder="Method" value={method} onChange={(e) => setMethod(e.target.value)} required />
        <input type="number" placeholder="Amount" value={amount} onChange={(e   ) => setAmount(e.target.value)} required />
        <input type="number" placeholder="Amount Decimal" value={amount_decimal} onChange={(e) => setAmountDecimal(e.target.value)} />
        <input type="text" placeholder="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
        <input type="number" placeholder="Exchange Rate" value={exchange_rate} onChange={(e) => setExchangeRate(e.target.value)} />
        <input type="date" placeholder="Date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <input type="date" placeholder="Transaction Date" value={transaction_date} onChange={(e) => setTransactionDate(e.target.value)} required />
        <input type="date" placeholder="Scheduled Date" value={scheduled_date} onChange={(e) => setScheduledDate(e.target.value)} />
        <input type="text" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input type="text" placeholder="Note" value={note} onChange={(e) => setNotes(e.target.value)} />
        <input type="text" placeholder="Tags" value={tags} onChange={(e ) => setTags(e.target.value)} />
        <input type="color" placeholder="Color" value={color} onChange={(e) => setColor(e.target.value)} />
        <input type="text" placeholder="Icon" value={icon} onChange={(e) => setIcon(e.target.value)} />   

        <button type="submit">Aggiungi</button>
      </form>
    </div>
  );
};

export default TransactionsPage;