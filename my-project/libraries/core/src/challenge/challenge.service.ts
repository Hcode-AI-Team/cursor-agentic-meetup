import { getLocaleText } from "@hed-hog/api-locale";
import { PrismaService } from '@hed-hog/api-prisma';
import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { MailService } from "../mail/mail.service";
import { SecurityService } from "../security/security.service";
import { SettingService } from "../setting/setting.service";
import { TokenService } from "../token/token.service";

@Injectable()
export class ChallengeService {

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => SecurityService))
    private readonly security: SecurityService,
    @Inject(forwardRef(() => SettingService))
    private readonly setting: SettingService,
    @Inject(forwardRef(() => TokenService))
    private readonly token: TokenService,
    @Inject(forwardRef(() => MailService))
    private readonly mail: MailService,
  ) { }

  async verifyMfaEmail(locale: string, userId: number, email: string) {
    const settings = await this.setting.getSettingValues([
      'mfa-email-code-length',
      'mfa-challenge-expiration-minutes'
    ]);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });

    if (!user) {
      throw new NotFoundException(getLocaleText('userNotFound', locale, 'User not found.'));
    }

    const code = Array.from(crypto.getRandomValues(new Uint8Array(settings['mfa-email-code-length'] || 6)))
      .map(n => (n % 10).toString())
      .join('');

    const codeHash = this.security.hashWithPepper(code);

    const userMfa = await this.prisma.user_mfa.create({
      data: {
        name: 'Email',
        type: 'email',
        user_id: userId,
        user_mfa_email: {
          create: {
            email,
          }
        },
        user_mfa_challenge: {
          create: {
            expires_at: new Date(Date.now() + (settings['mfa-challenge-expiration-minutes'] || 15) * 60000),
            hash: codeHash,
          }
        }
      },
      select: {
        id: true,
        user_mfa_challenge: {
          select: { id: true }
        }
      }
    });

    await this.mail.sendTemplatedMail(
      locale,
      {
        email,
        slug: 'auth-email-verification-code',
        variables: {
          code,
          name: user.name,
        }
      }
    );

    const challengeId = userMfa.user_mfa_challenge.find(c => c !== null)?.id;

    return { challengeId };
  }

  async verifyEmail(locale: string, userId: number, email: string) {

    const identifier = await this.prisma.user_identifier.findFirst({
      where: {
        user_id: userId,
        type: 'email',
        value: email,
        verified_at: null,
      },
      select: { id: true }
    });

    if (!identifier) {
      throw new NotFoundException(getLocaleText('identifierNotFound', locale, 'Email identifier not found or already verified.'));
    }

    const settings = await this.setting.getSettingValues([
      'mfa-email-code-length',
      'mfa-challenge-expiration-minutes'
    ]);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });

    if (!user) {
      throw new NotFoundException(getLocaleText('userNotFound', locale, 'User not found.'));
    }

    const code = Array.from(crypto.getRandomValues(new Uint8Array(settings['mfa-email-code-length'] || 6)))
      .map(n => (n % 10).toString())
      .join('');

    const codeHash = this.security.hashWithPepper(code);

    const challenge = await this.prisma.user_identifier_challenge.create({
      data: {
        hash: codeHash,
        expires_at: new Date(Date.now() + (settings['mfa-challenge-expiration-minutes'] || 15) * 60000),
        user_identifier_id: identifier.id,
      },
      select: {
        id: true,
      }
    });

    await this.mail.sendTemplatedMail(
      locale,
      {
        email,
        slug: 'auth-sign-up-confirm-email',
        variables: {
          code,
          name: user.name,
        }
      }
    );

    return { challengeId: challenge.id  };
  }

  async verifyMultipleEmails(locale: string, userId: number, emails: string[]) {

    const settings = await this.setting.getSettingValues([
      'mfa-email-code-length',
    ]);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });

    if (!user) {
      throw new NotFoundException(getLocaleText('userNotFound', locale, 'User not found.'));
    }

    const code = Array.from(crypto.getRandomValues(new Uint8Array(settings['mfa-email-code-length'] || 6)))
      .map(n => (n % 10).toString())
      .join('');


    const codeHash = this.security.hashWithPepper(code);
    
    for (const email of emails) {
      this.mail.sendTemplatedMail(
        locale,
        {
          email,
          slug: 'auth-sign-up-confirm-email',
          variables: {
            code,
            name: user.name,
          }
        }
      );
    }

    return { codeHash };
  }

  async forgotEmail(locale: string, email: string, app?: string) {
    const openChallengesCount = await this.prisma.user_identifier_challenge.count({
      where: {
        user_identifier: {
          type: 'email',
          value: email,
        },
        expires_at: { gt: new Date() }
      }
    });

    if (openChallengesCount >= 3) {
      throw new BadRequestException(getLocaleText('forgot.rateLimit', locale, 'Too many password reset requests. Please try again later.'));
    }

    const userIdentifier = await this.prisma.user_identifier.findFirst({
      where: { type: 'email', value: email, enabled: true },
      include: { user: true },
    });

    if (!userIdentifier) throw new BadRequestException(getLocaleText('forgot.userNotFound', locale, 'User not found'));

    const settings = await this.setting.getSettingValues([
      'mfa-challenge-expiration-minutes',
      'url',
      'app-urls'
    ]);

    const token = await this.token.createOpaqueToken(16);
    const hash = this.security.hashWithPepper(token);
    const challenge = await this.prisma.user_identifier_challenge.create({
      data: {
        hash,
        expires_at: new Date(Date.now() + (settings['mfa-challenge-expiration-minutes'] || 15) * 60000),
        user_identifier_id: userIdentifier.id,
      },
    });

    const tokenBase64 = Buffer.from(token).toString('base64');
    this.mail.sendTemplatedMail(
      locale,
      {
        email,
        slug: 'auth-forget-password',
        variables: {
          link: `${this.resolveAppUrl(settings, app)}/reset-password?token=${tokenBase64}`,
          name: userIdentifier.user.name,
        }
      }
    );

    return challenge;
  }

  private resolveAppUrl(settings: Record<string, any>, app?: string): string {
    const appUrls: string[] = Array.isArray(settings['app-urls']) ? settings['app-urls'] : [];

    if (app) {
      const entry = appUrls.find((item) => item.split('=')[0]?.trim() === app);
      if (entry) {
        return entry.slice(entry.indexOf('=') + 1).trim();
      }
    }

    return settings['url'];
  }

  async verifyCodePassword(locale: string, code: string) {
    const hash = this.security.hashWithPepper(code);
    const challenge = await this.prisma.user_identifier_challenge.findFirst({
      where: {
        hash,
        expires_at: { gt: new Date() }
      },
      include: {
        user_identifier: { include: { user: true } },
      },
    });

    if (!challenge) {
      throw new BadRequestException(getLocaleText('challenge.invalidOrExpired', locale, 'The provided code is invalid or has expired.'));
    }

    return challenge;
  }

  async verifyCode(locale: string, userId: number, code: string, providedHash: string, name?: string, email?: string) {
    const hash = this.security.hashWithPepper(code);
    if (providedHash && hash !== providedHash){
      throw new BadRequestException(getLocaleText('challenge.invalidOrExpired', locale, 'The provided code is invalid or has expired.'));
    }

    if (name && email){
      const challenge = await this.prisma.user_mfa.create({
        data: {
          name,
          type: 'email',
          user_id: userId,
          verified_at: new Date(),
          user_mfa_challenge: {
            create: {
              hash: providedHash,
              expires_at: new Date(),
              verified_at: new Date(),
              attempts: 1,
            }
          },
          user_mfa_email: {
            create: {
              email: email,
            },
          }
        }
      })

      if (challenge.user_id !== userId) {
        throw new BadRequestException(getLocaleText('accessDenied', locale, 'Access denied.'));
      }

      return challenge;
    }
    
    return { success: true }
  }

  async sendMfaCodeByEmail(locale: string, userId: number, email: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });

    if (!user) {
      throw new BadRequestException(getLocaleText('userNotFound', locale, 'User not found.'));
    }

    const settings = await this.setting.getSettingValues([
      'mfa-challenge-expiration-minutes',
      'mfa-email-code-length'
    ]);

    const code = Array.from(crypto.getRandomValues(new Uint8Array(settings['mfa-email-code-length'] || 6)))
      .map(n => (n % 10).toString())
      .join('');
          
    const hash = this.security.hashWithPepper(code);
    const expiresAt = new Date(Date.now() + (settings['mfa-challenge-expiration-minutes'] || 15) * 60000);
    const existingUserMfa = await this.prisma.user_mfa.findFirst({
      where: { user_id: userId, type: 'email' },
      select: { id: true }
    });

    await this.prisma.user_mfa_challenge.create({
      data: {
        hash,
        expires_at: expiresAt,
        user_mfa: existingUserMfa
          ? { connect: { id: existingUserMfa.id } }
          : { create: { name: user.name, type: 'email', user: { connect: { id: userId } } } }
      }
    });

    this.mail.sendTemplatedMail(
      locale,
      {
        email,
        slug: 'auth-mfa-code',
        variables: {
          code,
          name: user.name,
        }
      }
    );

    return { success: true };
  }

  async verifyMfaEmailCode(locale: string, userId: number, code: string): Promise<boolean> {
    const hash = this.security.hashWithPepper(code);
    const challenge = await this.prisma.user_mfa_challenge.findFirst({
      where: {
        hash,
        expires_at: { gt: new Date() },
        user_mfa: {
          user_id: userId,
          type: 'email'
        }
      }
    });

    if (!challenge) {
      return false;
    }

    await this.prisma.user_mfa_challenge.delete({
      where: { id: challenge.id }
    });

    return true;
  }

  async sendMfaCodeToMultipleEmails(locale: string, userId: number, emails: string[]) {

    if (!emails || emails.length === 0) {
      return { success: true };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });

    if (!user) {
      throw new BadRequestException(getLocaleText('userNotFound', locale, 'User not found.'));
    }

    const settings = await this.setting.getSettingValues([
      'mfa-challenge-expiration-minutes',
      'mfa-email-code-length',
    ]);

    const code = Array.from(crypto.getRandomValues(new Uint8Array(settings['mfa-email-code-length'] || 6)))
      .map(n => (n % 10).toString())
      .join('');

    const hash = this.security.hashWithPepper(code);
    const expiresAt = new Date(Date.now() + (settings['mfa-challenge-expiration-minutes'] || 15) * 60000);
    
    const existingUserMfa = await this.prisma.user_mfa.findFirst({
      where: { user_id: userId, type: 'email' },
      select: { id: true }
    });

    await this.prisma.user_mfa_challenge.create({
      data: {
        hash,
        expires_at: expiresAt,
        user_mfa: existingUserMfa
          ? { connect: { id: existingUserMfa.id } }
          : { create: { name: user.name, type: 'email', user: { connect: { id: userId } } } }
      }
    });

    for (const email of emails) {
      
      this.mail.sendTemplatedMail(
        locale,
        {
          email,
          slug: 'auth-mfa-code',
          variables: {
            code,
            name: user.name,
          }
        }
      );
    }

    return { success: true };
  }
}
