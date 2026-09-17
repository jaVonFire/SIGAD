import { db, uid, now } from '../db.js';
import { hashPassword, hashToken, newToken, fail, logEvent } from '../middleware.js';
import { config } from '../config.js';

const pubUser = u => ({ id: u.id, username: u.username, name: u.name, role: u.role, created: u.created });

export const AuthService = {
  register(username, name, password){
    username = String(username || '').trim().toLowerCase();
    if (!name || name.trim().length < 3) fail('VAL', 'Escriba su nombre completo.');
    if (username.length < 3) fail('VAL', 'El usuario debe tener al menos 3 caracteres.');
    if (!password || password.length < 6) fail('VAL', 'La contraseña debe tener al menos 6 caracteres.');
    if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) fail('VAL', 'Ese nombre de usuario ya existe.');
    const salt = uid();
    const u = {
      id: uid(), username, name: name.trim(), role: 'analista',
      salt, hash: hashPassword(password, salt), created: now()
    };
    db.prepare('INSERT INTO users (id, username, name, role, salt, hash, created) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(u.id, u.username, u.name, u.role, u.salt, u.hash, u.created);
    logEvent('INFO', 'Autenticación', `Nueva cuenta registrada: ${u.username} (analista).`, u.username);
    const token = newToken();
    this._createSession(token, u.id);
    return { user: pubUser(u), token };
  },

  login(username, password){
    const u = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username || '').trim().toLowerCase());
    if (!u || u.hash !== hashPassword(password, u.salt)) fail('AUTH', 'Usuario o contraseña incorrectos.', 401);
    const token = newToken();
    this._createSession(token, u.id);
    logEvent('INFO', 'Autenticación', `Inicio de sesión: ${u.username} (${u.role}).`, u.username);
    return { user: pubUser(u), token };
  },

  logout(token){
    db.prepare('DELETE FROM sessions WHERE tokenHash = ?').run(hashToken(token));
  },

  me(reqUser){
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(reqUser.id);
    if (!u) fail('AUTH', 'Usuario no encontrado.', 401);
    return pubUser(u);
  },

  _createSession(token, userId){
    const ttl = config.sessionTtlDays * 24 * 3600 * 1000;
    db.prepare('INSERT INTO sessions (tokenHash, userId, created, expires) VALUES (?, ?, ?, ?)')
      .run(hashToken(token), userId, now(), now() + ttl);
  }
};