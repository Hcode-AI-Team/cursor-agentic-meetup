import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { UserMfaTypeEnum } from '@hed-hog/api-types/UserMfaTypeEnum';
import { useApp } from '@hed-hog/next-app-provider';
import { useTranslations } from 'next-intl';
import { getMethodName } from '../lib/mfa-utils';

interface MfaSetupDialogProps {
  open: boolean;
  selectedMethod: UserMfaTypeEnum | null;
  qrCode: string;
  verificationCode: string;
  name: string;
  onNameChange: (name: string) => void;
  onOpenChange: (open: boolean) => void;
  onVerificationCodeChange: (code: string) => void;
  onVerify: () => void;
  isRemoval?: boolean;
  useRecoveryCode?: boolean;
  onToggleRecoveryCode?: () => void;
  resendLoading?: boolean;
  resendCooldown?: number;
  onResendCode?: () => void;
}

export function MfaSetupDialog({
  open,
  selectedMethod,
  qrCode,
  verificationCode,
  name,
  onNameChange,
  onOpenChange,
  onVerificationCodeChange,
  onVerify,
  isRemoval = false,
  useRecoveryCode = false,
  onToggleRecoveryCode,
  resendLoading = false,
  resendCooldown = 0,
  onResendCode,
}: MfaSetupDialogProps) {
  const t = useTranslations('core.MfaSetupDialog');
  const { getSettingValue } = useApp();
  const pinCodeLength = getSettingValue('mfa-email-code-length') || 6;
  const methodName = getMethodName(String(selectedMethod));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isRemoval ? t('titleRemove') : t('titleSetup', { methodName })}
          </DialogTitle>
          <DialogDescription>
            {isRemoval ? t('descriptionRemove') : t('descriptionSetup')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {selectedMethod === UserMfaTypeEnum.TOTP && !isRemoval && (
            <div className="space-y-2">
              <p className="text-sm">{t('scanQrCode')}</p>
              <div className="bg-muted p-4 rounded-lg flex justify-center">
                <img src={qrCode} alt="QR Code" />
              </div>
            </div>
          )}
          <div className="space-y-4">
            {!isRemoval && selectedMethod !== UserMfaTypeEnum.WEBAUTHN && (
              <div className="space-y-2">
                <Label htmlFor="method-name">{t('methodNameLabel')}</Label>
                <Input
                  id="method-name"
                  placeholder={t('methodNamePlaceholder', {
                    methodLabel: methodName,
                    example:
                      selectedMethod === UserMfaTypeEnum.EMAIL
                        ? 'Hotmail'
                        : 'Main',
                  })}
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            {!isRemoval && selectedMethod === UserMfaTypeEnum.WEBAUTHN && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="method-name">
                    {t('securityKeyNameLabel')}
                  </Label>
                  <Input
                    id="method-name"
                    placeholder={t('securityKeyNamePlaceholder')}
                    value={name}
                    onChange={(e) => onNameChange(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    {t('securityKeyInstructions')}
                  </p>
                </div>
              </>
            )}

            {selectedMethod !== UserMfaTypeEnum.WEBAUTHN && (
              <div className="space-y-2 mt-8 flex flex-col items-center justify-center">
                <Label htmlFor="verification-code">
                  {useRecoveryCode
                    ? t('recoveryCodeLabel')
                    : t('verificationCodeLabel')}
                </Label>
                {useRecoveryCode ? (
                  <Input
                    id="verification-code"
                    placeholder={t('recoveryCodePlaceholder')}
                    value={verificationCode}
                    onChange={(e) => onVerificationCodeChange(e.target.value)}
                    className="text-center font-mono"
                    autoFocus
                  />
                ) : (
                  <InputOTP
                    maxLength={
                      selectedMethod === UserMfaTypeEnum.TOTP
                        ? 6
                        : pinCodeLength
                    }
                    value={verificationCode}
                    onChange={onVerificationCodeChange}
                  >
                    {(() => {
                      const length =
                        selectedMethod === UserMfaTypeEnum.TOTP
                          ? 6
                          : pinCodeLength;
                      const groupSize = Math.ceil(length / 2);
                      const groups = [
                        Array.from({ length: groupSize }, (_, i) => (
                          <InputOTPSlot key={i} index={i} />
                        )),
                        Array.from({ length: length - groupSize }, (_, i) => (
                          <InputOTPSlot
                            key={i + groupSize}
                            index={i + groupSize}
                          />
                        )),
                      ];
                      return (
                        <>
                          <InputOTPGroup>{groups[0]}</InputOTPGroup>
                          <InputOTPSeparator />
                          <InputOTPGroup>{groups[1]}</InputOTPGroup>
                        </>
                      );
                    })()}
                  </InputOTP>
                )}
                {!isRemoval &&
                  selectedMethod === UserMfaTypeEnum.EMAIL &&
                  onResendCode && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onResendCode}
                      disabled={resendLoading || resendCooldown > 0}
                      className="mt-2"
                    >
                      {resendLoading
                        ? t('resending')
                        : resendCooldown > 0
                          ? t('resendIn', { seconds: resendCooldown })
                          : t('resendCode')}
                    </Button>
                  )}
                {isRemoval && onToggleRecoveryCode && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={onToggleRecoveryCode}
                    className="text-xs"
                  >
                    {useRecoveryCode
                      ? 'Use verification code'
                      : 'Use recovery code instead'}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancelButton')}
          </Button>
          <Button
            onClick={onVerify}
            variant={isRemoval ? 'destructive' : 'default'}
            disabled={
              !isRemoval && selectedMethod === UserMfaTypeEnum.WEBAUTHN && !name
            }
          >
            {isRemoval && selectedMethod === UserMfaTypeEnum.WEBAUTHN
              ? t('registerButton')
              : isRemoval
                ? t('verifyRemoveButton')
                : selectedMethod === UserMfaTypeEnum.WEBAUTHN
                  ? t('registerButton')
                  : t('verifyButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
