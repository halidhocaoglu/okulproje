import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';

export class AdminUpdateUserDto {
  @IsOptional()
  @IsIn(['student', 'moderator', 'school_admin'])
  role?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

