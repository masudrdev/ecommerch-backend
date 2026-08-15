"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createReviewApi } from "@/services/review.service";
import toast from "react-hot-toast";

export default function WriteReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const productId = searchParams.get("productId");
  const orderId = searchParams.get("orderId");

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!productId) {
      toast.error("Product ID missing");
      return;
    }

    if (!comment.trim()) {
      toast.error("Please write your review");
      return;
    }

    try {
      setLoading(true);

      await createReviewApi({
        productId,
        orderId,
        rating: Number(rating),
        comment,
      });

      toast.success("Review submitted successfully");
      router.push("/dashboard/reviews");
    } catch (error) {
      console.error("Create review error:", error);
      toast.error(error?.response?.data?.message || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Write Review</h1>
        <p className="mt-1 text-sm text-gray-400">
          Share your experience about this product.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl bg-[#1E293B] p-5 shadow-sm"
      >
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Rating
            </label>

            <select
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-orange-500"
            >
              <option value="5">5 Star - Excellent</option>
              <option value="4">4 Star - Good</option>
              <option value="3">3 Star - Average</option>
              <option value="2">2 Star - Poor</option>
              <option value="1">1 Star - Bad</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Review
            </label>

            <textarea
              rows={6}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write your review here..."
              className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Submitting..." : "Submit Review"}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg bg-slate-700 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}