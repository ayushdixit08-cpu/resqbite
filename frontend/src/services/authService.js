import { apiRequest, saveAuthToken, clearAuthToken } from "./api";

export const authService = {
  login: (payload) => apiRequest("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  register: (payload) => apiRequest("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  logout: () => {
    clearAuthToken();
    return Promise.resolve();
  },
  saveToken: saveAuthToken,
};
