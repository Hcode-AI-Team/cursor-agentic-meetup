import { NoRole, User } from '@hed-hog/api';
import { Locale } from '@hed-hog/api-locale';
import { Body, Controller, Delete, Get, Headers, Ip, Param, ParseIntPipe, Post, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChangeEmailDto } from './dto/change-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { EmailVerificationDto } from './dto/email-verification-confirm.dto';
import { GenerateWebAuthnRegistrationOptionsDto } from './dto/generate-webauthn-registration-options.dto';
import { RegenerateRecoveryCodesDto } from './dto/regenerate-recovery-codes.dto';
import { RemoveEmailMfaDto } from './dto/remove-email-mfa.dto';
import { RemoveMfaWithRecoveryCodeDto } from './dto/remove-mfa-with-recovery-code.dto';
import { RemoveMfaDto } from './dto/remove-mfa.dto';
import { RemoveTotpMfaDto } from './dto/remove-totp-mfa.dto';
import { SendEmailVerificationDto } from './dto/send-email-verification.dto';
import { SetPreferencesDto } from './dto/set-preferences.dto';
import { UpdateDto } from './dto/update.dto';
import { VerifyBeforeAddMfaDto } from './dto/verify-before-add-mfa.dto';
import { VerifyMfaTotpDto } from './dto/verify-mfa-totp.dto';
import { VerifyWebAuthnRegistrationDto } from './dto/verify-webauthn-registration.dto';
import { VerifyWebAuthnDto } from './dto/verify-webauthn.dto';
import { ProfileService } from './profile.service';
@NoRole()
@Controller('profile')
export class ProfileController {

  constructor(private readonly profileService: ProfileService) {}
  
  @Put('preferences')
  async updatePreferences(@User() { id }, @Body() data: SetPreferencesDto, @Locale() locale: string) {
    return this.profileService.updatePreferences(locale, id, data);
  }

  @Post('mfa/check-verification')
  async checkMfaBeforeAdd(@User() { id }, @Locale() locale: string) {
    return this.profileService.checkMfaBeforeAdd(locale, id);
  }

  @Post('mfa/check-verification-remove')
  async checkMfaBeforeRemove(@User() { id }, @Locale() locale: string) {
    return this.profileService.checkMfaBeforeRemove(locale, id);
  }

  @Post('mfa/verify-before-add')
  async verifyBeforeAddMfa(
    @User() { id },
    @Body() data: VerifyBeforeAddMfaDto,
    @Locale() locale: string,
    @Headers('origin') origin: string
  ) {
    return this.profileService.verifyBeforeAddMfa(locale, id, data, origin);
  }

  @Post('totp/generate')
  async generateMfaTotp(@User() { id }, @Locale() locale: string) {
    return this.profileService.generateMfaTotp(locale, id);
  }

  @Post('totp/verify')
  async verifyMfaTotp(@Locale() locale: string, @User() { id }, @Body() { token, secret, name }: VerifyMfaTotpDto) {
    return this.profileService.verifyMfaTotp(locale, id, token, secret, name);
  }

  @Delete('totp/:mfaId/remove')
  async removeMfaTotp(@Locale() locale: string, @User() { id }, @Param('mfaId', ParseIntPipe) mfaId: number, @Body() { token }: RemoveTotpMfaDto) {
    return this.profileService.removeMfaTotp(locale, id, mfaId, token);
  }

  @Post('email/verify/confirm')
  confirmEmailVerification(@User() {id}, @Body() data: EmailVerificationDto, @Locale() locale: string) {
    return this.profileService.confirmEmailVerification(locale, id, data);
  }

  @Post('email/verify')
  sendEmailVerification(@User() {id}, @Body() data: SendEmailVerificationDto, @Locale() locale: string) {
    return this.profileService.sendEmailVerification(locale, id, data);
  }

  @Post('mfa/email/verify')
  sendEmailVerificationMfa(@User() {id}, @Body() data: SendEmailVerificationDto, @Locale() locale: string) {
    return this.profileService.sendEmailVerificationMfa(locale, id, data);
  }

  @Post('mfa/email/verify/confirm')
  sendEmailVerificationMfaConfirm(@User() {id}, @Body() data: EmailVerificationDto, @Locale() locale: string) {
    
    return this.profileService.confirmEmailVerificationMfa(locale, id, data);
  }
  
  @Post('email/send-code-to-remove')
  sendCodeToRemove(@User() {id}, @Locale() locale: string, @Body() { email }: SendEmailVerificationDto) {
    return this.profileService.sendCodeToRemove(locale, id, email);
  }

  @Get('email')
  getEmailIdentifier(@User() {id}) {
    return this.profileService.getEmailIdentifier(id);
  }

