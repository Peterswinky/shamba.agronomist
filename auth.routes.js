const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');
const { logAction } = require('./history.service');

const SALT_ROUNDS = 12;

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, phone: user.phone },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function sanitize(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

async function register({ name, phone, email, password, role, location, county }) {
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    const err = new Error('An account with this phone number already exists');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { name, phone, email, passwordHash, role, location, county },
  });

  await logAction(user.id, 'REGISTER', { role });
  const token = signToken(user);
  return { user: sanitize(user), token };
}

async function login({ phone, password }) {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    const err = new Error('Invalid phone number or password');
    err.status = 401;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const err = new Error('Invalid phone number or password');
    err.status = 401;
    throw err;
  }

  await logAction(user.id, 'LOGIN', {});
  const token = signToken(user);
  return { user: sanitize(user), token };
}

module.exports = { register, login, sanitize };
