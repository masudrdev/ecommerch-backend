"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Heart, ShoppingCart } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { addToCartApi, getCartApi } from "@/services/cartService";
import { setCart } from "@/redux/features/cart/cartSlice";
import { addToWishlistApi } from "@/services/wishlist.service";

export default function ProductActions({ product }) {
  const router = useRouter();
  const dispatch = useDispatch();

  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);

  const colors = useMemo(() => {
    const directColors = product?.colors || [];
    const variantColors =
      product?.variants?.map((item) => item?.color).filter(Boolean) || [];

    return [...new Set([...directColors, ...variantColors])];
  }, [product]);

  const sizes = useMemo(() => {
    const directSizes = product?.sizes || [];
    const variantSizes =
      product?.variants?.map((item) => item?.size).filter(Boolean) || [];

    return [...new Set([...directSizes, ...variantSizes])];
  }, [product]);

  const [selectedColor, setSelectedColor] = useState(colors[0] || "");
  const [selectedSize, setSelectedSize] = useState(sizes[0] || "");
  const [quantity, setQuantity] = useState(1);
  const [cartLoading, setCartLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const productId = product?.id || product?._id;
  const isInStock = (product?.stock ?? 0) > 0;

  const requireLogin = () => {
    if (!user && !token) {
      toast.error("Please login first");
      router.push("/auth/login");
      return false;
    }

    return true;
  };

  const syncCart = async () => {
    const cartResponse = await getCartApi();
    dispatch(setCart(cartResponse?.cart?.items || []));
  };

  const addProductToCart = async () => {
    if (!productId) {
      toast.error("Product not found");
      return false;
    }

    await addToCartApi({
      productId,
      quantity,
      color: selectedColor || null,
      size: selectedSize || null,
    });

    await syncCart();
    return true;
  };

  const handleAddToCart = async () => {
    if (!requireLogin()) return;

    try {
      setCartLoading(true);
      await addProductToCart();
      toast.success("Product added to cart");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to add cart");
    } finally {
      setCartLoading(false);
    }
  };

  const handleBuyNow = async () => {
    if (!requireLogin()) return;

    try {
      setBuyLoading(true);
      const success = await addProductToCart();

      if (success) {
        toast.success("Product added. Redirecting to checkout");
        router.push("/checkout");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to buy now");
    } finally {
      setBuyLoading(false);
    }
  };

  const handleWishlist = async () => {
    if (!requireLogin()) return;

    if (!productId) {
      toast.error("Product not found");
      return;
    }

    try {
      setWishlistLoading(true);
      await addToWishlistApi(productId);
      toast.success("Added to wishlist");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to add wishlist"
      );
    } finally {
      setWishlistLoading(false);
    }
  };

  return (
    <div className="mt-6 space-y-5">
      {colors.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold">Color</p>

          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={`rounded-md border px-4 py-2 text-sm ${
                  selectedColor === color
                    ? "border-orange-600 bg-orange-50 text-orange-600"
                    : "bg-white"
                }`}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold">Size</p>

          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedSize(size)}
                className={`rounded-md border px-4 py-2 text-sm ${
                  selectedSize === size
                    ? "border-orange-600 bg-orange-50 text-orange-600"
                    : "bg-white"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold">Quantity</p>

        <div className="flex w-fit items-center overflow-hidden rounded-md border">
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            className="px-4 py-2"
          >
            -
          </button>

          <span className="border-x px-5 py-2">{quantity}</span>

          <button
            type="button"
            onClick={() =>
              setQuantity((value) =>
                Math.min(product?.stock || value + 1, value + 1)
              )
            }
            className="px-4 py-2"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!isInStock || cartLoading}
          className="flex items-center justify-center gap-2 rounded-md bg-orange-600 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          <ShoppingCart size={18} />
          {cartLoading ? "Adding..." : "Add To Cart"}
        </button>

        <button
          type="button"
          onClick={handleBuyNow}
          disabled={!isInStock || buyLoading}
          className="rounded-md bg-gray-900 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {buyLoading ? "Processing..." : "Buy Now"}
        </button>

        <button
          type="button"
          onClick={handleWishlist}
          disabled={wishlistLoading}
          className="flex items-center justify-center gap-2 rounded-md border px-5 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Heart size={18} />
          {wishlistLoading ? "Saving..." : "Wishlist"}
        </button>
      </div>
    </div>
  );
}