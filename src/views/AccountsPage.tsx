import React, { useMemo, useState } from 'react';
import { useAccountsViewModel } from '../viewModels/useAccountsViewModel';
import type { Account } from '../models/Account';

function formatBalance(cents: number, decimals = 2, currency = 'EUR') {
  const value = cents / Math.pow(10, decimals);
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
  } catch {
    return `${value.toFixed(decimals)} ${currency}`;
  }
}

export const AccountsPage: React.FC = () => {
  const { accounts, loading, error, addAccount, updateAccount, deleteAccount, fetchAccounts } = useAccountsViewModel();

  const [selected, setSelected] = useState<Account | null>(null);
  const [form, setForm] = useState({
    category_id: undefined as number | undefined,
    parent_id: undefined as number | undefined,
    name: '',
    description: '',
    type: '',
    balance: 0,
    balance_decimal: 2,
    virtual: false,
    budget: false,
    currency: 'EUR',
    color: '#000000',
    icon: 'mdi:bank',
  });

  // when user selects an account, populate form
  const onSelect = (a: Account | null) => {
    setSelected(a);
    if (a) {
      setForm({
        category_id: a.category_id,
        parent_id: a.parent_id ?? undefined,
        name: a.name,
        description: a.description ?? '',
        type: a.type,
        balance: a.balance,
        balance_decimal: a.balance_decimal,
        virtual: a.virtual,
        budget: a.budget,
        currency: a.currency,
        color: a.color,
        icon: a.icon,
      });
    } else {
      setForm({
        category_id: undefined,
        parent_id: undefined,
        name: '',
        description: '',
        type: '',
        balance: 0,
        balance_decimal: 2,
        virtual: false,
        budget: false,
        currency: 'EUR',
        color: '#000000',
        icon: 'mdi:bank',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selected) {
        await updateAccount(selected.id, {
            id: selected.id,
          category_id: form.category_id!,
          parent_id: form.parent_id ?? undefined,
          name: form.name,
          description: form.description,
          type: form.type,
          balance: form.balance,
          balance_decimal: form.balance_decimal,
          virtual: form.virtual,
          budget: form.budget,
          currency: form.currency,
          color: form.color,
          icon: form.icon,
        });
      } else {
        await addAccount({
            id: 0, // backend assigns ID
          category_id: form.category_id ?? 0,
          parent_id: form.parent_id ?? undefined,
          name: form.name,
          description: form.description,
          type: form.type || 'other',
          balance: form.balance,
          balance_decimal: form.balance_decimal,
          virtual: form.virtual,
          budget: form.budget,
          currency: form.currency,
          color: form.color,
          icon: form.icon,
        });
      }
      await fetchAccounts();
      onSelect(null);
    } catch (err: any) {
      alert('Save failed: ' + (err.message ?? String(err)));
    }
  };

  const handleDelete = async (a: Account) => {
    if (!confirm(`Delete account "${a.name}" (id=${a.id})? This cannot be undone.`)) return;
    try {
      await deleteAccount(a.id);
      if (selected?.id === a.id) onSelect(null);
    } catch (err: any) {
      alert('Delete failed: ' + (err.message ?? String(err)));
    }
  };

  const totals = useMemo(() => {
    const byCurrency: Record<string, number> = {};
    accounts.forEach(a => {
      const v = a.balance / Math.pow(10, a.balance_decimal);
      byCurrency[a.currency] = (byCurrency[a.currency] || 0) + v;
    });
    return byCurrency;
  }, [accounts]);

  return (
    <div className="p-4 flex gap-6">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Accounts</h2>
          <div>
            <button onClick={() => onSelect(null)} className="mr-2 px-3 py-1 border rounded">New</button>
            <button onClick={() => fetchAccounts()} className="px-3 py-1 border rounded">Refresh</button>
          </div>
        </div>

        {loading && <div>Loading…</div>}
        {error && <div className="text-red-600">Error: {error}</div>}

        <div className="grid grid-cols-1 gap-3">
          {accounts.map(a => (
            <div key={a.id} className={`flex items-center justify-between p-3 rounded-lg shadow ${selected?.id === a.id ? 'ring-2 ring-blue-400' : 'bg-white'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border" style={{ backgroundColor: a.color }} />
                <div>
                  <div className="font-semibold">{a.name}</div>
                  <div className="text-sm text-gray-500">{a.description ?? '—'}</div>
                  <div className="text-xs text-gray-400">Type: {a.type} • Category: {a.category_id} {a.parent_id ? `• Parent: ${a.parent_id}` : ''}</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-mono">{formatBalance(a.balance, a.balance_decimal, a.currency)}</div>
                  <div className="text-xs text-gray-500">{a.virtual ? 'Virtual' : 'Real'} • {a.budget ? 'Budget' : ''}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => onSelect(a)} className="px-2 py-1 border rounded text-sm">Edit</button>
                  <button onClick={() => handleDelete(a)} className="px-2 py-1 border rounded text-sm text-red-600">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <h4 className="font-semibold">Totals</h4>
          <ul>
            {Object.entries(totals).map(([cur, tot]) => (
              <li key={cur}>{new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }).format(tot)}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* SIDE FORM */}
      <aside className="w-96 border p-4 rounded-lg shadow bg-white flex-shrink-0">
        <h3 className="text-lg font-bold mb-4">{selected ? `Edit: ${selected.name}` : 'New account'}</h3>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="text-xs font-medium">Name</label>
          <input className="border p-2 rounded" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />

          <label className="text-xs font-medium">Description</label>
          <input className="border p-2 rounded" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium">Category ID</label>
              <input type="number" className="border p-2 rounded" value={form.category_id ?? ''} onChange={e => setForm({ ...form, category_id: Number(e.target.value) })} />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium">Parent ID</label>
              <input type="number" className="border p-2 rounded" value={form.parent_id ?? ''} onChange={e => setForm({ ...form, parent_id: e.target.value === '' ? undefined : Number(e.target.value) })} />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium">Balance (minor units)</label>
              <input type="number" className="border p-2 rounded" value={form.balance} onChange={e => setForm({ ...form, balance: Number(e.target.value) })} />
            </div>
            <div className="w-24">
              <label className="text-xs font-medium">Decimals</label>
              <input type="number" className="border p-2 rounded" value={form.balance_decimal} onChange={e => setForm({ ...form, balance_decimal: Number(e.target.value) })} />
            </div>
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs font-medium">Type</label>
              <input className="border p-2 rounded" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} />
            </div>

            <div className="flex flex-col items-center">
              <label className="text-xs font-medium">Color</label>
              <input type="color" className="w-12 h-12 p-1 rounded" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
            </div>

            <div className="flex-1">
              <label className="text-xs font-medium">Icon</label>
              <input className="border p-2 rounded" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.virtual} onChange={e => setForm({ ...form, virtual: e.target.checked })} /> Virtual</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.budget} onChange={e => setForm({ ...form, budget: e.target.checked })} /> Budget</label>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={() => onSelect(null)} className="py-2 px-4 rounded border">Clear</button>
            <button type="submit" className="bg-blue-500 text-white py-2 px-4 rounded">Save</button>
          </div>
        </form>
      </aside>
    </div>
  );
};

export default AccountsPage;
