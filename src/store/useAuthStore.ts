import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoadingAuth: boolean;
  isHydrating: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoadingAuth: (loading: boolean) => void;
  setHydrating: (hydrating: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoadingAuth: true, // Start true while initial session is checked
  isHydrating: true, // Premium loading state for initial data hydration
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoadingAuth: (isLoadingAuth) => set({ isLoadingAuth }),
  setHydrating: (isHydrating) => set({ isHydrating }),
}));
