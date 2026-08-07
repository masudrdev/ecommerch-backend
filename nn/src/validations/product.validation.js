import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(2, "Product name is required"),
  slug: z.string().optional(),
  description: z.string().optional(),

  price: z.coerce.number().positive("Price must be positive"),
  salePrice: z.coerce.number().positive().nullable().optional(),

  stock: z.coerce.number().int().min(0),
  deliveryCharge: z.coerce.number().min(0).default(0),
  outsideDistrictExtraCharge: z.coerce.number().min(0).default(35),

  categoryId: z.string().nullable().optional(),
  brandId: z.string().nullable().optional(),
});