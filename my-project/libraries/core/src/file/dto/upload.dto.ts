import { getLocaleText } from '@hed-hog/api-locale';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UploadFileDTO {
  @IsString({ message: (args) => getLocaleText('validation.stringRequired', args.value) })
  @IsOptional()
  destination?: string;

  // Optional informational tag for the kind of image being uploaded
  // (e.g. "course-banner", "course-logo", "course-square").
  @IsString()
  @IsOptional()
  imageType?: string;

  // Target dimensions for a precise resize on upload. When provided, the image
  // is resized to fit these bounds before compression/WebP conversion. Sent via
  // multipart form fields, so they arrive as strings and are coerced to numbers.
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8000)
  @IsOptional()
  maxWidth?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8000)
  @IsOptional()
  maxHeight?: number;
}
