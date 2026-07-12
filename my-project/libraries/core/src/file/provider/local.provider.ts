import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createReadStream, existsSync, promises as fs } from 'fs';
import { copyFile, mkdir, stat, unlink, writeFile } from 'fs/promises';
import * as path from 'path';
import { basename, join, sep } from 'path';
import { Stream } from 'stream';
import { AbstractProvider, ReadStreamOptions } from './abstract.provider';

export class LocalProvider extends AbstractProvider {
  constructor(
    private setting: Record<string, string>,
    private jwt: JwtService
  ) {
    super();
  }

  async initValidation() {
    if (!this.setting['storage-local-path']) {
      throw new BadRequestException(
        `You must set the storage-local-path in the setting.`,
      );
    }

    if (!existsSync(this.setting['storage-local-path'])) {
      await this.createFolderRecursive(this.setting['storage-local-path']);
    }
  }

  async createFolderRecursive(folderPath: string): Promise<void> {
    await mkdir(folderPath, { recursive: true });
  }

  private resolveFilepath(filepath: string): string {
    if (path.isAbsolute(filepath)) return filepath;
    return join(this.setting['storage-local-path'], filepath);
  }

  async uploadFromString(
    destination: string,
    filename: string,
    fileContent: string,
    mimetype?: string,
  ): Promise<any> {
    const storagePath = join(this.setting['storage-local-path'], destination);

    if (!storagePath) {
      throw new BadRequestException(
        `You must set the storage-local-path in the setting.`,
      );
    }

    if (!existsSync(storagePath)) {
      await this.createFolderRecursive(storagePath);
    }

    if (!existsSync(storagePath)) {
      throw new BadRequestException(
        `The storage path does not exist: ${storagePath}`,
      );
    }

    const storedFilename = this.getFilename(filename);
    const filePath = join(storagePath, storedFilename);

    await writeFile(filePath, fileContent);

    return storedFilename;
  }

  async upload(destination: string, file: MulterFile): Promise<any> {
    const storagePath = join(this.setting['storage-local-path'], destination);

    if (!storagePath) {
      throw new BadRequestException(
        `You must set the storage-local-path in the setting.`,
      );
    }

    if (!existsSync(storagePath)) {
      await this.createFolderRecursive(storagePath);
    }

    if (!existsSync(storagePath)) {
      throw new BadRequestException(
        `The storage path does not exist: ${storagePath}`,
      );
    }
    const storedFilename = this.getFilename(file.originalname);
    await writeFile(join(storagePath, storedFilename), file.buffer);
    return storedFilename;
  }

  async uploadFromPath(
    destination: string,
    filePath: string,
    options?: { filename?: string; mimetype?: string },
  ): Promise<any> {
    const sourcePath = this.resolveFilepath(filePath);
    if (!existsSync(sourcePath)) {
      throw new BadRequestException(`File not found: ${sourcePath}`);
    }

    const sourceStats = await stat(sourcePath);
    if (!sourceStats.isFile()) {
      throw new BadRequestException(`Invalid file path: ${sourcePath}`);
    }

    const storagePath = join(this.setting['storage-local-path'], destination);

    if (!existsSync(storagePath)) {
      await this.createFolderRecursive(storagePath);
    }

    const targetFilename = this.getFilename(options?.filename ?? basename(sourcePath));
    await copyFile(sourcePath, join(storagePath, targetFilename));
    return targetFilename;
  }

  async delete(filepath: string): Promise<any> {
    const fullPath = this.resolveFilepath(filepath);

    if (!existsSync(fullPath)) {
      throw new BadRequestException(`File not found: ${fullPath}`);
    }

    return unlink(fullPath);
  }

  async readStream(filepath: string, options?: ReadStreamOptions): Promise<Stream> {
    const fullPath = this.resolveFilepath(filepath);

    if (!existsSync(fullPath)) {
      throw new BadRequestException(`File not found: ${fullPath}`);
    }

    const rangeOpts: { start?: number; end?: number } = {};
    if (options?.start !== undefined) rangeOpts.start = options.start;
    if (options?.end !== undefined) rangeOpts.end = options.end;

    return createReadStream(fullPath, Object.keys(rangeOpts).length > 0 ? rangeOpts : undefined);
  }

  async metaData(filepath: string): Promise<any> {
    const fullPath = this.resolveFilepath(filepath);

    if (!existsSync(fullPath)) {
      throw new BadRequestException(`File not found: ${fullPath}`);
    }

    return {
      size: (await this.buffer(fullPath)).length,
    };
  }

  async buffer(filepath: string): Promise<Buffer> {
    const fullPath = this.resolveFilepath(filepath);

    if (!existsSync(fullPath)) {
      throw new BadRequestException(`File not found: ${fullPath}`);
    }

    return fs.readFile(fullPath);
  }

  async tempURL(filepath: string, expires = 3600): Promise<any> {
    try {
      const token = this.jwt.sign(
        { filepath },
        {
          secret: process.env.JWT_SECRET,
          expiresIn: expires,
        },
      );

      const host = process.env.HOST || 'localhost';
      const port = process.env.PORT || 3100;
      
      return `http://${host}:${port}/file/download/${token}`;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
}
