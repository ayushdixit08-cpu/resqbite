import { apiRequest } from "./api";

export const messageService = {
  list: (otherUserId) => apiRequest(`/messages/${otherUserId}`),
  send: (payload) => apiRequest("/messages", { method: "POST", body: JSON.stringify(payload) }),
};
