import React, { useMemo, useState } from 'react';
import { useAccountsViewModel } from '../viewModels/useAccountsViewModel';
import { useAccountsCategoryViewModel } from '../viewModels/useAccountsCategoryViewModel';
import AccountCategoryPicker from '../components/AccountCategoryPicker';
import type { Account } from '../models/Account';
import type { AccountCategory } from '../models/AccountCategory';

function formatBalance(cents: number, decimals = 2, currency = 'EUR') {
  const value = cents / Math.pow(10, decimals);
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
  } catch {
    return `${value.toFixed(decimals)} ${currency}`;
  }
}

/* utility: convert flat categories into tree */
type CategoryNode = AccountCategory & { children?: CategoryNode[] };
function buildCategoryTree(categories: AccountCategory[]): CategoryNode[] {
  const map = new Map<number, CategoryNode>();
  const roots: CategoryNode[] = [];
  categories.forEach(cat => map.set(cat.id, { ...cat, children: [] }));
  categories.forEach(cat => {
    if (cat.parent_id != null) {
      const parent = map.get(cat.parent_id);
      if (parent) parent.children?.push(map.get(cat.id)!);
      else roots.push(map.get(cat.id)!);
    } else {
      roots.push(map.get(cat.id)!);
    }
  });
  return roots;
}

/* utility: convert flat accounts into tree (same approach) */
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

/* Account card component (recursive) */
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
  return (
    <div style={{ paddingLeft: `${level * 20}px` }} className="mb-2">
      <div
        className={`flex items-center gap-3 p-3 rounded-lg shadow cursor-pointer transition hover:bg-gray-50
          ${level % 2 === 1 ? 'bg-gray-50' : 'bg-white'}
          ${isSelected ? 'ring-2 ring-blue-400' : ''}`}
        onClick={() => onSelect(acc)}
      >
        {acc.children && acc.children.length > 0 ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="select-none px-1"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '▼' : '▶'}
          </button>
        ) : (
          <div className="w-6" />
        )}

        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{acc.name}</div>
          <div className="text-sm text-gray-500 truncate">{acc.description ?? '—'}</div>
          <div className="text-xs text-gray-400">Type: {acc.type} • Cat: {acc.category_id}</div>
        </div>

        <div className="text-right">
          <div className="font-mono">{formatBalance(acc.balance, acc.balance_decimal, acc.currency)}</div>
          <div className="text-xs text-gray-500">{acc.virtual ? 'Virtual' : 'Real'}</div>
        </div>

        <div className="flex gap-2 ml-2">
          <button
            onClick={(e) => { e.stopPropagation(); onAddChild(acc); }}
            className="px-2 py-1 border rounded text-sm text-green-700"
            title="Add subaccount"
          >
            ➕
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onEdit(acc); }}
            className="px-2 py-1 border rounded text-sm"
            title="Edit"
          >
            Edit
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onDelete(acc); }}
            className="px-2 py-1 border rounded text-sm text-red-600"
            title="Delete"
          >
            Delete
          </button>
        </div>
      </div>

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

