import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id: number;
    username: string;
    mustChangePassword: boolean;
}

interface AuthState {
    token: string | null;
    user: User | null;
    isAuthenticated: boolean;
    setAuth: (token: string, user: User) => void;
    updateUser: (user: Partial<User>) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            isAuthenticated: false,

            setAuth: (token, user) =>
                set({
                    token,
                    user,
                    isAuthenticated: true,
                }),

            updateUser: (updates) =>
                set((state) => ({
                    user: state.user ? { ...state.user, ...updates } : null,
                })),

            logout: () =>
                set({
                    token: null,
                    user: null,
                    isAuthenticated: false,
                }),
        }),
        {
            name: 'chatflowui-auth',
            // Security: Only persist user info, NOT the JWT token.
            // Token is kept in memory only — safe from XSS localStorage extraction.
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);
