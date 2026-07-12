'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { UserMfaTypeEnum } from '@hed-hog/api-types/UserMfaTypeEnum';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useMfaMethods } from '../hooks/use-mfa-methods';
import { useMfaSetup } from '../hooks/use-mfa-setup';
import { EmailRequestDialog } from './email-request-dialog';
import { MfaAddButtons } from './mfa-add-buttons';
import { MfaMethodCard } from './mfa-method-card';
import { MfaSetupDialog } from './mfa-setup-dialog';
import { RecoveryCodesDialog } from './recovery-codes-dialog';
import { RegenerateCodesDialog } from './regenerate-codes-dialog';
import { RemoveMfaDialog } from './remove-mfa-dialog';
import { VerifyBeforeAddDialog } from './verify-before-add-dialog';

interface VerificationState {
  verificationType?: 'totp' | 'email';
  availableMethods?: ('totp' | 'email')[];
  codeHash?: string;
  hasWebAuthn: boolean;
  hasRecoveryCodes: boolean;
}

interface RemoveMethodState extends VerificationState {
  methodId: number | null;
  methodType: UserMfaTypeEnum | null;
  methodName: string;
}

const initialVerificationState: VerificationState = {
  verificationType: undefined,
  availableMethods: undefined,
  codeHash: undefined,
  hasWebAuthn: false,
  hasRecoveryCodes: false,
};

const initialRemoveState: RemoveMethodState = {
  ...initialVerificationState,
  methodId: null,
  methodType: null,
  methodName: '',
};

