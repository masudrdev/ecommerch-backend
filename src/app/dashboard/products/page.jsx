

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

import { productService } from "@/services/product.service";
import { vendorService } from "@/services/vendor.service";

const EMPTY_REVIEW_FORM = {
  categoryId: "",
  commissionType: "",
  commissionValue: "",
  rejectionReason: "",
};

function money(value) {
  return `৳${Number(value || 0).toLocaleString("en-BD")}`;
}

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

function getErrorMessage(error, fallback = "Something went wrong") {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function getStatusClasses(status) {
  switch (status) {
    case "APPROVED":
      return "border-green-500/30 bg-green-500/10 text-green-300";

    case "REJECTED":
      return "border-red-500/30 bg-red-500/10 text-red-300";

    case "PENDING":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";

    default:
      return "border-slate-500/30 bg-slate-500/10 text-slate-300";
  }
}

function flattenCategories(categories = [], level = 0, parentNames = []) {
  return categories.flatMap((category) => {
    const pathNames = [...parentNames, category.name];

    const currentCategory = {
      id: category.id,
      name: category.name,
      level,
      path: pathNames.join(" → "),
      label: `${"— ".repeat(level)}${category.name}`,
    };

    const children = flattenCategories(
      category.children || [],
      level + 1,
      pathNames
    );

    return [currentCategory, ...children];
  });
}

function getCategoryPath(flatCategories, categoryId) {
  if (!categoryId) return null;

  const category = flatCategories.find(
    (item) => item.id === categoryId
  );

  return category?.path || null;
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [role, setRole] = useState("");

  const [selectedIds, setSelectedIds] = useState([]);
  const [reviewMode, setReviewMode] = useState(null);
  const [reviewAction, setReviewAction] = useState("APPROVED");
  const [activeProduct, setActiveProduct] = useState(null);
  const [reasonProduct, setReasonProduct] = useState(null);
  const [reviewForm, setReviewForm] = useState(EMPTY_REVIEW_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({
    type: "",
    message: "",
  });

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  const isAdmin =
    role === "ADMIN" || role === "SUPER_ADMIN";

  const flatCategories = useMemo(() => {
    return flattenCategories(categories);
  }, [categories]);

  const selectedProducts = useMemo(() => {
    return products.filter((product) =>
      selectedIds.includes(product.id)
    );
  }, [products, selectedIds]);

  const pendingProductsOnPage = useMemo(() => {
    return products.filter(
      (product) => product.status === "PENDING"
    );
  }, [products]);

  const allPendingSelected =
    pendingProductsOnPage.length > 0 &&
    pendingProductsOnPage.every((product) =>
      selectedIds.includes(product.id)
    );

  const selectedMissingCategories = useMemo(() => {
    return selectedProducts.filter(
      (product) => !product.categoryId && !product.category?.id
    );
  }, [selectedProducts]);

  const fetchProducts = useCallback(async () => {
    if (!role) return;

    try {
      setLoading(true);
      setFeedback({ type: "", message: "" });

      let response;

      if (isAdmin) {
        response = await productService.getAdminProducts({
          search: search.trim(),
          categoryId,
          vendorId,
          status,
          sort,
          page,
          limit: 20,
        });

        setPagination(
          response?.pagination || {
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 1,
          }
        );
      } else {
        response = await productService.getVendorProducts();
      }

      setProducts(response?.products || []);
      setSelectedIds([]);
    } catch (error) {
      console.error("Fetch Products Error:", error);

      setProducts([]);
      setFeedback({
        type: "error",
        message: getErrorMessage(
          error,
          "Products could not be loaded"
        ),
      });
    } finally {
      setLoading(false);
    }
  }, [
    role,
    isAdmin,
    search,
    categoryId,
    vendorId,
    status,
    sort,
    page,
  ]);

  const fetchFilters = useCallback(async () => {
    if (!isAdmin) return;

    try {
      setFilterLoading(true);

      const [categoryResponse, vendorResponse] =
        await Promise.all([
          productService.getCategories(),
          vendorService.getAllVendors(),
        ]);

      setCategories(
        categoryResponse?.categories ||
        categoryResponse?.data ||
        []
      );

      setVendors(vendorResponse?.vendors || []);
    } catch (error) {
      console.error("Fetch Filters Error:", error);
    } finally {
      setFilterLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    setRole(getUserRole());
  }, []);

  useEffect(() => {
    if (!role) return;

    fetchFilters();
  }, [role, fetchFilters]);

  useEffect(() => {
    if (!role) return;

    fetchProducts();
  }, [
    role,
    categoryId,
    vendorId,
    status,
    sort,
    page,
    fetchProducts,
  ]);

  const handleSearch = () => {
    if (page !== 1) {
      setPage(1);
      return;
    }

    fetchProducts();
  };

  const handleFilterChange = (setter, value) => {
    setter(value);
    setPage(1);
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) return;

    try {
      await productService.deleteProduct(id);

      setFeedback({
        type: "success",
        message: "Product deleted successfully",
      });

      fetchProducts();
    } catch (error) {
      setFeedback({
        type: "error",
        message: getErrorMessage(
          error,
          "Product delete failed"
        ),
      });
    }
  };

  const toggleProductSelection = (product) => {
    if (product.status !== "PENDING") return;

    setSelectedIds((currentIds) => {
      if (currentIds.includes(product.id)) {
        return currentIds.filter((id) => id !== product.id);
      }

      return [...currentIds, product.id];
    });
  };

  const toggleSelectAll = () => {
    const pendingIds = pendingProductsOnPage.map(
      (product) => product.id
    );

    if (allPendingSelected) {
      setSelectedIds((currentIds) =>
        currentIds.filter((id) => !pendingIds.includes(id))
      );

      return;
    }

    setSelectedIds((currentIds) => [
      ...new Set([...currentIds, ...pendingIds]),
    ]);
  };

  const openSingleReview = (product, action) => {
    setReviewMode("single");
    setReviewAction(action);
    setActiveProduct(product);

    setReviewForm({
      categoryId:
        product.categoryId || product.category?.id || "",
      commissionType: product.commissionType || "",
      commissionValue:
        product.commissionValue !== null &&
          product.commissionValue !== undefined
          ? String(product.commissionValue)
          : "",
      rejectionReason: "",
    });

    setFeedback({ type: "", message: "" });
  };

  const openBulkReview = (action) => {
    if (selectedProducts.length === 0) {
      setFeedback({
        type: "error",
        message: "Select at least one pending product",
      });

      return;
    }

    if (
      action === "APPROVED" &&
      selectedMissingCategories.length > 0
    ) {
      setFeedback({
        type: "error",
        message: `${selectedMissingCategories.length} selected product(s) have no category. Assign category using Single Review first.`,
      });

      return;
    }

    setReviewMode("bulk");
    setReviewAction(action);
    setActiveProduct(null);
    setReviewForm(EMPTY_REVIEW_FORM);
    setFeedback({ type: "", message: "" });
  };

  const closeReviewModal = () => {
    if (submitting) return;

    setReviewMode(null);
    setActiveProduct(null);
    setReviewAction("APPROVED");
    setReviewForm(EMPTY_REVIEW_FORM);
  };

  const validateReviewForm = () => {
    if (
      reviewMode === "single" &&
      reviewAction === "APPROVED" &&
      !reviewForm.categoryId
    ) {
      return "Select a category before approval";
    }

    if (
      reviewAction === "REJECTED" &&
      !reviewForm.rejectionReason.trim()
    ) {
      return "Rejection reason is required";
    }

    const hasCommissionType = Boolean(
      reviewForm.commissionType
    );

    const hasCommissionValue =
      reviewForm.commissionValue !== "";

    if (hasCommissionType !== hasCommissionValue) {
      return "Commission type and value must be provided together";
    }

    if (hasCommissionValue) {
      const numericValue = Number(
        reviewForm.commissionValue
      );

      if (
        !Number.isFinite(numericValue) ||
        numericValue < 0
      ) {
        return "Enter a valid commission value";
      }

      if (
        reviewForm.commissionType === "PERCENTAGE" &&
        numericValue > 100
      ) {
        return "Percentage commission cannot exceed 100";
      }
    }

    return "";
  };

  const buildCommissionPayload = () => {
    if (
      !reviewForm.commissionType ||
      reviewForm.commissionValue === ""
    ) {
      return {};
    }

    return {
      commissionType: reviewForm.commissionType,
      commissionValue: Number(
        reviewForm.commissionValue
      ),
    };
  };

  const submitReview = async () => {
    const validationMessage = validateReviewForm();

    if (validationMessage) {
      setFeedback({
        type: "error",
        message: validationMessage,
      });

      return;
    }

    try {
      setSubmitting(true);
      setFeedback({ type: "", message: "" });

      const commissionPayload = buildCommissionPayload();

      if (reviewMode === "single") {
        const payload = {
          status: reviewAction,
          ...commissionPayload,
        };

        if (reviewAction === "APPROVED") {
          payload.categoryId = reviewForm.categoryId;
        }

        if (reviewAction === "REJECTED") {
          payload.rejectionReason =
            reviewForm.rejectionReason.trim();
        }

        await productService.reviewProduct(
          activeProduct.id,
          payload
        );
      }

      if (reviewMode === "bulk") {
        const payload = {
          products: selectedProducts.map((product) => ({
            productId: product.id,
            categoryId:
              product.categoryId ||
              product.category?.id ||
              undefined,
          })),
          status: reviewAction,
          ...commissionPayload,
        };

        if (reviewAction === "REJECTED") {
          payload.rejectionReason =
            reviewForm.rejectionReason.trim();
        }

        await productService.bulkReviewProducts(payload);
      }

      setFeedback({
        type: "success",
        message:
          reviewAction === "APPROVED"
            ? `${reviewMode === "bulk"
              ? selectedProducts.length
              : 1
            } product(s) approved successfully`
            : `${reviewMode === "bulk"
              ? selectedProducts.length
              : 1
            } product(s) rejected successfully`,
      });

      closeReviewModal();
      setSelectedIds([]);
      await fetchProducts();
    } catch (error) {
      setFeedback({
        type: "error",
        message: getErrorMessage(
          error,
          "Product review failed"
        ),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Products
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            {isAdmin
              ? "Review and manage all marketplace products."
              : "Manage your shop products."}
          </p>
        </div>

        {!isAdmin && (
          <Link
            href="/dashboard/products/add"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus size={18} />
            Add Product
          </Link>
        )}
      </div>

      {feedback.message && (
        <div
          className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${feedback.type === "success"
            ? "border-green-500/30 bg-green-500/10 text-green-200"
            : "border-red-500/30 bg-red-500/10 text-red-200"
            }`}
        >
          <span>{feedback.message}</span>

          <button
            type="button"
            onClick={() =>
              setFeedback({ type: "", message: "" })
            }
            aria-label="Close message"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {isAdmin && (
        <div className="space-y-4 rounded-xl border border-white/10 bg-[#111827] p-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <div className="flex sm:col-span-2">
              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSearch();
                  }
                }}
                placeholder="Search by product name..."
                className="min-w-0 flex-1 rounded-l-lg border border-white/10 bg-[#0F172A] px-4 py-2 text-sm text-white outline-none focus:border-blue-500"
              />

              <button
                type="button"
                onClick={handleSearch}
                className="inline-flex items-center justify-center rounded-r-lg bg-blue-600 px-4 text-white hover:bg-blue-700"
                aria-label="Search products"
              >
                <Search size={18} />
              </button>
            </div>

            <select
              value={categoryId}
              disabled={filterLoading}
              onChange={(event) =>
                handleFilterChange(
                  setCategoryId,
                  event.target.value
                )
              }
              className="rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none"
            >
              <option value="">All Categories</option>

              {flatCategories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.label}
                </option>
              ))}
            </select>

            <select
              value={vendorId}
              disabled={filterLoading}
              onChange={(event) =>
                handleFilterChange(
                  setVendorId,
                  event.target.value
                )
              }
              className="rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none"
            >
              <option value="">All Vendors</option>

              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.shopName}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(event) =>
                handleFilterChange(
                  setStatus,
                  event.target.value
                )
              }
              className="rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <select
              value={sort}
              onChange={(event) =>
                handleFilterChange(
                  setSort,
                  event.target.value
                )
              }
              className="rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="price_asc">
                Price Low → High
              </option>
              <option value="price_desc">
                Price High → Low
              </option>
              <option value="stock_asc">
                Stock Low → High
              </option>
              <option value="stock_desc">
                Stock High → Low
              </option>
            </select>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex flex-col justify-between gap-3 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold text-blue-200">
                  {selectedIds.length} pending product(s)
                  selected
                </p>

                {selectedMissingCategories.length > 0 && (
                  <p className="mt-1 text-xs text-amber-300">
                    {
                      selectedMissingCategories.length
                    }{" "}
                    product(s) are missing categories.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    openBulkReview("APPROVED")
                  }
                  disabled={
                    selectedMissingCategories.length > 0
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CheckCircle2 size={16} />
                  Bulk Approve
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openBulkReview("REJECTED")
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white"
                >
                  <XCircle size={16} />
                  Bulk Reject
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="rounded-lg bg-slate-600 px-3 py-2 text-xs font-semibold text-white"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111827]">
        {loading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-16 animate-pulse rounded-lg bg-white/5"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No products found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full">
              <thead className="bg-white/5">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  {isAdmin && (
                    <th className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={allPendingSelected}
                        onChange={toggleSelectAll}
                        disabled={
                          pendingProductsOnPage.length === 0
                        }
                        className="h-4 w-4 rounded"
                      />
                    </th>
                  )}

                  <th className="px-4 py-4">Product</th>
                  <th className="px-4 py-4">Category</th>
                  <th className="px-4 py-4">Vendor</th>
                  <th className="px-4 py-4">Price</th>
                  <th className="px-4 py-4">Stock</th>
                  <th className="px-4 py-4">Commission</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {products.map((product) => {
                  const productCategoryId =
                    product.categoryId ||
                    product.category?.id;

                  const hasCategory =
                    Boolean(productCategoryId);

                  const productCategoryPath = getCategoryPath(
                    flatCategories,
                    productCategoryId
                  );

                  const isPending =
                    product.status === "PENDING";

                  return (
                    <tr
                      key={product.id}
                      className="text-sm text-slate-300 hover:bg-white/[0.025]"
                    >
                      {isAdmin && (
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(
                              product.id
                            )}
                            disabled={!isPending}
                            onChange={() =>
                              toggleProductSelection(
                                product
                              )
                            }
                            className="h-4 w-4 rounded disabled:cursor-not-allowed disabled:opacity-30"
                          />
                        </td>
                      )}

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              product.images?.find(
                                (image) => image.isMain
                              )?.url ||
                              product.images?.[0]?.url ||
                              "/placeholder-product.png"
                            }
                            alt={product.name}
                            className="h-12 w-12 rounded-lg border border-white/10 object-cover"
                          />

                          <div>
                            <p className="max-w-[220px] truncate font-semibold text-white">
                              {product.name}
                            </p>

                            <p className="mt-1 max-w-[220px] truncate text-xs text-slate-500">
                              {product.slug}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        {hasCategory ? (
                          <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs text-blue-200">
                            {productCategoryPath ||
                              product.category?.name ||
                              "Assigned"}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-300">
                            <AlertTriangle size={15} />
                            Category Missing
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {product.vendor?.shopName || "-"}
                      </td>

                      <td className="px-4 py-4 font-medium text-white">
                        {money(
                          product.salePrice ||
                          product.price
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {product.stock || 0}
                      </td>

                      <td className="px-4 py-4">
                        {product.commissionType &&
                          product.commissionValue !== null &&
                          product.commissionValue !==
                          undefined ? (
                          <span className="text-xs">
                            {product.commissionType ===
                              "PERCENTAGE"
                              ? `${product.commissionValue}%`
                              : money(
                                product.commissionValue
                              )}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">
                            Default
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                            product.status
                          )}`}
                        >
                          {product.status}
                        </span>


                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/dashboard/products/${product.id}`}
                            className="rounded-lg bg-slate-600 p-2 text-white hover:bg-slate-500"
                            title="View"
                          >
                            <Eye size={16} />
                          </Link>
                          {isAdmin && (
  <Link
    href={`/dashboard/products/${product.id}/edit`}
    className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700"
    title="Edit category and commission"
  >
    <Edit size={16} />
  </Link>
)}

                          {!isAdmin && (
                            <>
                              <Link
                                href={`/dashboard/products/${product.id}/edit`}
                                className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </Link>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(product.id)
                                }
                                className="rounded-lg bg-red-600 p-2 text-white hover:bg-red-700"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>

                            </>
                          )}
                          {product.status === "REJECTED" &&
                            product.rejectionReason && (
                              <button
                                type="button"
                                onClick={() => setReasonProduct(product)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"
                                title="View rejection reason"
                              >
                                <AlertTriangle size={15} />
                                Reason
                              </button>
                            )}

                          {isAdmin && isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  openSingleReview(
                                    product,
                                    "APPROVED"
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
                              >
                                <CheckCircle2 size={15} />
                                Review
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openSingleReview(
                                    product,
                                    "REJECTED"
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                              >
                                <XCircle size={15} />
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {isAdmin &&
          !loading &&
          pagination.totalPages > 1 && (
            <div className="flex flex-col justify-between gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center">
              <p className="text-sm text-slate-400">
                Page {pagination.page} of{" "}
                {pagination.totalPages} — Total{" "}
                {pagination.total} products
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage((currentPage) =>
                      Math.max(currentPage - 1, 1)
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-600 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={17} />
                  Prev
                </button>

                <span className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white">
                  {page}
                </span>

                <button
                  type="button"
                  disabled={
                    page >= pagination.totalPages
                  }
                  onClick={() =>
                    setPage((currentPage) =>
                      Math.min(
                        currentPage + 1,
                        pagination.totalPages
                      )
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-600 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          )}
      </div>

      {reviewMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#111827] shadow-2xl">
            <div className="flex items-start justify-between border-b border-white/10 p-5">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {reviewAction === "APPROVED"
                    ? "Approve Products"
                    : "Reject Products"}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {reviewMode === "bulk"
                    ? `${selectedProducts.length} selected products`
                    : activeProduct?.name}
                </p>
              </div>

              <button
                type="button"
                onClick={closeReviewModal}
                disabled={submitting}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              {reviewMode === "single" &&
                reviewAction === "APPROVED" && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">
                      Category
                    </label>

                    <select
                      value={reviewForm.categoryId}
                      onChange={(event) =>
                        setReviewForm((current) => ({
                          ...current,
                          categoryId:
                            event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-3 py-3 text-sm text-white outline-none focus:border-blue-500"
                    >
                      <option value="">
                        Select category
                      </option>

                      {flatCategories.map((category) => (
                        <option
                          key={category.id}
                          value={category.id}
                        >
                          {category.label}
                        </option>
                      ))}
                    </select>

                    {!activeProduct?.categoryId &&
                      !activeProduct?.category?.id && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-300">
                          <AlertTriangle size={14} />
                          This product currently has no
                          category.
                        </p>
                      )}
                  </div>
                )}

              {reviewAction === "APPROVED" && (
                <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                  <p className="text-sm font-semibold text-white">
                    Product commission
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Leave both fields empty to use vendor or
                    platform default commission.
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <select
                      value={
                        reviewForm.commissionType
                      }
                      onChange={(event) =>
                        setReviewForm((current) => ({
                          ...current,
                          commissionType:
                            event.target.value,
                          commissionValue:
                            event.target.value
                              ? current.commissionValue
                              : "",
                        }))
                      }
                      className="rounded-lg border border-white/10 bg-[#0F172A] px-3 py-3 text-sm text-white outline-none"
                    >
                      <option value="">
                        Use default
                      </option>
                      <option value="PERCENTAGE">
                        Percentage
                      </option>
                      <option value="FIXED">
                        Fixed amount
                      </option>
                    </select>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={
                        !reviewForm.commissionType
                      }
                      value={
                        reviewForm.commissionValue
                      }
                      onChange={(event) =>
                        setReviewForm((current) => ({
                          ...current,
                          commissionValue:
                            event.target.value,
                        }))
                      }
                      placeholder={
                        reviewForm.commissionType ===
                          "FIXED"
                          ? "Example: 50"
                          : "Example: 10"
                      }
                      className="rounded-lg border border-white/10 bg-[#0F172A] px-3 py-3 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-40"
                    />
                  </div>
                </div>
              )}

              {reviewAction === "REJECTED" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Rejection reason
                  </label>

                  <textarea
                    rows={5}
                    value={
                      reviewForm.rejectionReason
                    }
                    onChange={(event) =>
                      setReviewForm((current) => ({
                        ...current,
                        rejectionReason:
                          event.target.value,
                      }))
                    }
                    placeholder="Explain what the vendor needs to improve..."
                    className="w-full resize-none rounded-lg border border-white/10 bg-[#0F172A] px-3 py-3 text-sm text-white outline-none focus:border-red-500"
                  />
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeReviewModal}
                  disabled={submitting}
                  className="rounded-lg bg-slate-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={submitReview}
                  disabled={submitting}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${reviewAction === "APPROVED"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                    }`}
                >
                  {submitting ? (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  ) : reviewAction === "APPROVED" ? (
                    <CheckCircle2 size={17} />
                  ) : (
                    <XCircle size={17} />
                  )}

                  {submitting
                    ? "Processing..."
                    : reviewAction === "APPROVED"
                      ? "Confirm Approval"
                      : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {reasonProduct && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setReasonProduct(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#111827] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-500/10 p-2 text-red-400">
                  <AlertTriangle size={20} />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-white">
                    Rejection Reason
                  </h2>

                  <p className="text-sm text-slate-400">
                    {reasonProduct.name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setReasonProduct(null)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5">
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-red-100">
                  {reasonProduct.rejectionReason}
                </p>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setReasonProduct(null)}
                  className="rounded-lg bg-slate-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}