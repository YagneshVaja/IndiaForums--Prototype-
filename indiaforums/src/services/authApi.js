import api from './api';

const AUTH = '/auth';

export function register(data) {
  return api.post(`${AUTH}/register`, data);
}

export function login(credentials) {
  return api.post(`${AUTH}/login`, credentials);
}

export function externalLogin(data) {
  return api.post(`${AUTH}/external-login`, data);
}

export function refreshToken(token) {
  return api.post(`${AUTH}/refresh-token`, { refreshToken: token });
}

export function logout(token) {
  return api.post(`${AUTH}/logout`, { refreshToken: token });
}

export function forgotPassword(email) {
  return api.post(`${AUTH}/forgot-password`, { email });
}

export function resetPassword(data) {
  return api.post(`${AUTH}/reset-password`, data);
}

export function checkUsername(username) {
  return api.get(`${AUTH}/check-username`, { params: { username } });
}

export function checkEmail(email) {
  return api.get(`${AUTH}/check-email`, { params: { email } });
}
