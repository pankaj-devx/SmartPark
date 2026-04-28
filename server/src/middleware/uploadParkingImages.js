import multer from 'multer';
import { createHttpError } from '../utils/createHttpError.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5
  },
  fileFilter(_req, file, callback) {
    if (!file.mimetype.startsWith('image/')) {
      callback(createHttpError(400, 'Only image uploads are allowed'));
      return;
    }

    callback(null, true);
  }
});

export function uploadParkingImages(req, res, next) {
  upload.array('images', 5)(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      next(createHttpError(400, error.message));
      return;
    }

    next(error);
  });
}
