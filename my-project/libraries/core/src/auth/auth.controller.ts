import { NoRole, Public, User, UserOptional } from '@hed-hog/api';
import { Locale } from '@hed-hog/api-locale';
import {
  Body,
  Controller,
  forwardRef,
  Get,
  Headers,
  Inject,
  Ip,
  Logger,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { TokenService } from '../token/token.service';
import { CreateWithEmailAndPasswordDTO } from '../user/dto/create-with-email-and-password.dto';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';
import { ForgetDTO } from './dto/forget.dto';
import { LoginEmailVerificationResendDTO } from './dto/login-email-verification-resend.dto';
import { LoginEmailVerificationDTO } from './dto/login-email-verification.dto';
import { LoginWithCodeDTO } from './dto/login-with-code.dto';
import { LoginWithRecoveryCodeDTO } from './dto/login-with-recovery-code';
import { LoginDTO } from './dto/login.dto';
import { ResendMfaCodeDTO } from './dto/resend-mfa-code.dto';
import { ResetDTO } from './dto/reset.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    @Inject(forwardRef(() => AuthService))
    private readonly service: AuthService,
    @Inject(forwardRef(() => TokenService))
    private readonly token: TokenService,
    @Inject(forwardRef(() => UserService))
    private readonly user: UserService,
  ) { }

  @NoRole()
  @Get('verify')
  async verify(@User() { id }, @Locale() locale: string) {
    return this.service.verifyUser(locale, id);
  }

  @NoRole()
  @Get('desktop-token')
  async desktopToken(
    @User() { id },
    @Locale() locale: string,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.service.issueDesktopToken(locale, id, ipAddress, userAgent);
  }

  @NoRole()
  @Get('roles')
  async roles(@UserOptional() user, @Locale() locale: string) {
    const roles = !user || !user.id ? [] : await this.service.verifyRoles(locale, user.id);
    return { roles };
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Locale() locale: string,
    @Req() req,
    @Res({ passthrough: true }) res,
    @Body('refreshToken') refreshTokenFromBody: string,
    @Headers('user-agent') userAgent: string,
    @Headers('x-browser-id') browserId: string,
    @Ip() ipAddress: string
  ) {
    const tokenSource = req.cookies['rt'] ? 'cookie' : (refreshTokenFromBody ? 'body' : 'none');
    this.logger.debug(`[AuthController] POST /auth/refresh tokenSource=${tokenSource} ip=${ipAddress}`);
    const currentRefreshToken = req.cookies['rt'] || refreshTokenFromBody;
    const { session, refreshToken, accessToken } = await this.service.refreshAccessToken(locale, currentRefreshToken, ipAddress, userAgent, browserId || null);
    await this.token.setRefreshTokenCookie(locale, res, refreshToken, session.expires_at);

    return {
      accessToken,
      refreshToken,
    };
  }

  // Rate-limit contra brute-force de credenciais: 10 tentativas/min por IP
  // (ajustável; valor acomoda a suíte E2E de auth que faz vários logins seguidos).
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  async login(
    @Locale() locale: string,
    @Body() data: LoginDTO,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Headers('x-browser-id') browserId: string,
    @Res({ passthrough: true }) res,
  ) {
    return this.service.loginWithEmailAndPassword(res, locale, ipAddress, userAgent, data, browserId || null);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login-email-verification')
  async emailVerificationLogin(
    @Locale() locale: string,
    @Body() {token, code}: LoginEmailVerificationDTO,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Headers('x-browser-id') browserId: string,
    @Res({ passthrough: true }) res,
  ) {
    return this.service.emailVerificationLogin(locale, token, code, ipAddress, userAgent, res, browserId || null);
  }

  @Public()
  @Post('login-email-verification-resend')
  async emailVerificationLoginResend(
    @Locale() locale: string,
    @Body() {token}: LoginEmailVerificationResendDTO,
  ) {
    return this.service.emailVerificationLoginResend(locale, token);
  }

  @Public()
  @Post('signup')
  async registerWithEmailAndPassword(
    @Locale() locale: string,
    @Body() data: CreateWithEmailAndPasswordDTO,
  ) {
    return this.user.createWithEmailAndPassword(locale, data);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login-code')
  async loginCode(
    @Locale() locale: string,
    @Body() { token, code, methodType }: LoginWithCodeDTO,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Headers('x-browser-id') browserId: string,
    @Res({ passthrough: true }) res,
  ) {
    const { accessToken, refreshToken, session, requiresPasswordReset } = await this.service.verifyMfaCode(
      locale,
      token,
      code,
      ipAddress,
      userAgent,
      methodType,
      browserId || null,
    );

    await this.token.setRefreshTokenCookie(locale, res, refreshToken, session.expires_at);
    return { accessToken, refreshToken, requiresPasswordReset };
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login-recovery-code')
  async loginRecoveryCode(
    @Locale() locale: string,
    @Body() { token, code }: LoginWithRecoveryCodeDTO,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Headers('x-browser-id') browserId: string,
    @Res({ passthrough: true }) res,
  ) {
    const { accessToken, refreshToken, session, requiresPasswordReset } = await this.service.verifyMfaRecoveryCode(
      locale,
      token,
      code,
      ipAddress,
      userAgent,
      browserId || null,
    );

    await this.token.setRefreshTokenCookie(locale, res, refreshToken, session.expires_at);
    return { accessToken, refreshToken, requiresPasswordReset };
  }

  @Public()
  @Post('resend-mfa-code')
  async resendMfaCode(
    @Locale() locale: string,
    @Body() { token }: ResendMfaCodeDTO,
  ) {
    return this.service.resendMfaCode(locale, token);
  }

  @Public()
  @Post('webauthn/generate')
  async generateWebAuthnOptions(
    @Locale() locale: string,
    @Body() { mfaToken }: { mfaToken: string },
    @Headers('origin') origin: string
  ) {
    return this.service.generateWebAuthnAuthenticationOptions(locale, mfaToken, origin);
  }

  @Public()
  @Post('webauthn/verify')
  async verifyWebAuthn(
    @Locale() locale: string,
    @Body() { mfaToken, assertionResponse }: { mfaToken: string; assertionResponse: any },
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Headers('origin') origin: string,
    @Res({ passthrough: true }) res,
  ) {
    const { accessToken, refreshToken, session, requiresPasswordReset } = await this.service.verifyWebAuthnAuthentication(
      locale,
      mfaToken,
      assertionResponse,
      ipAddress,
      userAgent,
      undefined,
      origin,
    );

    await this.token.setRefreshTokenCookie(locale, res, refreshToken, session.expires_at);
    return { accessToken, refreshToken, requiresPasswordReset };
  }

  @Public()
  @Post('forgot')
  async forgot(
    @Locale() locale: string,
    @Body()
    data: ForgetDTO,
  ) {
    return this.service.forgotPassword(locale, data);
  }

  @Public()
  @Post('logout')
  async logout(
    @Req() req,
    @Res({ passthrough: true }) res,
    @Body('refreshToken') refreshTokenFromBody: string,
  ) {
    const refreshToken = req.cookies['rt'] || refreshTokenFromBody;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not provided');
    }

    await this.service.logout(res, req, refreshToken);
    return { success: true };
  }

  @Public()
  @Post('forgot-reset')
  async forgotReset(
    @Locale() locale: string,
    @Body() { password, code }: ResetDTO,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.service.forgotResetPassword(locale, password, code, ipAddress, userAgent);
  }
}
