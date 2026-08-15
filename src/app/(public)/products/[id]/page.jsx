import Link from "next/link";
import { notFound } from "next/navigation";
import { Truck, ShieldCheck, Store, Heart } from "lucide-react";
import { getPublicProductBySlug } from "@/services/publicProductService";
import ProductActions from "@/components/public/product/ProductActions";
import ProductImageGallery from "@/components/public/product/ProductImageGallery";

export default async function ProductDetailsPage({ params }) {
  const { id } = await params;
  const res = await getPublicProductBySlug(id);

  const product = res?.product || res?.data?.product || res?.data || null;
  if (!product) return notFound();

  const price =
    product?.salePrice || product?.offerPrice || product?.finalPrice || product?.price || 0;

  const oldPrice = product?.salePrice || product?.offerPrice ? product?.price : null;
  const stock = product?.stock ?? 0;
  const isInStock = stock > 0;

  const colors = [
    ...new Set(product?.variants?.map((v) => v.color).filter(Boolean)),
  ];

  const sizes = [
    ...new Set(product?.variants?.map((v) => v.size).filter(Boolean)),
  ];

  return (
    <section className="mx-auto max-w-6xl px-3 py-4 sm:py-6">
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr_320px]">
        <div>
          <ProductImageGallery product={product} />
        </div>

        <div className="rounded-md border bg-white p-4">
          <p className="text-xs text-gray-500">
            Home / Shop / {product?.category?.name || "Product"}
          </p>

          <h1 className="mt-3 text-xl font-bold text-gray-900 sm:text-2xl">
            {product?.name}
          </h1>

          <div className="mt-3 flex items-center gap-3">
            <span className="text-3xl font-bold text-orange-600">৳{price}</span>
            {oldPrice && (
              <span className="text-base text-gray-400 line-through">৳{oldPrice}</span>
            )}
          </div>

          {oldPrice && (
            <p className="mt-1 text-sm font-semibold text-green-600">
              You Save: ৳{Number(oldPrice) - Number(price)}
            </p>
          )}

          <div className="mt-4 space-y-2 text-sm text-gray-700">
            <p><b>Delivery:</b> ৳{product?.deliveryCharge || 0}</p>
            <p><b>Category:</b> {product?.category?.name || "N/A"}</p>
            <p><b>Total Stock:</b> {stock}</p>
            <p><b>Brand:</b> {product?.brand?.name || "No Brand"}</p>

            {colors.length > 0 && <p><b>Color:</b> {colors.join(", ")}</p>}
            {sizes.length > 0 && <p><b>Size:</b> {sizes.join(", ")}</p>}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 border-t pt-4 text-xs text-gray-600">
            <div className="flex items-center gap-1"><Truck size={15} /> COD</div>
            <div className="flex items-center gap-1"><ShieldCheck size={15} /> Easy Return</div>
            <div className="flex items-center gap-1"><Store size={15} /> Secure</div>
          </div>
        </div>

        <div className="rounded-md border bg-white p-4">
          <p className="text-sm">
            Status:{" "}
            <span className={isInStock ? "font-bold text-green-600" : "font-bold text-red-600"}>
              {isInStock ? "In Stock" : "Out of Stock"}
            </span>
          </p>

          <p className="mt-2 text-xs text-gray-500">SKU: {product?.id?.slice(0, 8)}</p>

          <div className="mt-4">
            <ProductActions product={product} />
          </div>

          <div className="mt-4 rounded-md border p-3 text-xs text-gray-600">
            <p className="font-semibold text-gray-800">Delivery Information</p>
            <p className="mt-1">Delivery fee calculated at checkout.</p>
            <p>Cash on Delivery available.</p>
          </div>

          <button className="mt-4 flex items-center gap-2 text-sm text-gray-700 hover:text-orange-600">
            <Heart size={16} /> Add to Wishlist
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-md border bg-white p-4">
          <h2 className="border-b pb-2 text-base font-bold text-orange-600">
            Description
          </h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-700">
            {product?.description || "No description available."}
          </p>
        </div>

        <div className="rounded-md border bg-white p-4">
          <h2 className="border-b pb-2 text-base font-bold">Specifications</h2>

          <div className="mt-3 divide-y text-sm">
            <Spec label="Category" value={product?.category?.name || "N/A"} />
            <Spec label="Total Stock" value={stock} />
            <Spec label="Colors" value={colors.join(", ") || "N/A"} />
            <Spec label="Sizes" value={sizes.join(", ") || "N/A"} />
            <Spec label="Delivery" value={`৳${product?.deliveryCharge || 0}`} />
            <Spec label="Vendor" value={product?.vendor?.shopName || "FriendBazar"} />
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-md border bg-white p-4">
        <h2 className="mb-3 text-base font-bold">Customer Reviews</h2>

        {product?.reviews?.length > 0 ? (
          <div className="space-y-3">
            {product.reviews.map((review) => (
              <div key={review.id} className="rounded-lg border p-3">
                <p className="font-semibold">Rating: {review.rating || 0}/5</p>
                <p className="mt-1 text-sm text-gray-600">{review.comment}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No reviews yet. Be the first to review this product.
          </p>
        )}

        <Link
          href="/products"
          className="mt-4 inline-block rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Continue Shopping
        </Link>
      </div>
    </section>
  );
}

function Spec({ label, value }) {
  return (
    <div className="flex justify-between gap-3 py-2">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-800">{value}</span>
    </div>
  );
}