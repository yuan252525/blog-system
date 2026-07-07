import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMomentDto {
  @IsString()
  @MaxLength(2000)
  content!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(2000, { each: true })
  images?: string[];
}

export class CommentMomentDto {
  @IsString()
  @MaxLength(1000)
  content!: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsUUID()
  replyToUserId?: string;
}

export class QueryMomentsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
