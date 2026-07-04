import axios, { AxiosError, AxiosInstance } from 'axios';
import { authStore } from '@/store/authStore';

// ── Resolve base URL ────────────────────────────────────────────────────────
const rawEnvUrl = process.env.EXPO_PUBLIC_API_URL;
const baseURL = rawEnvUrl?.replace(/\/$/, '') ?? '';

// DEBUG: printed in the Metro bundler console — remove once connectivity confirmed
console.log('[API] EXPO_PUBLIC_API_URL (raw):', rawEnvUrl);
console.log('[API] baseURL resolved to      :', baseURL || '(EMPTY — check .env and restart with expo start -c)');

if (!baseURL) {
  console.warn(
    '[API] WARNING: EXPO_PUBLIC_API_URL is not set.\n' +
    'Ensure mobile-app/.env contains:\n' +
    '  EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:5000\n' +
    'Then restart Expo with: npx expo start -c'
  );
}

// ── Types ───────────────────────────────────────────────────────────────────
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  status?: string;
};

export class ApiError extends Error {
  public readonly status?: number;
  public readonly payload?: unknown;

  constructor(message: string, status?: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

// ── Axios client ────────────────────────────────────────────────────────────
const createClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL,
    timeout: 8000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  // Request interceptor — attach JWT token
  client.interceptors.request.use(async (config) => {
    const token = await authStore.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // DEBUG: confirm the exact URL and auth header for every request
    const fullUrl = (config.baseURL ?? '') + (config.url ?? '');
    console.log('[API] →', config.method?.toUpperCase(), fullUrl);
    console.log('[API]   Authorization:', token ? `Bearer ${token.slice(0, 20)}…` : 'MISSING — token is null');
    console.log('[API]   payload:', JSON.stringify(config.data ?? null));
    return config;
  });

  // Response interceptor — normalize errors
  client.interceptors.response.use(
    (response) => {
      // DEBUG: confirm success responses
      console.log('[API] ←', response.status, response.config.url);
      return response;
    },
    (error: AxiosError) => {
      // DEBUG: full error dump so the root cause is visible in Metro
      console.log('[API] ✗ error.code   :', error.code);
      console.log('[API] ✗ error.message:', error.message);
      console.log('[API] ✗ request URL  :', (error.config?.baseURL ?? '') + (error.config?.url ?? ''));
      if (error.response) {
        console.log('[API] ✗ HTTP status :', error.response.status);
        console.log('[API] ✗ body        :', JSON.stringify(error.response.data));
      } else {
        console.log('[API] ✗ No HTTP response — likely a network/firewall/cleartext issue');
        console.log('[API] ✗ Checklist:');
        console.log('[API]   1. Android device and PC on the same WiFi?');
        console.log('[API]   2. Windows Firewall allowing inbound port 5000?');
        console.log('[API]   3. app.json has "usesCleartextTraffic": true? (now fixed)');
        console.log('[API]   4. Run: npx expo start -c  to clear stale bundle cache');
      }

      const responseData = error.response?.data as Record<string, unknown> | undefined;
      const message =
        (responseData?.message as string) ||
        error.message ||
        'Something went wrong. Please try again.';
      const status = error.response?.status;
      throw new ApiError(message, status, responseData);
    }
  );

  return client;
};

export const api = createClient();

export const BASE_URL = baseURL;

export function getFileUrl(filePath?: string | null): string | null {
  if (!filePath) return null;
  const clean = filePath.replace(/\\/g, '/');
  if (clean.startsWith('http')) return clean;
  const filename = clean.split('/').pop();
  return `${baseURL}/uploads/${filename}`;
}
