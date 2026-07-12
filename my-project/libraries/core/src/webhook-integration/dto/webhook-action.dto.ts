import { Transform } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsInt, IsObject, IsOptional, IsString } from 'class-validator';

const toNullableInteger = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return Number(value);
};

const toOptionalTrimmedString = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  return String(value).trim();
};

export class CreateWebhookActionDTO {
  @IsIn([
    'email',
    'whatsapp_evolution',
    'http_request',
    'internal_api',
    'app_command',
  ])
  type:
    | 'email'
    | 'whatsapp_evolution'
    | 'http_request'
    | 'internal_api'
    | 'app_command';

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  name?: string;

  @IsOptional()
  @Transform(toNullableInteger)
  @IsInt()
  order?: number;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @IsOptional()
  @Transform(toNullableInteger)
  @IsInt()
  integration_profile_id?: number;

  @IsOptional()
  @Transform(toNullableInteger)
  @IsInt()
  mail_id?: number;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  email_to?: string;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  email_cc?: string;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  email_bcc?: string;

  @IsOptional()
  @IsIn(['phone', 'group'])
  whatsapp_target_type?: 'phone' | 'group';

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  whatsapp_target?: string;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  whatsapp_template?: string;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  whatsapp_instance?: string;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  whatsapp_base_url?: string;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  whatsapp_token?: string;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  http_url?: string;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  http_method?: string;

  @IsOptional()
  @IsObject()
  http_headers?: Record<string, string>;

  @IsOptional()
  @IsObject()
  http_query?: Record<string, string>;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  http_body?: string;

  @IsOptional()
  @Transform(toNullableInteger)
  @IsInt()
  http_timeout_ms?: number;

  @IsOptional()
  @Transform(toNullableInteger)
  @IsInt()
  http_retry_count?: number;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  internal_api_path?: string;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  internal_api_method?: string;

  @IsOptional()
  @IsObject()
  internal_api_query?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  internal_api_body?: Record<string, unknown>;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  internal_api_token?: string;

  @IsOptional()
  @Transform(toNullableInteger)
  @IsInt()
  internal_api_user_id?: number;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  app_command_slug?: string;

  @IsOptional()
  @IsObject()
  app_command_params?: Record<string, unknown>;
}

export class UpdateWebhookActionDTO extends PartialType(
  CreateWebhookActionDTO,
) {}