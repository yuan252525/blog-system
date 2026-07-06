import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: '用户名', example: 'zhangsan', minLength: 3, maxLength: 30 })
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers and underscores' })
  username!: string;

  @ApiProperty({ description: '邮箱', example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: '密码', example: '123456', minLength: 6, maxLength: 100 })
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password!: string;
}

export class LoginDto {
  @ApiProperty({ description: '邮箱', example: 'admin@blog.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: '密码', example: 'admin123' })
  @IsString()
  password!: string;
}

export class UpdateProfileDto {
  @ApiProperty({ description: '用户名', required: false })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username?: string;

  @ApiProperty({ description: '头像 URL', required: false })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ description: '个人简介', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}
