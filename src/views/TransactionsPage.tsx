import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash } from 'phosphor-react';

import { useTransactionsViewModel } from '../viewModels/useTransactionsViewModel';
import { useAccountsViewModel } from '../viewModels/useAccountsViewModel';
import { useAccountsCategoryViewModel } from '../viewModels/useAccountsCategoryViewModel';
import { useTransactionsCategoryViewModel } from '../viewModels/useTransactionsCategoryViewModel';

import CategorySelector from '../components/CategorySelector';
import AccountSelector from '../components/AccountSelector';

import type { AccountCategory } from '../models/AccountCategory';
import type { TransactionDetail } from '../models/TransactionDetail';


// small icons list used by icon picker (same as other pages)
const ICONS = [
  'fa-folder', 'fa-folder-open', 'fa-user', 'fa-users', 'fa-tags', 'fa-tag',
  'fa-dollar-sign', 'fa-wallet', 'fa-credit-card', 'fa-shopping-cart',
  'fa-cog', 'fa-bell', 'fa-star', 'fa-heart', 'fa-calendar', 'fa-clock',
  'fa-search', 'fa-chart-line', 'fa-home', 'fa-briefcase'
];

type DetailRowUI = {
  id: string; // client id
  amountStr: string; // user string "12.34"
  amountMinor: number; // integer cents
  amount_decimal: number;
  description?: string;
  notes?: string;
  tags?: string;
  color?: string;
  icon?: string;
  // serverId? could add if necessary
};

