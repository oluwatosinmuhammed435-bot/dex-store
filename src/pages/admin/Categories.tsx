import React, { useState } from 'react';
import { CATEGORIES, type CategoryItem } from '../../data/storeData';
import { Pencil, Trash2, PlusSquare, X, Save } from 'lucide-react';

export const AdminCategories: React.FC = () => {
  const [categories, setCategories] = useState<CategoryItem[]>([...CATEGORIES]);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');

  const handleDelete = (slug: string) => {
    if (confirm('Delete this category? (prototype – local state only)')) {
      setCategories(prev => prev.filter(c => c.slug !== slug));
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newSlug.trim()) return;
    const newCategory: CategoryItem = {
      id: `cat-${newSlug}`,
      slug: newSlug as CategoryItem['slug'],
      name: newName as CategoryItem['name'],
      shortDescription: '',
      editorialSummary: '',
      image: '',
      highlights: [],
    };
    setCategories(prev => [...prev, newCategory]);
    setNewName('');
    setNewSlug('');
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#202923]">Categories</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 bg-[#123D2A] text-white px-4 py-2 rounded-md hover:bg-[#0f2e1e] transition text-sm"
        >
          {showForm ? <X className="h-4 w-4" /> : <PlusSquare className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'Add Category'}
        </button>
      </div>

      {/* Inline add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white p-4 rounded-lg shadow-sm border border-[#E0E0E0] flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            placeholder="Category name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#123D2A]"
          />
          <input
            type="text"
            required
            placeholder="slug (e.g. car-parts)"
            value={newSlug}
            onChange={e => setNewSlug(e.target.value)}
            className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#123D2A]"
          />
          <button type="submit" className="inline-flex items-center gap-2 bg-[#123D2A] text-white px-4 py-2 rounded-md hover:bg-[#0f2e1e] transition text-sm">
            <Save className="h-4 w-4" /> Save
          </button>
        </form>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg shadow-sm border border-[#E0E0E0] bg-white">
        <table className="min-w-full">
          <thead className="bg-[#E6F4E9]">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#202923]">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#202923]">Slug</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#202923]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat.slug} className="border-t border-[#E0E0E0] hover:bg-[#FAFFF8] transition-colors">
                <td className="px-4 py-3 text-sm text-[#202923] font-medium">{cat.name}</td>
                <td className="px-4 py-3 text-sm text-[#555]">{cat.slug}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button className="p-1.5 text-[#123D2A] hover:bg-[#E6F4E9] rounded transition" title="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                      title="Delete"
                      onClick={() => handleDelete(cat.slug)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-[#999]">
                  No categories yet. Click "Add Category" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
