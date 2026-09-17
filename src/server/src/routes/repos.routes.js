import { Router } from 'express';
import { RepoService } from '../services/repoService.js';
import { authRequired, asyncWrap, ok } from '../middleware.js';

export const reposRoutes = Router();

reposRoutes.use(authRequired);

reposRoutes.get('/', asyncWrap((req, res) => ok(res, RepoService.list())));
reposRoutes.post('/', asyncWrap((req, res) => {
  ok(res, RepoService.create(req.user, req.body.name, req.body.desc), 201);
}));
reposRoutes.delete('/:id', asyncWrap((req, res) => {
  RepoService.delete(req.user, req.params.id);
  ok(res, { message: 'Repositorio eliminado' });
}));