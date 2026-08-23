const request = require('supertest');
const app = require('../server');

describe('GestCom API - Auth', () => {
  const userData = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123'
  };

  it('should respond to GET /api', async () => {
    const res = await request(app).get('/api');

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      message: 'API GestCom - Backend opérationnel'
    });
  });

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(userData);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      name: userData.name,
      email: userData.email,
      role: 'caissier'
    });
    expect(res.body.data.token).toBeDefined();
  });

  it('should not register with duplicate email', async () => {
    await request(app).post('/api/auth/register').send(userData);

    const res = await request(app)
      .post('/api/auth/register')
      .send(userData);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Cet email est déjà utilisé');
  });

  it('should log in with correct credentials', async () => {
    await request(app).post('/api/auth/register').send(userData);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: userData.email, password: userData.password });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('should reject login with wrong password', async () => {
    await request(app).post('/api/auth/register').send(userData);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: userData.email, password: 'badpassword' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Email ou mot de passe incorrect');
  });

  it('should protect GET /api/auth/me without token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return profile with valid token', async () => {
    await request(app).post('/api/auth/register').send(userData);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: userData.email, password: userData.password });

    const token = loginRes.body.data.token;
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.statusCode).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data).toMatchObject({
      name: userData.name,
      email: userData.email
    });
  });
});
