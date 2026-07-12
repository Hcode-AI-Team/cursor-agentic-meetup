'use client';

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
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { useApp } from '@hed-hog/next-app-provider';
import { Fingerprint, Key, Mail, RefreshCw, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

interface VerifyBeforeAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerify: (
    code: string,
    hash?: string,
    verificationType?: 'totp' | 'email' | 'recovery' | 'webauthn',
    assertionResponse?: any
  ) => Promise<void>;
  availableMethods?: ('totp' | 'email')[];
  verificationType?: 'totp' | 'email';
  codeHash?: string;
  hasWebAuthn?: boolean;
  hasRecoveryCodes?: boolean;
}

export function VerifyBeforeAddDialog({
  open,
  onOpenChange,
  onVerify,
  availableMethods,
  verificationType: initialVerificationType,
  codeHash,
  hasWebAuthn,
  hasRecoveryCodes,
}: VerifyBeforeAddDialogProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState<
    'totp' | 'email' | 'recovery' | 'webauthn'
  >(initialVerificationType || availableMethods?.[0] || 'totp');
  const { request, getSettingValue, showToastHandler } = useApp();
  const t = useTranslations('core.VerifyBeforeAddDialog');
  const emailCodeLength = Number(getSettingValue('mfa-email-code-length')) || 6;

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
      let newMethod: 'totp' | 'email' | 'recovery' | 'webauthn' = 'recovery';

      if (initialVerificationType) {
        newMethod = initialVerificationType as
          | 'totp'
          | 'email'
          | 'recovery'
          | 'webauthn';
      } else if (availableMethods && availableMethods.length > 0) {
        newMethod = availableMethods[0] as
          | 'totp'
          | 'email'
          | 'recovery'
          | 'webauthn';
      } else if (hasWebAuthn) {
        newMethod = 'recovery';
      }

      setSelectedMethod(newMethod);
      setCode('');
    }
  }, [open, initialVerificationType, availableMethods, codeHash, hasWebAuthn]);

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

  const handleVerify = async () => {
    const minLength =
      selectedMethod === 'recovery'
        ? 1
        : selectedMethod === 'email'
          ? emailCodeLength
          : 6;
    if (code.length < minLength) return;

    setLoading(true);
    try {
      const hashToSend = selectedMethod === 'email' ? codeHash : undefined;
      await onVerify(code, hashToSend, selectedMethod);
      onOpenChange(false);
      setCode('');
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const showMethodToggle =
    (availableMethods && availableMethods.length > 0) ||
    hasWebAuthn ||
    hasRecoveryCodes;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {showMethodToggle && (
            <div className="flex gap-2 flex-wrap">
              {(availableMethods?.includes('totp') ||
                initialVerificationType === 'totp') && (
                <Button
                  type="button"
                  variant={selectedMethod === 'totp' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setSelectedMethod('totp')}
                >
                  <Key className="mr-2 size-4" />
                  {t('buttonApp')}
                </Button>
              )}
              {(availableMethods?.includes('email') ||
                initialVerificationType === 'email') && (
                <Button
                  type="button"
                  variant={selectedMethod === 'email' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setSelectedMethod('email')}
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
                  className="flex-1"
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
                      await onVerify('', undefined, 'webauthn', assertion);
                      setCode('');
                      setLoading(false);
                      onOpenChange(false);
                    } catch (error: any) {
                      console.error('WebAuthn verification failed:', error);
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  <Fingerprint className="mr-2 size-4" />
                  {loading ? t('buttonAuthenticating') : t('buttonSecurityKey')}
                </Button>
              )}
              {hasRecoveryCodes && (
                <Button
                  type="button"
                  variant={
                    selectedMethod === 'recovery' ? 'default' : 'outline'
                  }
                  size="sm"
                  className="flex-1"
                  onClick={() => setSelectedMethod('recovery')}
                >
                  <Shield className="mr-2 size-4" />
                  {t('buttonRecoveryCode')}
                </Button>
              )}
            </div>
          )}

          <div className="space-y-2 flex flex-col justify-center items-center">
            <Label htmlFor="verification-code" className="text-center">
              {selectedMethod === 'email'
                ? t('labelEmail')
                : selectedMethod === 'recovery'
                  ? t('labelRecovery')
                  : selectedMethod === 'webauthn'
                    ? t('labelWebAuthn')
                    : t('labelTotp')}
            </Label>
            {selectedMethod === 'webauthn' ? (
              <div className="text-center text-sm text-muted-foreground">
                {t('webAuthnInstruction')}
              </div>
            ) : selectedMethod === 'recovery' ? (
              <Input
                id="verification-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="text-center text-lg font-mono uppercase"
                autoComplete="off"
                placeholder={t('placeholderRecovery')}
              />
            ) : (
              <div className="flex justify-center">
                <InputOTP
                  maxLength={selectedMethod === 'email' ? emailCodeLength : 6}
                  value={code}
                  onChange={setCode}
                  id="verification-code"
                >
                  <InputOTPGroup>
                    {Array.from({
                      length: selectedMethod === 'email' ? emailCodeLength : 6,
                    }).map((_, i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            )}
            {selectedMethod === 'email' && (
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
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setCode('');
            }}
            disabled={loading}
          >
            {t('buttonCancel')}
          </Button>
          {selectedMethod !== 'webauthn' && (
            <Button
              type="button"
              onClick={handleVerify}
              disabled={
                (selectedMethod === 'email' &&
                  code.length !== emailCodeLength) ||
                (selectedMethod === 'totp' && code.length !== 6) ||
                (selectedMethod === 'recovery' && !code) ||
                loading
              }
            >
              {loading ? t('buttonVerifying') : t('buttonVerify')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
