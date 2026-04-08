import api from './api';

const BASE = '/email-verification';

export function resendVerification() {
  return api.post(`${BASE}/resend`, {});
}

export function confirmVerification(data) {
  return api.post(`${BASE}/confirm`, data);
}

export function getVerificationLogs() {
  return api.get(`${BASE}/logs`);
}
