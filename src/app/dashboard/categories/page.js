"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FolderTree,
  Layers3,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { categoryService } from "@/services/category.service";

function makeSlug(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");
}

function flattenCategories(categories, level = 0, parentPath = "") {
  let list = [];

  categories.forEach((cat) => {
    const path = parentPath ? `${parentPath} / ${cat.name}` : cat.name;

    list.push({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      level,
      path,
    });

    if (cat.children?.length) {
      list = list.concat(flattenCategories(cat.children, level + 1, path));
    }
  });

  return list;
}

function countTotal(categories) {
  return categories.reduce((total, cat) => {
    return total + 1 + countTotal(cat.children || []);
  }, 0);
}

function CategoryNode({ category, level = 0, onAddChild }) {
  const [open, setOpen] = useState(true);
  const hasChildren = category.children?.length > 0;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0F172A]">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="mt-1 rounded-lg border border-white/10 bg-[#1E293B] p-1 text-gray-300 hover:text-white"
          >
            {hasChildren ? (
              open ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )
            ) : (
              <FolderTree size={16} />
            )}
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-white">{category.name}</h3>

              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-300">
                Level {level + 1}
              </span>

              {hasChildren && (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                  {category.children.length} child
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-gray-400">
              Slug: <span className="text-gray-300">{category.slug}</span>
            </p>

            <p className="mt-1 text-xs text-gray-500">
              ID: {category.id}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onAddChild(category)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          Add Child
        </button>
      </div>

      {hasChildren && open && (
        <div className="space-y-3 border-t border-white/10 p-3 pl-6">
          {category.children.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              level={level + 1}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [image, setImage] = useState("");
  const [parentId, setParentId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const flatCategories = useMemo(() => {
    return flattenCategories(categories);
  }, [categories]);

  const filteredCategories = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return categories;

    const filterTree = (items) => {
      return items
        .map((item) => {
          const children = filterTree(item.children || []);
          const matched =
            item.name?.toLowerCase().includes(keyword) ||
            item.slug?.toLowerCase().includes(keyword);

          if (matched || children.length) {
            return {
              ...item,
              children,
            };
          }

          return null;
        })
        .filter(Boolean);
    };

    return filterTree(categories);
  }, [categories, search]);

  const selectedParent = flatCategories.find((cat) => cat.id === parentId);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await categoryService.getCategories();
      setCategories(res?.categories || []);
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Categories load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleNameChange = (value) => {
    setName(value);
    setSlug(makeSlug(value));
  };

  const resetForm = () => {
    setName("");
    setSlug("");
    setImage("");
    setParentId("");
  };

  const handleAddChild = (category) => {
    setParentId(category.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Category name required");
      return;
    }

    try {
      setCreating(true);

const payload = {
  name: name.trim(),
  slug: slug.trim() || makeSlug(name),
  image: image.trim() || "",
  parentId: parentId || "",
};

      const res = await categoryService.createCategory(payload);

      if (!res?.success) {
        alert(res?.message || "Category create failed");
        return;
      }

      resetForm();
      await fetchCategories();
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Category create failed");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Categories</h1>
          <p className="text-sm text-gray-400">
            Manage unlimited parent, child and sub-child categories.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchCategories}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#1E293B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#263449]"
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#1E293B] p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Total Categories</p>
            <Layers3 className="text-blue-400" size={20} />
          </div>
          <h2 className="mt-2 text-2xl font-bold text-white">
            {countTotal(categories)}
          </h2>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#1E293B] p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Root Categories</p>
            <FolderTree className="text-emerald-400" size={20} />
          </div>
          <h2 className="mt-2 text-2xl font-bold text-white">
            {categories.length}
          </h2>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#1E293B] p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Selectable Parents</p>
            <FolderTree className="text-purple-400" size={20} />
          </div>
          <h2 className="mt-2 text-2xl font-bold text-white">
            {flatCategories.length}
          </h2>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
        <form
          onSubmit={handleSubmit}
          className="h-fit rounded-xl border border-white/10 bg-[#1E293B] p-5"
        >
          <div className="mb-5">
            <h2 className="text-lg font-bold text-white">Create Category</h2>
            <p className="text-sm text-gray-400">
              Parent empty রাখলে main category হবে।
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Category Name
              </label>
              <input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Example: Fashion"
                className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-4 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Slug
              </label>
              <input
                value={slug}
                onChange={(e) => setSlug(makeSlug(e.target.value))}
                placeholder="example: fashion"
                className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-4 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Parent Category
              </label>

              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-4 py-2 text-sm text-white outline-none focus:border-blue-500"
              >
                <option value="">No Parent — Main Category</option>

                {flatCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {"— ".repeat(cat.level)}
                    {cat.name}
                  </option>
                ))}
              </select>

              {selectedParent && (
                <p className="mt-2 rounded-lg bg-blue-500/10 px-3 py-2 text-xs text-blue-200">
                  New category will be child of: {selectedParent.path}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Image URL optional
              </label>
              <input
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://example.com/category.png"
                className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-4 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:border-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={17} />
                {creating ? "Creating..." : "Create"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-white/10 bg-[#0F172A] px-4 py-2 text-sm font-semibold text-gray-300 hover:text-white"
              >
                Clear
              </button>
            </div>
          </div>
        </form>

        <div className="rounded-xl border border-white/10 bg-[#1E293B] p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Category Tree</h2>
              <p className="text-sm text-gray-400">
                যেকোনো category-এর নিচে unlimited child add করা যাবে।
              </p>
            </div>

            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search category..."
                className="w-full rounded-lg border border-white/10 bg-[#0F172A] py-2 pl-9 pr-4 text-sm text-white outline-none placeholder:text-gray-500 focus:border-blue-500 sm:w-64"
              />
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-white/10 bg-[#0F172A] p-6 text-center text-gray-400">
              Loading categories...
            </div>
          ) : filteredCategories.length ? (
            <div className="space-y-3">
              {filteredCategories.map((category) => (
                <CategoryNode
                  key={category.id}
                  category={category}
                  onAddChild={handleAddChild}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-[#0F172A] p-6 text-center text-gray-400">
              No category found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}