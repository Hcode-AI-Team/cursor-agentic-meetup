import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum NotificationType {
  Info = 'info',
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
  Progress = 'progress',
}

export enum NotificationActionType {
  Url = 'url',
  Sheet = 'sheet',
  Modal = 'modal',
}

export class CreateNotificationDto {
  @IsNumber()
  user_id: number;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsEnum(NotificationActionType)
  action_type?: NotificationActionType;

  @IsOptional()
  @IsObject()
  action_data?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  action_url?: string;

  @IsOptional()
  @IsBoolean()
  auto_remove?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsDateString()
  started_at?: string;
}
