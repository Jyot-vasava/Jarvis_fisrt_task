import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { Request, Response, NextFunction } from "express";
import Settings from "../Model/settings.Model";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (_req: Request, _file, cb) => {
    cb(null, path.join(__dirname, "../public/uploads"));
  },
  filename: (_req: Request, file, cb) => {
    cb(null, Date.now() + "_" + file.originalname);
  },
});

export const upload = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await Settings.findOne();

    if (!settings) {
      res.status(500).json({ message: "Settings not found. Please configure upload settings." });
      return;
    }

    const allowedTypes = settings.allowFileTypes;
    const maxSize = settings.maxFileSize * 1024 * 1024;

   
    const uploadMiddleware = multer({
      storage,
      limits: { fileSize: maxSize },
      fileFilter: (_req: Request,
         file: Express.Multer.File, 
         cb: multer.FileFilterCallback) => {

        const ext = path.extname(file.originalname).replace(".", "");

        if (!allowedTypes.includes(ext)) {
          return cb(
            new Error(
              `File type '.${ext}' is not allowed. Allowed types: ${allowedTypes.join(", ")}`
            )
          );
        }

        cb(null, true);
      },
    }).single("file");
   
    uploadMiddleware(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ 
            message: `File size exceeds the maximum limit of ${settings.maxFileSize}MB` 
          });
        }
        return res.status(400).json({ message: err.message });
      } else if (err) {
        return res.status(400).json({ message: err.message });
      }
      
      next();
    });
  } catch (error) {
    console.error("Upload middleware error:", error);
    res.status(500).json({ 
      message: "Internal server error during file upload"
    });
  }
};