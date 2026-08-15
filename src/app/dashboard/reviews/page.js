// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { useSelector } from "react-redux";
// import Link from "next/link";
// import {
//   deleteReviewApi,
//   getMyReviewsApi,
//   getVendorReviewsApi,
//   replyVendorReviewApi,
//   updateReviewApi,
//   getAdminReviewsApi,
//   createAdminCustomReviewApi,
// } from "@/services/review.service";

// function Stars({ rating }) {
//   return (
//     <span className="text-sm text-yellow-400">
//       {"★".repeat(Number(rating) || 0)}
//       <span className="text-slate-500">
//         {"★".repeat(5 - (Number(rating) || 0))}
//       </span>
//     </span>
//   );
// }

// function getReviewerName(review) {
//   return (
//     review.displayReviewerName ||
//     review.user?.name ||
//     review.user?.username ||
//     review.reviewerName ||
//     "Customer"
//   );
// }

// function getProductImage(product) {
//   const image = product?.images?.find((item) => item.isMain) || product?.images?.[0];
//   return image?.url || "";
// }

// export default function ReviewsPage() {
//   const { user } = useSelector((state) => state.auth);

//   const userRole = user?.role?.toUpperCase();
//   const isVendor = userRole === "VENDOR";
//   const isCustomer = userRole === "CUSTOMER";
//   const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

//   const [reviews, setReviews] = useState([]);
//   const [products, setProducts] = useState([]);
//   const [loading, setLoading] = useState(false);

//   const [editingReview, setEditingReview] = useState(null);
//   const [editRating, setEditRating] = useState(5);
//   const [editComment, setEditComment] = useState("");

//   const [replyingReview, setReplyingReview] = useState(null);
//   const [reply, setReply] = useState("");
//   const [replySubmitting, setReplySubmitting] = useState(false);

//   const [stats, setStats] = useState(null);

//   const [search, setSearch] = useState("");
//   const [searchInput, setSearchInput] = useState("");
//   const [rating, setRating] = useState("");
//   const [replyStatus, setReplyStatus] = useState("");
//   const [source, setSource] = useState("");
//   const [productId, setProductId] = useState("");
//   const [page, setPage] = useState(1);
//   const [pagination, setPagination] = useState(null);

//   const [customProductId, setCustomProductId] = useState("");
//   const [reviewerName, setReviewerName] = useState("");
//   const [reviewerAvatar, setReviewerAvatar] = useState("");
//   const [customRating, setCustomRating] = useState("5");
//   const [customComment, setCustomComment] = useState("");
//   const [customSubmitting, setCustomSubmitting] = useState(false);

//   const selectedCustomProduct = useMemo(() => {
//     return products.find((product) => product.id === customProductId);
//   }, [products, customProductId]);

//   const fetchReviews = async () => {
//     try {
//       if (!userRole) return;

//       setLoading(true);

//       let res;

//       if (isAdmin) {
//         res = await getAdminReviewsApi({
//           search,
//           productId,
//           rating,
//           source,
//           page,
//           limit: 20,
//         });
//       } else if (isVendor) {
//         res = await getVendorReviewsApi({
//           search,
//           rating,
//           replyStatus,
//           page,
//           limit: 10,
//         });
//       } else if (isCustomer) {
//         res = await getMyReviewsApi();
//       } else {
//         setReviews([]);
//         setProducts([]);
//         setPagination(null);
//         setStats(null);
//         return;
//       }

//       setReviews(res?.reviews || res?.data || []);
//       setProducts(res?.products || []);
//       setPagination(res?.pagination || null);
//       setStats(res?.stats || null);
//     } catch (error) {
//       console.error("Reviews error:", error);
//       setReviews([]);
//       setPagination(null);
//       setStats(null);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (userRole) {
//       fetchReviews();
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [userRole, rating, replyStatus, source, productId, page, search]);

//   const handleSearch = () => {
//     setSearch(searchInput.trim());
//     setPage(1);
//   };

//   const handleClearSearch = () => {
//     setSearchInput("");
//     setSearch("");
//     setRating("");
//     setReplyStatus("");
//     setSource("");
//     setProductId("");
//     setPage(1);
//   };

//   const openEdit = (review) => {
//     setEditingReview(review);
//     setEditRating(review.rating || 5);
//     setEditComment(review.comment || "");
//   };

//   const handleUpdate = async (e) => {
//     e.preventDefault();

//     if (!editComment.trim()) {
//       alert("Please write your review");
//       return;
//     }

//     try {
//       await updateReviewApi(editingReview.id, {
//         rating: Number(editRating),
//         comment: editComment,
//       });

//       setEditingReview(null);
//       fetchReviews();
//     } catch (error) {
//       alert(error?.response?.data?.message || "Failed to update review");
//     }
//   };

//   const handleDelete = async (id) => {
//     if (!window.confirm("Are you sure you want to delete this review?")) return;

//     try {
//       await deleteReviewApi(id);
//       fetchReviews();
//     } catch (error) {
//       alert(error?.response?.data?.message || "Failed to delete review");
//     }
//   };

//   const openReply = (review) => {
//     if (!review?.id) {
//       alert("Review ID missing");
//       return;
//     }

//     setReplyingReview(review);
//     setReply(review.vendorReply || "");

//     setTimeout(() => {
//       document.getElementById("vendor-reply-box")?.scrollIntoView({
//         behavior: "smooth",
//         block: "start",
//       });
//     }, 100);
//   };

//   const handleVendorReply = async (e) => {
//     e.preventDefault();

//     if (!reply.trim()) {
//       alert("Reply is required");
//       return;
//     }

