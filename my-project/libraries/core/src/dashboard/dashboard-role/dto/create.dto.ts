import { IsInt } from 'class-validator';

export class CreateDashboardRoleDTO {
  @IsInt()
  dashboard_id: number;

  @IsInt()
  role_id: number;
}
