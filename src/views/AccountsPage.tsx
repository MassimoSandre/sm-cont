import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash } from 'phosphor-react';
import { useAccountsViewModel } from '../viewModels/useAccountsViewModel';
import { useAccountsCategoryViewModel } from '../viewModels/useAccountsCategoryViewModel';
import CategorySelector from '../components/CategorySelector';
import AccountSelector from '../components/AccountSelector';
import type { Account } from '../models/Account';
import type { AccountCategory } from '../models/AccountCategory';

/* --- ICONS for icon picker (same list used before) --- */
const ICONS = [
  'fa-folder', 'fa-folder-open', 'fa-user', 'fa-users', 'fa-tags', 'fa-tag',
  'fa-dollar-sign', 'fa-wallet', 'fa-credit-card', 'fa-shopping-cart',
  'fa-cog', 'fa-bell', 'fa-star', 'fa-heart', 'fa-calendar', 'fa-clock',
  'fa-search', 'fa-chart-line', 'fa-home', 'fa-briefcase'
];

/* --- small util --- */
function formatBalanceFromCents(cents: number, decimals = 2, currency = 'EUR') {
  const value = cents / Math.pow(10, decimals);
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
  } catch {
    return `${value.toFixed(decimals)} ${currency}`;
  }
}

type AccountNode = Account & { children?: AccountNode[] };
function buildAccountsTree(accounts: Account[]): AccountNode[] {
  const map = new Map<number, AccountNode>();
  const roots: AccountNode[] = [];
  accounts.forEach(a => map.set(a.id, { ...a, children: [] }));
  accounts.forEach(a => {
    if (a.parent_id != null) {
      const parent = map.get(a.parent_id);
      if (parent) parent.children?.push(map.get(a.id)!);
      else roots.push(map.get(a.id)!);
    } else {
      roots.push(map.get(a.id)!);
    }
  });
  return roots;
}

/* --- get descendants helper (for validation: prevent cycles) --- */
function getAccountDescendants(accounts: Account[], id: number): number[] {
  const map = new Map<number, Account[]>();
  accounts.forEach(a => {
    const p = a.parent_id ?? 0;
    if (!map.has(p)) map.set(p, []);
    map.get(p)!.push(a);
  });

  const out: number[] = [];
  const stack = [...(map.get(id) ?? [])];
  while (stack.length) {
    const cur = stack.pop()!;
    out.push(cur.id);
    const kids = map.get(cur.id);
    if (kids) stack.push(...kids);
  }
  return out;
}

