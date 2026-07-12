
import { Public, User } from '@hed-hog/api';
import { Locale } from '@hed-hog/api-locale';
import { user_account_provider_52222e2ecb_enum } from '@hed-hog/api-prisma';
import {
    Body,
    Controller,
    Delete,
    Get,
    Headers,
    Ip,
    Logger,
    Param,
    Post,
    Query,
    Res,
} from '@nestjs/common';
import { SettingService } from '../setting/setting.service';
import { OAuthService } from './oauth.service';

@Controller('oauth')
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  constructor(private readonly service: OAuthService, private readonly settingService: SettingService) {}

  private logOAuthRequest(
    action: string,
    provider: string,
    {
      locale,
      origin,
      referer,
      host,
      ipAddress,
      userAgent,
      code,
    }: {
      locale?: string;
      origin?: string;
      referer?: string;
      host?: string;
      ipAddress?: string;
      userAgent?: string;
      code?: string;
    },
  ) {
    const summarizedUserAgent = userAgent
      ? userAgent.length > 120
        ? `${userAgent.slice(0, 117)}...`
        : userAgent
      : 'n/a';

    this.logger.log(
      `OAuth ${action}: provider=${provider} locale=${locale ?? 'n/a'} origin=${origin ?? 'n/a'} referer=${referer ?? 'n/a'} host=${host ?? 'n/a'} ip=${ipAddress ?? 'n/a'} hasCode=${code ? 'yes' : 'no'} codeLength=${code?.length ?? 0} userAgent="${summarizedUserAgent}"`,
    );
  }

  @Public()
  @Get('github/callback')
  async githubCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res,
  ) {
    const forward = await this.service.resolveWebForward(state);
    const type = forward?.flow ?? (state || 'login');
    const { url: frontendURL = '' } = await this.settingService.getSettingValues(['url']);
    const base = forward?.origin || frontendURL;
    // Preserve the signed state on web-hub flows so the initiating app's callback
    // can pass it back for origin binding at the code exchange.
    const stateParam = forward ? `&state=${encodeURIComponent(state)}` : '';
    const redirectURL = `${base}/callback/github/${type}?code=${encodeURIComponent(code)}${stateParam}`;
    return res.redirect(redirectURL);
  }

  /**
   * Apple mandates `response_mode=form_post` whenever `scope` is requested, so it
   * POSTs `code`/`state` to the single registered "Return URL" instead of a GET
   * redirect. This bounces it back to a GET, mirroring the GitHub callback above,
   * so the rest of the pipeline (hub forwarding, code exchange) stays identical
   * across every provider.
   */
  @Public()
  @Post('apple/callback')
  async appleCallback(
    @Body('code') code: string,
    @Body('state') state: string,
    @Res() res,
  ) {
    const forward = await this.service.resolveWebForward(state);
    const type = forward?.flow ?? (state || 'login');
    const { url: frontendURL = '' } = await this.settingService.getSettingValues(['url']);
    const base = forward?.origin || frontendURL;
    const stateParam = forward ? `&state=${encodeURIComponent(state)}` : '';
    const redirectURL = `${base}/callback/apple/${type}?code=${encodeURIComponent(code)}${stateParam}`;
    return res.redirect(redirectURL);
  }

  @Public()
  @Get(':provider/login')
  async login(
    @Headers('origin') origin: string,
    @Headers('referer') referer: string,
    @Headers('host') host: string,
    @Param('provider') provider: string,
    @Query('redirectApp') redirectApp: string,
    @Res() res,
  ) {
    this.logOAuthRequest('login-init', provider, { origin, referer, host });

    const url = await this.service.getWebAuthUrl(
      provider as user_account_provider_52222e2ecb_enum,
      'login',
      redirectApp,
    );
    return res.redirect(url);
  }


  @Public()
  @Get(':provider/mobile/auth-url')
  async mobileAuthUrl(
    @Param('provider') provider: string,
    @Query('redirectUri') redirectUri: string,
  ) {
    const authUrl = await this.service.getMobileAuthUrl(
      provider as user_account_provider_52222e2ecb_enum,
      redirectUri,
    );

    return { authUrl };
  }


  @Public()
  @Get(':provider/register')
  async register(
    @Param('provider') provider: string,
    @Query('redirectApp') redirectApp: string,
    @Res() res,
  ) {
    const url = await this.service.getWebAuthUrl(
      provider as user_account_provider_52222e2ecb_enum,
      'register',
      redirectApp,
    );
    return res.redirect(url);
  }


  @Public()
  @Get(':provider/connect')
  async connect(
    @Param('provider') provider: string,
    @Query('redirectApp') redirectApp: string,
    @Res() res,
  ) {
    const url = await this.service.getWebAuthUrl(
      provider as user_account_provider_52222e2ecb_enum,
      'connect',
      redirectApp,
    );
    return res.redirect(url);
  }


  @Public()
  @Get(':provider/callback/login')
  async callbackLogin(
    @Locale() locale: string,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Headers('origin') origin: string,
    @Headers('referer') referer: string,
    @Headers('host') host: string,
    @Headers('x-forwarded-host') forwardedHost: string,
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('redirectUri') redirectUri: string,
    @Res({ passthrough: true }) res,
  ) {
    this.logOAuthRequest('callback-login', provider, {
      locale,
      origin,
      referer,
      host: forwardedHost || host,
      ipAddress,
      userAgent,
      code,
    });

    return this.service.handleCallback({
      res,
      locale,
      ipAddress,
      userAgent,
      provider: provider as user_account_provider_52222e2ecb_enum,
      code,
      state,
      type: 'login',
      redirectUri,
      includeRefreshTokenInBody: Boolean(redirectUri),
      requestOrigin: origin,
      requestReferer: referer,
    });
  }


  @Public()
  @Get(':provider/callback/register')
  async callbackRegister(
    @Locale() locale: string,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Res({ passthrough: true }) res,
  ) {
    return this.service.handleCallback({ res, locale, ipAddress, userAgent, provider: provider as user_account_provider_52222e2ecb_enum, code, type: 'register' });
  }


  @Get(':provider/callback/connect')
  async callbackConnect(
    @Locale() locale: string,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @User() { id },
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Res({ passthrough: true }) res,
  ) {
    return this.service.handleCallback({ res, locale, ipAddress, userAgent, provider: provider as user_account_provider_52222e2ecb_enum, code, type: 'connect', userId: id });
  }


  @Delete(':provider')
  async disconnect(
    @Locale() locale: string,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Param('provider') provider: string,
    @Body('email') email: string,
    @Res({ passthrough: true }) res,
  ) {
    return this.service.handleCallback({ res, locale, ipAddress, userAgent, provider: provider as user_account_provider_52222e2ecb_enum, email, type: 'disconnect' });
  }
}
