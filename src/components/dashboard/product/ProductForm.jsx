"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ShieldCheck } from "lucide-react";
import { productService } from "@/services/product.service";

const emptyVariant = { color: "", size: "", stock: "", sku: "", };

function getUserRole() {
  if (typeof window === "undefined") return "";

  try {
    const user =
      JSON.parse(localStorage.getItem("user") || "null") ||
      JSON.parse(localStorage.getItem("authUser") || "null");

    return user?.role || "";
  } catch {
    return "";
  }
}

export default function ProductForm({ mode = "add", productId = null }) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const [role] = useState(() => getUserRole());
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  const [mainCategory, setMainCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [childCategory, setChildCategory] = useState("");

  const [commissionType, setCommissionType] = useState("");
  const [commissionValue, setCommissionValue] = useState("");

  const [oldMainImage, setOldMainImage] = useState(null);
  const [oldGalleryImages, setOldGalleryImages] = useState([]);
  const [newMainImage, setNewMainImage] = useState(null);
  const [newGalleryImages, setNewGalleryImages] = useState([]);
  const [variants, setVariants] = useState([{ ...emptyVariant }]);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    salePrice: "",
    deliveryCharge: "",
    outsideDistrictExtraCharge: "35",
    brandId: "",
  });

  const selectedMain = useMemo(
    () => categories.find((item) => item.id === mainCategory),
    [categories, mainCategory]
  );

  const selectedSub = useMemo(
    () => selectedMain?.children?.find((item) => item.id === subCategory),
    [selectedMain, subCategory]
  );

  const finalCategoryId = childCategory || subCategory || mainCategory || null;

  const validVariants = useMemo(() => {
    return variants.filter(
      (item) => item.stock !== "" && Number(item.stock) >= 0
    );
  }, [variants]);

  const totalStock = useMemo(() => {
    return validVariants.reduce(
      (sum, item) => sum + Number(item.stock || 0),
      0
    );
  }, [validVariants]);

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const findCategoryPath = (categoryId, categoryList) => {
    for (const main of categoryList) {
      if (main.id === categoryId) {
        return { main: main.id, sub: "", child: "" };
      }

      for (const sub of main.children || []) {
        if (sub.id === categoryId) {
          return { main: main.id, sub: sub.id, child: "" };
        }

        for (const child of sub.children || []) {
          if (child.id === categoryId) {
            return { main: main.id, sub: sub.id, child: child.id };
          }
        }
      }
    }

    return { main: "", sub: "", child: "" };
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError("");

      const requests = [productService.getCategories()];
      if (!isAdmin) requests.push(productService.getBrands());

      const results = await Promise.all(requests);
      const catRes = results[0];
      const brandRes = results[1];

      const categoryList = catRes?.categories || [];
      setCategories(categoryList);
      if (!isAdmin) setBrands(brandRes?.brands || []);

      if (isEdit && productId) {
        const res = await productService.getManageProduct(productId);
        const product = res?.product || {};

        setForm({
          name: product.name || "",
          description: product.description || "",
          price: product.price ?? "",
          salePrice: product.salePrice ?? "",
          deliveryCharge: product.deliveryCharge ?? "",
          outsideDistrictExtraCharge:
            product.outsideDistrictExtraCharge ?? "35",
          brandId: product.brandId || "",
        });

        setCommissionType(product.commissionType || "");
        setCommissionValue(
          product.commissionValue !== null &&
            product.commissionValue !== undefined
            ? String(product.commissionValue)
            : ""
        );

        const path = findCategoryPath(product.categoryId, categoryList);
        setMainCategory(path.main);
        setSubCategory(path.sub);
        setChildCategory(path.child);

        if (!isAdmin) {
          const images = product.images || [];
          const mainImage =
            images.find((img) => img.isMain) || images[0] || null;

          setOldMainImage(mainImage);
          setOldGalleryImages(
            images.filter((img) => img.id !== mainImage?.id)
          );

          if (product.variants?.length > 0) {
            setVariants(
              product.variants.map((item) => ({
                color: item.color || "",
                size: item.size || "",
                sku: item.sku || "",
                stock: item.stock ?? "",
              }))
            );
          } else {
            setVariants([
              { color: "", size: "", sku: "", stock: product.stock ?? "" },
            ]);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleVariantChange = (index, field, value) => {
    setVariants((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const addVariant = () => {
    setVariants((prev) => [...prev, { ...emptyVariant }]);
  };

  const removeVariant = (index) => {
    setVariants((prev) => {
      if (prev.length === 1) return [{ ...emptyVariant }];
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeOldImage = async (image, type = "gallery") => {
    try {
      if (!image?.id) return;
      if (!confirm("Remove this image?")) return;

      await productService.deleteImage(image.id);

      if (type === "main") {
        setOldMainImage(null);
      } else {
        setOldGalleryImages((prev) =>
          prev.filter((img) => img.id !== image.id)
        );
      }
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Image delete failed");
    }
  };

  const validateAdminForm = () => {
    if (!finalCategoryId) return "Please select a category";

    const hasType = Boolean(commissionType);
    const hasValue = commissionValue !== "";

    if (hasType !== hasValue) {
      return "Commission type and value must be provided together";
    }

    if (hasValue) {
      const numericValue = Number(commissionValue);

      if (!Number.isFinite(numericValue) || numericValue < 0) {
        return "Enter a valid commission value";
      }

      if (commissionType === "PERCENTAGE" && numericValue > 100) {
        return "Percentage commission cannot exceed 100";
      }

      const sellingPrice =
        form.salePrice !== "" && form.salePrice !== null
          ? Number(form.salePrice)
          : Number(form.price);

      if (commissionType === "FIXED" && numericValue > sellingPrice) {
        return "Fixed commission cannot exceed product selling price";
      }
    }

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isAdmin) {
      const validationMessage = validateAdminForm();
      if (validationMessage) {
        setError(validationMessage);
        return;
      }

      try {
        setSubmitting(true);
        setError("");

        await productService.updateProduct(productId, {
          categoryId: finalCategoryId,
          commissionType: commissionType || null,
          commissionValue:
            commissionType && commissionValue !== ""
              ? Number(commissionValue)
              : null,
        });

        router.push("/dashboard/products");
      } catch (err) {
        console.error(err);
        setError(
          err?.response?.data?.message ||
          err.message ||
          "Product update failed"
        );
      } finally {
        setSubmitting(false);
      }

      return;
    }

    if (!oldMainImage && !newMainImage) {
      setError("Please upload a main image");
      return;
    }

    if (!validVariants.length) {
      setError("Please add at least one stock quantity");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price || 0),
        salePrice: form.salePrice === "" ? null : Number(form.salePrice),
        deliveryCharge: Number(form.deliveryCharge || 0),
        outsideDistrictExtraCharge: Number(
          form.outsideDistrictExtraCharge || 0
        ),
        stock: totalStock,
        categoryId: finalCategoryId,
        brandId: form.brandId || null,
      };

      let savedProductId = productId;

      if (isEdit) {
        await productService.updateProduct(productId, payload);
      } else {
        const res = await productService.createProduct(payload);
        savedProductId = res?.product?.id;
      }

      if (!savedProductId) throw new Error("Product ID not found");

      if (newMainImage) {
        await productService.uploadImages(
          savedProductId,
          [newMainImage],
          true
        );
      }

      if (newGalleryImages.length > 0) {
        await productService.uploadImages(
          savedProductId,
          newGalleryImages,
          false
        );
      }

      await productService.replaceVariants(
        savedProductId,
        validVariants.map((item) => ({
          color: item.color?.trim() || null,
          size: item.size?.trim() || null,
          sku: item.sku?.trim() || null,
          stock: Number(item.stock || 0),
        }))
      );

      router.push("/dashboard/products");
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message || err.message || "Product save failed"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-[#1E293B] p-5 text-white">
        Loading...
      </div>
    );
  }

  if (isAdmin && !isEdit) {
    return (
      <div className="rounded-2xl bg-[#1E293B] p-6 text-white">
        Admin can only edit an existing product&apos;s category and commission.
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="rounded-2xl bg-[#1E293B] p-4 text-white sm:p-6">
        <div className="mb-6 flex items-start gap-3">
          <div className="rounded-xl bg-blue-500/10 p-3 text-blue-300">
            <ShieldCheck size={22} />
          </div>

          <div>
            <h1 className="text-2xl font-bold">Admin Product Settings</h1>
            <p className="mt-1 text-sm text-gray-400">
              Only category and product commission can be changed.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="mb-6 grid gap-4 rounded-xl border border-white/10 bg-[#0F172A]/50 p-4 sm:grid-cols-3">
          <ReadOnlyInfo label="Product" value={form.name || "-"} />
          <ReadOnlyInfo
            label="Selling Price"
            value={`৳${Number(
              form.salePrice || form.price || 0
            ).toLocaleString("en-BD")}`}
          />
          <ReadOnlyInfo label="Status" value="Unchanged" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-xl border border-white/10 p-4">
            <h2 className="mb-1 text-lg font-bold">Category</h2>
            <p className="mb-4 text-sm text-gray-400">
              Select the most specific available category.
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              <CategorySelect
                label="Main Category"
                value={mainCategory}
                options={categories}
                onChange={(value) => {
                  setMainCategory(value);
                  setSubCategory("");
                  setChildCategory("");
                }}
              />

              <CategorySelect
                label="Sub Category"
                value={subCategory}
                options={selectedMain?.children || []}
                disabled={!mainCategory}
                onChange={(value) => {
                  setSubCategory(value);
                  setChildCategory("");
                }}
              />

              <CategorySelect
                label="Child Category"
                value={childCategory}
                options={selectedSub?.children || []}
                disabled={!subCategory}
                onChange={setChildCategory}
              />
            </div>
          </section>

          <section className="rounded-xl border border-white/10 p-4">
            <h2 className="mb-1 text-lg font-bold">Product Commission</h2>
            <p className="mb-4 text-sm text-gray-400">
              Keep both fields empty to use vendor or platform default commission.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Commission Type
                </label>

                <select
                  value={commissionType}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCommissionType(value);
                    if (!value) setCommissionValue("");
                  }}
                  className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-blue-500"
                >
                  <option value="">Use Default</option>
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="FIXED">Fixed Amount</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Commission Value
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={!commissionType}
                  value={commissionValue}
                  onChange={(e) => setCommissionValue(e.target.value)}
                  placeholder={
                    commissionType === "FIXED" ? "Example: 30" : "Example: 10"
                  }
                  className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push("/dashboard/products")}
              className="rounded-lg border border-white/10 px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[#1E293B] p-4 text-white sm:p-6">
      <h1 className="text-2xl font-bold">
        {isEdit ? "Edit Product" : "Add Product"}
      </h1>

      <p className="mb-6 mt-1 text-sm text-gray-400">
        Category optional, images, delivery charge and stock variants.
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2">
          <Input label="Product Name" name="name" value={form.name} onChange={handleChange} required />
          <Select label="Brand Optional" name="brandId" value={form.brandId} onChange={handleChange} options={brands} defaultText="No Brand" />
          <Input label="Price" name="price" type="number" value={form.price} onChange={handleChange} required min="0" />
          <Input label="Sale Price Optional" name="salePrice" type="number" value={form.salePrice} onChange={handleChange} min="0" />
          <Input label="Inside District Delivery Charge" name="deliveryCharge" type="number" value={form.deliveryCharge} onChange={handleChange} min="0" />
          <Input label="Outside District Extra Charge" name="outsideDistrictExtraCharge" type="number" value={form.outsideDistrictExtraCharge} onChange={handleChange} min="0" />
        </section>

        <section className="rounded-xl border border-white/10 p-4">
          <h2 className="mb-3 text-lg font-bold">Category</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <CategorySelect label="Main Category Optional" value={mainCategory} options={categories} onChange={(value) => { setMainCategory(value); setSubCategory(""); setChildCategory(""); }} />
            <CategorySelect label="Sub Category Optional" value={subCategory} options={selectedMain?.children || []} disabled={!mainCategory} onChange={(value) => { setSubCategory(value); setChildCategory(""); }} />
            <CategorySelect label="Child Category Optional" value={childCategory} options={selectedSub?.children || []} disabled={!subCategory} onChange={setChildCategory} />
          </div>
        </section>

        <Textarea label="Description" name="description" value={form.description} onChange={handleChange} required />

        <ImageInput title="Main Image" multiple={false} oldImages={oldMainImage ? [oldMainImage] : []} newImages={newMainImage ? [newMainImage] : []} onChange={(files) => setNewMainImage(files[0] || null)} onRemoveOld={(img) => removeOldImage(img, "main")} onRemoveNew={() => setNewMainImage(null)} />

        <ImageInput title="Gallery Images" multiple oldImages={oldGalleryImages} newImages={newGalleryImages} onChange={(files) => setNewGalleryImages((prev) => [...prev, ...files])} onRemoveOld={(img) => removeOldImage(img, "gallery")} onRemoveNew={(index) => setNewGalleryImages((prev) => prev.filter((_, i) => i !== index))} />

        <section className="rounded-xl border border-white/10 p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">Product Stock</h2>
              <p className="text-sm text-gray-400">Color/size optional. Stock mandatory.</p>
            </div>

            <button type="button" onClick={addVariant} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-900">
              <Plus size={16} />
              Add Variant
            </button>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[650px]">
              <thead>
                <tr className="bg-[#0F172A] text-left text-sm">
                  <th className="p-3">Color</th>
                  <th className="p-3">Size</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Quantity</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((variant, index) => (
                  <tr key={index} className="border-b border-white/10">
                    <td className="p-3"><VariantInput value={variant.color} placeholder="Red / optional" onChange={(value) => handleVariantChange(index, "color", value)} /></td>
                    <td className="p-3"><VariantInput value={variant.size} placeholder="XL / optional" onChange={(value) => handleVariantChange(index, "size", value)} /></td>
                    <td className="p-3">
                      <VariantInput
                        value={variant.sku}
                        placeholder="Example: SAM-A15-BLK-M"
                        onChange={(value) =>
                          handleVariantChange(index, "sku", value)
                        }
                      />
                    </td>
                    <td className="p-3"><VariantInput type="number" value={variant.stock} placeholder="10" onChange={(value) => handleVariantChange(index, "stock", value)} /></td>
                    <td className="p-3"><button type="button" onClick={() => removeVariant(index)} className="rounded-lg bg-red-500 px-3 py-2 text-sm text-white">Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {variants.map((variant, index) => (
              <div key={index} className="rounded-xl bg-[#0F172A] p-3">
                <div className="grid gap-3">
                  <VariantInput value={variant.color} placeholder="Color optional" onChange={(value) => handleVariantChange(index, "color", value)} />
                  <VariantInput value={variant.size} placeholder="Size optional" onChange={(value) => handleVariantChange(index, "size", value)} />
                  <VariantInput value={variant.sku} placeholder="SKU" onChange={(value) => handleVariantChange(index, "sku", value)} />
                  <VariantInput type="number" value={variant.stock} placeholder="Stock" onChange={(value) => handleVariantChange(index, "stock", value)} />
                  <button type="button" onClick={() => removeVariant(index)} className="rounded-lg bg-red-500 px-3 py-2 text-sm text-white">Remove</button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <InfoCard title="Total Stock" value={totalStock} />
            <InfoCard title="Total Stock Rows" value={validVariants.length} />
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => router.push("/dashboard/products")} className="rounded-lg border border-white/10 px-6 py-3 font-semibold text-white hover:bg-white/10">Cancel</button>
          <button type="submit" disabled={submitting} className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-60">{submitting ? "Saving..." : isEdit ? "Update Product" : "Add Product"}</button>
        </div>
      </form>
    </div>
  );
}

function ReadOnlyInfo({ label, value }) {
  return <div><p className="text-xs uppercase tracking-wide text-gray-500">{label}</p><p className="mt-1 font-semibold text-white">{value}</p></div>;
}

function Input({ label, ...props }) {
  return <div><label className="mb-2 block text-sm font-medium text-gray-300">{label}</label><input {...props} className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-blue-500" /></div>;
}

function Textarea({ label, ...props }) {
  return <div><label className="mb-2 block text-sm font-medium text-gray-300">{label}</label><textarea {...props} rows={5} className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-blue-500" /></div>;
}

function Select({ label, options = [], defaultText = "Select", ...props }) {
  return <div><label className="mb-2 block text-sm font-medium text-gray-300">{label}</label><select {...props} className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-blue-500"><option value="">{defaultText}</option>{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>;
}

function CategorySelect({ label, value, onChange, options = [], disabled }) {
  return <div><label className="mb-2 block text-sm font-medium text-gray-300">{label}</label><select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"><option value="">No category</option>{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>;
}

function ImageInput({ title, multiple, oldImages = [], newImages = [], onChange, onRemoveOld, onRemoveNew }) {
  return <section><label className="mb-2 block text-sm font-medium text-gray-300">{title}</label><input type="file" accept="image/*" multiple={multiple} onChange={(e) => onChange(Array.from(e.target.files || []))} className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-white" />{(oldImages.length > 0 || newImages.length > 0) && <div className="mt-3 flex flex-wrap gap-3">{oldImages.map((img) => <div key={img.id} className="relative"><img src={img.url} alt="" className="h-20 w-20 rounded-lg bg-white object-contain" /><button type="button" onClick={() => onRemoveOld(img)} className="absolute -right-2 -top-2 rounded-full bg-red-500 px-2 py-1 text-xs text-white">×</button></div>)}{newImages.map((file, index) => <div key={`${file.name}-${index}`} className="relative"><img src={URL.createObjectURL(file)} alt="" className="h-20 w-20 rounded-lg bg-white object-contain" /><button type="button" onClick={() => onRemoveNew(index)} className="absolute -right-2 -top-2 rounded-full bg-red-500 px-2 py-1 text-xs text-white">×</button></div>)}</div>}</section>;
}

function VariantInput({ value, onChange, type = "text", placeholder }) {
  return <input type={type} value={value} placeholder={placeholder} min={type === "number" ? "0" : undefined} required={type === "number"} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#111827] px-3 py-2 text-white outline-none focus:border-blue-500" />;
}

function InfoCard({ title, value }) {
  return <div className="rounded-xl bg-[#0F172A] p-4"><p className="text-sm text-gray-400">{title}</p><h3 className="text-2xl font-bold">{value}</h3></div>;
}