import { Router, Request, Response } from 'express';
import { upload } from '../Middlewares/multer.Middleware';

const router = Router();

router.post("/upload", upload, (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({
      message: "No file uploaded" 
    });
  }

  res.json({
    message: "File uploaded successfully",
    data: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    }
  });
});

export default router;