//     try {
//       setReplySubmitting(true);

//       await replyVendorReviewApi(replyingReview.id, reply);

//       setReplyingReview(null);
//       setReply("");
//       fetchReviews();
//     } catch (error) {
//       alert(error?.response?.data?.message || "Failed to submit reply");
//     } finally {
//       setReplySubmitting(false);
//     }
//   };

//   const resetCustomReviewForm = () => {
//     setCustomProductId("");
//     setReviewerName("");
//     setReviewerAvatar("");
//     setCustomRating("5");
//     setCustomComment("");
//   };

//   const handleCreateCustomReview = async (e) => {
//     e.preventDefault();

//     if (!customProductId) {
//       alert("Please select product");
//       return;
//     }

//     if (!reviewerName.trim()) {
//       alert("Reviewer name required");
//       return;
//     }

//     if (!customComment.trim()) {
//       alert("Review comment required");
//       return;
//     }

//     try {
//       setCustomSubmitting(true);

//       await createAdminCustomReviewApi({
//         productId: customProductId,
//         reviewerName: reviewerName.trim(),
//         reviewerAvatar: reviewerAvatar.trim() || "",
//         rating: Number(customRating),
//         comment: customComment.trim(),
//       });

//       resetCustomReviewForm();
//       fetchReviews();
//     } catch (error) {
//       alert(error?.response?.data?.message || "Failed to create custom review");
//     } finally {
//       setCustomSubmitting(false);
//     }
//   };

//   if (!userRole) {
//     return (
//       <div className="rounded-xl bg-slate-900 p-6 text-slate-300">
//         Loading user...
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-5">
//       <div>
//         <h1 className="text-2xl font-bold text-white">Reviews</h1>
//         <p className="text-sm text-slate-400">
//           {isAdmin
//             ? "Manage all product reviews and add custom reviews."
//             : isVendor
//             ? "Manage product reviews and reply to customers."
//             : "Manage your submitted reviews."}
//         </p>
//       </div>

//       {(isVendor || isAdmin) && stats && (
//         <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
//           <div className="rounded-xl bg-slate-900 p-4">
//             <p className="text-sm text-slate-400">Total Reviews</p>
//             <h3 className="mt-1 text-2xl font-bold text-white">
//               {stats.totalReviews || 0}
//             </h3>
//           </div>

//           <div className="rounded-xl bg-slate-900 p-4">
//             <p className="text-sm text-slate-400">Average Rating</p>
//             <h3 className="mt-1 text-2xl font-bold text-white">
//               {stats.averageRating || 0} ⭐
//             </h3>
//           </div>

//           {isVendor ? (
//             <>
//               <div className="rounded-xl bg-slate-900 p-4">
//                 <p className="text-sm text-slate-400">Replied</p>
//                 <h3 className="mt-1 text-2xl font-bold text-green-400">
//                   {stats.replied || 0}
//                 </h3>
//               </div>

//               <div className="rounded-xl bg-slate-900 p-4">
//                 <p className="text-sm text-slate-400">Pending Reply</p>
//                 <h3 className="mt-1 text-2xl font-bold text-orange-400">
//                   {stats.unreplied || 0}
//                 </h3>
//               </div>
//             </>
//           ) : (
//             <>
//               <div className="rounded-xl bg-slate-900 p-4">
//                 <p className="text-sm text-slate-400">Admin Added</p>
//                 <h3 className="mt-1 text-2xl font-bold text-purple-400">
//                   {stats.adminAdded || 0}
//                 </h3>
//               </div>

//               <div className="rounded-xl bg-slate-900 p-4">
//                 <p className="text-sm text-slate-400">User Reviews</p>
//                 <h3 className="mt-1 text-2xl font-bold text-blue-400">
//                   {stats.userAdded || 0}
//                 </h3>
//               </div>
//             </>
//           )}

//           <div className="rounded-xl bg-slate-900 p-4 sm:col-span-2 lg:col-span-4">
//             <p className="mb-3 text-sm font-semibold text-white">
//               Rating Summary
//             </p>

//             {[5, 4, 3, 2, 1].map((star) => (
//               <div
//                 key={star}
//                 className="mb-2 flex items-center justify-between text-sm"
//               >
//                 <span className="text-slate-300">
//                   {"★".repeat(star)}
//                   {"☆".repeat(5 - star)}
//                 </span>
//                 <span className="font-semibold text-white">
//                   {stats.ratingBreakdown?.[star] || 0}
//                 </span>
//               </div>
//             ))}
//           </div>
//         </div>
//       )}

//       {isAdmin && (
//         <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
//           <form
//             onSubmit={handleCreateCustomReview}
//             className="h-fit rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5"
//           >
//             <h2 className="text-lg font-semibold text-white">
//               Add Custom Review
//             </h2>
//             <p className="mt-1 text-sm text-slate-400">
//               Public product page-এ normal customer review হিসেবে show হবে।
//             </p>

//             <div className="mt-4 space-y-4">
//               <div>
//                 <label className="mb-1 block text-sm text-slate-300">
//                   Product
//                 </label>
//                 <select
//                   value={customProductId}
//                   onChange={(e) => setCustomProductId(e.target.value)}
//                   className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none"
//                 >
//                   <option value="">Select Product</option>
//                   {products.map((product) => (
//                     <option key={product.id} value={product.id}>
//                       {product.name}
//                     </option>
//                   ))}
//                 </select>

