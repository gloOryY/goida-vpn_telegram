import type { TelegramAuthData, AuthTokens, UserProfile } from '@goida-vpn/shared';

const GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    useAuth = false,
  ): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (useAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${GATEWAY_URL}${path}`, {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) }),
    });

    const json = await res.json();

    if (!res.ok) {
      const errorMsg = json.errors?.[0]?.title || 'API Error';
      throw new Error(errorMsg);
    }

    return json.data as T;
  }

  async authWithTelegram(authData: TelegramAuthData): Promise<AuthTokens> {
    return this.request<AuthTokens>('POST', '/api/v1/auth/telegram', authData);
  }

  async getProfile(): Promise<UserProfile> {
    return this.request<UserProfile>('GET', '/api/v1/profile', undefined, true);
  }
}

// Один клиент на экземпляр бота
export const apiClient = new ApiClient();
