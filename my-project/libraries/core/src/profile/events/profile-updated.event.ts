export const PROFILE_UPDATED = 'profile.updated';

export class ProfileUpdatedEvent {
  constructor(
    public readonly userId: number,
    public readonly name: string,
  ) {}
}
