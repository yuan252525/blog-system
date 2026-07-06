import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Res,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { UploadsService } from './uploads.service.js';
import { InitUploadDto, UploadChunkDto, QueryUploadDto } from './uploads.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';

interface AuthenticatedRequest extends Request {
  user: { id: string; username: string; email: string };
}

@ApiTags('uploads')
@ApiBearerAuth('JWT-auth')
@Controller('uploads')
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  /** 初始化上传：创建上传记录和分片列表 */
  @Post()
  @ApiOperation({ summary: '初始化上传', description: '创建上传记录，返回 uploadId 和总分片数' })
  @ApiResponse({ status: 201, description: '上传初始化成功' })
  initUpload(@Body() dto: InitUploadDto, @Req() req: AuthenticatedRequest) {
    return this.uploadsService.initUpload(dto, req.user.id);
  }

  /** 上传单个分片（二进制） */
  @Post(':uploadId/chunks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '上传分片', description: '上传单个分片到 MinIO，支持断点续传' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: '分片上传成功' })
  @UseInterceptors(FileInterceptor('chunk'))
  uploadChunk(
    @Param('uploadId') uploadId: string,
    @Body() body: UploadChunkDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.uploadsService.uploadChunk(
      uploadId,
      body.chunkIndex,
      file.buffer,
      body.hash,
      req.user.id,
    );
  }

  /** 查询上传状态（已上传的分片列表） */
  @Get(':uploadId')
  @ApiOperation({ summary: '获取上传状态', description: '获取当前已上传的分片列表和进度，支持断点续传' })
  @ApiResponse({ status: 200, description: '上传状态' })
  getStatus(@Param('uploadId') uploadId: string, @Req() req: AuthenticatedRequest) {
    return this.uploadsService.getUploadStatus(uploadId, req.user.id);
  }

  /** 列出用户所有上传记录 */
  @Get()
  @ApiOperation({ summary: '列出上传记录', description: '列出当前用户的所有上传记录' })
  @ApiResponse({ status: 200, description: '上传列表' })
  listUploads(@Query() query: QueryUploadDto, @Req() req: AuthenticatedRequest) {
    return this.uploadsService.listUploads(query, req.user.id);
  }

  /** 完成上传：合并分片并生成访问 URL */
  @Post(':uploadId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '完成上传', description: '合并所有已上传的分片，生成最终文件访问 URL' })
  @ApiResponse({ status: 200, description: '上传完成' })
  completeUpload(@Param('uploadId') uploadId: string, @Req() req: AuthenticatedRequest) {
    return this.uploadsService.completeUpload(uploadId, req.user.id);
  }

  /** 通过代理下载文件（公开访问，用于图片等静态资源展示） */
  @Get(':uploadId/file')
  @Public()
  @ApiOperation({ summary: '代理下载文件', description: '通过后端代理从 MinIO 获取文件，解决跨主机签名问题' })
  @ApiResponse({ status: 200, description: '文件流' })
  streamFile(@Param('uploadId') uploadId: string, @Res() res: Response) {
    return this.uploadsService.streamFile(uploadId, res);
  }

  /** 取消上传 */
  @Delete(':uploadId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '取消上传', description: '取消进行中的上传，清理临时分片' })
  @ApiResponse({ status: 200, description: '上传已取消' })
  cancelUpload(@Param('uploadId') uploadId: string, @Req() req: AuthenticatedRequest) {
    return this.uploadsService.cancelUpload(uploadId, req.user.id);
  }
}
