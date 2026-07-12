import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { formatDate } from '@/lib/format-date';
import { User, UserIdentifier } from '@hed-hog/api-types';
import { useApp } from '@hed-hog/next-app-provider';
import {
  CheckCircle2,
  Fingerprint,
  HelpCircle,
  Mail,
  Phone,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

function getIdentifierIcon(type?: string) {
  const t = (type || '').toLowerCase();
  switch (t) {
    case 'email':
      return Mail;
    case 'phone':
      return Phone;
    case 'username':
      return UserIcon;
    default:
      return Fingerprint;
  }
}

function getIdentifierLabel(type?: string, t?: any) {
  const typeKey = (type || '').toLowerCase();

  switch (typeKey) {
    case 'email':
      return t ? t('email') : 'Email';
    case 'phone':
      return t ? t('phone') : 'Phone';
    case 'username':
      return t ? t('username') : 'Username';
    default:
      return type
        ? type.charAt(0).toUpperCase() + type.slice(1)
        : t
          ? t('identifier')
          : 'Identifier';
  }
}

export function UserIdentifiersSection({ editingUser }: { editingUser: User }) {
  const { currentLocaleCode, getSettingValue, request } = useApp();
  const t = useTranslations('core.UserIdentifiers');
  const identifiers: UserIdentifier[] = editingUser?.user_identifier ?? [];
  const sortedIdentifiers = [...identifiers].sort((a, b) => {
    const aDate = new Date(a.created_at || 0).getTime();
    const bDate = new Date(b.created_at || 0).getTime();
    return bDate - aDate;
  });

  const [showPinDialog, setShowPinDialog] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [currentIdentifierId, setCurrentIdentifierId] = useState<number | null>(
    null
  );
  const pinCodeLength = getSettingValue('mfa-email-code-length') || 6;

  const handleSendVerificationCode = async (identifierId: number) => {
    try {
      await request({
        url: `/user-identifier/${identifierId}/verify`,
        method: 'POST',
      });
      toast.success(t('verificationCodeSent'));
      setCurrentIdentifierId(identifierId);
      setShowPinDialog(true);
    } catch (error) {
      toast.error(t('verifyError'));
    }
  };

  const handleConfirmPin = async () => {
    if (!currentIdentifierId) return;

    try {
      await request({
        url: `/user-identifier/${currentIdentifierId}/verify/confirm`,
        method: 'POST',
        data: { pin: verificationCode },
      });
      toast.success(t('verifySuccess'));
      setShowPinDialog(false);
      setVerificationCode('');
      setCurrentIdentifierId(null);
      window.location.reload();
    } catch (error) {
      toast.error(t('invalidPin'));
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">{t('title')}</h4>

      <div className="space-y-2">
        {sortedIdentifiers.length ? (
          sortedIdentifiers.map((identifier) => {
            const Icon = getIdentifierIcon(identifier.type);
            const label = getIdentifierLabel(identifier.type, t);
            const isVerified = Boolean(identifier.verified_at);

            return (
              <div key={identifier.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-slate-50 p-2">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>

                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">
                        {identifier.value}
                      </p>

                      {(identifier.created_at || identifier.updated_at) && (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {identifier.created_at && (
                            <>
                              {t('created')}{' '}
                              {formatDate(
                                identifier.created_at,
                                getSettingValue,
                                currentLocaleCode
                              )}{' '}
                            </>
                          )}
                          {identifier.updated_at && (
                            <>
                              • {t('updated')}{' '}
                              {formatDate(
                                identifier.updated_at,
                                getSettingValue,
                                currentLocaleCode
                              )}
                            </>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t('verified')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                        <HelpCircle className="h-3.5 w-3.5" />
                        {t('unverified')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-lg border border-dashed p-3 text-center">
            <p className="text-sm text-muted-foreground">
              {t('noIdentifiers')}
            </p>
          </div>
        )}
      </div>

      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('verifyDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('verifyDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleConfirmPin();
            }}
            className="space-y-4"
          >
            <div className="space-y-2 flex flex-col gap-2 items-center justify-center">
              <Label className="text-sm font-medium">{t('pinCodeLabel')}</Label>
              <InputOTP
                maxLength={pinCodeLength}
                value={verificationCode}
                onChange={setVerificationCode}
              >
                {(() => {
                  const groupSize = Math.ceil(pinCodeLength / 2);
                  const groups = [
                    Array.from({ length: groupSize }, (_, i) => (
                      <InputOTPSlot key={i} index={i} />
                    )),
                    Array.from(
                      { length: pinCodeLength - groupSize },
                      (_, i) => (
                        <InputOTPSlot
                          key={i + groupSize}
                          index={i + groupSize}
                        />
                      )
                    ),
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
              {currentIdentifierId && (
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2"
                  onClick={() =>
                    handleSendVerificationCode(currentIdentifierId)
                  }
                >
                  {t('resendCode')}
                </Button>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPinDialog(false);
                  setVerificationCode('');
                  setCurrentIdentifierId(null);
                }}
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={verificationCode.length !== pinCodeLength}
              >
                <ShieldCheck className="mr-2 size-4" />
                {t('confirmVerification')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
