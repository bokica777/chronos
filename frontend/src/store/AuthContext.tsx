import { createContext, useMemo, type PropsWithChildren } from "react";
import type { User } from "../models/user";
import { useLocalStorage } from "../hooks/useLocalStorage";

export interface AuthContextValue {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useLocalStorage<User | null>("chronos.user", null);
  const value = useMemo(() => ({ user, setUser }), [user, setUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
