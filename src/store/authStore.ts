import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OandaEnvironment } from '../services/api';

interface Credentials {
  apiKey: string;
  accountId: string;
  environment: OandaEnvironment;
}

interface AuthState {
  credentials: Credentials | null;
  setCredentials: (credentials: Credentials) => void;
  clearCredentials: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      credentials: null,
      setCredentials: (credentials) => set({ credentials }),
      clearCredentials: () => set({ credentials: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);