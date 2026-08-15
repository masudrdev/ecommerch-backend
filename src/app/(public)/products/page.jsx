import ProductCard from "@/components/public/product/ProductCard";
import { getPublicProducts } from "@/services/publicProductService";

export default async function ProductsPage({ searchParams }) {
  const filters = await searchParams;
  const res = await getPublicProducts({
    search: filters?.search || undefined,
    category: filters?.category || undefined,
  });
  
  const products = res?.products || res?.data?.products || [];

  return (
    <section className="mx-auto max-w-7xl px-3 py-5">
      <div className="mb-5">
        <h1 className="text-2xl font-bold">All Products</h1>
        <p className="text-sm text-gray-500">
          {filters?.search ? `Search results for “${filters.search}”` : "Browse all available products"}
        </p>
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
