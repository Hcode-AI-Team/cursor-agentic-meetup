export const PROFILE_AVATAR_UPDATED = 'profile.avatar_updated';

export class ProfileAvatarUpdatedEvent {
  constructor(
    public readonly userId: number,
    public readonly fileId: number | null,
  ) {}
}