export const AccountsPage: React.FC = () => {
  const { accounts, loading, error, addAccount, updateAccount, deleteAccount, fetchAccounts } = useAccountsViewModel();
  const { accountCategories, fetchCategories: fetchAccountCategories } = useAccountsCategoryViewModel();

  const [selected, setSelected] = useState<Account | null>(null);
  const [form, setForm] = useState({
    category_id: undefined as number | undefined,
    parent_id: undefined as number | undefined,
    name: '',
    description: '',
    type: '',
    balance: 0,
    balance_decimal: 2,
    currency: 'EUR',
    color: '#000000',
    icon: 'mdi:bank',
  });

  // category selector UI state
  const [catSelectorOpen, setCatSelectorOpen] = useState(false);
  const [selectedCategoryNode, setSelectedCategoryNode] = useState<AccountCategory | null>(null);

  // category tree memoized
  const categoryTree = useMemo(() => buildCategoryTree(accountCategories), [accountCategories]);

  // accounts tree for rendering
  const accountsTree = useMemo(() => buildAccountsTree(accounts), [accounts]);

  // select an account -> populate form
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
        currency: a.currency,
        color: a.color,
        icon: a.icon,
      });
      // sync selectedCategoryNode if categories loaded
      const cat = accountCategories.find(c => c.id === a.category_id);
      setSelectedCategoryNode(cat ?? null);
    } else {
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
        icon: 'mdi:bank',
      });
      setSelectedCategoryNode(null);
    }
  };

  // open form to create a NEW subaccount under parentAcc
  const openCreateSubaccount = (parentAcc: Account) => {
    setSelected(null); // create new
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
      icon: 'mdi:bank',
    });
    const cat = accountCategories.find(c => c.id === parentAcc.category_id);
    setSelectedCategoryNode(cat ?? null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selected) {
        await updateAccount(selected.id, {
          id: selected.id, // required
          category_id: form.category_id!,
          parent_id: form.parent_id ?? undefined,
          name: form.name,
          description: form.description,
          type: form.type,
          balance: form.balance,
          balance_decimal: form.balance_decimal,
          budget: false,
          virtual: false,
          currency: form.currency,
          color: form.color,
          icon: form.icon,
        });
      } else {
        await addAccount({
          id: 0, // will be ignored
          category_id: form.category_id ?? 0,
          parent_id: form.parent_id ?? undefined,
          name: form.name,
          description: form.description,
          type: form.type || 'other',
          balance: form.balance,
          balance_decimal: form.balance_decimal,
          virtual: false, // forced
          budget: false,  // forced
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
            <button onClick={() => { fetchAccounts(); fetchAccountCategories(); }} className="px-3 py-1 border rounded">Refresh</button>
          </div>
        </div>

        {loading && <div>Loading…</div>}
        {error && <div className="text-red-600">Error: {error}</div>}

        <div>
          {accountsTree.map(root => (
            <AccountCard
              key={root.id}
              acc={root}
              selectedId={selected?.id || null}
              onSelect={(a) => onSelect(a)}
              onEdit={(a) => onSelect(a)}
              onAddChild={(a) => openCreateSubaccount(a)}
              onDelete={(a) => handleDelete(a)}
            />
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

          {/* Category selector: button + popover using CategoryPicker */}
          <div>
            <label className="text-xs font-medium">Category</label>
            <div className="flex gap-2 items-center">
              <div className="flex-1 min-w-0">
                <div className="border p-2 rounded truncate" title={selectedCategoryNode ? selectedCategoryNode.name : ''}>
                  {selectedCategoryNode ? selectedCategoryNode.name : (form.category_id ? `ID ${form.category_id}` : '— select category —')}
                </div>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setCatSelectorOpen(!catSelectorOpen); if (!accountCategories.length) fetchAccountCategories(); }}
                  className="px-2 py-1 border rounded"
                >
                  Choose
                </button>

                {catSelectorOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border rounded shadow z-50">
                    <div className="p-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">Pick category</div>
                        <button onClick={() => setCatSelectorOpen(false)} className="text-xs px-2">Close</button>
                      </div>

                      <AccountCategoryPicker
                        categories={accountCategories}
                        selectedId={form.category_id ?? undefined}
                        onSelect={(node) => {
                          setForm({ ...form, category_id: node.id });
                          setSelectedCategoryNode(node);
                          setCatSelectorOpen(false);
                        }}
                        width="w-80"
                        autoFocusSearch={true}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium">Parent ID (optional)</label>
              <input type="number" className="border p-2 rounded" value={form.parent_id ?? ''} onChange={e => setForm({ ...form, parent_id: e.target.value === '' ? undefined : Number(e.target.value) })} />
            </div>

            <div className="flex-1">
              <label className="text-xs font-medium">Currency</label>
              <input className="border p-2 rounded" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium">Balance (minor units)</label>
              <input type="number" className="border p-2 rounded" value={form.balance} onChange={e => setForm({ ...form, balance: Number(e.target.value) })} />
            </div>
            <div className="w-24 min-w-0">
              <label className="text-xs font-medium">Decimals</label>
              <input type="number" className="border p-2 rounded" value={form.balance_decimal} onChange={e => setForm({ ...form, balance_decimal: Number(e.target.value) })} />
            </div>
          </div>

          {/* compact row for type / color / icon (use min-w-0 to avoid overflow) */}
          <div className="flex gap-2 items-end">
            <div className="flex-1 min-w-0">
              <label className="text-xs font-medium mb-1">Type</label>
              <input className="border p-2 rounded w-full min-w-0" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} />
            </div>

            <div className="flex flex-col items-center">
              <label className="text-xs font-medium mb-1">Color</label>
              <input type="color" className="w-12 h-12 p-1 rounded" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
            </div>

            <div className="flex-1 min-w-0">
              <label className="text-xs font-medium mb-1">Icon</label>
              <input className="border p-2 rounded w-full min-w-0" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} />
            </div>
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
