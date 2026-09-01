import { apiRequest } from "./api";

export const requestService = {
  list: () => apiRequest("/requests"),
  incoming: () => apiRequest("/requests/incoming"),
  create: (payload) => apiRequest("/requests", { method: "POST", body: JSON.stringify(payload) }),
  updateStatus: (id, payload) => apiRequest(`/requests/${id}/status`, { method: "PATCH", body: JSON.stringify(payload) }),
};
