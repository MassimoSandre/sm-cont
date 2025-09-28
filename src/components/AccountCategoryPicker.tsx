import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {AccountCategory} from '../models/AccountCategory';

export type CategoryNode = AccountCategory & { children?: CategoryNode[] };

type VisibleNode = { node: CategoryNode; depth: number };

export default function CategoryPicker(props: {
    categories: AccountCategory[];
    selectedId?: number | null;
    onSelect: (node: AccountCategory) => void;
    placeholder?: string;
    className?: string;
    width?: string; // e.g. "w-64"
    autoFocusSearch?: boolean;
}) {
    const {
        categories,
        selectedId = undefined,
        onSelect,
        placeholder = 'Search...',
        className = '',
        width = 'w-64',
        autoFocusSearch = false
    } = props;

    // build tree from flat list (memoized)
    const roots = useMemo<CategoryNode[]>(() => {
        const map = new Map<number, CategoryNode>();
        categories.forEach(c => map.set(c.id, {...c, children: []}));
        const rootsArr: CategoryNode[] = [];
        categories.forEach(c => {
            if (c.parent_id != null) {
                const p = map.get(c.parent_id as number);
                if (p) p.children!.push(map.get(c.id)!);
                else rootsArr.push(map.get(c.id)!); // parent missing -> treat as root
            } else {
                rootsArr.push(map.get(c.id)!);
            }
        });
        // keep original order stable: sort by id (or you can keep insertion order)
        return rootsArr;
    }, [categories]);

    // helpers to compute parent map and ancestors
    const parentMap = useMemo(() => {
        const pm = new Map<number, number | null>();
        categories.forEach(c => pm.set(c.id, c.parent_id ?? null));
        return pm;
    }, [categories]);

    const getAncestors = useCallback((id: number) => {
        const res: number[] = [];
        let cur = parentMap.get(id);
        while (cur != null) {
            res.push(cur);
            cur = parentMap.get(cur);
        }
        return res;
    }, [parentMap]);

    // expanded nodes state (ids)
    const [expanded, setExpanded] = useState<Set<number>>(new Set());
    const toggleExpanded = useCallback((id: number) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    // search state
    const [q, setQ] = useState('');
    const searchRef = useRef<HTMLInputElement | null>(null);

    // auto-focus search if requested
    useEffect(() => {
        if (autoFocusSearch && searchRef.current) searchRef.current.focus();
    }, [autoFocusSearch]);

    // If searching, expand all parents of matching nodes
    useEffect(() => {
        if (!q) return;
        const lc = q.trim().toLowerCase();
        if (!lc) return;
        const matching = categories.filter(c => (c.name || '').toLowerCase().includes(lc)).map(c => c.id);
        if (matching.length === 0) return;
        const toExpand = new Set<number>();
        matching.forEach(id => {
            const ancestors = getAncestors(id);
            ancestors.forEach(a => toExpand.add(a));
        });
        // merge with existing expanded
        setExpanded(prev => {
            const next = new Set(prev);
            toExpand.forEach(x => next.add(x));
            return next;
        });
    }, [q, categories, getAncestors]);

    // flatten visible nodes (respect expanded and search filter)
    const visibleNodes = useMemo<VisibleNode[]>(() => {
        const out: VisibleNode[] = [];
        const lc = q.trim().toLowerCase();

        function shouldInclude(node: CategoryNode): boolean {
            if (!lc) return true;
            if ((node.name || '').toLowerCase().includes(lc)) return true;
            // descendant matches?
            const stack = [...(node.children ?? [])];
            while (stack.length) {
                const n = stack.shift()!;
                if ((n.name || '').toLowerCase().includes(lc)) return true;
                if (n.children && n.children.length) stack.push(...n.children);
            }
            return false;
        }

        function dfs(node: CategoryNode, depth: number) {
            if (!shouldInclude(node)) return;
            out.push({node, depth});
            const isExpanded = expanded.has(node.id) || !!lc; // if search active, show children by default
            if (node.children && node.children.length && isExpanded) {
                node.children.forEach(ch => dfs(ch, depth + 1));
            }
        }

        roots.forEach(r => dfs(r, 0));
        return out;
    }, [roots, expanded, q]);

    // keyboard nav
    const [focusIdx, setFocusIdx] = useState<number>(() => {
        const i = visibleNodes.findIndex(v => v.node.id === selectedId);
        return i >= 0 ? i : 0;
    });

    useEffect(() => {
        // re-evaluate focus when visibleNodes change (keep closest selection)
        if (visibleNodes.length === 0) {
            setFocusIdx(-1);
            return;
        }
        // try keep same selectedId position
        const selIdx = visibleNodes.findIndex(v => v.node.id === selectedId);
        if (selIdx >= 0) setFocusIdx(selIdx);
        else if (focusIdx >= visibleNodes.length) setFocusIdx(visibleNodes.length - 1);
        else if (focusIdx < 0) setFocusIdx(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visibleNodes.length]);

    // refs for nodes to scroll into view
    const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});
    useEffect(() => {
        if (focusIdx >= 0 && focusIdx < visibleNodes.length) {
            const id = visibleNodes[focusIdx].node.id;
            const el = itemRefs.current[id];
            if (el && typeof el.scrollIntoView === 'function') {
                el.scrollIntoView({block: 'nearest'});
            }
        }
    }, [focusIdx, visibleNodes]);

    // keyboard handler on container
    const onKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!visibleNodes || visibleNodes.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusIdx(i => Math.min((i === -1 ? 0 : i) + 1, visibleNodes.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusIdx(i => Math.max((i === -1 ? 0 : i) - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const vn = visibleNodes[focusIdx];
            if (vn) onSelect(vn.node);
        } else if (e.key === ' ') {
            // toggle expand/collapse on focused node
            const vn = visibleNodes[focusIdx];
            if (vn) {
                e.preventDefault();
                toggleExpanded(vn.node.id);
            }
        } else if (e.key === 'Escape') {
            // clear search and blur
            setQ('');
            (e.target as HTMLElement).blur?.();
        }
    }, [visibleNodes, focusIdx, onSelect, toggleExpanded]);

    // render one row
    const renderRow = (vn: VisibleNode, idx: number) => {
        const {node, depth} = vn;
        const isFocused = idx === focusIdx;
        const isSelected = node.id === selectedId;

        return (
            <div
                key={node.id}
                ref={(el) => {
                    itemRefs.current[node.id] = el;
                }}
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(node);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') onSelect(node);
                }}
                className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer select-none
          ${isFocused ? 'bg-blue-100' : ''}
          ${isSelected ? 'ring-2 ring-blue-400' : ''}
        `}
                style={{paddingLeft: `${8 + depth * 14}px`}}
                aria-pressed={isSelected}
            >
                {/* expand toggle (if has children) */}
                {node.children && node.children.length > 0 ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleExpanded(node.id);
                        }}
                        className="w-5 h-5 flex items-center justify-center text-xs"
                        aria-label={expanded.has(node.id) ? 'Collapse' : 'Expand'}
                    >
                        {expanded.has(node.id) ? '▾' : '▸'}
                    </button>
                ) : (
                    <div className="w-5"/>
                )}

                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{backgroundColor: node.color || '#ccc'}}/>

                <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{node.name}</div>
                    {node.description && <div className="text-xs text-gray-500 truncate">{node.description}</div>}
                </div>
            </div>
        );
    };

    return (
        <div className={`${width} ${className}`} onKeyDown={onKeyDown}>
            <div className="p-2">
                <input
                    ref={searchRef}
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={placeholder}
                    className="w-full border p-2 rounded text-sm"
                    aria-label="Search categories"
                />
            </div>

            <div className="border-t max-h-72 overflow-auto">
                {visibleNodes.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">No categories</div>
                ) : (
                    visibleNodes.map((vn, idx) => renderRow(vn, idx))
                )}
            </div>
        </div>
    );
}
