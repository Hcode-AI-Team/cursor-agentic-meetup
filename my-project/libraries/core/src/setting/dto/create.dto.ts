import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, ValidationArguments } from 'class-validator';

export class CreateDTO {
  @IsString({ message: (args: ValidationArguments) => `${args.property} must be a string` })
  @Length(0, 255, { message: (args: ValidationArguments) => `${args.property} must be at most 255 characters long` })
  slug: string;

  @IsString({ message: (args: ValidationArguments) => `${args.property} must be a string` })
  @IsIn(['string', 'array', 'number', 'boolean', 'json', 'secret'], { 
    message: (args: ValidationArguments) => `${args.property} must be one of: string, array, number, boolean, json, secret` 
  })
  type: string;

  @IsOptional()
  @IsString({ message: (args: ValidationArguments) => `${args.property} must be a string` })
  @IsIn(['input-text', 'input-number', 'input-secret', 'input-file', 'input-tags', 'combobox', 'radio', 'color-picker', 'switch', 'checkbox'], { 
    message: (args: ValidationArguments) => `${args.property} must be one of: input-text, input-number, input-secret, input-file, input-tags, combobox, radio, color-picker, switch, checkbox` 
  })
  component: string;

  @IsString({ message: (args: ValidationArguments) => `${args.property} must be a string` })
  @Length(0, 1023, { message: (args: ValidationArguments) => `${args.property} must be at most 1023 characters long` })
  value: string;

  @IsBoolean({ message: (args: ValidationArguments) => `${args.property} must be a boolean` })
  user_override: boolean;

  @IsInt({ message: (args: ValidationArguments) => `${args.property} must be an integer` })
  group_id: number;
}
