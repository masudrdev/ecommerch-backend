// // import axiosInstance from "@/lib/axiosInstance";

// export const createReviewApi = async (payload) => {
//   const res = await axiosInstance.post("/reviews", payload);
//   return res.data;
// };

// // export const getMyReviewsApi = async () => {
// //   const res = await axiosInstance.get("/reviews/my-reviews");
// //   return res.data;
// // };

// // export const updateReviewApi = async (id, payload) => {
// //   const res = await axiosInstance.patch(`/reviews/${id}`, payload);
// //   return res.data;
// // };

// // export const deleteReviewApi = async (id) => {
// //   const res = await axiosInstance.delete(`/reviews/${id}`);
// //   return res.data;
// // };

// // export const getVendorReviewsApi = async (params = {}) => {
// //   const res = await axiosInstance.get("/reviews/vendor", { params });
// //   return res.data;
// // };

// // export const getVendorProductReviewsApi = async (productId) => {
// //   const res = await axiosInstance.get(`/reviews/vendor/${productId}`);
// //   return res.data;
// // };

// // export const replyVendorReviewApi = async (reviewId, reply) => {
// //   const res = await axiosInstance.patch(`/reviews/vendor/reply/${reviewId}`, {
// //     reply,
// //   });
  
// //   return res.data;
// // };
// // export const reviewService = {
// //   getAdminReviews: async (params = {}) => {
// //     const res = await axiosInstance.get("/reviews/admin/all", {
// //       params,
// //     });

// //     return res.data;
// //   },

// //   createAdminCustomReview: async (payload) => {
// //     const res = await axiosInstance.post("/reviews/admin/custom", payload);
// //     return res.data;
// //   },

// //   deleteReview: async (id) => {
// //     const res = await axiosInstance.delete(`/reviews/${id}`);
// //     return res.data;
// //   },
// // };
// import axiosInstance from "@/lib/axiosInstance";

// export const getMyReviewsApi = async () => {
//   const res = await axiosInstance.get("/reviews/my-reviews");
//   return res.data;
// };

// export const getVendorReviewsApi = async (params = {}) => {
//   const res = await axiosInstance.get("/reviews/vendor", { params });
//   return res.data;
// };

// export const replyVendorReviewApi = async (reviewId, reply) => {
//   const res = await axiosInstance.patch(`/reviews/vendor/reply/${reviewId}`, { reply });
//   return res.data;
// };

// export const updateReviewApi = async (id, payload) => {
//   const res = await axiosInstance.patch(`/reviews/${id}`, payload);
//   return res.data;
// };

// export const deleteReviewApi = async (id) => {
//   const res = await axiosInstance.delete(`/reviews/${id}`);
//   return res.data;
// };

// export const getAdminReviewsApi = async (params = {}) => {
//   const res = await axiosInstance.get("/reviews/admin/all", { params });
//   return res.data;
// };

// export const createAdminCustomReviewApi = async (payload) => {
//   const res = await axiosInstance.post("/reviews/admin/custom", payload);
//   return res.data;
// };
import axiosInstance from "@/lib/axiosInstance";

// Customer creates a new review
export const createReviewApi = async (payload) => {
  const res = await axiosInstance.post("/reviews", payload);
  return res.data;
};

// Customer's own reviews
export const getMyReviewsApi = async () => {
  const res = await axiosInstance.get("/reviews/my-reviews");
  return res.data;
};

// Vendor reviews
export const getVendorReviewsApi = async (params = {}) => {
  const res = await axiosInstance.get("/reviews/vendor", { params });
  return res.data;
};

// Vendor replies to a review
export const replyVendorReviewApi = async (reviewId, reply) => {
  const res = await axiosInstance.patch(
    `/reviews/vendor/reply/${reviewId}`,
    { reply }
  );

  return res.data;
};

// Customer updates their review
export const updateReviewApi = async (id, payload) => {
  const res = await axiosInstance.patch(`/reviews/${id}`, payload);
  return res.data;
};

// Delete review
export const deleteReviewApi = async (id) => {
  const res = await axiosInstance.delete(`/reviews/${id}`);
  return res.data;
};

// Admin gets all reviews
export const getAdminReviewsApi = async (params = {}) => {
  const res = await axiosInstance.get("/reviews/admin/all", { params });
  return res.data;
};

// Admin creates a custom review
export const createAdminCustomReviewApi = async (payload) => {
  const res = await axiosInstance.post("/reviews/admin/custom", payload);
  return res.data;
};