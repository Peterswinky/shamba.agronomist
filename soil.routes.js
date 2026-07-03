const request = require('supertest');
const app = require('../index');
const prisma = require('../config/prisma');

// Requires a running test DATABASE_URL (see .env.test). Run: npm test

const testPhone = '0712345678';

afterAll(async () => {
  await prisma.user.deleteMany({ where: { phone: testPhone } });
  await prisma.$disconnect();
});

describe('Auth flow', () => {
  it('registers a new farmer', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test Farmer',
      phone: testPhone,
      password: 'securepass123',
      role: 'FARMER',
      county: 'Nakuru',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects duplicate registration', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test Farmer',
      phone: testPhone,
      password: 'securepass123',
      role: 'FARMER',
    });
    expect(res.status).toBe(409);
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      phone: testPhone,
      password: 'securepass123',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('rejects login with wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      phone: testPhone,
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });
});
