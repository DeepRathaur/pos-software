import { create } from "zustand";

export type AuthUser = { id: string; email: string; name: string };

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  hydrate: () => void;
  setSession: (token: string, user: AuthUser) => void;
  clear: () => void;
};

const USER_KEY = "pos_user";

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  hydrated: false,
  hydrate: () => {
    if (typeof window === "undefined") return;
    const t = localStorage.getItem("pos_token");
    const u = localStorage.getItem(USER_KEY);
    set({
      token: t,
      user: u ? (JSON.parse(u) as AuthUser) : null,
      hydrated: true,
    });
  },
  setSession: (token, user) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("pos_token", token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    set({ token, user, hydrated: true });
  },
  clear: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("pos_token");
      localStorage.removeItem(USER_KEY);
    }
    set({ token: null, user: null });
  },
}));
