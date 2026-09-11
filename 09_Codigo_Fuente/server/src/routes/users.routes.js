import { Router } from 'express';
import { UserService } from '../services/userService.js';
import { authRequired, adminOnly, asyncWrap, ok, logEvent } from '../middleware.js';

export const usersRoutes = Router();

usersRoutes.use(authRequired, adminOnly);

usersRoutes.get('/', asyncWrap((req, res) => ok(res, UserService.list())));
usersRoutes.patch('/:id/role', asyncWrap((req, res) => {
  UserService.setRole(req.user, req.params.id, req.body.role);
  ok(res, { message: 'Rol actualizado' });
}));
usersRoutes.delete('/:id', asyncWrap((req, res) => {
  UserService.delete(req.user, req.params.id);
  ok(res, { message: 'Usuario eliminado' });
}));
usersRoutes.post('/:id/reset', asyncWrap((req, res) => {
  UserService.resetPassword(req.params.id, req.body?.password || 'sigad2024');
  logEvent('INFO', 'Usuarios', 'Contraseña de usuario restablecida.', req.user.username);
  ok(res, { message: 'Contraseña restablecida' });
}));