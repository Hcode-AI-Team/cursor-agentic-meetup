import { getLocaleText } from '@hed-hog/api-locale';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'crypto';

@Injectable()
export class SecurityService {

  constructor(
    private readonly configService: ConfigService,
  ) { }

  getJwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET');
  }

  getValueWithPepper(value: string, pepper?: string): string {
    return value + (pepper || this.configService.get<string>('PEPPER'));
  }

  hashWithPepper(value: string): string {
    return this.hashSha256(this.getValueWithPepper(value));
  }

  randomOpaque(size = 32): string {
    return randomBytes(size).toString('base64url');
  }

  hashSha256(value: string): string {
    return createHash('sha256').update(value).digest('base64url');
  }

  signHmacSha256(value: string, secret?: string): string {
    const signingSecret = secret || this.getJwtSecret();
    return createHmac('sha256', signingSecret).update(value).digest('base64url');
  }

  verifyHmacSha256(value: string, signature: string, secret?: string): boolean {
    if (!signature) {
      return false;
    }

    try {
      const expected = this.signHmacSha256(value, secret);
      const expectedBuffer = Buffer.from(expected);
      const providedBuffer = Buffer.from(signature);

      if (expectedBuffer.length !== providedBuffer.length) {
        return false;
      }

      return timingSafeEqual(expectedBuffer, providedBuffer);
    } catch {
      return false;
    }
  }

  hashArgon2(value: string, pepper?: string): Promise<string> {
    return argon2.hash(this.getValueWithPepper(value, pepper));
  }

  async validatePassword(locale: string, credentials: { hash: string }[], password: string): Promise<boolean> {

    try {
      const peppered = this.getValueWithPepper(password);
      for (const { hash } of credentials) {

        if (await argon2.verify(hash, peppered)) return true;
      }
      return false;
    } catch (error) {
      throw new BadRequestException(getLocaleText('accessDenied', locale, 'Access denied.'));
    }
  }

  async verifyArgon2(value: string, hash: string, pepper?: string): Promise<boolean> {
    try {
      const peppered = this.getValueWithPepper(value, pepper);
      return await argon2.verify(hash, peppered);
    } catch (error) {
      return false;
    }
  }

  encrypt(value: string, secret?: string): string {
    const encryptionSecret = this.resolveEncryptionSecret(secret);
    const salt = randomBytes(16);
    const key = scryptSync(encryptionSecret, salt, 32);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [
      salt.toString('hex'),
      iv.toString('hex'),
      authTag.toString('hex'),
      encrypted.toString('hex')
    ].join(':');
  }
  
  decrypt(encryptedValue: string, secret?: string): string {
    try {
      const encryptionSecret = this.resolveEncryptionSecret(secret);
      
      const parts = encryptedValue.split(':');
      if (parts.length !== 4) {
        throw new Error(`Invalid encrypted format: expected 4 parts separated by ':', got ${parts.length} parts. Value: ${encryptedValue.substring(0, 50)}...`);
      }
      
      const salt = Buffer.from(parts[0], 'hex');
      const iv = Buffer.from(parts[1], 'hex');
      const authTag = Buffer.from(parts[2], 'hex');
      const ciphertext = Buffer.from(parts[3], 'hex');
      const key = scryptSync(encryptionSecret, salt, 32);
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return decrypted.toString('utf8');
    } catch (err: any) {
      throw new Error(`Failed to decrypt value: ${err.message}`);
    }
  }

  private resolveEncryptionSecret(secret?: string): string {
    const encryptionSecret = secret || this.configService.get<string>('ENCRYPTION_SECRET');

    if (!encryptionSecret || !String(encryptionSecret).trim()) {
      throw new Error('ENCRYPTION_SECRET is not configured.');
    }

    return encryptionSecret;
  }

  generateCode(length: number): string {

    return Array.from(crypto.getRandomValues(new Uint8Array(length || 6)))
        .map(n => (n % 10).toString())
        .join('');

  }

}