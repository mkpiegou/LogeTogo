import { Controller, Post, Body, Req, Ip, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request } from 'express';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Inscription utilisateur
   */
  @Post('register')
  async register(@Body() body: { email: string; password: string; fullName: string }, @Ip() ip: string) {
    try {
      return await this.authService.register({ ...body, ip });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Connexion utilisateur
   */
  @Post('login')
  async login(@Body() body: { email: string; password: string; fingerprint: string }, @Ip() ip: string) {
    try {
      return await this.authService.login({ ...body, ip });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Vérification email
   */
  @Post('verify-email')
  async verifyEmail(@Body() body: { email: string; token: string }) {
    try {
      return await this.authService.verifyEmail(body);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Renvoi email de vérification
   */
  @Post('resend-verification')
  async resendVerification(@Body('email') email: string) {
    try {
      return await this.authService.resendVerification(email);
    } catch (error) {
      throw error;
    }
  }
}
