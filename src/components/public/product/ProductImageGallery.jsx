"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

export default function ProductImageGallery({ product }) {
  const images = useMemo(() => {
    if (product?.images?.length > 0) return product.images;

    return [
      {
        id: "main",
        url: product?.mainImage || product?.image || "/placeholder.png",
      },
    ];
  }, [product]);

  const defaultImage =
    images.find((img) => img?.isMain)?.url ||
    images?.[0]?.url ||
    images?.[0] ||
    "/placeholder.png";

  const [selectedImage, setSelectedImage] = useState(defaultImage);

  useEffect(() => {
    setSelectedImage(defaultImage);
  }, [defaultImage]);

  return (
    <div className="grid gap-3 sm:grid-cols-[80px_1fr]">
      <div className="order-2 flex gap-2 overflow-x-auto sm:order-1 sm:flex-col sm:overflow-x-visible">
        {images.map((img, index) => {
          const imgSrc = img?.url || img || "/placeholder.png";
          const active = selectedImage === imgSrc;

          return (
            <button
              key={img?.id || index}
              type="button"
              onClick={() => setSelectedImage(imgSrc)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-white sm:h-20 sm:w-20 ${
                active ? "border-orange-500 ring-2 ring-orange-200" : "border-gray-300"
              }`}
            >
              <Image
                src={imgSrc}
                alt={product?.name || "Product thumbnail"}
                fill
                className="object-contain p-1"
                sizes="80px"
              />
            </button>
          );
        })}
      </div>

      <div className="order-1 relative aspect-square overflow-hidden rounded-md border bg-white sm:order-2">
        <Image
          src={selectedImage}
          alt={product?.name || "Product image"}
          fill
          priority
          className="object-contain p-3"
          sizes="(max-width: 1024px) 100vw, 45vw"
        />
      </div>
    </div>
  );
}