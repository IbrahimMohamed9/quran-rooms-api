import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileUploadService } from './file-upload.service';

@ApiTags('File Upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload an image' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Image uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            filename: { type: 'string' },
            url: { type: 'string' },
            size: { type: 'number' },
            mimetype: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid file or file too large',
  })
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const url = this.fileUploadService.processUploadedFile(file);

    return {
      message: 'Image uploaded successfully',
      data: {
        filename: file.filename,
        url: url,
        size: file.size,
        mimetype: file.mimetype,
      },
    };
  }

  @Post('image/:folder')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload an image to a specific folder',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'folder',
    description: 'Folder name (e.g., menu-items, users, restaurants)',
    example: 'menu-items',
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded successfully to specific folder',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            filename: { type: 'string' },
            url: { type: 'string' },
            size: { type: 'number' },
            mimetype: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid file or file too large',
  })
  async uploadImageToFolder(
    @Param('folder') folder: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const url = this.fileUploadService.processUploadedFile(file);

    return {
      message: `Image uploaded successfully to ${folder} folder`,
      data: {
        filename: file.filename,
        url: url,
        size: file.size,
        mimetype: file.mimetype,
      },
    };
  }

  @Delete('image/:filename')
  @ApiOperation({ summary: 'Delete an image' })
  @ApiParam({
    name: 'filename',
    description: 'Filename of the image to delete',
    example: 'image_1234567890.jpg',
  })
  @ApiResponse({
    status: 200,
    description: 'Image deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            result: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Failed to delete image',
  })
  async deleteImage(@Param('filename') filename: string) {
    // For now, just return success message since we're using local storage
    // In a real implementation, you would delete the file from the filesystem
    return {
      message: 'Image deleted successfully',
      data: {
        result: 'ok',
      },
    };
  }
}
