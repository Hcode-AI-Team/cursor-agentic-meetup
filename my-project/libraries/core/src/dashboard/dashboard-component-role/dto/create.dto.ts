import { IsInt } from 'class-validator';

export class CreateDashboardComponentRoleDTO {
  @IsInt()
  component_id: number;

  @IsInt()
  role_id: number;
}
