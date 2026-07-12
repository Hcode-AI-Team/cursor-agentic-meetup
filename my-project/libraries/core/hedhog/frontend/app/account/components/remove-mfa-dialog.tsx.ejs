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
import { AlertTriangle, Fingerprint, Key, Mail, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

interface RemoveMfaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (
    code: string,
    hash?: string,
    verificationType?: 'totp' | 'email' | 'recovery' | 'webauthn',
    assertionResponse?: any
  ) => Promise<void>;
  availableMethods?: ('totp' | 'email')[];
  verificationType?: 'totp' | 'email';
  codeHash?: string;
  hasWebAuthn?: boolean;
  methodName?: string;
}

export function RemoveMfaDialog({
  open,
  onOpenChange,
  onConfirm,
  availableMethods,
  verificationType: initialVerificationType,
  codeHash,
  hasWebAuthn,
  methodName,
}: RemoveMfaDialogProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState<
    'totp' | 'email' | 'recovery' | 'webauthn'
  >(initialVerificationType || availableMethods?.[0] || 'totp');
  const { request, getSettingValue, userEmail, showToastHandler } = useApp();
  const t = useTranslations('core.RemoveMfaDialog');
  const emailCodeLength = Number(getSettingValue('mfa-email-code-length')) || 6;

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
      setResendCooldown(0);
    }
  }, [open, initialVerificationType, availableMethods, codeHash, hasWebAuthn]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendCode = async () => {
    if (!userEmail) {
      showToastHandler('error', t('emailNotFound'));
      return;
    }

    setResendLoading(true);
    try {
      await request({
        url: '/profile/mfa/check-verification-remove',
        method: 'POST',
      });
      showToastHandler('success', t('codeResent'));
      setResendCooldown(30);
    } catch (error) {
      console.error('Failed to resend code:', error);
      showToastHandler('error', t('resendFailed'));
    } finally {
      setResendLoading(false);
    }
  };

  const handleConfirm = async () => {
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
      await onConfirm(code, hashToSend, selectedMethod);
      onOpenChange(false);
      setCode('');
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const showMethodToggle =
    (availableMethods && availableMethods.length > 0) || hasWebAuthn;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-500" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t.rich('description', {
              methodName: methodName as string,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {t('warningMessage')}
            </p>
          </div>

          {showMethodToggle && (
            <div className="flex gap-2 flex-wrap">
              {availableMethods?.includes('totp') && (
                <Button
                  type="button"
                  variant={selectedMethod === 'totp' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setSelectedMethod('totp')}
                >
                  <Key className="mr-2 size-4" />
                  {t('useAuthenticator')}
                </Button>
              )}
              {availableMethods?.includes('email') && (
                <Button
                  type="button"
                  variant={selectedMethod === 'email' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setSelectedMethod('email')}
                >
                  <Mail className="mr-2 size-4" />
                  {t('useEmail')}
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

                      const { data: optionsData } = await request<any>({
                        url: '/profile/webauthn/authenticate/generate',
                        method: 'POST',
                      });

                      const assertion = await startAuthentication({
                        optionsJSON: optionsData,
                      });
                      await onConfirm('', undefined, 'webauthn', assertion);
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
                  {t('useWebAuthn')}
                </Button>
              )}
              <Button
                type="button"
                variant={selectedMethod === 'recovery' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setSelectedMethod('recovery')}
              >
                <Shield className="mr-2 size-4" />
                {t('useRecoveryCode')}
              </Button>
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
              <>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={selectedMethod === 'email' ? emailCodeLength : 6}
                    value={code}
                    onChange={setCode}
                    id="verification-code"
                  >
                    <InputOTPGroup>
                      {Array.from({
                        length:
                          selectedMethod === 'email' ? emailCodeLength : 6,
                      }).map((_, i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {selectedMethod === 'email' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResendCode}
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
              </>
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
            {t('cancelButton')}
          </Button>
          {selectedMethod !== 'webauthn' && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirm}
              disabled={
                (selectedMethod === 'email' &&
                  code.length !== emailCodeLength) ||
                (selectedMethod === 'totp' && code.length !== 6) ||
                (selectedMethod === 'recovery' && !code) ||
                loading
              }
            >
              {loading ? t('removing') : t('removeButton')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
