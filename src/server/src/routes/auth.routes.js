import { Router } from 'express';
import { AuthService } from '../services/authService.js';
import { authRequired, asyncWrap, ok } from '../middleware.js';

export const authRoutes = Router();

authRoutes.post('/register', asyncWrap((req, res) => {
  const { username, name, password } = req.body || {};
  ok(res, AuthService.register(username, name, password), 201);
}));

authRoutes.post('/login', asyncWrap((req, res) => {
  const { username, password } = req.body || {};
  ok(res, AuthService.login(username, password));
}));

authRoutes.post('/logout', authRequired, asyncWrap((req, res) => {
  AuthService.logout(req.token);
  ok(res, { message: 'Sesión cerrada' });
}));

authRoutes.get('/me', authRequired, asyncWrap((req, res) => {
  ok(res, AuthService.me(req.user));
}));