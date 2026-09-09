import { apiRequest, saveAuthToken, clearAuthToken } from "./api";

export const authService = {
  login: (payload) => apiRequest("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  register: (payload) => apiRequest("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  googleLogin: (idToken, rememberMe = false) => apiRequest("/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken, rememberMe }),
  }),
  forgotPassword: (email) => apiRequest("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  }),
  resetPassword: (token, password) => apiRequest("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  }),
  me: () => apiRequest("/users/me"),
  logout: () => {
    clearAuthToken();
    return Promise.resolve();
  },
  saveToken: saveAuthToken,
};
