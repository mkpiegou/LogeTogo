import { Router } from 'express';
import { AuthController } from './auth.controller';

const router = Router();
const controller = new AuthController();

router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/verify-email', controller.verifyEmail);
router.post('/resend-verification', controller.resendVerification);

export default router;
