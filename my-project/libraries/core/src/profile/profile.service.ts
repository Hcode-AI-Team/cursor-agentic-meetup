import { getLocaleText } from '@hed-hog/api-locale';
import { PrismaService, user } from '@hed-hog/api-prisma';
import { User } from '@hed-hog/api-types';
import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import type {
    VerifiedAuthenticationResponse,
    VerifiedRegistrationResponse,
} from '@simplewebauthn/server';
import {
    generateAuthenticationOptions,
    generateRegistrationOptions,
    verifyAuthenticationResponse,
    verifyRegistrationResponse,
} from '@simplewebauthn/server';
import * as qrcode from 'qrcode';
import * as speakeasy from 'speakeasy';
import { ChallengeService } from '../challenge/challenge.service';
import { MailService } from '../mail/mail.service';
import { SecurityService } from '../security/security.service';
import { SettingService } from '../setting/setting.service';
import { TokenService } from '../token/token.service';
import { UserService } from '../user/user.service';
import { resolveWebAuthnOrigin } from '../utils/webauthn-origin';
import { ChangeEmailDto } from './dto/change-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { EmailVerificationDto } from './dto/email-verification-confirm.dto';
import { SendEmailVerificationDto } from './dto/send-email-verification.dto';
import { SetPreferencesDto } from './dto/set-preferences.dto';
import { UpdateDto } from './dto/update.dto';
import { PROFILE_AVATAR_UPDATED, ProfileAvatarUpdatedEvent } from './events/profile-avatar-updated.event';
import { PROFILE_EMAIL_CHANGED, ProfileEmailChangedEvent } from './events/profile-email-changed.event';
import { PROFILE_UPDATED, ProfileUpdatedEvent } from './events/profile-updated.event';

