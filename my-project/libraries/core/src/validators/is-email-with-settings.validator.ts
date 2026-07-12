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
export class IsEmailWithSettingsConstraint
  implements ValidatorConstraintInterface
{

  async validate(email: string, args: ValidationArguments): Promise<boolean> {
    if (!email) {
      return false;
    }

    // Validate email format (basic regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return false;
    }

    // Extract domain from email
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) {
      return false;
    }

    try {
      const settingService = ValidatorServiceLocator.getSettingService();
      const settings = await settingService.getSystemSettings();
    const blacklist = settings.setting['email-host-blacklist'] || [];
    const whitelist = settings.setting['email-host-whitelist'] || [];

    // blacklist e whitelist já são arrays
    const blacklistHosts = Array.isArray(blacklist)
      ? blacklist.map((host: string) => host.trim().toLowerCase()).filter((host: string) => host.length > 0)
      : [];

    const whitelistHosts = Array.isArray(whitelist)
      ? whitelist.map((host: string) => host.trim().toLowerCase()).filter((host: string) => host.length > 0)
      : [];

    // If whitelist is defined and not empty, domain must be in whitelist
    if (whitelistHosts.length > 0) {
      return whitelistHosts.includes(domain);
    }

    // If blacklist is defined, domain must not be in blacklist
    if (blacklistHosts.length > 0) {
      return !blacklistHosts.includes(domain);
    }

    // No restrictions, email is valid
    return true;
    } catch (error) {
      console.warn('[IsEmailWithSettingsConstraint] Error getting SettingService:', error);
      return true; // Allow if service is not available
    }
  }

  defaultMessage(): string {
    return getLocaleText(
      'email.invalidEmail',
      getLocaleFromContext(),
      'Email does not meet the security requirements defined in system settings.'
    );
  }
}

export function IsEmailWithSettings(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsEmailWithSettingsConstraint,
    });
  };
}
