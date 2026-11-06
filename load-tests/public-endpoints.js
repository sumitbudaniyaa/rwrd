import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Custom Metrics
const tokenResolutionTrend = new Trend('token_resolution_duration');
const staffDirectoryTrend = new Trend('staff_directory_duration');
const tipIntentTrend = new Trend('tip_intent_duration');
const failureRate = new Rate('custom_failure_rate');

// Test Configuration & Stages
export const options = {
  stages: [
    { duration: '15s', target: 25 }, // Ramp-up to moderate load
    { duration: '30s', target: 100 }, // Peak dinner service load (100 concurrent diners)
    { duration: '15s', target: 150 }, // Stress spike
    { duration: '10s', target: 0 }, // Graceful cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'], // 95% of requests < 200ms, 99% < 500ms
    http_req_failed: ['rate<0.01'], // Error rate < 1%
    checks: ['rate>0.99'], // Assertions pass > 99%
    token_resolution_duration: ['p(95)<150'], // Fast cached token lookup
    staff_directory_duration: ['p(95)<150'],
    tip_intent_duration: ['p(95)<250'], // Decryption & deep link generation
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';
const DEFAULT_TOKEN = __ENV.TEST_TOKEN || 'tok_table_4';
const DEFAULT_RESTAURANT_ID = __ENV.TEST_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111';
const DEFAULT_STAFF_ID = __ENV.TEST_STAFF_ID || '33333333-3333-3333-3333-333333333333';

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'k6-load-tester/1.0',
    },
  };

  // =========================================================================
  // Endpoint 1: GET /api/v1/public/token/:token (QR Table Scan)
  // =========================================================================
  const tokenRes = http.get(`${BASE_URL}/api/v1/public/token/${DEFAULT_TOKEN}`, params);
  tokenResolutionTrend.add(tokenRes.timings.duration);

  const tokenOk = check(tokenRes, {
    'token status is 200': (r) => r.status === 200,
    'token response has restaurant': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.restaurant && body.restaurant.name;
      } catch {
        return false;
      }
    },
  });

  if (!tokenOk) {
    failureRate.add(1);
  } else {
    failureRate.add(0);
  }

  // Think time between scanning and viewing staff
  sleep(0.5);

  // =========================================================================
  // Endpoint 2: GET /api/v1/public/restaurants/:id/staff (Staff Directory)
  // =========================================================================
  const staffRes = http.get(
    `${BASE_URL}/api/v1/public/restaurants/${DEFAULT_RESTAURANT_ID}/staff`,
    params,
  );
  staffDirectoryTrend.add(staffRes.timings.duration);

  const staffOk = check(staffRes, {
    'staff status is 200': (r) => r.status === 200,
    'staff response has staff array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.staff);
      } catch {
        return false;
      }
    },
  });

  if (!staffOk) {
    failureRate.add(1);
  } else {
    failureRate.add(0);
  }

  // Think time between selecting staff and entering tip amount
  sleep(0.5);

  // =========================================================================
  // Endpoint 3: POST /api/v1/public/tips/intent (UPI Deep Link Generation)
  // =========================================================================
  const payload = JSON.stringify({
    token: DEFAULT_TOKEN,
    staffId: DEFAULT_STAFF_ID,
    amountInr: 100,
    deviceOs: 'iOS',
    deviceBrowser: 'Mobile Safari',
  });

  const intentRes = http.post(`${BASE_URL}/api/v1/public/tips/intent`, payload, params);
  tipIntentTrend.add(intentRes.timings.duration);

  const intentOk = check(intentRes, {
    'intent status is 201': (r) => r.status === 201,
    'intent has upi://pay link': (r) => {
      try {
        const body = JSON.parse(r.body);
        return typeof body.upiLink === 'string' && body.upiLink.startsWith('upi://pay');
      } catch {
        return false;
      }
    },
  });

  if (!intentOk) {
    failureRate.add(1);
  } else {
    failureRate.add(0);
  }

  // Inter-iteration pause simulating diner handoff to UPI app
  sleep(1);
}
