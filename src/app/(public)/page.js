import HeroSection from "@/components/public/home/HeroSection";
import HomeCatalog from "@/components/public/home/HomeCatalog";
import { getPublicProducts } from "@/services/publicProductService";

export default async function HomePage() {
  let products = [];
  try {
    const productResponse = await getPublicProducts();
    products = productResponse?.products || productResponse?.data?.products || [];
  } catch {
    // The storefront still renders its structure while the API is unavailable.
  }

  return (
    <>
      <HeroSection />
      <HomeCatalog products={products} />
    </>
  );
}
