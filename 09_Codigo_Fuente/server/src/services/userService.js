import { db, uid, now } from '../db.js';
import { fail, logEvent, hashPassword } from '../middleware.js';

const pubUser = u => ({ id: u.id, username: u.username, name: u.name, role: u.role, created: u.created });

export const UserService = {
  list(){
    const users = db.prepare('SELECT * FROM users ORDER BY created ASC').all();
    const counts = db.prepare('SELECT ownerId, COUNT(*) AS n FROM docs GROUP BY ownerId').all();
    const m = Object.fromEntries(counts.map(c => [c.ownerId, c.n]));
    return users.map(u => ({ ...pubUser(u), docs: m[u.id] || 0 }));
  },
  setRole(actor, userId, role){
    if (!['admin', 'analista'].includes(role)) fail('VAL', 'Rol no válido.');
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!u) fail('VAL', 'Usuario no encontrado.');
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
    logEvent('INFO', 'Usuarios', `Rol de "${u.username}" actualizado a ${role}.`, actor.username);
  },
  delete(actor, userId){
    if (userId === actor.id) fail('VAL', 'No puede eliminar su propia cuenta.');
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!u) fail('VAL', 'Usuario no encontrado.');
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    db.prepare('DELETE FROM sessions WHERE userId = ?').run(userId);
    logEvent('WARN', 'Usuarios', `Usuario "${u.username}" eliminado; sus documentos permanecen en el repositorio.`, actor.username);
  },
  resetPassword(userId, newPassword){
    if (!newPassword || newPassword.length < 6) fail('VAL', 'La contraseña debe tener al menos 6 caracteres.');
    const salt = uid();
    db.prepare('UPDATE users SET salt = ?, hash = ? WHERE id = ?')
      .run(salt, hashPassword(newPassword, salt), userId);
  }
};