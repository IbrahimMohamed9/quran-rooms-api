import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

/**
 * Decorator for handling image uploads with Cloudinary
 * Configures the FileInterceptor with memory storage for Cloudinary uploads
 *
 * @returns Decorator function
 */
export function ImageUpload() {
  return applyDecorators(
    UseInterceptors(
      FileInterceptor('photo', {
        storage: memoryStorage(),
        fileFilter: (req, file, callback) => {
          if (
            !file.originalname.match(/\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i)
          ) {
            return callback(new Error('Only image files are allowed!'), false);
          }
          callback(null, true);
        },
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB max file size (Cloudinary limit)
        },
      }),
    ),
  );
}
