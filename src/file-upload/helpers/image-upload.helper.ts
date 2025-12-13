import { Injectable } from '@nestjs/common';
import { FileUploadService } from '../file-upload.service';

/**
 * Helper service for file upload operations
 */
@Injectable()
export class ImageUploadHelper {
  constructor(private readonly fileUploadService: FileUploadService) {}

  /**
   * Upload image and return URL
   *
   * @param photo Uploaded file
   * @param folder Optional subfolder (e.g., 'users', 'meals', 'menu-items')
   * @returns Promise with image URL or empty string
   */
  async uploadImageAndGetUrl(
    photo: Express.Multer.File | undefined,
    folder?: string,
  ): Promise<string> {
    if (!photo) {
      return '';
    }

    try {
      const url = this.fileUploadService.processUploadedFile(photo);
      return url || '';
    } catch (error) {
      console.error('Failed to upload image:', error);
      return '';
    }
  }

  /**
   * @deprecated Use uploadImageAndGetUrl instead
   * This method is kept for backward compatibility but will return empty string
   * since we no longer use local file storage
   */
  extractImageUrl(): string {
    console.warn(
      'extractImageUrl is deprecated. Use uploadImageAndGetUrl instead.',
    );
    return '';
  }
}