//                 {selectedCustomProduct && (
//                   <p className="mt-2 rounded-lg bg-blue-500/10 px-3 py-2 text-xs text-blue-200">
//                     Selected: {selectedCustomProduct.name}
//                   </p>
//                 )}
//               </div>

//               <div>
//                 <label className="mb-1 block text-sm text-slate-300">
//                   Reviewer Name
//                 </label>
//                 <input
//                   value={reviewerName}
//                   onChange={(e) => setReviewerName(e.target.value)}
//                   placeholder="Example: Rahim Ahmed"
//                   className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none"
//                 />
//               </div>

//               <div>
//                 <label className="mb-1 block text-sm text-slate-300">
//                   Reviewer Avatar URL optional
//                 </label>
//                 <input
//                   value={reviewerAvatar}
//                   onChange={(e) => setReviewerAvatar(e.target.value)}
//                   placeholder="https://example.com/avatar.jpg"
//                   className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none"
//                 />
//               </div>

//               <div>
//                 <label className="mb-1 block text-sm text-slate-300">
//                   Rating
//                 </label>
//                 <select
//                   value={customRating}
//                   onChange={(e) => setCustomRating(e.target.value)}
//                   className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none"
//                 >
//                   <option value="5">5 Star</option>
//                   <option value="4">4 Star</option>
//                   <option value="3">3 Star</option>
//                   <option value="2">2 Star</option>
//                   <option value="1">1 Star</option>
//                 </select>
//               </div>

//               <div>
//                 <label className="mb-1 block text-sm text-slate-300">
//                   Comment
//                 </label>
//                 <textarea
//                   value={customComment}
//                   onChange={(e) => setCustomComment(e.target.value)}
//                   rows={4}
//                   placeholder="Write review comment..."
//                   className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none"
//                 />
//               </div>

//               <div className="flex gap-3">
//                 <button
//                   type="submit"
//                   disabled={customSubmitting}
//                   className="flex-1 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
//                 >
//                   {customSubmitting ? "Creating..." : "Create Review"}
//                 </button>

//                 <button
//                   type="button"
//                   onClick={resetCustomReviewForm}
//                   className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
//                 >
//                   Clear
//                 </button>
//               </div>
//             </div>
//           </form>

//           <div className="space-y-4">
//             <AdminVendorFilters
//               isAdmin={isAdmin}
//               searchInput={searchInput}
//               setSearchInput={setSearchInput}
//               handleSearch={handleSearch}
//               rating={rating}
//               setRating={setRating}
//               setPage={setPage}
//               source={source}
//               setSource={setSource}
//               productId={productId}
//               setProductId={setProductId}
//               products={products}
//               handleClearSearch={handleClearSearch}
//             />

//             <ReviewList
//               loading={loading}
//               reviews={reviews}
//               isAdmin={isAdmin}
//               isVendor={isVendor}
//               isCustomer={isCustomer}
//               handleDelete={handleDelete}
//               openReply={openReply}
//               openEdit={openEdit}
//             />

//             <Pagination
//               show={pagination?.totalPages > 1}
//               page={page}
//               setPage={setPage}
//               pagination={pagination}
//             />
//           </div>
//         </div>
//       )}

//       {isVendor && (
//         <>
//           <AdminVendorFilters
//             isAdmin={false}
//             searchInput={searchInput}
//             setSearchInput={setSearchInput}
//             handleSearch={handleSearch}
//             rating={rating}
//             setRating={setRating}
//             setPage={setPage}
//             replyStatus={replyStatus}
//             setReplyStatus={setReplyStatus}
//             handleClearSearch={handleClearSearch}
//           />

//           {replyingReview && (
//             <div
//               id="vendor-reply-box"
//               className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5"
//             >
//               <h2 className="mb-1 text-lg font-semibold text-white">
//                 Reply to Review
//               </h2>

//               <p className="mb-4 text-sm text-slate-400">
//                 Product: {replyingReview.product?.name || "Product"}
//               </p>

//               <form onSubmit={handleVendorReply} className="space-y-4">
//                 <textarea
//                   value={reply}
//                   onChange={(e) => setReply(e.target.value)}
//                   rows={4}
//                   placeholder="Write vendor reply..."
//                   className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-orange-500"
//                 />

//                 <div className="flex flex-col gap-3 sm:flex-row">
//                   <button
//                     type="submit"
//                     disabled={replySubmitting}
//                     className="rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
//                   >
//                     {replySubmitting ? "Submitting..." : "Submit Reply"}
//                   </button>

//                   <button
//                     type="button"
//                     onClick={() => {
//                       setReplyingReview(null);
//                       setReply("");
//                     }}
//                     className="rounded-lg bg-slate-700 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-600"
//                   >
//                     Cancel
//                   </button>
//                 </div>
//               </form>
//             </div>
//           )}

//           <ReviewList
//             loading={loading}
//             reviews={reviews}
//             isAdmin={isAdmin}
//             isVendor={isVendor}
//             isCustomer={isCustomer}
//             handleDelete={handleDelete}
//             openReply={openReply}
//             openEdit={openEdit}
//           />

//           <Pagination
//             show={pagination?.totalPages > 1}
//             page={page}
//             setPage={setPage}
//             pagination={pagination}
//           />
//         </>
//       )}

//       {isCustomer && (
//         <>
//           <ReviewList
//             loading={loading}
//             reviews={reviews}
//             isAdmin={isAdmin}
//             isVendor={isVendor}
//             isCustomer={isCustomer}
//             handleDelete={handleDelete}
//             openReply={openReply}
//             openEdit={openEdit}
//           />

//           {editingReview && (
//             <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
//               <h2 className="mb-4 text-lg font-semibold text-white">
//                 Edit Review
//               </h2>

