import ProductCard from "@/components/public/product/ProductCard";
import { getFeaturedProducts } from "@/services/publicProductService";

export default async function FeaturedProducts() {
  let products = [];

  try {
    const res = await getFeaturedProducts();
    products =
      res?.data?.products ||
      res?.data ||
      res?.products ||
      [];
  } catch {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-3 py-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Featured Products</h2>
        <button className="text-sm font-medium text-orange-600">View All</button>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-gray-500">No products found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
          {products.map((product) => (
            <ProductCard
              key={product.id || product._id}
              product={product}
            />
          ))}
        </div>
      )}
    </section>
  );
}
