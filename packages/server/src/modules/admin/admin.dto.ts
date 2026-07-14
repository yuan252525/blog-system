import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsIn(['USER', 'ADMIN'])
  role?: 'USER' | 'ADMIN';

  @IsOptional()
  @IsIn(['ACTIVE', 'BANNED'])
  status?: 'ACTIVE' | 'BANNED';
}

export class AdminCategoryDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class AdminTagDto {
  @IsString()
  name!: string;
}

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  siteTitle?: string;

  @IsOptional()
  @IsString()
  siteDescription?: string;

  @IsOptional()
  @IsString()
  siteKeywords?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  postsPerPage?: string;
}