export const TransactionsPage: React.FC = () => {
  const {
    headers,
    details,
    fetchHeaders,
    fetchDetailsFor,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    parseDecimalToMinor,
    formatMinorToDecimal,
  } = useTransactionsViewModel();

  const { accounts, fetchAccounts } = useAccountsViewModel();
  const { fetchCategories: fetchAccountCategories } = useAccountsCategoryViewModel();
  const { transactionCategories, fetchCategories: fetchTransactionCategories } = useTransactionsCategoryViewModel();

  // page state
  const [search, setSearch] = useState('');
  const [selectedHeader, setSelectedHeader] = useState<number | null>(null); // header id if editing
  const [editing, setEditing] = useState(false);
  const [inserting, setInserting] = useState(false);

  // form state
  const [errors, setErrors] = useState<string | null>(null);
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
    icon: 'fa-wallet',
    hasDetails: false,
  });

  // detail rows
  const [detailRows, setDetailRows] = useState<DetailRowUI[]>([]);

  // icon picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [formIcon, setFormIcon] = useState(headerForm.icon);

  useEffect(() => { setFormIcon(headerForm.icon); }, [headerForm.icon]);

  // fetch initial data
  useEffect(() => {
    fetchHeaders();
    fetchAccounts();
    fetchAccountCategories();
    fetchTransactionCategories();
  }, []);

  // helpers: convert server details -> rows
  const loadDetailsForHeader = async (hid: number) => {
    await fetchDetailsFor(hid);
    const srv = details[hid] ?? [];
    const rows = srv.map((d: TransactionDetail) => ({
      id: `srv-${d.id}`,
      amountStr: formatMinorToDecimal(d.amount, d.amount_decimal),
      amountMinor: Number(d.amount),
      amount_decimal: d.amount_decimal,
      description: d.description ?? '',
      notes: d.notes ?? '',
      tags: d.tags ?? '',
      color: d.color ?? '#000000',
      icon: d.icon ?? 'fa-wallet',
    }));
    setDetailRows(rows);
    setHeaderForm(prev => ({ ...prev, hasDetails: rows.length > 0 }));
  };

  // open edit
  const openEdit = async (hId: number) => {
    const h = headers.find((x: any) => x.id === hId);
    if (!h) return;
    setSelectedHeader(hId);
    setEditing(true);
    setInserting(false);
    setErrors(null);

    setHeaderForm({
      category_id: h.category_id,
      from_account_id: h.from_account_id ?? undefined,
      to_account_id: h.to_account_id ?? undefined,
      type: h.type,
      status: h.status,
      method: h.method,
      amountStr: formatMinorToDecimal(h.amount as number, h.amount_decimal),
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
      icon: h.icon ?? 'fa-wallet',
      hasDetails: false,
    });

    // load details and set rows
    await loadDetailsForHeader(hId);
  };

  // open create
  const openCreate = () => {
    setSelectedHeader(null);
    setEditing(false);
    setInserting(true);
    setErrors(null);
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
      icon: 'fa-wallet',
      hasDetails: false,
    });
    setDetailRows([]);
    setFormIcon('fa-wallet');
  };

  // detail rows management
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
        icon: 'fa-wallet',
      },
    ]);
    setHeaderForm(prev => ({ ...prev, hasDetails: true }));
  };

  const updateDetailRow = (id: string, patch: Partial<DetailRowUI>) => {
    setDetailRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  };

  const updateDetailRowAmount = (id: string, amountStr: string) => {
    // use viewmodel parseDecimalToMinor if available
    const minor = parseDecimalToMinor ? Number(parseDecimalToMinor(amountStr, headerForm.amount_decimal)) : parseDecimalLocal(amountStr, headerForm.amount_decimal);
    updateDetailRow(id, { amountStr, amountMinor: minor });
  };

  const removeDetailRow = (id: string) => {
    setDetailRows(prev => {
      const next = prev.filter(r => r.id !== id);
      if (next.length === 0) setHeaderForm(prev => ({ ...prev, hasDetails: false }));
      return next;
    });
  };

  // local parse fallback (returns number)
  function parseDecimalLocal(amountStr: string, decimals: number) {
    const normalized = String(amountStr).replace(',', '.').trim();
    if (normalized === '') return 0;
    const parts = normalized.split('.');
    let whole = parts[0] || '0';
    let frac = parts[1] || '';
    if (frac.length > decimals) frac = frac.slice(0, decimals);
    while (frac.length < decimals) frac += '0';
    const combined = whole + frac;
    const digits = combined.replace(/[^\d-]/g, '') || '0';
    return Number(digits);
  }

  // totals for details
  const totalDetailsMinor = useMemo(() => {
    return detailRows.reduce((acc, r) => acc + (r.amountMinor || 0), 0);
  }, [detailRows]);

  // validation
  function validateBeforeSubmit() {
    setErrors(null);
    const headerMinor = parseDecimalToMinor ? Number(parseDecimalToMinor(headerForm.amountStr, headerForm.amount_decimal)) : parseDecimalLocal(headerForm.amountStr, headerForm.amount_decimal);

    if (headerForm.hasDetails) {
      if (detailRows.length === 0) return { ok: false, message: 'Hai abilitato i dettagli ma non ci sono voci.' };
      if (totalDetailsMinor !== headerMinor) {
        return { ok: false, message: `La somma dei dettagli (${formatMinorHuman(totalDetailsMinor, headerForm.amount_decimal)}) non coincide con l'importo della testata (${headerForm.amountStr}).` };
      }
    } else {
      if (!headerForm.amountStr || headerForm.amountStr.trim() === '') return { ok: false, message: 'Inserisci l\'importo della transazione.' };
    }

    if (!headerForm.category_id) return { ok: false, message: 'Seleziona la categoria della transazione.' };

    if (headerForm.type === 'transfer') {
      if (!headerForm.from_account_id || !headerForm.to_account_id) return { ok: false, message: 'Per trasferimenti serve conto di origine e destinazione.' };
      if (headerForm.from_account_id === headerForm.to_account_id) return { ok: false, message: 'Origine e destinazione non possono essere lo stesso conto.' };
    }

    return { ok: true };
  }

  function formatMinorHuman(minor: number, decimals: number) {
    const sign = minor < 0 ? '-' : '';
    const m = Math.abs(minor);
    const s = String(m).padStart(decimals + 1, '0');
    const w = s.slice(0, s.length - decimals);
    const f = s.slice(s.length - decimals);
    return `${sign}${w}.${f}`;
  }

  // submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validateBeforeSubmit();
    if (!v.ok) {
      setErrors(v.message?.toString() ?? 'Validation error');
      return;
    }

    try {
      const headerMinor = parseDecimalToMinor ? Number(parseDecimalToMinor(headerForm.amountStr, headerForm.amount_decimal)) : parseDecimalLocal(headerForm.amountStr, headerForm.amount_decimal);

      if (editing && selectedHeader) {
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
          icon: formIcon ?? headerForm.icon,
        });
        // NOTE: updating details omitted here — add upsert logic if required
      } else {
        // create header (and optionally pass details)
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
          icon: formIcon ?? headerForm.icon,
        }, detailsPayload);
      }

      // refresh and reset
      await fetchHeaders();
      await fetchAccounts();
      setSelectedHeader(null);
      setEditing(false);
      setInserting(false);
      setHeaderForm(prev => ({ ...prev, amountStr: '0.00', hasDetails: false }));
      setDetailRows([]);
      setErrors(null);
    } catch (err: any) {
      console.error('save transaction error', err);
      setErrors('Errore salvataggio: ' + (err?.message ?? String(err)));
    }
  };

  const handleDeleteHeader = async (hId: number) => {
    if (!confirm('Delete transaction?')) return;
    await deleteTransaction(hId);
    await fetchHeaders();
  };



  // prohibited parent ids for account selector: when editing a header we may forbid selecting same account? not necessary here
  // but we could use the account hierarchy to prevent cycles if parent selection inside accounts is needed.

  // UI: filtered headers by search
  const visibleHeaders = useMemo(() => {
    if (!search.trim()) return headers;
    const q = search.trim().toLowerCase();
    return headers.filter((h: any) =>
      (h.description || '').toLowerCase().includes(q) ||
      (h.notes || '').toLowerCase().includes(q) ||
      String(h.id).includes(q)
    );
  }, [search, headers]);

  return (
    <div className="p-6 w-full max-w-full min-w-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Transactions</h1>
          <p className="text-sm opacity-60">Create and manage transactions</p>
        </div>

        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => { fetchHeaders(); fetchAccounts(); fetchAccountCategories(); fetchTransactionCategories(); }}>Refresh</button>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>New</button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* left: list */}
        <div className="col-span-8 bg-base-200 rounded-lg p-4 overflow-auto max-h-[70vh] min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <input
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input input-sm input-bordered flex-1"
            />
            <div className="text-sm opacity-60">Results: {visibleHeaders.length}</div>
          </div>

          <div className="space-y-3">
            {visibleHeaders.map((h: any) => (
              <div key={h.id} className="card bg-base-100 shadow-sm">
                <div className="card-body p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-medium truncate">{h.description ?? '(no description)'}</div>
                      <div className="text-sm font-mono">{formatMinorToDecimal(h.amount as number, h.amount_decimal)} {h.currency}</div>
                    </div>
                    <div className="text-xs opacity-60 mt-1">Type: <span className="font-medium">{h.type}</span> • Cat: {h.category_id ?? '—'}</div>
                    <div className="text-xs opacity-50">From {h.from_account_id ?? '—'} → To {h.to_account_id ?? '—'} • {new Date(h.transaction_date).toLocaleString()}</div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(h.id)} className="btn btn-ghost btn-sm" title="Edit">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDeleteHeader(h.id)} className="btn btn-ghost btn-sm text-error" title="Delete">
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {visibleHeaders.length === 0 && <div className="text-sm opacity-60 p-4">No transactions found.</div>}
          </div>
        </div>

        {/* right: form, appears only when inserting or editing */}
        <aside className={`${(inserting || editing) ? 'col-span-4' : 'col-span-4 hidden'}`}>
          {(inserting || editing) && (
            <div className="card bg-base-100 shadow-sm rounded-lg overflow-hidden">
              <div className="card-body">
                <h3 className="card-title">{editing && selectedHeader ? `Edit: #${selectedHeader}` : 'New transaction'}</h3>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  {/* errors */}
                  {errors && <div className="text-sm text-error">{errors}</div>}

                  {/* category (inline selector) */}
                  <div className="form-control">
                    <label className="label"><span className="label-text">Category</span></label>
                    <CategorySelector<AccountCategory>
                      categories={transactionCategories}
                      value={headerForm.category_id ?? null}
                      onChange={(id) => setHeaderForm(prev => ({ ...prev, category_id: id ?? undefined }))}
                      placeholder="No category"
                    />
                  </div>

                  {/* from / to using AccountSelector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="form-control">
                      <label className="label"><span className="label-text">From account</span></label>
                      <AccountSelector
                        accounts={accounts}
                        value={headerForm.from_account_id ?? null}
                        onChange={(id) => setHeaderForm(prev => ({ ...prev, from_account_id: id ?? undefined }))}
                        placeholder="No from account"
                      />
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text">To account</span></label>
                      <AccountSelector
                        accounts={accounts}
                        value={headerForm.to_account_id ?? null}
                        onChange={(id) => setHeaderForm(prev => ({ ...prev, to_account_id: id ?? undefined }))}
                        placeholder="No to account"
                      />
                    </div>
                  </div>

                  {/* type / method / status */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="form-control">
                      <label className="label"><span className="label-text">Type</span></label>
                      <select className="select select-sm select-bordered w-full" value={headerForm.type} onChange={e => setHeaderForm(prev => ({ ...prev, type: e.target.value }))}>
                        <option value="expense">expense</option>
                        <option value="income">income</option>
                        <option value="transfer">transfer</option>
                        <option value="reimbursement">reimbursement</option>
                        <option value="refund">refund</option>
                        <option value="other">other</option>
                      </select>
                    </div>

                    <div className="form-control">
                      <label className="label"><span className="label-text">Method</span></label>
                      <select className="select select-sm select-bordered w-full" value={headerForm.method} onChange={e => setHeaderForm(prev => ({ ...prev, method: e.target.value }))}>
                        <option value="other">other</option>
                        <option value="cash">cash</option>
                        <option value="card">card</option>
                        <option value="bank_transfer">bank_transfer</option>
                        <option value="paypal">paypal</option>
                        <option value="apple">apple</option>
                      </select>
                    </div>

                    <div className="form-control">
                      <label className="label"><span className="label-text">Status</span></label>
                      <select className="select select-sm select-bordered w-full" value={headerForm.status} onChange={e => setHeaderForm(prev => ({ ...prev, status: e.target.value }))}>
                        <option value="completed">completed</option>
                        <option value="pending">pending</option>
                        <option value="cancelled">cancelled</option>
                        <option value="failed">failed</option>
                      </select>
                    </div>
                  </div>

                  {/* amount / currency / date */}
                  <div className="grid grid-cols-1 gap-2">
                    <div className="form-control">
                      <label className="label"><span className="label-text">Amount</span></label>
                      <input
                        className="input input-sm input-bordered"
                        value={headerForm.amountStr}
                        onChange={e => setHeaderForm(prev => ({ ...prev, amountStr: e.target.value }))}
                        inputMode="decimal"
                        placeholder="0.00"
                      />
                      <label className="label"><span className="label-text-alt text-xs">Enter with dot or comma. We store minor units under the hood.</span></label>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="form-control">
                        <label className="label"><span className="label-text">Currency</span></label>
                        <input className="input input-sm input-bordered" value={headerForm.currency} onChange={e => setHeaderForm(prev => ({ ...prev, currency: e.target.value }))} />
                      </div>

                      <div className="form-control">
                        <label className="label"><span className="label-text">Transaction date</span></label>
                        <input type="datetime-local" value={toInputLocal(headerForm.transactionDateISO)} onChange={e => setHeaderForm(prev => ({ ...prev, transactionDateISO: fromInputLocal(e.target.value) }))} className="input input-sm input-bordered" />
                      </div>
                    </div>
                  </div>

                  {/* details toggle */}
                  <div className="form-control">
                    <label className="cursor-pointer label">
                      <span className="label-text">Use details</span>
                      <input type="checkbox" className="toggle toggle-sm ml-2" checked={headerForm.hasDetails} onChange={e => setHeaderForm(prev => ({ ...prev, hasDetails: e.target.checked }))} />
                    </label>
                  </div>

                  {/* details table */}
                  {headerForm.hasDetails && (
                    <div className="border rounded p-2 bg-base-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">Details</div>
                        <button type="button" className="btn btn-sm btn-ghost" onClick={addDetailRow}><Plus size={14} /></button>
                      </div>

                      <div className="space-y-2">
                        {detailRows.map(row => (
                          <div key={row.id} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                            <div className="col-span-2">
                              <label className="label"><span className="label-text text-xs">Description</span></label>
                              <input className="input input-sm input-bordered w-full" value={row.description || ''} onChange={e => updateDetailRow(row.id, { description: e.target.value })} />
                            </div>
                            <div>
                              <label className="label"><span className="label-text text-xs">Amount</span></label>
                              <div className="flex gap-2">
                                <input className="input input-sm input-bordered w-full" value={row.amountStr} onChange={e => updateDetailRowAmount(row.id, e.target.value)} />
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeDetailRow(row.id)} title="Remove"><Trash size={14} /></button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 text-sm">
                        <strong>Sum details:</strong> {formatMinorToDecimal(totalDetailsMinor, headerForm.amount_decimal)}
                        <span className="ml-3 text-xs opacity-60">Header: {headerForm.amountStr}</span>
                      </div>
                    </div>
                  )}

                  {/* description / notes */}
                  <div className="form-control">
                    <label className="label"><span className="label-text">Description</span></label>
                    <input className="input input-sm input-bordered" value={headerForm.description} onChange={e => setHeaderForm(prev => ({ ...prev, description: e.target.value }))} />
                  </div>

                  <div className="form-control">
                    <label className="label"><span className="label-text">Notes / Tags</span></label>
                    <input className="input input-sm input-bordered" value={headerForm.notes} onChange={e => setHeaderForm(prev => ({ ...prev, notes: e.target.value }))} />
                    <input className="input input-sm input-bordered mt-2" value={headerForm.tags} onChange={e => setHeaderForm(prev => ({ ...prev, tags: e.target.value }))} placeholder="comma separated tags" />
                  </div>

                  {/* color & icon */}
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div className="form-control">
                      <label className="label"><span className="label-text">Color</span></label>
                      <input type="color" className="w-12 h-10 p-1 rounded" value={headerForm.color} onChange={e => setHeaderForm(prev => ({ ...prev, color: e.target.value }))} />
                    </div>
                    <div className="form-control col-span-2">
                      <label className="label"><span className="label-text">Icon</span></label>
                      <div className="flex items-center gap-2">
                        <input className="input input-sm input-bordered flex-1" value={formIcon} onChange={e => { setFormIcon(e.target.value); setHeaderForm(prev => ({ ...prev, icon: e.target.value })); }} />
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPickerOpen(true)}>Scegli icona</button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-2">
                    <button type="button" onClick={() => { setSelectedHeader(null); setEditing(false); setInserting(false); setDetailRows([]); }} className="btn btn-ghost btn-sm">Cancel</button>
                    <button type="submit" className="btn btn-primary btn-sm">Save</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* icon picker modal (same interaction as categories/accounts) */}
      {pickerOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Seleziona icona</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setPickerOpen(false)}>Chiudi</button>
            </div>

            <div className="mb-3">
              <input
                type="text"
                placeholder="Cerca icone..."
                value={iconSearch}
                onChange={(e) => setIconSearch(e.target.value)}
                className="input input-sm input-bordered w-full"
              />
            </div>

            <div className="grid grid-cols-6 gap-2 max-h-60 overflow-auto">
              {ICONS
                .filter(ic => !iconSearch || ic.toLowerCase().includes(iconSearch.toLowerCase()))
                .map(ic => (
                  <button
                    key={ic}
                    type="button"
                    className={`p-2 rounded hover:bg-base-200 focus:outline-none flex flex-col items-center justify-center`}
                    onClick={() => { setFormIcon(ic); setHeaderForm(prev => ({ ...prev, icon: ic })); setPickerOpen(false); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFormIcon(ic); setHeaderForm(prev => ({ ...prev, icon: ic })); setPickerOpen(false); } }}
                    aria-label={`Seleziona icona ${ic}`}
                  >
                    <div className="w-10 h-10 flex items-center justify-center">
                      <i className={`fa ${(ic)} fa-xl`} aria-hidden />
                    </div>
                    <div className="text-xs mt-1 truncate">{ic.replace('fa-','')}</div>
                  </button>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;

// helpers for datetime-local <-> ISO (same as before)
function toInputLocal(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60 * 1000);
  return local.toISOString().slice(0, 16);
}
function fromInputLocal(val: string) {
  if (!val) return new Date().toISOString();
  const dt = new Date(val);
  return dt.toISOString();
}
