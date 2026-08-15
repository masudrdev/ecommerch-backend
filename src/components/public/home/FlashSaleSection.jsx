import ProductCard from "@/components/public/product/ProductCard";
import { getPublicProducts } from "@/services/publicProductService";

export default async function FlashSaleSection() {
  let products = [];

  try {
    const res = await getPublicProducts();
    products = res?.products || res?.data?.products || [];
  } catch {
    return null;
  }

  const offerProducts = products.filter(
    (product) => product?.salePrice || product?.offerPrice
  );

  return (
    <section className="mx-auto max-w-7xl px-3 py-5">
      <div className="mb-4 rounded-xl bg-orange-600 px-4 py-3 text-white">
        <h2 className="text-xl font-bold">Flash Sale</h2>
        <p className="text-sm text-orange-100">Limited time hot deals</p>
      </div>

      {offerProducts.length === 0 ? (
        <p className="text-sm text-gray-500">No offer products found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
          {offerProducts.map((product) => (
            <ProductCard key={product.id || product._id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
