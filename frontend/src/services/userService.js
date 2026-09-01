import { apiRequest } from "./api";

export const userService = {
  getProfile: () => apiRequest("/users/me"),
  updateProfile: (payload) => apiRequest("/users/me", { method: "PUT", body: JSON.stringify(payload) }),
};
