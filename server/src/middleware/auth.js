import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
export async function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ message: 'Please sign in to continue.' });
    const { sub } = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findOne({ _id: sub, active: true }).select('-passwordHash');
    if (!req.user) return res.status(401).json({ message: 'Your session is no longer active.' });
    next();
  } catch { res.status(401).json({ message: 'Your session has expired. Please sign in again.' }); }
}
export const adminOnly = (req, res, next) => req.user?.role === 'admin' ? next() : res.status(403).json({ message: 'Administrator access required.' });
