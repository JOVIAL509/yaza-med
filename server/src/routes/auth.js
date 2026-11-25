import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { User, PendingRegistration, PendingPasswordReset } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { sendVerificationCode, sendPasswordResetCode } from '../services/email.js';

const router = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const codeLifetimeMs = 10 * 60 * 1000;
const resendDelayMs = 60 * 1000;
const resendWindowMs = 60 * 60 * 1000;
const maxSendsPerWindow = 5;
const maxCodeAttempts = 5;
const emailFlowLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many verification requests. Please wait a few minutes and try again.' }
});

const session = user => ({
  token: jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' }),
  user: { id: user.id, name: user.name, email: user.email, role: user.role }
});
const normalizeEmail = value => String(value || '').trim().toLowerCase();
const hashCode = (email, code) => createHmac('sha256', process.env.EMAIL_OTP_SECRET || process.env.JWT_SECRET).update(`${email}:${code}`).digest('hex');
const matchesCode = (email, code, expected) => {
  const actual = Buffer.from(hashCode(email, code), 'hex');
  const stored = Buffer.from(expected, 'hex');
  return actual.length === stored.length && timingSafeEqual(actual, stored);
};
const newCode = () => randomInt(0, 1_000_000).toString().padStart(6, '0');
const emailResponse = pending => ({
  message: 'A verification code has been sent to your email address.',
  email: pending.email,
  expiresAt: pending.expiresAt,
  resendAvailableAt: pending.resendAvailableAt
});

async function issueVerificationCode(pending, { initial = false } = {}) {
  const now = new Date();
  if (!initial && pending.resendAvailableAt > now) {
    const error = new Error('Please wait before requesting another code.');
    error.status = 429;
    error.retryAfterSeconds = Math.ceil((pending.resendAvailableAt - now) / 1000);
    throw error;
  }
  if (now - pending.sendWindowStartedAt >= resendWindowMs) {
    pending.sendWindowStartedAt = now;
    pending.sendCount = 0;
  }
  if (pending.sendCount >= maxSendsPerWindow) {
    const error = new Error('You have requested too many codes. Try again in an hour.');
    error.status = 429;
    throw error;
  }

  const code = newCode();
  pending.codeHash = hashCode(pending.email, code);
  pending.expiresAt = new Date(now.getTime() + codeLifetimeMs);
  pending.resendAvailableAt = new Date(now.getTime() + resendDelayMs);
  pending.attempts = 0;
  pending.sendCount += 1;
  await pending.save();
  try {
    await sendVerificationCode({ email: pending.email, firstName: pending.firstName, code, expiresMinutes: 10 });
  } catch (error) {
    pending.resendAvailableAt = new Date();
    await pending.save().catch(() => {});
    if (!error.status) {
      error.status = 502;
      error.message = 'We could not send the verification email. Check the SMTP settings in server/.env and try again.';
    }
    throw error;
  }
  return pending;
}

router.post('/register', emailFlowLimiter, async (req, res, next) => {
  try {
    const firstName = String(req.body?.firstName || '').trim();
    const lastName = String(req.body?.lastName || '').trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const phone = String(req.body?.phone || '').trim();
    const gender = ['female', 'male', 'other', 'prefer-not-to-say'].includes(req.body?.gender) ? req.body.gender : '';

    if (!firstName || firstName.length > 60 || !lastName || lastName.length > 60 || !emailPattern.test(email) || password.length < 8 || password.length > 128 || phone.length > 30) {
      return res.status(400).json({ message: 'Enter your first and last name, a valid email, and a password between 8 and 128 characters.' });
    }
    if (await User.exists({ email })) return res.status(409).json({ message: 'An account with this email already exists. Please sign in.' });

    let pending = await PendingRegistration.findOne({ email });
    if (pending && pending.resendAvailableAt > new Date()) {
      const waitSeconds = Math.ceil((pending.resendAvailableAt - new Date()) / 1000);
      return res.status(429).json({ message: `A code was just sent. Wait ${waitSeconds} seconds before trying again.` });
    }
    if (!pending) {
      pending = new PendingRegistration({
        firstName, lastName, phone, gender, email,
        passwordHash: await bcrypt.hash(password, 12),
        codeHash: hashCode(email, '000000'),
        expiresAt: new Date(Date.now() + codeLifetimeMs),
        resendAvailableAt: new Date(0),
        sendWindowStartedAt: new Date(),
        sendCount: 0,
        attempts: 0
      });
    } else {
      pending.firstName = firstName;
      pending.lastName = lastName;
      pending.phone = phone;
      pending.gender = gender;
      pending.passwordHash = await bcrypt.hash(password, 12);
    }
    await issueVerificationCode(pending, { initial: pending.sendCount === 0 });
    res.status(202).json(emailResponse(pending));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'An account with this email already exists. Please sign in.' });
    next(error);
  }
});

