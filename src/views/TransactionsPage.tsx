import React, { useMemo, useState } from 'react';
import { useTransactionsViewModel } from '../viewModels/useTransactionsViewModel';
import { useAccountsViewModel } from '../viewModels/useAccountsViewModel';
import { useAccountsCategoryViewModel } from '../viewModels/useAccountsCategoryViewModel';
import { useTransactionsCategoryViewModel } from '../viewModels/useTransactionsCategoryViewModel';
import AccountCategoryPicker from '../components/AccountCategoryPicker';

// tipi locali veloci
type DetailRowUI = {
  id: string; // client id
  amountStr: string; // decimal string shown to user e.g. "12.34"
  amountMinor: number;
  amount_decimal: number;
  description?: string;
  notes?: string;
  tags?: string;
  color?: string;
  icon?: string;
};

export const TransactionsPage: React.FC = () => {
  const {
    session,
    headers,
    details,
    loading,
    error,
    fetchHeaders,
    fetchDetailsFor,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    parseDecimalToMinor,
    formatMinorToDecimal,
  } = useTransactionsViewModel();

  const { accounts, fetchAccounts } = useAccountsViewModel();
  const { accountCategories, fetchCategories: fetchAccountCategories } = useAccountsCategoryViewModel();
  const { transactionCategories, fetchCategories: fetchTransactionCategories } = useTransactionsCategoryViewModel();

  // form state
  const [selectedHeader, setSelectedHeader] = useState<number | null>(null); // id
  const [headerForm, setHeaderForm] = useState({
    category_id: undefined as number | undefined,
    from_account_id: undefined as number | undefined,
    to_account_id: undefined as number | undefined,
    type: 'expense',
    status: 'completed',
    method: 'other',
    amountStr: '0.00',
    amount_decimal: 2,
    currency: 'EUR',
    exchange_rate: 1.0,
    dateISO: new Date().toISOString(),
    transactionDateISO: new Date().toISOString(),
    scheduledDateISO: undefined as string | undefined,
    description: '',
    notes: '',
    tags: '',
    color: '#000000',
    icon: 'mdi:bank',
    hasDetails: false,
  });

  // detail rows local UI
  const [detailRows, setDetailRows] = useState<DetailRowUI[]>([]);

  // pickers state
  const [catPickerOpen, setCatPickerOpen] = useState(false);
  const [fromPickerOpen, setFromPickerOpen] = useState(false);
  const [toPickerOpen, setToPickerOpen] = useState(false);

  // format and helpers
  function totalDetailsMinor() {
    return detailRows.reduce((acc, r) => acc + BigInt(r.amountMinor), 0n);
  }

  function totalDetailsStr() {
    if (detailRows.length === 0) return '0.00';
    const decimals = headerForm.amount_decimal;
    return (totalDetailsMinor()).toString(); // raw minor string if needed
  }

  // when user chooses to edit existing header
  const openEdit = async (hId: number) => {
    const h = headers.find(x => x.id === hId);
    if (!h) return;
    setSelectedHeader(hId);
    setHeaderForm({
      category_id: h.category_id,
      from_account_id: h.from_account_id ?? undefined,
      to_account_id: h.to_account_id ?? undefined,
      type: h.type,
      status: h.status,
      method: h.method,
      amountStr: formatAmountStringFromMinor(h.amount, h.amount_decimal),
      amount_decimal: h.amount_decimal,
      currency: h.currency,
      exchange_rate: h.exchange_rate,
      dateISO: h.date,
      transactionDateISO: h.transaction_date,
      scheduledDateISO: h.scheduled_date ?? undefined,
      description: h.description ?? '',
      notes: h.notes ?? '',
      tags: h.tags ?? '',
      color: h.color ?? '#000000',
      icon: h.icon ?? 'mdi:bank',
      hasDetails: false,
    });

    // fetch details
    await fetchDetailsFor(hId);
    const rows = (details[hId] ?? []).map(d => ({
      id: `srv-${d.id}`,
      amountStr: formatAmountStringFromMinor(d.amount, d.amount_decimal),
      amountMinor: d.amount,
      amount_decimal: d.amount_decimal,
      description: d.description ?? '',
      notes: d.notes ?? '',
      tags: d.tags ?? '',
      color: d.color ?? '#000000',
      icon: d.icon ?? 'mdi:bank',
    }));
    setDetailRows(rows);
    setHeaderForm(prev => ({ ...prev, hasDetails: rows.length > 0 }));
  };

  function formatAmountStringFromMinor(minor: number, decimals: number) {
    // returns e.g. "12.34"
    const s = minor < 0n ? '-' + (-minor).toString() : minor.toString();
    const padded = s.padStart(decimals + 1, '0');
    const w = padded.slice(0, padded.length - decimals);
    const f = padded.slice(padded.length - decimals);
    return `${w}.${f}`;
  }

  // add local empty detail row
  const addDetailRow = () => {
    setDetailRows(prev => [
      ...prev,
      {
        id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        amountStr: '0.00',
        amountMinor: 0,
        amount_decimal: headerForm.amount_decimal,
        description: '',
        notes: '',
        tags: '',
        color: '#000000',
        icon: 'mdi:bank',
      },
    ]);
    setHeaderForm(prev => ({ ...prev, hasDetails: true }));
  };

  const updateDetailRowAmount = (rowId: string, amountStr: string) => {
    const minor = parseDecimalToMinorLocal(amountStr, headerForm.amount_decimal);
    setDetailRows(prev => prev.map(r => (r.id === rowId ? { ...r, amountStr, amountMinor: minor } : r)));
  };

  function parseDecimalToMinorLocal(amountStr: string, decimals: number) {
    const normalized = String(amountStr).replace(',', '.').trim();
    if (normalized === '') return 0n;
    const parts = normalized.split('.');
    let whole = parts[0] || '0';
    let frac = parts[1] || '';
    if (frac.length > decimals) frac = frac.slice(0, decimals);
    while (frac.length < decimals) frac += '0';
    const combined = whole + frac;
    const digits = combined.replace(/[^\d-]/g, '');
    return (digits || '0');
  }

  const removeDetailRow = (rowId: string) => {
    setDetailRows(prev => {
      const next = prev.filter(r => r.id !== rowId);
      // if no rows left, maybe clear hasDetails
      if (next.length === 0) setHeaderForm(prev => ({ ...prev, hasDetails: false }));
      return next;
    });
  };

  // validate before submit
  function validateBeforeSubmit() {
    // header amount convert to minor
    const headerMinor = parseDecimalToMinor(headerForm.amountStr, headerForm.amount_decimal);
    if (headerForm.hasDetails) {
      if (detailRows.length === 0) return { ok: false, message: 'Hai abilitato i dettagli ma non ci sono voci.' };
      const sum = detailRows.reduce((acc, r) => acc + r.amountMinor, 0n);
      if (sum !== headerMinor) {
        return { ok: false, message: `La somma dei dettagli (${formatMinorHuman(sum, headerForm.amount_decimal)}) non coincide con l'importo della testata (${headerForm.amountStr}).` };
      }
    } else {
      // header amount must be > 0
      if (!headerForm.amountStr || headerForm.amountStr.trim() === '') return { ok: false, message: 'Inserisci l\'importo della transazione.' };
    }
    // category must be selected
    if (!headerForm.category_id) return { ok: false, message: 'Seleziona la categoria della transazione.' };
    // from/to for transfer? if type == 'transfer' ensure both present
    if (headerForm.type === 'transfer') {
      if (!headerForm.from_account_id || !headerForm.to_account_id) return { ok: false, message: 'Per trasferimenti serve conto di origine e destinazione.' };
    }
    return { ok: true };
  }

  function formatMinorHuman(minor: number, decimals: number) {
    const sign = minor < 0n ? '-' : '';
    const m = minor < 0n ? -minor : minor;
    const s = m.toString().padStart(decimals + 1, '0');
    const w = s.slice(0, s.length - decimals);
    const f = s.slice(s.length - decimals);
    return `${sign}${w}.${f}`;
  }

  // submit (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validateBeforeSubmit();
    if (!v.ok) {
      alert(v.message);
      return;
    }
    try {
      const headerMinor = parseDecimalToMinor(headerForm.amountStr, headerForm.amount_decimal);

      if (selectedHeader) {
        // update header
        await updateTransaction(selectedHeader, {
          id: selectedHeader,
          amount: headerMinor,
          amount_decimal: headerForm.amount_decimal,
          category_id: headerForm.category_id!,
          from_account_id: headerForm.from_account_id ?? undefined,
          to_account_id: headerForm.to_account_id ?? undefined,
          type: headerForm.type,
          status: headerForm.status,
          method: headerForm.method,
          currency: headerForm.currency,
          exchange_rate: headerForm.exchange_rate,
          date: headerForm.dateISO,
          transaction_date: headerForm.transactionDateISO,
          scheduled_date: headerForm.scheduledDateISO ?? undefined,
          description: headerForm.description || undefined,
          notes: headerForm.notes || undefined,
          tags: headerForm.tags || undefined,
          color: headerForm.color,
          icon: headerForm.icon,
        });

        // Note: updating details (insert/delete/update) not implemented here for brevity.
        // In production, implement compare existing details and upsert accordingly.
      } else {
        // create
        const detailsPayload = headerForm.hasDetails ? detailRows.map(r => ({
          amountMinor: r.amountMinor,
          amount_decimal: r.amount_decimal,
          description: r.description,
          notes: r.notes,
          tags: r.tags,
          color: r.color,
          icon: r.icon,
        })) : undefined;

        await createTransaction({
          category_id: headerForm.category_id!,
          from_account_id: headerForm.from_account_id ?? null,
          to_account_id: headerForm.to_account_id ?? null,
          type: headerForm.type,
          status: headerForm.status,
          method: headerForm.method,
          amountMinor: headerMinor,
          amount_decimal: headerForm.amount_decimal,
          currency: headerForm.currency,
          exchange_rate: headerForm.exchange_rate,
          dateISO: headerForm.dateISO,
          transaction_dateISO: headerForm.transactionDateISO,
          scheduled_dateISO: headerForm.scheduledDateISO ?? null,
          description: headerForm.description || null,
          notes: headerForm.notes || null,
          tags: headerForm.tags || null,
          color: headerForm.color,
          icon: headerForm.icon,
        }, detailsPayload);
      }

      // refresh
      await fetchHeaders();
      await fetchAccounts();
      // clear form
      setSelectedHeader(null);
      setHeaderForm({
        category_id: undefined,
        from_account_id: undefined,
        to_account_id: undefined,
        type: 'expense',
        status: 'completed',
        method: 'other',
        amountStr: '0.00',
        amount_decimal: 2,
        currency: 'EUR',
        exchange_rate: 1.0,
        dateISO: new Date().toISOString(),
        transactionDateISO: new Date().toISOString(),
        scheduledDateISO: undefined,
        description: '',
        notes: '',
        tags: '',
        color: '#000000',
        icon: 'mdi:bank',
        hasDetails: false,
      });
      setDetailRows([]);
      alert('Transazione salvata.');
    } catch (err: any) {
      console.error('save transaction error', err);
      alert('Errore salvataggio: ' + (err.message ?? String(err)));
    }
  };

  // quick UI helpers for pickers: treat accounts and categories as generic nodes for CategoryPicker
  const accountNodesForPicker = accounts.map(a => ({
    id: a.id,
    parent_id: a.parent_id ?? null,
    name: a.name,
    description: a.description ?? '',
    color: a.color ?? '#000000',
  }));

  const transactionCatNodes = transactionCategories.map(c => ({
    id: c.id,
    parent_id: c.parent_id ?? null,
    name: c.name,
    description: c.description ?? '',
    color: c.color ?? '#000000',
  }));

  return (
    <div className="p-4 flex gap-6">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Transactions</h2>
          <div>
            <button onClick={() => { setSelectedHeader(null); setDetailRows([]); }} className="mr-2 px-3 py-1 border rounded">New</button>
            <button onClick={() => { fetchHeaders(); fetchAccounts(); fetchAccountCategories(); fetchTransactionCategories(); }} className="px-3 py-1 border rounded">Refresh</button>
          </div>
        </div>

        {loading && <div>Loading…</div>}
        {error && <div className="text-red-600">Error: {error}</div>}

        <div className="space-y-2">
          {headers.map(h => (
            <div key={h.id} className="p-3 border rounded flex justify-between items-center">
              <div>
                <div className="font-semibold">{h.description ?? '(no description)'}</div>
                <div className="text-sm text-gray-500">Amount: {formatMinorToDecimal(h.amount as number, h.amount_decimal)} {h.currency} • Type: {h.type}</div>
                <div className="text-xs text-gray-400">From {h.from_account_id ?? '—'} → To {h.to_account_id ?? '—'} • Cat {h.category_id}</div>
              </div>
              <div className="flex gap-2">
                <button className="px-2 py-1 border rounded" onClick={() => openEdit(h.id!)}>Edit</button>
                <button className="px-2 py-1 border rounded text-red-600" onClick={async () => {
                  if (!confirm('Delete transaction?')) return;
                  await deleteTransaction(h.id!);
                  fetchHeaders();
                }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SIDE FORM */}
      <aside className="w-[720px] border p-4 rounded-lg shadow bg-white flex-shrink-0">
        <h3 className="text-lg font-bold mb-4">{selectedHeader ? `Edit transaction #${selectedHeader}` : 'New transaction'}</h3>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* category picker */}
          <div>
            <label className="text-xs font-medium">Category</label>
            <div className="flex gap-2 items-center">
              <div className="flex-1 min-w-0">
                <div className="border p-2 rounded truncate">{headerForm.category_id ? `ID ${headerForm.category_id}` : '— select category —'}</div>
              </div>
              <div className="relative">
                <button type="button" onClick={() => { setCatPickerOpen(!catPickerOpen); fetchTransactionCategories(); }} className="px-2 py-1 border rounded">Choose</button>
                {catPickerOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-80 bg-white border rounded shadow">
                    <AccountCategoryPicker
                      categories={transactionCatNodes}
                      selectedId={headerForm.category_id ?? undefined}
                      onSelect={(n) => { setHeaderForm(prev => ({ ...prev, category_id: n.id })); setCatPickerOpen(false); }}
                      width="w-80"
                      autoFocusSearch
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* from / to account pickers (side by side) */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium">From account</label>
              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <div className="border p-2 rounded truncate">{headerForm.from_account_id ? `ID ${headerForm.from_account_id}` : '— select —'}</div>
                </div>
                <div className="relative">
                  <button type="button" onClick={() => { setFromPickerOpen(!fromPickerOpen); fetchAccounts(); }} className="px-2 py-1 border rounded">Choose</button>
                  {fromPickerOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-80 bg-white border rounded shadow">
                      <AccountCategoryPicker
                        categories={accountNodesForPicker as any}
                        selectedId={headerForm.from_account_id ?? undefined}
                        onSelect={(n: any) => { setHeaderForm(prev => ({ ...prev, from_account_id: n.id })); setFromPickerOpen(false); }}
                        width="w-80"
                        autoFocusSearch
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1">
              <label className="text-xs font-medium">To account</label>
              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <div className="border p-2 rounded truncate">{headerForm.to_account_id ? `ID ${headerForm.to_account_id}` : '— select —'}</div>
                </div>
                <div className="relative">
                  <button type="button" onClick={() => { setToPickerOpen(!toPickerOpen); fetchAccounts(); }} className="px-2 py-1 border rounded">Choose</button>
                  {toPickerOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-80 bg-white border rounded shadow">
                      <AccountCategoryPicker
                        categories={accountNodesForPicker as any}
                        selectedId={headerForm.to_account_id ?? undefined}
                        onSelect={(n: any) => { setHeaderForm(prev => ({ ...prev, to_account_id: n.id })); setToPickerOpen(false); }}
                        width="w-80"
                        autoFocusSearch
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* type / method / status */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium">Type</label>
              <select className="border p-2 rounded w-full" value={headerForm.type} onChange={e => setHeaderForm(prev => ({ ...prev, type: e.target.value }))}>
                <option value="expense">expense</option>
                <option value="income">income</option>
                <option value="transfer">transfer</option>
                <option value="reimbursement">reimbursement</option>
                <option value="refund">refund</option>
                <option value="other">other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Method</label>
              <select className="border p-2 rounded" value={headerForm.method} onChange={e => setHeaderForm(prev => ({ ...prev, method: e.target.value }))}>
                <option value="other">other</option>
                <option value="cash">cash</option>
                <option value="card">card</option>
                <option value="bank_transfer">bank_transfer</option>
                <option value="paypal">paypal</option>
                <option value="apple">apple</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Status</label>
              <select className="border p-2 rounded" value={headerForm.status} onChange={e => setHeaderForm(prev => ({ ...prev, status: e.target.value }))}>
                <option value="completed">completed</option>
                <option value="pending">pending</option>
                <option value="cancelled">cancelled</option>
                <option value="failed">failed</option>
              </select>
            </div>
          </div>

          {/* amount / currency / dates */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs font-medium">Amount</label>
              <input className="border p-2 rounded w-full" value={headerForm.amountStr} onChange={e => setHeaderForm(prev => ({ ...prev, amountStr: e.target.value }))} />
            </div>

            <div className="w-32">
              <label className="text-xs font-medium">Decimals</label>
              <input type="number" className="border p-2 rounded w-full" value={headerForm.amount_decimal} onChange={e => setHeaderForm(prev => ({ ...prev, amount_decimal: Number(e.target.value) }))} />
            </div>

            <div className="w-32">
              <label className="text-xs font-medium">Currency</label>
              <input className="border p-2 rounded w-full" value={headerForm.currency} onChange={e => setHeaderForm(prev => ({ ...prev, currency: e.target.value }))} />
            </div>

            <div className="w-60">
              <label className="text-xs font-medium">Transaction date</label>
              <input type="datetime-local" className="border p-2 rounded w-full" value={toInputLocal(headerForm.transactionDateISO)} onChange={e => setHeaderForm(prev => ({ ...prev, transactionDateISO: fromInputLocal(e.target.value) }))} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={headerForm.hasDetails} onChange={e => setHeaderForm(prev => ({ ...prev, hasDetails: e.target.checked }))} />
              Use details
            </label>
            <div className="text-sm text-gray-500">When details are used their sum must equal the header amount.</div>
          </div>

          {/* details table */}
          {headerForm.hasDetails && (
            <div className="border rounded p-2 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">Details</div>
                <div>
                  <button type="button" onClick={addDetailRow} className="px-2 py-1 border rounded">Add row</button>
                </div>
              </div>

              <div className="space-y-2">
                {detailRows.map(row => (
                  <div key={row.id} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-xs">Description</label>
                      <input className="border p-2 rounded w-full" value={row.description || ''} onChange={e => setDetailRows(prev => prev.map(r => r.id === row.id ? { ...r, description: e.target.value } : r))} />
                    </div>
                    <div style={{ width: 140 }}>
                      <label className="text-xs">Amount</label>
                      <input className="border p-2 rounded w-full" value={row.amountStr} onChange={e => updateDetailRowAmount(row.id, e.target.value)} />
                    </div>
                    <div>
                      <button type="button" onClick={() => removeDetailRow(row.id)} className="px-2 py-1 border rounded text-red-600">Del</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 text-sm">
                <strong>Sum details:</strong> {formatMinorToDecimal(totalDetailsMinor(), headerForm.amount_decimal)}
                <span className="ml-3 text-gray-500">Header: {headerForm.amountStr}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={() => { setSelectedHeader(null); setDetailRows([]); }} className="py-2 px-4 rounded border">Clear</button>
            <button type="submit" className="bg-blue-500 text-white py-2 px-4 rounded">Save</button>
          </div>
        </form>
      </aside>
    </div>
  );
};

// helpers for datetime-local <-> ISO
function toInputLocal(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  // yyyy-mm-ddThh:mm
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60 * 1000);
  return local.toISOString().slice(0, 16);
}
function fromInputLocal(val: string) {
  if (!val) return new Date().toISOString();
  // val like "2023-08-28T12:34"
  const dt = new Date(val);
  return dt.toISOString();
}

export default TransactionsPage;