@Injectable()
export class ProfileService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly user: UserService,
    @Inject(forwardRef(() => JwtService))
    private readonly jwt: JwtService,
    @Inject(forwardRef(() => SettingService))
    private readonly setting: SettingService,
    private readonly security: SecurityService,
    private readonly challenge: ChallengeService,
    @Inject(forwardRef(() => TokenService))
    private readonly token: TokenService,
    @Inject(forwardRef(() => MailService))
    private readonly mail: MailService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async changeEmail(locale: string, userId: number, { email, password, pin }: ChangeEmailDto) {

    const checkAlreadyExists = await this.prisma.user_identifier.findFirst({
        where: { type: 'email', value: email, enabled: true, verified_at: { not: null } },
    });

    if (checkAlreadyExists) {
      throw new BadRequestException(getLocaleText('emailAlreadyInUse', locale, 'The provided email is already in use.'));
    }

    const settings = await this.setting.getSettingValues([
      'require-email-verification'
    ]);

    if (settings['require-email-verification'] === true && !pin) {

      const checkIfExists = await this.prisma.user_identifier.findFirst({
        where: { type: 'email', value: email, user_id: userId  },
      });

      if (!checkIfExists) {
        await this.prisma.user_identifier.create({
          data: {
            type: 'email',
            value: email,
            user_id: userId,
          },
        })
      }      

      return {
        requireEmailVerification: settings['require-email-verification'] === true
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { user_credential: true }
    });

    if (!user) {
      throw new NotFoundException(getLocaleText('userNotFound', locale, 'User not found.'));
    }

    const credentials = (user as unknown as User).user_credential?.filter((c) => c.type === 'password') || [];
    
    if (!await this.security.validatePassword(locale, credentials, password)) {
      throw new BadRequestException(getLocaleText('accessDenied', locale, 'Access denied.'));
    }

    await this.prisma.$transaction( async (tx) => {

      const currentVerifiedEmail = await tx.user_identifier.findFirst({
        where: { user_id: userId, type: 'email', verified_at: { not: null }, enabled: true },
      });

      if (!currentVerifiedEmail) {
        throw new NotFoundException(getLocaleText('emailIdentifierNotFound', locale, 'Email identifier not found.'));
      }

      // FIXED: Create new identifier for the new email instead of overwriting the current one
      // This prevents the verified email from becoming orphaned
      const newEmailIdentifier = await tx.user_identifier.create({
        data: {
          type: 'email',
          value: email,
          user_id: userId,
          verified_at: null,
          enabled: true,
        }
      });

      // Create verification challenge for the new email
      await this.challenge.verifyEmail(locale, userId, email);

    });

    

    return {
      requireEmailVerification: settings['require-email-verification'] === true
    }

  }

  async updatePreferences(locale: string, userId: number, { theme, language }: SetPreferencesDto) {
    if (theme) {
      await this.setting.setSettingUserValue(locale, userId, 'theme-mode', theme);
    }

    if (language) {
      await this.setting.setSettingUserValue(locale, userId, 'language', language);
    }
    return { success: true };
  }

  async confirmEmailVerificationMfa(locale: string, userId: number, { pin, challengeId, name }: EmailVerificationDto) {

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(getLocaleText('userNotFound', locale, 'User not found.'));
    }

    const challenge = await this.prisma.user_mfa_challenge.findFirst({
      where: {
        id: challengeId,
        expires_at: {
          gt: new Date()
        },
        verified_at: null        
      },
      include: {
        user_mfa: {
          include: {
            user_mfa_email: true
          }
        }
      }
    });

    if (!challenge) {
      throw new NotFoundException(getLocaleText('challengeNotFound', locale, 'Challenge not found.'));
    }

    await this.prisma.user_mfa_challenge.update({
      where: {
        id: challengeId
      },
      data: {
        attempts: { increment: 1 }
      }
    });

    if (challenge.hash !== this.security.hashWithPepper(pin)) {
      throw new BadRequestException(getLocaleText('invalidPin', locale, 'Invalid PIN.'));
    }

    await this.prisma.$transaction(async (tx) => {

      await tx.user_mfa_challenge.update({
        where: { id: challengeId },
        data: { verified_at: new Date() },
      });

      await tx.user_mfa.update({
        where: { id: challenge.user_mfa.id },
        data: {
          verified_at: new Date(),
          name: name || challenge.user_mfa.name
        },
      });

      await tx.user_identifier.updateMany({
        where: {
          user_id: userId,
          verified_at: { not: null },
          value: challenge.user_mfa.user_mfa_email[0].email,
        },
        data: {
          enabled: true,
          verified_at: new Date(),
        }
      })

    });

    const updatedUser = await this.prisma.user.findFirst({ where: { id: user.id }})
    const codes = await this.createMfaRecoveryCodes(user.id);
    const newToken = await this.getToken(updatedUser);
    return { ...newToken, codes };

  }

  async confirmEmailVerification(locale: string, userId: number, { pin, challengeId }: EmailVerificationDto) {

    const challenge = await this.prisma.user_identifier_challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new NotFoundException(getLocaleText('challengeNotFound', locale, 'Challenge not found.'));
    }

    if (challenge.hash !== this.security.hashWithPepper(pin)) {
      throw new BadRequestException(getLocaleText('invalidPin', locale, 'Invalid PIN.'));
    }

    const verifiedAt = new Date();
    let userIdentifierId = challenge.user_identifier_id;

    await this.prisma.$transaction(async (tx) => {

      const challenge = await tx.user_identifier_challenge.findUnique({
        where: { id: challengeId },
      })

      if (!userIdentifierId) {
        const userIdentifier = await tx.user_identifier.findFirst({
          where: { user_id: userId, type: 'email', verified_at: null },
          select: { id: true }
        });
        
        if (!userIdentifier) {
          throw new NotFoundException(getLocaleText('identifierNotFound', locale, 'Email identifier not found.'));
        }
        
        userIdentifierId = userIdentifier.id;
        await tx.user_identifier_challenge.update({
          where: { id: challengeId },
          data: { user_identifier_id: userIdentifierId },
        });
      }

      // Mark challenge and identifier as verified
      await tx.user_identifier_challenge.update({
        where: { id: challengeId },
        data: { verified_at: verifiedAt },
      });

      await tx.user_identifier.update({
        where: { id: userIdentifierId },
        data: {
          verified_at: verifiedAt,
          enabled: true
        }
      });

      // Keep previous emails intact so the user can still authenticate with the old address.
      // The verified identifier above becomes the new active email, but older verified emails remain valid aliases.

    });

    const confirmedIdentifier = await this.prisma.user_identifier.findUnique({
      where: { id: userIdentifierId },
      select: { value: true },
    });
    if (confirmedIdentifier?.value) {
      this.eventEmitter.emit(PROFILE_EMAIL_CHANGED, new ProfileEmailChangedEvent(userId, confirmedIdentifier.value));
    }

    await this.user.registerUserActivity(userId, 'changeEmail');

    return { success: true };
  }

  async sendEmailVerificationMfa(locale: string, userId: number, { email }: SendEmailVerificationDto) {
    return this.challenge.verifyMfaEmail(locale, userId, email);
  }

  async sendEmailVerification(locale: string, userId: number, { email }: SendEmailVerificationDto) {
    return this.challenge.verifyEmail(locale, userId, email);    
  }

  async sendCodeToRemove(locale, userId, email){
    return this.challenge.verifyEmail(locale, userId, email)
  }

  async getEmailIdentifier(userId: number) {
    return this.prisma.user_identifier.findFirst({
      where: { user_id: userId, type: 'email', enabled: true},
    });
  }

  async getProfile(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async getMFAMethods(userId: number) {
    return this.prisma.user_mfa.findMany({
      where: {
        user_id: userId,
        verified_at: { not: null },
      },
      include: {
        user_mfa_email: true,
        user_mfa_totp: true,
        user_mfa_webauthn: true,
      },
    });
  }

  async updateMFA(userId: number, mfaId: number, { name }: UpdateDto){
    return this.prisma.user_mfa.update({
      where: { user_id: userId, id: mfaId },
      data: { name }
    })
  }

  async update(userid: number, { name }: UpdateDto) {
    const result = await this.prisma.user.update({
      where: { id: userid },
      data: { name },
    });
    if (name) {
      this.eventEmitter.emit(PROFILE_UPDATED, new ProfileUpdatedEvent(userid, name));
      await this.user.registerUserActivity(userid, 'updateProfile');
    }
    return result;
  }

  async updateAvatar(locale: string, userId: number, file: MulterFile) {
    const result = await this.user.changeAvatar(locale, userId, file);
    this.eventEmitter.emit(PROFILE_AVATAR_UPDATED, new ProfileAvatarUpdatedEvent(userId, result?.id ?? null));
    await this.user.registerUserActivity(userId, 'avatar_changed');
    return result;
  }

  async changePassword(locale:string, userId: number, {currentPassword, newPassword}: ChangePasswordDto, ipAddress?: string, userAgent?: string) {
    const credential =  await this.prisma.user_credential.findFirst({
      where: { user_id: userId, type: 'password' },
    });

    if (!credential) {
      throw new NotFoundException(getLocaleText('userNotFound', locale, 'User not found.'));
    }

    const isValidPassowrd = await this.security.validatePassword(locale, [credential], currentPassword)
    if (!isValidPassowrd) {
      throw new BadRequestException(getLocaleText('accessDenied', locale, 'Access denied.'));
    }

    const passwordHash = await this.security.hashArgon2(newPassword);
    await this.prisma.user_credential.update({
      where: { id: credential.id },
      data: { hash: passwordHash, requires_reset: false },
    });

    // Get user data and email for notification
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        user_identifier: {
          where: { type: 'email', enabled: true, verified_at: { not: null } },
          select: { value: true },
        },
      },
    });

    if (user?.user_identifier?.[0]?.value) {
      this.mail.sendTemplatedMail(locale, {
        email: user.user_identifier[0].value,
        slug: 'auth-change-password-notification',
        variables: {
          name: user.name,
          userAgent: userAgent || 'Unknown',
          ipAddress: ipAddress || 'Unknown',
          location: 'Unknown',
        },
      }).catch(error => {
        console.error('Failed to send password change notification:', error);
      });
    }

    await this.user.registerUserActivity(userId, 'changePassword');

    return { success: true };
  }

  generateRecoveryCodes(count = 10): string[] {
    const codes = Array.from({ length: count }, () => {
      const array = new Uint8Array(4);
      globalThis.crypto.getRandomValues(array);
      return Array.from(array)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    });
    return codes;
  }


  async createMfaRecoveryCodes(userId: number) {
    const codes = this.generateRecoveryCodes();
    await this.prisma.user_recovery_code.deleteMany({
      where: {
        user_id: userId,
      },
    });

    const data = await Promise.all(
      codes.map(async (code) => ({
        user_id: userId,
        hash: await this.security.hashArgon2(code),
      })),
    );

    await this.prisma.user_recovery_code.createMany({ data });
    return codes;
  }

  async getToken(user: user) {
    return { token: this.jwt.sign(user) };
  }

  async verifyMfaTotp(locale: string, userId: number, token: string, secret: string, name?: string) {
    const settings = await this.setting.getSettingValues([
      'mfa-issuer',
      'mfa-window',
      'mfa-setp',
      'system-name',
      'google_client_id',
      'google_client_secret',
      'google_scopes',
      'url',
      'mfa-challenge-expiration-minutes',
      'access-token-expiration-minutes'
    ]);

    const window = settings['mfa-window'] ?? 0;
    const step = settings['mfa-setp'] ?? 30;
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      include: { user_mfa: { include: { user_mfa_totp: true }}}
    });

    if (!user) {
      throw new NotFoundException(getLocaleText('userNotFound', locale, 'User not found'));
    }

    const decodedSecret = Buffer.from(secret, 'base64').toString('utf-8');
    const decryptedSecret = this.security.decrypt(decodedSecret);
    const isValid = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token,
      window,
      step
    });

    if (!isValid) {
      throw new BadRequestException(getLocaleText('invalidCode', locale, 'Invalid code'));
    }

    if (name){
      await this.prisma.user_mfa.create({
        data: { 
        name, 
        user_id: userId, 
        type: 'totp', 
        verified_at: new Date(), 
        user_mfa_totp: {
          create: {
            secret: Buffer.from(decryptedSecret, 'utf-8'),
          }
        },
        user_mfa_challenge: {
          create: {
            hash: await this.security.hashArgon2(decryptedSecret),
            attempts: 1,
            expires_at: new Date(),
            verified_at: new Date()
          }
        }},
      });
    }
    
    const updatedUser = await this.prisma.user.findFirst({ where: { id: user.id }})
    const codes = await this.createMfaRecoveryCodes(updatedUser.id);
    const newToken = await this.getToken(updatedUser);
    return { ...newToken, codes };
  }

  async generateMfaTotp(locale: string, userId: number) {

    const settings = await this.setting.getSettingValues([
      'mfa-issuer',
      'mfa-window',
      'mfa-setp',
      'system-name',
      'google_client_id',
      'google_client_secret',
      'google_scopes',
      'url',
      'mfa-challenge-expiration-minutes',
      'access-token-expiration-minutes'
    ]);

    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: {
        user_mfa: true,
        user_identifier: true
      },
    });

    const issuer = settings['mfa-issuer'] ?? 'Hedhog';
    const userEmail = user.user_identifier.find(ui => ui.type === 'email').value
    const appName = `${issuer} (${userEmail})`;

    const secret = speakeasy.generateSecret({
      length: 32,
      name: appName,
      otpauth: { label: appName, issuer },
      encoding: 'base32',
    });

    const step = settings['mfa-setp'] ?? 30;
    const otpauth = speakeasy.otpauthURL({
      secret: secret.base32,
      label: `${issuer}:${userEmail}`,
      issuer,
      period: step,
      encoding: 'base32',
    });

    const qrCode = await qrcode.toDataURL(otpauth);
    const encryptedSecret = this.security.encrypt(secret.base32);
    const encodedSecret = Buffer.from(encryptedSecret, 'utf-8').toString('base64');
    return { otpauthUrl: secret.otpauth_url, qrCode, secret: encodedSecret };
  }

  async removeMfaTotp(locale: string, userId: number, mfaId: number, token: string) {
    try {
      const user = await this.prisma.user.findFirst({
        where: { id: userId },
        include: { user_identifier: true, user_mfa: { include: { user_mfa_totp: true }} }
      });


      const totpMfa = user.user_mfa.find((m) => m.type === 'totp' && m.user_mfa_totp);
      if (!totpMfa || !totpMfa.user_mfa_totp) {
        throw new NotFoundException(getLocaleText('totpNotFound', locale, 'TOTP method not found'));
      }

      const secretBuffer = totpMfa.user_mfa_totp[0].secret;
      const secretBase32 = secretBuffer instanceof Uint8Array
        ? Buffer.from(secretBuffer).toString('utf-8')
        : String(secretBuffer);
      
      const encryptedSecret = this.security.encrypt(secretBase32);
      const encodedSecret = Buffer.from(encryptedSecret, 'utf-8').toString('base64');
      await this.verifyMfaTotp(locale, user.id, token, encodedSecret);
      await this.prisma.$transaction(async (tx) => {
        await tx.user_mfa.deleteMany({
          where: {
            id: mfaId,
            user_id: userId,
            type: 'totp',
          },
        });

        await tx.user_recovery_code.deleteMany({
          where: {
            user_id: userId,
          },
        });
      });

      return this.getUserToken(userId)
    } catch (error: any) {
      throw new BadRequestException(`Invalid code: ${error?.message}`);
    }
  }

  async removeMfaEmail(locale: string, userId: number, mfaId: number, token: string, providedHash: string) {
    try {
      await this.challenge.verifyCode(locale, userId, token, providedHash)
      await this.prisma.user_mfa.deleteMany({
        where: { id: mfaId, user_id: userId, type: 'email' },
      });

      return this.getUserToken(userId)
    } catch (error: any) {
      throw new BadRequestException(`Invalid code: ${error?.message}`);
    }
  }

  async removeMfaWithRecoveryCode(locale: string, userId: number, mfaId: number, recoveryCode: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          user_recovery_code: true,
        },
      });

      if (!user) {
        throw new NotFoundException(getLocaleText('userNotFound', locale, 'User not found'));
      }

      let isValid = false;
      for (const code of user.user_recovery_code) {
        if (await this.security.verifyArgon2(recoveryCode, code.hash)) {
          isValid = true;
          await this.prisma.user_recovery_code.delete({
            where: { id: code.id },
          });
          break;
        }
      }

      if (!isValid) {
        throw new BadRequestException(
          getLocaleText('invalidRecoveryCode', locale, 'Invalid recovery code.')
        );
      }

      await this.prisma.user_mfa.deleteMany({
        where: { id: mfaId, user_id: userId },
      });

      return this.getUserToken(userId);
    } catch (error: any) {
      throw new BadRequestException(`Invalid code: ${error?.message}`);
    }
  }

  async removeMfa(locale: string, userId: number, mfaId: number, data: { token?: string; hash?: string; verificationType?: 'totp' | 'email' | 'recovery' | 'webauthn'; assertionResponse?: any }, requestOrigin?: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          user_mfa: {
            where: { id: mfaId, verified_at: { not: null } },
            include: {
              user_mfa_totp: true,
              user_mfa_email: true,
              user_mfa_webauthn: true
            }
          },
          user_recovery_code: true
        }
      });

      if (!user) {
        throw new BadRequestException(
          getLocaleText('userNotFound', locale, 'User not found.')
        );
      }

      const mfaToRemove = user.user_mfa.find(m => m.id === mfaId);
      if (!mfaToRemove) {
        throw new BadRequestException(
          getLocaleText('mfaMethodNotFound', locale, 'MFA method not found.')
        );
      }

      if (data.verificationType !== 'webauthn' && !data.token) {
        throw new BadRequestException(
          getLocaleText('verificationCodeRequired', locale, 'Verification code is required.')
        );
      }

      if (data.verificationType === 'webauthn') {
        if (!data.assertionResponse) {
          throw new BadRequestException(
            getLocaleText('assertionResponseRequired', locale, 'Assertion response is required for WebAuthn.')
          );
        }

        try {
          await this.verifyWebAuthnAuthentication(userId, data.assertionResponse, requestOrigin);
        } catch (error) {
          throw new BadRequestException(
            getLocaleText('invalidWebAuthn', locale, 'WebAuthn verification failed.')
          );
        }
      } else if (data.verificationType === 'recovery') {
        if (!data.token) {
          throw new BadRequestException(
            getLocaleText('verificationCodeRequired', locale, 'Verification code is required.')
          );
        }

        let isValid = false;
        for (const recoveryCode of user.user_recovery_code) {
          if (await this.security.verifyArgon2(data.token, recoveryCode.hash)) {
            isValid = true;
            await this.prisma.user_recovery_code.delete({
              where: { id: recoveryCode.id }
            });
            break;
          }
        }

        if (!isValid) {
          throw new BadRequestException(
            getLocaleText('invalidRecoveryCode', locale, 'Invalid recovery code.')
          );
        }
      } else if (data.verificationType === 'email' || mfaToRemove.type === 'email') {
        if (!data.token) {
          throw new BadRequestException(
            getLocaleText('verificationCodeRequired', locale, 'Verification code is required.')
          );
        }

        try {
          const isValid = await this.challenge.verifyMfaEmailCode(locale, userId, data.token);
          if (!isValid) {
            throw new BadRequestException(
              getLocaleText('invalidVerificationCode', locale, 'Invalid verification code.')
            );
          }
        } catch (error) {
          throw new BadRequestException(
            getLocaleText('invalidVerificationCode', locale, 'Invalid verification code.')
          );
        }
      } else if (data.verificationType === 'totp' || mfaToRemove.type === 'totp') {
        const totpMfa = user.user_mfa.find(m => m.type === 'totp' && m.user_mfa_totp);
        if (!totpMfa || !totpMfa.user_mfa_totp || !totpMfa.user_mfa_totp[0]) {
          throw new BadRequestException(
            getLocaleText('totpMfaNotFound', locale, 'TOTP MFA not found.')
          );
        }

        const secretBuffer = totpMfa.user_mfa_totp[0].secret;
        const secretBase32 = secretBuffer instanceof Uint8Array
          ? Buffer.from(secretBuffer).toString('utf-8')
          : String(secretBuffer);
        
        const encryptedSecret = this.security.encrypt(secretBase32);
        const encodedSecret = Buffer.from(encryptedSecret, 'utf-8').toString('base64');
        
        try {
          await this.verifyMfaTotp(locale, userId, data.token, encodedSecret);
        } catch (error) {
          throw new BadRequestException(
            getLocaleText('invalidVerificationCode', locale, 'Invalid verification code.')
          );
        }
      }

      await this.prisma.user_mfa.deleteMany({
        where: { id: mfaId, user_id: userId },
      });

      return this.getUserToken(userId);
    } catch (error: any) {
      throw new BadRequestException(`Failed to remove MFA: ${error?.message}`);
    }
  }

  async checkMfaBeforeAdd(locale: string, userId: number) {
    try {
      const mfaMethods = await this.prisma.user_mfa.findMany({
        where: { 
          user_id: userId,
          verified_at: { not: null }
        },
        include: {
          user_mfa_totp: true,
          user_mfa_email: true,
          user_mfa_webauthn: true
        }
      });

      if (mfaMethods.length === 0) {
        return { requiresVerification: false };
      }

      const totpMfa = mfaMethods.find(m => m.type === 'totp' && m.user_mfa_totp);
      const emailMfas = mfaMethods.filter(m => m.type === 'email' && m.user_mfa_email && m.user_mfa_email.length > 0);
      const webauthnMfa = mfaMethods.find(m => m.type === 'webauthn' && m.user_mfa_webauthn);

      const availableMethods: ('totp' | 'email')[] = [];

      if (totpMfa) {
        availableMethods.push('totp');
      }

      if (emailMfas.length > 0) {
        const emails = emailMfas.map(mfa => mfa.user_mfa_email[0].email);
        await this.challenge.sendMfaCodeToMultipleEmails(locale, userId, emails);
        availableMethods.push('email');
      }

      if (availableMethods.length === 0 && !webauthnMfa) {
        return { requiresVerification: false };
      }

      if (availableMethods.length === 0 && webauthnMfa) {
        return {
          requiresVerification: true,
          availableMethods: [],
          hasWebAuthn: true,
          hasRecoveryCodes: true,
        };
      }

      if (availableMethods.length === 2) {
        return {
          requiresVerification: true,
          availableMethods,
          hasWebAuthn: !!webauthnMfa,
          hasRecoveryCodes: true,
        };
      }

      return {
        requiresVerification: true,
        verificationType: availableMethods[0],
        hasWebAuthn: !!webauthnMfa,
        hasRecoveryCodes: true,
      };
    } catch (error: any) {
      throw new BadRequestException(`Failed to check MFA: ${error?.message}`);
    }
  }

  async checkMfaBeforeRemove(locale: string, userId: number) {
    try {
      const mfaMethods = await this.prisma.user_mfa.findMany({
        where: { 
          user_id: userId,
          verified_at: { not: null }
        },
        include: {
          user_mfa_totp: true,
          user_mfa_email: true,
          user_mfa_webauthn: true
        }
      });

      if (mfaMethods.length === 0) {
        throw new BadRequestException(
          getLocaleText('noMfaMethodsFound', locale, 'No MFA methods found.')
        );
      }

      const totpMfa = mfaMethods.find(m => m.type === 'totp' && m.user_mfa_totp);
      const emailMfas = mfaMethods.filter(m => m.type === 'email' && m.user_mfa_email && m.user_mfa_email.length > 0);
      const webauthnMfa = mfaMethods.find(m => m.type === 'webauthn' && m.user_mfa_webauthn);
      const availableMethods: ('totp' | 'email')[] = [];

      if (totpMfa) {
        availableMethods.push('totp');
      }

      if (emailMfas.length > 0) {
        const emails = emailMfas.map(mfa => mfa.user_mfa_email[0].email);
        await this.challenge.sendMfaCodeToMultipleEmails(locale, userId, emails);
        availableMethods.push('email');
      }

      return {
        requiresVerification: true,
        availableMethods,
        hasWebAuthn: !!webauthnMfa,
        hasRecoveryCodes: mfaMethods.length > 0,
      };
    } catch (error: any) {
      throw new BadRequestException(`Failed to check MFA before remove: ${error?.message}`);
    }
  }

  async verifyBeforeAddMfa(
    locale: string,
    userId: number,
    data: { verificationCode?: string; hash?: string; verificationType: 'totp' | 'email' | 'recovery' | 'webauthn'; assertionResponse?: any },
    requestOrigin?: string
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          user_mfa: {
            where: { verified_at: { not: null } },
            include: {
              user_mfa_totp: true,
              user_mfa_email: true,
              user_mfa_webauthn: true
            }
          },
          user_recovery_code: true
        }
      });

      if (!user) {
        throw new BadRequestException(
          getLocaleText('userNotFound', locale, 'User not found.')
        );
      }

      if (user.user_mfa.length === 0) {
        return { success: true };
      }

      if (data.verificationType === 'webauthn') {
        if (!data.assertionResponse) {
          throw new BadRequestException(
            getLocaleText('assertionResponseRequired', locale, 'Assertion response is required for WebAuthn.')
          );
        }

        try {
          await this.verifyWebAuthnAuthentication(userId, data.assertionResponse, requestOrigin);
        } catch (error) {
          throw new BadRequestException(
            getLocaleText('invalidWebAuthn', locale, 'WebAuthn verification failed.')
          );
        }
      } else if (data.verificationType === 'recovery') {
        if (!data.verificationCode) {
          throw new BadRequestException(
            getLocaleText('verificationCodeRequired', locale, 'Verification code is required.')
          );
        }

        let isValid = false;
        for (const recoveryCode of user.user_recovery_code) {
          if (await this.security.verifyArgon2(data.verificationCode, recoveryCode.hash)) {
            isValid = true;
            await this.prisma.user_recovery_code.delete({
              where: { id: recoveryCode.id }
            });
            break;
          }
        }

        if (!isValid) {
          throw new BadRequestException(
            getLocaleText('invalidRecoveryCode', locale, 'Invalid recovery code.')
          );
        }
      } else if (data.verificationType === 'email') {
        const emailMfa = user.user_mfa.find(m => m.type === 'email' && m.user_mfa_email);
        if (!emailMfa) {
          throw new BadRequestException(
            getLocaleText('emailMfaNotFound', locale, 'Email MFA not found.')
          );
        }

        if (!data.verificationCode) {
          throw new BadRequestException(
            getLocaleText('verificationCodeRequired', locale, 'Verification code is required.')
          );
        }
        
        try {
          const isValid = await this.challenge.verifyMfaEmailCode(locale, userId, data.verificationCode);
          if (!isValid) {
            throw new BadRequestException(
              getLocaleText('invalidVerificationCode', locale, 'Invalid verification code.')
            );
          }
        } catch (error) {
          throw new BadRequestException(
            getLocaleText('invalidVerificationCode', locale, 'Invalid verification code.')
          );
        }
      } else {
        const totpMfa = user.user_mfa.find(m => m.type === 'totp' && m.user_mfa_totp);
        if (!totpMfa || !totpMfa.user_mfa_totp[0]) {
          throw new BadRequestException(
            getLocaleText('totpMfaNotFound', locale, 'TOTP MFA not found.')
          );
        }

        const secretBuffer = totpMfa.user_mfa_totp[0].secret;
        const secretBase32 = secretBuffer instanceof Uint8Array
          ? Buffer.from(secretBuffer).toString('utf-8')
          : String(secretBuffer);

        const encryptedSecret = this.security.encrypt(secretBase32);
        const encodedSecret = Buffer.from(encryptedSecret, 'utf-8').toString('base64');
        
        try {
          await this.verifyMfaTotp(locale, userId, data.verificationCode, encodedSecret);
        } catch (error) {
          throw new BadRequestException(
            getLocaleText('invalidVerificationCode', locale, 'Invalid verification code.')
          );
        }
      }

      return { success: true };
    } catch (error: any) {
      throw new BadRequestException(`Failed to verify MFA: ${error?.message}`);
    }
  }

  async sendRecoveryCodesVerification(locale: string, userId: number) {
    try {
      const mfaMethods = await this.prisma.user_mfa.findMany({
        where: { 
          user_id: userId,
          verified_at: { not: null }
        },
        include: {
          user_mfa_totp: true,
          user_mfa_email: true,
          user_mfa_webauthn: true
        }
      });

      if (mfaMethods.length === 0) {
        return { requiresVerification: false };
      }

      const totpMfa = mfaMethods.find(m => m.type === 'totp' && m.user_mfa_totp);
      const emailMfas = mfaMethods.filter(m => m.type === 'email' && m.user_mfa_email && m.user_mfa_email.length > 0);
      const webauthnMfa = mfaMethods.find(m => m.type === 'webauthn' && m.user_mfa_webauthn);
      const availableMethods: ('totp' | 'email')[] = [];

      if (totpMfa) {
        availableMethods.push('totp');
      }

      if (emailMfas.length > 0) {
        const emails = emailMfas.map(mfa => mfa.user_mfa_email[0].email);
        await this.challenge.sendMfaCodeToMultipleEmails(locale, userId, emails);
        availableMethods.push('email');
      }

      if (availableMethods.length === 0 && !webauthnMfa) {
        return { requiresVerification: false };
      }

      if (availableMethods.length === 0 && webauthnMfa) {
        return {
          requiresVerification: true,
          availableMethods: [],
          hasWebAuthn: true,
          hasRecoveryCodes: true,
        };
      }

      if (availableMethods.length === 2) {
        return {
          requiresVerification: true,
          availableMethods,
          hasWebAuthn: !!webauthnMfa,
          hasRecoveryCodes: true, 
        };
      }

      return {
        requiresVerification: true,
        verificationType: availableMethods[0],
        hasWebAuthn: !!webauthnMfa,
        hasRecoveryCodes: true, 
      };
    } catch (error: any) {
      throw new BadRequestException(`Failed to send verification: ${error?.message}`);
    }
  }

  async regenerateRecoveryCodes(locale: string, userId: number, data: { verificationCode?: string; hash?: string; verificationType?: 'totp' | 'email' | 'recovery' | 'webauthn'; assertionResponse?: any }, requestOrigin?: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          user_mfa: {
            where: { verified_at: { not: null } },
            include: {
              user_mfa_totp: true,
              user_mfa_email: true,
              user_mfa_webauthn: true
            }
          },
          user_recovery_code: true
        }
      });

      if (!user) {
        throw new BadRequestException(
          getLocaleText('userNotFound', locale, 'User not found.')
        );
      }

      if (user.user_mfa.length > 0) {
        if (data.verificationType !== 'webauthn' && !data.verificationCode) {
          throw new BadRequestException(
            getLocaleText('verificationCodeRequired', locale, 'Verification code is required.')
          );
        }

        if (data.verificationType === 'webauthn') {
          if (!data.assertionResponse) {
            throw new BadRequestException(
              getLocaleText('assertionResponseRequired', locale, 'Assertion response is required for WebAuthn.')
            );
          }

          try {
            await this.verifyWebAuthnAuthentication(userId, data.assertionResponse, requestOrigin);
          } catch (error) {
            throw new BadRequestException(
              getLocaleText('invalidWebAuthn', locale, 'WebAuthn verification failed.')
            );
          }
        } else if (data.verificationType === 'recovery') {
          if (!data.verificationCode) {
            throw new BadRequestException(
              getLocaleText('verificationCodeRequired', locale, 'Verification code is required.')
            );
          }

          let isValid = false;
          for (const recoveryCode of user.user_recovery_code) {
            if (await this.security.verifyArgon2(data.verificationCode, recoveryCode.hash)) {
              isValid = true;
              await this.prisma.user_recovery_code.delete({
                where: { id: recoveryCode.id }
              });
              break;
            }
          }

          if (!isValid) {
            throw new BadRequestException(
              getLocaleText('invalidRecoveryCode', locale, 'Invalid recovery code.')
            );
          }
        } else if (data.verificationType === 'email') {
          const emailMfa = user.user_mfa.find(m => m.type === 'email' && m.user_mfa_email);
          if (!emailMfa) {
            throw new BadRequestException(
              getLocaleText('emailMfaNotFound', locale, 'Email MFA not found.')
            );
          }

          if (!data.verificationCode) {
            throw new BadRequestException(
              getLocaleText('verificationCodeRequired', locale, 'Verification code is required.')
            );
          }
          
          try {
            const isValid = await this.challenge.verifyMfaEmailCode(locale, userId, data.verificationCode);
            if (!isValid) {
              throw new BadRequestException(
                getLocaleText('invalidVerificationCode', locale, 'Invalid verification code.')
              );
            }
          } catch (error) {
            throw new BadRequestException(
              getLocaleText('invalidVerificationCode', locale, 'Invalid verification code.')
            );
          }
        } else {
          const totpMfa = user.user_mfa.find(m => m.type === 'totp' && m.user_mfa_totp);
          if (!totpMfa || !totpMfa.user_mfa_totp[0]) {
            throw new BadRequestException(
              getLocaleText('totpMfaNotFound', locale, 'TOTP MFA not found.')
            );
          }

          const secretBuffer = totpMfa.user_mfa_totp[0].secret;
          const secretBase32 = secretBuffer instanceof Uint8Array
            ? Buffer.from(secretBuffer).toString('utf-8')
            : String(secretBuffer);
          
          const encryptedSecret = this.security.encrypt(secretBase32);
          const encodedSecret = Buffer.from(encryptedSecret, 'utf-8').toString('base64');
          
          try {
            await this.verifyMfaTotp(locale, userId, data.verificationCode, encodedSecret);
          } catch (error) {
            throw new BadRequestException(
              getLocaleText('invalidVerificationCode', locale, 'Invalid verification code.')
            );
          }
        }
      }

      const codes = await this.createMfaRecoveryCodes(userId);
      return { codes };
    } catch (error: any) {
      throw new BadRequestException(`Failed to regenerate recovery codes: ${error?.message}`);
    }
  }

  async generateWebAuthnRegistrationOptions(locale: string, userId: number, name: string, requestOrigin?: string) {
    try {
      const user = await this.prisma.user.findFirst({
        where: { id: userId },
        include: {
          user_identifier: true,
          user_mfa: {
            where: { type: 'webauthn', verified_at: { not: null } },
            include: { user_mfa_webauthn: true }
          }
        }
      });

      if (!user) {
        throw new NotFoundException(getLocaleText('userNotFound', locale, 'User not found.'));
      }

      const settings = await this.setting.getSettingValues([
        'mfa-issuer',
        'mfa-window',
        'mfa-setp',
        'system-name',
        'google_client_id',
        'google_client_secret',
        'google_scopes',
        'url',
        'mfa-challenge-expiration-minutes',
        'access-token-expiration-minutes'
      ]);

      const rpName = settings['system-name'] || 'HedHog';
      const { rpID } = resolveWebAuthnOrigin(requestOrigin);
      const userEmail = user.user_identifier.find(ui => ui.type === 'email')?.value || `user${userId}@example.com`;
      const existingAuthenticators = user.user_mfa
        .filter(mfa => mfa.user_mfa_webauthn && mfa.user_mfa_webauthn.length > 0)
        .map(mfa => ({
          credentialID: mfa.user_mfa_webauthn[0].credential_id,
          credentialPublicKey: mfa.user_mfa_webauthn[0].public_key,
          counter: mfa.user_mfa_webauthn[0].sign_count,
        }));

      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userName: userEmail,
        userDisplayName: user.name || userEmail,
        attestationType: 'none',
        excludeCredentials: existingAuthenticators.map(auth => ({
          id: Buffer.from(auth.credentialID).toString('base64url'),
        })),
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
      });

      await this.prisma.user_mfa_challenge.create({
        data: {
          user_mfa: {
            create: {
              user_id: userId,
              type: 'webauthn',
              name: name || 'Security Key',
            }
          },
          hash: options.challenge,
          attempts: 0,
          expires_at: new Date(Date.now() + 5 * 60 * 1000),
        }
      });

      return options;
    } catch (error: any) {
      throw new BadRequestException(`Failed to generate registration options: ${error?.message}`);
    }
  }

  async verifyWebAuthnRegistration(
    locale: string,
    userId: number,
    name: string,
    attestationResponse: any,
    requestOrigin?: string
  ) {
    try {
      const challengeRecord = await this.prisma.user_mfa_challenge.findFirst({
        where: {
          user_mfa: {
            user_id: userId,
            type: 'webauthn',
            verified_at: null,
          },
          expires_at: { gt: new Date() }
        },
        include: { user_mfa: true },
        orderBy: { created_at: 'desc' }
      });

      if (!challengeRecord) {
        throw new BadRequestException(
          getLocaleText('challengeNotFound', locale, 'Challenge not found or expired.')
        );
      }

      const { rpID, expectedOrigin } = resolveWebAuthnOrigin(requestOrigin);
      const verification: VerifiedRegistrationResponse = await verifyRegistrationResponse({
        response: attestationResponse,
        expectedChallenge: challengeRecord.hash,
        expectedOrigin,
        expectedRPID: rpID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        throw new BadRequestException(
          getLocaleText('verificationFailed', locale, 'Verification failed.')
        );
      }

      const { credential } = verification.registrationInfo;
      await this.prisma.user_mfa.update({
        where: { id: challengeRecord.user_mfa_id },
        data: {
          name,
          verified_at: new Date(),
          user_mfa_webauthn: {
            create: {
              credential_id: Buffer.from(credential.id, 'base64url'),
              public_key: credential.publicKey,
              sign_count: credential.counter,
            }
          }
        }
      });

      await this.prisma.user_mfa_challenge.update({
        where: { id: challengeRecord.id },
        data: { verified_at: new Date() }
      });

      const codes = await this.createMfaRecoveryCodes(userId);
      return { success: true, codes };
    } catch (error: any) {
      throw new BadRequestException(`Failed to verify registration: ${error?.message}`);
    }
  }

  async generateWebAuthnAuthenticationOptions(locale: string, userId: number, requestOrigin?: string) {
    try {
      const user = await this.prisma.user.findFirst({
        where: { id: userId },
        include: {
          user_mfa: {
            where: { type: 'webauthn', verified_at: { not: null } },
            include: { user_mfa_webauthn: true }
          }
        }
      });

      if (!user || user.user_mfa.length === 0) {
        throw new NotFoundException(
          getLocaleText('webauthnNotConfigured', locale, 'WebAuthn not configured.')
        );
      }

      const { rpID } = resolveWebAuthnOrigin(requestOrigin);
      const allowCredentials = user.user_mfa
        .filter(mfa => mfa.user_mfa_webauthn && mfa.user_mfa_webauthn.length > 0)
        .map(mfa => ({
          id: Buffer.from(mfa.user_mfa_webauthn[0].credential_id).toString('base64url'),
        }));

      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials,
        userVerification: 'preferred',
      });

      await this.prisma.user_mfa_challenge.create({
        data: {
          user_mfa_id: user.user_mfa[0].id,
          hash: options.challenge,
          attempts: 0,
          expires_at: new Date(Date.now() + 5 * 60 * 1000),
        }
      });

      return options;
    } catch (error: any) {
      throw new BadRequestException(`Failed to generate authentication options: ${error?.message}`);
    }
  }

  async verifyWebAuthnAuthentication(userId: number, assertionResponse: any, requestOrigin?: string) {
    try {
      const challengeRecord = await this.prisma.user_mfa_challenge.findFirst({
        where: {
          user_mfa: {
            user_id: userId,
            type: 'webauthn',
            verified_at: { not: null },
          },
          verified_at: null,
          expires_at: { gt: new Date() }
        },
        include: {
          user_mfa: {
            include: { user_mfa_webauthn: true }
          }
        },
        orderBy: { created_at: 'desc' }
      });

      if (!challengeRecord || !challengeRecord.user_mfa.user_mfa_webauthn[0]) {
        throw new BadRequestException('Challenge not found or expired.');
      }

      const authenticator = challengeRecord.user_mfa.user_mfa_webauthn[0];
      const { rpID, expectedOrigin } = resolveWebAuthnOrigin(requestOrigin);
      const verification: VerifiedAuthenticationResponse = await verifyAuthenticationResponse({
        response: assertionResponse,
        expectedChallenge: challengeRecord.hash,
        expectedOrigin,
        expectedRPID: rpID,
        credential: {
          id: Buffer.from(authenticator.credential_id).toString('base64url'),
          publicKey: authenticator.public_key,
          counter: authenticator.sign_count,
        },
      });

      if (!verification.verified) {
        throw new BadRequestException('Verification failed.');
      }

      await this.prisma.user_mfa_webauthn.update({
        where: { id: authenticator.id },
        data: {
          sign_count: verification.authenticationInfo.newCounter,
          last_used_at: new Date(),
        }
      });

      await this.prisma.user_mfa_challenge.update({
        where: { id: challengeRecord.id },
        data: { verified_at: new Date() }
      });

      return { success: true };
    } catch (error: any) {
      throw new BadRequestException(`Failed to verify authentication: ${error?.message}`);
    }
  }

  async removeWebAuthnMfa(locale: string, userId: number, mfaId: number) {
    try {
      const mfa = await this.prisma.user_mfa.findFirst({
        where: {
          id: mfaId,
          user_id: userId,
          type: 'webauthn',
        },
      });

      if (!mfa) {
        throw new NotFoundException(
          getLocaleText('mfaNotFound', locale, 'MFA method not found.')
        );
      }

      await this.prisma.user_mfa.delete({
        where: { id: mfaId },
      });

      return { success: true };
    } catch (error: any) {
      throw new BadRequestException(`Failed to remove WebAuthn: ${error?.message}`);
    }
  }

  async generateWebAuthnAuthenticationOptionsForLogin(locale: string, mfaToken: string) {
    try {
      const decoded = this.jwt.decode(mfaToken) as any;
      if (!decoded || !decoded.userId) {
        throw new BadRequestException('Invalid MFA token');
      }

      const user = await this.prisma.user.findFirst({
        where: { id: decoded.userId },
        include: {
          user_mfa: {
            where: { type: 'webauthn', verified_at: { not: null } },
            include: { user_mfa_webauthn: true }
          }
        }
      });

      if (!user || user.user_mfa.length === 0) {
        throw new NotFoundException(getLocaleText('webauthnNotConfigured', locale, 'WebAuthn not configured.'));
      }

      const primaryOrigin = (process.env.CORS_ALLOWED_ORIGINS ?? '').split(/[\n,;]+/).map(u => u.trim()).filter(Boolean)[0] ?? 'http://localhost:3200';
      const rpID = new URL(primaryOrigin).hostname;
      const allowCredentials = user.user_mfa
        .filter(mfa => mfa.user_mfa_webauthn && mfa.user_mfa_webauthn.length > 0)
        .map(mfa => ({
          id: Buffer.from(mfa.user_mfa_webauthn[0].credential_id).toString('base64url'),
        }));

      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials,
        userVerification: 'preferred',
      });

      await this.prisma.user_mfa_challenge.create({
        data: {
          user_mfa_id: user.user_mfa[0].id,
          hash: options.challenge,
          attempts: 0,
          expires_at: new Date(Date.now() + 5 * 60 * 1000), 
        }
      });

      return options;
    } catch (error: any) {
      throw new BadRequestException(`Failed to generate authentication options: ${error?.message}`);
    }
  }

  async verifyWebAuthnAuthenticationForLogin(locale: string, mfaToken: string, assertionResponse: any) {
    try {
      const decoded = this.jwt.decode(mfaToken) as any;
      if (!decoded || !decoded.userId) {
        throw new BadRequestException('Invalid MFA token');
      }

      const userId = decoded.userId;
      const challengeRecord = await this.prisma.user_mfa_challenge.findFirst({
        where: {
          user_mfa: {
            user_id: userId,
            type: 'webauthn',
            verified_at: { not: null },
          },
          verified_at: null,
          expires_at: { gt: new Date() }
        },
        include: {
          user_mfa: {
            include: { user_mfa_webauthn: true }
          }
        },
        orderBy: { created_at: 'desc' }
      });

      if (!challengeRecord || !challengeRecord.user_mfa.user_mfa_webauthn[0]) {
        throw new BadRequestException('Challenge not found or expired.');
      }

      const authenticator = challengeRecord.user_mfa.user_mfa_webauthn[0];
      const primaryOrigin = (process.env.CORS_ALLOWED_ORIGINS ?? '').split(/[\n,;]+/).map(u => u.trim()).filter(Boolean)[0] ?? 'http://localhost:3200';
      const rpID = new URL(primaryOrigin).hostname;
      const expectedOrigin = primaryOrigin;
      const verification: VerifiedAuthenticationResponse = await verifyAuthenticationResponse({
        response: assertionResponse,
        expectedChallenge: challengeRecord.hash,
        expectedOrigin,
        expectedRPID: rpID,
        credential: {
          id: Buffer.from(authenticator.credential_id).toString('base64url'),
          publicKey: authenticator.public_key,
          counter: authenticator.sign_count,
        },
      });

      if (!verification.verified) {
        throw new BadRequestException('Verification failed.');
      }

      await this.prisma.user_mfa_webauthn.update({
        where: { id: authenticator.id },
        data: {
          sign_count: verification.authenticationInfo.newCounter,
          last_used_at: new Date(),
        }
      });

      await this.prisma.user_mfa_challenge.update({
        where: { id: challengeRecord.id },
        data: { verified_at: new Date() }
      });

      const user = await this.prisma.user.findFirst({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(getLocaleText('userNotFound', locale, 'User not found'));
      }
      const payload = { sub: userId };
      const accessToken = await this.token.createAccessToken(payload);
      const refreshToken = this.jwt.sign({ userId, type: 'refresh' }, { expiresIn: '7d' });

      return {
        accessToken,
        refreshToken,
      };
    } catch (error: any) {
      throw new BadRequestException(`Failed to verify authentication: ${error?.message}`);
    }
  }

  async getUserToken(userId: number){
    const updatedUser = await this.prisma.user.findFirst({ where: { id: userId }})
    return this.getToken(updatedUser);
  }
}