export function TwoFactorAuth() {
  const t = useTranslations('core.TwoFactorAuth');

  // Setup states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<UserMfaTypeEnum | null>(
    null
  );
  const [verificationCode, setVerificationCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [showEmailRequestDialog, setShowEmailRequestDialog] = useState(false);

  // Recovery codes states
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showCodesDialog, setShowCodesDialog] = useState(false);

  // Remove method states
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [removeState, setRemoveState] =
    useState<RemoveMethodState>(initialRemoveState);

  // Regenerate codes states
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [regenerateState, setRegenerateState] = useState<VerificationState>(
    initialVerificationState
  );

  // Verify before add states
  const [showVerifyBeforeAddDialog, setShowVerifyBeforeAddDialog] =
    useState(false);
  const [verifyBeforeAddState, setVerifyBeforeAddState] =
    useState<VerificationState>(initialVerificationState);
  const [pendingMethodToAdd, setPendingMethodToAdd] =
    useState<UserMfaTypeEnum | null>(null);

  const { mfaMethods, refetchMfaMethods } = useMfaMethods();
  const {
    qrCode,
    verifyEmailMFA,
    verifyTOTPMFA,
    removeMfaUnified,
    updateMFAName,
    initiateSetup,
    regenerateRecoveryCodes,
    checkMfaVerificationType,
    checkIfMfaExists,
    checkMfaBeforeRemove,
    verifyBeforeAddMfa,
    enableWebAuthnMFA,
    resendEmailCode,
    resendLoading,
    resendCooldown,
  } = useMfaSetup();

  const handleAddMethod = async (type: UserMfaTypeEnum) => {
    try {
      const mfaCheck = await checkIfMfaExists();
      if (mfaCheck.requiresVerification) {
        setPendingMethodToAdd(type);
        setVerifyBeforeAddState({
          verificationType: mfaCheck.verificationType,
          availableMethods: mfaCheck.availableMethods,
          codeHash: mfaCheck.codeHash,
          hasWebAuthn: mfaCheck.hasWebAuthn || false,
          hasRecoveryCodes: mfaCheck.hasRecoveryCodes || false,
        });
        setShowVerifyBeforeAddDialog(true);
      } else {
        await proceedWithAddMethod(type);
      }
    } catch (error) {
      console.error('Failed to check MFA:', error);
    }
  };

  const proceedWithAddMethod = async (type: UserMfaTypeEnum) => {
    if (type === UserMfaTypeEnum.EMAIL) {
      setSelectedMethod(type);
      setShowEmailRequestDialog(true);
      setName('');
      setEmail('');
    } else {
      if (type !== UserMfaTypeEnum.WEBAUTHN) {
        await initiateSetup(type);
      }
      setSelectedMethod(type);
      setShowAddDialog(true);
      setName('');
      setEmail('');
    }
  };

  const handleVerifyBeforeAdd = async (
    code: string,
    hash?: string,
    verificationType?: 'totp' | 'email' | 'recovery' | 'webauthn',
    assertionResponse?: any
  ) => {
    try {
      await verifyBeforeAddMfa(code, hash, verificationType, assertionResponse);
      if (pendingMethodToAdd) {
        await proceedWithAddMethod(pendingMethodToAdd);
        setPendingMethodToAdd(null);
      }
    } catch (error) {
      throw error;
    }
  };

  const handleEmailSubmit = async (emailAddress: string) => {
    setEmail(emailAddress);
    await initiateSetup(UserMfaTypeEnum.EMAIL, emailAddress);
    setShowEmailRequestDialog(false);
    setShowAddDialog(true);
  };

  const handleVerifySetup = async () => {
    let codes: string[] = [];

    if (selectedMethod === UserMfaTypeEnum.EMAIL) {
      codes = await verifyEmailMFA(name, verificationCode, email);
    } else if (selectedMethod === UserMfaTypeEnum.TOTP) {
      codes = await verifyTOTPMFA(name, verificationCode);
    } else if (selectedMethod === UserMfaTypeEnum.WEBAUTHN) {
      codes = await enableWebAuthnMFA(name);
    }

    setRecoveryCodes(codes);
    setShowAddDialog(false);
    setShowCodesDialog(true);
    setVerificationCode('');
    setSelectedMethod(null);
    refetchMfaMethods();
  };

  const handleRemoveMethod = async (method: any) => {
    setRemoveState(initialRemoveState);

    try {
      const result = await checkMfaBeforeRemove();
      setRemoveState({
        verificationType: result.verificationType,
        availableMethods: result.availableMethods,
        codeHash: result.codeHash,
        hasWebAuthn: result.hasWebAuthn || false,
        hasRecoveryCodes: false,
        methodId: method.id,
        methodType: method.type,
        methodName: method.name || method.type,
      });
      setShowRemoveDialog(true);
    } catch (error) {
      console.error('Failed to check MFA before remove:', error);
    }
  };

  const handleVerifyRemoval = async (
    code: string,
    hash?: string,
    verificationType?: 'totp' | 'email' | 'recovery' | 'webauthn',
    assertionResponse?: any
  ) => {
    if (removeState.methodId) {
      try {
        await removeMfaUnified(
          removeState.methodId,
          code,
          hash,
          verificationType,
          assertionResponse
        );

        setShowRemoveDialog(false);
        setRemoveState(initialRemoveState);
        refetchMfaMethods();
      } catch (error) {
        console.error('Failed to remove MFA:', error);
        throw error;
      }
    }
  };

  const handleCloseCodesDialog = () => {
    setShowCodesDialog(false);
    setRecoveryCodes([]);
  };

  const handleCloseRemoveDialog = (open: boolean) => {
    if (!open) {
      setRemoveState(initialRemoveState);
    }
    setShowRemoveDialog(open);
  };

  const handleOpenRegenerateDialog = async () => {
    const result = await checkMfaVerificationType();
    setRegenerateState({
      verificationType: result.verificationType,
      availableMethods: result.availableMethods,
      codeHash: result.codeHash,
      hasWebAuthn: result.hasWebAuthn || false,
      hasRecoveryCodes: result.hasRecoveryCodes || false,
    });
    setShowRegenerateDialog(true);
  };

  const handleRegenerateCodes = async (
    verificationCode: string,
    hash?: string,
    useTotp?: boolean,
    verificationType?: 'totp' | 'email' | 'recovery' | 'webauthn',
    assertionResponse?: any
  ) => {
    const finalVerificationType =
      verificationType ||
      (useTotp
        ? 'totp'
        : hash || regenerateState.codeHash
          ? 'email'
          : 'recovery');

    const codes = await regenerateRecoveryCodes(
      verificationCode || undefined,
      hash || regenerateState.codeHash,
      finalVerificationType,
      assertionResponse
    );

    setRecoveryCodes(codes);
    setShowRegenerateDialog(false);
    setShowCodesDialog(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-6 pb-6">
          {mfaMethods.length > 0 ? (
            <div className="space-y-4">
              {mfaMethods.map((method) => (
                <MfaMethodCard
                  key={method.id}
                  method={method}
                  onRemove={handleRemoveMethod}
                  onUpdate={updateMFAName}
                  refetch={refetchMfaMethods}
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground py-8">
              {t('noMethodsConfigured')}
            </div>
          )}

          <MfaAddButtons onAddMethod={handleAddMethod} />

          {mfaMethods.length > 0 && (
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleOpenRegenerateDialog}
              >
                {t('regenerateRecoveryCodes')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <MfaSetupDialog
        open={showAddDialog}
        selectedMethod={selectedMethod}
        qrCode={qrCode}
        verificationCode={verificationCode}
        onOpenChange={setShowAddDialog}
        name={name}
        onNameChange={setName}
        onVerificationCodeChange={setVerificationCode}
        onVerify={handleVerifySetup}
        resendLoading={resendLoading}
        resendCooldown={resendCooldown}
        onResendCode={resendEmailCode}
      />

      <EmailRequestDialog
        open={showEmailRequestDialog}
        onOpenChange={setShowEmailRequestDialog}
        onSubmit={handleEmailSubmit}
      />

      <RecoveryCodesDialog
        open={showCodesDialog}
        codes={recoveryCodes}
        onOpenChange={setShowCodesDialog}
        onConfirm={handleCloseCodesDialog}
      />

      <RemoveMfaDialog
        open={showRemoveDialog}
        onOpenChange={handleCloseRemoveDialog}
        onConfirm={handleVerifyRemoval}
        verificationType={removeState.verificationType}
        availableMethods={removeState.availableMethods}
        codeHash={removeState.codeHash}
        hasWebAuthn={removeState.hasWebAuthn}
        methodName={removeState.methodName}
      />

      <RegenerateCodesDialog
        open={showRegenerateDialog}
        onOpenChange={setShowRegenerateDialog}
        onConfirm={handleRegenerateCodes}
        requiresMfa={mfaMethods.length > 0}
        verificationType={regenerateState.verificationType}
        availableMethods={regenerateState.availableMethods}
        codeHash={regenerateState.codeHash}
        hasWebAuthn={regenerateState.hasWebAuthn}
        hasRecoveryCodes={regenerateState.hasRecoveryCodes}
      />

      <VerifyBeforeAddDialog
        open={showVerifyBeforeAddDialog}
        onOpenChange={setShowVerifyBeforeAddDialog}
        onVerify={handleVerifyBeforeAdd}
        verificationType={verifyBeforeAddState.verificationType}
        availableMethods={verifyBeforeAddState.availableMethods}
        codeHash={verifyBeforeAddState.codeHash}
        hasWebAuthn={verifyBeforeAddState.hasWebAuthn}
        hasRecoveryCodes={verifyBeforeAddState.hasRecoveryCodes}
      />
    </>
  );
}
