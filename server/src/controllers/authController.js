import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import { signAccessToken, signRefreshToken } from '../middleware/auth.js';
import { sendEmail } from '../services/emailService.js';
import { logAction } from '../services/auditService.js';
import jwt from 'jsonwebtoken';

function publicUser(u) {
  const { passwordHash, refreshTokenHash, resetPasswordTokenHash, resetPasswordExpires, ...rest } = u.toObject();
  return rest;
}

export async function register(req, res, next) {
  try {
    const { name, email, password, role, city, phone } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'An account with this email already exists' });

    // Role is accepted only as 'attendee' or 'organizer' at signup - admin
    // accounts can never be self-registered.
    const safeRole = role === 'organizer' ? 'organizer' : 'attendee';
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, role: safeRole, city, phone });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await user.save();

    await sendEmail({ to: email, subject: 'Welcome to SmartEvent Nepal', text: `Hi ${name}, your account has been created.` });
    await logAction({ actor: user._id, actorRole: user.role, action: 'USER_REGISTERED', targetType: 'User', targetId: user._id });

    res.status(201).json({ user: publicUser(user), accessToken, refreshToken });
  } catch (err) { next(err); }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });
    if (user.status === 'suspended') return res.status(403).json({ message: 'This account has been suspended' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid email or password' });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await user.save();

    res.json({ user: publicUser(user), accessToken, refreshToken });
  } catch (err) { next(err); }
}

export async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'refreshToken is required' });
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || !user.refreshTokenHash) return res.status(401).json({ message: 'Invalid refresh token' });
    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches) return res.status(401).json({ message: 'Invalid refresh token' });

    const accessToken = signAccessToken(user);
    res.json({ accessToken });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
}

export async function logout(req, res, next) {
  try {
    req.user.refreshTokenHash = null;
    await req.user.save();
    res.json({ message: 'Logged out' });
  } catch (err) { next(err); }
}

export async function me(req, res) {
  res.json({ user: req.user });
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    // Always respond the same way to avoid leaking which emails are registered
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;
    await sendEmail({ to: email, subject: 'Reset your SmartEvent Nepal password', text: `Reset your password: ${resetUrl}` });

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) { next(err); }
}

export async function resetPassword(req, res, next) {
  try {
    const { email, token, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.resetPasswordTokenHash || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    if (tokenHash !== user.resetPasswordTokenHash) return res.status(400).json({ message: 'Invalid or expired reset token' });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpires = null;
    user.refreshTokenHash = null; // force re-login everywhere
    await user.save();

    res.json({ message: 'Password reset successful. Please log in.' });
  } catch (err) { next(err); }
}

export async function updateProfile(req, res, next) {
  try {
    const { name, phone, city, interests, organizerProfile } = req.body;
    if (name !== undefined) req.user.name = name;
    if (phone !== undefined) req.user.phone = phone;
    if (city !== undefined) req.user.city = city;
    if (interests !== undefined) req.user.interests = interests;
    if (organizerProfile !== undefined && req.user.role === 'organizer') {
      req.user.organizerProfile = { ...req.user.organizerProfile?.toObject?.(), ...organizerProfile };
    }
    await req.user.save();
    res.json({ user: req.user });
  } catch (err) { next(err); }
}
