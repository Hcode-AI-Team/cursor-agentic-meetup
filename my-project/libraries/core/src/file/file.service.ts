import {
  GetBucketNotificationConfigurationCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutBucketNotificationConfigurationCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  AddPermissionCommand,
  CreateFunctionCommand,
  GetFunctionConfigurationCommand,
  LambdaClient,
  UpdateFunctionCodeCommand,
  UpdateFunctionConfigurationCommand,
} from '@aws-sdk/client-lambda';
import {
  AssumeRoleCommand,
  GetSessionTokenCommand,
  STSClient,
} from '@aws-sdk/client-sts';
import { getLocaleText } from '@hed-hog/api-locale';
import { PaginationDTO, PaginationService } from '@hed-hog/api-pagination';
import { PrismaService } from '@hed-hog/api-prisma';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createWriteStream, promises as fs } from 'fs';
import { basename, dirname, extname } from 'path';
import { pipeline } from 'stream/promises';
import {
  buildStorageConfigFromIntegration,
  resolveFileProviderSlug,
  resolveStorageEnumProvider,
} from '../integration-profile/integration-profile.utils';
import { SettingService } from '../setting/setting.service';
import { DeleteDTO } from './dto/delete.dto';
import { ImageOptimizationService } from './image-optimization.service';
import { AbstractProvider } from './provider/abstract.provider';
import { ProviderFactory } from './provider/provider.factory';

@Injectable()
export class FileService implements OnModuleInit {
  private readonly logger = new Logger(FileService.name);
  private providerId: number | undefined;
  private mimetypes: Record<string, number> = {};

  private resolveProviderPath(file: { location: string; path: string }): string {
    // Supports legacy basename-only values while prioritizing full provider keys.
    if (typeof file.path === 'string' && file.path.includes('/')) {
      return file.path;
    }

    return `${file.location}/${file.path}`;
  }

  private hasMojibake(value: string): boolean {
    return /Ã.|Â.|â[\u0080-\u00BF]/.test(value);
  }

  private normalizeUploadedFilename(filename: string): string {
    if (!filename) {
      return filename;
    }

    if (!this.hasMojibake(filename)) {
      return filename;
    }

    const decoded = Buffer.from(filename, 'latin1').toString('utf8');
    return this.hasMojibake(decoded) ? filename : decoded;
  }