  @Delete('email/:mfaId/remove')
  async removeMfaEmail(@Locale() locale: string, @User() { id }, @Param('mfaId', ParseIntPipe) mfaId: number, @Body() { token, hash }: RemoveEmailMfaDto) {
    return this.profileService.removeMfaEmail(locale, id, mfaId, token, hash);
  }

  @Get()
  getProfile(@User() {id}) {
    return this.profileService.getProfile(id);
  }

  @Get('mfa')
  getMFAMethod(@User() {id}) {
    return this.profileService.getMFAMethods(id);
  }

  @Put('update-mfa/:mfaId')
  updateMFA(@User() { id: userId }, @Param('mfaId', ParseIntPipe) mfaId: number, @Body() { name }: UpdateDto) {
    return this.profileService.updateMFA(userId, mfaId, { name });
  }

  @Delete('mfa/:mfaId/remove-with-recovery-code')
  async removeMfaWithRecoveryCode(
    @User() { id },
    @Param('mfaId', ParseIntPipe) mfaId: number,
    @Body() { recoveryCode }: RemoveMfaWithRecoveryCodeDto,
    @Locale() locale: string
  ) {
    return this.profileService.removeMfaWithRecoveryCode(locale, id, mfaId, recoveryCode);
  }

  @Delete('mfa/:mfaId/remove')
  async removeMfa(
    @User() { id },
    @Param('mfaId', ParseIntPipe) mfaId: number,
    @Body() data: RemoveMfaDto,
    @Locale() locale: string,
    @Headers('origin') origin: string
  ) {
    return this.profileService.removeMfa(locale, id, mfaId, data, origin);
  }

  @Post('recovery-codes/send-verification')
  async sendRecoveryCodesVerification(
    @User() { id },
    @Locale() locale: string
  ) {
    return this.profileService.sendRecoveryCodesVerification(locale, id);
  }

  @Post('recovery-codes/regenerate')
  async regenerateRecoveryCodes(
    @User() { id },
    @Body() data: RegenerateRecoveryCodesDto,
    @Locale() locale: string,
    @Headers('origin') origin: string
  ) {
    return this.profileService.regenerateRecoveryCodes(locale, id, data, origin);
  }

  @Post('webauthn/generate')
  async generateWebAuthnRegistrationOptions(
    @User() { id },
    @Body() { name }: GenerateWebAuthnRegistrationOptionsDto,
    @Locale() locale: string,
    @Headers('origin') origin: string
  ) {
    return this.profileService.generateWebAuthnRegistrationOptions(locale, id, name, origin);
  }

  @Post('webauthn/verify')
  async verifyWebAuthnRegistration(
    @User() { id },
    @Body() { name, attestationResponse }: VerifyWebAuthnRegistrationDto,
    @Locale() locale: string,
    @Headers('origin') origin: string
  ) {
    return this.profileService.verifyWebAuthnRegistration(locale, id, name, attestationResponse, origin);
  }

  @Post('webauthn/authenticate/generate')
  async generateWebAuthnAuthenticationOptions(
    @User() { id },
    @Locale() locale: string,
    @Headers('origin') origin: string
  ) {
    return this.profileService.generateWebAuthnAuthenticationOptions(locale, id, origin);
  }

  @Post('webauthn/authenticate/verify')
  async verifyWebAuthnAuthentication(
    @User() { id },
    @Body() { assertionResponse }: VerifyWebAuthnDto,
    @Headers('origin') origin: string
  ) {
    return this.profileService.verifyWebAuthnAuthentication(id, assertionResponse, origin);
  }

  @Delete('webauthn/:mfaId/remove')
  async removeWebAuthnMfa(
    @User() { id },
    @Param('mfaId', ParseIntPipe) mfaId: number,
    @Locale() locale: string
  ) {
    return this.profileService.removeWebAuthnMfa(locale, id, mfaId);
  }

  @Put('change-password')
  changePassword(
    @User() {id}, 
    @Body() body: ChangePasswordDto, 
    @Locale() locale: string,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string
  ) {
    return this.profileService.changePassword(locale, id, body, ipAddress, userAgent);
  }

  @Put('change-email')
  changeEmail(@User() {id}, @Body() body: ChangeEmailDto, @Locale() locale: string) {
    return this.profileService.changeEmail(locale, id, body);
  }

  @UseInterceptors(FileInterceptor('file'))
  @Put('avatar')
  updateAvatar(@Locale() locale: string, @User() { id }, @UploadedFile() file: MulterFile) {
    return this.profileService.updateAvatar(locale, id, file);
  }

  @Put()
  update(@Body() data: UpdateDto, @User() {id}) {
    return this.profileService.update(id, data);
  }
}
