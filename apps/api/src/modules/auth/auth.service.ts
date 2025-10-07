import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../../plugins/prisma';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { User, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { z } from 'zod';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { dns } from 'dns/promises';

const logger = new Logger('AuthService');

// Zod schema for registration validation
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2)
});

@Injectable()
export class AuthService {
  private readonly bcryptCost = 12;
  private readonly rateLimiter = new RateLimiterMemory({
    points: 5, // 5 attempts
    duration: 900 // 15 minutes
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService
  ) {}

  /**
   * Register a new user
   */
  async register(data: { email: string; password: string; fullName: string; ip: string }) {
    // Validate input
    const parsed = registerSchema.safeParse(data);
    if (!parsed.success) {
      throw new BadRequestException('Invalid registration data');
    }

    // Email regex + DNS MX check
    await this.validateEmailMX(data.email);

    // Check if user exists
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, this.bcryptCost);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        fullName: data.fullName,
        isVerified: false,
        verificationToken,
        verificationExpires,
        role: Role.USER
      }
    });

    // Send welcome email
    await this.sendWelcomeEmail(user.email, user.fullName, verificationToken);

    // Generate tokens
    const tokens = this.generateTokens(user);

    logger.log(`User registered: ${user.email}`);
    return {
      user: { id: user.id, email: user.email, fullName: user.fullName, isVerified: user.isVerified },
      tokens
    };
  }

  /**
   * Login user
   */
  async login(data: { email: string; password: string; ip: string; fingerprint: string }) {
    // Rate limiting
    await this.rateLimiter.consume(data.ip);

    // Find user
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      logger.warn(`Login failed: user not found (${data.email})`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) {
      logger.warn(`Login failed: invalid password (${data.email})`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check verification
    if (!user.isVerified) {
      throw new UnauthorizedException('Account not verified');
    }

    // Rotate refresh token
    const refreshToken = crypto.randomBytes(64).toString('hex');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

    // Generate tokens
    const tokens = this.generateTokens(user, refreshToken);

    // Log connection
    logger.log(`User login: ${user.email} (IP: ${data.ip}, Device: ${data.fingerprint})`);

    return {
      user: { id: user.id, email: user.email, fullName: user.fullName, isVerified: user.isVerified },
      tokens
    };
  }

  /**
   * Verify email
   */
  async verifyEmail(data: { email: string; token: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.verificationToken) {
      throw new BadRequestException('Invalid verification request');
    }
    if (user.isVerified) {
      throw new BadRequestException('Account already verified');
    }
    if (user.verificationToken !== data.token) {
      throw new BadRequestException('Invalid token');
    }
    if (user.verificationExpires && user.verificationExpires < new Date()) {
      throw new BadRequestException('Token expired');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationExpires: null
      }
    });
    await this.sendConfirmationEmail(user.email, user.fullName);
    logger.log(`User verified: ${user.email}`);
    return { message: 'Email verified successfully' };
  }

  /**
   * Resend verification email
   */
  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (user.isVerified) {
      throw new BadRequestException('Account already verified');
    }
    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { verificationToken, verificationExpires }
    });
    await this.sendWelcomeEmail(user.email, user.fullName, verificationToken);
    logger.log(`Resent verification email: ${user.email}`);
    return { message: 'Verification email resent' };
  }

  /**
   * Generate JWT access and refresh tokens
   */
  generateTokens(user: User, refreshToken?: string) {
    // Use RSA keys for JWT
    const privateKey = this.configService.get<string>('JWT_PRIVATE_KEY');
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role
    };
    const accessToken = this.jwtService.sign(payload, {
      algorithm: 'RS256',
      expiresIn: '15m',
      privateKey
    });
    return {
      accessToken,
      refreshToken: refreshToken || user.refreshToken
    };
  }

  /**
   * Hash password
   */
  async hashPassword(password: string) {
    return bcrypt.hash(password, this.bcryptCost);
  }

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.password);
    return valid ? user : null;
  }

  /**
   * Validate email DNS MX
   */
  async validateEmailMX(email: string) {
    const domain = email.split('@')[1];
    try {
      const mxRecords = await dns.resolveMx(domain);
      if (!mxRecords || mxRecords.length === 0) {
        throw new BadRequestException('Email domain has no MX records');
      }
    } catch (err) {
      throw new BadRequestException('Invalid email domain');
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, fullName: string, token: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Bienvenue sur LogeTogo',
      template: './welcome',
      context: {
        name: fullName,
        token
      }
    });
  }

  /**
   * Send confirmation email
   */
  async sendConfirmationEmail(email: string, fullName: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Votre email est vérifié',
      template: './verified',
      context: {
        name: fullName
      }
    });
  }
}
