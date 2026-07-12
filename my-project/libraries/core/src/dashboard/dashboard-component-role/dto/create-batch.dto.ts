import { ArrayNotEmpty, IsArray, IsInt } from 'class-validator';

export class CreateDashboardComponentRoleBatchDTO {
  @IsInt()
  component_id: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  role_ids: number[];
}