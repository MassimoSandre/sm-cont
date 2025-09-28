import React, {useEffect, useMemo, useRef, useState} from 'react';
import {DndProvider} from 'react-dnd';
import {HTML5Backend} from 'react-dnd-html5-backend';
import {Tree} from '@minoru/react-dnd-treeview';
import type {NodeModel} from '@minoru/react-dnd-treeview';
import type {Account} from '../models/Account';

type AccountNode = NodeModel<Account>;

/** costruisce i node compatibili con react-dnd-treeview dalla lista flat */
const buildTreeNodes = (accounts?: Account[]): AccountNode[] => {
    if (!accounts) return [];
    return accounts.map(a => ({
        id: a.id,
        parent: a.parent_id ?? 0,
        droppable: true,
        text: a.name,
        data: a,
    }));
};

interface Props {
    accounts: Account[] | undefined;
    value?: number | null;
    onChange: (id: number | null) => void;
    allowRootChoice?: boolean;
    title?: string;
    placeholder?: string;
    className?: string;
    prohibitedIds?: number[]; // id che non si possono selezionare (es. stesso account o discendenti)
}

/**
 * AccountSelector
 * - Modal + tree
 * - ricerca con auto-open dei parent che contengono match
 * - chiude ricorsivamente i figli quando si collapse un nodo
 * - supporta prohibitedIds per disabilitare nodi
 */
