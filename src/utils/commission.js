/**
 * Commission priority:
 *
 * 1. Product custom commission
 * 2. Vendor default commission
 * 3. Global platform default commission
 */

const VALID_COMMISSION_TYPES = ["PERCENTAGE", "FIXED"];

/**
 * Currency value দুই decimal পর্যন্ত রাখে।
 */
export const roundMoney = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.round((numericValue + Number.EPSILON) * 100) / 100;
};

/**
 * Prisma থেকে আসা nullable value নিরাপদে number-এ convert করে।
 */
const toNullableNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : null;
};

/**
 * Commission type ও value valid কি না পরীক্ষা করে।
 *
 * Percentage:
 * 0 থেকে 100-এর মধ্যে হতে হবে।
 *
 * Fixed:
 * 0 বা তার বেশি হতে হবে।
 * এক unit product price-এর বেশি হতে পারবে না।
 */
export const validateCommission = ({
  commissionType,
  commissionValue,
  unitPrice,
}) => {
  if (!VALID_COMMISSION_TYPES.includes(commissionType)) {
    return {
      valid: false,
      message: "Commission type must be PERCENTAGE or FIXED",
    };
  }

  const value = toNullableNumber(commissionValue);
  const price = Number(unitPrice);

  if (value === null || value < 0) {
    return {
      valid: false,
      message: "Commission value must be a valid positive number",
    };
  }

  if (!Number.isFinite(price) || price < 0) {
    return {
      valid: false,
      message: "Product price is invalid",
    };
  }

  if (commissionType === "PERCENTAGE" && value > 100) {
    return {
      valid: false,
      message: "Percentage commission cannot be greater than 100",
    };
  }

  if (commissionType === "FIXED" && value > price) {
    return {
      valid: false,
      message: "Fixed commission cannot be greater than product price",
    };
  }

  return {
    valid: true,
    message: null,
  };
};

/**
 * Product, Vendor ও Global Setting থেকে effective commission নির্বাচন করে।
 *
 * Product commission থাকলে সেটি highest priority।
 * না থাকলে Vendor default।
 * সেটিও না থাকলে Global default।
 */
export const getEffectiveCommission = ({
  product,
  vendor,
  platformSetting,
}) => {
  const productCommissionValue = toNullableNumber(
    product?.commissionValue
  );

  if (
    VALID_COMMISSION_TYPES.includes(product?.commissionType) &&
    productCommissionValue !== null
  ) {
    return {
      commissionType: product.commissionType,
      commissionValue: productCommissionValue,
      source: "PRODUCT",
    };
  }

  const vendorCommissionValue = toNullableNumber(
    vendor?.defaultCommissionValue
  );

  const vendorCommissionIsEffective =
    vendor?.defaultCommissionActive !== false &&
    (!vendor?.defaultCommissionEffectiveFrom ||
      new Date(vendor.defaultCommissionEffectiveFrom) <= new Date());

  if (
    vendorCommissionIsEffective &&
    VALID_COMMISSION_TYPES.includes(vendor?.defaultCommissionType) &&
    vendorCommissionValue !== null
  ) {
    return {
      commissionType: vendor.defaultCommissionType,
      commissionValue: vendorCommissionValue,
      source: "VENDOR",
    };
  }

  const platformCommissionValue = toNullableNumber(
    platformSetting?.defaultCommissionValue
  );

  if (
    VALID_COMMISSION_TYPES.includes(
      platformSetting?.defaultCommissionType
    ) &&
    platformCommissionValue !== null
  ) {
    return {
      commissionType: platformSetting.defaultCommissionType,
      commissionValue: platformCommissionValue,
      source: "GLOBAL",
    };
  }

  /*
   * Global setting row এখনো create না হলেও
   * order calculation fail না করে 0% commission ব্যবহার করবে।
   */
  return {
    commissionType: "PERCENTAGE",
    commissionValue: 0,
    source: "FALLBACK",
  };
};

/**
 * একটি OrderItem-এর commission calculation করে।
 *
 * unitPrice:
 * এক unit-এর actual selling price।
 *
 * quantity:
 * order করা quantity।
 *
 * Fixed commission প্রতি unit হিসেবে calculate হবে।
 */
export const calculateCommission = ({
  unitPrice,
  quantity = 1,
  commissionType,
  commissionValue,
}) => {
  const safeUnitPrice = Number(unitPrice);
  const safeQuantity = Number(quantity);
  const safeCommissionValue = Number(commissionValue);

  if (!Number.isFinite(safeUnitPrice) || safeUnitPrice < 0) {
    throw new Error("Invalid unit price");
  }

  if (
    !Number.isInteger(safeQuantity) ||
    safeQuantity < 1
  ) {
    throw new Error("Quantity must be a positive integer");
  }

  const validation = validateCommission({
    commissionType,
    commissionValue: safeCommissionValue,
    unitPrice: safeUnitPrice,
  });

  if (!validation.valid) {
    throw new Error(validation.message);
  }

  const subtotal = roundMoney(safeUnitPrice * safeQuantity);

  let commissionAmount = 0;

  if (commissionType === "PERCENTAGE") {
    commissionAmount = roundMoney(
      subtotal * (safeCommissionValue / 100)
    );
  }

  if (commissionType === "FIXED") {
    commissionAmount = roundMoney(
      safeCommissionValue * safeQuantity
    );
  }

  /*
   * Floating-point বা unexpected input-এর কারণে
   * commission subtotal-এর বেশি হতে দেওয়া হবে না।
   */
  commissionAmount = Math.min(commissionAmount, subtotal);

  const vendorEarning = roundMoney(
    subtotal - commissionAmount
  );

  return {
    unitPrice: roundMoney(safeUnitPrice),
    quantity: safeQuantity,
    subtotal,

    commissionType,
    commissionValue: roundMoney(safeCommissionValue),
    commissionAmount,

    platformEarning: commissionAmount,
    vendorEarning,
  };
};

/**
 * Product data থেকে actual unit selling price বের করে।
 *
 * Valid salePrice থাকলে salePrice।
 * না থাকলে regular price।
 */
export const getProductSellingPrice = (product) => {
  const salePrice = toNullableNumber(product?.salePrice);
  const regularPrice = toNullableNumber(product?.price);

  if (salePrice !== null && salePrice >= 0) {
    return salePrice;
  }

  if (regularPrice !== null && regularPrice >= 0) {
    return regularPrice;
  }

  throw new Error("Product does not have a valid selling price");
};

/**
 * Controller বা order service থেকে সহজে ব্যবহার করার জন্য
 * effective commission resolve ও calculate—দুটো একসঙ্গে করে।
 */
export const buildCommissionSnapshot = ({
  product,
  vendor,
  platformSetting,
  unitPrice,
  quantity = 1,
}) => {
  const effectiveCommission = getEffectiveCommission({
    product,
    vendor,
    platformSetting,
  });

  const calculation = calculateCommission({
    unitPrice,
    quantity,
    commissionType: effectiveCommission.commissionType,
    commissionValue: effectiveCommission.commissionValue,
  });

  return {
    ...calculation,
    source: effectiveCommission.source,
  };
};
