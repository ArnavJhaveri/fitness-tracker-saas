"use client";

import { useQuery } from "@tanstack/react-query";
import { nutritionService } from "@/services/nutrition.service";

export function useFoodSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: ["food-items", "search", query],
    queryFn: () => nutritionService.searchFood({ q: query, per_page: 20 }),
    enabled: enabled && query.length >= 2,
    staleTime: 5 * 60_000, // food items rarely change
    placeholderData: (prev) => prev,
  });
}
