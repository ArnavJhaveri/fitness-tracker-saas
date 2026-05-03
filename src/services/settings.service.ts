import { apiGet, apiPut } from "./api";
import type { UserSettings } from "@/types/database";

export const settingsService = {
  get: () => apiGet<UserSettings>("/api/settings"),
  update: (data: Partial<UserSettings>) => apiPut<UserSettings>("/api/settings", data),
};
