import { apiRequest } from "./api";

export const donationService = {
  list: () => apiRequest("/donations"),
  getById: (id) => apiRequest(`/donations/${id}`),
  create: (payload) => apiRequest("/donations", { method: "POST", body: JSON.stringify(payload) }),
};
