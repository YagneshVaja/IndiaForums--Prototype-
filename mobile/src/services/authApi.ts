import { apiClient } from './api';

const AUTH = '/auth';

// ── DTOs (mirror api-1.json component schemas) ──────────────────────────────

export interface AuthenticationResponse {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  expiresIn?: number | string;
  userId: number | string;
  userName: string;
  email: string | null;
  displayName: string | null;
}

export interface LoginRequest {
  userName: string;  // accepts email or username — backend matches either
  password: string;
}

export interface RegisterRequest {
  userName: string;
  email: string;
  password: string;
  displayName?: string;
  captchaToken?: string | null;
}

export interface ExternalLoginRequest {
  provider: 'Google' | 'Facebook' | 'Microsoft';
  providerKey: string;
  email?: string;
  displayName?: string | null;
}

export interface ForgotPasswordRequest {
  email: string;
  captchaToken?: string | null;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message?: string | null;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message?: string | null;
}

export interface UsernameAvailabilityResponse {
  available: boolean;
  suggestions?: string[] | null;
  message?: string | null;
}

export interface EmailAvailabilityResponse {
  available: boolean;
  message?: string | null;
}

// ── Endpoints ───────────────────────────────────────────────────────────────

export function register(data: RegisterRequest) {
  return apiClient.post<AuthenticationResponse>(`${AUTH}/register`, data);
}

export function login(credentials: LoginRequest) {
  return apiClient.post<AuthenticationResponse>(`${AUTH}/login`, credentials);
}

export function externalLogin(data: ExternalLoginRequest) {
  return apiClient.post<AuthenticationResponse>(`${AUTH}/external-login`, data);
}

export function refreshToken(token: string) {
  return apiClient.post<AuthenticationResponse>(`${AUTH}/refresh-token`, {
    refreshToken: token,
  });
}

export function logout(token: string) {
  return apiClient.post<boolean>(`${AUTH}/logout`, { refreshToken: token });
}

export function forgotPassword(email: string) {
  return apiClient.post<ForgotPasswordResponse>(`${AUTH}/forgot-password`, { email });
}

export function resetPassword(data: ResetPasswordRequest) {
  return apiClient.post<ResetPasswordResponse>(`${AUTH}/reset-password`, data);
}

export function checkUsername(username: string) {
  return apiClient.get<UsernameAvailabilityResponse>(`${AUTH}/check-username`, {
    params: { username },
  });
}

export function checkEmail(email: string) {
  return apiClient.get<EmailAvailabilityResponse>(`${AUTH}/check-email`, {
    params: { email },
  });
}
