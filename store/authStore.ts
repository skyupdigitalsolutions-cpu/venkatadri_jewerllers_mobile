import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export type AuthUser = {
  id: string;
  name: string;
  phone: string;
  email: string;
  userId?: string;
  shopCode: string;
  status: string;
};

export const authStore = {
  async saveToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    try {
      console.log('[authStore] saveToken saved', Boolean(token));
    } catch (e) {}
  },

  async getToken(): Promise<string | null> {
    const t = await AsyncStorage.getItem(TOKEN_KEY);
    try {
      console.log('[authStore] getToken ->', t ? 'PRESENT' : 'NULL');
    } catch (e) {}
    return t;
  },

  async saveUser(user: AuthUser): Promise<void> {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    try {
      console.log('[authStore] saveUser id=', user?.id ?? user?.userId ?? 'unknown');
    } catch (e) {}
  },

  async getUser(): Promise<AuthUser | null> {
    const raw = await AsyncStorage.getItem(USER_KEY);
    try {
      console.log('[authStore] getUser ->', raw ? 'PRESENT' : 'NULL');
    } catch (e) {}
    return raw ? JSON.parse(raw) : null;
  },

  async clear(): Promise<void> {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    try {
      console.log('[authStore] clear');
    } catch (e) {}
  },
};