/* --- AccountCard (compact) --- */
const AccountCard: React.FC<{
  acc: AccountNode;
  level?: number;
  selectedId?: number | null;
  onSelect: (acc: AccountNode) => void;
  onEdit: (acc: AccountNode) => void;
  onAddChild: (acc: AccountNode) => void;
  onDelete: (acc: AccountNode) => void;
}> = ({ acc, level = 0, selectedId, onSelect, onEdit, onAddChild, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const isSelected = selectedId === acc.id;
  const indent = level * 20 + 8; // increased indent for clarity

  return (
    <div style={{ marginLeft: `${level === 0 ? 0 : indent}px` }} className="mb-2">
      <div
        className={`flex items-center gap-3 p-2 rounded-lg shadow-sm transition hover:shadow-md bg-base-100 ${isSelected ? 'ring-2 ring-primary' : ''}`}
        onClick={() => onSelect(acc)}
      >
        {/* left: expand button */}
        <div className="flex-none pl-1">
          {acc.children && acc.children.length > 0 ? (
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setExpanded(!expanded); }}
              className="btn btn-ghost btn-sm p-1"
              aria-label={expanded ? 'Collapse' : 'Expand'}
              title={expanded ? 'Collapse' : 'Expand'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transform ${expanded ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          ) : (
            <div style={{ width: 28 }} />
          )}
        </div>

        {/* content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border flex items-center justify-center text-sm" style={{ backgroundColor: acc.color ?? '#fff' }} aria-hidden />
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{acc.name}</div>
              <div className="text-xs opacity-60 truncate">{acc.description ?? '—'}</div>
            </div>
          </div>
          <div className="mt-1 text-xs text-muted">Type: <span className="font-medium">{acc.type || '—'}</span> • Cat: <span className="font-medium">{acc.category_id ?? '—'}</span></div>
        </div>

        {/* right: balance */}
        <div className="flex-none text-right mr-3">
          <div className="font-mono text-sm">{formatBalanceFromCents(acc.balance, acc.balance_decimal ?? 2, acc.currency)}</div>
          <div className="text-xs opacity-60">{acc.virtual ? 'Virtual' : 'Real'}</div>
        </div>

        {/* right-most: action buttons vertical */}
        <div className="flex-none flex flex-col items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onAddChild(acc); }}
            className="btn btn-ghost btn-square btn-xs"
            title="Add subaccount"
          >
            <Plus size={18} weight="regular" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onEdit(acc); }}
            className="btn btn-ghost btn-square btn-xs"
            title="Edit"
          >
            <Pencil size={18} weight="regular" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onDelete(acc); }}
            className="btn btn-ghost btn-square btn-xs text-error"
            title="Delete"
          >
            <Trash size={18} weight="regular" />
          </button>
        </div>
      </div>

      {/* children */}
      {expanded && acc.children?.map(child => (
        <AccountCard
          key={child.id}
          acc={child}
          level={level + 1}
          selectedId={selectedId}
          onSelect={onSelect}
          onEdit={onEdit}
          onAddChild={onAddChild}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

/* --- main page --- */
export const AccountsPage: React.FC = () => {
  const { accounts, addAccount, updateAccount, deleteAccount, fetchAccounts } = useAccountsViewModel();
  const { accountCategories, fetchCategories: fetchAccountCategories } = useAccountsCategoryViewModel();

  const [selected, setSelected] = useState<Account | null>(null);
  const [editing, setEditing] = useState(false);
  const [inserting, setInserting] = useState(false);

  // form model (backend expects minor units in `balance` + `balance_decimal`)
  const [form, setForm] = useState({
    category_id: undefined as number | undefined,
    parent_id: undefined as number | undefined,
    name: '',
    description: '',
    type: '',
    balance: 0, // stored as integer minor units (cents)
    balance_decimal: 2, // we hardcode 2 decimals for euro
    currency: 'EUR',
    color: '#000000',
    icon: 'fa-wallet',
  });

  // balance input visible to user (string with dot/comma)
  const [balanceInput, setBalanceInput] = useState<string>('0.00');

  // icon picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [formIcon, setFormIcon] = useState(ICONS[0]);

  useEffect(() => setFormIcon(form.icon ?? ICONS[0]), [form.icon]);

  // category/account selector modal states handled by components themselves; but we control when to mount them
  // account selector uses prohibitedParentIds to avoid cycles
  const accountDescendants = useMemo(() => selected ? getAccountDescendants(accounts, selected.id) : [], [selected, accounts]);
  const prohibitedParentIds = selected ? [selected.id, ...accountDescendants] : [];

  //const categoryTree = useMemo(() => buildCategoryTree(accountCategories), [accountCategories]);
  const accountsTree = useMemo(() => buildAccountsTree(accounts), [accounts]);

  const [search, setSearch] = useState('');

  useEffect(() => {
    // sync form when selecting an account or when resetting for create
    if (!selected) {
      setForm({
        category_id: undefined,
        parent_id: undefined,
        name: '',
        description: '',
        type: '',
        balance: 0,
        balance_decimal: 2,
        currency: 'EUR',
        color: '#000000',
        icon: 'fa-wallet',
      });
      setBalanceInput('0.00');
      setFormIcon('fa-wallet');
    } else {
      setForm({
        category_id: selected.category_id,
        parent_id: selected.parent_id ?? undefined,
        name: selected.name,
        description: selected.description ?? '',
        type: selected.type,
        balance: selected.balance,
        balance_decimal: selected.balance_decimal ?? 2,
        currency: selected.currency ?? 'EUR',
        color: selected.color ?? '#000000',
        icon: selected.icon ?? 'fa-wallet',
      });
      // set display using 2 decimals (EUR hardcoded)
      const display = ((selected.balance) / Math.pow(10, selected.balance_decimal ?? 2)).toFixed(2);
      setBalanceInput(display);
      setFormIcon(selected.icon ?? 'fa-wallet');
    }
  }, [selected]);

  const openCreateNew = () => {
    setSelected(null);
    setEditing(false);
    setInserting(true);
    setForm({
      category_id: undefined,
      parent_id: undefined,
      name: '',
      description: '',
      type: '',
      balance: 0,
      balance_decimal: 2,
      currency: 'EUR',
      color: '#000000',
      icon: 'fa-wallet',
    });
    setBalanceInput('0.00');
  };

  const openCreateSubaccount = (parentAcc: Account) => {
    setSelected(null);
    setEditing(false);
    setInserting(true);
    setForm({
      category_id: parentAcc.category_id,
      parent_id: parentAcc.id,
      name: '',
      description: '',
      type: '',
      balance: 0,
      balance_decimal: 2,
      currency: parentAcc.currency ?? 'EUR',
      color: '#000000',
      icon: 'fa-wallet',
    });
    setBalanceInput('0.00');
  };

  const openEdit = (a: Account) => {
    setSelected(a);
    setEditing(true);
    setInserting(false);
  };

  const parseBalanceToCents = (input: string): number => {
    // accept "123,45" or "123.45" or "123" — we assume 2 decimals
    const normalized = input.replace(',', '.').replace(/[^\d.]/g, '');
    const f = parseFloat(normalized);
    if (Number.isNaN(f)) return 0;
    return Math.round(f * 100); // hard-coded 2 decimals (EUR)
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // determine cents from balanceInput and use 2 decimals
    const cents = parseBalanceToCents(balanceInput);

    // parent validation
    if (form.parent_id !== undefined && selected && prohibitedParentIds.includes(form.parent_id)) {
      alert('Parent non valido: non puoi impostare come parent te stesso o un tuo discendente.');
      return;
    }

    try {
      if (editing && selected) {
        await updateAccount(selected.id, {
          id: selected.id,
          category_id: form.category_id ?? 0,
          parent_id: form.parent_id ?? undefined,
          name: form.name,
          description: form.description,
          type: form.type,
          balance: cents,
          balance_decimal: 2,
          budget: false,
          virtual: false,
          currency: form.currency,
          color: form.color,
          icon: formIcon,
        });
      } else {
        await addAccount({
          id: 0,
          category_id: form.category_id ?? 0,
          parent_id: form.parent_id ?? undefined,
          name: form.name,
          description: form.description,
          type: form.type || 'other',
          balance: cents,
          balance_decimal: 2,
          virtual: false,
          budget: false,
          currency: form.currency,
          color: form.color,
          icon: formIcon,
        });
      }
      await fetchAccounts();
      setSelected(null);
      setEditing(false);
      setInserting(false);
    } catch (err: any) {
      alert('Save failed: ' + (err.message ?? String(err)));
    }
  };

  const handleDelete = async (a: Account) => {
    if (!confirm(`Delete account "${a.name}" (id=${a.id})? This cannot be undone.`)) return;
    try {
      await deleteAccount(a.id);
      if (selected?.id === a.id) setSelected(null);
      await fetchAccounts();
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

  /* simple filter by name for rendering */
  const flattenAccounts = (nodes: AccountNode[]): AccountNode[] => {
    const out: AccountNode[] = [];
    const stack = [...nodes];
    while (stack.length) {
      const cur = stack.shift()!;
      out.push(cur);
      if (cur.children) stack.push(...cur.children);
    }
    return out;
  };
  const visibleAccounts = useMemo(() => {
    if (!search.trim()) return accountsTree;
    const q = search.trim().toLowerCase();
    const flat = flattenAccounts(accountsTree);
    const filtered = flat.filter(a => a.name.toLowerCase().includes(q) || (a.description ?? '').toLowerCase().includes(q));
    return filtered.map(f => ({ ...f, children: [] }));
  }, [search, accountsTree]);

  return (
    <div className="p-6 w-full max-w-full min-w-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Accounts</h1>
          <p className="text-sm opacity-60">Manage your accounts and balances</p>
        </div>

        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => { fetchAccounts(); fetchAccountCategories(); }}>Refresh</button>
          <button className="btn btn-primary btn-sm" onClick={openCreateNew}>New account</button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* left: accounts list */}
        <div className="col-span-8 bg-base-200 rounded-lg p-4 overflow-auto max-h-[70vh] min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <input
              type="text"
              placeholder="Search accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input input-sm input-bordered flex-1"
            />
            <div className="text-sm opacity-60">Totals:</div>
            <div className="badge badge-outline">{Object.keys(totals).map(c => `${c} ${totals[c].toFixed(2)}`).join(' • ')}</div>
          </div>

          <div>
            {visibleAccounts.map(root => (
              <AccountCard
                key={root.id}
                acc={root}
                selectedId={selected?.id ?? null}
                onSelect={(a) => { setSelected(a); setEditing(true); setInserting(false); }}
                onEdit={(a) => openEdit(a)}
                onAddChild={(a) => openCreateSubaccount(a)}
                onDelete={(a) => handleDelete(a)}
              />
            ))}
            {visibleAccounts.length === 0 && <div className="text-sm opacity-60 p-4">No accounts found.</div>}
          </div>
        </div>

        {/* right: form - appears only when editing or inserting */}
        <aside className={`${(inserting || editing) ? 'col-span-4' : 'col-span-4 hidden'}`}>
          {(inserting || editing) && (
            <div className="card bg-base-100 shadow-sm rounded-lg overflow-hidden">
              <div className="card-body">
                <h3 className="card-title">{editing && selected ? `Edit: ${selected.name}` : 'New account'}</h3>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  {/* NAME (label above) */}
                  <div className="form-control">
                    <label className="label"><span className="label-text">Name</span></label>
                    <input
                      className="input input-bordered input-sm"
                      required
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                    />
                  </div>

                  {/* DESCRIPTION */}
                  <div className="form-control">
                    <label className="label"><span className="label-text">Description</span></label>
                    <input
                      className="input input-bordered input-sm"
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                    />
                  </div>

                  {/* CATEGORY: show selector inline (no extra "Choose" button) */}
                  <div className="form-control">
                    <label className="label"><span className="label-text">Category</span></label>
                    <CategorySelector<AccountCategory>
                      categories={accountCategories}
                      value={form.category_id ?? null}
                      onChange={(id) => setForm({ ...form, category_id: id ?? undefined })}
                      placeholder="No category"
                    />
                  </div>

                  {/* PARENT: use AccountSelector (tree) */}
                  <div className="form-control">
                    <label className="label"><span className="label-text">Parent account</span></label>
                    <AccountSelector
                      accounts={accounts}
                      value={form.parent_id ?? null}
                      onChange={(id) => setForm({ ...form, parent_id: id ?? undefined })}
                      placeholder="No parent"
                      prohibitedIds={prohibitedParentIds}
                    />
                    {selected && form.parent_id !== undefined && prohibitedParentIds.includes(form.parent_id) && (
                      <div className="text-xs text-error mt-1">Parent non valido (ciclo)</div>
                    )}
                  </div>

                  {/* balance (user-friendly) */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="form-control">
                      <label className="label"><span className="label-text">Balance</span></label>
                      <input
                        className="input input-bordered input-sm"
                        value={balanceInput}
                        onChange={(e) => setBalanceInput(e.target.value)}
                        placeholder="0.00"
                        inputMode="decimal"
                      />
                      <label className="label"><span className="label-text-alt text-xs opacity-60">Enter euros (comma or dot allowed). We store as cents.</span></label>
                    </div>

                    <div className="form-control">
                      <label className="label"><span className="label-text">Currency</span></label>
                      <input className="input input-bordered input-sm" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} />
                    </div>
                  </div>

                  {/* type / color / icon */}
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div className="form-control col-span-2">
                      <label className="label"><span className="label-text">Type</span></label>
                      <input className="input input-bordered input-sm" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} />
                    </div>

                    <div className="form-control">
                      <label className="label"><span className="label-text">Color</span></label>
                      <input type="color" className="w-12 h-10 p-1 rounded" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
                    </div>
                  </div>

                  <div className="form-control">
                    <label className="label"><span className="label-text">Icon</span></label>
                    <div className="flex items-center gap-2">
                      <input className="input input-bordered input-sm flex-1" value={formIcon} onChange={(e) => { setFormIcon(e.target.value); setForm({ ...form, icon: e.target.value }); }} />
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPickerOpen(true)}>Scegli icona</button>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-2">
                    <button type="button" onClick={() => { setSelected(null); setEditing(false); setInserting(false); }} className="btn btn-ghost btn-sm">Cancel</button>
                    <button type="submit" className="btn btn-primary btn-sm">Save</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* icon picker modal (same as categories) */}
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
                    onClick={() => { setFormIcon(ic); setForm({ ...form, icon: ic }); setPickerOpen(false); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFormIcon(ic); setForm({ ...form, icon: ic }); setPickerOpen(false); } }}
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

export default AccountsPage;