//               <form onSubmit={handleUpdate} className="space-y-4">
//                 <select
//                   value={editRating}
//                   onChange={(e) => setEditRating(e.target.value)}
//                   className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-orange-500"
//                 >
//                   <option value="5">5 Star - Excellent</option>
//                   <option value="4">4 Star - Good</option>
//                   <option value="3">3 Star - Average</option>
//                   <option value="2">2 Star - Poor</option>
//                   <option value="1">1 Star - Bad</option>
//                 </select>

//                 <textarea
//                   value={editComment}
//                   onChange={(e) => setEditComment(e.target.value)}
//                   rows={4}
//                   className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-orange-500"
//                 />

//                 <div className="flex flex-col gap-3 sm:flex-row">
//                   <button
//                     type="submit"
//                     className="rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600"
//                   >
//                     Update Review
//                   </button>

//                   <button
//                     type="button"
//                     onClick={() => setEditingReview(null)}
//                     className="rounded-lg bg-slate-700 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-600"
//                   >
//                     Cancel
//                   </button>
//                 </div>
//               </form>
//             </div>
//           )}
//         </>
//       )}

//       {!isAdmin && !isVendor && !isCustomer && (
//         <div className="rounded-xl bg-slate-900 p-6 text-slate-300">
//           You do not have permission to view reviews.
//         </div>
//       )}
//     </div>
//   );
// }

// function AdminVendorFilters({
//   isAdmin,
//   searchInput,
//   setSearchInput,
//   handleSearch,
//   rating,
//   setRating,
//   setPage,
//   replyStatus,
//   setReplyStatus,
//   source,
//   setSource,
//   productId,
//   setProductId,
//   products = [],
//   handleClearSearch,
// }) {
//   return (
//     <div className="grid gap-3 rounded-xl bg-slate-900 p-4 sm:grid-cols-2 lg:grid-cols-5">
//       <input
//         value={searchInput}
//         onChange={(e) => setSearchInput(e.target.value)}
//         onKeyDown={(e) => {
//           if (e.key === "Enter") handleSearch();
//         }}
//         placeholder={
//           isAdmin
//             ? "Search product, reviewer, review"
//             : "Search product, customer, review"
//         }
//         className="rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none lg:col-span-2"
//       />

//       <button
//         type="button"
//         onClick={handleSearch}
//         className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
//       >
//         Search
//       </button>

//       {isAdmin && (
//         <select
//           value={productId}
//           onChange={(e) => {
//             setProductId(e.target.value);
//             setPage(1);
//           }}
//           className="rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none"
//         >
//           <option value="">All Products</option>
//           {products.map((product) => (
//             <option key={product.id} value={product.id}>
//               {product.name}
//             </option>
//           ))}
//         </select>
//       )}

//       <select
//         value={rating}
//         onChange={(e) => {
//           setRating(e.target.value);
//           setPage(1);
//         }}
//         className="rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none"
//       >
//         <option value="">All Ratings</option>
//         <option value="5">5 Star</option>
//         <option value="4">4 Star</option>
//         <option value="3">3 Star</option>
//         <option value="2">2 Star</option>
//         <option value="1">1 Star</option>
//       </select>

//       {isAdmin ? (
//         <select
//           value={source}
//           onChange={(e) => {
//             setSource(e.target.value);
//             setPage(1);
//           }}
//           className="rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none"
//         >
//           <option value="">All Sources</option>
//           <option value="USER">User Reviews</option>
//           <option value="ADMIN">Admin Added</option>
//         </select>
//       ) : (
//         <select
//           value={replyStatus}
//           onChange={(e) => {
//             setReplyStatus(e.target.value);
//             setPage(1);
//           }}
//           className="rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none"
//         >
//           <option value="">All Reviews</option>
//           <option value="replied">Replied</option>
//           <option value="unreplied">Unreplied</option>
//         </select>
//       )}

//       <button
//         type="button"
//         onClick={handleClearSearch}
//         className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 sm:col-span-2 lg:col-span-5"
//       >
//         Clear Filter
//       </button>
//     </div>
//   );
// }

// function ReviewList({
//   loading,
//   reviews,
//   isAdmin,
//   isVendor,
//   isCustomer,
//   handleDelete,
//   openReply,
//   openEdit,
// }) {
//   if (loading) {
//     return (
//       <div className="rounded-xl bg-slate-900 p-6 text-slate-300">
//         Loading reviews...
//       </div>
//     );
//   }

//   if (!reviews.length) {
//     return (
//       <div className="rounded-xl bg-slate-900 p-6 text-slate-300">
//         No reviews found.
//       </div>
//     );
//   }

//   return (
//     <div className="grid gap-4">
//       {reviews.map((review) => {
//         const productImage = getProductImage(review.product);
//         const reviewerAvatar =
//           review.displayReviewerAvatar ||
//           review.user?.avatar ||
//           review.reviewerAvatar ||
//           "";

//         return (
//           <div
//             key={review.id}
//             className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm sm:p-5"
//           >
//             <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
//               <div className="min-w-0">
//                 <div className="flex gap-3">
//                   {isAdmin && (
//                     <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-800 bg-[#0F172A]">
//                       {productImage ? (
//                         <img
//                           src={productImage}
//                           alt={review.product?.name || "Product"}
//                           className="h-full w-full object-cover"
//                         />
//                       ) : (
//                         <span className="text-xs text-slate-500">IMG</span>
//                       )}
//                     </div>
//                   )}

