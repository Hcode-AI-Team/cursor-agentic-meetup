import { Storage } from '@google-cloud/storage';
import { BadRequestException } from '@nestjs/common';
import { basename } from 'path';
import { AbstractProvider } from './abstract.provider';

export class GCSProvider extends AbstractProvider {
  private storage: Storage;

  constructor(private setting: Record<string, string>) {
    super();
  }

  async initValidation() {
    if (!this.setting['storage-gcs-keyfile']) {
      throw new BadRequestException(
        `You must set the storage-gcs-keyfile in the setting.`,
      );
    }

    if (!this.setting['storage-gcs-bucket']) {
      throw new BadRequestException(
        `You must set the storage-gcs-bucket in the setting.`,
      );
    }

    const storage = await this.getClient();
    const bucket = storage.bucket(this.setting['storage-gcs-bucket']);

    const exists = await bucket.exists();
    if (!exists[0]) {
      throw new BadRequestException(
        `The bucket "${this.setting['storage-gcs-bucket']}" does not exist.`,
      );
    }
  }

  async getClient() {
    if (this.storage) {
      return this.storage;
    }

    return (this.storage = new Storage({
      keyFilename: this.setting['storage-gcs-keyfile'],
    }));
  }

  async uploadFromString(
    destination: string,
    filename: string,
    fileContent: string,
    mimetype?: string,
  ): Promise<any> {
    const storage = await this.getClient();
    const bucket = storage.bucket(this.setting['storage-gcs-bucket']);
    const storedFilename = this.getFilename(filename);
    const file = bucket.file([destination, storedFilename].join('/'));

    await file.save(fileContent, { contentType: mimetype });
    return storedFilename;
  }

  async upload(destination: string, file: MulterFile): Promise<any> {
    const storage = await this.getClient();
    const bucket = storage.bucket(this.setting['storage-gcs-bucket']);
    const storedFilename = this.getFilename(file.originalname);
    const fileObject = bucket.file([destination, storedFilename].join('/'));

    await fileObject.save(file.buffer, { contentType: file.mimetype });
    return storedFilename;
  }

  async uploadFromPath(
    destination: string,
    filePath: string,
    options?: { filename?: string; mimetype?: string },
  ): Promise<any> {
    const storage = await this.getClient();
    const bucket = storage.bucket(this.setting['storage-gcs-bucket']);
    const objectPath = [destination.replace(/\/$/, ''), this.getFilename(options?.filename ?? basename(filePath))]
      .filter(Boolean)
      .join('/');

    await bucket.upload(filePath, {
      destination: objectPath,
      contentType: options?.mimetype,
    });

    return objectPath;
  }
  async readStream(filepath: string, options?: { start?: number; end?: number }): Promise<any> {
    const storage = await this.getClient();
    const bucket = storage.bucket(this.setting['storage-gcs-bucket']);
    const file = bucket.file(filepath);
    const rangeOpts: any = {};
    if (options?.start !== undefined) rangeOpts.start = options.start;
    if (options?.end !== undefined) rangeOpts.end = options.end;
    return file.createReadStream(Object.keys(rangeOpts).length > 0 ? rangeOpts : undefined);
  }
  async delete(filepath: string): Promise<any> {
    const storage = await this.getClient();
    const bucket = storage.bucket(this.setting['storage-gcs-bucket']);
    const file = bucket.file(filepath);

    return file.delete();
  }
  async metaData(filepath: string): Promise<any> {
    const storage = await this.getClient();
    const bucket = storage.bucket(this.setting['storage-gcs-bucket']);
    const file = bucket.file(filepath);

    return file.getMetadata();
  }
  async buffer(filepath: string): Promise<any> {
    const storage = await this.getClient();
    const bucket = storage.bucket(this.setting['storage-gcs-bucket']);
    const file = bucket.file(filepath);

    return file.download();
  }
  async tempURL(filepath: string, expires?: number): Promise<any> {
    const storage = await this.getClient();
    const bucket = storage.bucket(this.setting['storage-gcs-bucket']);
    const file = bucket.file(filepath);

    return file.getSignedUrl({
      action: 'read',
      expires: expires || 60 * 60,
    });
  }
}
