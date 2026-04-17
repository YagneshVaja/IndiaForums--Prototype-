import api from './api';

const AUTH = '/auth';

export function register(data: any) {
  return api.post(`${AUTH}/register`, data);
}

export function login(credentials: any) {
  return api.post(`${AUTH}/login`, credentials);
}

export function externalLogin(data: any) {
  return api.post(`${AUTH}/external-login`, data);
}

export function refreshToken(token: string) {
  return api.post(`${AUTH}/refresh-token`, { refreshToken: token });
}

export function logout(token: string) {
  return api.post(`${AUTH}/logout`, { refreshToken: token });
}

export function forgotPassword(email: string) {
  return api.post(`${AUTH}/forgot-password`, { email });
}

export function resetPassword(data: any) {
  return api.post(`${AUTH}/reset-password`, data);
}

export function checkUsername(username: string) {
  return api.get(`${AUTH}/check-username`, { params: { username } });
}

export function checkEmail(email: string) {
  return api.get(`${AUTH}/check-email`, { params: { email } });
}
