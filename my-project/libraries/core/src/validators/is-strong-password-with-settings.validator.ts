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
export class IsStrongPasswordWithSettingsConstraint
  implements ValidatorConstraintInterface
{
  private failedRule: string | null = null;
  private settings: any = null;

  async validate(password: string, args: ValidationArguments): Promise<boolean> {
    this.failedRule = null;
    this.settings = null;

    if (!password) {
      this.failedRule = 'password.required';
      return false;
    }

    try {
      const settingService = ValidatorServiceLocator.getSettingService();
      this.settings = await settingService.getSystemSettings();
    const minLength = this.settings.setting['password-min-length'] || 6;
    const minLowercase = this.settings.setting['password-min-lowercase'] || 0;
    const minUppercase = this.settings.setting['password-min-uppercase'] || 0;
    const minNumbers = this.settings.setting['password-min-numbers'] || 0;
    const minSymbols = this.settings.setting['password-min-symbols'] || 0;

    // Validate length
    if (password.length < minLength) {
      this.failedRule = 'password.minLength';
      return false;
    }

    // Count character types
    const lowercase = (password.match(/[a-z]/g) || []).length;
    const uppercase = (password.match(/[A-Z]/g) || []).length;
    const numbers = (password.match(/[0-9]/g) || []).length;
    const symbols = (password.match(/[^a-zA-Z0-9]/g) || []).length;

    if (lowercase < minLowercase) {
      this.failedRule = 'password.minLowercase';
      return false;
    }

    if (uppercase < minUppercase) {
      this.failedRule = 'password.minUppercase';
      return false;
    }

    if (numbers < minNumbers) {
      this.failedRule = 'password.minNumbers';
      return false;
    }

    if (symbols < minSymbols) {
      this.failedRule = 'password.minSymbols';
      return false;
    }

    return true;
    } catch (error) {
      console.warn('[IsStrongPasswordWithSettingsConstraint] Error getting SettingService:', error);
      return true; // Allow if service is not available
    }
  }

  defaultMessage(): string {
    const locale = getLocaleFromContext();
    
    if (this.failedRule && this.settings) {
      const minLength = this.settings.setting['password-min-length'] || 6;
      const minLowercase = this.settings.setting['password-min-lowercase'] || 0;
      const minUppercase = this.settings.setting['password-min-uppercase'] || 0;
      const minNumbers = this.settings.setting['password-min-numbers'] || 0;
      const minSymbols = this.settings.setting['password-min-symbols'] || 0;

      const replacements: Record<string, string> = {
        '{minLength}': String(minLength),
        '{minLowercase}': String(minLowercase),
        '{minUppercase}': String(minUppercase),
        '{minNumbers}': String(minNumbers),
        '{minSymbols}': String(minSymbols),
      };

      let message = getLocaleText(
        this.failedRule,
        locale,
        'Password does not meet the security requirements.'
      );

      // Replace placeholders
      Object.entries(replacements).forEach(([placeholder, value]) => {
        message = message.replace(new RegExp(placeholder, 'g'), value);
      });

      return message;
    }

    return getLocaleText(
      'password.weakPassword',
      locale,
      'Password does not meet the security requirements defined in system settings.'
    );
  }
}

export function IsStrongPasswordWithSettings(
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordWithSettingsConstraint,
    });
  };
}
