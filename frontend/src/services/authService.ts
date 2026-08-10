import type { LoginRequest, User } from "../models/user";
import { httpClient } from "./api/httpClient";

export const authService = {
  login: (request: LoginRequest) =>
    httpClient.post<User, LoginRequest>("/api/v1/auth/login", request),
  currentUser: (signal?: AbortSignal) =>
    httpClient.get<User>("/api/v1/auth/me", signal),
  logout: () => httpClient.post<void, Record<string, never>>("/api/v1/auth/logout", {}),
};