//                   <div className="min-w-0">
//                     <h2 className="truncate text-base font-semibold text-white sm:text-lg">
//                       {review.product?.name || "Product"}
//                     </h2>

//                     {(isVendor || isAdmin) && (
//                       <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400 sm:text-sm">
//                         <span>
//                           Customer:{" "}
//                           <span className="text-slate-200">
//                             {getReviewerName(review)}
//                           </span>
//                         </span>

//                         {isAdmin && (
//                           <span
//                             className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
//                               review.source === "ADMIN"
//                                 ? "bg-purple-500/10 text-purple-300"
//                                 : "bg-blue-500/10 text-blue-300"
//                             }`}
//                           >
//                             {review.source === "ADMIN"
//                               ? "ADMIN ADDED"
//                               : "USER"}
//                           </span>
//                         )}
//                       </div>
//                     )}
//                   </div>
//                 </div>

//                 {isAdmin && reviewerAvatar && (
//                   <div className="mt-3 flex items-center gap-2">
//                     <img
//                       src={reviewerAvatar}
//                       alt={getReviewerName(review)}
//                       className="h-8 w-8 rounded-full object-cover"
//                     />
//                     <span className="text-xs text-slate-400">
//                       Reviewer Avatar
//                     </span>
//                   </div>
//                 )}

//                 <div className="mt-2">
//                   <Stars rating={review.rating} />
//                 </div>

//                 <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
//                   {review.comment || "No comment"}
//                 </p>

//                 <p className="mt-2 text-xs text-slate-500">
//                   {review.createdAt
//                     ? new Date(review.createdAt).toLocaleString()
//                     : ""}
//                 </p>

//                 {review.vendorReply && (
//                   <div className="mt-4 rounded-lg border border-orange-500/30 bg-orange-500/10 p-3">
//                     <p className="text-xs font-semibold uppercase tracking-wide text-orange-300">
//                       Vendor Reply
//                     </p>
//                     <p className="mt-1 whitespace-pre-wrap break-words text-sm text-orange-100">
//                       {review.vendorReply}
//                     </p>
//                   </div>
//                 )}
//               </div>

//               <div className="flex flex-wrap gap-2 sm:justify-end">
//                 {review.product?.slug && (
//                   <Link
//                     href={`/products/${review.product.slug}`}
//                     className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-600"
//                   >
//                     View Product
//                   </Link>
//                 )}

//                 {isVendor && (
//                   <button
//                     type="button"
//                     onClick={() => openReply(review)}
//                     className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-600"
//                   >
//                     {review.vendorReply ? "Update Reply" : "Reply"}
//                   </button>
//                 )}

//                 {isCustomer && (
//                   <>
//                     <button
//                       type="button"
//                       onClick={() => openEdit(review)}
//                       className="rounded-lg bg-blue-500 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-600"
//                     >
//                       Edit
//                     </button>

//                     <button
//                       type="button"
//                       onClick={() => handleDelete(review.id)}
//                       className="rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600"
//                     >
//                       Delete
//                     </button>
//                   </>
//                 )}

//                 {isAdmin && (
//                   <button
//                     type="button"
//                     onClick={() => handleDelete(review.id)}
//                     className="rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600"
//                   >
//                     Delete
//                   </button>
//                 )}
//               </div>
//             </div>
//           </div>
//         );
//       })}
//     </div>
//   );
// }

// function Pagination({ show, page, setPage, pagination }) {
//   if (!show) return null;

//   return (
//     <div className="flex flex-col gap-3 rounded-xl bg-slate-900 p-4 sm:flex-row sm:items-center sm:justify-between">
//       <button
//         type="button"
//         disabled={page <= 1}
//         onClick={() => setPage((p) => Math.max(p - 1, 1))}
//         className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white disabled:opacity-40"
//       >
//         Previous
//       </button>

//       <span className="text-center text-sm text-slate-300">
//         Page {pagination.page} of {pagination.totalPages}
//       </span>

//       <button
//         type="button"
//         disabled={page >= pagination.totalPages}
//         onClick={() => setPage((p) => p + 1)}
//         className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white disabled:opacity-40"
//       >
//         Next
//       </button>
//     </div>
//   );
// }
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import Link from "next/link";
import {
  deleteReviewApi,
  getMyReviewsApi,
  getVendorReviewsApi,
  replyVendorReviewApi,
  updateReviewApi,
  getAdminReviewsApi,
  createAdminCustomReviewApi,
} from "@/services/review.service";

function Stars({ rating }) {
  return (
    <span className="text-sm text-yellow-400">
      {"★".repeat(Number(rating) || 0)}
      <span className="text-slate-500">
        {"★".repeat(5 - (Number(rating) || 0))}
      </span>
    </span>
  );
}

function getReviewerName(review) {
  return (
    review.displayReviewerName ||
    review.user?.name ||
    review.user?.username ||
    review.reviewerName ||
    "Customer"
  );
}

function getProductImage(product) {
  const image = product?.images?.find((item) => item.isMain) || product?.images?.[0];
  return image?.url || "";
}

