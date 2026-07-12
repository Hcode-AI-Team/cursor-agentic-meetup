import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { basename, extname } from 'path';
import sharp from 'sharp';
import { SettingService } from '../setting/setting.service';

export interface OptimizedImage {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

export interface OptimizeOptions {
  /** Precise target dimensions (e.g. from a cropped course banner/logo/square). */
  maxWidth?: number;
  maxHeight?: number;
}

@Injectable()
export class ImageOptimizationService {
  private readonly logger = new Logger(ImageOptimizationService.name);

  constructor(
    @Inject(forwardRef(() => SettingService))
    private readonly settingService: SettingService,
  ) {}

  private parseArraySetting(raw: string | undefined): string[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private replaceExtension(filename: string, newExt: string): string {
    const base = basename(filename, extname(filename));
    return `${base}.${newExt}`;
  }

  private pngCompressionLevel(quality: number): number {
    // sharp compressionLevel is 0-9 (9 = max); invert from quality scale
    return Math.round(((100 - quality) / 100) * 9);
  }

  /**
   * Detects the image MIME type from the raw bytes using sharp. Returns null when
   * the buffer is not a recognizable image (or sharp fails). Used to recover the
   * real type of files uploaded with a generic mimetype (application/octet-stream).
   */
  async detectImageMimetype(buffer: Buffer): Promise<string | null> {
    try {
      const { format } = await sharp(buffer).metadata();
      const map: Record<string, string> = {
        jpeg: 'image/jpeg',
        jpg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        gif: 'image/gif',
        svg: 'image/svg+xml',
        tiff: 'image/tiff',
        avif: 'image/avif',
        heif: 'image/heif',
      };
      return format ? (map[format] ?? null) : null;
    } catch {
      return null;
    }
  }

  /**
   * Applies optional resize, compression and/or WebP conversion to the given
   * buffer based on the current settings. Returns the original data unchanged
   * when there is nothing to do (no resize and the MIME type is not in any
   * configured optimization list).
   */
  async optimizeBuffer(
    buffer: Buffer,
    mimetype: string,
    originalname: string,
    options: OptimizeOptions = {},
  ): Promise<OptimizedImage> {
    if (!mimetype.startsWith('image/')) {
      return { buffer, mimetype, originalname };
    }

    const settings = await this.settingService.getSettingValues([
      'image-compression-enabled',
      'image-compression-quality',
      'image-compression-types',
      'image-webp-conversion-enabled',
      'image-webp-convert-types',
      'image-max-dimension',
    ]);

    const compressionEnabled = settings['image-compression-enabled'] === 'true';
    const webpEnabled = settings['image-webp-conversion-enabled'] === 'true';

    const quality = Math.min(
      100,
      Math.max(1, Number(settings['image-compression-quality']) || 80),
    );
    const compressionTypes = this.parseArraySetting(settings['image-compression-types']);
    const webpConvertTypes = this.parseArraySetting(settings['image-webp-convert-types']);
    const maxDimension = Math.max(0, Number(settings['image-max-dimension']) || 0);

    // Resolve the resize operation: a precise target (cropped uploads) wins over
    // the generic max-dimension cap.
    const targetWidth = Number(options.maxWidth) || 0;
    const targetHeight = Number(options.maxHeight) || 0;

    let resize: sharp.ResizeOptions | null = null;
    if (targetWidth > 0 && targetHeight > 0) {
      resize = { width: targetWidth, height: targetHeight, fit: 'cover' };
    } else if (maxDimension > 0) {
      resize = {
        width: maxDimension,
        height: maxDimension,
        fit: 'inside',
        withoutEnlargement: true,
      };
    }

    const willConvertWebp = webpEnabled && webpConvertTypes.includes(mimetype);
    const willCompress = compressionEnabled && compressionTypes.includes(mimetype);

    // Nothing to do for this image.
    if (!resize && !willConvertWebp && !willCompress) {
      return { buffer, mimetype, originalname };
    }

    try {
      let instance = sharp(buffer);
      if (resize) {
        instance = instance.resize(resize);
      }

      // WebP conversion has priority over plain compression.
      if (willConvertWebp) {
        const optimized = await instance.webp({ quality }).toBuffer();
        return {
          buffer: optimized,
          mimetype: 'image/webp',
          originalname: this.replaceExtension(originalname, 'webp'),
        };
      }

      // Re-encode keeping the original format. Reached when compressing, or when
      // only resizing (a resize always requires re-encoding the buffer).
      if (mimetype === 'image/jpeg') {
        const optimized = await instance.jpeg({ quality }).toBuffer();
        return { buffer: optimized, mimetype, originalname };
      } else if (mimetype === 'image/png') {
        const optimized = await instance
          .png({ compressionLevel: this.pngCompressionLevel(quality) })
          .toBuffer();
        return { buffer: optimized, mimetype, originalname };
      } else if (mimetype === 'image/webp') {
        const optimized = await instance.webp({ quality }).toBuffer();
        return { buffer: optimized, mimetype, originalname };
      } else if (mimetype === 'image/bmp' || mimetype === 'image/tiff') {
        // Convert to PNG as a compressed lossless alternative.
        const optimized = await instance
          .png({ compressionLevel: this.pngCompressionLevel(quality) })
          .toBuffer();
        return {
          buffer: optimized,
          mimetype: 'image/png',
          originalname: this.replaceExtension(originalname, 'png'),
        };
      }

      // Unknown image format: only re-encode if a resize was requested,
      // otherwise leave it untouched.
      if (resize) {
        const optimized = await instance.toBuffer();
        return { buffer: optimized, mimetype, originalname };
      }
      return { buffer, mimetype, originalname };
    } catch (err) {
      this.logger.warn(
        `Image optimization failed for "${originalname}" (${mimetype}): ${err instanceof Error ? err.message : String(err)}. Falling back to original.`,
      );
      return { buffer, mimetype, originalname };
    }
  }
}
