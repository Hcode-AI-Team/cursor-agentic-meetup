import { Button } from '@/components/ui/button';
import { UserMfaTypeEnum } from '@hed-hog/api-types';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface MfaAddButtonsProps {
  onAddMethod: (type: UserMfaTypeEnum) => void;
}

export function MfaAddButtons({ onAddMethod }: MfaAddButtonsProps) {
  const t = useTranslations('core.MfaAddButtons');

  return (
    <div className="grid grid-cols-3 gap-2 pt-4">
      <Button
        variant="outline"
        onClick={() => onAddMethod(UserMfaTypeEnum.EMAIL)}
        className="justify-start"
      >
        <Plus className="mr-2 size-4" />
        {t('addEmail')}
      </Button>

      <Button
        variant="outline"
        onClick={() => onAddMethod(UserMfaTypeEnum.TOTP)}
        className="justify-start"
      >
        <Plus className="mr-2 size-4" />
        {t('addAuthenticator')}
      </Button>

      <Button
        variant="outline"
        onClick={() => onAddMethod(UserMfaTypeEnum.WEBAUTHN)}
        className="justify-start"
      >
        <Plus className="mr-2 size-4" />
        {t('addSecurityKey')}
      </Button>
    </div>
  );
}
