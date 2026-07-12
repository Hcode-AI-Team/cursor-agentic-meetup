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
import { Label } from '@/components/ui/label';
import { Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface EmailRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (email: string) => Promise<void>;
}

export function EmailRequestDialog({
  open,
  onOpenChange,
  onSubmit,
}: EmailRequestDialogProps) {
  const t = useTranslations('core.EmailRequestDialog');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !email.includes('@')) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(email);
      setEmail('');
    } catch (error) {
      console.error('Failed to send code:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setEmail('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email-address">{t('emailLabel')}</Label>
            <Input
              id="email-address"
              type="email"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit();
                }
              }}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t('cancelButton')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!email.trim() || !email.includes('@') || loading}
          >
            {loading ? t('sending') : t('sendButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
