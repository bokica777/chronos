export type UserRole = "Client" | "Partner" | "Admin";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  // Prisutno samo u odgovorima gde ih backend salje (npr. admin lista korisnika).
  isActive?: boolean;
  createdAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  displayName: string;
  password: string;
  role: UserRole;
}

export interface LoginResponse {
  accessToken: string;
  expiresAtUtc: string;
  user: User;
}
