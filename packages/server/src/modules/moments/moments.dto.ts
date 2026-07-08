import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  IsInt,
  Min,
  Max,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 按 Unicode 码点（而非 UTF-16 单元）计算长度。
 * 一个 emoji（如 😀）在 JS 字符串中占 2 个 UTF-16 单元，
 * 用默认 @MaxLength 会被算成 2 个字符，导致误判超长。
 */
@ValidatorConstraint({ name: 'maxCodePoints', async: false })
export class MaxCodePointsConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== 'string') return true;
    const max = (args.constraints[0] as number) ?? 2000;
    return [...value].length <= max;
  }

  defaultMessage(args: ValidationArguments): string {
    const max = (args.constraints[0] as number) ?? 2000;
    return `内容不能超过 ${max} 个字符`;
  }
}

/** 以码点为单位的长度上限（emoji 计为 1 个字符） */
export function MaxCodePoints(max: number) {
  return Validate(MaxCodePointsConstraint, [max]);
}

export class CreateMomentDto {
  @IsString()
  @MaxCodePoints(2000)
  content!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(2000, { each: true })
  images?: string[];
}

export class CommentMomentDto {
  @IsString()
  @MaxCodePoints(1000)
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