router.post('/verify-email', emailFlowLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code || '').trim();
    if (!emailPattern.test(email) || !/^\d{6}$/.test(code)) return res.status(400).json({ message: 'Enter the six-digit code sent to your email.' });

    const pending = await PendingRegistration.findOne({ email });
    if (!pending) return res.status(404).json({ message: 'This verification request has expired. Please submit the signup form again.' });
    if (pending.expiresAt <= new Date()) {
      await pending.deleteOne();
      return res.status(410).json({ message: 'This code has expired. Please submit the signup form again.' });
    }
    if (pending.attempts >= maxCodeAttempts) return res.status(429).json({ message: 'Too many incorrect codes. Request a new code to continue.' });
    if (!matchesCode(email, code, pending.codeHash)) {
      pending.attempts += 1;
      await pending.save();
      return res.status(400).json({ message: `That code is incorrect. ${maxCodeAttempts - pending.attempts} attempts remaining.` });
    }

    const user = await User.create({
      name: `${pending.firstName} ${pending.lastName}`.trim(),
      firstName: pending.firstName,
      lastName: pending.lastName,
      phone: pending.phone,
      gender: pending.gender,
      email: pending.email,
      emailVerified: true,
      passwordHash: pending.passwordHash
    });
    await pending.deleteOne();
    res.status(201).json(session(user));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'An account with this email already exists. Please sign in.' });
    next(error);
  }
});

router.post('/resend-verification', emailFlowLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!emailPattern.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    const pending = await PendingRegistration.findOne({ email });
    if (!pending) return res.status(404).json({ message: 'Signup details not found or already verified. Submit the signup form again if needed.' });
    if (pending.expiresAt <= new Date()) {
      await pending.deleteOne();
      return res.status(410).json({ message: 'This signup expired. Please submit the signup form again.' });
    }
    await issueVerificationCode(pending);
    res.json(emailResponse(pending));
  } catch (error) { next(error); }
});

async function issuePasswordResetCode(pending, user, { initial = false } = {}) {
  const now = new Date();
  if (!initial && pending.resendAvailableAt > now) {
    const error = new Error('Please wait before requesting another code.');
    error.status = 429;
    throw error;
  }
  if (now - pending.sendWindowStartedAt >= resendWindowMs) {
    pending.sendWindowStartedAt = now;
    pending.sendCount = 0;
  }
  if (pending.sendCount >= maxSendsPerWindow) {
    const error = new Error('You have requested too many reset codes. Try again in an hour.');
    error.status = 429;
    throw error;
  }

  const code = newCode();
  pending.codeHash = hashCode(pending.email, code);
  pending.expiresAt = new Date(now.getTime() + codeLifetimeMs);
  pending.resendAvailableAt = new Date(now.getTime() + resendDelayMs);
  pending.attempts = 0;
  pending.sendCount += 1;
  await pending.save();
  try {
    await sendPasswordResetCode({
      email: pending.email,
      firstName: user.firstName || user.name?.split(' ')[0],
      code,
      expiresMinutes: 10
    });
  } catch (error) {
    pending.resendAvailableAt = new Date();
    await pending.save().catch(() => {});
    if (!error.status) {
      error.status = 502;
      error.message = 'We could not send the reset email. Check the SMTP settings in server/.env and try again.';
    }
    throw error;
  }
  return pending;
}

