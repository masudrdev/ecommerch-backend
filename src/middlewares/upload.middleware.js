import multer from "multer";

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});
const vendorLogoMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export const vendorLogoUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!vendorLogoMimeTypes.has(file.mimetype)) {
      return callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
    }
    callback(null, true);
  },
});
export const uploadVendorLogo = (req, res, next) => {
  vendorLogoUpload.single("logoFile")(req, res, (error) => {
    if (!error) return next();
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Vendor logo must be 5 MB or smaller"
      : "Please upload a JPG, PNG, or WebP image";
    return res.status(400).json({ success: false, message });
  });
};
const heroImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const heroImageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!heroImageMimeTypes.has(file.mimetype)) {
      return callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
    }
    callback(null, true);
  },
});

export const uploadHeroImage = (req, res, next) => {
  heroImageUpload.single("imageFile")(req, res, (error) => {
    if (!error) return next();
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Hero image must be 5 MB or smaller"
      : "Please upload a JPG, PNG, or WebP image";
    return res.status(400).json({ success: false, message });
  });
};