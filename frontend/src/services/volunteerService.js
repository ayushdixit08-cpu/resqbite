import { apiRequest } from "./api";

export const volunteerService = {
  list: () => apiRequest("/volunteers"),
  getById: (id) => apiRequest(`/volunteers/${id}`),
};
