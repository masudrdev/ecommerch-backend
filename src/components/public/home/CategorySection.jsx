import Link from "next/link";
import { getPublicCategories } from "@/services/publicCategoryService";

export default async function CategorySection() {
  let categories = [];

  try {
    const res = await getPublicCategories();
    categories = res?.categories || [];
  } catch {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-3 py-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Shop by Category</h2>
        <Link href="/categories" className="text-sm font-medium text-orange-600">
          View All
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            className="rounded-xl border bg-white p-3 text-center shadow-sm transition hover:shadow-md"
          >
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-lg font-bold text-orange-600">
              {category.name?.charAt(0)}
            </div>

            <p className="line-clamp-1 text-xs font-medium md:text-sm">
              {category.name}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
