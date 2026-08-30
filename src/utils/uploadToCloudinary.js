import cloudinary from "../config/cloudinary.js";

const uploadToCloudinary = (
  fileBuffer,
  folder = "friendbazar/products",
  uploadOptions = {}
) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type: "image",
          ...uploadOptions,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      )
      .end(fileBuffer);
  });
};

export default uploadToCloudinary;