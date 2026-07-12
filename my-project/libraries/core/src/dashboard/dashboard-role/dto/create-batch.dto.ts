import { ArrayNotEmpty, IsArray, IsInt } from 'class-validator';

export class CreateDashboardRoleBatchDTO {
  @IsInt()
  dashboard_id: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  role_ids: number[];
}