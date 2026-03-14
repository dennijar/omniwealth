import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoadingAuth: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoadingAuth: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoadingAuth: true, // Start true while initial session is checked
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoadingAuth: (isLoadingAuth) => set({ isLoadingAuth }),
}));
