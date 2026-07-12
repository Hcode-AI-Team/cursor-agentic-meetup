export const PROFILE_EMAIL_CHANGED = 'profile.email_changed';

export class ProfileEmailChangedEvent {
  constructor(
    public readonly userId: number,
    public readonly email: string,
  ) {}
}