export default function ReviewsPage() {
  const { user } = useSelector((state) => state.auth);

  const userRole = user?.role?.toUpperCase();
  const isVendor = userRole === "VENDOR";
  const isCustomer = userRole === "CUSTOMER";
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editingReview, setEditingReview] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState("");

  const [replyingReview, setReplyingReview] = useState(null);
  const [reply, setReply] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);

  const [stats, setStats] = useState(null);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [rating, setRating] = useState("");
  const [replyStatus, setReplyStatus] = useState("");
  const [source, setSource] = useState("");
  const [productId, setProductId] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const [customProductId, setCustomProductId] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerAvatar, setReviewerAvatar] = useState("");
  const [customRating, setCustomRating] = useState("5");
  const [customComment, setCustomComment] = useState("");
  const [customSubmitting, setCustomSubmitting] = useState(false);

  const selectedCustomProduct = useMemo(() => {
    return products.find((product) => product.id === customProductId);
  }, [products, customProductId]);

  const fetchReviews = async () => {
    try {
      if (!userRole) return;

      setLoading(true);

      let res;

      if (isAdmin) {
        res = await getAdminReviewsApi({
          search,
          productId,
          rating,
          source,
          page,
          limit: 20,
        });
      } else if (isVendor) {
        res = await getVendorReviewsApi({
          search,
          rating,
          replyStatus,
          page,
          limit: 10,
        });
      } else if (isCustomer) {
        res = await getMyReviewsApi();
      } else {
        setReviews([]);
        setProducts([]);
        setPagination(null);
        setStats(null);
        return;
      }

      setReviews(res?.reviews || res?.data || []);
      setProducts(res?.products || []);
      setPagination(res?.pagination || null);
      setStats(res?.stats || null);
    } catch (error) {
      console.error("Reviews error:", error);
      setReviews([]);
      setPagination(null);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole) {
      fetchReviews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole, rating, replyStatus, source, productId, page, search]);

  const handleSearch = () => {
    setSearch(searchInput.trim());
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearch("");
    setRating("");
    setReplyStatus("");
    setSource("");
    setProductId("");
    setPage(1);
  };

  const openEdit = (review) => {
    setEditingReview(review);
    setEditRating(review.rating || 5);
    setEditComment(review.comment || "");
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!editComment.trim()) {
      alert("Please write your review");
      return;
    }

    try {
      await updateReviewApi(editingReview.id, {
        rating: Number(editRating),
        comment: editComment,
      });

      setEditingReview(null);
      fetchReviews();
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to update review");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;

    try {
      await deleteReviewApi(id);
      fetchReviews();
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to delete review");
    }
  };

  const openReply = (review) => {
    if (!review?.id) {
      alert("Review ID missing");
      return;
    }

    setReplyingReview(review);
    setReply(review.vendorReply || "");

    setTimeout(() => {
      document.getElementById("vendor-reply-box")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  const handleVendorReply = async (e) => {
    e.preventDefault();

    if (!reply.trim()) {
      alert("Reply is required");
      return;
    }

    try {
      setReplySubmitting(true);

      await replyVendorReviewApi(replyingReview.id, reply);

      setReplyingReview(null);
      setReply("");
      fetchReviews();
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to submit reply");
    } finally {
      setReplySubmitting(false);
    }
  };

  const resetCustomReviewForm = () => {
    setCustomProductId("");
    setReviewerName("");
    setReviewerAvatar("");
    setCustomRating("5");
    setCustomComment("");
  };

  const handleCreateCustomReview = async (e) => {
    e.preventDefault();

    if (!customProductId) {
      alert("Please select product");
      return;
    }

    if (!reviewerName.trim()) {
      alert("Reviewer name required");
      return;
    }

    if (!customComment.trim()) {
      alert("Review comment required");
      return;
    }

    try {
      setCustomSubmitting(true);

      await createAdminCustomReviewApi({
        productId: customProductId,
        reviewerName: reviewerName.trim(),
        reviewerAvatar: reviewerAvatar.trim() || "",
        rating: Number(customRating),
        comment: customComment.trim(),
      });

      resetCustomReviewForm();
      fetchReviews();
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to create custom review");
    } finally {
      setCustomSubmitting(false);
    }
  };

  if (!userRole) {
    return (
      <div className="rounded-xl bg-slate-900 p-6 text-slate-300">
        Loading user...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Reviews</h1>
        <p className="text-sm text-slate-400">
          {isAdmin
            ? "Manage all product reviews and add custom reviews."
            : isVendor
            ? "Manage product reviews and reply to customers."
            : "Manage your submitted reviews."}
        </p>
      </div>

      {(isVendor || isAdmin) && stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-slate-900 p-4">
            <p className="text-sm text-slate-400">Total Reviews</p>
            <h3 className="mt-1 text-2xl font-bold text-white">
              {stats.totalReviews || 0}
            </h3>
          </div>

          <div className="rounded-xl bg-slate-900 p-4">
            <p className="text-sm text-slate-400">Average Rating</p>
            <h3 className="mt-1 text-2xl font-bold text-white">
              {stats.averageRating || 0} ⭐
            </h3>
          </div>

          {isVendor ? (
            <>
              <div className="rounded-xl bg-slate-900 p-4">
                <p className="text-sm text-slate-400">Replied</p>
                <h3 className="mt-1 text-2xl font-bold text-green-400">
                  {stats.replied || 0}
                </h3>
              </div>

              <div className="rounded-xl bg-slate-900 p-4">
                <p className="text-sm text-slate-400">Pending Reply</p>
                <h3 className="mt-1 text-2xl font-bold text-orange-400">
                  {stats.unreplied || 0}
                </h3>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl bg-slate-900 p-4">
                <p className="text-sm text-slate-400">Admin Added</p>
                <h3 className="mt-1 text-2xl font-bold text-purple-400">
                  {stats.adminAdded || 0}
                </h3>
              </div>

              <div className="rounded-xl bg-slate-900 p-4">
                <p className="text-sm text-slate-400">User Reviews</p>
                <h3 className="mt-1 text-2xl font-bold text-blue-400">
                  {stats.userAdded || 0}
                </h3>
              </div>
            </>
          )}

          <div className="rounded-xl bg-slate-900 p-4 sm:col-span-2 lg:col-span-4">
            <p className="mb-3 text-sm font-semibold text-white">
              Rating Summary
            </p>

            {[5, 4, 3, 2, 1].map((star) => (
              <div
                key={star}
                className="mb-2 flex items-center justify-between text-sm"
              >
                <span className="text-slate-300">
                  {"★".repeat(star)}
                  {"☆".repeat(5 - star)}
                </span>
                <span className="font-semibold text-white">
                  {stats.ratingBreakdown?.[star] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
          <form
            onSubmit={handleCreateCustomReview}
            className="h-fit rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5"
          >
            <h2 className="text-lg font-semibold text-white">
              Add Custom Review
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Public product page-এ normal customer review হিসেবে show হবে।
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  Product
                </label>
                <select
                  value={customProductId}
                  onChange={(e) => setCustomProductId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none"
                >
                  <option value="">Select Product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>

                {selectedCustomProduct && (
                  <p className="mt-2 rounded-lg bg-blue-500/10 px-3 py-2 text-xs text-blue-200">
                    Selected: {selectedCustomProduct.name}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  Reviewer Name
                </label>
                <input
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="Example: Rahim Ahmed"
                  className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  Reviewer Avatar URL optional
                </label>
                <input
                  value={reviewerAvatar}
                  onChange={(e) => setReviewerAvatar(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  Rating
                </label>
                <select
                  value={customRating}
                  onChange={(e) => setCustomRating(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none"
                >
                  <option value="5">5 Star</option>
                  <option value="4">4 Star</option>
                  <option value="3">3 Star</option>
                  <option value="2">2 Star</option>
                  <option value="1">1 Star</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  Comment
                </label>
                <textarea
                  value={customComment}
                  onChange={(e) => setCustomComment(e.target.value)}
                  rows={4}
                  placeholder="Write review comment..."
                  className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={customSubmitting}
                  className="flex-1 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
                >
                  {customSubmitting ? "Creating..." : "Create Review"}
                </button>

                <button
                  type="button"
                  onClick={resetCustomReviewForm}
                  className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
                >
                  Clear
                </button>
              </div>
            </div>
          </form>

          <div className="space-y-4">
            <AdminVendorFilters
              isAdmin={isAdmin}
              searchInput={searchInput}
              setSearchInput={setSearchInput}
              handleSearch={handleSearch}
              rating={rating}
              setRating={setRating}
              setPage={setPage}
              source={source}
              setSource={setSource}
              productId={productId}
              setProductId={setProductId}
              products={products}
              handleClearSearch={handleClearSearch}
            />

            <ReviewList
              loading={loading}
              reviews={reviews}
              isAdmin={isAdmin}
              isVendor={isVendor}
              isCustomer={isCustomer}
              handleDelete={handleDelete}
              openReply={openReply}
              openEdit={openEdit}
            />

            <Pagination
              show={pagination?.totalPages > 1}
              page={page}
              setPage={setPage}
              pagination={pagination}
            />
          </div>
        </div>
      )}

      {isVendor && (
        <>
          <AdminVendorFilters
            isAdmin={false}
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            handleSearch={handleSearch}
            rating={rating}
            setRating={setRating}
            setPage={setPage}
            replyStatus={replyStatus}
            setReplyStatus={setReplyStatus}
            handleClearSearch={handleClearSearch}
          />

          {replyingReview && (
            <div
              id="vendor-reply-box"
              className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5"
            >
              <h2 className="mb-1 text-lg font-semibold text-white">
                Reply to Review
              </h2>

              <p className="mb-4 text-sm text-slate-400">
                Product: {replyingReview.product?.name || "Product"}
              </p>

              <form onSubmit={handleVendorReply} className="space-y-4">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  placeholder="Write vendor reply..."
                  className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-orange-500"
                />

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={replySubmitting}
                    className="rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {replySubmitting ? "Submitting..." : "Submit Reply"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setReplyingReview(null);
                      setReply("");
                    }}
                    className="rounded-lg bg-slate-700 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <ReviewList
            loading={loading}
            reviews={reviews}
            isAdmin={isAdmin}
            isVendor={isVendor}
            isCustomer={isCustomer}
            handleDelete={handleDelete}
            openReply={openReply}
            openEdit={openEdit}
          />

          <Pagination
            show={pagination?.totalPages > 1}
            page={page}
            setPage={setPage}
            pagination={pagination}
          />
        </>
      )}

      {isCustomer && (
        <>
          <ReviewList
            loading={loading}
            reviews={reviews}
            isAdmin={isAdmin}
            isVendor={isVendor}
            isCustomer={isCustomer}
            handleDelete={handleDelete}
            openReply={openReply}
            openEdit={openEdit}
          />

          {editingReview && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
              <h2 className="mb-4 text-lg font-semibold text-white">
                Edit Review
              </h2>

              <form onSubmit={handleUpdate} className="space-y-4">
                <select
                  value={editRating}
                  onChange={(e) => setEditRating(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-orange-500"
                >
                  <option value="5">5 Star - Excellent</option>
                  <option value="4">4 Star - Good</option>
                  <option value="3">3 Star - Average</option>
                  <option value="2">2 Star - Poor</option>
                  <option value="1">1 Star - Bad</option>
                </select>

                <textarea
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-4 py-3 text-white outline-none focus:border-orange-500"
                />

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    className="rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600"
                  >
                    Update Review
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingReview(null)}
                    className="rounded-lg bg-slate-700 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {!isAdmin && !isVendor && !isCustomer && (
        <div className="rounded-xl bg-slate-900 p-6 text-slate-300">
          You do not have permission to view reviews.
        </div>
      )}
    </div>
  );
}

function AdminVendorFilters({
  isAdmin,
  searchInput,
  setSearchInput,
  handleSearch,
  rating,
  setRating,
  setPage,
  replyStatus,
  setReplyStatus,
  source,
  setSource,
  productId,
  setProductId,
  products = [],
  handleClearSearch,
}) {
  return (
    <div className="grid gap-3 rounded-xl bg-slate-900 p-4 sm:grid-cols-2 lg:grid-cols-5">
      <input
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSearch();
        }}
        placeholder={
          isAdmin
            ? "Search product, reviewer, review"
            : "Search product, customer, review"
        }
        className="rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none lg:col-span-2"
      />

      <button
        type="button"
        onClick={handleSearch}
        className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
      >
        Search
      </button>

      {isAdmin && (
        <select
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none"
        >
          <option value="">All Products</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
      )}

      <select
        value={rating}
        onChange={(e) => {
          setRating(e.target.value);
          setPage(1);
        }}
        className="rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none"
      >
        <option value="">All Ratings</option>
        <option value="5">5 Star</option>
        <option value="4">4 Star</option>
        <option value="3">3 Star</option>
        <option value="2">2 Star</option>
        <option value="1">1 Star</option>
      </select>

      {isAdmin ? (
        <select
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none"
        >
          <option value="">All Sources</option>
          <option value="USER">User Reviews</option>
          <option value="ADMIN">Admin Added</option>
        </select>
      ) : (
        <select
          value={replyStatus}
          onChange={(e) => {
            setReplyStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none"
        >
          <option value="">All Reviews</option>
          <option value="replied">Replied</option>
          <option value="unreplied">Unreplied</option>
        </select>
      )}

      <button
        type="button"
        onClick={handleClearSearch}
        className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 sm:col-span-2 lg:col-span-5"
      >
        Clear Filter
      </button>
    </div>
  );
}

function ReviewList({
  loading,
  reviews,
  isAdmin,
  isVendor,
  isCustomer,
  handleDelete,
  openReply,
  openEdit,
}) {
  if (loading) {
    return (
      <div className="rounded-xl bg-slate-900 p-6 text-slate-300">
        Loading reviews...
      </div>
    );
  }

  if (!reviews.length) {
    return (
      <div className="rounded-xl bg-slate-900 p-6 text-slate-300">
        No reviews found.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {reviews.map((review) => {
        const productImage = getProductImage(review.product);
        const reviewerAvatar =
          review.displayReviewerAvatar ||
          review.user?.avatar ||
          review.reviewerAvatar ||
          "";

        return (
          <div
            key={review.id}
            className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm sm:p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex gap-3">
                  {isAdmin && (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-800 bg-[#0F172A]">
                      {productImage ? (
                        <img
                          src={productImage}
                          alt={review.product?.name || "Product"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs text-slate-500">IMG</span>
                      )}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-white sm:text-lg">
                      {review.product?.name || "Product"}
                    </h2>

                    {(isVendor || isAdmin) && (
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400 sm:text-sm">
                        <span>
                          Customer:{" "}
                          <span className="text-slate-200">
                            {getReviewerName(review)}
                          </span>
                        </span>

                        {isAdmin && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              review.source === "ADMIN"
                                ? "bg-purple-500/10 text-purple-300"
                                : "bg-blue-500/10 text-blue-300"
                            }`}
                          >
                            {review.source === "ADMIN"
                              ? "ADMIN ADDED"
                              : "USER"}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {isAdmin && reviewerAvatar && (
                  <div className="mt-3 flex items-center gap-2">
                    <img
                      src={reviewerAvatar}
                      alt={getReviewerName(review)}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                    <span className="text-xs text-slate-400">
                      Reviewer Avatar
                    </span>
                  </div>
                )}

                <div className="mt-2">
                  <Stars rating={review.rating} />
                </div>

                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
                  {review.comment || "No comment"}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  {review.createdAt
                    ? new Date(review.createdAt).toLocaleString()
                    : ""}
                </p>

                {review.vendorReply && (
                  <div className="mt-4 rounded-lg border border-orange-500/30 bg-orange-500/10 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-orange-300">
                      Vendor Reply
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-orange-100">
                      {review.vendorReply}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 sm:justify-end">
                {review.product?.slug && (
                  <Link
                    href={`/products/${review.product.slug}`}
                    className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-600"
                  >
                    View Product
                  </Link>
                )}

                {isVendor && (
                  <button
                    type="button"
                    onClick={() => openReply(review)}
                    className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-600"
                  >
                    {review.vendorReply ? "Update Reply" : "Reply"}
                  </button>
                )}

                {isCustomer && (
                  <>
                    <button
                      type="button"
                      onClick={() => openEdit(review)}
                      className="rounded-lg bg-blue-500 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-600"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(review.id)}
                      className="rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </>
                )}

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDelete(review.id)}
                    className="rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Pagination({ show, page, setPage, pagination }) {
  if (!show) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-slate-900 p-4 sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => setPage((p) => Math.max(p - 1, 1))}
        className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white disabled:opacity-40"
      >
        Previous
      </button>

      <span className="text-center text-sm text-slate-300">
        Page {pagination.page} of {pagination.totalPages}
      </span>

      <button
        type="button"
        disabled={page >= pagination.totalPages}
        onClick={() => setPage((p) => p + 1)}
        className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}