import React, {  useEffect, useMemo, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Tree } from '@minoru/react-dnd-treeview';
import type { NodeModel } from '@minoru/react-dnd-treeview';

import { useAccountsCategoryViewModel } from '../viewModels/useAccountsCategoryViewModel';
import type { AccountCategory } from '../models/AccountCategory';

import { Pencil,Plus,Trash } from 'phosphor-react';

import CategorySelector from '../components/CategorySelector';


const ICONS = [
  'fa-folder', 'fa-folder-open', 'fa-user', 'fa-users', 'fa-tags', 'fa-tag',
  'fa-dollar-sign', 'fa-wallet', 'fa-credit-card', 'fa-shopping-cart',
  'fa-cog', 'fa-bell', 'fa-star', 'fa-heart', 'fa-calendar', 'fa-clock',
  'fa-search', 'fa-chart-line', 'fa-home', 'fa-briefcase'
];

type CategoryNode = NodeModel<AccountCategory>;

const buildTreeNodes = (cats: AccountCategory[] | undefined): CategoryNode[] => {
  if (!cats) return [];
  return cats.map(c => ({
    id: c.id,
    parent: c.parent_id ?? 0,
    droppable: true,
    text: c.name,
    data: c,
  }));
};

const CustomNode: React.FC<{
  node: CategoryNode;
  depth: number;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (node: CategoryNode) => void;
  selectedId?: number | null;
  onEdit: (node: CategoryNode) => void;
  onAddChild: (node: CategoryNode) => void;
  onRequestDelete: (node: CategoryNode) => void;
}> = ({ node, depth, isOpen, onToggle, onSelect, selectedId, onEdit, onAddChild, onRequestDelete }) => {
  const cat = node.data as AccountCategory;
  const isSelected = selectedId === node.id;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg transition-shadow ${isSelected ? 'ring-2 ring-primary' : 'shadow-sm'} hover:shadow-md bg-base-100`}
      style={{ marginLeft: depth * 32, marginTop: 4 }}
      onClick={() => onSelect(node)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onSelect(node); }}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="btn btn-ghost btn-sm p-2"
          aria-label={isOpen ? 'Collapse' : 'Expand'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transform ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div className="w-10 h-10 rounded-full border flex items-center justify-center" style={{ backgroundColor: cat.color }} aria-hidden />

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <i className={`fa ${cat.icon} fa-fw`} aria-hidden />
            <div className="font-semibold text-sm truncate">{cat.name}</div>
            <div className="badge badge-ghost badge-sm ml-2">{cat.type}</div>
          </div>
          <div className="text-xs opacity-60 truncate max-w-[32rem]">{cat.description}</div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          className="btn btn-ghost btn-sm"
          onClick={(e) => { e.stopPropagation(); onEdit(node); }}
          title="Edit"
        >
          <Pencil size={32} weight="regular" className="text-base-content" />
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={(e) => { e.stopPropagation(); onAddChild(node); }}
          title="Add Child"
        >
          <Plus size={32} weight="regular" className="text-base-content" />
        </button>
        <button
          className="btn btn-ghost btn-sm text-error"
          onClick={(e) => { e.stopPropagation(); onRequestDelete(node); }}
          title="Delete"
        >
          <Trash size={32} weight="regular" className="text-base-content" />
        </button>
      </div>
    </div>
  );
};

export const AccountsCategoryPage: React.FC = () => {
  const { accountCategories, addAccountCategory, fetchCategories, updateAccountCategory, deleteAccountCategory } = useAccountsCategoryViewModel();

  const [treeData, setTreeData] = useState<CategoryNode[]>(() => buildTreeNodes(accountCategories));
  const [selected, setSelected] = useState<CategoryNode | null>(null);
  const [editing, setEditing] = useState(false);
  const [inserting, setInserting] = useState(false);
  const [filter, setFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CategoryNode | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [formIcon, setFormIcon] = useState(ICONS[0]);

  const [parentId, setParentId] = useState<number | null>(null);
  useEffect(() => {
    setParentId(selected?.parent && selected.parent !== 0 ? (selected.parent as number) : null);
  }, [selected, editing, inserting]);


  useEffect(() => {setFormIcon(selected?.data?.icon ?? 'fa-folder');}, [selected]);

  useEffect(() => {
    setTreeData(buildTreeNodes(accountCategories));
  }, [accountCategories]);

  useEffect(() => { fetchCategories(); }, []);


  const filteredTree = useMemo(() => {
    if (!filter.trim()) return treeData;
    const q = filter.trim().toLowerCase();
    const matches = new Set<number>();
    const idToNode = new Map<number, CategoryNode>(treeData.map(n => [Number(n.id), n]));

    const nodeMatches = (n: CategoryNode) => {
      const cat = n.data as AccountCategory;
      return cat.name.toLowerCase().includes(q) || (cat.description || '').toLowerCase().includes(q);
    };

    treeData.forEach(n => { if (nodeMatches(n)) matches.add(Number(n.id)); });

    treeData.forEach(n => {
      let p = n.parent;
      while (p && p !== 0) {
        if (matches.has(Number(n.id))) matches.add(p as number);
        const parentNode = idToNode.get(p as number);
        p = parentNode?.parent ?? 0;
      }
    });

    return treeData.filter(n => matches.has(Number(n.id)));
  }, [treeData, filter]);

  const handleSelect = (node: CategoryNode) => {
    
    if(!editing && !inserting) setSelected(node);
  };

  const openForm = (node?: CategoryNode | null, asChild = false) => {
    setEditing(asChild ? false : true);
    setInserting(asChild ? true : false);
    if (!node) {
      setSelected(null);
      return;
    }
    if (asChild) {
      setSelected({ ...node, parent: node.id } as CategoryNode);
    } else {
      setSelected(node);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget as HTMLFormElement);
    const name = String(form.get('name') || '');
    const description = String(form.get('description') || '');
    const type = String(form.get('type') || '');
    const color = String(form.get('color') || '#000000');
    const icon = String(formIcon || 'fa-folder');
    //const parent_id = selected?.parent === 0 || !selected ? undefined : (selected?.parent as number | undefined);
    const parent_id = parentId === null ? undefined : parentId;


    if (editing) {
      if (!selected?.id) { 
        console.error('Selected node has no ID'); 
        return;
      }
      try {
        await updateAccountCategory(selected.id as number, {
          id: selected.id as number,
          parent_id,  
          name,
          description,
          type,
          color,
          icon,
        });
        await fetchCategories();
        setSelected(null);
      }
      catch (err) {
        console.error('Update error', err);
      }

      setEditing(false);
      return;
    }

    try {
      await addAccountCategory({
        id: 0,
        parent_id,
        name,
        description,
        type,
        color,
        icon,
      });
      await fetchCategories();
      setSelected(null);
    } catch (err) {
      console.error('Save error', err);
    }
    setInserting(false);
  };

  const onRequestDelete = (node: CategoryNode) => setDeleteTarget(node);
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (selected && (selected.id === deleteTarget.id || selected.parent === deleteTarget.id)) {setSelected(null); setEditing(false); setInserting(false);}
    try {
      await deleteAccountCategory(deleteTarget.id as number);
      await fetchCategories();
    } catch (err) {
      console.error('Delete error', err);
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    // NOTE: added max-w/full, min-w-0 and flex-1 to defend against ancestor flex/containers
    <div className="p-6 w-full max-w-full min-w-0 flex-1">
      <div className="flex items-center justify-between w-full">
        <div>
          <h1 className="text-2xl font-semibold">Account Categories</h1>
        </div>

        <div className="flex items-center gap-3 min-w-0">
          {/* rendiamo l'input un flex item che può ridursi */}
          <div className="flex-1 min-w-0">
            <input
              type="text"
              placeholder="Search Categories..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input input-bordered w-full"
            />
          </div>

          <div className="join flex-shrink-0">
            <button className="btn btn-sm join-item" onClick={() => setTreeData(buildTreeNodes(accountCategories))}>Reset</button>
            <button className="btn btn-primary btn-sm join-item" onClick={() => {setSelected(null); setInserting(true); setEditing(false);} }>New category</button>
          </div>
        </div>
      </div>

      {/* grid: forced full width and min-w-0 */}
      <div className="grid grid-cols-12 gap-6 w-full max-w-full min-w-0">
        {/* left panel: conditional span, forced w/full + min-w-0 + wrapper for Tree */}
        <div className={`${(inserting || editing) ? 'col-span-8' : 'col-span-12'} bg-base-200 rounded-lg p-4 overflow-auto max-h-[70vh] w-full min-w-0`}>
          <div className="w-full min-w-0">
            <DndProvider backend={HTML5Backend}>
              <Tree
                tree={filteredTree}
                rootId={0}
                render={(node, { depth, isOpen, onToggle }) => (
                  <CustomNode
                    key={node.id}
                    node={node}
                    depth={depth}
                    isOpen={isOpen}
                    onToggle={onToggle}
                    onSelect={(n) => handleSelect(n)}
                    selectedId={Number(selected?.id) ?? null}
                    onEdit={(n) => openForm(n, false)}
                    onAddChild={(n) => openForm(n, true)}
                    onRequestDelete={(n) => onRequestDelete(n)}
                  />
                )}
                canDrag={() => false}
                canDrop={() => false}
                dragPreviewRender={(monitorProps) => (
                  <div className="p-2 bg-white rounded shadow-lg border">{monitorProps.item.text}</div>
                )}
                onDrop={() => {} }
              />
            </DndProvider>
          </div>
        </div>

        {(inserting || editing) &&(
        <aside className="col-span-4">
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
                <h3 className="card-title">{editing ? 'Edit category' : 'Insert new category'}</h3>
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-labelledby="category-form">
                    {/* Parent selector */}
                    <div className="form-control">
                      <label className="label">
                        <span id="parent-label" className="label-text text-xs opacity-60">Parent category</span>
                      </label>
                      <CategorySelector
                        categories={accountCategories}
                        value={parentId}
                        onChange={(id) => setParentId(id)}
                        placeholder="No parent"
                        prohibitedIds={editing ? [selected?.id as number] : []}
                        className="w-full"
                        aria-labelledby="parent-label"
                      />
                      <label className="label">
                        <span className="label-text-alt text-xs opacity-50">Lascia vuoto per creare una categoria di primo livello</span>
                      </label>
                    </div>

                    {/* Nome + Tipo */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text text-xs opacity-60">Nome</span>
                        </label>
                        <input
                          name="name"
                          defaultValue={selected?.data?.name ?? ''}
                          placeholder="Nome"
                          className="input input-bordered input-sm"
                          required
                          maxLength={80}
                          aria-required="true"
                        />
                      </div>

                      <div className="form-control">
                        <label className="label">
                          <span className="label-text text-xs opacity-60">Tipo</span>
                        </label>
                        <input
                          name="type"
                          defaultValue={selected?.data?.type ?? ''}
                          placeholder="Tipo (es. spesa, entrata)"
                          className="input input-bordered input-sm"
                        />
                        <label className="label">
                          <span className="label-text-alt text-xs opacity-50">Campo libero per raggruppamenti</span>
                        </label>
                      </div>
                    </div>

                    {/* Description (full width) */}
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text text-xs opacity-60">Descrizione</span>
                      </label>
                      <input
                        name="description"
                        defaultValue={selected?.data?.description ?? ''}
                        placeholder="Breve descrizione"
                        className="input input-bordered input-sm"
                      />
                      <label className="label">
                        <span className="label-text-alt text-xs opacity-50">Massimo 200 caratteri (consigliato)</span>
                      </label>
                    </div>

                    {/* Color + Icon picker on a single row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text text-xs opacity-60">Colore</span>
                        </label>
                        <input
                          name="color"
                          type="color"
                          defaultValue={selected?.data?.color ?? '#000000'}
                          className="w-16 h-10 p-1 rounded input-sm"
                          aria-label="Scegli colore categoria"
                        />
                      </div>

                      <div className="form-control col-span-2">
                        <label className="label">
                          <span className="label-text text-xs opacity-60">Icona</span>
                        </label>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm px-3"
                            onClick={() => setPickerOpen(true)}
                            aria-haspopup="dialog"
                            aria-expanded={pickerOpen}
                          >
                            <span className="mr-2">Scegli icona</span>
                            <i className={`fa ${formIcon} fa-fw`} aria-hidden />
                          </button>

                          {/* preview */}
                          <div className="flex items-center gap-2 ml-2">
                            <div
                              className="w-8 h-8 rounded-full border flex items-center justify-center"
                              style={{ backgroundColor: selected?.data?.color ?? (formIcon ? '#000000' : '#ffffff') }}
                              aria-hidden
                              title="Preview colore"
                            />
                            <div className="text-sm truncate">
                              <i className={`fa ${formIcon} fa-lg`} aria-hidden />
                            </div>
                          </div>

                          {/* opzionale: show current icon name */}
                          <div className="text-xs opacity-60 ml-auto">{formIcon.replace('fa-', '')}</div>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => { setSelected(null); setEditing(false); setInserting(false); }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                      >
                        {editing ? 'Save' : 'Insert'}
                      </button>
                    </div>
                  </form>


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
                            onClick={() => { setFormIcon(ic); setPickerOpen(false); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFormIcon(ic); setPickerOpen(false); } }}
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

              <div className="mt-4">
                <h4 className="text-sm font-medium">Selection</h4>
                <div className="text-xs opacity-60">Selected: {selected ? (selected.data as AccountCategory).name : 'Nessuno'}</div>
              </div>
            </div>
          </div>
        </aside>)}
      </div>

      {deleteTarget && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Delete Category?</h3>
            <p className="py-4">Are you sure that you want to delete category <strong>{deleteTarget?.data?.name}</strong>? This action cannot be undone.</p>
            <div className="modal-action">
              <button className="btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-error" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsCategoryPage;
