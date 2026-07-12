import {
    DeleteObjectCommand,
    GetObjectCommand,
    HeadBucketCommand,
    HeadObjectCommand,
    PutObjectCommand,
    S3,
    S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BadRequestException } from '@nestjs/common';
import { createReadStream } from 'fs';
import { basename } from 'path';
import { Readable } from 'stream';
import { AbstractProvider } from './abstract.provider';

export class SpacesProvider extends AbstractProvider {
  private S3: S3 | undefined;
  private S3Client: S3Client | undefined;

  constructor(private setting: Record<string, string>) {
    super();
  }

  private get endpoint() {
    return `https://${this.setting['storage-spaces-region']}.digitaloceanspaces.com`;
  }

  private get bucketUrl() {
    const cdn = this.setting['storage-spaces-cdn'];
    if (cdn) {
      return cdn.replace(/\/$/, '');
    }
    return `https://${this.setting['storage-spaces-bucket']}.${this.setting['storage-spaces-region']}.digitaloceanspaces.com`;
  }

  private resolveKey(filepath: string): string {
    if (!filepath) {
      throw new Error('Invalid filepath for DigitalOcean Spaces');
    }
    return filepath;
  }

  async initValidation() {
    if (!this.setting['storage-spaces-key']) {
      throw new BadRequestException(
        `You must set the storage-spaces-key in the setting.`,
      );
    }

    if (!this.setting['storage-spaces-secret']) {
      throw new BadRequestException(
        `You must set the storage-spaces-secret in the setting.`,
      );
    }

    if (!this.setting['storage-spaces-region']) {
      throw new BadRequestException(
        `You must set the storage-spaces-region in the setting.`,
      );
    }

    if (!this.setting['storage-spaces-bucket']) {
      throw new BadRequestException(
        `You must set the storage-spaces-bucket in the setting.`,
      );
    }

    const s3 = await this.getClient();

    try {
      await s3.send(
        new HeadBucketCommand({
          Bucket: this.setting['storage-spaces-bucket'],
        }),
      );
    } catch (error) {
      throw new BadRequestException(
        `The bucket "${this.setting['storage-spaces-bucket']}" does not exist or you do not have access to it.`,
      );
    }
  }

  async getClient() {
    if (this.S3) {
      return this.S3;
    }

    const credentials = {
      accessKeyId: this.setting['storage-spaces-key'],
      secretAccessKey: this.setting['storage-spaces-secret'],
    };

    this.S3Client = new S3Client({
      credentials,
      endpoint: this.endpoint,
      region: this.setting['storage-spaces-region'],
      forcePathStyle: false,
    });

    return (this.S3 = new S3({
      credentials,
      endpoint: this.endpoint,
      region: this.setting['storage-spaces-region'],
      forcePathStyle: false,
    }));
  }

  async getS3Client() {
    if (this.S3Client) {
      return this.S3Client;
    }

    this.S3Client = new S3Client({
      credentials: {
        accessKeyId: this.setting['storage-spaces-key'],
        secretAccessKey: this.setting['storage-spaces-secret'],
      },
      endpoint: this.endpoint,
      region: this.setting['storage-spaces-region'],
      forcePathStyle: false,
    });

    return this.S3Client;
  }

  async buffer(filepath: string): Promise<Buffer> {
    const s3 = await this.getClient();
    const key = this.resolveKey(filepath);
    const result = await s3.send(
      new GetObjectCommand({
        Bucket: this.setting['storage-spaces-bucket'],
        Key: key,
      }),
    );
    // @ts-ignore
    const stream = result.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async upload(destination: string, file: MulterFile): Promise<any> {
    const s3 = await this.getClient();
    const storedFilename = this.getFilename(file.originalname);
    const key = [destination, storedFilename].join('/');
    await s3.send(
      new PutObjectCommand({
        Bucket: this.setting['storage-spaces-bucket'],
        Key: key,
        Body: file.buffer,
        ACL: 'public-read',
      }),
    );
    return storedFilename;
  }

  async uploadFromString(
    destination: string,
    filename: string,
    fileContent: string,
  ): Promise<any> {
    const s3 = await this.getClient();
    const storedFilename = this.getFilename(filename);
    const key = [destination, storedFilename].join('/');
    await s3.send(
      new PutObjectCommand({
        Bucket: this.setting['storage-spaces-bucket'],
        Key: key,
        Body: fileContent,
        ACL: 'public-read',
      }),
    );
    return storedFilename;
  }

  async uploadFromPath(
    destination: string,
    filePath: string,
    options?: { filename?: string; mimetype?: string },
  ): Promise<any> {
    const client = await this.getS3Client();
    const originalName = options?.filename ?? basename(filePath);
    const storedFilename = this.getFilename(originalName);
    const key = [destination, storedFilename].join('/');

    // Upload por streaming do disco: o lib-storage envia um PutObject único abaixo
    // do partSize e só ativa multipart acima dele, suportando objetos acima do
    // limite de 5GB do PutObject (ex.: pacotes SCORM grandes) sem buffeiar na RAM.
    const upload = new Upload({
      client,
      params: {
        Bucket: this.setting['storage-spaces-bucket'],
        Key: key,
        Body: createReadStream(filePath),
        ContentType: options?.mimetype,
        ACL: 'public-read',
      },
      queueSize: 4,
      partSize: 16 * 1024 * 1024,
    });

    await upload.done();
    return storedFilename;
  }

  async delete(filepath: string): Promise<any> {
    const s3 = await this.getClient();
    const key = this.resolveKey(filepath);
    await s3.send(
      new DeleteObjectCommand({
        Bucket: this.setting['storage-spaces-bucket'],
        Key: key,
      }),
    );
    return true;
  }

  async readStream(filepath: string, options?: { start?: number; end?: number }): Promise<Readable> {
    const s3 = await this.getClient();
    const key = this.resolveKey(filepath);
    const params: any = { Bucket: this.setting['storage-spaces-bucket'], Key: key };
    if (options?.start !== undefined || options?.end !== undefined) {
      const start = options?.start ?? 0;
      const end = options?.end !== undefined ? options.end : '';
      params.Range = `bytes=${start}-${end}`;
    }
    const result = await s3.send(new GetObjectCommand(params));
    // @ts-ignore
    return result.Body as Readable;
  }

  async metaData(filepath: string): Promise<any> {
    const s3 = await this.getClient();
    const key = this.resolveKey(filepath);
    const result = await s3.send(
      new HeadObjectCommand({
        Bucket: this.setting['storage-spaces-bucket'],
        Key: key,
      }),
    );
    return result;
  }

  async tempURL(filepath: string, expires = 3600): Promise<string> {
    const s3Client = await this.getS3Client();
    const key = this.resolveKey(filepath);
    const command = new GetObjectCommand({
      Bucket: this.setting['storage-spaces-bucket'],
      Key: key,
    });
    return await getSignedUrl(s3Client as any, command, { expiresIn: expires });
  }
}
