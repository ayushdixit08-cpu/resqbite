import { apiRequest } from "./api";

export const notificationService = {
  list: () => apiRequest("/notifications"),
  markRead: (id) => apiRequest(`/notifications/${id}/read`, { method: "PATCH" }),
};
