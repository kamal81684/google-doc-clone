import api from "./axios";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
  token?: string;
}

export const register = async (
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> => {
  const response = await api.post("/auth/register", {
    name,
    email,
    password,
  });
  return response.data;
};

export const login = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const response = await api.post("/auth/login", {
    email,
    password,
  });
  return response.data;
};

export const googleLogin = async (
  credential: string
): Promise<AuthResponse> => {
  const response = await api.post("/auth/google", { credential });
  return response.data;
};

export const logout = async (): Promise<AuthResponse> => {
  const response = await api.post("/auth/logout");
  return response.data;
};

export const getMe = async (): Promise<AuthResponse> => {
  const response = await api.get("/auth/me");
  return response.data;
};
