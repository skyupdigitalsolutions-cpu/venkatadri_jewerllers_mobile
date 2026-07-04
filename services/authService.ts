import { api, ApiResponse } from './api';
import { AuthUser } from '@/store/authStore';

export type RegisterPayload = {
  shopCode: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  address?: string;
  dateOfBirth?: string;
  occupation?: string;
  agreedToTerms?: boolean;
  agreedToPlatformTerms?: boolean;
};

export type AuthResult = {
  token: string;
  user: AuthUser;
};

type LoginResponse = ApiResponse<AuthResult> & {
  token?: string;
  user?: AuthUser;
};

export async function loginWithPassword(payload: { phone: string; password: string }): Promise<AuthResult> {
  const response = await api.post<LoginResponse>('/api/auth/user/login', payload);

  // Log raw response for debugging login flow
  try {
    console.log('[authService] loginWithPassword response:', response.data);
  } catch (e) {
    // ignore logging errors
  }

  if (!response.data.success) {
    throw new Error(response.data.message || 'Login failed');
  }

  if (!response.data.token || !response.data.user) {
    throw new Error('Invalid login response from server');
  }

  // Return strongly-typed result
  const result: AuthResult = {
    token: response.data.token,
    user: response.data.user,
  };

  console.log('[authService] loginWithPassword token:', result.token, 'user id:', result.user?.id);
  return result;
}

export async function registerUser(payload: RegisterPayload): Promise<void> {
  const response = await api.post<ApiResponse<null>>('/api/auth/user/register', payload);
  if (!response.data.success) {
    throw new Error(response.data.message || 'Registration failed');
  }
}
