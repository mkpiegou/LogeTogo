import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@mail.com' })
  email: string;

  @ApiProperty({ example: 'MotDePasse123!' })
  password: string;

  @ApiProperty({ example: 'John Doe' })
  fullName: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@mail.com' })
  email: string;

  @ApiProperty({ example: 'MotDePasse123!' })
  password: string;

  @ApiProperty({ example: 'device-uuid' })
  fingerprint: string;
}

export class VerifyEmailDto {
  @ApiProperty({ example: 'user@mail.com' })
  email: string;

  @ApiProperty({ example: 'token' })
  token: string;
}
