import { v4 } from 'uuid';
import { MulterFile } from '../../types/multer';

export type ReadStreamOptions = { start?: number; end?: number };

interface IProvider {
  uploadFromString(
    destination: string,
    filename: string,
    fileContent: string,
    mimetype?: string,
  ): Promise<any>;
  upload(destination: string, file: MulterFile): Promise<any>;
  uploadFromPath(
    destination: string,
    filePath: string,
    options?: { filename?: string; mimetype?: string },
  ): Promise<any>;
  readStream(filepath: string, options?: ReadStreamOptions): Promise<any>;
  delete(filepath: string): Promise<any>;
  metaData(filepath: string): Promise<any>;
  buffer(filepath: string): Promise<any>;
  tempURL(filepath: string, expires?: number): Promise<any>;
  initValidation(): Promise<any>;
}

export abstract class AbstractProvider implements IProvider {
  abstract uploadFromString(
    destination: string,
    filename: string,
    fileContent: string,
    mimetype?: string,
  ): Promise<any>;
  abstract upload(destination: string, file: MulterFile): Promise<any>;
  abstract uploadFromPath(
    destination: string,
    filePath: string,
    options?: { filename?: string; mimetype?: string },
  ): Promise<any>;
  abstract readStream(filepath: string, options?: ReadStreamOptions): Promise<any>;
  abstract delete(filepath: string): Promise<any>;
  abstract metaData(filepath: string): Promise<any>;
  abstract buffer(filepath: string): Promise<any>;
  abstract tempURL(filepath: string, expires?: number): Promise<any>;
  abstract initValidation(): Promise<any>;

  getExtension(filename: string) {
    return filename.split('.').pop();
  }

  getFilename(filename: string) {
    const newFilename = v4();
    return `${newFilename}.${this.getExtension(filename)}`;
  }
}
