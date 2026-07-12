import { UserMfaTypeEnum } from '@hed-hog/api-types/UserMfaTypeEnum';
import { useApp } from '@hed-hog/next-app-provider';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export function useMfaSetup() {
  const { request, showToastHandler, user } = useApp();
  const t = useTranslations('core.MfaSetupHook');
  const [secret, setSecret] = useState('');
  const [codeHash, setCodeHash] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [challengeId, setChallengeId] = useState<number | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);

  const userEmail = user?.user_identifier?.find(
    (ui) => ui.type === 'email'
  )?.value;

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const resendEmailCode = async () => {
    if (!currentEmail) {
      showToastHandler('error', t('emailNotFound'));
      return;
    }

    setResendLoading(true);
    try {
      const { data }: any = await request<{ challengeId: number }>({
        url: '/profile/mfa/email/verify',
        method: 'POST',
        data: { email: currentEmail },
      });

      setChallengeId(data.challengeId);
      setResendCooldown(30);
      showToastHandler('success', t('codeResent'));
    } catch (error) {
      showToastHandler('error', t('resendFailed'));
      console.error(error);
    } finally {
      setResendLoading(false);
    }
  };

  const sendCodeToRemoveEmailMFA = async () => {
    try {
      const { data }: any = await request({
        url: `/profile/email/send-code-to-remove`,
        method: 'POST',
        data: { email: userEmail },
      });

      setCodeHash(data.codeHash);
      showToastHandler('success', t('checkEmailSent'));
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const enableEmailMFA = async (email: string) => {
    try {
      const { data }: any = await request<{ challengeId: number }>({
        url: '/profile/mfa/email/verify',
        method: 'POST',
        data: { email },
      });

      setChallengeId(data.challengeId);
      setCurrentEmail(email);
      setResendCooldown(30);
      showToastHandler('success', t('checkEmailSent'));
      return data.challengeId;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const enableAuthenticatorMFA = async () => {
    try {
      const { data }: any = await request({
        url: '/profile/totp/generate',
        method: 'POST',
      });

      setSecret(data.secret);
      setQrCode(data.qrCode);
      showToastHandler('success', t('scanQrCode'));
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const verifyEmailMFA = async (name: string, token: string, email: string) => {
    try {
      const { data }: any = await request<{ codes: string[] }>({
        url: '/profile/mfa/email/verify/confirm',
        method: 'POST',
        data: { pin: token, challengeId, name, email },
      });

      showToastHandler('success', t('methodAddedSuccess'));
      return data?.codes ? (data.codes as string[]) : [];
    } catch (error) {
      throw error;
    }
  };

  const updateMFAName = async (mfaId: number, name: string) => {
    try {
      await request({
        url: `/profile/update-mfa/${mfaId}`,
        method: 'PUT',
        data: { name },
      });

      showToastHandler('success', t('nameUpdatedSuccess'));
    } catch (error) {
      console.error(error);
    }
  };

  const verifyTOTPMFA = async (name: string, verificationCode: string) => {
    try {
      const { data }: any = await request({
        url: '/profile/totp/verify',
        method: 'POST',
        data: {
          name,
          token: verificationCode,
          secret,
        },
      });

      showToastHandler('success', t('methodAddedSuccess'));
      return data.codes as string[];
    } catch (error) {
      throw error;
    }
  };

  const handleRemoveTOTPMFA = async (methodId: number, token: string) => {
    try {
      await request({
        url: `/profile/totp/${methodId}/remove`,
        method: 'DELETE',
        data: { token },
      });

      showToastHandler('success', t('methodRemovedSuccess'));
    } catch (error) {
      showToastHandler('error', t('removeMethodFailed'));
      throw error;
    }
  };

  const handleRemoveEmailMFA = async (methodId: number, token: string) => {
    try {
      await request({
        url: `/profile/email/${methodId}/remove`,
        method: 'DELETE',
        data: { token, hash: codeHash },
      });

      showToastHandler('success', t('methodRemovedSuccess'));
    } catch (error) {
      throw error;
    }
  };

  const removeMFAMethodWithRecoveryCode = async (
    methodId: number,
    recoveryCode: string
  ) => {
    try {
      await request({
        url: `/profile/mfa/${methodId}/remove-with-recovery-code`,
        method: 'DELETE',
        data: { recoveryCode },
      });

      showToastHandler('success', t('methodRemovedSuccess'));
    } catch (error) {
      showToastHandler('error', t('removeMethodFailed'));
      throw error;
    }
  };

  const handleRemoveWebAuthnMFA = async (methodId: number) => {
    try {
      const { startAuthentication } = await import('@simplewebauthn/browser');
      const optionsResponse = await request<any>({
        url: '/profile/webauthn/authenticate/generate',
        method: 'POST',
      });

      if (!optionsResponse.data) {
        throw new Error('Failed to generate authentication options');
      }

      showToastHandler('success', t('authenticateToRemove'));
      const assertion = await startAuthentication(optionsResponse.data);
      await request({
        url: '/profile/webauthn/authenticate/verify',
        method: 'POST',
        data: {
          assertionResponse: assertion,
        },
      });

      await request({
        url: `/profile/webauthn/${methodId}/remove`,
        method: 'DELETE',
      });
      showToastHandler('success', t('securityKeyRemovedSuccess'));
    } catch (error: any) {
      if (error?.name === 'NotAllowedError') {
        showToastHandler('error', t('authenticationCancelled'));
      } else {
        showToastHandler(
          'error',
          error?.message || t('removeSecurityKeyFailed')
        );
      }
      throw error;
    }
  };

  const removeMFAMethod = async (
    methodId: number,
    methodType: UserMfaTypeEnum,
    verificationCode: string
  ) => {
    switch (methodType) {
      case UserMfaTypeEnum.TOTP:
        await handleRemoveTOTPMFA(methodId, verificationCode);
        break;
      case UserMfaTypeEnum.WEBAUTHN:
        await handleRemoveWebAuthnMFA(methodId);
        break;
      case UserMfaTypeEnum.EMAIL:
        await handleRemoveEmailMFA(methodId, verificationCode);
        break;

      default:
        await handleRemoveEmailMFA(methodId, verificationCode);
    }
  };

  const removeMfaUnified = async (
    methodId: number,
    token?: string,
    hash?: string,
    verificationType?: 'totp' | 'email' | 'recovery' | 'webauthn',
    assertionResponse?: any
  ) => {
    try {
      await request({
        url: `/profile/mfa/${methodId}/remove`,
        method: 'DELETE',
        data: { token, hash, verificationType, assertionResponse },
      });

      showToastHandler('success', t('methodRemovedSuccess'));
    } catch (error) {
      showToastHandler('error', t('removeMethodFailed'));
      throw error;
    }
  };

  const initiateSetup = async (type: UserMfaTypeEnum, email?: string) => {
    switch (type) {
      case UserMfaTypeEnum.EMAIL:
        if (email) {
          await enableEmailMFA(email);
        } else {
          throw new Error('Email is required for EMAIL MFA');
        }
        break;
      case UserMfaTypeEnum.TOTP:
        await enableAuthenticatorMFA();
        break;
      default:
        if (email) {
          await enableEmailMFA(email);
        } else {
          throw new Error('Email is required for EMAIL MFA');
        }
    }
  };

  const checkMfaVerificationType = async () => {
    try {
      const { data }: any = await request({
        url: '/profile/recovery-codes/send-verification',
        method: 'POST',
      });

      return {
        requiresVerification: data.requiresVerification,
        verificationType: data.verificationType,
        availableMethods: data.availableMethods,
        codeHash: data.codeHash,
        hasWebAuthn: data.hasWebAuthn,
        hasRecoveryCodes: data.hasRecoveryCodes,
      };
    } catch (error) {
      showToastHandler('error', t('checkVerificationTypeFailed'));
      throw error;
    }
  };

  const regenerateRecoveryCodes = async (
    verificationCode?: string,
    hash?: string,
    verificationType?: 'totp' | 'email' | 'recovery' | 'webauthn',
    assertionResponse?: any
  ) => {
    try {
      const { data }: any = await request({
        url: '/profile/recovery-codes/regenerate',
        method: 'POST',
        data: { verificationCode, hash, verificationType, assertionResponse },
      });

      showToastHandler('success', t('recoveryCodesRegeneratedSuccess'));
      return data.codes as string[];
    } catch (error) {
      showToastHandler('error', t('regenerateRecoveryCodesFailed'));
      throw error;
    }
  };

  const checkIfMfaExists = async () => {
    try {
      const { data }: any = await request({
        url: '/profile/mfa/check-verification',
        method: 'POST',
      });

      return {
        requiresVerification: data.requiresVerification,
        verificationType: data.verificationType,
        availableMethods: data.availableMethods,
        codeHash: data.codeHash,
        hasWebAuthn: data.hasWebAuthn,
        hasRecoveryCodes: data.hasRecoveryCodes,
      };
    } catch (error) {
      showToastHandler('error', t('checkExistingMfaFailed'));
      throw error;
    }
  };

  const checkMfaBeforeRemove = async () => {
    try {
      const { data }: any = await request({
        url: '/profile/mfa/check-verification-remove',
        method: 'POST',
      });

      return {
        requiresVerification: data.requiresVerification,
        verificationType: data.verificationType,
        availableMethods: data.availableMethods,
        codeHash: data.codeHash,
        hasWebAuthn: data.hasWebAuthn,
        hasRecoveryCodes: data.hasRecoveryCodes,
      };
    } catch (error) {
      showToastHandler('error', t('checkMfaBeforeRemoveFailed'));
      throw error;
    }
  };

  const verifyBeforeAddMfa = async (
    verificationCode: string,
    hash?: string,
    verificationType?: 'totp' | 'email' | 'recovery' | 'webauthn',
    assertionResponse?: any
  ) => {
    try {
      await request({
        url: '/profile/mfa/verify-before-add',
        method: 'POST',
        data: { verificationCode, hash, verificationType, assertionResponse },
      });

      return true;
    } catch (error) {
      console.error('❌ verifyBeforeAddMfa error:', error);
      showToastHandler('error', t('invalidVerificationCode'));
      throw error;
    }
  };

  const enableWebAuthnMFA = async (name: string) => {
    try {
      const { startRegistration } = await import('@simplewebauthn/browser');

      const { data: options }: any = await request({
        url: '/profile/webauthn/generate',
        method: 'POST',
        data: { name },
      });

      const attestationResponse = await startRegistration(options);

      const { data }: any = await request({
        url: '/profile/webauthn/verify',
        method: 'POST',
        data: { name, attestationResponse },
      });

      showToastHandler('success', t('securityKeyRegisteredSuccess'));
      return data.codes as string[];
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        showToastHandler('error', t('registrationCancelled'));
      } else {
        showToastHandler('error', t('registerSecurityKeyFailed'));
      }
      throw error;
    }
  };

  return {
    qrCode,
    userEmail,
    verifyEmailMFA,
    verifyTOTPMFA,
    removeMFAMethod,
    removeMfaUnified,
    removeMFAMethodWithRecoveryCode,
    updateMFAName,
    sendCodeToRemoveEmailMFA,
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
  };
}
