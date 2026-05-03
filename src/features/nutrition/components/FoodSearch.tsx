"use client";

import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useFoodSearch } from "../hooks/useFoodSearch";
import type { FoodItem } from "@/types/database";

interface Props {
  onSelect: (food: FoodItem, grams: number) => void;
  isAdding?: boolean;
}

export function FoodSearch({ onSelect, isAdding }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState("100");

  const { data: results, isFetching } = useFoodSearch(query);

  function handleSelect(food: FoodItem) {
    setSelected(food);
    setQuery(food.name);
  }

  function handleAdd() {
    if (!selected || !grams) return;
    const g = parseFloat(grams);
    if (isNaN(g) || g <= 0) return;
    onSelect(selected, g);
    setSelected(null);
    setQuery("");
    setGrams("100");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search food…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
          }}
          className="h-10 w-full rounded-lg border border-gray-300 bg-white pr-3 pl-9 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        />
      </div>

      {/* Dropdown results */}
      {query.length >= 2 && !selected && (
        <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {isFetching && (
            <div className="p-3">
              <Skeleton lines={3} />
            </div>
          )}
          {!isFetching && results?.length === 0 && (
            <p className="p-3 text-center text-sm text-gray-400">
              No results for &quot;{query}&quot;
            </p>
          )}
          {!isFetching &&
            results?.map((food) => (
              <button
                key={food.id}
                onClick={() => handleSelect(food)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {food.name}
                  </p>
                  {food.brand && <p className="text-xs text-gray-400">{food.brand}</p>}
                </div>
                <p className="text-xs text-gray-500">{food.calories_per_100g} kcal/100g</p>
              </button>
            ))}
        </div>
      )}

      {/* Quantity + add */}
      {selected && (
        <div className="flex gap-2">
          <Input
            type="number"
            step="1"
            min="1"
            max="10000"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            className="w-32"
            aria-label="Quantity in grams"
          />
          <span className="flex items-center text-sm text-gray-500">g</span>
          <button
            onClick={handleAdd}
            disabled={isAdding}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      )}
    </div>
  );
}
