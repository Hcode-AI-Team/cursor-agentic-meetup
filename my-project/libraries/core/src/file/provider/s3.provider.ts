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

export class S3Provider extends AbstractProvider {
  private S3: S3 | undefined;
  private S3Client: S3Client | undefined;

  constructor(private setting: Record<string, string>) {
    super();
  }

  private resolveS3Key(filepath: string): string {
    if (!filepath) {
      throw new Error('Invalid filepath for S3');
    }
    return filepath;
  }

  async buffer(filepath: string): Promise<Buffer> {
    const s3 = await this.getClient();
    const key = this.resolveS3Key(filepath);
    const command = new GetObjectCommand({
      Bucket: this.setting['storage-s3-bucket'],
      Key: key,
    });
    const result = await s3.send(command);
    // @ts-ignore
    const stream = result.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async initValidation() {
    if (!this.setting['storage-s3-key']) {
      throw new BadRequestException(
        `You must set the storage-s3-key in the setting.`,
      );
    }

    if (!this.setting['storage-s3-secret']) {
      throw new BadRequestException(
        `You must set the storage-s3-secret in the setting.`,
      );
    }

    if (!this.setting['storage-s3-region']) {
      throw new BadRequestException(
        `You must set the storage-s3-region in the setting.`,
      );
    }

    if (!this.setting['storage-s3-bucket']) {
      throw new BadRequestException(
        `You must set the storage-s3-bucket in the setting.`,
      );
    }

    const s3 = await this.getClient();

    try {
      await s3.send(
        new HeadBucketCommand({
          Bucket: this.setting['storage-s3-bucket'],
        }),
      );
    } catch (error) {
      throw new BadRequestException(
        `The bucket "${this.setting['storage-s3-bucket']}" does not exist or you do not have access to it.`,
      );
    }
  }

  async getClient() {
    if (this.S3) {
      return this.S3;
    }

    this.S3Client = new S3Client({
      credentials: {
        accessKeyId: this.setting['storage-s3-key'],
        secretAccessKey: this.setting['storage-s3-secret'],
      },
      region: this.setting['storage-s3-region'],
    });

    return (this.S3 = new S3({
      credentials: {
        accessKeyId: this.setting['storage-s3-key'],
        secretAccessKey: this.setting['storage-s3-secret'],
      },
      region: this.setting['storage-s3-region'],
    }));
  }

  async getS3Client() {
    if (this.S3Client) {
      return this.S3Client;
    }
    this.S3Client = new S3Client({
      credentials: {
        accessKeyId: this.setting['storage-s3-key'],
        secretAccessKey: this.setting['storage-s3-secret'],
      },
      region: this.setting['storage-s3-region'],
    });
    return this.S3Client;
  }

  async uploadFromString(
    destination: string,
    filename: string,
    fileContent: string,
  ): Promise<any> {
    const s3 = await this.getClient();
    const storedFilename = this.getFilename(filename);
    const key = [destination, storedFilename].join('/');
    const command = new PutObjectCommand({
      Bucket: this.setting['storage-s3-bucket'],
      Key: key,
      Body: fileContent,
    });
    await s3.send(command);
    return storedFilename;
  }

  async upload(destination: string, file: MulterFile): Promise<any> {
    const s3 = await this.getClient();
    const storedFilename = this.getFilename(file.originalname);
    const key = [destination, storedFilename].join('/');
    const command = new PutObjectCommand({
      Bucket: this.setting['storage-s3-bucket'],
      Key: key,
      Body: file.buffer,
    });
    await s3.send(command);
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

    // Multipart streaming upload: nunca buffeia o arquivo em memória e suporta
    // objetos acima do limite de 5GB do PutObject único (ex.: pacotes SCORM grandes).
    const upload = new Upload({
      client,
      params: {
        Bucket: this.setting['storage-s3-bucket'],
        Key: key,
        Body: createReadStream(filePath),
        ContentType: options?.mimetype,
      },
      queueSize: 4,
      partSize: 16 * 1024 * 1024,
    });

    await upload.done();
    return storedFilename;
  }

  async delete(filepath: string): Promise<any> {
    const s3 = await this.getClient();
    const key = this.resolveS3Key(filepath);
    await s3.send(
      new DeleteObjectCommand({
        Bucket: this.setting['storage-s3-bucket'],
        Key: key,
      }),
    );
    return true;
  }

  async readStream(filepath: string, options?: { start?: number; end?: number }): Promise<Readable> {
    const s3 = await this.getClient();
    const key = this.resolveS3Key(filepath);
    const params: any = { Bucket: this.setting['storage-s3-bucket'], Key: key };
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
    const key = this.resolveS3Key(filepath);
    const command = new HeadObjectCommand({
      Bucket: this.setting['storage-s3-bucket'],
      Key: key,
    });
    const result = await s3.send(command);
    return result; // returns metadata
  }

  async tempURL(filepath: string, expires = 3600): Promise<string> {
    const s3Client = await this.getS3Client();
    const key = this.resolveS3Key(filepath);
    const command = new GetObjectCommand({
      Bucket: this.setting['storage-s3-bucket'],
      Key: key,
    });
    // Use S3Client instance for getSignedUrl
    return await getSignedUrl(s3Client as any, command, { expiresIn: expires });
  }
}
