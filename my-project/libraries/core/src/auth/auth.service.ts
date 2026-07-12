import { getLocaleText } from '@hed-hog/api-locale';
import { PrismaService } from '@hed-hog/api-prisma';
import { User } from '@hed-hog/api-types';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ChallengeService } from '../challenge/challenge.service';
import { MailService as MailManagerService } from '../mail/mail.service';
import { SecurityService } from '../security/security.service';
import { SessionService } from '../session/session.service';
import { SettingService } from '../setting/setting.service';
import { TokenService } from '../token/token.service';
import { UserService } from '../user/user.service';
import { resolveWebAuthnOrigin } from '../utils/webauthn-origin';
import { ForgetDTO } from './dto/forget.dto';
import { LoginDTO } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(forwardRef(() => PrismaService))
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MailManagerService))
    private readonly mail: MailManagerService,
    @Inject(forwardRef(() => SettingService))
    private readonly setting: SettingService,
    @Inject(forwardRef(() => SecurityService))
    private readonly security: SecurityService,
    @Inject(forwardRef(() => TokenService))
    private readonly token: TokenService,
    @Inject(forwardRef(() => SessionService))
    private readonly session: SessionService,
    @Inject(forwardRef(() => UserService))
    private readonly user: UserService,
    @Inject(forwardRef(() => ChallengeService))
    private readonly challenge: ChallengeService,
  ) { }

  async getAuthenticationPayload(locale: string, userId: number, ipAddress: string, userAgent: string, browserId?: string | null) {
    const { token: refreshToken, session } = await this.session.create(locale, userId, ipAddress, userAgent, browserId);
    const payload = { sub: userId, sessionId: session.id };
    const accessToken = await this.token.createAccessToken(payload);
    await this.prisma.user.update({ where: { id: userId }, data: { last_login_at: new Date() } });
    this.logger.debug(`[AuthService] Session created userId=${userId} sessionId=${session.id}`);

    return {
      accessToken,
      refreshToken,
      session,
    }

  }

  async issueDesktopToken(locale: string, userId: number, ipAddress: string, userAgent: string) {
    const { accessToken, refreshToken } = await this.getAuthenticationPayload(locale, userId, ipAddress, userAgent);
    return { accessToken, refreshToken };
  }

  private hasPendingPasswordReset(user: User | any) {
    return Boolean(
      user?.user_credential?.some(
        (credential) =>
          credential.type === 'password' &&
          credential.requires_reset === true &&
          !credential.revoked_at,
      ),
    );
  }

  private async getRequiresPasswordResetByUserId(userId: number) {
    const credential = await this.prisma.user_credential.findFirst({
      where: {
        user_id: userId,
        type: 'password',
        requires_reset: true,
        revoked_at: null,
      },
      select: { id: true },
    });

    return Boolean(credential?.id);
  }

  async requiresMfaForLogin(locale: string, email: string, user: any) {

    const settings = await this.setting.getSettingValues([
      'require-mfa',
      'require-email-verification',
      'mfa-email-code-length',
      'mfa-challenge-expiration-minutes'
    ]);

    const code = this.security.generateCode(settings['mfa-email-code-length'] || 6);
    const codeHash = this.security.hashWithPepper(code);

    const identifier = await this.prisma.user_identifier.findFirst({
      where: {
        user_id: user.id,
        type: 'email',
        value: email,
      },
      select: { id: true }
    });

    if (!identifier) {
      throw new NotFoundException(getLocaleText('identifierNotFound', locale, 'Email identifier not found or already verified.'));
    }

    const challengeIdentifier = await this.prisma.user_identifier_challenge.create({
      data: {
        hash: codeHash,
        expires_at: new Date(Date.now() + (settings['mfa-challenge-expiration-minutes'] || 15) * 60000),
        user_identifier_id: identifier.id,
      },
      select: {
        id: true,
      }
    });

    const mfa = await this.prisma.user_mfa.create({
      data: {
        name: getLocaleText('mfaEmailDefaultName', locale, 'Email MFA'),
        type: 'email',
        user_id: user.id,
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
        user_mfa_challenge: {
          select: { id: true }
        }
      }
    });

    const challengeMfaId = mfa.user_mfa_challenge[0].id;

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

    return {
      requiresMfa: true,
      token: await this.token.createAccessToken({
        challengeIdentifierId: challengeIdentifier.id,
        challengeMfaId,
      })
    }
  }

  async requiresEmailVerificationForLogin(locale: string, email: string, user: any) {

    const settings = await this.setting.getSettingValues([
      'require-mfa',
      'require-email-verification',
      'mfa-email-code-length',
      'mfa-challenge-expiration-minutes'
    ]);

    const code = this.security.generateCode(settings['mfa-email-code-length'] || 6);
    const codeHash = this.security.hashWithPepper(code);

    const identifier = await this.prisma.user_identifier.findFirst({
      where: {
        user_id: user.id,
        type: 'email',
        value: email,
      },
      select: { id: true }
    });

    if (!identifier) {
      throw new NotFoundException(getLocaleText('identifierNotFound', locale, 'Email identifier not found or already verified.'));
    }

    const challengeIdentifier = await this.prisma.user_identifier_challenge.create({
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
        slug: 'auth-email-verification-code',
        variables: {
          code,
          name: user.name,
        }
      }
    );

    return {
      requiresEmailVerification: true,
      token: await this.token.createAccessToken({
        challengeIdentifierId: challengeIdentifier.id,
        email
      })
    }

  }

  async emailVerificationLoginResend(locale: string, token: string) {

    try {
      const payload = await this.token.verify(locale, token);

      const challenge = await this.prisma.user_identifier_challenge.findUnique({
        where: { id: payload.challengeIdentifierId },
        select: {
          user_identifier: {
            select: {
              user_id: true
            }
          }
        }
      });

      if (!challenge) {
        throw new NotFoundException(getLocaleText('challengeNotFound', locale, 'Challenge not found.'));
      }

      const user = await this.user.findUserById(locale, challenge.user_identifier.user_id);

      return await this.requiresEmailVerificationForLogin(locale, payload.email, user);

    } catch (error: any) {
      if (error.message?.includes('jwt expired') || error.name === 'TokenExpiredError') {
        
        const expiredPayload = await this.token.decodeExpiredToken(token);
        const newToken = await this.token.createAccessToken({
            challengeIdentifierId: expiredPayload.challengeIdentifierId,
            email: expiredPayload.email
          });

        return this.emailVerificationLoginResend(locale, newToken);
      }
      
      throw error;
    }
  }

  async emailVerificationLogin(locale: string, token: string, code: string, ipAddress: string, userAgent: string, res: any, browserId?: string | null) {

    try {
      const payload = await this.token.verify(locale, token);

      const challenge = await this.prisma.user_identifier_challenge.findUnique({
        where: { id: payload.challengeIdentifierId },
        select: {
          hash: true,
          user_identifier_id: true,
          user_identifier: {
            select: {
              user_id: true
            }
          }
        }
      });

      if (!challenge) {
        throw new NotFoundException(getLocaleText('challengeNotFound', locale, 'Challenge not found.'));
      }

      await this.prisma.user_identifier_challenge.update({
        where: { id: payload.challengeIdentifierId },
        data: {
          attempts: { increment: 1 }
        }
      });

      if (challenge.hash !== this.security.hashWithPepper(code)) {
        throw new BadRequestException(getLocaleText('invalidVerificationCode', locale, 'Invalid verification code.'));
      }

      await this.prisma.$transaction(async (tx) => {

        await tx.user_identifier_challenge.update({
          where: { id: payload.challengeIdentifierId },
          data: {
            verified_at: new Date(),
          }
        });

        await tx.user_identifier.update({
          where: { id: challenge.user_identifier_id },
          data: {
            verified_at: new Date(),
          }
        });

      });

      const user = await this.user.findUserById(locale, challenge.user_identifier.user_id);

      return this.login(locale, user as unknown as User, ipAddress, userAgent, res, browserId);

    } catch (error) {
        throw error;
    }
  }

  private async login(locale: string, user: User, ipAddress: string, userAgent: string, res: any, browserId?: string | null) {

    const emails = await this.prisma.user_identifier.findMany({
      where: {
        user_id: user.id,
        type: 'email',
      },
      select: { value: true }
    });

    if (!emails || emails.length === 0) {
      throw new BadRequestException(getLocaleText('accessDenied', locale, 'Access denied.'));
    }

    const { accessToken, refreshToken, session } = await this.getAuthenticationPayload(
      locale,
      user.id,
      ipAddress,
      userAgent,
      browserId,
    );

    for (const emailObj of emails) {

        this.mail.sendTemplatedMail(
          locale,
          {
            email: emailObj.value,
            slug: 'auth-login-new-device',
            variables: {
              name: user.name,
              ipAddress,
              userAgent,
              location: 'Unknown',
            }
          }
        );

      }

    await this.user.registerUserActivity(user.id, "login")

    await this.token.setRefreshTokenCookie(locale, res, refreshToken, session.expires_at);

    const requiresPasswordReset = this.hasPendingPasswordReset(user);

    if (refreshToken) {
      return { accessToken, refreshToken, requiresPasswordReset };
    }

    return { accessToken, requiresPasswordReset };
  }

  async loginWithEmailAndPassword(
    res: any,
    locale: string,
    ipAddress: string,
    userAgent: string,
    { email, password }: LoginDTO,
    browserId?: string | null,
  ) {

    const user = await this.user.findUserByEmail(locale, email);

    if (!user) throw new BadRequestException(getLocaleText('accessDenied', locale, 'Access denied.'));

    const credentials = (user as unknown as User).user_credential?.filter((c) => c.type === 'password') || [];

    const identifier = user.user_identifier?.find((i) => i.type === 'email' && i.value === email);

    if (!(await this.security.validatePassword(locale, credentials, password))) {
      throw new BadRequestException(getLocaleText('accessDenied', locale, 'Access denied.'));
    }

    const mfaMethods = await this.prisma.user_mfa.findMany({
      where: { 
        user_id: user.id,
        verified_at: { not: null }
      },
      include: {
        user_mfa_totp: true,
        user_mfa_email: true
      }
    });

    if (mfaMethods.length > 0) {
      const mfaToken = await this.token.createMfaChallengeToken({
        userId: user.id,
        ipAddress,
        userAgent,
        email
      });

      const emailMfas = mfaMethods.filter(m => m.type === 'email' && m.user_mfa_email && m.user_mfa_email.length > 0);

      if (emailMfas.length > 0) {
        const emails = emailMfas.map(mfa => mfa.user_mfa_email[0].email);
        await this.challenge.sendMfaCodeToMultipleEmails(locale, user.id, emails);
      }

      return { 
        requiresMfa: true, 
        mfaToken,
        mfaMethods: mfaMethods.map(m => ({ type: m.type, id: m.id }))
      };
    }

    const settings = await this.setting.getSettingValues([
      'require-mfa',
      'require-email-verification',
      'mfa-email-code-length',
      'mfa-challenge-expiration-minutes'
    ]);

    if (settings['require-mfa'] === true && mfaMethods.length === 0) {

      return this.requiresMfaForLogin(locale, email, user);

    } else if (settings['require-email-verification'] === true && identifier?.verified_at === null) {

      return this.requiresEmailVerificationForLogin(locale, email, user);

    }

    return this.login(locale, user as unknown as User, ipAddress, userAgent, res, browserId);
  }

  async verifyRoles(_locale: string, userId: number) {
    return this.prisma.role.findMany({
      where: {
        role_user: {
          some: {
            user_id: userId
          }
        }
      },
      select: {
        slug: true
      }
    })
  }

  async verifyUser(locale: string, userId: number) {
    const user = await this.user.findUserById(locale, userId);
    const requiresPasswordReset = this.hasPendingPasswordReset(user);
    delete user.user_credential;
    return {
      ...user,
      requires_password_reset: requiresPasswordReset,
    };
  }

  async refreshAccessToken(locale: string, refreshToken: string, ipAddress: string, userAgent: string, browserId?: string | null) {

    if (!refreshToken) {
      this.logger.warn(`[AuthService] refreshAccessToken called without token ip=${ipAddress}`);
      throw new UnauthorizedException(getLocaleText('accessDenied', locale, 'Access denied.'));
    }

    this.logger.debug(`[AuthService] refreshAccessToken ip=${ipAddress} ua=${userAgent?.slice(0, 40)}`);

    const { session, token } = await this.session.refresh(
      locale,
      refreshToken,
      ipAddress,
      userAgent,
      browserId,
    );

    const user = await this.user.findUserById(locale, session.user_id);
    const payload = { sub: user.id, sessionId: session.id };
    const accessToken = await this.token.createAccessToken(payload);

    this.logger.debug(`[AuthService] refreshAccessToken success userId=${user.id} newSessionId=${session.id}`);

    return { accessToken, refreshToken: token, session };

  }

  async forgotPassword(locale: string, { email, app }: ForgetDTO) {
    const user = await this.user.findUserByEmail(locale, email);
    if (user){
      await this.user.registerUserActivity(user?.id, "forgotPassword")
    }
    await this.challenge.forgotEmail(locale, email, app);
    return { success: true };
  }

  async logout(res, req, refreshToken: string) {
    const result = await this.session.deleteRefreshTokenCookie(res, refreshToken);
    const logoutUserId = req.auth?.sub ?? result?.userId ?? null;

    if (logoutUserId) {
      await this.user.registerUserActivity(logoutUserId, 'logout');
    }

    return { success: true };
  }

  async forgotResetPassword(locale: string, password: string, code: string, ipAddress: string, userAgent: string) {
    const challenge = await this.challenge.verifyCodePassword(locale, code);
    const userIdentifier = challenge.user_identifier;
    const passwordHash = await this.security.hashArgon2(password);

    await this.prisma.user_credential.updateMany({
      where: {
        type: 'password',
        user_id: userIdentifier.user_id,
      },
      data: { hash: passwordHash, requires_reset: false },
    });

    this.mail.sendTemplatedMail(
      locale,
      {
        email: userIdentifier.value,
        slug: 'auth-forget-password-confirmation',
        variables: {
          name: userIdentifier.user.name,
        }
      }
    );

    const { accessToken, refreshToken, session } = await this.getAuthenticationPayload(locale, userIdentifier.user_id, ipAddress, userAgent);
    await this.user.registerUserActivity(userIdentifier.id, "resetPassword")
    return { accessToken, refreshToken, session }
  }

  async verifyMfaCode(locale: string, mfaToken: string, code: string, ipAddress: string, userAgent: string, methodType?: 'totp' | 'email' | 'recovery', browserId?: string | null) {
    const payload = await this.token.verifyMfaChallengeToken(mfaToken);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        user_mfa: {
          where: { verified_at: { not: null } },
          include: {
            user_mfa_totp: true,
            user_mfa_email: true
          }
        },
        user_recovery_code: true
      }
    });

    if (!user) {
      throw new BadRequestException(getLocaleText('accessDenied', locale, 'Access denied.'));
    }

    let isValid = false;

    const settings = await this.setting.getSettingValues([
      'mfa-issuer',
      'mfa-window',
      'mfa-setp',
    ]);

    if (methodType === 'totp') {
      const totpMfa = user.user_mfa.find(m => m.type === 'totp' && m.user_mfa_totp);
      if (totpMfa && totpMfa.user_mfa_totp[0]) {
        const secretBuffer = totpMfa.user_mfa_totp[0].secret;
        const secret = secretBuffer instanceof Uint8Array
          ? Buffer.from(secretBuffer).toString('utf-8')
          : String(secretBuffer);

        const window = settings['mfa-window'] ?? 0;
        const step = settings['mfa-setp'] ?? 30;

        const speakeasy = require('speakeasy');
        isValid = speakeasy.totp.verify({
          secret,
          encoding: 'base32',
          token: code,
          window,
          step
        });
      }
    } else if (methodType === 'email') {
      const emailMfa = user.user_mfa.find(m => m.type === 'email');
      if (emailMfa) {
        isValid = await this.challenge.verifyMfaEmailCode(locale, user.id, code);
      }
    } else if (methodType === 'recovery') {
      for (const recoveryCode of user.user_recovery_code) {
        if (await this.security.verifyArgon2(code, recoveryCode.hash)) {
          isValid = true;
          await this.prisma.user_recovery_code.delete({
            where: { id: recoveryCode.id }
          });
          break;
        }
      }
    } else {
      const totpMfa = user.user_mfa.find(m => m.type === 'totp' && m.user_mfa_totp);
      if (totpMfa && totpMfa.user_mfa_totp[0]) {
        const secretBuffer = totpMfa.user_mfa_totp[0].secret;
        const secret = secretBuffer instanceof Uint8Array
          ? Buffer.from(secretBuffer).toString('utf-8')
          : String(secretBuffer);

        const window = settings['mfa-window'] ?? 0;
        const step = settings['mfa-setp'] ?? 30;

        const speakeasy = require('speakeasy');
        isValid = speakeasy.totp.verify({
          secret,
          encoding: 'base32',
          token: code,
          window,
          step
        });
      }

      if (!isValid) {
        const emailMfa = user.user_mfa.find(m => m.type === 'email');
        if (emailMfa) {
          isValid = await this.challenge.verifyMfaEmailCode(locale, user.id, code);
        }
      }
    }

    if (!isValid) {
      throw new BadRequestException(getLocaleText('invalidMfaCode', locale, 'Invalid MFA code.'));
    }

    const { accessToken, refreshToken, session } = await this.getAuthenticationPayload(
      locale,
      user.id,
      ipAddress,
      userAgent,
      browserId,
    );

    this.mail.sendTemplatedMail(
      locale,
      {
        email: payload.email,
        slug: 'auth-login-new-device',
        variables: {
          name: user.name,
          ipAddress,
          userAgent,
          location: 'Unknown',
        }
      }
    );

    await this.user.registerUserActivity(user.id, "login");
    const requiresPasswordReset = await this.getRequiresPasswordResetByUserId(
      user.id,
    );
    return { accessToken, refreshToken, session, requiresPasswordReset };
  }

  async verifyMfaRecoveryCode(locale: string, mfaToken: string, recoveryCode: string, ipAddress: string, userAgent: string, browserId?: string | null) {
    const payload = await this.token.verifyMfaChallengeToken(mfaToken);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        user_recovery_code: true
      }
    });

    if (!user) {
      throw new BadRequestException(getLocaleText('accessDenied', locale, 'Access denied.'));
    }

    let isValid = false;
    for (const code of user.user_recovery_code) {
      if (await this.security.verifyArgon2(recoveryCode, code.hash)) {
        isValid = true;
        await this.prisma.user_recovery_code.delete({
          where: { id: code.id }
        });
        break;
      }
    }

    if (!isValid) {
      throw new BadRequestException(getLocaleText('invalidRecoveryCode', locale, 'Invalid recovery code.'));
    }

    const { accessToken, refreshToken, session } = await this.getAuthenticationPayload(
      locale,
      user.id,
      ipAddress,
      userAgent,
      browserId,
    );

    await this.user.registerUserActivity(user.id, "login");
    const requiresPasswordReset = await this.getRequiresPasswordResetByUserId(
      user.id,
    );
    return { accessToken, refreshToken, session, requiresPasswordReset };
  }

  async resendMfaCode(locale: string, mfaToken: string) {
    const payload = await this.token.verifyMfaChallengeToken(mfaToken);
    
    const mfaMethods = await this.prisma.user_mfa.findMany({
      where: { 
        user_id: payload.userId,
        verified_at: { not: null },
        type: 'email'
      },
      include: {
        user_mfa_email: true
      }
    });

    if (mfaMethods.length === 0) {
      throw new BadRequestException(getLocaleText('noEmailMfaFound', locale, 'No email MFA method found for this user.'));
    }

    const emailMfa = mfaMethods[0];
    if (!emailMfa.user_mfa_email || emailMfa.user_mfa_email.length === 0) {
      throw new BadRequestException(getLocaleText('noEmailMfaFound', locale, 'No email MFA method found for this user.'));
    }

    await this.challenge.sendMfaCodeByEmail(locale, payload.userId, emailMfa.user_mfa_email[0].email);
    
    return { 
      success: true,
      hasEmailMfa: true 
    };
  }

  async generateWebAuthnAuthenticationOptions(locale: string, mfaToken: string, requestOrigin?: string) {
    const { generateAuthenticationOptions } = await import('@simplewebauthn/server');
    const payload = await this.token.verifyMfaChallengeToken(mfaToken);

    const user = await this.prisma.user.findFirst({
      where: { id: payload.userId },
      include: {
        user_mfa: {
          where: { type: 'webauthn', verified_at: { not: null } },
          include: { user_mfa_webauthn: true }
        }
      }
    });

    if (!user || user.user_mfa.length === 0) {
      throw new BadRequestException(getLocaleText('webauthnNotConfigured', locale, 'WebAuthn not configured.'));
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
  }

  async verifyWebAuthnAuthentication(locale: string, mfaToken: string, assertionResponse: any, ipAddress: string, userAgent: string, browserId?: string | null, requestOrigin?: string) {
    const { verifyAuthenticationResponse } = await import('@simplewebauthn/server');
    const payload = await this.token.verifyMfaChallengeToken(mfaToken);
    const userId = payload.userId;

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
      throw new BadRequestException(getLocaleText('challengeNotFound', locale, 'Challenge not found or expired.'));
    }

    const authenticator = challengeRecord.user_mfa.user_mfa_webauthn[0];
    const { rpID, expectedOrigin } = resolveWebAuthnOrigin(requestOrigin);

    const verification = await verifyAuthenticationResponse({
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
      throw new BadRequestException(getLocaleText('verificationFailed', locale, 'Verification failed.'));
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

    const { accessToken, refreshToken, session } = await this.getAuthenticationPayload(
      locale,
      userId,
      ipAddress,
      userAgent,
      browserId,
    );

    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    this.mail.sendTemplatedMail(
      locale,
      {
        email: payload.email,
        slug: 'auth-login-new-device',
        variables: {
          name: user.name,
          ipAddress,
          userAgent,
          location: 'Unknown',
        }
      }
    );

    await this.user.registerUserActivity(userId, 'login');
    const requiresPasswordReset = await this.getRequiresPasswordResetByUserId(
      userId,
    );
    return { accessToken, refreshToken, session, requiresPasswordReset };
  }
}