  constructor(
    @Inject(forwardRef(() => PrismaService))
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => PaginationService))
    private readonly paginationService: PaginationService,
    @Inject(forwardRef(() => SettingService))
    private readonly settingService: SettingService,
    @Inject(forwardRef(() => JwtService))
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => ImageOptimizationService))
    private readonly imageOptimizationService: ImageOptimizationService,
  ) { }

  async onModuleInit() {
    try {
      await this.getProvider();
    } catch (error) {
      // No storage profile configured yet — server starts normally, uploads will
      // fail until a profile is selected in Settings → File Storage.
      this.logger.warn(
        `Storage provider not ready on startup: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getProvider(): Promise<AbstractProvider> {
    const settings = await this.settingService.getSettingValues(['file-storage-profile-id']);
    const profileSlug = String(settings['file-storage-profile-id'] ?? '').trim();

    if (!profileSlug) {
      throw new BadRequestException('No file storage profile configured. Set a storage profile in the File Storage settings.');
    }

    const profile = await this.prismaService.integration_profile.findUnique({
      where: { slug: profileSlug },
      include: {
        integration_type: { select: { slug: true } },
        integration_provider: { select: { slug: true } },
      },
    });

    if (!profile) {
      throw new NotFoundException(`Storage profile with slug "${profileSlug}" not found.`);
    }

    if (profile.integration_type.slug !== 'storage') {
      throw new BadRequestException(
        `Integration profile with slug "${profileSlug}" is not a storage profile.`,
      );
    }

    const providerSlug = profile.integration_provider.slug;
    const config = buildStorageConfigFromIntegration(providerSlug, profile.config);
    const enumProvider = resolveStorageEnumProvider(providerSlug);
    const fileProviderSlug = resolveFileProviderSlug(providerSlug);

    const providerData = await this.prismaService.file_provider.findFirst({
      where: { slug: fileProviderSlug },
      select: { id: true },
    });

    if (!providerData) {
      throw new BadRequestException(`Provider ${fileProviderSlug} not found.`);
    }

    this.providerId = providerData.id;
    return await ProviderFactory.create(enumProvider, config, this.jwtService);
  }

  async getMimeType(mimetype: string) {

    if (!mimetype) {
      throw new BadRequestException(`No mimetype provided`);
    }

    if (this.mimetypes[mimetype]) {
      return this.mimetypes[mimetype];
    }

    let result = await this.prismaService.file_mimetype.findFirst({
      where: {
        name: mimetype,
      },
    });

    if (!result) {
      result = await this.prismaService.file_mimetype.create({
        data: {
          name: mimetype,
        },
      });
    }

    return (this.mimetypes[mimetype] = result.id);
  }

  async acceptMimetypes(mimetype: string) {
    if (!mimetype) {
      throw new BadRequestException(`No mimetype provided`);
    }

    const settings = await this.settingService.getSettingValues(['storage-accept-mimetype']);
    const acceptMimetypes = settings['storage-accept-mimetype'];
    return acceptMimetypes.indexOf(mimetype) !== -1;
  }

  async maxFileSize(size: number) {
    if (!size) {
      throw new BadRequestException(`No size provided`);
    }

    const settings = await this.settingService.getSettingValues(['storage-max-size']);
    return size <= Number(settings['storage-max-size']);
  }

  async uploadFromString(
    destination: string,
    filename: string,
    filecontent: string,
    mimetype = 'text/plain',
  ) {

    if (!filecontent) {
      throw new BadRequestException(`No file content provided`);
    }

    if (!destination) {
      throw new BadRequestException(`No destination provided`);
    }

    if (!filename) {
      throw new BadRequestException(`No filename provided`);
    }

    const effectiveMimetype = await this.resolveEffectiveMimetype(mimetype, filename);

    const provider = await this.getProvider();

    if (!(await this.acceptMimetypes(effectiveMimetype))) {
      throw new BadRequestException(`Invalid file type: ${effectiveMimetype}`);
    }

    const url = await provider.uploadFromString(
      destination,
      filename,
      filecontent,
      effectiveMimetype,
    );

    const file = await this.prismaService.file.create({
      data: {
        filename,
        path: url,
        provider_id: this.providerId,
        location: destination,
        mimetype_id: await this.getMimeType(effectiveMimetype),
        size: filecontent.length,
      },
    });

    return file;
  }

  private mapStorageNotFoundError(error: any, fileId: number) {
    const missingInStorage =
      error?.name === 'NoSuchKey' ||
      error?.Code === 'NoSuchKey' ||
      error?.$metadata?.httpStatusCode === 404;

    if (missingInStorage) {
      throw new NotFoundException(`File not found in storage: ${fileId}`);
    }

    throw error;
  }

  async openReadStreamById(fileId: number) {
    if (!fileId) {
      throw new BadRequestException(`No file ID provided`);
    }

    const file = await this.prismaService.file.findUnique({
      where: {
        id: fileId,
      },
      include: {
        file_mimetype: true,
      },
    });

    if (!file) {
      throw new NotFoundException(`File not found: ${fileId}`);
    }

    const provider = await this.getProvider();
    const providerPath = this.resolveProviderPath(file);

    let metadata: any;
    try {
      metadata = await provider.metaData(providerPath);
    } catch {
      metadata = undefined;
    }

    try {
      const stream = await provider.readStream(providerPath);
      return {
        file,
        stream,
        size: file.size ?? this.getFileSizeFromMetadata(metadata),
      };
    } catch (error) {
      this.mapStorageNotFoundError(error, fileId);
    }
  }

  async openReadStreamWithRange(fileId: number, start?: number, end?: number) {
    if (!fileId) throw new BadRequestException('No file ID provided');

    const file = await this.prismaService.file.findUnique({
      where: { id: fileId },
      include: { file_mimetype: true },
    });

    if (!file) throw new NotFoundException(`File not found: ${fileId}`);

    const provider = await this.getProvider();
    const providerPath = this.resolveProviderPath(file);
    const totalSize: number = file.size ?? 0;

    const resolvedStart = start ?? 0;
    const resolvedEnd = end !== undefined ? end : totalSize > 0 ? totalSize - 1 : undefined;
    const hasRange = start !== undefined;

    const stream = await provider.readStream(
      providerPath,
      hasRange ? { start: resolvedStart, end: resolvedEnd } : undefined,
    );

    const contentLength =
      resolvedEnd !== undefined ? resolvedEnd - resolvedStart + 1 : totalSize;

    return {
      file,
      stream,
      totalSize,
      start: resolvedStart,
      end: resolvedEnd,
      contentLength,
      mimetype: file.file_mimetype?.name ?? 'application/octet-stream',
    };
  }

  async downloadToPath(
    fileId: number,
    destinationPath: string,
    options?: { maxBytes?: number },
  ) {
    if (!destinationPath) {
      throw new BadRequestException(`No destination path provided`);
    }

    const { file, stream, size } = await this.openReadStreamById(fileId);

    if (options?.maxBytes && size && size > options.maxBytes) {
      throw new BadRequestException(
        `File too large for streaming download: ${size} bytes (max ${options.maxBytes})`,
      );
    }

    await fs.mkdir(dirname(destinationPath), { recursive: true });

    try {
      await pipeline(stream, createWriteStream(destinationPath));
      const stats = await fs.stat(destinationPath);

      if (options?.maxBytes && stats.size > options.maxBytes) {
        await fs.unlink(destinationPath).catch(() => undefined);
        throw new BadRequestException(
          `File too large for streaming download: ${stats.size} bytes (max ${options.maxBytes})`,
        );
      }

      return {
        file,
        path: destinationPath,
        size: stats.size,
      };
    } catch (error) {
      await fs.unlink(destinationPath).catch(() => undefined);
      throw error;
    }
  }

  async getBuffer(fileId: number) {

    if (!fileId) {
      throw new BadRequestException(`No file ID provided`);
    }

    const file = await this.prismaService.file.findUnique({
      where: {
        id: fileId,
      },
      include: {
        file_mimetype: true,
      },
    });

    if (!file) {
      throw new NotFoundException(`File not found: ${fileId}`);
    }
    
    const provider = await this.getProvider();
    const providerPath = this.resolveProviderPath(file);

    let providerBuffer: Buffer;
    try {
      providerBuffer = await provider.buffer(providerPath);
    } catch (error: any) {
      const missingInStorage =
        error?.name === 'NoSuchKey' ||
        error?.Code === 'NoSuchKey' ||
        error?.$metadata?.httpStatusCode === 404;

      if (missingInStorage) {
        throw new NotFoundException(`File not found in storage: ${fileId}`);
      }

      throw error;
    }

    const buffer = Buffer.from(providerBuffer);

    return {
      file,
      buffer,
    };
  }

  async getLocalFile(fileId: number, res: any){
    const { buffer, file } = await this.getBuffer(fileId);
    res.set({
      'Content-Type': file.file_mimetype.name,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  async upload(
    destination: string,
    fileBuffer: MulterFile,
    resize?: { maxWidth?: number; maxHeight?: number },
  ) {

    if (!fileBuffer) {
      throw new BadRequestException(`No file provided`);
    }

    if (!destination) {
      throw new BadRequestException(`No destination provided`);
    }

    const provider = await this.getProvider();

    if (!(await this.acceptMimetypes(fileBuffer.mimetype))) {
      throw new BadRequestException(
        `Invalid file type: ${fileBuffer.mimetype}`,
      );
    }

    if (!(await this.maxFileSize(fileBuffer.size))) {
      throw new BadRequestException(`File too large: ${fileBuffer.size} bytes`);
    }

    const normalizedFilename = this.normalizeUploadedFilename(
      fileBuffer.originalname,
    );

    const effectiveMimetype = await this.resolveEffectiveMimetype(
      fileBuffer.mimetype,
      normalizedFilename,
      fileBuffer.buffer,
    );

    const optimized = await this.imageOptimizationService.optimizeBuffer(
      fileBuffer.buffer,
      effectiveMimetype,
      normalizedFilename,
      { maxWidth: resize?.maxWidth, maxHeight: resize?.maxHeight },
    );

    const normalizedFile = {
      ...fileBuffer,
      buffer: optimized.buffer,
      mimetype: optimized.mimetype,
      originalname: optimized.originalname,
      size: optimized.buffer.length,
    };

    const url = await provider.upload(destination, normalizedFile);

    const file = await this.prismaService.file.create({
      data: {
        filename: optimized.originalname,
        path: url,
        provider_id: this.providerId,
        location: destination,
        mimetype_id: await this.getMimeType(optimized.mimetype),
        size: optimized.buffer.length,
      },
    });

    return file;
  }

  async uploadFromPath(
    destination: string,
    filePath: string,
    metadata?: {
      originalname?: string;
      filename?: string;
      mimetype?: string;
      size?: number;
      encoding?: string;
      skipMimeValidation?: boolean;
      skipSizeValidation?: boolean;
    },
  ) {
    if (!filePath) {
      throw new BadRequestException(`No file path provided`);
    }

    if (!destination) {
      throw new BadRequestException(`No destination provided`);
    }

    const stats = await fs.stat(filePath).catch(() => null);
    if (!stats || !stats.isFile()) {
      throw new NotFoundException(`File path not found: ${filePath}`);
    }

    const size = metadata?.size ?? stats.size;
    const originalname = this.normalizeUploadedFilename(
      metadata?.originalname ?? metadata?.filename ?? basename(filePath),
    );
    // Recupera o tipo real quando o caller não informou o mimetype (default antigo era
    // application/octet-stream, que fazia imagens caírem fora da otimização e do serve).
    const mimetype = await this.resolveEffectiveMimetype(
      metadata?.mimetype,
      originalname,
    );

    if (!metadata?.skipMimeValidation && !(await this.acceptMimetypes(mimetype))) {
      throw new BadRequestException(`Invalid file type: ${mimetype}`);
    }

    if (!metadata?.skipSizeValidation && !(await this.maxFileSize(size))) {
      throw new BadRequestException(`File too large: ${size} bytes`);
    }

    const provider = await this.getProvider();

    // Para não-imagens (ex.: pacotes SCORM .zip de vários GB), enviamos por
    // streaming direto do disco via provider.uploadFromPath. Isso evita carregar
    // o arquivo inteiro na RAM (fs.readFile estoura o limite de Buffer / causa OOM)
    // e habilita upload multipart no S3. A otimização de imagem só se aplica a
    // image/*, então não há perda nesse caminho.
    if (!mimetype.startsWith('image/')) {
      const url = await provider.uploadFromPath(destination, filePath, {
        filename: originalname,
        mimetype,
      });

      return this.prismaService.file.create({
        data: {
          filename: originalname,
          path: url,
          provider_id: this.providerId,
          location: destination,
          mimetype_id: await this.getMimeType(mimetype),
          size,
        },
      });
    }

    // Read buffer to allow image optimization regardless of provider support
    const rawBuffer = await fs.readFile(filePath);
    const optimized = await this.imageOptimizationService.optimizeBuffer(
      rawBuffer,
      mimetype,
      originalname,
    );

    const url = await provider.upload(destination, {
      fieldname: 'file',
      originalname: optimized.originalname,
      encoding: metadata?.encoding ?? '7bit',
      mimetype: optimized.mimetype,
      size: optimized.buffer.length,
      destination: '',
      filename: optimized.originalname,
      path: filePath,
      buffer: optimized.buffer,
    });

    const file = await this.prismaService.file.create({
      data: {
        filename: optimized.originalname,
        path: url,
        provider_id: this.providerId,
        location: destination,
        mimetype_id: await this.getMimeType(optimized.mimetype),
        size: optimized.buffer.length,
      },
    });

    return file;
  }

  /**
   * Re-applies the current image-optimization settings to an already-stored file,
   * rewriting it in place: the `file` record keeps the same id, so every row that
   * references it (course_image, course_lesson_video_frame, ...) stays valid without
   * any FK juggling. Only replaces the stored object when the optimized result is
   * strictly smaller or the mimetype changed (e.g. PNG → WebP) — this keeps the
   * operation idempotent and avoids repeated lossy recompression. Non-image files are
   * left untouched.
   */
  async reoptimizeFile(fileId: number): Promise<{
    changed: boolean;
    oldSize: number;
    newSize: number;
    mimetypeChanged: boolean;
  }> {
    const { file, buffer } = await this.getBuffer(fileId);
    const currentMimetype = file.file_mimetype.name;
    const oldSize = file.size ?? buffer.length;

    if (!currentMimetype.startsWith('image/')) {
      return { changed: false, oldSize, newSize: oldSize, mimetypeChanged: false };
    }

    const optimized = await this.imageOptimizationService.optimizeBuffer(
      buffer,
      currentMimetype,
      file.filename,
    );

    const mimetypeChanged = optimized.mimetype !== currentMimetype;
    const smaller = optimized.buffer.length < oldSize;

    if (!mimetypeChanged && !smaller) {
      return {
        changed: false,
        oldSize,
        newSize: optimized.buffer.length,
        mimetypeChanged: false,
      };
    }

    const provider = await this.getProvider();
    const destination = file.location;
    const oldPath = file.path;

    const newUrl = await provider.upload(destination, {
      fieldname: 'file',
      originalname: optimized.originalname,
      encoding: '7bit',
      mimetype: optimized.mimetype,
      size: optimized.buffer.length,
      destination: '',
      filename: optimized.originalname,
      path: '',
      buffer: optimized.buffer,
    });

    await this.prismaService.file.update({
      where: { id: fileId },
      data: {
        path: newUrl,
        filename: optimized.originalname,
        size: optimized.buffer.length,
        mimetype_id: await this.getMimeType(optimized.mimetype),
      },
    });

    // Best-effort cleanup of the previous stored object; an orphaned blob must not
    // fail the optimization since the DB already points at the new object.
    const oldResolved = this.resolveProviderPath({ location: destination, path: oldPath });
    const newResolved = this.resolveProviderPath({ location: destination, path: newUrl });
    if (oldResolved !== newResolved) {
      try {
        await provider.delete(oldResolved);
      } catch (err) {
        this.logger.warn(
          `reoptimizeFile(${fileId}): failed to delete previous object "${oldResolved}": ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return {
      changed: true,
      oldSize,
      newSize: optimized.buffer.length,
      mimetypeChanged,
    };
  }

  async delete(locale:string,{ ids }: DeleteDTO) {
    const files = await this.prismaService.file.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        location: true,
        path: true,
      },
    });

    if (files.length !== ids.length) {
      throw new BadRequestException(getLocaleText('file.delete.some_not_found', locale, `Some files not found`));
    }

    for (const file of files) {
      await (await this.getProvider()).delete(this.resolveProviderPath(file));

      await this.prismaService.file.deleteMany({
        where: {
          id: file.id,
        },
      });
    }

    return files.map((file) => file.id);
  }

  async getFiles(paginationParams: PaginationDTO) {
    const fields = ['filename', 'path'];
    const OR = this.prismaService.createInsensitiveSearch(
      fields,
      paginationParams,
    );

    return this.paginationService.paginate(
      this.prismaService.file,
      paginationParams,
      {
        where: {
          OR,
        },
      },
    );
  }

  async get(fileId: number) {
    const file = await this.prismaService.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException(`File not found: ${fileId}`);
    }

    return file;
  }

  async readStream(filepath: string) {
    return (await this.getProvider()).readStream(filepath);
  }

  private getFileSizeFromMetadata(metadata: any): number | undefined {
    if (!metadata) {
      return undefined;
    }

    if (typeof metadata.size === 'number') {
      return metadata.size;
    }

    if (typeof metadata.ContentLength === 'number') {
      return metadata.ContentLength;
    }

    if (typeof metadata.contentLength === 'number') {
      return metadata.contentLength;
    }

    if (
      Array.isArray(metadata) &&
      metadata[0] &&
      metadata[0].size !== undefined
    ) {
      const gcsSize = Number(metadata[0].size);
      return Number.isNaN(gcsSize) ? undefined : gcsSize;
    }

    return undefined;
  }

  async download(locale:string, token: string) {
    try {
      const { filepath } = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      // Buscar o arquivo no banco para pegar nome original e mimetype
      const file = await this.prismaService.file.findFirst({
        where: { path: filepath },
        include: {
          file_mimetype: true,
        },
      });

      if (!file) {
        throw new NotFoundException(getLocaleText('file.download.not_found', locale, `Not found: ${filepath}`));
      }

      const provider = await this.getProvider();
      const providerPath = this.resolveProviderPath(file);
      const metadata = await provider.metaData(providerPath);
      const stream = await provider.readStream(providerPath);
      const size = this.getFileSizeFromMetadata(metadata);
      
      return {
        stream,
        filename: file?.filename || 'download',
        mimetype: file?.file_mimetype?.name || 'application/octet-stream',
        size,
      };
    } catch (error: any) {
      throw new BadRequestException(getLocaleText('file.download.invalid_token', locale, error.message));
    }
  }

  async openById(locale: string, fileId: number) {
    const file = await this.prismaService.file.findFirst({
      where: { id: fileId },
      include: {
        file_mimetype: true,
      },
    });

    if (!file) {
      throw new NotFoundException(
        getLocaleText('file.download.not_found', locale, `Not found: ${fileId}`),
      );
    }

    const provider = await this.getProvider();
    const providerPath = this.resolveProviderPath(file);
    const metadata = await provider.metaData(providerPath);
    const stream = await provider.readStream(providerPath);
    const size = this.getFileSizeFromMetadata(metadata);

    return {
      stream,
      filename: file?.filename || 'download',
      mimetype: file?.file_mimetype?.name || 'application/octet-stream',
      size,
    };
  }

  private async getCacheTtl(slug: string, fallback: number): Promise<number> {
    const settings = await this.settingService.getSettingValues(slug);
    const value = Number(settings[slug]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  /**
   * Resolves the file record and its storage metadata (mimetype + size) without
   * opening a read stream — so callers can answer a conditional 304 cheaply.
   */
  private async resolveFileMeta(locale: string, id: number) {
    const file = await this.prismaService.file.findFirst({
      where: { id },
      include: { file_mimetype: true },
    });

    if (!file) {
      throw new NotFoundException(
        getLocaleText('file.download.not_found', locale, `Not found: ${id}`),
      );
    }

    const provider = await this.getProvider();
    const providerPath = this.resolveProviderPath(file);
    const metadata = await provider.metaData(providerPath);
    const size = this.getFileSizeFromMetadata(metadata);

    return {
      provider,
      providerPath,
      size,
      mimetype: file?.file_mimetype?.name || 'application/octet-stream',
      filename: file?.filename || 'download',
    };
  }

  private setInlineHeaders(
    res: any,
    filename: string,
    mimetype: string,
    size: number | undefined,
    cacheControl: string,
    etag: string,
  ) {
    const encodedFilename = encodeURIComponent(filename);
    res.set({
      'Content-Type': mimetype || 'application/octet-stream',
      'Content-Disposition':
        `inline; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
      'Cache-Control': cacheControl,
      ETag: etag,
    });
    if (typeof size === 'number') {
      res.set('Content-Length', `${size}`);
    }
  }

  /**
   * Best-effort image MIME type from a filename/key extension. Used to serve images
   * whose stored mimetype is generic (e.g. application/octet-stream from imports or
   * extractions) with a correct Content-Type instead of rejecting them.
   */
  private inferImageContentType(nameOrPath?: string): string | null {
    if (!nameOrPath) return null;
    const ext = extname(nameOrPath).toLowerCase().replace(/^\./, '');
    const map: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      bmp: 'image/bmp',
      tif: 'image/tiff',
      tiff: 'image/tiff',
      avif: 'image/avif',
      ico: 'image/x-icon',
      heic: 'image/heic',
      heif: 'image/heif',
    };
    return map[ext] ?? null;
  }

  /**
   * Resolves the MIME type to persist for an upload. When the incoming mimetype is
   * generic (application/octet-stream or empty), recovers the real image type from
   * the filename extension and, when raw bytes are available, by sniffing with sharp.
   * Concrete non-image types (video, pdf, ...) are returned unchanged.
   */
  private async resolveEffectiveMimetype(
    mimetype: string | undefined,
    name: string,
    buffer?: Buffer,
  ): Promise<string> {
    if (mimetype && mimetype.startsWith('image/')) return mimetype;
    // Tipos concretos não-imagem (video, pdf, ...) são mantidos como estão.
    if (mimetype && mimetype !== 'application/octet-stream') return mimetype;

    // Aqui o mimetype é vazio/undefined ou application/octet-stream: recupera o real.
    const byExtension = this.inferImageContentType(name);
    if (byExtension) return byExtension;

    if (buffer) {
      const sniffed = await this.imageOptimizationService.detectImageMimetype(buffer);
      if (sniffed) return sniffed;
    }

    return mimetype ?? 'application/octet-stream';
  }

  /**
   * Serves an image by id with strong, immutable HTTP caching. The content of a
   * given fileId never changes (a new upload yields a new id), so the ETag is
   * derived from id+size instead of hashing the buffer, keeping it streaming.
   */
  async serveImageById(
    locale: string,
    id: number,
    ifNoneMatch: string | undefined,
    res: any,
  ) {
    const { provider, providerPath, size, mimetype, filename } =
      await this.resolveFileMeta(locale, id);

    // Many legacy/imported files store a generic mimetype (application/octet-stream).
    // Since this endpoint serves images referenced by <img> tags, infer the
    // Content-Type from the extension instead of rejecting; only block concretely
    // non-image types (pdf, video, ...).
    const contentType = mimetype.startsWith('image/')
      ? mimetype
      : (this.inferImageContentType(filename) ??
        this.inferImageContentType(providerPath) ??
        mimetype);

    const isGenericBinary = !mimetype || mimetype === 'application/octet-stream';
    if (!contentType.startsWith('image/') && !isGenericBinary) {
      throw new NotFoundException(
        getLocaleText('file.download.not_found', locale, `Not an image: ${id}`),
      );
    }

    const etag = `"img-${id}-${size ?? 0}"`;
    if (ifNoneMatch && ifNoneMatch === etag) {
      res.status(304).end();
      return;
    }

    const ttl = await this.getCacheTtl('image-cache-ttl-seconds', 2592000);
    this.setInlineHeaders(
      res,
      filename,
      contentType,
      size,
      `public, max-age=${ttl}, immutable`,
      etag,
    );

    const stream = await provider.readStream(providerPath);
    stream.pipe(res);
  }

  /**
   * Serves any file by id with configurable HTTP caching (not immutable, shorter
   * TTL than images). Used by the generic open endpoint's numeric-id branch.
   */
  async serveFileById(
    locale: string,
    id: number,
    ifNoneMatch: string | undefined,
    res: any,
  ) {
    const { provider, providerPath, size, mimetype, filename } =
      await this.resolveFileMeta(locale, id);

    const etag = `"file-${id}-${size ?? 0}"`;
    if (ifNoneMatch && ifNoneMatch === etag) {
      res.status(304).end();
      return;
    }

    const ttl = await this.getCacheTtl('file-cache-ttl-seconds', 86400);
    this.setInlineHeaders(
      res,
      filename,
      mimetype,
      size,
      `public, max-age=${ttl}`,
      etag,
    );

    const stream = await provider.readStream(providerPath);
    stream.pipe(res);
  }

  async tempURL(filepath: string, expires = 3600) {
    return (await this.getProvider()).tempURL(filepath, expires);
  }

  async tempOpenURL(filepath: string, expires = 3600) {
    const url = await this.tempURL(filepath, expires);

    if (typeof url === 'string') {
      return url.replace('/file/download/', '/file/open/');
    }

    return url;
  }

  async getTemporaryCredentials(params: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
    region: string;
    roleArn?: string;
    externalId?: string;
    durationSeconds: number;
    sessionName: string;
  }): Promise<{
    AccessKeyId: string;
    SecretAccessKey: string;
    SessionToken: string;
    Expiration?: Date;
  }> {
    const stsClient = new STSClient({
      region: params.region,
      credentials: {
        accessKeyId: params.accessKeyId,
        secretAccessKey: params.secretAccessKey,
        ...(params.sessionToken ? { sessionToken: params.sessionToken } : {}),
      },
    });

    let creds: { AccessKeyId?: string; SecretAccessKey?: string; SessionToken?: string; Expiration?: Date } | undefined;

    if (params.roleArn) {
      const result = await stsClient.send(
        new AssumeRoleCommand({
          RoleArn: params.roleArn,
          RoleSessionName: params.sessionName,
          DurationSeconds: params.durationSeconds,
          ...(params.externalId ? { ExternalId: params.externalId } : {}),
        }),
      );
      creds = result.Credentials;
    } else {
      const result = await stsClient.send(
        new GetSessionTokenCommand({ DurationSeconds: params.durationSeconds }),
      );
      creds = result.Credentials;
    }

    if (!creds?.AccessKeyId || !creds.SecretAccessKey || !creds.SessionToken) {
      throw new BadRequestException('Could not generate temporary AWS credentials.');
    }

    return {
      AccessKeyId: creds.AccessKeyId,
      SecretAccessKey: creds.SecretAccessKey,
      SessionToken: creds.SessionToken,
      Expiration: creds.Expiration,
    };
  }

  async headS3Object(params: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
    region: string;
    bucket: string;
    key: string;
  }): Promise<{ ContentLength?: number; ETag?: string }> {
    const s3 = new S3Client({
      region: params.region,
      credentials: {
        accessKeyId: params.accessKeyId,
        secretAccessKey: params.secretAccessKey,
        ...(params.sessionToken ? { sessionToken: params.sessionToken } : {}),
      },
    });

    const result = await s3.send(
      new HeadObjectCommand({ Bucket: params.bucket, Key: params.key }),
    );

    return {
      ContentLength: result.ContentLength,
      ETag: result.ETag,
    };
  }

  async headS3Bucket(params: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
    region: string;
    bucket: string;
  }): Promise<void> {
    const s3 = new S3Client({
      region: params.region,
      credentials: {
        accessKeyId: params.accessKeyId,
        secretAccessKey: params.secretAccessKey,
        ...(params.sessionToken ? { sessionToken: params.sessionToken } : {}),
      },
    });

    await s3.send(new HeadBucketCommand({ Bucket: params.bucket }));
  }

  async getLambdaFunctionConfiguration(params: {
    functionName: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  }) {
    const lambda = new LambdaClient({
      region: params.region,
      credentials: {
        accessKeyId: params.accessKeyId,
        secretAccessKey: params.secretAccessKey,
        ...(params.sessionToken ? { sessionToken: params.sessionToken } : {}),
      },
    });

    return lambda.send(
      new GetFunctionConfigurationCommand({
        FunctionName: params.functionName,
      }),
    );
  }

  async updateLambdaEnvironmentVariables(params: {
    functionName: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
    environmentVariables: Record<string, string>;
  }) {
    const lambda = new LambdaClient({
      region: params.region,
      credentials: {
        accessKeyId: params.accessKeyId,
        secretAccessKey: params.secretAccessKey,
        ...(params.sessionToken ? { sessionToken: params.sessionToken } : {}),
      },
    });

    const current = await lambda.send(
      new GetFunctionConfigurationCommand({
        FunctionName: params.functionName,
      }),
    );

    this.logger.log(
      `updateLambdaEnvironmentVariables: fn=${params.functionName} region=${params.region} ` +
      `currentStatus=${current.LastUpdateStatus} ` +
      `incomingKeys=[${Object.keys(params.environmentVariables).join(',')}]`,
    );

    const LAMBDA_RESERVED_KEYS = new Set([
      'AWS_REGION',
      'AWS_DEFAULT_REGION',
      'AWS_LAMBDA_FUNCTION_NAME',
      'AWS_LAMBDA_FUNCTION_MEMORY_SIZE',
      'AWS_LAMBDA_FUNCTION_VERSION',
      'AWS_LAMBDA_LOG_GROUP_NAME',
      'AWS_LAMBDA_LOG_STREAM_NAME',
      'AWS_LAMBDA_RUNTIME_API',
      'AWS_EXECUTION_ENV',
      'LAMBDA_TASK_ROOT',
      'LAMBDA_RUNTIME_DIR',
      'TZ',
      '_HANDLER',
    ]);

    const merged = Object.fromEntries(
      Object.entries({
        ...(current.Environment?.Variables ?? {}),
        ...params.environmentVariables,
      }).filter(([key]) => !LAMBDA_RESERVED_KEYS.has(key)),
    );

    this.logger.log(
      `updateLambdaEnvironmentVariables: sending merged keys=[${Object.keys(merged).join(',')}] ` +
      `WEBHOOK_URL=${merged['WEBHOOK_URL'] ?? '(not set)'} ` +
      `WEBHOOK_SECRET_LEN=${merged['WEBHOOK_SECRET']?.length ?? 0}`,
    );

    await lambda.send(
      new UpdateFunctionConfigurationCommand({
        FunctionName: params.functionName,
        Environment: {
          Variables: merged,
        },
      }),
    );

    this.logger.log(`updateLambdaEnvironmentVariables: UpdateFunctionConfiguration sent, polling for completion`);

    // Wait for configuration update to leave InProgress before returning.
    const cfgDeadline = Date.now() + 60_000;
    let finalStatus = 'unknown';
    let confirmedVars: Record<string, string> = {};
    while (Date.now() < cfgDeadline) {
      const poll = await lambda.send(
        new GetFunctionConfigurationCommand({ FunctionName: params.functionName }),
      );
      finalStatus = poll.LastUpdateStatus ?? 'unknown';
      confirmedVars = (poll.Environment?.Variables ?? {}) as Record<string, string>;
      if (finalStatus !== 'InProgress') break;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    this.logger.log(
      `updateLambdaEnvironmentVariables: done, finalStatus=${finalStatus} ` +
      `confirmedKeys=[${Object.keys(confirmedVars).join(',')}] ` +
      `confirmedWEBHOOK_URL=${confirmedVars['WEBHOOK_URL'] ?? '(missing)'} ` +
      `confirmedWEBHOOK_SECRET_LEN=${confirmedVars['WEBHOOK_SECRET']?.length ?? 0}`,
    );

    return {
      functionName: current.FunctionName ?? params.functionName,
      functionArn: current.FunctionArn ?? null,
    };
  }

  async updateLambdaFunctionCode(params: {
    functionName: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
    zipFile: Uint8Array;
  }) {
    const lambda = new LambdaClient({
      region: params.region,
      credentials: {
        accessKeyId: params.accessKeyId,
        secretAccessKey: params.secretAccessKey,
        ...(params.sessionToken ? { sessionToken: params.sessionToken } : {}),
      },
    });

    const result = await lambda.send(
      new UpdateFunctionCodeCommand({
        FunctionName: params.functionName,
        ZipFile: params.zipFile,
      }),
    );

    // Wait until the function leaves InProgress state before returning,
    // so subsequent UpdateFunctionConfiguration calls don't get ResourceConflictException.
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      const config = await lambda.send(
        new GetFunctionConfigurationCommand({ FunctionName: params.functionName }),
      );
      if (config.LastUpdateStatus !== 'InProgress') break;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return {
      functionName: result.FunctionName ?? params.functionName,
      functionArn: result.FunctionArn ?? null,
    };
  }

  async createLambdaFunctionIfMissing(params: {
    functionName: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
    roleArn: string;
    packageType: 'Image' | 'Zip';
    imageUri?: string;
    zipFile?: Uint8Array;
    s3Bucket?: string;
    s3Key?: string;
    s3ObjectVersion?: string;
    handler?: string;
    runtime?: string;
    timeout?: number;
    memorySize?: number;
    environmentVariables?: Record<string, string>;
  }) {
    const lambda = new LambdaClient({
      region: params.region,
      credentials: {
        accessKeyId: params.accessKeyId,
        secretAccessKey: params.secretAccessKey,
        ...(params.sessionToken ? { sessionToken: params.sessionToken } : {}),
      },
    });

    try {
      const existing = await lambda.send(
        new GetFunctionConfigurationCommand({
          FunctionName: params.functionName,
        }),
      );

      return {
        created: false,
        functionName: existing.FunctionName ?? params.functionName,
        functionArn: existing.FunctionArn ?? null,
      };
    } catch (error: any) {
      if (String(error?.name ?? '') !== 'ResourceNotFoundException') {
        throw error;
      }
    }

    const baseInput = {
      FunctionName: params.functionName,
      Role: params.roleArn,
      PackageType: params.packageType,
      Timeout: params.timeout,
      MemorySize: params.memorySize,
      Environment: params.environmentVariables
        ? {
            Variables: params.environmentVariables,
          }
        : undefined,
    } as const;

    const created =
      params.packageType === 'Image'
        ? await lambda.send(
            new CreateFunctionCommand({
              ...baseInput,
              Code: {
                ImageUri: params.imageUri,
              },
            }),
          )
        : await lambda.send(
            new CreateFunctionCommand({
              ...baseInput,
              Handler: params.handler,
              Runtime: params.runtime as any,
              Code: {
                ...(params.zipFile
                  ? {
                      ZipFile: params.zipFile,
                    }
                  : {
                      S3Bucket: params.s3Bucket,
                      S3Key: params.s3Key,
                      ...(params.s3ObjectVersion
                        ? {
                            S3ObjectVersion: params.s3ObjectVersion,
                          }
                        : {}),
                    }),
              },
            }),
          );

    return {
      created: true,
      functionName: created.FunctionName ?? params.functionName,
      functionArn: created.FunctionArn ?? null,
    };
  }

  async allowS3InvokeLambda(params: {
    functionName: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
    bucketName: string;
    sourceAccount?: string;
    statementId?: string;
  }) {
    const lambda = new LambdaClient({
      region: params.region,
      credentials: {
        accessKeyId: params.accessKeyId,
        secretAccessKey: params.secretAccessKey,
        ...(params.sessionToken ? { sessionToken: params.sessionToken } : {}),
      },
    });

    const statementId =
      params.statementId ?? `lms-bulk-upload-${params.bucketName.replace(/[^a-zA-Z0-9-_]/g, '-')}`;

    try {
      await lambda.send(
        new AddPermissionCommand({
          FunctionName: params.functionName,
          StatementId: statementId.slice(0, 100),
          Action: 'lambda:InvokeFunction',
          Principal: 's3.amazonaws.com',
          SourceArn: `arn:aws:s3:::${params.bucketName}`,
          ...(params.sourceAccount
            ? {
                SourceAccount: params.sourceAccount,
              }
            : {}),
        }),
      );
    } catch (error: any) {
      if (String(error?.name ?? '') === 'ResourceConflictException') {
        return;
      }

      throw error;
    }
  }

  async configureS3BucketLambdaNotification(params: {
    bucketName: string;
    lambdaArn: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
    configurationId?: string;
    prefix?: string;
  }) {
    const s3 = new S3Client({
      region: params.region,
      credentials: {
        accessKeyId: params.accessKeyId,
        secretAccessKey: params.secretAccessKey,
        ...(params.sessionToken ? { sessionToken: params.sessionToken } : {}),
      },
    });

    const configurationId =
      params.configurationId ?? 'lms-bulk-upload-object-created';

    const existing = await s3.send(
      new GetBucketNotificationConfigurationCommand({
        Bucket: params.bucketName,
      }),
    );

    const lambdaConfigurations = Array.isArray(existing?.LambdaFunctionConfigurations)
      ? existing.LambdaFunctionConfigurations.filter((cfg: any) => cfg?.Id !== configurationId)
      : [];

    lambdaConfigurations.push({
      Id: configurationId,
      LambdaFunctionArn: params.lambdaArn,
      Events: ['s3:ObjectCreated:*'],
      ...(params.prefix
        ? {
            Filter: {
              Key: {
                FilterRules: [
                  {
                    Name: 'prefix',
                    Value: params.prefix,
                  },
                ],
              },
            },
          }
        : {}),
    });

    await s3.send(
      new PutBucketNotificationConfigurationCommand({
        Bucket: params.bucketName,
        NotificationConfiguration: {
          TopicConfigurations: Array.isArray(existing?.TopicConfigurations)
            ? existing.TopicConfigurations
            : [],
          QueueConfigurations: Array.isArray(existing?.QueueConfigurations)
            ? existing.QueueConfigurations
            : [],
          EventBridgeConfiguration: existing?.EventBridgeConfiguration,
          LambdaFunctionConfigurations: lambdaConfigurations,
        },
      }),
    );
  }

  createDownloadToken(filepath: string, expires = 3600) {
    if (!filepath) {
      throw new BadRequestException(`No file path provided`);
    }

    return this.jwtService.sign(
      { filepath },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: `${Math.max(1, Number(expires) || 3600)}s`,
      },
    );
  }
}