router.post('/forgot-password', emailFlowLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!emailPattern.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });

    const user = await User.findOne({ email, active: true });
    if (user) {
      let pending = await PendingPasswordReset.findOne({ email });
      const now = new Date();
      if (pending?.resendAvailableAt > now) {
        return res.status(429).json({ message: `A reset code was just sent. Wait ${Math.ceil((pending.resendAvailableAt - now) / 1000)} seconds before trying again.` });
      }
      if (!pending) {
        pending = new PendingPasswordReset({
          email,
          codeHash: hashCode(email, '000000'),
          expiresAt: new Date(now.getTime() + codeLifetimeMs),
          resendAvailableAt: new Date(0),
          sendWindowStartedAt: now,
          sendCount: 0,
          attempts: 0
        });
      }
      await issuePasswordResetCode(pending, user, { initial: pending.sendCount === 0 });
    }

    res.status(202).json({
      message: 'If an account exists for this email, a password reset code has been sent.',
      email
    });
  } catch (error) { next(error); }
});

router.post('/resend-password-reset', emailFlowLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!emailPattern.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    const pending = await PendingPasswordReset.findOne({ email });
    if (!pending) return res.status(404).json({ message: 'No password reset request was found. Please request a new code.' });
    if (pending.expiresAt <= new Date()) {
      await pending.deleteOne();
      return res.status(410).json({ message: 'This reset code has expired. Please request a new one.' });
    }
    const user = await User.findOne({ email, active: true });
    if (!user) return res.status(404).json({ message: 'No password reset request was found. Please request a new code.' });
    await issuePasswordResetCode(pending, user);
    res.json({
      message: 'A new password reset code has been sent.',
      email,
      expiresAt: pending.expiresAt,
      resendAvailableAt: pending.resendAvailableAt
    });
  } catch (error) { next(error); }
});

router.post('/reset-password', emailFlowLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code || '').trim();
    const password = String(req.body?.password || '');
    if (!emailPattern.test(email) || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: 'Enter your email and the six-digit reset code.' });
    }
    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({ message: 'Your new password must be between 8 and 128 characters.' });
    }

    const pending = await PendingPasswordReset.findOne({ email });
    if (!pending) return res.status(404).json({ message: 'This reset request expired. Please request a new code.' });
    if (pending.expiresAt <= new Date()) {
      await pending.deleteOne();
      return res.status(410).json({ message: 'This reset code has expired. Please request a new one.' });
    }
    if (pending.attempts >= maxCodeAttempts) return res.status(429).json({ message: 'Too many incorrect codes. Request a new code to continue.' });
    if (!matchesCode(email, code, pending.codeHash)) {
      pending.attempts += 1;
      await pending.save();
      return res.status(400).json({ message: `That code is incorrect. ${maxCodeAttempts - pending.attempts} attempts remaining.` });
    }

    const user = await User.findOne({ email, active: true });
    if (!user) {
      await pending.deleteOne();
      return res.status(404).json({ message: 'This account is no longer available.' });
    }
    user.passwordHash = await bcrypt.hash(password, 12);
    await user.save();
    await pending.deleteOne();
    res.json({ message: 'Your password has been reset. You can now sign in.' });
  } catch (error) { next(error); }
});

router.post('/login', async (req, res, next) => {
  try {
    const user = await User.findOne({ email: normalizeEmail(req.body?.email), active: true });
    if (!user || !await bcrypt.compare(req.body?.password || '', user.passwordHash)) return res.status(401).json({ message: 'Email or password is incorrect.' });
    if (user.emailVerified === false) return res.status(403).json({ message: 'Please verify your email before signing in.' });
    res.json(session(user));
  } catch (error) { next(error); }
});

router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));
export default router;
