"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Edit,
  ImageOff,
  Loader2,
  Package,
} from "lucide-react";

import api from "@/lib/axios";

function getStatusClasses(status) {
  switch (status) {
    case "APPROVED":
      return "border-green-500/30 bg-green-500/10 text-green-300";

    case "REJECTED":
      return "border-red-500/30 bg-red-500/10 text-red-300";

    case "PENDING":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";

    case "DRAFT":
      return "border-slate-500/30 bg-slate-500/10 text-slate-300";

    default:
      return "border-slate-500/30 bg-slate-500/10 text-slate-300";
  }
}

function Badge({ children, status }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
        status
      )}`}
    >
      {children}
    </span>
  );
}

function formatMoney(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return `৳${Number(value).toLocaleString("en-BD")}`;
}

function getErrorMessage(error, fallback = "Something went wrong") {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

export default function DashboardProductDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const id = Array.isArray(params?.id)
    ? params.id[0]
    : params?.id;

  const [product, setProduct] = useState(null);
  const [mainImage, setMainImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setErrorMessage("");

        const res = await api.get(`/products/manage/${id}`);

        const data =
          res?.data?.product ||
          res?.data?.data ||
          res?.data;

        if (!data?.id) {
          throw new Error("Product data was not found");
        }

        setProduct(data);

        const firstImage =
          data?.images?.find((image) => image?.isMain)?.url ||
          data?.images?.[0]?.url ||
          data?.mainImage ||
          "";

        setMainImage(firstImage);
      } catch (error) {
        console.error("Product details fetch error:", error);

        setProduct(null);
        setErrorMessage(
          getErrorMessage(
            error,
            "Product details could not be loaded"
          )
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const images = useMemo(() => {
    return Array.isArray(product?.images)
      ? product.images
      : [];
  }, [product]);

  const variants = useMemo(() => {
    return Array.isArray(product?.variants)
      ? product.variants
      : [];
  }, [product]);

  const skuList = useMemo(() => {
    return variants
      .map((variant) => variant?.sku)
      .filter(Boolean);
  }, [variants]);

  const primarySku =
    skuList[0] || product?.sku || "Not assigned";

  const categoryName =
    product?.category?.name ||
    product?.categoryName ||
    "Not assigned";

  const displayPrice =
    product?.salePrice !== null &&
    product?.salePrice !== undefined
      ? product.salePrice
      : product?.price;

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-white/10 bg-[#1E293B]">
        <div className="flex items-center gap-3 text-slate-300">
          <Loader2 className="animate-spin" size={22} />
          Loading product details...
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-8 text-center">
        <AlertTriangle
          size={34}
          className="mx-auto text-red-300"
        />

        <h2 className="mt-3 text-lg font-bold text-white">
          Product not found
        </h2>

        <p className="mt-2 text-sm text-red-200">
          {errorMessage ||
            "The requested product could not be found."}
        </p>

        <button
          type="button"
          onClick={() => router.back()}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
        >
          <ArrowLeft size={17} />
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-white">
              {product.name}
            </h1>

            <Badge status={product.status}>
              {product.status || "N/A"}
            </Badge>
          </div>

          <p className="mt-1 text-sm text-gray-400">
            Dashboard product details
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
          >
            <ArrowLeft size={17} />
            Back
          </button>

          <Link
            href={`/dashboard/products/${product.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            <Edit size={17} />
            Edit Product
          </Link>
        </div>
      </div>

      {product.status === "REJECTED" &&
        product.rejectionReason && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={20}
                className="mt-0.5 shrink-0 text-red-300"
              />

              <div>
                <p className="text-sm font-semibold text-red-200">
                  Product rejected
                </p>

                <p className="mt-1 text-sm leading-6 text-red-100">
                  {product.rejectionReason}
                </p>
              </div>
            </div>
          </div>
        )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-[#1E293B] p-5">
          <div className="relative h-[360px] w-full overflow-hidden rounded-xl bg-slate-800">
            {mainImage ? (
              <Image
                src={mainImage}
                alt={product.name || "Product image"}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain p-3"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center text-slate-500">
                  <ImageOff size={42} className="mx-auto" />
                  <p className="mt-2 text-sm">
                    No product image
                  </p>
                </div>
              </div>
            )}
          </div>

          {images.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {images.map((image) => {
                const isActive =
                  mainImage === image.url;

                return (
                  <button
                    type="button"
                    key={image.id || image.url}
                    onClick={() =>
                      setMainImage(image.url)
                    }
                    className={`relative h-20 w-20 overflow-hidden rounded-lg border bg-slate-800 transition ${
                      isActive
                        ? "border-orange-500 ring-2 ring-orange-500/30"
                        : "border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    <Image
                      src={image.url}
                      alt={product.name || "Product image"}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-[#1E293B] p-5">
          <div className="mb-5 flex items-center gap-2">
            <Package size={20} className="text-orange-400" />

            <h2 className="text-lg font-bold text-white">
              Product Info
            </h2>
          </div>

          <div className="space-y-3 text-sm">
            <Info label="Product ID" value={product.id} />
            <Info label="Slug" value={product.slug || "-"} />
            <Info label="Primary SKU" value={primarySku} />
            <Info label="Category" value={categoryName} />
            <Info
              label="Brand"
              value={product.brand?.name || "-"}
            />
            <Info
              label="Vendor"
              value={product.vendor?.shopName || "-"}
            />
            <Info
              label="Regular Price"
              value={formatMoney(product.price)}
            />
            <Info
              label="Sale Price"
              value={
                product.salePrice !== null &&
                product.salePrice !== undefined
                  ? formatMoney(product.salePrice)
                  : "Not set"
              }
            />
            <Info
              label="Selling Price"
              value={formatMoney(displayPrice)}
            />
            <Info
              label="Stock"
              value={product.stock ?? "-"}
            />
            <Info
              label="Sold"
              value={product.sold ?? 0}
            />
            <Info
              label="Delivery Charge"
              value={formatMoney(
                product.deliveryCharge
              )}
            />
            <Info
              label="Outside District Extra"
              value={formatMoney(
                product.outsideDistrictExtraCharge
              )}
            />
            <Info
              label="Commission"
              value={
                product.commissionType &&
                product.commissionValue !== null &&
                product.commissionValue !== undefined
                  ? product.commissionType ===
                    "PERCENTAGE"
                    ? `${product.commissionValue}%`
                    : formatMoney(
                        product.commissionValue
                      )
                  : "Default"
              }
            />
            <Info
              label="Created"
              value={
                product.createdAt
                  ? new Date(
                      product.createdAt
                    ).toLocaleString("en-BD")
                  : "-"
              }
            />
            <Info
              label="Updated"
              value={
                product.updatedAt
                  ? new Date(
                      product.updatedAt
                    ).toLocaleString("en-BD")
                  : "-"
              }
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#1E293B] p-5">
        <h2 className="mb-3 text-lg font-bold text-white">
          Description
        </h2>

        <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
          {product.description ||
            "No description available."}
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#1E293B] p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-white">
            Variants
          </h2>

          <p className="text-xs text-slate-400">
            Total variants: {variants.length}
          </p>
        </div>

        {variants.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-700 p-8 text-center">
            <Package
              size={32}
              className="mx-auto text-slate-500"
            />

            <p className="mt-2 text-sm text-gray-400">
              No variants found.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-gray-400">
                  <th className="px-3 pb-3">SKU</th>
                  <th className="px-3 pb-3">Color</th>
                  <th className="px-3 pb-3">Size</th>
                  <th className="px-3 pb-3">Stock</th>
                  <th className="px-3 pb-3">
                    Variant Price
                  </th>
                  <th className="px-3 pb-3">
                    Effective Price
                  </th>
                </tr>
              </thead>

              <tbody>
                {variants.map((variant, index) => {
                  const effectiveVariantPrice =
                    variant.price !== null &&
                    variant.price !== undefined
                      ? variant.price
                      : displayPrice;

                  return (
                    <tr
                      key={
                        variant.id ||
                        `${variant.sku}-${index}`
                      }
                      className="border-b border-slate-800 last:border-b-0"
                    >
                      <td className="px-3 py-4">
                        <span
                          className={
                            variant.sku
                              ? "font-mono text-orange-300"
                              : "text-slate-500"
                          }
                        >
                          {variant.sku ||
                            "Not assigned"}
                        </span>
                      </td>

                      <td className="px-3 py-4 text-gray-300">
                        {variant.color || "-"}
                      </td>

                      <td className="px-3 py-4 text-gray-300">
                        {variant.size || "-"}
                      </td>

                      <td className="px-3 py-4 text-gray-300">
                        {variant.stock ?? 0}
                      </td>

                      <td className="px-3 py-4 text-gray-300">
                        {variant.price !== null &&
                        variant.price !== undefined
                          ? formatMoney(variant.price)
                          : "Base price"}
                      </td>

                      <td className="px-3 py-4 font-medium text-white">
                        {formatMoney(
                          effectiveVariantPrice
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {skuList.length > 1 && (
        <div className="rounded-xl border border-white/10 bg-[#1E293B] p-5">
          <h2 className="mb-3 text-lg font-bold text-white">
            All SKUs
          </h2>

          <div className="flex flex-wrap gap-2">
            {skuList.map((sku, index) => (
              <span
                key={`${sku}-${index}`}
                className="rounded-lg border border-orange-500/20 bg-orange-500/10 px-3 py-2 font-mono text-xs text-orange-300"
              >
                {sku}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) {
  const displayValue =
    value === null ||
    value === undefined ||
    value === ""
      ? "-"
      : value;

  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-700 pb-3 last:border-b-0">
      <span className="shrink-0 text-gray-400">
        {label}
      </span>

      <span className="max-w-[65%] break-words text-right font-medium text-white">
        {displayValue}
      </span>
    </div>
  );
}