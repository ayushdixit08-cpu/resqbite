import { apiRequest } from "./api";

export const ngoService = {
  list: () => apiRequest("/organizations"),
  getById: (id) => apiRequest(`/ngos/${id}`),
  listOpportunities: () => apiRequest("/opportunities"),
  createOpportunity: (payload) => apiRequest("/opportunities", { method: "POST", body: JSON.stringify(payload) }),
};
