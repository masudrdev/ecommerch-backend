"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  ImageIcon,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tags,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { brandService } from "@/services/brand.service";

function makeSlug(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");
}

export default function BrandsPage() {
  const [brands, setBrands] = useState([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [logo, setLogo] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [previewLogo, setPreviewLogo] = useState("");
  const [search, setSearch] = useState("");

  const [editingBrand, setEditingBrand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const filteredBrands = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return brands;

    return brands.filter((brand) => {
      return (
        brand.name?.toLowerCase().includes(keyword) ||
        brand.slug?.toLowerCase().includes(keyword)
      );
    });
  }, [brands, search]);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const res = await brandService.getBrands();

      setBrands(res?.brands || res?.data || []);
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Brands load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleNameChange = (value) => {
    setName(value);
    setSlug(makeSlug(value));
  };

  const resetForm = () => {
    setName("");
    setSlug("");
    setLogo("");
    setLogoFile(null);
    setPreviewLogo("");
    setEditingBrand(null);
  };

  const handleEdit = (brand) => {
    const logoUrl = brand.logo || brand.image || "";

    setEditingBrand(brand);
    setName(brand.name || "");
    setSlug(brand.slug || "");
    setLogo(logoUrl);
    setLogoFile(null);
    setPreviewLogo(logoUrl);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogoFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Only image file allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Logo file size must be less than 5MB");
      return;
    }

    setLogoFile(file);
    setPreviewLogo(URL.createObjectURL(file));
  };

  const removeSelectedFile = () => {
    setLogoFile(null);
    setPreviewLogo(logo || "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Brand name required");
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();

      formData.append("name", name.trim());
      formData.append("slug", slug.trim() || makeSlug(name));
      formData.append("logo", logo.trim() || "");

      if (logoFile) {
        formData.append("logoFile", logoFile);
      }

      let res;

      if (editingBrand) {
        res = await brandService.updateBrand(editingBrand.id, formData);
      } else {
        res = await brandService.createBrand(formData);
      }

      if (!res?.success) {
        alert(res?.message || "Brand save failed");
        return;
      }

      resetForm();
      await fetchBrands();
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Brand save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (brand) => {
    const ok = confirm(`Delete brand "${brand.name}"?`);

    if (!ok) return;

    try {
      const res = await brandService.deleteBrand(brand.id);

      if (!res?.success) {
        alert(res?.message || "Brand delete failed");
        return;
      }

      await fetchBrands();
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Brand delete failed");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Brands</h1>
          <p className="text-sm text-gray-400">
            Create, update and manage product brands.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchBrands}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#1E293B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#263449]"
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#1E293B] p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Total Brands</p>
            <Tags className="text-blue-400" size={20} />
          </div>
          <h2 className="mt-2 text-2xl font-bold text-white">
            {brands.length}
          </h2>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#1E293B] p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">With Logo</p>
            <ImageIcon className="text-emerald-400" size={20} />
          </div>
          <h2 className="mt-2 text-2xl font-bold text-white">
            {brands.filter((brand) => brand.logo || brand.image).length}
          </h2>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#1E293B] p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Active</p>
            <BadgeCheck className="text-purple-400" size={20} />
          </div>
          <h2 className="mt-2 text-2xl font-bold text-white">
            {brands.length}
          </h2>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
        <form
          onSubmit={handleSubmit}
          className="h-fit rounded-xl border border-white/10 bg-[#1E293B] p-5"
        >
          <div className="mb-5">
            <h2 className="text-lg font-bold text-white">
              {editingBrand ? "Update Brand" : "Create Brand"}
            </h2>
            <p className="text-sm text-gray-400">
              Brand name, slug, logo URL অথবা device upload manage করুন।
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Brand Name
              </label>
              <input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Example: Samsung"
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
                placeholder="example: samsung"
                className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-4 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Logo URL optional
              </label>
              <input
                value={logo}
                onChange={(e) => {
                  setLogo(e.target.value);
                  if (!logoFile) {
                    setPreviewLogo(e.target.value);
                  }
                }}
                placeholder="https://example.com/logo.png"
                className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-4 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Upload Custom Logo optional
              </label>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-[#0F172A] px-4 py-5 text-center hover:border-blue-500">
                <Upload size={24} className="mb-2 text-blue-400" />
                <span className="text-sm font-medium text-gray-300">
                  Click to upload logo
                </span>
                <span className="mt-1 text-xs text-gray-500">
                  PNG, JPG, WEBP allowed. Max 5MB.
                </span>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileChange}
                  className="hidden"
                />
              </label>

              {logoFile && (
                <div className="mt-2 flex items-center justify-between rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2">
                  <p className="truncate text-xs text-gray-300">
                    {logoFile.name}
                  </p>

                  <button
                    type="button"
                    onClick={removeSelectedFile}
                    className="rounded-md bg-red-500/10 p-1 text-red-300 hover:bg-red-500/20"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <p className="mt-1 text-xs text-gray-500">
                URL অথবা upload—যেকোনো একটা দিলেই হবে। Upload দিলে Cloudinary URL save হবে।
              </p>
            </div>

            {(previewLogo || logo) && (
              <div className="rounded-xl border border-white/10 bg-[#0F172A] p-4">
                <p className="mb-2 text-sm text-gray-400">Logo Preview</p>

                <img
                  src={previewLogo || logo}
                  alt="Brand logo"
                  className="h-20 w-20 rounded-lg object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={17} />
                {saving
                  ? "Saving..."
                  : editingBrand
                  ? "Update Brand"
                  : "Create Brand"}
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
              <h2 className="text-lg font-bold text-white">Brand List</h2>
              <p className="text-sm text-gray-400">
                All created brands will appear here.
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
                placeholder="Search brand..."
                className="w-full rounded-lg border border-white/10 bg-[#0F172A] py-2 pl-9 pr-4 text-sm text-white outline-none placeholder:text-gray-500 focus:border-blue-500 sm:w-64"
              />
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-white/10 bg-[#0F172A] p-6 text-center text-gray-400">
              Loading brands...
            </div>
          ) : filteredBrands.length ? (
            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full border-collapse">
                <thead className="bg-[#0F172A]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-400">
                      Brand
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-400">
                      Slug
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-400">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {filteredBrands.map((brand) => {
                    const logoUrl = brand.logo || brand.image || "";

                    return (
                      <tr key={brand.id} className="hover:bg-white/[0.03]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#0F172A]">
                              {logoUrl ? (
                                <img
                                  src={logoUrl}
                                  alt={brand.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <ImageIcon
                                  size={18}
                                  className="text-gray-500"
                                />
                              )}
                            </div>

                            <div>
                              <p className="font-semibold text-white">
                                {brand.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                ID: {brand.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-300">
                            {brand.slug}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(brand)}
                              className="rounded-lg border border-white/10 bg-[#0F172A] p-2 text-gray-300 hover:text-white"
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(brand)}
                              className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-[#0F172A] p-6 text-center text-gray-400">
              No brand found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}