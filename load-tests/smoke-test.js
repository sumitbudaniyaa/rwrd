import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '5s',
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';

export default function () {
  // Check health and public root status
  const res = http.get(`${BASE_URL}/healthz`);
  check(res, {
    'healthz status is 200': (r) => r.status === 200,
  });

  const rootRes = http.get(`${BASE_URL}/`);
  check(rootRes, {
    'root status is 200': (r) => r.status === 200,
    'root reports operational': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'operational';
      } catch {
        return false;
      }
    },
  });

  sleep(0.5);
}
