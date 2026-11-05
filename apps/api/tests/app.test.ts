import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('TipTable API Base App', () => {
  const app = createApp();

  it('GET / returns 200 with operational metadata', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      name: 'TipTable API',
      version: '0.1.0',
      status: 'operational',
    });
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('preserves incoming x-request-id header', async () => {
    const customId = 'client_custom_req_123';
    const res = await request(app).get('/').set('x-request-id', customId);
    expect(res.headers['x-request-id']).toBe(customId);
  });

  it('returns RFC 7807 problem details for non-existent routes (404)', async () => {
    const res = await request(app).get('/api/v1/invalid-route');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body).toMatchObject({
      type: 'https://tiptable.in/errors/not-found',
      title: 'Not Found',
      status: 404,
      code: 'NOT_FOUND',
      instance: '/api/v1/invalid-route',
    });
    expect(res.body.requestId).toBeDefined();
  });

  it('returns RFC 7807 problem details for malformed JSON payload (400)', async () => {
    const res = await request(app)
      .post('/')
      .set('Content-Type', 'application/json')
      .send('{ invalid-json: ');

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body).toMatchObject({
      type: 'https://tiptable.in/errors/malformed-json',
      title: 'Bad Request',
      status: 400,
      code: 'MALFORMED_JSON',
    });
  });
});
