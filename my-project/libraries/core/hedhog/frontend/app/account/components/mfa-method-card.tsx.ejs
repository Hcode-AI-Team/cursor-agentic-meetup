import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserMfa } from '@hed-hog/api-types';
import { Edit2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FormEvent, useState } from 'react';
import { getMethodIcon } from '../lib/mfa-utils';

interface MfaMethodCardProps {
  method: UserMfa;
  onUpdate: (methodId: number, name: string) => void;
  onRemove: (method: any) => void;
  refetch: () => void;
}

export function MfaMethodCard({
  method,
  onRemove,
  onUpdate,
  refetch,
}: MfaMethodCardProps) {
  const t = useTranslations('core.TwoFactorAuth');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState<string>((method as any).name ?? '');

  const handleSubmitUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = editName.trim();
    if (!name) return;

    const id = Number(method.id);
    await Promise.resolve(onUpdate(id, name));
    setIsEditOpen(false);
    refetch();
  };

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-4">
        {getMethodIcon(method.type)}
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{method.name}</p>
            {method.verified_at ? (
              <Badge variant="default" className="text-xs">
                {t('verified')}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                {t('notVerified')}
              </Badge>
            )}
          </div>
          {method.type === 'email' &&
            (method as any).user_mfa_email?.[0]?.email && (
              <p className="text-sm text-muted-foreground mt-1">
                {(method as any).user_mfa_email[0].email}
              </p>
            )}
        </div>
      </div>
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setEditName(method.name);
            setIsEditOpen(true);
          }}
        >
          <Edit2 className="w-4 h-4" />
        </Button>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('editMfaName')}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmitUpdate} className="mt-2 flex flex-col">
              <Label className="mb-2 block text-sm font-medium">
                {t('nameLabel')}
              </Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mb-4 w-full rounded-md border px-3 py-2 text-sm"
                required
                aria-label={t('mfaNameAriaLabel')}
              />

              <div className="flex flex-row gap-2 justify-end">
                <Button type="button" variant="outline">
                  {t('cancel')}
                </Button>
                <Button type="submit">{t('save')}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        <Button variant="ghost" size="icon" onClick={() => onRemove(method)}>
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
