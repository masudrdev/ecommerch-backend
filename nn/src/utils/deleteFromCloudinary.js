import cloudinary from "../config/cloudinary.js";

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return null;

  return cloudinary.uploader.destroy(publicId);
};

export default deleteFromCloudinary;