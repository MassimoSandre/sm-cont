import React, { useState } from 'react';
import { useAccountsCategoryViewModel } from '../viewModels/useAccountsCategoryViewModel';
import type { AccountCategory } from '../models/AccountCategory';

type CategoryNode = AccountCategory & { children?: CategoryNode[] };

function buildTree(categories: AccountCategory[]): CategoryNode[] {
  const map = new Map<number, CategoryNode>();
  const roots: CategoryNode[] = [];

  categories.forEach(cat => map.set(cat.id, { ...cat, children: [] }));

  categories.forEach(cat => {
    if (cat.parent_id) {
      const parent = map.get(cat.parent_id);
      if (parent) parent.children?.push(map.get(cat.id)!);
    } else {
      roots.push(map.get(cat.id)!);
    }
  });

  return roots;
}

const CategoryCard: React.FC<{
  cat: CategoryNode;
  level?: number;
  selectedId?: number | null;
  onSelect: (cat: CategoryNode) => void;
  onEdit: (cat: CategoryNode) => void;
  onAddChild: (cat: CategoryNode) => void;
}> = ({ cat, level = 0, selectedId, onSelect, onEdit, onAddChild }) => {
  const [expanded, setExpanded] = useState(false);
  const isSelected = selectedId === cat.id;

  return (
    <div style={{ paddingLeft: `${level * 20}px` }} className="mb-2">
      <div
        className={`flex items-center gap-2 p-3 rounded-lg shadow cursor-pointer transition hover:bg-gray-100
          ${level % 2 === 1 ? 'bg-gray-50' : 'bg-white'}
          ${isSelected ? 'ring-2 ring-blue-400' : ''}`}
      >
        {cat.children && cat.children.length > 0 && (
          <span onClick={() => setExpanded(!expanded)} className="select-none">
            {expanded ? "▼" : "▶"}
          </span>
        )}
        <div className="flex-1" onClick={() => onSelect(cat)}>
          <h3 className="font-bold">{cat.name}</h3>
          <p className="text-sm text-gray-600">{cat.description}</p>
        </div>
        <span
          className="w-6 h-6 rounded-full border"
          style={{ backgroundColor: cat.color }}
        />
        <i className={cat.icon}></i>

        <div className="flex gap-1 ml-2">
          <button
            type="button"
            className="text-blue-500 hover:text-blue-700"
            onClick={(e) => { e.stopPropagation(); onEdit(cat); }}
            title="Edit"
          >
            ✏️
          </button>
          <button
            type="button"
            className="text-green-500 hover:text-green-700"
            onClick={(e) => { e.stopPropagation(); onAddChild(cat); }}
            title="Add Subcategory"
          >
            ➕
          </button>
        </div>
      </div>

      {expanded && cat.children?.map(child => (
        <CategoryCard
          key={child.id}
          cat={child}
          level={level + 1}
          selectedId={selectedId}
          onSelect={onSelect}
          onEdit={onEdit}
          onAddChild={onAddChild}
        />
      ))}
    </div>
  );
};

export const AccountsCategoryPage: React.FC = () => {
  const { accountCategories, addAccountCategory, fetchCategories, loading } = useAccountsCategoryViewModel();
  const [selectedCategory, setSelectedCategory] = useState<AccountCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: '',
    color: '#000000',
    icon: 'default-icon',
    parent_id: undefined as number | undefined,
  });

  const openForm = (cat?: AccountCategory, isChild = false) => {
    setSelectedCategory(cat || null);
    setFormData({
      name: cat?.name || '',
      description: cat?.description || '',
      type: cat?.type || '',
      color: cat?.color || '#000000',
      icon: cat?.icon || 'default-icon',
      parent_id: isChild ? cat?.id : undefined,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addAccountCategory(
        {
        id: 0, // backend assigns ID
        parent_id: formData.parent_id,
        name: formData.name,
        description: formData.description,
        type: formData.type,
        color: formData.color,
        icon: formData.icon,
      });
      // reload tree or you can rely on addAccountCategory to append
      await fetchCategories();
      setFormData({
        name: '',
        description: '',
        type: '',
        color: '#000000',
        icon: 'default-icon',
        parent_id: undefined,
      });
      setSelectedCategory(null);
    } catch (err) {
      console.error('Save error', err);
      //alert('Error saving category: ' + (err as any).message ?? String(err));
    }
  };

  const tree = buildTree(accountCategories);

  return (
    <div className="p-4 flex gap-4">
      {/* TREE */}
      <div className="flex-1 max-h-screen overflow-auto">
        {loading ? <div>Loading categories…</div> : (
          <>
            {tree.map(root => (
              <CategoryCard
                key={root.id}
                cat={root}
                selectedId={selectedCategory?.id || null}
                onSelect={(cat) => setSelectedCategory(cat)}
                onEdit={(cat) => openForm(cat, false)}
                onAddChild={(cat) => openForm(cat, true)}
              />
            ))}

            <div
              className="flex items-center justify-center p-4 rounded-lg shadow bg-blue-50 hover:bg-blue-100 cursor-pointer mt-2"
              onClick={() => openForm(undefined, false)}
            >
              <span className="text-2xl font-bold text-green-600">➕ Add Category</span>
            </div>
          </>
        )}
      </div>

      {/* SIDE FORM */}
      <div className="w-96 border p-4 rounded-lg shadow bg-white flex-shrink-0">
        <h3 className="text-lg font-bold mb-4">
          {selectedCategory ? 'Edit Category / Add Subcategory' : 'Add Category'}
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              placeholder="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="border p-2 rounded"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Description</label>
            <input
              type="text"
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="border p-2 rounded"
            />
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1 flex flex-col">
              <label className="text-sm font-medium mb-1">Type</label>
              <input
                type="text"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
                className="border p-2 rounded w-full"
              />
            </div>
            <div className="flex flex-col items-center">
              <label className="text-sm font-medium mb-1">Color</label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-12 h-12 p-1 rounded cursor-pointer"
              />
            </div>
            <div className="flex-1 flex flex-col">
              <label className="text-sm font-medium mb-1">Icon</label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="border p-2 rounded w-full"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => setFormData({
                name: '',
                description: '',
                type: '',
                color: '#000000',
                icon: 'default-icon',
                parent_id: undefined
              })}
              className="py-2 px-4 rounded border"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountsCategoryPage;
