import type { LoginRequest, LoginResponse, RegisterRequest, UpdateMyProfileRequest, User } from "../models/user";
import { httpClient } from "./api/httpClient";

export const authService = {
  login: (request: LoginRequest) =>
    httpClient.post<LoginResponse, LoginRequest>("/api/v1/auth/login", request),
  register: (request: RegisterRequest) =>
    httpClient.post<User, RegisterRequest>("/api/v1/auth/register", request),
  currentUser: (signal?: AbortSignal) =>
    httpClient.get<User>("/api/v1/auth/me", signal),
  updateMyProfile: (request: UpdateMyProfileRequest) =>
    httpClient.put<User, UpdateMyProfileRequest>("/api/v1/auth/me", request),
  uploadMyImage: (file: File) => httpClient.upload<User>("/api/v1/auth/me/image", file),
  logout: () => httpClient.post<void, Record<string, never>>("/api/v1/auth/logout", {}),
};
