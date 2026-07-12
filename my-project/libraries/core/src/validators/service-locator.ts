import { SettingService } from '../setting/setting.service';

/**
 * Service locator for validators that can't use dependency injection
 * This is set up during application bootstrap
 */
export class ValidatorServiceLocator {
  private static settingService: SettingService;

  static setSettingService(service: SettingService): void {
    this.settingService = service;
  }

  static getSettingService(): SettingService {
    if (!this.settingService) {
      throw new Error('SettingService not initialized in ValidatorServiceLocator');
    }
    return this.settingService;
  }
}
