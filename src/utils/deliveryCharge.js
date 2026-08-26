export const DELIVERY_TYPES = Object.freeze({
  INSIDE: "INSIDE",
  OUTSIDE: "OUTSIDE",
});

const toSafeCharge = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

export const calculateDeliveryCharge = (product, deliveryType) => {
  if (!Object.values(DELIVERY_TYPES).includes(deliveryType)) {
    throw new Error("Invalid delivery type");
  }

  const insideCharge = toSafeCharge(product?.deliveryCharge);
  const outsideExtraCharge = toSafeCharge(
    product?.outsideDistrictExtraCharge
  );

  return deliveryType === DELIVERY_TYPES.OUTSIDE
    ? insideCharge + outsideExtraCharge
    : insideCharge;
};
