import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  items: [],
};

const formatCartItems = (items = []) => {
  return items.map((item) => ({
    cartId: item.id,
    cartItemId: item.id,
    productId: item.productId,
    name: item.product?.name,
    slug: item.product?.slug,
    image:
      item.product?.mainImage ||
      item.product?.image ||
      item.product?.images?.[0]?.url ||
      "/placeholder.png",
    price:
      item.product?.salePrice ||
      item.product?.offerPrice ||
      item.product?.price ||
      0,
    quantity: item.quantity,
    color: item.color,
    size: item.size,
    vendor: item.product?.vendor,
    product: item.product,
  }));
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    setCart: (state, action) => {
      state.items = formatCartItems(action.payload);
    },

    clearCart: (state) => {
      state.items = [];
    },
  },
});

export const { setCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;