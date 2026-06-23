import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { Readable } from "stream";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer memory storage
const storage = multer.memoryStorage();

// Validate file type
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, and WEBP images are allowed."), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB limit
  },
  fileFilter,
});

/**
 * Helper to expand flattened request body keys (like name[en]) into nested objects.
 * Useful for multipart/form-data where clients send nested objects as flat keys.
 */
const expandFlatKeys = (obj) => {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const matches = key.match(/^([^\[]+)|\[([^\]]+)\]/g);
    if (matches && matches.length > 1) {
      const path = matches.map((m) => m.replace(/[\[\]]/g, ""));
      let current = result;
      for (let i = 0; i < path.length; i++) {
        const part = path[i];
        if (i === path.length - 1) {
          current[part] = value;
        } else {
          current[part] = current[part] || {};
          current = current[part];
        }
      }
    } else {
      result[key] = value;
    }
  }
  return result;
};

/**
 * Middleware to parse multipart/form-data request body and files.
 * Does NOT perform Cloudinary upload yet.
 */
export const parseForm = (fieldName = "image") => {
  const parse = upload.single(fieldName);

  return (req, res, next) => {
    parse(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
          code: "FILE_UPLOAD_ERROR",
        });
      }

      // Expand any flat keys in request body (e.g. name[en] -> name.en)
      if (req.body) {
        req.body = expandFlatKeys(req.body);
      }

      next();
    });
  };
};

/**
 * Middleware to upload parsed memory files to Cloudinary.
 * Expects req.file to be set by parseForm.
 */
export const uploadToCloudinary = (folder = "general") => {
  return async (req, res, next) => {
    if (!req.file) {
      return next();
    }

    try {
      const uploadStream = () => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: `food-ordering/${folder}`,
              resource_type: "image",
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );

          Readable.from(req.file.buffer).pipe(stream);
        });
      };

      const result = await uploadStream();
      req.body.image = result.secure_url;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Cloudinary upload failed: ${error.message}`,
        code: "CLOUDINARY_UPLOAD_ERROR",
      });
    }
  };
};
