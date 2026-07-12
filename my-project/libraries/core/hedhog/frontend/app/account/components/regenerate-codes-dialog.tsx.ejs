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
import { useApp } from '@hed-hog/next-app-provider';
import {
  AlertTriangle,
  Fingerprint,
  Key,
  Mail,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

interface RegenerateCodesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (
    verificationCode: string,
    hash?: string,
    useTotp?: boolean,
    verificationType?: 'totp' | 'email' | 'recovery' | 'webauthn',
    assertionResponse?: any
  ) => void;
  requiresMfa: boolean;
  verificationType?: 'totp' | 'email';
  availableMethods?: ('totp' | 'email')[];
  codeHash?: string;
  hasWebAuthn?: boolean;
  hasRecoveryCodes?: boolean;
}

export function RegenerateCodesDialog({
  open,
  onOpenChange,
  onConfirm,
  requiresMfa,
  verificationType,
  availableMethods,
  codeHash,
  hasWebAuthn,
  hasRecoveryCodes,
}: RegenerateCodesDialogProps) {
  const t = useTranslations('core.RegenerateRecoveryCodes');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const getInitialMethod = (): 'totp' | 'email' | 'recovery' | 'webauthn' => {
    if (verificationType)
      return verificationType as 'totp' | 'email' | 'recovery' | 'webauthn';
    if (availableMethods && availableMethods.length > 0)
      return availableMethods[0] as 'totp' | 'email' | 'recovery' | 'webauthn';
    if (hasWebAuthn) return 'recovery';
    return 'totp';
  };

  const [selectedMethod, setSelectedMethod] = useState<
    'totp' | 'email' | 'recovery' | 'webauthn'
  >(getInitialMethod());
  const { getSettingValue, request, showToastHandler } = useApp();
  const pinCodeLength = getSettingValue('mfa-email-code-length') || 6;

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    if (open) {
      setSelectedMethod(getInitialMethod());
    }
  }, [open, verificationType, availableMethods, hasWebAuthn]);

  const hasBothMethods = availableMethods && availableMethods.length > 0;
  const showMethodToggle = hasBothMethods || hasWebAuthn || hasRecoveryCodes;
  const currentMethod = selectedMethod;

  const handleResendCode = async () => {
    setResendLoading(true);
    try {
      await request({
        url: '/profile/recovery-codes/send-verification',
        method: 'POST',
      });
      setResendCooldown(30);
      showToastHandler?.('success', t('codeResent'));
    } catch (error) {
      showToastHandler?.('error', t('resendFailed'));
    } finally {
      setResendLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (requiresMfa && !verificationCode) {
      return;
    }

    setLoading(true);
    try {
      let useTotp = false;
      let hashToUse = undefined;

      if (currentMethod === 'totp') {
        useTotp = true;
      } else if (currentMethod === 'email') {
        hashToUse = codeHash;
      }

      onConfirm(verificationCode, hashToUse, useTotp, currentMethod);
      setVerificationCode('');
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setVerificationCode('');
      setSelectedMethod(getInitialMethod());
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-500" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {t('warningMessage')}
            </p>
          </div>

          {requiresMfa && (
            <div className="space-y-2">
              {showMethodToggle && (
                <div className="flex justify-center gap-2 mb-4 flex-wrap">
                  {(availableMethods?.includes('totp') ||
                    verificationType === 'totp') && (
                    <Button
                      type="button"
                      variant={
                        selectedMethod === 'totp' ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => {
                        setSelectedMethod('totp');
                        setVerificationCode('');
                      }}
                    >
                      <Key className="mr-2 size-4" />
                      {t('buttonApp')}
                    </Button>
                  )}
                  {(availableMethods?.includes('email') ||
                    verificationType === 'email') && (
                    <Button
                      type="button"
                      variant={
                        selectedMethod === 'email' ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => {
                        setSelectedMethod('email');
                        setVerificationCode('');
                      }}
                    >
                      <Mail className="mr-2 size-4" />
                      {t('buttonEmail')}
                    </Button>
                  )}
                  {hasWebAuthn && (
                    <Button
                      type="button"
                      variant={
                        selectedMethod === 'webauthn' ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const { startAuthentication } =
                            await import('@simplewebauthn/browser');

                          const { data: optionsData } = await request({
                            url: '/profile/webauthn/authenticate/generate',
                            method: 'POST',
                          });

                          const assertion = await startAuthentication(
                            optionsData as any
                          );
                          await onConfirm(
                            '',
                            undefined,
                            false,
                            'webauthn',
                            assertion
                          );
                          setVerificationCode('');
                          setLoading(false);
                          handleOpenChange(false);
                        } catch (error: any) {
                          console.error('Verification failed:', error);
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                    >
                      <Fingerprint className="mr-2 size-4" />
                      {loading
                        ? t('buttonAuthenticating')
                        : t('buttonSecurityKey')}
                    </Button>
                  )}
                  {hasRecoveryCodes && (
                    <Button
                      type="button"
                      variant={
                        selectedMethod === 'recovery' ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => {
                        setSelectedMethod('recovery');
                        setVerificationCode('');
                      }}
                    >
                      <Shield className="mr-2 size-4" />
                      {t('buttonRecoveryCode')}
                    </Button>
                  )}
                </div>
              )}
              <Label htmlFor="verification-code" className="text-center block">
                {currentMethod === 'email'
                  ? t('labelEmail')
                  : currentMethod === 'recovery'
                    ? t('labelRecovery')
                    : currentMethod === 'webauthn'
                      ? t('labelWebAuthn')
                      : t('labelTotp')}
              </Label>
              {currentMethod === 'webauthn' ? (
                <div className="text-center text-sm text-muted-foreground">
                  {t('webAuthnInstruction')}
                </div>
              ) : currentMethod === 'recovery' ? (
                <div className="flex justify-center">
                  <Input
                    id="verification-code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="text-center text-lg font-mono uppercase max-w-xs"
                    autoComplete="off"
                    placeholder={t('placeholderRecovery')}
                  />
                </div>
              ) : (
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={currentMethod === 'totp' ? 6 : pinCodeLength}
                    value={verificationCode}
                    onChange={setVerificationCode}
                  >
                    {(() => {
                      const length =
                        currentMethod === 'totp' ? 6 : pinCodeLength;
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
                </div>
              )}
              {currentMethod === 'email' && (
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResendCode}
                    disabled={resendLoading || resendCooldown > 0}
                    className="mt-2"
                  >
                    {resendLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        {t('resending')}
                      </>
                    ) : resendCooldown > 0 ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        {t('resendIn', { seconds: resendCooldown })}
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        {t('resendCode')}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t('buttonCancel')}
          </Button>
          {currentMethod !== 'webauthn' && (
            <Button
              onClick={handleConfirm}
              variant="default"
              disabled={(requiresMfa && !verificationCode) || loading}
            >
              {loading ? t('buttonGenerating') : t('buttonGenerate')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
