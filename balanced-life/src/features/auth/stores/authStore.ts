/**
 * Auth state store using Zustand.
 * Tracks current user, loading state, and auth actions.
 */
import { create } from "zustand";
import { User } from "firebase/auth";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  hasCompletedAssessment: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setHasCompletedAssessment: (completed: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  hasCompletedAssessment: false,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setHasCompletedAssessment: (hasCompletedAssessment) =>
    set({ hasCompletedAssessment }),
}));
