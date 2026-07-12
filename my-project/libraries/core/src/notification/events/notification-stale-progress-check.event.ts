export const NOTIFICATION_STALE_PROGRESS_CHECK = 'notification.stale-progress-check';

export class NotificationStaleProgressCheckEvent {
  constructor(public readonly userId: number) {}
}
