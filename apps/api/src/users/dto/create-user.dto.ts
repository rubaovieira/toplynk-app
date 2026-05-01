import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  username?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
