import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  items: [],
  loading: false,
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    setCartItems: (state, action) => {
      state.items = action.payload;
    },

    addToCartLocal: (state, action) => {
      const item = action.payload;
      const existing = state.items.find((cartItem) => cartItem.id === item.id);

      if (existing) {
        existing.quantity = item.quantity;
      } else {
        state.items.push(item);
      }
    },

    updateCartItemLocal: (state, action) => {
      const { itemId, quantity, color, size } = action.payload;
      const item = state.items.find((cartItem) => cartItem.id === itemId);

      if (item) {
        if (quantity) item.quantity = quantity;
        if (color !== undefined) item.color = color;
        if (size !== undefined) item.size = size;
      }
    },

    removeCartItemLocal: (state, action) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },

    clearCartLocal: (state) => {
      state.items = [];
    },
  },
});

export const {
  setCartItems,
  addToCartLocal,
  updateCartItemLocal,
  removeCartItemLocal,
  clearCartLocal,
} = cartSlice.actions;

export default cartSlice.reducer;