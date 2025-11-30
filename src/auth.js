// Simple in-memory auth with static credentials.
// In production, replace with proper user store & hashed passwords.
import crypto from 'crypto';

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'password';

const sessions = new Map(); // token -> { username, issuedAt }

export function login(username, password) {
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = crypto.randomUUID();
    sessions.set(token, { username, issuedAt: Date.now() });
    return { token };
  }
  throw new Error('Invalid credentials');
}

export function authenticateToken(token) {
  if (!token) return null;
  const s = sessions.get(token);
  return s || null;
}

export function requireAuthMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const session = authenticateToken(token);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.session = session;
  next();
}
