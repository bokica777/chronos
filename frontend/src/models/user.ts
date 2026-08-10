export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
