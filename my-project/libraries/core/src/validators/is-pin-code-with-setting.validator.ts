import { getLocaleText } from '@hed-hog/api-locale';
import { Injectable } from '@nestjs/common';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator';
import { getLocaleFromContext } from '../utils/locale-context';
import { ValidatorServiceLocator } from './service-locator';

@ValidatorConstraint({ async: true })
@Injectable()
export class IsPinCodeWithSettingConstraint implements ValidatorConstraintInterface {
  private settings: any = null;

  async validate(pinCode: string, args: ValidationArguments): Promise<boolean> {
    this.settings = null;

    if (!pinCode) {
      return false;
    }

    // Validate that pinCode contains only digits
    const digitRegex = /^\d+$/;
    if (!digitRegex.test(pinCode)) {
      return false;
    }

    try {
      const settingService = ValidatorServiceLocator.getSettingService();
      this.settings = await settingService.getSystemSettings();
      const codeLength = this.settings.setting['mfa-email-code-length'] || 6;

      // Validate pin code length matches the configured length
      return pinCode.length === Number(codeLength);
    } catch (error) {
      console.warn('[IsPinCodeWithSettingConstraint] Error getting SettingService:', error);
      return true; // Allow if service is not available
    }
  }

  defaultMessage(): string {
    const locale = getLocaleFromContext();

    if (this.settings) {
      const codeLength = this.settings.setting['mfa-email-code-length'] || 6;

      const replacements: Record<string, string> = {
        '{length}': String(codeLength),
      };

      let message = getLocaleText(
        'pinCode.invalidLength',
        locale,
        'PIN code does not meet the required length defined in system settings.'
      );

      // Replace placeholders
      Object.entries(replacements).forEach(([placeholder, value]) => {
        message = message.replace(new RegExp(placeholder, 'g'), value);
      });

      return message;
    }

    return getLocaleText(
      'pinCode.invalidLength',
      locale,
      'PIN code does not meet the required length defined in system settings.'
    );
  }
}

export function IsPinCodeWithSetting(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPinCodeWithSettingConstraint,
    });
  };
}