export default function AccountSelector({
                                            accounts,
                                            value = null,
                                            onChange,
                                            allowRootChoice = true,
                                            title = 'Seleziona account',
                                            placeholder = 'Seleziona account...',
                                            className,
                                            prohibitedIds = [],
                                        }: Props) {
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState('');
    const [selectedId, setSelectedId] = useState<number | null>(value ?? null);

    const treeData = useMemo(() => buildTreeNodes(accounts), [accounts]);

    const treeRef = useRef<any>(null);

    useEffect(() => setSelectedId(value ?? null), [value]);

    // helper: tutti i discendenti (ids) di un nodo
    const getDescendantIds = (nodes: AccountNode[], parentId: number): number[] => {
        const map = new Map<number, AccountNode[]>();
        nodes.forEach(n => {
            const p = Number(n.parent ?? 0);
            if (!map.has(p)) map.set(p, []);
            map.get(p)!.push(n);
        });
        const out: number[] = [];
        const stack = [...(map.get(parentId) ?? [])];
        while (stack.length) {
            const cur = stack.pop()!;
            out.push(Number(cur.id));
            const kids = map.get(Number(cur.id));
            if (kids) stack.push(...kids);
        }
        return out;
    };

    // filtro: mantieni i genitori dei match
    const filteredTree = useMemo(() => {
        if (!filter.trim()) return treeData;
        const q = filter.trim().toLowerCase();
        const matches = new Set<number>();
        const idToNode = new Map<number, AccountNode>(treeData.map(n => [Number(n.id), n]));

        const nodeMatches = (n: AccountNode) => {
            const acc = n.data as Account;
            return acc.name.toLowerCase().includes(q) || (acc.description || '').toLowerCase().includes(q);
        };

        treeData.forEach(n => {
            if (nodeMatches(n)) matches.add(Number(n.id));
        });

        // aggiungi i genitori per ogni nodo matching
        treeData.forEach(n => {
            if (matches.has(Number(n.id))) {
                let p = n.parent as number;
                while (p && p !== 0) {
                    matches.add(p);
                    const parentNode = idToNode.get(p);
                    p = parentNode?.parent as number ?? 0;
                }
            }
        });

        return treeData.filter(n => matches.has(Number(n.id)));
    }, [treeData, filter]);

    // quando filtro cambia, apri tutti i parent che contengono match
    useEffect(() => {
        if (!filter.trim()) return;
        const toOpen = new Set<number>();
        const idToNode = new Map<number, AccountNode>(treeData.map(n => [Number(n.id), n]));
        const q = filter.trim().toLowerCase();

        const nodeMatches = (n: AccountNode) => {
            const acc = n.data as Account;
            return acc.name.toLowerCase().includes(q) || (acc.description || '').toLowerCase().includes(q);
        };

        treeData.forEach(n => {
            if (nodeMatches(n)) {
                let p = n.parent as number;
                while (p && p !== 0) {
                    toOpen.add(p);
                    const parentNode = idToNode.get(p);
                    p = parentNode?.parent as number ?? 0;
                }
            }
        });

        if (treeRef.current && toOpen.size) {
            const ids = Array.from(toOpen);
            Promise.resolve().then(() => {
                try {
                    treeRef.current.open(ids);
                } catch (err) { /* ignore */
                }
            });
        }
    }, [filter, treeData]);

    const findNodeById = (id?: number | null) => treeData.find(n => Number(n.id) === Number(id)) ?? null;
    const selectedNode = findNodeById(selectedId ?? undefined);

    const confirmSelection = (id: number | null) => {
        if (id !== null && prohibitedIds.includes(id)) return;
        onChange(id);
        setOpen(false);
    };

    const clearSelection = () => {
        setSelectedId(null);
        if (!open) onChange(null);
    };

    // nodo di rendering con gestione toggle + close recursivo + disabled se proibito
    const SelectNode: React.FC<{ node: AccountNode; depth: number; isOpen: boolean; onToggle: () => void; }> = ({
                                                                                                                    node,
                                                                                                                    depth,
                                                                                                                    isOpen,
                                                                                                                    onToggle
                                                                                                                }) => {
        const acc = node.data as Account;
        const disabled = prohibitedIds.includes(Number(node.id));
        const isSelected = Number(selectedId) === Number(node.id);

        const handleToggle = (e: React.MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            if (disabled) return;
            onToggle();

            if (isOpen && treeRef.current) {
                const desc = getDescendantIds(treeData, Number(node.id));
                if (desc.length > 0) {
                    Promise.resolve().then(() => {
                        try {
                            treeRef.current.close(desc);
                        } catch (err) { /* ignore */
                        }
                    });
                }
            }
        };

        return (
            <div
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer ${isSelected ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-base-200'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                style={{marginLeft: depth * 20}}
                onClick={() => {
                    if (!disabled) setSelectedId(Number(node.id));
                }}
                role="button"
                tabIndex={disabled ? -1 : 0}
                onKeyDown={(e) => {
                    if (!disabled && e.key === 'Enter') setSelectedId(Number(node.id));
                }}
                title={disabled ? 'Selezione non valida (previene cicli)' : undefined}
            >
                <div className="w-8 h-8 rounded-full border flex items-center justify-center"
                     style={{backgroundColor: acc.color ?? '#ffffff'}} aria-hidden/>
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-medium">{acc.name}</div>
                    </div>
                    {acc.description && <div className="text-xs opacity-60 truncate">{acc.description}</div>}
                </div>

                <div className="ml-auto">
                    <button className="btn btn-ghost btn-xs p-1" onClick={handleToggle}
                            aria-label={isOpen ? 'Collapse' : 'Expand'} disabled={disabled}>
                        <svg xmlns="http://www.w3.org/2000/svg"
                             className={`h-4 w-4 transform ${isOpen ? 'rotate-90' : ''}`} viewBox="0 0 24 24"
                             fill="none" stroke="currentColor">
                            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                        </svg>
                    </button>
                </div>
            </div>
        );
    };

    const selectionIsProhibited = selectedId !== null && prohibitedIds.includes(Number(selectedId));

    return (
        <>
            <div className={`flex items-center gap-2 ${className ?? ''}`}>
                <button
                    type="button"
                    className="btn btn-outline flex-1 justify-between min-w-0"
                    onClick={() => setOpen(true)}
                    aria-haspopup="dialog"
                    aria-expanded={open}
                >
                    <div className="flex items-center gap-2 min-w-0 truncate">
                        {selectedNode ? (
                            <>
                                <div className="w-6 h-6 rounded-full border flex items-center justify-center"
                                     style={{backgroundColor: (selectedNode.data as Account).color ?? '#fff'}}/>
                                <div className="truncate text-sm">{(selectedNode.data as Account).name}</div>
                            </>
                        ) : (
                            <div className="truncate text-sm opacity-60">{placeholder}</div>
                        )}
                    </div>
                    <div className="ml-2 opacity-70">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24"
                             stroke="currentColor">
                            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                        </svg>
                    </div>
                </button>

                {allowRootChoice && (
                    <button type="button" className="btn btn-ghost" onClick={clearSelection}
                            title="Rimuovi selezione">✕</button>
                )}
            </div>

            {open && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-4xl w-full">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-medium">{title}</h3>
                            <div className="flex gap-2">
                                <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Annulla</button>
                                <button className="btn btn-primary btn-sm"
                                        onClick={() => confirmSelection(selectedId ?? null)}
                                        disabled={selectionIsProhibited}>Seleziona
                                </button>
                            </div>
                        </div>

                        <div className="mb-3">
                            <input
                                type="text"
                                placeholder="Cerca..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="input input-bordered input-sm w-full"
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className="w-3/5 max-h-[60vh] overflow-auto">
                                <DndProvider backend={HTML5Backend}>
                                    <Tree
                                        ref={treeRef}
                                        tree={filteredTree}
                                        rootId={0}
                                        render={(node, {depth, isOpen, onToggle}) => (
                                            <SelectNode key={node.id} node={node} depth={depth} isOpen={isOpen}
                                                        onToggle={onToggle}/>
                                        )}
                                        canDrag={() => false}
                                        canDrop={() => false}
                                        onDrop={() => {
                                        }}
                                    />
                                </DndProvider>
                            </div>

                            <div className="w-2/5">
                                <div className="card bg-base-100 shadow-sm p-3">
                                    <div className="text-sm font-medium">Preview</div>
                                    <div className="mt-3">
                                        {selectedNode ? (
                                            <>
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-10 h-10 rounded-full border flex items-center justify-center"
                                                        style={{backgroundColor: (selectedNode.data as Account).color ?? '#fff'}}/>
                                                    <div>
                                                        <div
                                                            className="font-semibold">{(selectedNode.data as Account).name}</div>
                                                        <div
                                                            className="text-xs opacity-60">{(selectedNode.data as Account).description}</div>
                                                    </div>
                                                </div>
                                                <div className="mt-3 text-xs opacity-60">ID: {selectedNode.id}</div>
                                            </>
                                        ) : (
                                            <div className="text-xs opacity-60">Nessun account selezionato</div>
                                        )}
                                    </div>

                                    {selectionIsProhibited && (
                                        <div className="text-sm text-error mt-2">Selezione non valida: non puoi
                                            impostare come parent te stesso o un tuo discendente.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
