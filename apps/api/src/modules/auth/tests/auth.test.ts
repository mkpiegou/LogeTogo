import { AuthService } from '../auth.service';
import { PrismaService } from '../../../plugins/prisma';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwt: JwtService;
  let config: ConfigService;
  let mailer: MailerService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      }
    } as any;
    jwt = { sign: jest.fn(() => 'jwt-token') } as any;
    config = { get: jest.fn(() => 'private-key') } as any;
    mailer = { sendMail: jest.fn() } as any;
    service = new AuthService(prisma, jwt, config, mailer);
  });

  it('register: crée un utilisateur et envoie un email', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'user1', email: 'test@mail.com', fullName: 'Test', isVerified: false
    });
    (mailer.sendMail as jest.Mock).mockResolvedValue(true);
    const result = await service.register({ email: 'test@mail.com', password: 'password123', fullName: 'Test', ip: '127.0.0.1' });
    expect(result.user.email).toBe('test@mail.com');
  });

  it('login: échoue si utilisateur non trouvé', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(service.login({ email: 'notfound@mail.com', password: 'pass', ip: '127.0.0.1', fingerprint: 'device1' })).rejects.toThrow();
  });

  it('verifyEmail: échoue si token invalide', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ verificationToken: 'abc', isVerified: false, verificationExpires: new Date(Date.now() + 10000) });
    await expect(service.verifyEmail({ email: 'test@mail.com', token: 'wrong' })).rejects.toThrow();
  });

  // Ajoutez d'autres tests pour la rotation des tokens, le rate limiting, etc.
});
