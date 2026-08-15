import PublicHeader from "@/components/public/layout/PublicHeader";
import PublicFooter from "@/components/public/layout/PublicFooter";
import CartLoader from "@/components/public/cart/CartLoader";
import { getPublicCategories } from "@/services/publicCategoryService";

export default async function PublicLayout({ children }) {
  let categories = [];
  try {
    const response = await getPublicCategories();
    categories = response?.categories || [];
  } catch {
    // Header remains usable with the All Categories option.
  }
  return (
    <div className="min-h-screen bg-slate-50">
       <CartLoader />
      <PublicHeader categories={categories} />
      <main>{children}</main>
      <PublicFooter />
    </div>
  );
}
