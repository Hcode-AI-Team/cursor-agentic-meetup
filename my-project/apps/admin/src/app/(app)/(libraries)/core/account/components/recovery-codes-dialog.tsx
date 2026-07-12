import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useApp } from '@hed-hog/next-app-provider';
import { CheckedState } from '@radix-ui/react-checkbox';
import { Copy, Download, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { copyToClipboard } from '../lib/mfa-utils';

interface RecoveryCodesDialogProps {
  open: boolean;
  codes: string[];
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function RecoveryCodesDialog({
  open,
  codes,
  onOpenChange,
  onConfirm,
}: RecoveryCodesDialogProps) {
  const t = useTranslations('core.RecoveryCodes');
  const [checkSavedCodes, setCheckSavedCodes] = useState<CheckedState>(false);
  const [showError, setShowError] = useState(false);
  const { showToastHandler } = useApp();

  const handleCopyCode = async (code: string) => {
    const success = await copyToClipboard(code);
    if (success) {
      showToastHandler('success', t('codeCopied'));
    } else {
      showToastHandler('error', t('codeCopyFailed'));
    }
  };

  const handleCopyAllCodes = async () => {
    const codesText = codes.join('\n');
    const success = await copyToClipboard(codesText);
    if (success) {
      showToastHandler('success', t('allCodesCopied'));
    } else {
      showToastHandler('error', t('allCodesCopyFailed'));
    }
  };

  const handleDownloadCodes = useCallback(() => {
    if (!codes || codes.length === 0) {
      showToastHandler('error', t('noCodesAvailable'));
      return;
    }
    try {
      const content = codes.join('\n');
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'recovery-codes.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToastHandler('success', t('codesDownloaded'));
    } catch (e) {
      showToastHandler('error', t('downloadFailed'));
    }
  }, [codes, showToastHandler, t]);

  const handleConfirm = () => {
    if (!checkSavedCodes) {
      setShowError(true);
      return;
    }

    try {
      onConfirm();
    } finally {
      setShowError(false);
      onOpenChange(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !checkSavedCodes) {
      setShowError(true);
      return;
    }
    setShowError(false);
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="size-5 text-primary" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="grid grid-cols-2 gap-3">
              {codes.map((code, index) => (
                <div
                  key={index}
                  className="font-mono text-sm bg-background rounded pl-3 py-2 text-center font-semibold tracking-wider border flex items-center justify-between"
                >
                  <span className="break-all">{code}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopyCode(code)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
            <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
              {t('warningMessage')}
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
            <p className="text-xs text-blue-800 dark:text-blue-200 font-medium">
              {t('infoMessage')}
            </p>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleCopyAllCodes}
            disabled={!codes.length}
          >
            {t('copyAllCodes')}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleDownloadCodes}
            disabled={!codes.length}
          >
            <Download className="w-4 h-4 mr-2" />
            {t('downloadCodes')}
          </Button>
          <div className="w-full mt-4">
            <Label
              htmlFor="saved-codes-checkbox"
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <Checkbox
                id="saved-codes-checkbox"
                checked={checkSavedCodes}
                onCheckedChange={(checked) => {
                  setCheckSavedCodes(checked);
                  if (checked) setShowError(false);
                }}
                className="h-4 w-4 rounded border-muted bg-background"
              />
              <span className="text-sm font-medium">{t('confirmSaved')}</span>
            </Label>

            {showError && (
              <Badge className="w-full text-sm my-4 bg-red-400 text-white font-medium">
                {t('errorNotConfirmed')}
              </Badge>
            )}

            <Button className="w-full mt-2" onClick={handleConfirm}>
              {t('confirmAndClose')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
